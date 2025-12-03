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
window = None  # Globale Referenz

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
    "bass_sens": 1.2
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
# SICHERES LOGGING (Ohne Stdout-Redirect)
# ==========================================
def log_to_ui(level, message):
    """Schreibt ins Terminal UND sendet sicher an die UI."""
    try:
        # 1. Terminal Ausgabe (immer sicher)
        print(f"[{level}] {message}")
        
        # 2. UI Ausgabe (nur wenn Fenster bereit)
        global window
        if window and not IS_CLOSING:
            safe_msg = json.dumps(str(message))
            # setTimeout verhindert Blockaden im JS Thread
            js_code = f"setTimeout(function() {{ if(typeof addLog === 'function') addLog('{level}', {safe_msg}); }}, 0);"
            window.evaluate_js(js_code)
    except:
        pass

# ==========================================
# MEDIA FETCHER
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
            await asyncio.sleep(2)

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

    def save_settings(self, style, sensitivity, media_pos, bass_range, bass_offset, bass_sens):
        log_to_ui("INFO", f"Save: {style}, Gain:{sensitivity}")
        ConfigManager.save({
            "style": style,
            "sensitivity": float(sensitivity),
            "media_position": media_pos,
            "bass_range": int(bass_range),
            "bass_offset": int(bass_offset),
            "bass_sens": float(bass_sens)
        })

# ==========================================
# AUDIO ENGINE
# ==========================================
class AudioEngine:
    def __init__(self, device_id):
        self.device_id = device_id

    def run(self):
        global window
        time.sleep(1.0) # Warten bis UI geladen ist
        
        SAMPLE_RATE = 44100
        BLOCK_SIZE = 2048 
        NUM_BARS = 64
        MIN_FREQ = 30
        MAX_FREQ = 15000

        try:
            mics = sc.all_microphones(include_loopback=True)
            if self.device_id >= len(mics): mic = mics[0]
            else: mic = mics[self.device_id]
            
            # Init Frontend Config senden
            try:
                if not IS_CLOSING and window:
                    safe_name = mic.name.replace('"', '').replace("'", "")
                    cfg = config
                    init_script = f"""
                        setTimeout(() => {{
                            if(typeof setStatus === 'function') setStatus("Verbunden: {safe_name}");
                            if(typeof applyConfig === 'function') applyConfig('{cfg.get('style','neon')}', {cfg.get('sensitivity',1.0)}, '{cfg.get('media_position','top-left')}', {cfg.get('bass_range',5)}, {cfg.get('bass_offset',0)}, {cfg.get('bass_sens',1.2)});
                        }}, 200);
                    """
                    window.evaluate_js(init_script)
            except: pass

            log_to_ui("INFO", f"Audio gestartet: {mic.name}")

            with mic.recorder(samplerate=SAMPLE_RATE) as recorder:
                while not IS_CLOSING:
                    if not window: break

                    try:
                        data = recorder.record(numframes=BLOCK_SIZE)
                    except: 
                        time.sleep(0.01)
                        continue

                    # Stereo zu Mono & Kanäle trennen
                    if data.shape[1] >= 2:
                        mono_mix = (data[:, 0] + data[:, 1]) / 2
                        left_channel = data[:, 0]; right_channel = data[:, 1]
                    else:
                        mono_mix = data[:, 0]
                        left_channel = data[:, 0]; right_channel = data[:, 0]
                    
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
                        val = val * (50 + (i * 3))
                        if val > 100: val = 100 + (val - 100) * 0.2
                        output_bars.append(float(val))

                    rms_l = np.sqrt(np.mean(left_channel**2))
                    rms_r = np.sqrt(np.mean(right_channel**2))
                    
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

def start_backend():
    global chosen_id
    t1 = threading.Thread(target=lambda: AudioEngine(chosen_id).run(), daemon=True)
    t2 = threading.Thread(target=start_media_thread, daemon=True)
    t1.start()
    t2.start()

def select_device():
    last_id = config.get("device_id", -1)
    try:
        devices = sc.all_microphones(include_loopback=True)
    except: return 0
    
    if last_id != -1 and last_id < len(devices):
        print(f"--- AUTO-START: {devices[last_id].name} (1s) ---")
        time.sleep(1) 
        return last_id

    print("\n--- AUDIO SETUP ---")
    for i, dev in enumerate(devices):
        try: print(f"[{i}] {dev.name}")
        except: pass
    
    while True:
        try:
            val = int(input("ID wählen >> "))
            ConfigManager.save({"device_id": val})
            return val
        except: pass

def on_closed():
    global IS_CLOSING
    IS_CLOSING = True
    print("App wird beendet...")
    os._exit(0)

# ==========================================
# MAIN
# ==========================================
if __name__ == '__main__':
    # Signal Handler
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

    api = JsApi()
    
    # Fenster erstellen
    window = webview.create_window(
        'Pro Visualizer', 
        url=html_path,
        width=1000, 
        height=600, 
        background_color='#050505', 
        js_api=api
    )
    
    window.events.closed += on_closed

    # Starten (WICHTIG: debug=False)
    # args=(window,) ist hier nicht mehr nötig, da window global ist,
    # aber func=start_backend braucht keine Argumente mehr in dieser Version.
    try:
        webview.start(func=start_backend, debug=False)
    except KeyboardInterrupt:
        on_closed()
    except Exception as e:
        print(f"Critical Error: {e}")
        on_closed()