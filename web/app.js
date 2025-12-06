// ==========================================
// 1. NEUE RENDERER KLASSEN
// ==========================================

class SynthwaveRenderer {
    constructor() {
        this.offset = 0; 
        this.stars = [];
        for(let i=0; i<100; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random() * 0.65,
                size: Math.random() * 2,
                blinkSpeed: Math.random() * 0.1 + 0.01
            });
        }
        this.particles = [];
        for(let i=0; i<60; i++) {
            this.particles.push({
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2,
                z: Math.random()
            });
        }
    }

    draw(ctx, width, height, data) {
        const horizonY = height * 0.65;
        const centerX = width / 2;
        
        let bass = 0;
        if(data.bars && data.bars.length > 0) {
            bass = data.bars.slice(0, 4).reduce((a,b)=>a+b,0) / 4;
            bass /= 255; 
        }

        // BG
        let bgGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
        bgGrad.addColorStop(0.0, "#050010");
        bgGrad.addColorStop(1.0, "#240046");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, horizonY);

        // Stars
        ctx.fillStyle = "#fff";
        this.stars.forEach(star => {
            let opacity = 0.3 + Math.sin(Date.now() * star.blinkSpeed) * 0.7;
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // Warp Particles
        ctx.fillStyle = "rgba(200, 255, 255, 0.8)";
        this.particles.forEach(p => {
            p.z -= 0.005 + (bass * 0.02);
            if(p.z <= 0) {
                p.z = 1;
                p.x = (Math.random() - 0.5) * 2;
                p.y = (Math.random() - 0.5) * 2;
            }
            let px = centerX + (p.x / p.z) * (width * 0.5);
            let py = (height * 0.3) + (p.y / p.z) * (height * 0.5);
            let size = (1 - p.z) * 3;
            if(py < horizonY && px > 0 && px < width) {
                ctx.globalAlpha = 1 - p.z;
                ctx.fillRect(px, py, size, size);
            }
        });
        ctx.globalAlpha = 1.0;

        // Sun
        const sunRadius = (height * 0.20) + (bass * (height * 0.05)); 
        const sunY = horizonY - (sunRadius * 0.4); 
        
        ctx.save();
        ctx.shadowBlur = 50 + (bass * 20);
        ctx.shadowColor = "#ff0054";
        ctx.beginPath();
        ctx.arc(centerX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#ff0054";
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        let sunGrad = ctx.createLinearGradient(centerX, sunY - sunRadius, centerX, sunY + sunRadius);
        sunGrad.addColorStop(0.0, "#ffd60a");
        sunGrad.addColorStop(0.5, "#ff9e00");
        sunGrad.addColorStop(1.0, "#ff0054");
        ctx.save();
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(centerX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Sun Blinds
        ctx.fillStyle = "#240046";
        const startCut = sunY + (sunRadius * 0.15);
        for(let y = startCut; y < sunY + sunRadius; y+=0) {
                let progress = (y - startCut) / (sunRadius * 0.85);
                let h = (height * 0.005) + (progress * progress * (height * 0.02));
                let gap = (height * 0.02);
                ctx.fillRect(centerX - sunRadius, y, sunRadius*2, h);
                y += h + gap;
        }
        ctx.restore();

        // Mountains
        const barCount = 40;
        const barW = (width / 2) / barCount;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        for(let i=barCount-1; i>=0; i--) {
                let val = (data.bars && data.bars[i]) ? data.bars[i] : 0;
                let h = (val / 255) * (height * 0.3);
                ctx.lineTo(centerX - (i * barW), horizonY - h);
        }
        for(let i=0; i<barCount; i++) {
                let val = (data.bars && data.bars[i]) ? data.bars[i] : 0;
                let h = (val / 255) * (height * 0.3);
                ctx.lineTo(centerX + (i * barW), horizonY - h);
        }
        ctx.lineTo(width, horizonY);
        ctx.lineTo(0, horizonY);
        ctx.closePath();
        ctx.fillStyle = "#000"; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
        ctx.shadowColor = "cyan"; ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0; ctx.restore();

        // Grid
        ctx.save();
        ctx.beginPath(); ctx.rect(0, horizonY, width, height - horizonY); ctx.clip();
        let floorGrad = ctx.createLinearGradient(0, horizonY, 0, height);
        floorGrad.addColorStop(0, "#240046");
        floorGrad.addColorStop(1, "#000000");
        ctx.fillStyle = floorGrad; ctx.fillRect(0, horizonY, width, height-horizonY);

        ctx.strokeStyle = "rgba(255, 0, 255, 0.4)"; ctx.lineWidth = 2;
        ctx.shadowColor = "#f0f"; ctx.shadowBlur = 5;
        for(let x = -width; x < width*2; x += width * 0.15) {
                ctx.beginPath(); ctx.moveTo(centerX, horizonY);
                let dist = x - centerX; ctx.lineTo(centerX + (dist * 4), height); ctx.stroke();
        }
        let speed = 0.005 + (bass * 0.01);
        this.offset = (this.offset + speed) % 1;
        for(let i=0; i<15; i++) {
                let z = (i / 15) + this.offset * 0.066; 
                let depth = z % 1;
                if(depth < 0.01) continue;
                let y = horizonY + (height - horizonY) * Math.pow(depth, 2.5);
                ctx.globalAlpha = depth; 
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
        }
        ctx.restore();

        // Scanlines
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        for(let y=0; y<height; y+=3) { ctx.fillRect(0, y, width, 1); }
        ctx.restore();
    }
}

class HoloOrbRenderer {
    constructor() {
        this.angleOffset = 0; 
        this.particles = [];  
        this.shockwaves = []; 
        this.colorHue = 200;  
    }

    draw(ctx, width, height, data) {
        const cx = width / 2;
        const cy = height / 2;
        
        // --- SETTINGS EINLESEN (NEU) ---
        // Wir holen uns die Werte direkt aus den HTML Elementen
        const elToggle = document.getElementById('particle');
        const elIntensity = document.getElementById('particle-intensity');
        const elThreshold = document.getElementById('particle-threshold');

        // Standardwerte, falls Elemente noch nicht geladen sind
        const particlesOn = elToggle ? elToggle.checked : true;
        const intensityVal = elIntensity ? parseInt(elIntensity.value) : 50; // 0 bis 100
        const thresholdVal = elThreshold ? parseInt(elThreshold.value) : 50; // 0 bis 100

        // Werte umrechnen für die Logik
        // Threshold: Slider (0-100) -> Bass-Wert (0.0 - 1.0)
        // Je höher der Slider, desto härter muss der Bass sein.
        // Wir mappen 0-100 auf ca 0.3 bis 0.95 range
        const calcThreshold = 0.3 + (thresholdVal / 100) * 0.65;

        // Intensity: Slider (0-100) -> Anzahl Partikel (0 bis ca 15)
        const spawnCount = Math.floor(intensityVal / 6); 

        // --- AUDIO ANALYSE ---
        let bass = 0;
        if (data.bars && data.bars.length > 0) {
            bass = data.bars.slice(0, 8).reduce((a, b) => a + b, 0) / 8;
            bass /= 255; 
        }
        let treble = 0;
        if (data.bars && data.bars.length > 0) {
            treble = data.bars.slice(20, 40).reduce((a, b) => a + b, 0) / 20;
            treble /= 255;
        }

        this.colorHue = (this.colorHue + 0.2) % 360; 
        
        // Hintergrund
        let bgGrad = ctx.createRadialGradient(cx, cy, height * 0.1, cx, cy, height);
        bgGrad.addColorStop(0, "#050a14");
        bgGrad.addColorStop(1, "#000000");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // --- PARTIKEL LOGIK (ANGEPASST) ---
        // Nur ausführen, wenn Toggle AN ist
        if (particlesOn) {
            // Spawn basierend auf Slider-Werten
            if (bass > calcThreshold) {
                // Anzahl basierend auf Intensity Slider
                for (let i = 0; i < spawnCount; i++) {
                    let angle = Math.random() * Math.PI * 2;
                    // Geschwindigkeit variieren
                    let speedMult = 2 + (Math.random() * 5); 
                    
                    this.particles.push({
                        x: cx, y: cy,
                        vx: Math.cos(angle) * speedMult,
                        vy: Math.sin(angle) * speedMult,
                        life: 1.0, 
                        size: Math.random() * 3 + 1,
                        hue: this.colorHue + (Math.random() * 40 - 20)
                    });
                }
            }
            
            // Shockwaves auch nur wenn AN und Bass sehr stark (Threshold + ein bisschen extra)
            if (bass > (calcThreshold + 0.1) && this.shockwaves.length < 3) {
                this.shockwaves.push({ r: 50, opacity: 1.0 });
            }
        }

        // --- PARTIKEL ZEICHNEN ---
        // (Wird immer ausgeführt, damit existierende Partikel ausfaden, auch wenn man ausschaltet)
        this.particles.forEach((p, index) => {
            p.x += p.vx; p.y += p.vy; p.life -= 0.02; 
            if (p.life <= 0) { this.particles.splice(index, 1); } else {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = `hsl(${p.hue}, 80%, 60%)`;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            }
        });

        // Shockwaves zeichnen
        ctx.lineWidth = 3;
        this.shockwaves.forEach((sw, index) => {
            sw.r += 10 + (bass * 5); sw.opacity -= 0.04;
            if(sw.opacity <= 0) { this.shockwaves.splice(index, 1); } else {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(255, 255, 255, ${sw.opacity})`;
                ctx.arc(cx, cy, sw.r, 0, Math.PI * 2); ctx.stroke();
            }
        });
        ctx.globalAlpha = 1.0;

        // --- VISUALIZER BARS (RESTLICHER CODE) ---
        const barsToDraw = 64; 
        const radius = (height * 0.15) + (bass * 30); 
        
        ctx.save();
        ctx.translate(cx, cy); 
        this.angleOffset += 0.005 + (treble * 0.01);
        ctx.rotate(this.angleOffset);

        for (let i = 0; i < barsToDraw; i++) {
            let dataIndex = i < (barsToDraw / 2) ? i : (barsToDraw - i);
            let val = data.bars[dataIndex] || 0;
            let barLen = (val / 255) * (height * 0.25);
            barLen = Math.max(barLen, 5); 
            let angle = (Math.PI * 2 * i) / barsToDraw;

            ctx.save();
            ctx.rotate(angle);
            let hue = this.colorHue + (val * 0.5); 
            ctx.fillStyle = `hsl(${hue}, 90%, 50%)`;
            ctx.shadowBlur = 10; ctx.shadowColor = `hsl(${hue}, 90%, 50%)`;

            ctx.beginPath();
            ctx.roundRect(0, radius, 4, barLen, 4); 
            ctx.fill();
            
            ctx.fillStyle = "#fff";
            ctx.beginPath(); ctx.arc(2, radius + barLen + 10, 2, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
        ctx.restore();

        // --- KERN ---
        ctx.save();
        let coreRadius = (height * 0.08) + (bass * 20);
        let grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
        grad.addColorStop(0, "#ffffff"); 
        grad.addColorStop(0.4, `hsl(${this.colorHue}, 100%, 70%)`); 
        grad.addColorStop(1, `rgba(0,0,0,0)`); 

        ctx.globalCompositeOperation = "screen"; 
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2); ctx.fill();
        
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"; ctx.lineWidth = 1;
        ctx.translate(cx, cy);
        ctx.rotate(-this.angleOffset * 2); 
        ctx.beginPath();
        const triSize = coreRadius * 0.6;
        for(let j=0; j<3; j++) {
            let a = (Math.PI * 2 * j) / 3;
            ctx.lineTo(Math.cos(a)*triSize, Math.sin(a)*triSize);
        }
        ctx.closePath(); ctx.stroke();
        ctx.restore();
    }
}

class NyanCatRenderer {
    constructor() {
        this.frame = 0; 
        this.stars = [];
        this.starSpeed = 5;
        this.rainbowColors = ['#ff0000', '#ff9900', '#ffff00', '#33ff00', '#0099ff', '#6633ff'];
        
        for(let i=0; i<40; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random(),
                size: Math.random() * 3 + 1
            });
        }
    }

    draw(ctx, width, height, data) {
        let bass = 0;
        if(data.bars && data.bars.length > 0) {
            bass = data.bars.slice(0, 5).reduce((a,b)=>a+b,0) / 5;
            bass /= 255; 
        }

        this.frame += 0.2 + (bass * 0.3);
        let animFrame = Math.floor(this.frame) % 6; 
        const pSize = height * 0.005; 
        
        ctx.fillStyle = "#00435C";
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "#fff";
        let currentSpeed = 0.005 + (bass * 0.02); 
        
        this.stars.forEach(star => {
            star.x -= currentSpeed;
            if(star.x < 0) {
                star.x = 1;
                star.y = Math.random();
            }
            let size = star.size * (1 + bass);
            ctx.fillRect(star.x * width, star.y * height, size, size);
        });

        const catX = width * 0.4; 
        const catY = height * 0.5;
        const trailSegments = 40;
        const segmentWidth = catX / trailSegments;

        for(let i = 0; i < trailSegments; i++) {
            let audioIdx = Math.floor(i * (data.bars.length / trailSegments));
            let val = data.bars[audioIdx] || 0;
            let waveOffset = Math.sin((i * 0.3) + (this.frame * 0.5)) * (height * 0.02);
            let audioOffset = (val / 255) * (height * 0.15); 
            
            let segY = catY + waveOffset + (Math.sin(i)* audioOffset * (i%2==0?1:-1)); 
            let x = i * segmentWidth;
            let stripeHeight = pSize * 4; 
            
            this.rainbowColors.forEach((color, cIdx) => {
                ctx.fillStyle = color;
                let yPos = segY + (cIdx * stripeHeight) - (stripeHeight * 3);
                ctx.fillRect(x, yPos, segmentWidth + 1, stripeHeight);
            });
        }

        let bounceY = Math.sin(this.frame) * (pSize * 2) - (bass * pSize * 5);
        
        ctx.save();
        ctx.translate(catX, catY + bounceY);

        const drawRect = (x, y, w, h, color) => {
            ctx.fillStyle = color;
            ctx.fillRect(x * pSize, y * pSize, w * pSize, h * pSize);
        };

        drawRect(-2, -10, 22, 21, "#fccb94"); 
        drawRect(0, -8, 18, 17, "#ff3399"); 
        drawRect(3, -5, 2, 2, "#ff0000");
        drawRect(12, 0, 2, 2, "#ff0000");
        drawRect(6, 4, 2, 2, "#ff0000");

        const headX = 12;
        const headY = -5;
        drawRect(headX, headY, 14, 10, "#999999");
        drawRect(headX + 1, headY - 3, 3, 3, "#999999"); 
        drawRect(headX + 10, headY - 3, 3, 3, "#999999"); 
        
        drawRect(headX + 3, headY + 2, 3, 3, "#ffffff"); 
        drawRect(headX + 5, headY + 3, 1, 1, "#000000"); 
        
        drawRect(headX + 9, headY + 2, 3, 3, "#ffffff"); 
        drawRect(headX + 11, headY + 3, 1, 1, "#000000"); 

        drawRect(headX + 8, headY + 5, 1, 1, "#000000"); 
        drawRect(headX + 1, headY + 5, 2, 2, "#ff9999");
        drawRect(headX + 12, headY + 5, 2, 2, "#ff9999");

        let tailY = (animFrame % 2 === 0) ? -2 : 0;
        drawRect(-9, -4 + tailY, 7, 4, "#999999");

        let legOffset = (animFrame > 2) ? 2 : 0;
        drawRect(1, 11 - legOffset, 3, 3, "#999999"); 
        drawRect(5, 11 + legOffset, 3, 3, "#999999"); 
        drawRect(13, 10 + legOffset, 3, 3, "#999999"); 
        drawRect(17, 10 - legOffset, 3, 3, "#999999"); 

        ctx.restore();
        ctx.font = `bold ${height*0.05}px 'Courier New', monospace`;
        ctx.fillStyle = "#fff";
        ctx.textAlign = "right";
        ctx.fillText("NYAN MODE", width - 20, height * 0.1);
    }
}

// ==========================================
// 2. MAIN LOGIC & SETUP
// ==========================================

const canvas = document.getElementById('viz');
const ctx = canvas.getContext('2d');
let width, height;

// State
let sensitivity = 1.0;
let currentStyleName = 'neon';
let mediaPosition = 'top-left';
let bassRangeSetting = 5;
let bassOffsetSetting = 0;
let bassSensSetting = 1.2; 

// Data Object for Renderers
let audioData = { 
    bars: new Array(64).fill(0), 
    volL: 0, 
    volR: 0, 
    config: { bassRange: 5, bassOffset: 0, bassSens: 1.2 } 
};

function resize() {
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

// Fallback Renderers
class DummyRenderer { draw(ctx){} }

// RENDERER REGISTRIERUNG
const renderers = {
    'neon': (typeof NeonRenderer !== 'undefined') ? new NeonRenderer() : new DummyRenderer(),
    'kitt': (typeof KittRenderer !== 'undefined') ? new KittRenderer() : new DummyRenderer(),
    'led':  (typeof LedRenderer !== 'undefined')  ? new LedRenderer() : new DummyRenderer(),
    'vu':   (typeof VuRenderer !== 'undefined')   ? new VuRenderer() : new DummyRenderer(),
    'magiceye': (typeof MagicEyeRenderer !== 'undefined') ? new MagicEyeRenderer() : new DummyRenderer(),
    
    // Die neuen Klassen aus dieser Datei
    'synthwave': new SynthwaveRenderer(),
    'HoloRenderer': new HoloOrbRenderer(),
    'nyancat': new NyanCatRenderer()
};

let currentRenderer = renderers['neon'];

// --- HERTZ RECHNER ---
function calculateHz(barIndex) {
    if(barIndex < 0) barIndex = 0;
    if(barIndex > 64) barIndex = 64;
    let hz = 30 * Math.pow((15000 / 30), (barIndex / 64));
    return Math.round(hz);
}

function updateHzDisplay() {
    let startIdx = parseInt(bassOffsetSetting);
    let endIdx = startIdx + parseInt(bassRangeSetting);
    let startHz = calculateHz(startIdx);
    let endHz = calculateHz(endIdx);
    document.getElementById('hz-display').innerText = `${startHz} Hz - ${endHz} Hz`;
}

// --- UPDATES ---
function changeStyle(name) {
    if(renderers[name]) {
        currentStyleName = name;
        currentRenderer = renderers[name];
        document.getElementById('style-select').value = name;
        document.getElementById('container').style.webkitBoxReflect = 
            (name === 'neon') ? 'below 0px linear-gradient(transparent, transparent, rgba(0,0,0,0.3))' : 'none';
    } else {
        addLog("ERROR", "Renderer nicht gefunden: " + name);
    }
}

function updateSens(val) { 
    sensitivity = parseFloat(val); 
    document.getElementById('sens-slider').value = val;
}

function updateMediaPos(pos) {
    mediaPosition = pos;
    const overlay = document.getElementById('media-overlay');
    overlay.classList.remove('pos-tl', 'pos-tr', 'pos-bl', 'pos-br');
    if(pos === 'top-left') overlay.classList.add('pos-tl');
    if(pos === 'top-right') overlay.classList.add('pos-tr');
    if(pos === 'bottom-left') overlay.classList.add('pos-bl');
    if(pos === 'bottom-right') overlay.classList.add('pos-br');
    document.getElementById('pos-select').value = pos;
}

function updateBassRange(val) {
    bassRangeSetting = parseInt(val);
    document.getElementById('bass-range-slider').value = val;
    document.getElementById('bass-val-display').innerText = val;
    audioData.config.bassRange = bassRangeSetting;
    updateHzDisplay();
}

function updateBassOffset(val) {
    bassOffsetSetting = parseInt(val);
    document.getElementById('bass-offset-slider').value = val;
    audioData.config.bassOffset = bassOffsetSetting;
    updateHzDisplay();
}

function updateBassSens(val) {
    bassSensSetting = parseFloat(val);
    document.getElementById('bass-sens-slider').value = val;
    document.getElementById('bass-sens-display').innerText = val;
    audioData.config.bassSens = bassSensSetting;
}

// --- INIT & SAVE ---
function applyConfig(style, sens, pos, bassRange, bassOffset, bassSens) {
    changeStyle(style);
    updateSens(sens);
    updateMediaPos(pos || 'top-left');
    updateBassRange(bassRange || 5);
    updateBassOffset(bassOffset || 0);
    updateBassSens(bassSens || 1.2); 
    addLog('INFO', `Config geladen.`);
}

function saveSettings() {
    if(window.pywebview) {
        window.pywebview.api.save_settings(
            currentStyleName, 
            sensitivity, 
            mediaPosition, 
            bassRangeSetting, 
            bassOffsetSetting,
            bassSensSetting 
        );
        addLog('INFO', 'Gespeichert.');
        const btn = document.getElementById('save-btn');
        const old = btn.innerText; btn.innerText = "OK!";
        setTimeout(() => btn.innerText = old, 1000);
    }
}

// --- DATA LOOP ---
function updateData(jsonStr) {
    try {
        const parsed = JSON.parse(jsonStr);
        
        // Physics Smoothing Loop
        for(let i=0; i<64; i++) {
            let target = parsed.bars[i] * sensitivity;
            if(target > 100) target = 100;

            // --- PHYSIK EINSTELLUNGEN ---
            let attack, decay;

            // Bereich für das BASS-METER (Index 0 bis 8)
            if (i < 8) { 
                attack = 0.95;  
                decay = 15.0;   
            } 
            // TIEFE MITTEN (Übergang)
            else if (i < 20) {
                attack = 0.5;
                decay = 5.0;
            } 
            // HÖHEN (Weicher)
            else {
                attack = 0.3;   
                decay = 2.0;    
            }

            // Physik berechnen
            if(target > audioData.bars[i]) {
                // Nadel geht hoch (Attack)
                audioData.bars[i] += (target - audioData.bars[i]) * attack; 
            } else {
                // Nadel fällt (Decay)
                audioData.bars[i] -= decay; 
            }
            
            // Begrenzung nach unten
            if(audioData.bars[i] < 0) audioData.bars[i] = 0;
        }

        // Volume (Große VU Meter) Smoothing
        let rawL = (parsed.volL !== undefined) ? parsed.volL : 0;
        let rawR = (parsed.volR !== undefined) ? parsed.volR : 0;
        
        audioData.volL += (rawL * sensitivity - audioData.volL) * 0.4;
        audioData.volR += (rawR * sensitivity - audioData.volR) * 0.4;

    } catch(e) { }
}

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

function draw() {
    requestAnimationFrame(draw);
    ctx.clearRect(0, 0, width, height);
    if(currentRenderer) {
        currentRenderer.draw(ctx, width, height, audioData);
    }
}
draw();

function toggleSettings() {
    const m = document.getElementById('settings-modal');
    m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
}
function addLog(lvl, msg) {
    const row = document.createElement('div');
    row.innerHTML = `<span style="color:${lvl==='ERROR'?'#f55':'#0f8'}">[${lvl}]</span> ${msg}`;
    document.getElementById('console-body').appendChild(row);
}
function setStatus(txt) { document.getElementById('status').innerText = txt; }

window.addEventListener('keydown', (e) => {
    // Speichern (Strg + S)
    if (e.ctrlKey && e.key.toLowerCase() === 's') { 
        e.preventDefault(); 
        saveSettings(); 
    }
    
    // Log Konsole (Strg + E)
    if (e.ctrlKey && e.key.toLowerCase() === 'e') { 
        e.preventDefault(); 
        document.getElementById('console-overlay').style.display = 'flex'; 
    }

    // Vollbild (F11)
    if (e.key === 'F11') {
        e.preventDefault(); 
        if(window.pywebview) {
            window.pywebview.api.toggle_fullscreen();
        }
    }
});