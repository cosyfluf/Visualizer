/**
 * BackgroundRenderer - "Two Wings" Edition
 * - Visualizer ist in zwei symmetrische Hälften geteilt (Links & Rechts).
 * - Jede Seite zeigt das Frequenzspektrum genau einmal (keine mehrfachen Spitzen).
 * - Pfad: static/cosyfluf.png
 * - Snappy Bass-Pulse & Lila-Roter Verlauf.
 */
class BackgroundRenderer {
    constructor() {
        this.characterImg = new Image();
        this.characterImg.src = 'static/cosyfluf.png';
        this.imgLoaded = false;
        this.characterImg.onload = () => { this.imgLoaded = true; };
        
        this.smoothBass = 0;
        this.smoothMid = 0;
        
        this.stars = [];
        for (let i = 0; i < 200; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random(),
                s: Math.random() * 2 + 0.5,
                o: Math.random() * 0.7 + 0.2,
                v: Math.random() * 0.0006 + 0.0002
            });
        }
    }

    draw(ctx, width, height, data) {
        ctx.setTransform(1, 0, 0, 1, 0, 0); 
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        // --- AUDIO ANALYSE ---
        let rawBass = 0, rawMid = 0;
        if (data && data.bars && data.bars.length > 0) {
            for (let i = 0; i < 10; i++) rawBass += (data.bars[i] || 0);
            rawBass /= (10 * 255);
            for (let i = 20; i < 80; i++) rawMid += (data.bars[i] || 0);
            rawMid /= (60 * 255);
        }

        this.smoothBass = this.smoothBass * 0.7 + rawBass * 0.3;
        this.smoothMid = this.smoothMid * 0.9 + rawMid * 0.1;

        const cx = width / 2;
        const cy = height / 2;

        // Sterne
        ctx.fillStyle = "white";
        this.stars.forEach(s => {
            s.y += s.v;
            if (s.y > 1) s.y = 0;
            ctx.globalAlpha = s.o;
            ctx.beginPath();
            ctx.arc(s.x * width, s.y * height, s.s, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        ctx.save();
        ctx.translate(cx, cy);
        
        const currentRadius = 125 + (this.smoothBass * 95);

        // --- VISUALIZER RING (NUR ZWEI HÄLFTEN) ---
        if (data && data.bars) {
            const barCount = 120; // Anzahl Bars pro Halbbogen
            // Wir nutzen die ersten 80 Bars für maximale Action
            const activeRange = Math.min(data.bars.length, 80);

            for (let i = 0; i < barCount; i++) {
                // Winkel von Oben (-90°) bis Unten (+90°)
                const angle = (i / barCount) * Math.PI - Math.PI / 2;
                
                // FIX: Wir strecken die activeRange über den kompletten Halbbogen (Kein Modulo!)
                const dataIdx = Math.floor((i / barCount) * activeRange);
                const val = (data.bars[dataIdx] || 0) / 255;
                
                const barHeight = 20 + (val * 320 * (1 + this.smoothMid));

                const drawBarAtAngle = (a) => {
                    const x1 = Math.cos(a) * currentRadius;
                    const y1 = Math.sin(a) * currentRadius;
                    const x2 = Math.cos(a) * (currentRadius + barHeight);
                    const y2 = Math.sin(a) * (currentRadius + barHeight);

                    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
                    grad.addColorStop(0, "#9400d3");
                    grad.addColorStop(1, "#ff0000");

                    ctx.strokeStyle = grad;
                    ctx.lineWidth = 3;
                    ctx.lineCap = "round";
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                };

                // Rechte Hälfte zeichnen
                drawBarAtAngle(angle);
                // Linke Hälfte spiegeln
                drawBarAtAngle(Math.PI - angle);
            }
        }

        // --- BILD LOGIK ---
        if (this.imgLoaded && this.characterImg.width > 0) {
            ctx.save();
            ctx.shadowBlur = 60 * this.smoothBass;
            ctx.shadowColor = "#ff0080";
            
            ctx.beginPath();
            ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
            ctx.clip();

            const scale = Math.max((currentRadius * 2) / this.characterImg.width, (currentRadius * 2) / this.characterImg.height);
            const w = this.characterImg.width * scale;
            const h = this.characterImg.height * scale;
            
            ctx.drawImage(this.characterImg, -w / 2, -h / 2, w, h);
            ctx.restore();
        } else {
            ctx.fillStyle = "#1a001a";
            ctx.beginPath();
            ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

window.BackgroundRenderer = BackgroundRenderer;