class HoloOrbRenderer {

    constructor() {
        this.angleOffset = 0; // Rotation des gesamten Rings
        this.particles = [];  // Partikel-Array
        this.shockwaves = []; // Kreise, die sich ausdehnen
        this.colorHue = 200;  // Startfarbe (Blau)
    }

    draw(ctx, width, height, data) {
        const cx = width / 2;
        const cy = height / 2;
        
        // --- AUDIO DATEN ANALYSE ---
        // Bass (Tiefe Frequenzen, Index 0-10)
        let bass = 0;
        if (data.bars && data.bars.length > 0) {
            bass = data.bars.slice(0, 8).reduce((a, b) => a + b, 0) / 8;
            bass /= 255; // 0.0 bis 1.0
        }

        // Treble (Hohe Frequenzen, für "Zittern")
        let treble = 0;
        if (data.bars && data.bars.length > 0) {
            treble = data.bars.slice(20, 40).reduce((a, b) => a + b, 0) / 20;
            treble /= 255;
        }

        // Farbe langsam rotieren (Lebendigkeit)
        this.colorHue = (this.colorHue + 0.2) % 360; 
        
        // --- 1. HINTERGRUND ---
        // Ein sehr dunkles, radiales Vignette (Kein Lila, eher Deep Space Blau/Schwarz)
        let bgGrad = ctx.createRadialGradient(cx, cy, height * 0.1, cx, cy, height);
        bgGrad.addColorStop(0, "#050a14"); // Dunkelblaues Zentrum
        bgGrad.addColorStop(1, "#000000"); // Schwarz außen
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // --- 2. PARTIKEL SYSTEM (Explosion aus der Mitte) ---
        // Bei starkem Bass neue Partikel erzeugen
        if (bass > 0.6) {
            for (let i = 0; i < 3; i++) {
                let angle = Math.random() * Math.PI * 2;
                this.particles.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * (2 + Math.random() * 5),
                    vy: Math.sin(angle) * (2 + Math.random() * 5),
                    life: 1.0,
                    size: Math.random() * 3 + 1,
                    hue: this.colorHue + (Math.random() * 40 - 20) // Ähnliche Farbe
                });
            }
        }
        
        // Bei extremem Bass: Shockwave hinzufügen
        if (bass > 0.85 && this.shockwaves.length < 3) {
            this.shockwaves.push({ r: 50, opacity: 1.0 });
        }

        // Partikel zeichnen und updaten
        this.particles.forEach((p, index) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02; // Langsam ausblenden

            if (p.life <= 0) {
                this.particles.splice(index, 1);
            } else {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = `hsl(${p.hue}, 80%, 60%)`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Shockwaves zeichnen
        ctx.lineWidth = 3;
        this.shockwaves.forEach((sw, index) => {
            sw.r += 10 + (bass * 5); // Wächst schnell
            sw.opacity -= 0.04;

            if(sw.opacity <= 0) {
                this.shockwaves.splice(index, 1);
            } else {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(255, 255, 255, ${sw.opacity})`;
                ctx.arc(cx, cy, sw.r, 0, Math.PI * 2);
                ctx.stroke();
            }
        });
        ctx.globalAlpha = 1.0;

        // --- 3. SPEKTRUM KREIS (Der Ring) ---
        const barsToDraw = 64; // Wir nehmen nicht alle, damit es sauber aussieht
        const radius = (height * 0.15) + (bass * 30); // Radius pulsiert
        
        ctx.save();
        ctx.translate(cx, cy); // 0,0 ist jetzt die Bildschirmmitte
        
        // Ring rotiert langsam
        this.angleOffset += 0.005 + (treble * 0.01);
        ctx.rotate(this.angleOffset);

        for (let i = 0; i < barsToDraw; i++) {
            // Wir spiegeln das Spektrum für Symmetrie (Hälfte links, Hälfte rechts)
            // Index-Logik: 0->32, dann 32->0
            let dataIndex = i < (barsToDraw / 2) ? i : (barsToDraw - i);
            let val = data.bars[dataIndex] || 0;
            
            // Balkenlänge
            let barLen = (val / 255) * (height * 0.25);
            // Mindestlänge für coolen Look auch bei Stille
            barLen = Math.max(barLen, 5); 

            // Winkel für diesen Balken
            let angle = (Math.PI * 2 * i) / barsToDraw;

            ctx.save();
            ctx.rotate(angle);

            // Farbe: Regenbogen oder Blau/Gold
            // `hsl(${this.colorHue + i * 2}, 100%, 50%)` -> Regenbogen
            // Hier: Modernes Cyan/Blau
            let hue = this.colorHue + (val * 0.5); 
            ctx.fillStyle = `hsl(${hue}, 90%, 50%)`;
            
            // Glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = `hsl(${hue}, 90%, 50%)`;

            // Den Balken zeichnen (versetzt nach außen vom Radius)
            // Wir zeichnen abgerundete Linien statt Blöcke
            ctx.beginPath();
            ctx.roundRect(0, radius, 4, barLen, 4); // x, y, w, h, radius
            ctx.fill();
            
            // Ein kleiner Punkt am Ende des Balkens (Orbit)
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(2, radius + barLen + 10, 2, 0, Math.PI*2);
            ctx.fill();

            ctx.restore();
        }
        ctx.restore();

        // --- 4. DER KERN (Inner Core) ---
        // Ein Energie-Ball in der Mitte
        ctx.save();
        
        // Inneres Leuchten
        let coreRadius = (height * 0.08) + (bass * 20);
        let grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
        grad.addColorStop(0, "#ffffff"); // Weißer Kern
        grad.addColorStop(0.4, `hsl(${this.colorHue}, 100%, 70%)`); // Helle Farbe
        grad.addColorStop(1, `rgba(0,0,0,0)`); // Transparent außen

        ctx.globalCompositeOperation = "screen"; // Macht es lichtartiger
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Geometrische Linien im Kern (HUD Effekt)
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 1;
        
        // Drehendes Dreieck im Kern
        ctx.translate(cx, cy);
        ctx.rotate(-this.angleOffset * 2); // Dreht gegenläufig
        ctx.beginPath();
        const triSize = coreRadius * 0.6;
        for(let j=0; j<3; j++) {
            let a = (Math.PI * 2 * j) / 3;
            ctx.lineTo(Math.cos(a)*triSize, Math.sin(a)*triSize);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
    }
}