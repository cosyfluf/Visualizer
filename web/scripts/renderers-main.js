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
class OscilloscopeXYRenderer {
    constructor() {
        this.beamColor = "#50ff64"; 
        this.time = 0;
    }

    draw(ctx, width, height, data) {
        // 1. CRT Effekt
        ctx.fillStyle = "rgba(0, 10, 0, 0.2)"; // Etwas weniger Trail für mehr Schärfe
        ctx.fillRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height / 2;

        // Settings
        ctx.lineWidth = 2;
        ctx.strokeStyle = this.beamColor;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.beamColor;
        ctx.lineJoin = "round";
        ctx.globalCompositeOperation = 'lighter';

        ctx.beginPath();

        // --- HARDWARE CHECK ---
        let useHardware = false;
        if (typeof analyserL !== 'undefined' && typeof dataArrayL !== 'undefined') {
            analyserL.getByteTimeDomainData(dataArrayL);
            analyserR.getByteTimeDomainData(dataArrayR);
            // Check auf Signal (nicht Stille)
            if (dataArrayL[10] !== 128 || dataArrayL[100] !== 128) useHardware = true;
        }

        if (useHardware) {
            // === HARDWARE MODE: ECHTES XY ===
            // Das hier siehst du NUR, wenn Stereomix geht.
            // Das sind die echten Pilze/Formen der Musik.
            const scale = Math.min(width, height) * 0.45; 
            const len = dataArrayL.length;
            let step = 2;

            for (let i = 0; i < len; i += step) {
                let vL = (dataArrayL[i] - 128) / 128.0;
                let vR = (dataArrayR[i] - 128) / 128.0;
                
                const x = cx + (vL * scale);
                const y = cy - (vR * scale);

                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
        } 
        else {
            // === SOFTWARE MODE: WELLENFORM (LINKS NACH RECHTS) ===
            // Statt Knoten generieren wir hier eine klassische Welle aus den Frequenzen.
            
            this.time += 0.02; // Laufgeschwindigkeit
            
            if (!data.bars) return;
            
            // Wir zeichnen von Links (0) nach Rechts (width)
            const points = width / 2; // Auflösung
            
            for (let x = 0; x <= width; x += 2) {
                // t entspricht der Zeitachse + Position auf dem Schirm
                const t = (x / width) * Math.PI * 4; 
                
                let yOffset = 0;
                
                // Wir addieren Sinuswellen (Inverse Fourier)
                // Wir nehmen Bass (h=0) bis Höhen (h=10)
                for(let h=0; h<10; h++) {
                    let val = data.bars[h];
                    if(val < 1) continue;
                    
                    let amp = (val / 100.0) * (height * 0.15); // Höhe der Welle
                    let freq = h + 1; // Frequenz
                    
                    // Formel: Amplitude * Sinus(Ort * Frequenz - Zeit)
                    yOffset += Math.sin(t * freq - this.time) * (amp / freq);
                }
                
                const plotX = x;
                const plotY = cy + yOffset;

                if (x === 0) ctx.moveTo(plotX, plotY); 
                else ctx.lineTo(plotX, plotY);
            }
            
            // Info Text, damit du weißt was los ist
            ctx.fillStyle = "#4f4";
            ctx.font = "12px monospace";
            ctx.fillText("MODE: SIMULATION (FREQ TO WAVE)", 10, 20);
            ctx.fillText("ACTIVATE 'STEREO MIX' FOR REAL XY", 10, 35);
        }

        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0;
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
        
        // --- READ SETTINGS ---
        // We get values directly from HTML elements
        const elToggle = document.getElementById('particle');
        const elIntensity = document.getElementById('particle-intensity');
        const elThreshold = document.getElementById('particle-threshold');

        // Default values if elements are not yet loaded
        const particlesOn = elToggle ? elToggle.checked : true;
        const intensityVal = elIntensity ? parseInt(elIntensity.value) : 50; // 0 to 100
        const thresholdVal = elThreshold ? parseInt(elThreshold.value) : 50; // 0 to 100

        // Recalculate values for logic
        // Threshold: Slider (0-100) -> Bass Value (0.0 - 1.0)
        // Higher slider = harder bass required.
        // We map 0-100 to approx 0.3 to 0.95 range
        const calcThreshold = 0.3 + (thresholdVal / 100) * 0.65;

        // Intensity: Slider (0-100) -> Particle Count (0 to approx 15)
        const spawnCount = Math.floor(intensityVal / 6); 

        // --- AUDIO ANALYSIS ---
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
        
        // Background
        let bgGrad = ctx.createRadialGradient(cx, cy, height * 0.1, cx, cy, height);
        bgGrad.addColorStop(0, "#050a14");
        bgGrad.addColorStop(1, "#000000");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // --- PARTICLE LOGIC ---
        if (particlesOn) {
            // Spawn based on Slider values
            if (bass > calcThreshold) {
                // Count based on Intensity Slider
                for (let i = 0; i < spawnCount; i++) {
                    let angle = Math.random() * Math.PI * 2;
                    // Vary speed
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
            
            // Shockwaves only if ON and bass is very strong
            if (bass > (calcThreshold + 0.1) && this.shockwaves.length < 3) {
                this.shockwaves.push({ r: 50, opacity: 1.0 });
            }
        }

        // --- DRAW PARTICLES ---
        this.particles.forEach((p, index) => {
            p.x += p.vx; p.y += p.vy; p.life -= 0.02; 
            if (p.life <= 0) { this.particles.splice(index, 1); } else {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = `hsl(${p.hue}, 80%, 60%)`;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            }
        });

        // Draw Shockwaves
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

        // --- VISUALIZER BARS ---
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

        // --- CORE ---
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

// Registrierung aller verfügbaren Renderer
const renderers = {
    'neon': (typeof NeonRenderer !== 'undefined') ? new NeonRenderer() : new DummyRenderer(),
    'kitt': (typeof KittRenderer !== 'undefined') ? new KittRenderer() : new DummyRenderer(),
    'led':  (typeof LedRenderer !== 'undefined')  ? new LedRenderer() : new DummyRenderer(),
    'vu':   (typeof VuRenderer !== 'undefined')   ? new VuRenderer() : new DummyRenderer(),
    'magiceye': (typeof MagicEyeRenderer !== 'undefined') ? new MagicEyeRenderer() : new DummyRenderer(),
    'synthwave': new SynthwaveRenderer(),
    'HoloRenderer': new HoloOrbRenderer(),
    'nyancat': new NyanCatRenderer(),
    'lasershow': (typeof LaserShowRenderer !== 'undefined') ? new LaserShowRenderer() : new DummyRenderer(),
    'metal': (typeof MetalShowRenderer !== 'undefined') ? new MetalShowRenderer() : new DummyRenderer(),
    'FractalOscilloscope': (typeof FractalOscilloscopeRenderer !== 'undefined') ? new FractalOscilloscopeRenderer() : new DummyRenderer(),
    'Dubstep': (typeof DubstepShowRenderer !== 'undefined') ? new DubstepShowRenderer() : new DummyRenderer(),
    'amp': (typeof AmpShowRenderer !== 'undefined') ? new AmpShowRenderer() : new DummyRenderer(),
    'lemontree': (typeof LemonTreeRenderer !== 'undefined') ? new LemonTreeRenderer() : new DummyRenderer(),
    'deepsea': (typeof DeepSeaRenderer !== 'undefined') ? new DeepSeaRenderer() : new DummyRenderer(),
    'scope': (typeof PamegScopeRenderer !== 'undefined') ? new PamegScopeRenderer() : new DummyRenderer(),
    'wave': (typeof NeonWaveRenderer !== 'undefined') ? new NeonWaveRenderer() : new DummyRenderer(),
    'oscilloscopemusic': new OscilloscopeXYRenderer(),
    'metalconcert': (typeof MetalConcertRenderer !== 'undefined') ? new MetalConcertRenderer() : new DummyRenderer(),
    'background': (typeof BackgroundRenderer !== 'undefined') ? new BackgroundRenderer() : new DummyRenderer(),
};

let currentRenderer = renderers['neon'];