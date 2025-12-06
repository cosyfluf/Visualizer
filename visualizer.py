import threading
import time
import json
import os
import numpy as np
import soundcard as sc
import webview
import sys
import signal
import base64
import warnings
import asyncio

# ==========================================
# KONFIGURATION & INIT
# ==========================================
warnings.filterwarnings("ignore")
IS_CLOSING = False
window = None

# Prüfen ob wir auf Linux sind und DBus verfügbar ist
IS_LINUX = sys.platform.startswith('linux')
DBUS_AVAILABLE = False
if IS_LINUX:
    try:
        import dbus
        from urllib.parse import unquote, urlparse
        import requests
        DBUS_AVAILABLE = True
    except ImportError:
        print("WARNUNG: 'dbus-python' fehlt. Keine Media-Infos verfügbar.")

CONFIG_FILE = "config.json"
DEFAULT_CONFIG = {
    "device_id": -1,
    "style": "neon",
    "sensitivity": 1.0,
    "media_position": "top-left",
    "bass_range": 5,
    "bass_offset": 0,
    "bass_sens": 1.2,
    "particle_enabled": True,
    "particle_threshold": 50,
    "particle_intensity": 50
}

class ConfigManager:
    @staticmethod
    def load():
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, 'r') as f:
                    return json.load(f)
            except: return DEFAULT_CONFIG
        return DEFAULT_CONFIG

    @staticmethod
    def save(data):
        try:
            current = ConfigManager.load()
            current.update(data)
            with open(CONFIG_FILE, 'w') as f:
                json.dump(current, f, indent=4)
        except: pass

config = ConfigManager.load()

# ==========================================
# LOGGING
# ==========================================
def log_to_ui(level, message):
    try:
        print(f"[{level}] {message}")
        global window
        if window and not IS_CLOSING:
            safe_msg = json.dumps(str(message))
            js_code = f"setTimeout(function() {{ if(typeof addLog === 'function') addLog('{level}', {safe_msg}); }}, 0);"
            window.evaluate_js(js_code)
    except: pass

# ==========================================
# LINUX MEDIA FETCHER (DBus / MPRIS2)
# ==========================================
class LinuxMediaFetcher:
    def __init__(self):
        self.last_title = ""
        self.bus = None
        if DBUS_AVAILABLE:
            try:
                self.bus = dbus.SessionBus()
            except: pass

    def get_cover_base64(self, url):
        """Konvertiert file:// oder http:// URLs zu Base64"""
        if not url: return ""
        try:
            # Fall 1: Lokale Datei (file://...)
            if url.startswith('file://'):
                path = unquote(urlparse(url).path)
                with open(path, "rb") as f:
                    return base64.b64encode(f.read()).decode('utf-8')
            
            # Fall 2: Online URL (Spotify etc.)
            elif url.startswith('http'):
                # Timeout wichtig, damit UI nicht laggt
                resp = requests.get(url, timeout=1) 
                if resp.status_code == 200:
                    return base64.b64encode(resp.content).decode('utf-8')
        except: 
            return ""
        return ""

    def get_info(self):
        if not self.bus: return None
        
        try:
            # Suche nach Media Playern (Spotify, VLC, Rhythmbox...)
            for service in self.bus.list_names():
                if service.startswith('org.mpris.MediaPlayer2.'):
                    player = self.bus.get_object(service, '/org/mpris/MediaPlayer2')
                    props_iface = dbus.Interface(player, 'org.freedesktop.DBus.Properties')
                    try:
                        metadata = props_iface.Get('org.mpris.MediaPlayer2.Player', 'Metadata')
                        
                        # Daten extrahieren
                        title = str(metadata.get('xesam:title', ''))
                        artist = str(metadata.get('xesam:artist', [''])[0]) # Artist ist oft eine Liste
                        art_url = str(metadata.get('mpris:artUrl', ''))

                        if title:
                            return title, artist, art_url
                    except: continue
        except: pass
        return None

    async def loop(self):
        global window
        while not IS_CLOSING:
            try:
                info = self.get_info()
                if info:
                    title, artist, art_url = info
                    
                    if title != self.last_title:
                        self.last_title = title
                        
                        # Cover laden (kann kurz dauern)
                        img_b64 = self.get_cover_base64(art_url)
                        
                        payload = {
                            "title": title,
                            "artist": artist,
                            "cover": f"data:image/png;base64,{img_b64}" if img_b64 else ""
                        }
                        
                        if window and not IS_CLOSING:
                            window.evaluate_js(f"if(typeof updateMediaInfo === 'function') updateMediaInfo('{json.dumps(payload)}')")
            except Exception as e:
                # print(f"Media Error: {e}")
                pass
            
            await asyncio.sleep(2)

def start_media_thread():
    if not IS_LINUX or not DBUS_AVAILABLE: return
    fetcher = LinuxMediaFetcher()
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(fetcher.loop())

# ==========================================
# JS API
# ==========================================
class JsApi:
    def toggle_fullscreen(self):
        global window
        if window and not IS_CLOSING:
            try: window.toggle_fullscreen()
            except: pass

    def save_settings(self, style, sensitivity, media_pos, bass_range, bass_offset, bass_sens, p_enabled, p_thresh, p_int):
        log_to_ui("INFO", f"Config gespeichert.")
        is_p_enabled = str(p_enabled).lower() == 'true'
        ConfigManager.save({
            "style": style,
            "sensitivity": float(sensitivity),
            "media_position": media_pos,
            "bass_range": int(bass_range),
            "bass_offset": int(bass_offset),
            "bass_sens": float(bass_sens),
            "particle_enabled": is_p_enabled,
            "particle_threshold": int(p_thresh),
            "particle_intensity": int(p_int)
        })

# ==========================================
# AUDIO ENGINE
# ==========================================
class AudioEngine:
    def __init__(self, device_id):
        self.device_id = device_id

    def run(self):
        global window
        time.sleep(1.0) 
        
        SAMPLE_RATE = 44100
        BLOCK_SIZE = 2048 
        NUM_BARS = 64
        MIN_FREQ = 30
        MAX_FREQ = 15000

        try:
            # Linux: include_loopback=True holt Monitore (System Sound) und Mics
            mics = sc.all_microphones(include_loopback=True)
            
            if self.device_id >= len(mics): mic = mics[0]
            else: mic = mics[self.device_id]
            
            # UI Init
            try:
                if not IS_CLOSING and window:
                    safe_name = mic.name.replace('"', '').replace("'", "")
                    cfg = config
                    
                    p_en = "true" if cfg.get('particle_enabled', True) else "false"
                    p_thr = cfg.get('particle_threshold', 50)
                    p_int = cfg.get('particle_intensity', 50)

                    init_script = f"""
                        setTimeout(() => {{
                            if(typeof setStatus === 'function') setStatus("Linux Audio: {safe_name}");
                            if(typeof applyConfig === 'function') {{
                                applyConfig(
                                    '{cfg.get('style','neon')}', 
                                    {cfg.get('sensitivity',1.0)}, 
                                    '{cfg.get('media_position','top-left')}', 
                                    {cfg.get('bass_range',5)}, 
                                    {cfg.get('bass_offset',0)}, 
                                    {cfg.get('bass_sens',1.2)},
                                    {p_en}, 
                                    {p_thr}, 
                                    {p_int}
                                );
                            }}
                        }}, 200);
                    """
                    window.evaluate_js(init_script)
            except: pass

            log_to_ui("INFO", f"Start Audio: {mic.name}")
            
            # Linux Loopback Erkennung (oft 'Monitor of...')
            is_probably_loopback = "monitor" in mic.name.lower()
            # Boost für Mic (kein Monitor)
            mic_boost = 1.0 if is_probably_loopback else 3.0

            with mic.recorder(samplerate=SAMPLE_RATE) as recorder:
                while not IS_CLOSING:
                    if not window: break

                    try:
                        data = recorder.record(numframes=BLOCK_SIZE)
                    except: 
                        time.sleep(0.01)
                        continue

                    # Mono/Stereo Handling
                    if len(data.shape) > 1 and data.shape[1] >= 2:
                        mono_mix = (data[:, 0] + data[:, 1]) / 2
                        left_channel = data[:, 0]
                        right_channel = data[:, 1]
                    else:
                        if len(data.shape) > 1: mono_mix = data[:, 0]
                        else: mono_mix = data
                        left_channel = mono_mix
                        right_channel = mono_mix

                    # FFT
                    fft_data = np.abs(np.fft.rfft(mono_mix * np.hanning(len(mono_mix))))
                    freqs = np.fft.rfftfreq(BLOCK_SIZE, 1/SAMPLE_RATE)
                    
                    output_bars = []
                    for i in range(NUM_BARS):
                        f_start = MIN_FREQ * (MAX_FREQ / MIN_FREQ) ** (i / NUM_BARS)
                        f_end = MIN_FREQ * (MAX_FREQ / MIN_FREQ) ** ((i + 1) / NUM_BARS)
                        
                        idx_start = np.searchsorted(freqs, f_start)
                        idx_end = np.searchsorted(freqs, f_end)
                        if idx_end <= idx_start: idx_end = idx_start + 1
                        
                        chunk = fft_data[idx_start:idx_end] if idx_end <= len(fft_data) else fft_data[idx_start:]
                        val = np.mean(chunk) if len(chunk) > 0 else 0
                        
                        val = val * (50 + (i * 3)) * mic_boost
                        if val > 100: val = 100 + (val - 100) * 0.2
                        output_bars.append(float(val))

                    rms_l = np.sqrt(np.mean(left_channel**2)) * mic_boost
                    rms_r = np.sqrt(np.mean(right_channel**2)) * mic_boost
                    
                    payload = {
                        "bars": output_bars,
                        "volL": float(min(rms_l * 400, 100)),
                        "volR": float(min(rms_r * 400, 100))
                    }

                    try:
                        if not IS_CLOSING:
                            window.evaluate_js(f"updateData('{json.dumps(payload)}')")
                    except: pass
                    
                    time.sleep(0.01)

        except Exception as e:
            if not IS_CLOSING:
                log_to_ui("ERROR", f"Audio Error: {e}")
                print(e)

# ==========================================
# DEVICE SELECTION (Linux Friendly)
# ==========================================
def select_device():
    try:
        devices = sc.all_microphones(include_loopback=True)
    except Exception as e: 
        print(f"Fehler beim Suchen der Audiogeräte: {e}")
        print("Ist PulseAudio/PipeWire installiert?")
        return 0
    
    last_id = config.get("device_id", -1)
    
    print("\n" + "="*40)
    print("   LINUX AUDIO SETUP")
    print("="*40)
    print(" HINWEIS:")
    print(" 'Monitor of...' = Desktop Sound (Loopback)")
    print(" Andere Namen    = Mikrofone")
    print("-" * 40)

    for i, dev in enumerate(devices):
        marker = " "
        type_label = "[MIC] "
        # Linux Loopback Erkennung
        if "monitor" in dev.name.lower():
            type_label = "[SYS] " 
        
        if i == last_id:
            marker = "*"
        
        print(f" {marker} [{i}] {type_label} {dev.name}")
    
    print("-" * 40)
    
    if last_id != -1 and last_id < len(devices):
        print(f"Auto-Start ID {last_id} (3s)... (STRG+C zum Abbrechen)")
        try:
            for k in range(3):
                time.sleep(1)
                print(f"...", end=" ", flush=True)
            print("\nStart!")
            return last_id
        except KeyboardInterrupt:
            print("\nAbgebrochen.")

    while True:
        try:
            val_str = input("ID wählen >> ")
            val = int(val_str)
            if 0 <= val < len(devices):
                ConfigManager.save({"device_id": val})
                return val
        except: pass

def on_closed():
    global IS_CLOSING
    IS_CLOSING = True
    print("Beenden...")
    os._exit(0)

def start_backend():
    global chosen_id
    t1 = threading.Thread(target=lambda: AudioEngine(chosen_id).run(), daemon=True)
    t2 = threading.Thread(target=start_media_thread, daemon=True)
    t1.start()
    t2.start()

# ==========================================
# MAIN
# ==========================================
if __name__ == '__main__':
    def signal_handler(sig, frame): on_closed()
    signal.signal(signal.SIGINT, signal_handler)

    chosen_id = select_device()
    
    # Pfad zur HTML Datei
    if getattr(sys, 'frozen', False):
        base_dir = sys._MEIPASS
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
    html_path = os.path.abspath(os.path.join(base_dir, 'index.html'))
    if not os.path.exists(html_path):
         html_path = os.path.join(base_dir, 'web', 'index.html')

    # Unter Linux muss oft GUI im Main Thread laufen
    api = JsApi()
    
    window = webview.create_window(
        'Pro Visualizer Linux', 
        url=f"file://{html_path}", # Auf Linux ist file:// Präfix sicherer
        width=1000, 
        height=600, 
        background_color='#050505', 
        js_api=api
    )
    
    window.events.closed += on_closed

    try:
        webview.start(func=start_backend, debug=False) # GUI Rendern
    except KeyboardInterrupt:
        on_closed()
    except Exception as e:
        print(f"Error: {e}")
        on_closed()