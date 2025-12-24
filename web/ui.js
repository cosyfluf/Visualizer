/**
 * UI & Settings Controller for Pro Visualizer
 * Handles Tabs, Slider Labels, and the Python Bridge
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. TAB SYSTEM ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.onclick = () => {
            const target = btn.getAttribute('data-tab');
            
            // Remove active classes
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active to current
            btn.classList.add('active');
            document.getElementById('tab-' + (target === 'audio' ? 'audio' : target)).classList.add('active');
        };
    });

    // --- 2. MODAL TOGGLE ---
    const menuBtn = document.getElementById('menu-btn');
    const settingsModal = document.getElementById('settings-modal');
    
    menuBtn.onclick = () => {
        const isVisible = settingsModal.style.display === 'flex';
        settingsModal.style.display = isVisible ? 'none' : 'flex';
    };

    // --- 3. REAL-TIME LABEL UPDATES (The blue numbers) ---
    const setupSlider = (sliderId, labelId) => {
        const slider = document.getElementById(sliderId);
        const label = document.getElementById(labelId);
        if (slider && label) {
            slider.addEventListener('input', () => {
                label.innerText = slider.value;
            });
        }
    };

    setupSlider('sens-slider', 'lbl-gain');           // Visuals: Master Gain
    setupSlider('bass-sens-slider', 'lbl-bsens');     // Bass: Boost
    setupSlider('bass-range-slider', 'lbl-brange');   // Bass: Freq Range
    setupSlider('particle-intensity', 'lbl-sint');    // Bass: Intensity

    // --- 4. SAVE SETTINGS BRIDGE ---
    const saveBtn = document.getElementById('save-btn');
    saveBtn.onclick = () => {
        // Collect everything into ONE object for the Python JsApi.save_settings(self, data)
        const configData = {
            style: document.getElementById('style-select').value,
            sensitivity: parseFloat(document.getElementById('sens-slider').value),
            media_position: document.getElementById('pos-select').value,
            bass_range: parseInt(document.getElementById('bass-range-slider').value),
            bass_offset: 0, // Placeholder if you add it later
            bass_sens: parseFloat(document.getElementById('bass-sens-slider').value),
            particle_enabled: document.getElementById('particle').checked,
            particle_threshold: 20, // Default threshold
            particle_intensity: parseInt(document.getElementById('particle-intensity').value),
            wallpaper_mode: document.getElementById('wallpaper-mode').checked
        };

        if (window.pywebview && pywebview.api) {
            pywebview.api.save_settings(configData);
            settingsModal.style.display = 'none'; // Close after saving
        }
    };
});

/**
 * Global Bridge: Called by Python on Startup to fill the UI with saved values
 */
window.applyConfig = (style, sens, pos, bRange, bOff, bSens, pEn, pThr, pInt, wall) => {
    // Fill Selects
    document.getElementById('style-select').value = style;
    document.getElementById('pos-select').value = pos;
    
    // Fill Sliders & Labels
    document.getElementById('sens-slider').value = sens;
    document.getElementById('lbl-gain').innerText = sens;

    document.getElementById('bass-sens-slider').value = bSens;
    document.getElementById('lbl-bsens').innerText = bSens;

    document.getElementById('bass-range-slider').value = bRange;
    document.getElementById('lbl-brange').innerText = bRange;

    document.getElementById('particle-intensity').value = pInt;
    document.getElementById('lbl-sint').innerText = pInt;

    // Fill Checkboxes
    document.getElementById('particle').checked = pEn;
    document.getElementById('wallpaper-mode').checked = wall;

    // Trigger immediate updates in visual engine (app.js)
    if (typeof changeStyle === 'function') changeStyle(style);
    if (typeof updateMediaPos === 'function') updateMediaPos(pos);
};