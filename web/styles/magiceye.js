class MagicEyeRenderer {

    constructor() {
        this.frameCount = 0;
    }

    draw(ctx, width, height, data) {
        this.frameCount++;

        // 1. Hintergrund: Dunkler "Bakelit"-Look mit Vignette
        let bgGrad = ctx.createRadialGradient(width/2, height/2, height * 0.2, width/2, height/2, width);
        bgGrad.addColorStop(0, "#2a1d15"); 
        bgGrad.addColorStop(1, "#050201"); 
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // 2. Retro-Skala im Hintergrund (Frequenz-Gitter)
        this.drawRadioScale(ctx, width, height);

        // Layout berechnen
        const tubeSize = Math.min(width * 0.35, height * 0.6); 
        const tubeY = height / 2;
        const centerX = width / 2;
        const offset = width * 0.22; 

        // Röhren zeichnen
        // Wir übergeben auch data.config.bassSens, falls wir den Bass-Regler nutzen wollen
        this.drawBigTube(ctx, centerX - offset, tubeY, tubeSize, data.volL, "KANAL L");
        this.drawBigTube(ctx, centerX + offset, tubeY, tubeSize, data.volR, "KANAL R");

        // Mitte: Stereo Lampe
        this.drawCenterLamp(ctx, centerX, tubeY, tubeSize * 0.2, (data.volL + data.volR) / 2);
    }

    drawBigTube(ctx, x, y, size, value, label) {
        ctx.save();

        // --- GLITCH LOGIK (Übersteuern) ---
        let isClipping = value > 90; // Schwellenwert für Glitch
        let glitchIntensity = 0;
        
        if (isClipping) {
            // Berechne wie stark übersteuert (0 bis 1)
            let overflow = (value - 90) / 10; 
            glitchIntensity = overflow * 10; // Verstärkung

            // 1. WACKEL-EFFEKT (Shake)
            let shakeX = (Math.random() - 0.5) * glitchIntensity * 5;
            let shakeY = (Math.random() - 0.5) * glitchIntensity * 5;
            ctx.translate(shakeX, shakeY);
        }

        // --- 1. GEHÄUSE ---
        const radius = size / 2;
        
        // Metallring
        ctx.beginPath();
        ctx.arc(x, y, radius + 10, 0, Math.PI * 2);
        let metalGrad = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
        metalGrad.addColorStop(0, "#888");
        metalGrad.addColorStop(0.5, "#ccc");
        metalGrad.addColorStop(1, "#555");
        ctx.fillStyle = metalGrad;
        ctx.fill();

        // Innenring (Dunkel)
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#111";
        ctx.fill();

        // --- 2. DAS AUGE (Glas & Phosphor) ---
        const glassRadius = radius * 0.9;

        // Hintergrund (Dunkles Phosphor)
        ctx.beginPath();
        ctx.arc(x, y, glassRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#1b2e20"; 
        ctx.fill();

        // --- 3. LEUCHTSEKTOREN ---
        let signal = Math.max(0, Math.min(value, 105)); // Erlaubt leichtes Übersteuern für Berechnung
        
        // Schattenberechnung
        const maxShadow = Math.PI * 0.6; 
        // Bei Glitch zuckt der Schatten zufällig
        let jitter = isClipping ? (Math.random() * 0.2) : 0;
        const shadowAngle = Math.max(0.02, maxShadow * (1 - (signal / 100)) + jitter);

        const topAngle = -Math.PI / 2;
        
        // GLITCH FARBE: Wenn Clipping, blitzt es Weiß/Cyan auf
        let glowColor = "#5f9"; // Standard Grün
        if (isClipping && Math.random() > 0.5) {
            glowColor = "#dff"; // Helles Elektrisch-Blau/Weiß
        }
        
        ctx.shadowBlur = size * (0.1 + (isClipping ? Math.random() * 0.1 : 0));
        ctx.shadowColor = glowColor;

        ctx.beginPath();
        ctx.moveTo(x, y);
        // Linker Flügel
        ctx.arc(x, y, glassRadius, topAngle + shadowAngle, topAngle + Math.PI - 0.2); 
        ctx.lineTo(x, y);
        // Rechter Flügel
        ctx.arc(x, y, glassRadius, topAngle - Math.PI + 0.2, topAngle - shadowAngle);
        ctx.closePath();

        // Farbverlauf des Phosphors
        let phosphorGrad = ctx.createRadialGradient(x, y, glassRadius * 0.2, x, y, glassRadius);
        
        if (isClipping && Math.random() > 0.7) {
            // Glitch Farbverlauf (Überhitzung)
            phosphorGrad.addColorStop(0, "#fff");
            phosphorGrad.addColorStop(0.5, "#aff");
            phosphorGrad.addColorStop(1, "#288");
        } else {
            // Normaler EM34 Verlauf
            phosphorGrad.addColorStop(0, "#8fa");   
            phosphorGrad.addColorStop(0.6, "#2d8"); 
            phosphorGrad.addColorStop(1, "#164");   
        }
        
        ctx.fillStyle = phosphorGrad;
        ctx.fill();
        
        // INTERFERENZ LINIEN (Bei Glitch)
        if (isClipping) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
            for(let i=0; i<3; i++) {
                let ly = y - glassRadius + Math.random() * (glassRadius*2);
                let lh = Math.random() * 5 + 2;
                ctx.fillRect(x - glassRadius, ly, glassRadius*2, lh);
            }
        }

        ctx.shadowBlur = 0; 

        // --- 4. DETAILS ---
        
        // Kappe
        ctx.beginPath();
        ctx.arc(x, y, glassRadius * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = "#222";
        ctx.fill();

        // Pulsierende Heizung (Roter Punkt)
        // Nutzt Sinus-Welle basierend auf frameCount für das "Atmen"
        let heatPulse = (Math.sin(this.frameCount * 0.05) + 1) * 0.5; // 0 bis 1
        let heatRadius = glassRadius * 0.05 + (heatPulse * 2);
        let heatAlpha = 0.6 + (heatPulse * 0.4);

        ctx.beginPath();
        ctx.arc(x, y, heatRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 120, 50, ${heatAlpha})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "orange";
        ctx.fill();
        ctx.shadowBlur = 0;

        // Glas-Reflexion
        ctx.beginPath();
        ctx.arc(x, y, glassRadius * 0.9, -Math.PI * 0.2, -Math.PI * 0.8, true);
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = glassRadius * 0.1;
        ctx.lineCap = "round";
        ctx.stroke();

        // Label
        ctx.fillStyle = "rgba(200, 180, 150, 0.6)";
        ctx.font = `bold ${Math.floor(size * 0.08)}px 'Courier New', monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(label, x, y + radius + 15);

        ctx.restore();
    }

    drawCenterLamp(ctx, x, y, size, avgVol) {
        ctx.save();
        
        // Lampenhelligkeit reagiert auf Musik
        let brightness = 30 + (avgVol * 1.5); // Min 30, Max ca 180
        if(brightness > 255) brightness = 255;

        // Rahmen
        ctx.beginPath();
        ctx.arc(x, y, size/2, 0, Math.PI*2);
        ctx.fillStyle = "#111";
        ctx.fill();
        ctx.strokeStyle = "#555";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Licht (Bernstein)
        ctx.beginPath();
        ctx.arc(x, y, size/2.5, 0, Math.PI*2);
        ctx.fillStyle = `rgb(${brightness}, ${brightness * 0.7}, 0)`; // Orange-Gelb
        ctx.shadowColor = `rgb(${brightness}, ${brightness * 0.5}, 0)`;
        ctx.shadowBlur = brightness * 0.2;
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#888";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("POWER", x, y - size);

        ctx.restore();
    }

    // Neue Funktion: Zeichnet eine Radioskala im Hintergrund
    drawRadioScale(ctx, width, height) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";

        let startX = width * 0.1;
        let endX = width * 0.9;
        let y = height * 0.85;

        // Horizontale Linie
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();

        // Striche
        let steps = 40;
        for(let i=0; i<=steps; i++) {
            let x = startX + (endX - startX) * (i/steps);
            let h = (i % 5 === 0) ? 15 : 8; // Große und kleine Striche
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y - h);
            ctx.stroke();

            // Zahlen bei großen Strichen
            if(i % 10 === 0) {
                let freq = 88 + (i/steps) * 20; // Fake MHz Skala
                ctx.fillText(Math.floor(freq), x, y - 20);
            }
        }
        
        ctx.restore();
    }
}