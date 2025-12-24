/**
 * Kommunikation zwischen UI (HTML) und Logik (Python/JS)
 */

// 1. MASTER GAIN / SENSITIVITY
function updateSens(val) { 
    sensitivity = parseFloat(val); 
    // Synchronisiere Slider, falls der Aufruf von Python kommt
    if(document.getElementById('sens-slider')) {
        document.getElementById('sens-slider').value = val;
    }
    // Label aktualisieren (falls nicht schon durch oninput im HTML erledigt)
    if(document.getElementById('lbl-gain')) {
        document.getElementById('lbl-gain').innerText = val;
    }
}

// 2. BASS ENGINE SETTINGS
function updateBassRange(val) {
    bassRangeSetting = parseInt(val);
    audioData.config.bassRange = bassRangeSetting;
    if(document.getElementById('bass-range-slider')) {
        document.getElementById('bass-range-slider').value = val;
    }
    if(typeof updateHzDisplay === 'function') updateHzDisplay();
}

function updateBassOffset(val) {
    bassOffsetSetting = parseInt(val);
    audioData.config.bassOffset = bassOffsetSetting;
    if(document.getElementById('bass-offset-slider')) {
        document.getElementById('bass-offset-slider').value = val;
    }
    if(typeof updateHzDisplay === 'function') updateHzDisplay();
}

function updateBassSens(val) {
    bassSensSetting = parseFloat(val);
    audioData.config.bassSens = bassSensSetting;
    if(document.getElementById('bass-sens-slider')) {
        document.getElementById('bass-sens-slider').value = val;
    }
}

// 3. STYLE WECHSEL
function changeStyle(name) {
    if(renderers[name]) {
        currentStyleName = name;
        currentRenderer = renderers[name];
        if(document.getElementById('style-select')) {
            document.getElementById('style-select').value = name;
        }
        
        // Spezieller Effekt für Neon
        const container = document.getElementById('container');
        if(container) {
            container.style.webkitBoxReflect = 
                (name === 'neon') ? 'below 0px linear-gradient(transparent, transparent, rgba(0,0,0,0.3))' : 'none';
        }
    }
}

// 4. CONFIG VON PYTHON EMPFANGEN
function applyConfig(style, sens, pos, bRange, bOff, bSens, pEn, pThr, pInt) {
    changeStyle(style);
    updateSens(sens);
    updateMediaPos(pos || 'top-left');
    updateBassRange(bRange || 5);
    updateBassOffset(bOff || 0);
    updateBassSens(bSens || 1.2);

    // Particle Checkboxen & Slider
    const elToggle = document.getElementById('particle');
    if(elToggle) elToggle.checked = pEn;
    
    const elThresh = document.getElementById('particle-threshold');
    if(elThresh) {
        elThresh.value = pThr;
        if(typeof updateLabel === 'function') updateLabel('lbl-sthresh', pThr);
    }

    const elInt = document.getElementById('particle-intensity');
    if(elInt) {
        elInt.value = pInt;
        if(typeof updateLabel === 'function') updateLabel('lbl-sint', pInt);
    }
}

// 5. AUDIO DATEN VOM BACKEND
function updateData(jsonStr) {
    try {
        const parsed = JSON.parse(jsonStr);
        
        for(let i=0; i<64; i++) {
            // HIER WIRD SENSITIVITY ANGEWENDET
            let target = parsed.bars[i] * sensitivity;
            if(target > 100) target = 100;

            let attack = i < 8 ? 0.95 : (i < 20 ? 0.5 : 0.3);
            let decay = i < 8 ? 15.0 : (i < 20 ? 5.0 : 2.0);

            if(target > audioData.bars[i]) {
                audioData.bars[i] += (target - audioData.bars[i]) * attack; 
            } else {
                audioData.bars[i] -= decay; 
            }
            if(audioData.bars[i] < 0) audioData.bars[i] = 0;
        }

        audioData.volL += (parsed.volL * sensitivity - audioData.volL) * 0.4;
        audioData.volR += (parsed.volR * sensitivity - audioData.volR) * 0.4;
    } catch(e) { }
}

// 6. MEDIA INFO (COVER/TITEL)
function updateMediaInfo(jsonStr) {
    try {
        const info = JSON.parse(jsonStr);
        const overlay = document.getElementById('media-overlay');
        if (info.title) {
            document.getElementById('media-title').innerText = info.title;
            document.getElementById('media-artist').innerText = info.artist || "";
            const img = document.getElementById('media-cover');
            if (info.cover) { img.src = info.cover; img.style.display = "block"; } 
            else { img.style.display = "none"; }
            overlay.style.opacity = 1;
        } else { overlay.style.opacity = 0; }
    } catch(e) {}
}

// 7. MEDIA POSITION
function updateMediaPos(pos) {
    mediaPosition = pos;
    const overlay = document.getElementById('media-overlay');
    if(!overlay) return;
    overlay.classList.remove('pos-tl', 'pos-tr', 'pos-bl', 'pos-br');
    overlay.classList.add('pos-' + pos.split('-').map(s => s[0]).join('')); // Kurzform tl, tr...
    if(document.getElementById('pos-select')) {
        document.getElementById('pos-select').value = pos;
    }
}

// 8. EINSTELLUNGEN SPEICHERN
function saveSettings() {
    if(window.pywebview) {
        const pEnabled = document.getElementById('particle').checked;
        const pThresh = document.getElementById('particle-threshold').value;
        const pInt = document.getElementById('particle-intensity').value;

        window.pywebview.api.save_settings(
            currentStyleName, 
            sensitivity, 
            mediaPosition, 
            bassRangeSetting, 
            bassOffsetSetting,
            bassSensSetting,
            pEnabled,
            pThresh,
            pInt
        );
        if(typeof addLog === 'function') addLog('INFO', 'Settings saved.');
    }
}