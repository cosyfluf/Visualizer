class VuRenderer {
    
    // Haupt-Zeichenschleife
    draw(ctx, width, height, data) {
        
        // 1. Hintergrund (Dunkelgraues Gehäuse)
        ctx.fillStyle = "#141414"; 
        ctx.fillRect(0, 0, width, height);
        
        // --- BASS BERECHNUNG ---
        // Werte aus der Config lesen (werden von index.html übergeben)
        let range = 5;
        let offset = 0;
        let sensitivity = 1.2; // Standardwert
        
        if (data.config) {
            if (data.config.bassRange) range = data.config.bassRange;
            if (data.config.bassOffset) offset = data.config.bassOffset;
            // HIER IST DIE ÄNDERUNG: Bass-Sensitivity aus Config lesen
            if (data.config.bassSens) sensitivity = data.config.bassSens;
        }
        
        let bassStrength = 0;
        
        if (data.bars && data.bars.length > 0) {
            // Sicherstellen, dass wir nicht außerhalb des Arrays lesen
            let start = Math.min(offset, data.bars.length - 1);
            let end = Math.min(offset + range, data.bars.length);
            
            // Frequenzband ausschneiden
            const lowEnd = data.bars.slice(start, end);
            
            if (lowEnd.length > 0) {
                // Durchschnitt berechnen
                let sum = lowEnd.reduce((a, b) => a + b, 0);
                bassStrength = sum / lowEnd.length;
                
                // Visuelle Verstärkung mit dem Regler-Wert verrechnen
                bassStrength = bassStrength * sensitivity; 
            }
        }

        // --- LAYOUT BERECHNUNG ---
        const gap = 20; 
        
        // Platz unten für die kleinen Instrumente reservieren (Responsive)
        const bottomSpace = Math.max(80, height * 0.18); 
        
        // Maße für die großen Haupt-Meter
        const panelWidth = (width / 2) - (gap / 2);
        const panelHeight = height - bottomSpace; 

        // 2. HAUPT-VU-METER ZEICHNEN (Links & Rechts)
        this.drawVintageGauge(ctx, 0, 0, panelWidth, panelHeight, data.volL, "LEFT CHANNEL");
        this.drawVintageGauge(ctx, (width / 2) + (gap / 2), 0, panelWidth, panelHeight, data.volR, "RIGHT CHANNEL");

        // 3. UNTERE INSTRUMENTE ZEICHNEN (Zentrale Konsole)
        const smallMeterSize = Math.min(100, Math.max(60, width * 0.1));
        const meterY = height - (bottomSpace / 2);
        
        // Abstand von der Mitte
        const centerOffset = smallMeterSize * 0.8; 

        // Differenz-Anzeige (Links der Mitte)
        this.drawDifferenceMeter(ctx, (width / 2) - centerOffset, meterY, smallMeterSize, data.volL, data.volR);

        // Bass-Anzeige (Rechts der Mitte)
        this.drawBassMeter(ctx, (width / 2) + centerOffset, meterY, smallMeterSize, bassStrength);
    }

    // Funktion für die großen VU-Meter
    drawVintageGauge(ctx, x, y, w, h, value, label) {
        
        // --- 1. INTELLIGENTE SKALIERUNG (RESPONSIVE 4:3) ---
        // Wir erzwingen ein Seitenverhältnis wie bei alten HiFi-Anlagen
        const TARGET_RATIO = 1.33; 
        
        let availableW = w * 0.95;
        let availableH = h * 0.95;

        let actualW = availableW;
        let actualH = actualW / TARGET_RATIO;

        // Wenn es zu hoch wird, limitieren wir durch die Höhe
        if (actualH > availableH) {
            actualH = availableH;
            actualW = actualH * TARGET_RATIO;
        }

        // Zentrierung im verfügbaren Bereich
        const offX = x + (w - actualW) / 2;
        const offY = y + (h - actualH) / 2;

        // --- 2. PAPIER & GEHÄUSE ---
        ctx.save();
        
        // Schatten hinter dem Instrument
        ctx.shadowBlur = Math.max(10, actualW * 0.05);
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        
        // Form des Meters (abgerundete Ecken)
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(offX, offY, actualW, actualH, actualW * 0.03);
        } else {
            ctx.rect(offX, offY, actualW, actualH); // Fallback für alte Browser
        }
        ctx.fillStyle = "#181818"; 
        ctx.fill();
        
        // Clipping aktivieren (alles Folgende bleibt in der Form)
        ctx.clip(); 
        ctx.shadowBlur = 0;

        // Papier-Hintergrund Farbe (Beige)
        ctx.fillStyle = "#f4ecd8"; 
        ctx.fillRect(offX, offY, actualW, actualH);

        // Beleuchtung (Radialer Gradient von unten für 3D Effekt)
        const cx = offX + actualW / 2;
        const cy = offY + actualH * 0.82; 
        
        const light = ctx.createRadialGradient(cx, cy, actualH * 0.1, cx, cy, actualH * 1.2);
        light.addColorStop(0, "rgba(255, 255, 255, 0.5)"); 
        light.addColorStop(1, "rgba(0, 0, 0, 0.25)"); 
        
        ctx.fillStyle = light;
        ctx.fillRect(offX, offY, actualW, actualH);

        // Grain (Körnungseffekt für altes Papier)
        ctx.fillStyle = "rgba(0,0,0,0.04)";
        const grains = Math.floor(actualW * 0.5); 
        
        for(let i = 0; i < grains; i++) {
            let px = offX + Math.random() * actualW;
            let py = offY + Math.random() * actualH;
            ctx.fillRect(px, py, 2, 2);
        }

        // Innerer Rahmen (feine Linie)
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = Math.max(1, actualW * 0.002);
        ctx.strokeRect(offX, offY, actualW, actualH);
        
        ctx.restore();

        // --- 3. SKALA GEOMETRIE ---
        const radius = Math.min(actualW * 0.75, (cy - offY) * 0.9);
        const startAngle = Math.PI * 1.25; 
        const endAngle = Math.PI * 1.75;
        const totalAngle = endAngle - startAngle;

        // --- 4. SKALA ZEICHNEN ---
        const numTicks = 20; 
        const fontSize = Math.max(10, Math.floor(actualW * 0.05)); 
        
        ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (let i = 0; i <= numTicks; i++) {
            let progress = i / numTicks; 
            let angle = startAngle + progress * totalAngle;

            // Länge der Striche (Hauptstriche länger)
            let tickLen = radius * 0.08; 
            if (i % 5 === 0) {
                tickLen = radius * 0.15; 
            }

            // Koordinaten berechnen
            let x1 = cx + Math.cos(angle) * (radius - tickLen);
            let y1 = cy + Math.sin(angle) * (radius - tickLen);
            let x2 = cx + Math.cos(angle) * radius;
            let y2 = cy + Math.sin(angle) * radius;

            // Farbe (Rot im oberen Bereich ab 75%)
            if (progress < 0.75) {
                ctx.strokeStyle = "#222"; 
            } else {
                ctx.strokeStyle = "#b00"; 
            }

            // Liniendicke
            if (i % 5 === 0) {
                ctx.lineWidth = Math.max(2, actualW * 0.008);
            } else {
                ctx.lineWidth = Math.max(1, actualW * 0.004); 
            }
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Text Labels (-20, 0, +3 etc.) zeichnen
            if (i % 5 === 0) {
                let textDist = radius - tickLen - (actualW * 0.06);
                let tx = cx + Math.cos(angle) * textDist;
                let ty = cy + Math.sin(angle) * textDist;
                
                let labelText = "";
                if(i === 0) labelText = "-20";
                if(i === 5) labelText = "-10";
                if(i === 10) labelText = "-5";
                if(i === 15) labelText = "0";
                if(i === 20) labelText = "+3";

                if (progress < 0.75) {
                    ctx.fillStyle = "#222";
                } else {
                    ctx.fillStyle = "#b00";
                }
                
                ctx.fillText(labelText, tx, ty);
            }
        }

        // Roter Warnbereich (Bogen)
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle + 0.75 * totalAngle, endAngle);
        ctx.strokeStyle = "rgba(200, 0, 0, 0.15)"; 
        ctx.lineWidth = radius * 0.12;
        ctx.stroke();

        // --- 5. NADEL ZEICHNEN ---
        // Begrenzung des Wertes
        if (value > 115) value = 115;
        
        let needleProgress = value / 100;
        // Nadel darf nicht unter den Startpunkt fallen
        if(needleProgress < -0.02) needleProgress = -0.02; 
        
        let needleAngle = startAngle + needleProgress * totalAngle;

        // Spitzen-Koordinaten
        let nx = cx + Math.cos(needleAngle) * (radius - 5);
        let ny = cy + Math.sin(needleAngle) * (radius - 5);
        
        // Hinteres Gegengewicht Koordinaten
        let bx = cx + Math.cos(needleAngle + Math.PI) * (radius * 0.15);
        let by = cy + Math.sin(needleAngle + Math.PI) * (radius * 0.15);

        const needleW = Math.max(2, actualW * 0.005);

        // Nadel-Schatten (leicht versetzt)
        ctx.beginPath();
        ctx.moveTo(bx + (needleW * 1.5), by + (needleW * 1.5)); 
        ctx.lineTo(nx + (needleW * 1.5), ny + (needleW * 1.5));
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.lineWidth = needleW;
        ctx.stroke();

        // Nadel-Körper (Schwarz)
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = "#1a1a1a"; 
        ctx.lineWidth = needleW;
        ctx.stroke();

        // Nadel-Spitze (Rot) - nur das obere Drittel
        let tipStart = 0.65;
        let tx = cx + Math.cos(needleAngle) * (radius * tipStart);
        let ty = cy + Math.sin(needleAngle) * (radius * tipStart);
        
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = "#d00";
        ctx.lineWidth = needleW;
        ctx.stroke();

        // Schraube in der Mitte (Metall-Effekt)
        let screwGrad = ctx.createRadialGradient(cx - 1, cy - 1, 1, cx, cy, radius * 0.06);
        screwGrad.addColorStop(0, "#eee");
        screwGrad.addColorStop(1, "#333");

        ctx.fillStyle = screwGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.05, 0, Math.PI * 2); 
        ctx.fill();
        
        // Labels Unten (Beschriftung)
        ctx.fillStyle = "#543"; 
        ctx.font = `bold ${fontSize * 0.9}px sans-serif`;
        ctx.fillText(label, cx, cy - (radius * 0.35)); 
        
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.font = `bold ${fontSize * 1.5}px serif`;
        ctx.fillText("VU", cx, cy - (radius * 0.6)); 
    }

    // --- DIFFERENZ ANZEIGE (KLEIN) ---
    drawDifferenceMeter(ctx, x, y, size, volL, volR) {
        ctx.save();
        
        // Gehäuse zeichnen
        this.drawRoundHousing(ctx, x, y, size);

        // Text Labels
        ctx.font = `${Math.floor(size * 0.2)}px sans-serif`;
        ctx.fillStyle = "#aaa";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        ctx.fillText("L", x - size / 3, y + (size * 0.15));
        ctx.fillText("R", x + size / 3, y + (size * 0.15));
        
        ctx.font = `${Math.floor(size * 0.15)}px sans-serif`;
        ctx.fillText("BAL", x, y - size / 4);

        // Nadel Berechnung (Balance)
        let diff = volR - volL;
        // Limitieren
        if (diff > 50) diff = 50; 
        if (diff < -50) diff = -50;
        
        // Winkel berechnen (Mitte ist 270 Grad bzw 1.5 PI)
        let angle = (Math.PI * 1.5) + (diff / 50) * (Math.PI * 0.25);

        // Farbe: Grün wenn mittig (< 5 Diff), Rot wenn unsymmetrisch
        let color = "#f55";
        if (Math.abs(diff) < 5) {
            color = "#0f0";
        }

        this.drawSmallNeedle(ctx, x, y, size, angle, color);

        ctx.restore();
    }

    // --- BASS ANZEIGE (KLEIN) ---
    drawBassMeter(ctx, x, y, size, bassValue) {
        ctx.save();
        
        // Gehäuse zeichnen
        this.drawRoundHousing(ctx, x, y, size);

        // Glow Effekt wenn Bass stark ist
        if(bassValue > 50) {
            ctx.beginPath();
            ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
            // Transparenz basierend auf Stärke
            let alpha = (bassValue - 50) * 0.005;
            ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`;
            ctx.fill();
        }

        // Text Labels
        ctx.font = `bold ${Math.floor(size * 0.18)}px sans-serif`;
        ctx.fillStyle = "#d8a"; // Leicht violetter Touch
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("LOW", x, y - size / 4);
        
        ctx.font = `${Math.floor(size * 0.12)}px sans-serif`;
        ctx.fillStyle = "#666";
        ctx.fillText("FREQ", x, y + size / 5);

        // Nadel
        if(bassValue > 100) bassValue = 100;
        
        // Winkelbereich (oben)
        let angle = (Math.PI * 1.25) + (bassValue / 100) * (Math.PI * 0.5);

        // Farbe wird intensiver bei mehr Bass
        let color = "#aaa";
        if(bassValue > 40) color = "#fa0"; // Orange
        if(bassValue > 80) color = "#f00"; // Rot

        this.drawSmallNeedle(ctx, x, y, size, angle, color);

        ctx.restore();
    }

    // HILFSFUNKTION: Rundes Gehäuse für kleine Instrumente
    drawRoundHousing(ctx, x, y, size) {
        // Gehäuse Body (Verlauf)
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        
        let grad = ctx.createLinearGradient(x - size/2, y - size/2, x + size/2, y + size/2);
        grad.addColorStop(0, "#333");
        grad.addColorStop(1, "#111");
        
        ctx.fillStyle = grad;
        ctx.fill();
        
        // Metallrand
        ctx.lineWidth = Math.max(2, size * 0.03);
        ctx.strokeStyle = "#555";
        ctx.stroke();

        // Glas-Reflexion (oberer Halbkreis)
        ctx.beginPath();
        ctx.arc(x, y, size * 0.48, 0, Math.PI, true); 
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.fill();
    }

    // HILFSFUNKTION: Kleine Nadel
    drawSmallNeedle(ctx, x, y, size, angle, color) {
        let r = size * 0.4;
        let nx = x + Math.cos(angle) * r;
        let ny = y + Math.sin(angle) * r;

        // Nadel Strich
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, size * 0.04);
        ctx.lineCap = "round";
        ctx.stroke();

        // Weiße Kappe in der Mitte
        ctx.beginPath();
        ctx.arc(x, y, size * 0.06, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
    }
}