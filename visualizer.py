import threading
import time
import json
import os
import numpy as np
import soundcard as sc
import webview
import sys
import signal
import traceback
import asyncio
import base64
import warnings

# ==========================================
# KONFIGURATION & INIT
# ==========================================
warnings.filterwarnings("ignore")
IS_CLOSING = False
window = None

# Versuch Windows Media Import
try:
    from winsdk.windows.media.control import GlobalSystemMediaTransportControlsSessionManager
    from winsdk.windows.storage.streams import DataReader
    WINSDK_AVAILABLE = True
except ImportError:
    WINSDK_AVAILABLE = False

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
# MEDIA FETCHER (Windows) - OPTIMIERT
# ==========================================
class MediaFetcher:
    def __init__(self):
        self.last_title = ""

    async def get_media_info(self):
        if IS_CLOSING: return
        try:
            manager = await GlobalSystemMediaTransportControlsSessionManager.request_async()
            session = manager.get_current_session()

            if session:
                props = await session.try_get_media_properties_async()
                title = props.title
                artist = props.artist
                
                if title != self.last_title:
                    self.last_title = title
                    img_base64 = ""
                    if props.thumbnail:
                        try:
                            stream_ref = props.thumbnail
                            stream = await stream_ref.open_read_async()
                            if stream:
                                reader = DataReader(stream)
                                await reader.load_async(stream.size)
                                buffer = reader.read_buffer(stream.size)
                                b_data = bytearray(buffer)
                                img_base64 = base64.b64encode(b_data).decode('utf-8')
                        except: pass

                    payload = {
                        "title": title,
                        "artist": artist,
                        "cover": f"data:image/png;base64,{img_base64}" if img_base64 else ""
                    }
                    
                    global window
                    if not IS_CLOSING and window:
                        window.evaluate_js(f"if(typeof updateMediaInfo === 'function') updateMediaInfo('{json.dumps(payload)}')")
        except: pass

    async def loop(self):
        while not IS_CLOSING:
            await self.get_media_info()
            # Update-Rate auf 0.5s erhöht für schnelleres Cover-Update
            await asyncio.sleep(0.5)

def start_media_thread():
    if not WINSDK_AVAILABLE: return
    fetcher = MediaFetcher()
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
# AUDIO ENGINE (High Performance / Low Latency)
# ==========================================
class AudioEngine:
    def __init__(self, device_id):
        self.device_id = device_id

    def run(self):
        global window
        time.sleep(0.5) # Kurze Start-Wartezeit
        
        SAMPLE_RATE = 44100
        # Kleiner Block = weniger Latenz (1024 samples ~ 23ms)
        BLOCK_SIZE = 1024 
        NUM_BARS = 64
        MIN_FREQ = 40
        MAX_FREQ = 15000

        try:
            mics = sc.all_microphones(include_loopback=True)
            if self.device_id >= len(mics): mic = mics[0]
            else: mic = mics[self.device_id]
            
            # Init Config an UI senden
            try:
                if not IS_CLOSING and window:
                    safe_name = mic.name.replace('"', '').replace("'", "")
                    cfg = config
                    
                    p_en = "true" if cfg.get('particle_enabled', True) else "false"
                    p_thr = cfg.get('particle_threshold', 50)
                    p_int = cfg.get('particle_intensity', 50)

                    init_script = f"""
                        setTimeout(() => {{
                            if(typeof setStatus === 'function') setStatus("Verbunden: {safe_name}");
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

            log_to_ui("INFO", f"Audio gestartet (Low Latency): {mic.name}")
            
            is_probably_mic = "loopback" not in mic.name.lower()
            mic_boost = 3.0 if is_probably_mic else 1.0

            # Pre-Calc Window Function für Performance
            hanning_window = np.hanning(BLOCK_SIZE)

            with mic.recorder(samplerate=SAMPLE_RATE) as recorder:
                while not IS_CLOSING:
                    if not window: break

                    try:
                        # Wartet hier, bis Audio da ist (ca 23ms bei Block 1024)
                        data = recorder.record(numframes=BLOCK_SIZE)
                    except: 
                        continue

                    # Anpassung Mono/Stereo
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
                    # Fallback falls Buffer kleiner als erwartet (selten)
                    if len(mono_mix) != BLOCK_SIZE:
                        current_window = np.hanning(len(mono_mix))
                        fft_data = np.abs(np.fft.rfft(mono_mix * current_window))
                    else:
                        fft_data = np.abs(np.fft.rfft(mono_mix * hanning_window))
                    
                    freqs = np.fft.rfftfreq(len(mono_mix), 1/SAMPLE_RATE)
                    
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
                    
                    # KEIN SLEEP HIER! Maximale Geschwindigkeit.

        except Exception as e:
            if not IS_CLOSING:
                log_to_ui("ERROR", f"Audio Error: {e}")
                print(e)

# ==========================================
# DEVICE SELECTION
# ==========================================
def select_device():
    try:
        devices = sc.all_microphones(include_loopback=True)
    except: 
        print("Keine Audiogeräte gefunden!")
        return 0
    
    last_id = config.get("device_id", -1)
    
    print("\n" + "="*40)
    print("   AUDIO INPUT SETUP")
    print("="*40)
    print(" HINWEIS: 'Loopback' ist PC-Sound.")
    print("          Andere sind meist Mikrofone.")
    print("-" * 40)

    for i, dev in enumerate(devices):
        marker = " "
        type_label = "[MIC]  "
        if "loopback" in dev.name.lower():
            type_label = "[SYS]  " 
        
        if i == last_id:
            marker = "*"
        
        print(f" {marker} [{i}] {type_label} {dev.name}")
    
    print("-" * 40)
    
    if last_id != -1 and last_id < len(devices):
        print(f"Auto-Start mit ID {last_id} in 3 Sekunden...")
        print("Drücke STRG+C, um abzubrechen und neu zu wählen.")
        try:
            for k in range(3):
                time.sleep(1)
                print(f"...", end=" ", flush=True)
            print("\nStart!")
            return last_id
        except KeyboardInterrupt:
            print("\nAuto-Start abgebrochen. Bitte wählen:")

    while True:
        try:
            val_str = input("ID eingeben >> ")
            val = int(val_str)
            if 0 <= val < len(devices):
                ConfigManager.save({"device_id": val})
                return val
            else:
                print("Ungültige ID.")
        except ValueError:
            print("Bitte eine Zahl eingeben.")

def on_closed():
    global IS_CLOSING
    IS_CLOSING = True
    print("App wird beendet...")
    os._exit(0)

def start_backend():
    global chosen_id
    t1 = threading.Thread(target=lambda: AudioEngine(chosen_id).run(), daemon=True)
    t2 = threading.Thread(target=start_media_thread, daemon=True)
    t1.start()
    t2.start()

# ==========================================
# MAIN ENTRY
# ==========================================
if __name__ == '__main__':
    def signal_handler(sig, frame): on_closed()
    signal.signal(signal.SIGINT, signal_handler)

    chosen_id = select_device()
    
    if getattr(sys, 'frozen', False):
        base_dir = sys._MEIPASS
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
    html_path = os.path.abspath(os.path.join(base_dir, 'index.html'))
    if not os.path.exists(html_path):
         html_path = os.path.join(base_dir, 'web', 'index.html')

    api = JsApi()
    
    window = webview.create_window(
        'Pro Visualizer', 
        url=html_path,
        width=1000, 
        height=600, 
        background_color='#050505', 
        js_api=api
    )
    
    window.events.closed += on_closed

    try:
        webview.start(func=start_backend, debug=False)
    except KeyboardInterrupt:
        on_closed()
    except Exception as e:
        print(f"Critical Error: {e}")
        on_closed()