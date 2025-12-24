const canvas = document.getElementById('viz');
const ctx = canvas.getContext('2d');
let width, height;

// Globale Status-Variablen
let sensitivity = 1.0;
let currentStyleName = 'neon';
let mediaPosition = 'top-left';
let bassRangeSetting = 5;
let bassOffsetSetting = 0;
let bassSensSetting = 1.2;

// Daten-Objekt für alle Renderer
let audioData = { 
    bars: new Array(64).fill(0), 
    volL: 0, 
    volR: 0, 
    config: { bassRange: 5, bassOffset: 0, bassSens: 1.2 } 
};

// Custom Logic Variablen
let currentCustomLogic = null;
let customVars = { x: 0, y: 0, color: '#0078d7' };

function resize() {
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;
}

function draw() {
    requestAnimationFrame(draw);
    
    if (currentCustomLogic) {
        processCustomLogic(audioData);
    }

    // Löschen
    if (currentStyleName !== 'oscilloscopemusic') {
        ctx.clearRect(0, 0, width, height);
    }

    // --- REIHENFOLGE DER LAYER ---
    // 1. Custom Backgrounds/Bilder (Unten)
    if (typeof drawCustomLayers === 'function') {
        drawCustomLayers(ctx, width, height);
    }

    // 2. Aktueller Visualizer Style (Mitte)
    if(currentRenderer) {
        currentRenderer.draw(ctx, width, height, audioData);
    }
}

// Dummy für nicht geladene Styles
class DummyRenderer { draw(ctx){} }