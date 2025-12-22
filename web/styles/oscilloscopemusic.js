// --- START OF FILE styles/oscilloscopemusic.js ---

class OscilloscopeMusicRenderer {
    constructor() {
        this.beamColor = "rgba(50, 255, 100, 1)"; // CRT Grün
        this.glowColor = "rgba(20, 200, 50, 0.5)";
        this.decay = 0.2; 
        this.gain = 1.0;
        this.rotation = 0; // Damit sich der Kreis langsam dreht
    }

    draw(ctx, width, height, data) {
        // 1. CRT NACHLEUCHTEN
        ctx.fillStyle = `rgba(0, 5, 0, ${this.decay})`;
        ctx.fillRect(0, 0, width, height);

        // Wir arbeiten mit den BARS, da dein System keine Wellenform liefert
        if (!data.bars || data.bars.length === 0) return;

        const cx = width / 2;
        const cy = height / 2;
        
        // Radius des Kreises (Responsive)
        const baseRadius = Math.min(width, height) * 0.25;
        const maxBarHeight = Math.min(width, height) * 0.20;

        // Settings
        ctx.lineWidth = 2;
        ctx.strokeStyle = this.beamColor;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        
        // Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.glowColor;
        ctx.globalCompositeOperation = 'lighter';

        ctx.beginPath();

        // 2. KREIS BERECHNUNG
        // Wir haben 64 Bars. Wir mappen die auf 360 Grad (2 PI).
        const totalBars = 64; // Dein Loop geht bis 64
        const angleStep = (Math.PI * 2) / totalBars;
        
        // Langsame Rotation für Coolness-Faktor
        this.rotation += 0.005; 

        // Wir zeichnen den Kreis durch Verbinden der Spitzen
        for (let i = 0; i <= totalBars; i++) {
            // Index wrappen (damit der Kreis geschlossen ist: 64 = 0)
            let index = i % totalBars; 
            
            // Wert holen (0 bis 100)
            let value = data.bars[index];
            if (value === undefined) value = 0;

            // Optional: Bass vergrößern (Indizes 0-5)
            if (index < 5) value *= 1.2;

            // Amplitude berechnen
            let amp = (value / 100.0) * maxBarHeight * this.gain;

            // Koordinaten: 
            // x = cos(winkel) * (basis + amplitude)
            // y = sin(winkel) * (basis + amplitude)
            let angle = (i * angleStep) + this.rotation;
            
            let r = baseRadius + amp;
            
            let x = cx + Math.cos(angle) * r;
            let y = cy + Math.sin(angle) * r;

            // Spiegelung für symmetrischen Look (optional, sieht oft besser aus)
            // Falls du den echten Kreis willst, lass das oben so.
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                // Kurven glätten (Quadratische Bézierkurve)
                // Wir berechnen den Mittelpunkt zwischen dem letzten und diesem Punkt
                // Das macht den Kreis viel runder und weniger "zackig"
                // (Vereinfacht hier: einfach LineTo für den Retro-Look)
                ctx.lineTo(x, y);
            }
        }
        
        // Kreis schließen
        ctx.closePath();
        ctx.stroke();
        
        // 3. INNERER RING (Bass-Reaktion)
        // Ein kleinerer Kreis innen, der pumpt, wenn Bass da ist
        let bassSum = 0;
        for(let j=0; j<8; j++) if(data.bars[j]) bassSum += data.bars[j];
        let bassAvg = bassSum / 8;

        if (bassAvg > 10) {
            ctx.beginPath();
            let innerR = (baseRadius * 0.5) + (bassAvg * 0.5);
            ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(50, 255, 100, ${bassAvg / 200})`; // Transparenz je nach Bass
            ctx.stroke();
        }

        // Cleanup
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowBlur = 0;
    }
}