# 🎵 Pro Visualizer

![Project Banner](screenshots/project-banner.png)

> **A high-performance, real-time desktop audio visualizer built with Python and Web technologies.**

[![Python](https://img.shields.io/badge/Python-3.8%2B-blue.svg)](https://www.python.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows_%7C_Linux-blue.svg)]()
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Pro Visualizer** captures your system audio (Loopback/Monitor) or Microphone in real-time and renders stunning, hardware-accelerated visualizations using a web-based frontend. It features retro aesthetics, media information overlay, and deep customization.

---

## ✨ Features

*   **System Audio & Mic Capture:**
    *   **Windows:** Visualizes "Loopback" (System Sound) or Microphone.
    *   **Linux:** Supports PulseAudio/PipeWire "Monitor" sources and Microphones.
*   **8+ Unique Visual Styles:** From Retro Synthwave to Analog VU Meters.
*   **Media Integration:**
    *   **Windows:** Uses Windows Media API (SMTC).
    *   **Linux:** Uses DBus / MPRIS2 (Spotify, VLC, Rhythmbox, etc.).
*   **Hardware Acceleration:** Uses `pywebview` (Edge on Windows, GTK/WebKit on Linux) for smooth 60FPS rendering.
*   **Deep Customization:** Adjust sensitivity, bass-trigger range, and layout positions on the fly.
*   **Zero-Lag UI:** Audio processing runs on a dedicated thread separate from the rendering engine.

---

## 📸 Gallery

| **Neon Flow** | **Synthwave 80s** |
|:---:|:---:|
| ![Neon Mode](screenshots/neon.png) | ![Synthwave Mode](screenshots/synthwave.png) |
| *Classic spectrum analyzer* | *Retro sun and grid landscape* |

| **Analog VU Meter** | **Magic Eye (Tube)** |
|:---:|:---:|
| ![VU Meter](screenshots/vu.png) | ![Magic Eye](screenshots/mgiceye.png) |
| *Realistic analog physics* | *Vintage vacuum tube EM34 simulation* |

---

## 🚀 Installation

### Prerequisites
*   Python 3.8 or higher

### 1. Clone the Repository
```bash
git clone -b Linux https://github.com/cosyfluf/Visualizer.git
cd Visualizer
```

### 2. System Dependencies (OS Specific)

#### 🪟 Windows
No extra system steps required. Proceed to step 3.

#### 🐧 Linux (Ubuntu/Debian/Mint)
You must install system headers for the GUI and Audio backend before installing Python packages:

```bash
sudo apt update
sudo apt install python3-dev python3-venv libgirepository1.0-dev gcc libcairo2-dev pkg-config python3-dbus libdbus-1-dev libasound2-dev
```

### 3. Install Python Dependencies
```bash
pip install -r requirements.txt
```

> **Note for Linux Users:** If you get an error installing `dbus-python` or `pywebview`, ensure you ran the `apt install` command above.

---

## 🎮 Usage

### Start the App
Run the main Python script:
```bash
python visualizer.py
```

### Audio Setup
1.  On launch, the terminal will list available audio devices.
2.  **Select your Input:**
    *   **Windows:** Select a device with "Loopback" in the name for System Audio.
    *   **Linux:** Select a device starting with "Monitor of..." for System Audio.
    *   **Microphone:** Select any other device to use your mic.
3.  Enter the **ID** number.
4.  The app will remember your choice in `config.json`.

### Controls
*   **Open Settings:** Click the `⋮` button in the top-right corner.
*   **Toggle Fullscreen:** Double-click anywhere on the window.
*   **Save Settings:** Click "Speichern" or press `Ctrl + S`.
*   **Close App:** Close the window or press `Ctrl + C` in the terminal.

---

## 🎨 Visualization Modes

1.  **Neon Flow:** Clean, modern bars with gradient coloring.
2.  **K.I.T.T.:** Knight Rider style center-out red bars.
3.  **LED Matrix:** Segmented blocks with green/yellow/red peak hold.
4.  **Analog VU:** High-fidelity vintage needle meters with ballistics.
5.  **Magic Eye:** Simulation of a vintage EM34 radio tuning tube.
6.  **Synthwave 80s:** A 3D moving grid with a pulsating retro sun.
7.  **HoloRenderer:** Sci-fi radial gravity core with particles.
8.  **Nyan Cat:** Because why not? 🐱🌈

---

## ⚙️ Configuration

Settings are saved automatically to `config.json`.

| Setting | Description |
| :--- | :--- |
| **Style** | Choose the active visual renderer. |
| **Sensitivity** | Master volume gain (0.1 - 3.0). Useful for quiet Microphones. |
| **Bass Range** | How wide the frequency band for bass detection is. |
| **Bass Offset** | Start frequency for bass detection (Hz offset). |
| **Particle Threshold** | Volume level required to trigger particle effects. |

---

## ⚠️ Troubleshooting

**"No Audio / Flat Line"**
*   **Windows:** Ensure you selected a **Loopback** device.
*   **Linux:** Ensure you selected a **Monitor of...** device. If using a Microphone, you might need to increase **Sensitivity** in the settings menu.

**"ImportError: No module named dbus" (Linux)**
*   You are missing the system package. Run `sudo apt install python3-dbus`.

**"Window does not appear" (Linux Wayland)**
*   `pywebview` usually handles Wayland, but if it fails, try running with:
    `GDK_BACKEND=x11 python visualizer.py`

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Created with ❤️ by [cosyfluf](https://github.com/cosyfluf)**