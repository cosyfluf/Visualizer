class SynthwaveRenderer {

    constructor() {
        this.offset = 0; // Für die Gitter-Animation
        this.stars = []; // Sternenhimmel
        
        // Sterne einmalig initialisieren
        for(let i=0; i<150; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random() * 0.65, // Himmelbereich bis zum Horizont
                size: Math.random() * 2 + 0.5,
                blinkSpeed: Math.random() * 0.05 + 0.01
            });
        }
    }

    draw(ctx, width, height, data) {
        // --- KONFIGURATION ---
        const horizonY = height * 0.65; // Wo Himmel und Boden sich treffen
        const centerX = width / 2;
        
        // Bass für "Pump"-Effekte berechnen (Weicher Übergang)
        let bass = 0;
        if(data.bars && data.bars.length > 0) {
            // Nimm die tiefen Frequenzen
            bass = data.bars.slice(0, 4).reduce((a,b)=>a+b,0) / 4;
            bass /= 255; // Normalisieren auf 0.0 bis 1.0
        }

        // --- 1. HINTERGRUND (Deep Space) ---
        let bgGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
        bgGrad.addColorStop(0.0, "#050010"); // Fast Schwarz
        bgGrad.addColorStop(0.5, "#180028"); // Dunkles Lila
        bgGrad.addColorStop(1.0, "#3a0ca3"); // Helles Lila am Horizont
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, horizonY);

        // --- 2. STERNENHIMMEL (Retro-Funkeln) ---
        ctx.fillStyle = "#ffffff";
        this.stars.forEach(star => {
            // Blinken simulieren
            let opacity = 0.5 + Math.sin(Date.now() * star.blinkSpeed) * 0.5;
            ctx.globalAlpha = opacity;
            
            ctx.beginPath();
            ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // --- 3. DIE RETRO SONNE (Das Herzstück) ---
        // Die Sonne sollte groß sein und hinter den Bergen sitzen
        const sunRadius = (height * 0.25) + (bass * (height * 0.05)); 
        const sunY = horizonY - (sunRadius * 0.4); // Sonne sitzt etwas tief

        // a) Der Sonnen-Glow (Hinter der Sonne)
        ctx.save();
        ctx.shadowBlur = 60 + (bass * 20);
        ctx.shadowColor = "#ff0054"; // Neon Pink Glow
        ctx.fillStyle = "#ff0054";
        ctx.beginPath();
        ctx.arc(centerX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // b) Der Sonnen-Verlauf
        let sunGrad = ctx.createLinearGradient(centerX, sunY - sunRadius, centerX, sunY + sunRadius);
        sunGrad.addColorStop(0.0, "#ffd60a"); // Helles Gelb oben
        sunGrad.addColorStop(0.4, "#ff9e00"); // Orange Mitte
        sunGrad.addColorStop(0.7, "#ff0054"); // Pink/Rot
        sunGrad.addColorStop(1.0, "#7209b7"); // Lila unten

        ctx.save();
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(centerX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fill();

        // c) Die "Jalousien" (Streifen schneiden)
        // Wir zeichnen Streifen in der Hintergrundfarbe über die Sonne
        ctx.fillStyle = "#280540"; // Dunkles Lila (Passend zum Horizont/Hintergrund)
        
        // Die Streifen fangen in der unteren Hälfte an
        const startCutY = sunY + (sunRadius * 0.1); 
        const endCutY = sunY + sunRadius;
        
        for(let y = startCutY; y < endCutY; y += 0) {
            // Position relativ zur unteren Hälfte (0.0 bis 1.0)
            let progress = (y - startCutY) / (sunRadius * 0.9);
            
            // Die Streifen werden dicker je weiter unten sie sind
            let stripeHeight = (height * 0.005) + (progress * progress * (height * 0.02));
            // Der Abstand wird kleiner oder bleibt gleich
            let gap = (height * 0.025);

            ctx.fillRect(centerX - sunRadius - 5, y, sunRadius * 2 + 10, stripeHeight);
            
            // Inkrementieren für nächste Loop
            y += stripeHeight + gap;
        }
        ctx.restore();

// --- 4. SPEKTRUM BERGE (Skyline) ---
        // KORREKTUR: Wir zeichnen eine durchgehende Linie von links nach rechts
        
        const barCount = 40;
        const barWidth = (width / 2) / barCount;
        
        ctx.save();
        ctx.beginPath();
        
        // 1. Startpunkt: Ganz links am Horizont
        ctx.moveTo(0, horizonY);

        // 2. Linke Seite (Von Links zur Mitte aufbauen)
        // Wir zählen rückwärts, damit die hohen Frequenzen außen sind und der Bass in der Mitte
        for(let i = barCount - 1; i >= 0; i--) {
            let val = (data.bars && data.bars[i]) ? data.bars[i] : 0;
            let h = (val / 255) * (height * 0.25);
            
            // x Position berechnen: Wir gehen von links (0) zur Mitte (centerX)
            // centerX ist der Startpunkt, wir ziehen i * breite ab
            let x = centerX - (i * barWidth);
            
            ctx.lineTo(x, horizonY - h);
        }

        // 3. Rechte Seite (Von der Mitte nach Rechts)
        for(let i = 0; i < barCount; i++) {
            let val = (data.bars && data.bars[i]) ? data.bars[i] : 0;
            let h = (val / 255) * (height * 0.25);
            
            // x Position: Von der Mitte nach rechts addieren
            let x = centerX + (i * barWidth);
            
            ctx.lineTo(x, horizonY - h);
        }

        // 4. Endpunkt: Ganz rechts am Horizont und schließen
        ctx.lineTo(width, horizonY); 
        ctx.lineTo(0, horizonY); // Zurück zum Anfang unten links
        ctx.closePath();

        // Styling
        ctx.fillStyle = "rgba(0, 0, 0, 0.9)"; // Fast schwarz, verdeckt die Sonne unten
        ctx.fill();
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = "cyan"; // Neon Cyan Kante
        ctx.shadowColor = "cyan";
        ctx.shadowBlur = 15;
        ctx.stroke();
        
        ctx.shadowBlur = 0; // Reset
        ctx.restore();

        // --- 5. 3D GITTER (GRID FLOOR) ---
        ctx.save();
        
        // Clip den Bereich unter dem Horizont
        ctx.beginPath();
        ctx.rect(0, horizonY, width, height - horizonY);
        ctx.clip();

        // Boden-Hintergrund (Fade out ins Dunkle nach unten)
        let floorGrad = ctx.createLinearGradient(0, horizonY, 0, height);
        floorGrad.addColorStop(0, "#2a003b"); // Horizont Farbe
        floorGrad.addColorStop(1, "#0a0010"); // Schwarz unten (vorne)
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, horizonY, width, height - horizonY);

        // Gitter Einstellungen
        ctx.strokeStyle = "rgba(255, 0, 212, 0.5)"; // Neon Magenta
        ctx.lineWidth = 2;
        // Glow Effekt für das Gitter
        ctx.shadowColor = "#ff00d4";
        ctx.shadowBlur = 10;

        // Vertikale Linien (Perspektive)
        // Diese gehen vom Fluchtpunkt (Mitte Horizont) nach außen
        // Wir zeichnen viel breiter als den Screen, damit es bei Bewegung gut aussieht
        const perspectiveWidth = width * 2; 
        for(let x = -width; x <= perspectiveWidth; x += width * 0.15) {
            ctx.beginPath();
            // Startpunkt (Mitte Horizont)
            ctx.moveTo(centerX, horizonY);
            // Endpunkt (Unten, breit aufgefächert)
            // x wird basierend auf der Distanz zur Mitte gespreizt
            let dist = x - centerX;
            ctx.lineTo(centerX + (dist * 4), height); 
            ctx.stroke();
        }

        // Horizontale Linien (Bewegung)
        let speed = 0.5 + (bass * 0.5); // Schneller bei Bass
        this.offset = (this.offset + speed) % 1; // 0.0 bis 1.0

        // Wir zeichnen Linien basierend auf inverser Perspektive
        // Nahe dem Horizont sind sie eng zusammen, unten weit auseinander
        for(let i = 0; i < 20; i++) {
            // Z-Tiefe simulieren (0 = Horizont, 1 = Kamera)
            // Wir addieren den Offset, damit sie auf uns zukommen
            let z = (i / 10) + this.offset * 0.1;
            
            // Modulo, damit Linien wieder am Horizont auftauchen
            let depth = z % 1; 
            
            // Keine Linie direkt am Horizont zeichnen (sieht flimmerig aus)
            if(depth < 0.05) continue;

            // Perspektivische Formel: y steigt exponentiell
            // y = horizon + (height * depth^3)
            let yPos = horizonY + (height - horizonY) * Math.pow(depth, 3);

            ctx.beginPath();
            ctx.moveTo(0, yPos);
            ctx.lineTo(width, yPos);
            
            // Linien werden heller und dicker, je näher sie sind
            ctx.globalAlpha = depth; // Fade in von hinten
            ctx.lineWidth = 1 + (depth * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}