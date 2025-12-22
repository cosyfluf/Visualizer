// --- START OF FILE styles/wave.js ---

class NeonWaveRenderer {
    constructor() {
        this.frame = 0;
        
        // Partikel im Hintergrund
        this.particles = [];
        for(let i=0; i<30; i++) {
            this.particles.push({
                x: Math.random(),
                y: Math.random(),
                size: Math.random() * 2,
                alpha: Math.random(),
                speed: Math.random() * 0.002
            });
        }
    }

    analyze(data) {
        if (!data || !data.bars) return { bass: 0, mid: 0, high: 0 };
        const b = data.bars;

        // Bass steuert die Amplitude (Höhe) der Hauptwelle
        let bass = b.slice(0, 5).reduce((a,c)=>a+c,0) / 500;
        
        // Mitten steuern die "Dicke" des Bandes
        let mid = b.slice(5, 20).reduce((a,c)=>a+c,0) / 1500;
        
        // Höhen steuern das Zittern/Details
        let high = b.slice(20, 50).reduce((a,c)=>a+c,0) / 2000;

        return { 
            bass: bass > 0.5 ? Math.pow(bass, 2) : bass * 0.5, 
            mid: mid, 
            high: high 
        };
    }

    draw(ctx, width, height, data) {
        const audio = this.analyze(data);
        this.frame += 0.5; // Langsame Bewegung

        // 1. HINTERGRUND (Deep Space Blue)
        // Verlauf von sehr dunklem Blau zu Schwarz
        let bgGrad = ctx.createRadialGradient(width/2, height/2, height*0.2, width/2, height/2, width);
        bgGrad.addColorStop(0, "#0a0a2a"); // Dunkles Blau Mitte
        bgGrad.addColorStop(1, "#020205"); // Fast Schwarz Außen
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // 2. PARTIKEL (Subtiler Sternenstaub)
        this.drawParticles(ctx, width, height);

        // 3. DIE WELLE (Das Herzstück)
        // Wir nutzen 'lighter' für den leuchtenden Neon-Effekt bei Überlagerung
        ctx.globalCompositeOperation = 'lighter';
        
        this.drawMainWave(ctx, width, height, audio);
        
        // 4. SEKUNDÄRE LINIEN (Die dünnen "Ausreißer")
        this.drawStrayLines(ctx, width, height, audio);

        // Reset Blend Mode
        ctx.globalCompositeOperation = 'source-over';
    }

    drawParticles(ctx, w, h) {
        ctx.fillStyle = "rgba(100, 150, 255, 0.5)";
        this.particles.forEach(p => {
            p.y -= p.speed;
            if (p.y < 0) p.y = 1;
            
            // Funkeln
            let alpha = 0.2 + Math.sin(this.frame * 0.05 + p.x * 10) * 0.2;
            
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    }

    drawMainWave(ctx, w, h, audio) {
        const cx = w / 2;
        const cy = h / 2;
        
        // Anzahl der Linien, die das "Band" bilden
        const lineCount = 40; 
        
        // Farbverlauf für die Linien erstellen (Cyan -> Blau -> Pink)
        let gradient = ctx.createLinearGradient(0, 0, w, 0);
        gradient.addColorStop(0.0, "rgba(0, 255, 150, 0.5)");   // Cyan/Grün
        gradient.addColorStop(0.5, "rgba(0, 100, 255, 0.5)");   // Blau
        gradient.addColorStop(1.0, "rgba(255, 0, 150, 0.5)");   // Pink/Magenta

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1;

        // Wir zeichnen viele Linien übereinander
        for (let i = 0; i < lineCount; i++) {
            ctx.beginPath();

            // Parameter für diese spezifische Linie
            // Offset sorgt dafür, dass die Linien nicht deckungsgleich sind
            let iOffset = (i - lineCount/2) * 0.1; 
            
            // Audio Einfluss verstärken
            let amp = h * 0.15 + (audio.bass * h * 0.4); 
            
            // Loop durch die X-Achse
            // Step size größer für Performance, Kurven werden durch Splines glatt
            for (let x = 0; x <= w; x += 10) {
                
                // Normalisierte X Position (-1 bis 1)
                let nx = (x - cx) / (w * 0.5); 
                
                // Envelope Funktion: Macht die Welle in der Mitte groß und am Rand klein
                // Math.cos(nx * 1.5) erzeugt einen Hügel in der Mitte
                let envelope = Math.max(0, Math.cos(nx * 1.4)); 
                envelope = Math.pow(envelope, 2); // Glättet den Auslauf am Rand

                // Die Sinus-Berechnung
                // 1. Trägerwelle (langsam)
                let wave1 = Math.sin(nx * 3 + this.frame * 0.02 + iOffset);
                
                // 2. Detailwelle (schneller, reagiert auf Audio)
                let wave2 = Math.sin(nx * 8 + this.frame * 0.05) * (audio.mid * 2);

                // Y-Position berechnen
                // i * 2 sorgt für die "Dicke" des Bandes (Spread)
                let spread = i * (2 + audio.mid * 5); 
                
                let y = cy + (wave1 + wave2) * amp * envelope + spread * envelope;

                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }

    drawStrayLines(ctx, w, h, audio) {
        // Diese Linien sind dünner und wilder ("Stray hairs")
        const cx = w / 2;
        const cy = h / 2;

        let gradient = ctx.createLinearGradient(0, 0, w, 0);
        gradient.addColorStop(0, "rgba(50, 255, 200, 0.3)");
        gradient.addColorStop(1, "rgba(200, 50, 255, 0.3)");

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 0.5; // Sehr dünn

        for(let i=0; i<5; i++) {
            ctx.beginPath();
            let phase = i * 2;
            let amp = h * 0.25; // Höher als die Hauptwelle

            for (let x = 0; x <= w; x += 20) {
                let nx = (x - cx) / (w * 0.5);
                let envelope = Math.max(0, Math.cos(nx * 1.5));
                
                // Wilder Sinus
                let y = cy + Math.sin(nx * 4 + this.frame * 0.03 + phase) * amp * envelope;
                
                // Add noise/jitter based on highs
                y += (Math.random()-0.5) * audio.high * 20;

                if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }
}