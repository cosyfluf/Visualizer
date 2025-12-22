/**
 * FractalOscilloscopeRenderer
 * - Fraktale Geometrie: Verschachtelte Lichtstrahlen.
 * - Oszilloskop-Kern: Ein pulsierender Wellenform-Ring im Zentrum.
 * - Cinematic Nebula: Butterweicher, bassgesteuerter Nebel ohne Blinken.
 */
class FractalOscilloscopeRenderer {
    constructor() {
        this.baseRotation = 0;
        this.stars = [];
        this.nebulaClouds = [];
        
        // Massive Dämpfung für absolut flüssige Übergänge
        this.smoothBass = 0;
        this.smoothMid = 0;
        this.smoothHigh = 0;

        // 1. Statisches Sternenfeld
        for (let i = 0; i < 300; i++) {
            this.stars.push({
                x: Math.random() * 2 - 1,
                y: Math.random() * 2 - 1,
                size: Math.random() * 1.2 + 0.2,
                opacity: Math.random() * 0.4 + 0.1
            });
        }

        // 2. Nebel-Wolken (Bass-Reaktiv)
        for (let i = 0; i < 15; i++) {
            this.nebulaClouds.push({
                x: (Math.random() - 0.5) * 1.5,
                y: (Math.random() - 0.5) * 1.5,
                size: Math.random() * 400 + 400,
                hue: 210, // Kaltes Blau
                baseAlpha: Math.random() * 0.02
            });
        }
    }

    draw(ctx, width, height, data) {
        // --- 1. AUDIO ANALYSE MIT TEMPORALER GLÄTTUNG ---
        let rawBass = 0, rawMid = 0, rawHigh = 0;
        if (data && data.bars && data.bars.length > 0) {
            for (let i = 0; i < 5; i++) rawBass += data.bars[i];
            rawBass /= (5 * 255);
            for (let i = 10; i < 50; i++) rawMid += data.bars[i];
            rawMid /= (40 * 255);
            for (let i = 100; i < 200; i++) rawHigh += data.bars[i];
            rawHigh /= (100 * 255);
        }

        // Butterweiches Smoothing (Kein Blinken!)
        this.smoothBass = this.smoothBass * 0.96 + rawBass * 0.04;
        this.smoothMid = this.smoothMid * 0.97 + rawMid * 0.03;
        this.smoothHigh = this.smoothHigh * 0.94 + rawHigh * 0.06;

        const cx = width / 2;
        const cy = height / 2;

        // --- 2. HINTERGRUND (Deep Space) ---
        ctx.fillStyle = "#000105"; 
        ctx.fillRect(0, 0, width, height);

        // Statische Sterne
        ctx.fillStyle = "white";
        this.stars.forEach(s => {
            ctx.globalAlpha = s.opacity;
            ctx.beginPath();
            ctx.arc(cx + s.x * width/2, cy + s.y * height/2, s.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // --- 3. NEBULA (Sanftes Bass-Glühen) ---
        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalCompositeOperation = "screen";
        this.nebulaClouds.forEach(n => {
            const dynamicAlpha = n.baseAlpha + (this.smoothBass * 0.1);
            const size = n.size * (1 + this.smoothBass * 0.3);
            const grad = ctx.createRadialGradient(n.x*width*0.3, n.y*height*0.3, 0, n.x*width*0.3, n.y*height*0.3, size);
            grad.addColorStop(0, `hsla(${n.hue}, 100%, 40%, ${dynamicAlpha})`);
            grad.addColorStop(1, "transparent");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(n.x*width*0.3, n.y*height*0.3, size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        // --- 4. FRACTAL OSCILLOSCOPE CORE ---
        ctx.save();
        ctx.translate(cx, cy);
        
        // Majestätische Grundrotation
        this.baseRotation += 0.001 + (this.smoothMid * 0.005);
        ctx.rotate(this.baseRotation);

        // A. FRAKTALE STRAHLEN (Ebene 1 & 2)
        const drawSpikes = (count, length, widthFactor, alpha) => {
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                ctx.save();
                ctx.rotate(angle);
                
                const grad = ctx.createLinearGradient(0, 0, length, 0);
                grad.addColorStop(0, "white");
                grad.addColorStop(0.2, `rgba(100, 180, 255, ${alpha})`);
                grad.addColorStop(1, "transparent");

                ctx.beginPath();
                ctx.moveTo(0, 0);
                const w = widthFactor + (this.smoothBass * 5);
                ctx.lineTo(length * 0.05, w);
                ctx.lineTo(length, 0);
                ctx.lineTo(length * 0.05, -w);
                ctx.closePath();
                ctx.fillStyle = grad;
                ctx.fill();
                ctx.restore();
            }
        };

        ctx.globalCompositeOperation = "lighter";
        // Große Hauptstrahlen (Fraktal Ebene 1)
        drawSpikes(6, (Math.min(width, height) * 0.25) + (this.smoothBass * width * 0.4), 2, 0.8);
        // Kleine Zwischenstrahlen (Fraktal Ebene 2 - leicht versetzt)
        ctx.rotate(Math.PI / 6);
        drawSpikes(6, (Math.min(width, height) * 0.1) + (this.smoothBass * width * 0.15), 1, 0.4);

        // B. OSZILLOSKOP-RING (Zentrum)
        // Zeichnet eine kreisförmige Wellenform basierend auf den Mitten/Höhen
        ctx.beginPath();
        const segments = 120;
        const baseRadius = 15 + (this.smoothBass * 20);
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            // Der "Oszilloskop"-Effekt: Die Wellenform vibriert auf dem Ring
            const wave = Math.sin(angle * 10 + Date.now() * 0.01) * (this.smoothHigh * 15);
            const r = baseRadius + wave;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // C. KERN-BLOOM (Glühen)
        const coreSize = baseRadius;
        const bloom = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize * 5);
        bloom.addColorStop(0, `rgba(80, 150, 255, ${0.4 * this.smoothBass})`);
        bloom.addColorStop(1, "transparent");
        ctx.fillStyle = bloom;
        ctx.beginPath(); ctx.arc(0, 0, coreSize * 5, 0, Math.PI * 2); ctx.fill();

        // Weißer Kernpunkt
        ctx.shadowBlur = 30 * this.smoothBass;
        ctx.shadowColor = "white";
        ctx.fillStyle = "white";
        ctx.beginPath(); ctx.arc(0, 0, coreSize * 0.6, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }
}

window.FractalOscilloscopeRenderer = FractalOscilloscopeRenderer;