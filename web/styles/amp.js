// --- START OF FILE styles/amp.js ---

class AmpShowRenderer {
    constructor() {
        this.frame = 0;
        
        // Simuliert die Hitze der Röhren (zufälliges Flackern)
        this.tubeHeat = 0; 
        
        // Zufällige Positionen für die Regler (bleiben gleich pro Session)
        this.knobs = [];
        for(let i=0; i<8; i++) {
            this.knobs.push(Math.random() * 0.8 + 0.1); // 10% bis 90% Drehung
        }
    }

    analyze(data) {
        if (!data || !data.bars) return { kick: 0, snare: 0, raw: 0 };
        const b = data.bars;

        // Kick (bewegt die Membrane) - Tiefe Frequenzen
        let kickRaw = b.slice(0, 4).reduce((a,c)=>a+c,0) / 400;
        let kick = kickRaw > 0.4 ? Math.pow(kickRaw, 2) : 0;

        // Snare/Gitarre (bewegt das Licht/Vibration) - Mitten
        let snareRaw = b.slice(10, 30).reduce((a,c)=>a+c,0) / 2000;
        let snare = snareRaw;

        // Gesamtlautstärke für "Shake"
        let raw = b.reduce((a,c)=>a+c,0) / (b.length * 255);

        return { kick, snare, raw };
    }

    draw(ctx, width, height, data) {
        const audio = this.analyze(data);
        this.frame++;

        // --- STAGE SETUP ---
        // Dunkler Bühnenboden
        let grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, "#111");
        grad.addColorStop(1, "#000");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Spotlight Effekt von oben
        let spot = ctx.createRadialGradient(width/2, -100, 10, width/2, height/2, height);
        spot.addColorStop(0, "rgba(255, 255, 230, 0.15)");
        spot.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = spot;
        ctx.fillRect(0,0,width,height);


        // --- AMP PHYSICS ---
        // Der ganze Amp vibriert bei lautem Bass
        let shakeX = 0;
        let shakeY = 0;
        if (audio.kick > 0.5) {
            shakeX = (Math.random() - 0.5) * (audio.kick * 10);
            shakeY = (Math.random() - 0.5) * (audio.kick * 10);
        }

        ctx.save();
        ctx.translate(width/2 + shakeX, height/2 + shakeY);

        // Größe des Amps (skaliert mit Fenster)
        const ampW = Math.min(width * 0.8, 600);
        const ampH = ampW * 0.75; // 4:3 Verhältnis
        const x = -ampW / 2;
        const y = -ampH / 2;

        // 1. GEHÄUSE (Black Tolex)
        this.drawCabinet(ctx, x, y, ampW, ampH);

        // 2. SPEAKER & INNENLEBEN (Hinter dem Stoff)
        // Wir zeichnen erst die Speaker, dann den Stoff drüber
        this.drawSpeakers(ctx, x, y, ampW, ampH, audio);

        // 3. GRILLE CLOTH (Der Stoff vorne drauf)
        this.drawGrilleCloth(ctx, x, y, ampW, ampH);

        // 4. CONTROL PANEL (Oben silber)
        this.drawControlPanel(ctx, x, y, ampW, ampH, audio);

        // 5. LOGO ("Pender")
        this.drawLogo(ctx, x, y, ampW, ampH);

        ctx.restore();
    }

    drawCabinet(ctx, x, y, w, h) {
        // Hauptbox (Schwarz mit leichter Leder-Struktur Simulation durch Gradient)
        let grad = ctx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, "#222"); // Licht oben links
        grad.addColorStop(0.5, "#050505");
        grad.addColorStop(1, "#111"); // Licht unten rechts
        
        ctx.fillStyle = grad;
        
        // Runde Ecken
        const rad = 20;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, rad);
        ctx.fill();

        // Kanten (Piping) - Silber/Weißer Rand
        ctx.strokeStyle = "#ddd";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Schatten unter dem Amp
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.beginPath();
        ctx.ellipse(x + w/2, y + h + 10, w * 0.45, 10, 0, 0, Math.PI*2);
        ctx.fill();
    }

    drawSpeakers(ctx, x, y, w, h, audio) {
        // Bereich für die Speaker (etwas kleiner als Gehäuse)
        const innerM = w * 0.05; // Margin
        const panelH = h * 0.2;  // Platz für Regler oben
        const grilleX = x + innerM;
        const grilleY = y + panelH;
        const grilleW = w - innerM*2;
        const grilleH = h - panelH - innerM;

        // Hintergrund hinter dem Stoff (Dunkel)
        ctx.fillStyle = "#111";
        ctx.fillRect(grilleX, grilleY, grilleW, grilleH);

        // Speaker Setup: 2x12" (Zwei Kreise nebeneinander)
        const spkRadius = (grilleW / 4) * 0.85; 
        const spkY = grilleY + grilleH / 2;
        
        // Linker und Rechter Speaker
        const leftX = grilleX + grilleW * 0.25;
        const rightX = grilleX + grilleW * 0.75;

        this.drawSingleSpeaker(ctx, leftX, spkY, spkRadius, audio);
        this.drawSingleSpeaker(ctx, rightX, spkY, spkRadius, audio);
    }

    drawSingleSpeaker(ctx, cx, cy, radius, audio) {
        // Physik: Je mehr Bass, desto größer der "Ausschlag" (Skalierung)
        // Wir simulieren das durch Verschiebung von Schatten und Größe des "Dust Cap"
        
        const push = audio.kick * 15; // Pixel Bewegung

        // 1. Korb (Rahmen) - Statisch
        ctx.fillStyle = "#222";
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2); ctx.fill();

        // 2. Membran (Cone) - Dunkelgrau Verlauf
        let coneGrad = ctx.createRadialGradient(cx, cy, radius*0.2, cx, cy, radius);
        coneGrad.addColorStop(0, "#333");
        coneGrad.addColorStop(1, "#111");
        ctx.fillStyle = coneGrad;
        ctx.beginPath(); ctx.arc(cx, cy, radius - 5, 0, Math.PI*2); ctx.fill();

        // 3. Dust Cap (Die Mitte) - Das bewegt sich am meisten
        // Wir machen sie heller/größer wenn der Bass kickt (Simulation von Lichtreflexion bei Bewegung)
        const capRadius = (radius * 0.3) + (push * 0.5); 
        
        let capGrad = ctx.createRadialGradient(cx - push, cy - push, 0, cx, cy, capRadius);
        capGrad.addColorStop(0, "#666"); // Lichtreflex
        capGrad.addColorStop(1, "#222");
        
        ctx.fillStyle = capGrad;
        ctx.beginPath(); ctx.arc(cx, cy, capRadius, 0, Math.PI*2); ctx.fill();

        // Sicke (Der Gummiring außen)
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cx, cy, radius - 10, 0, Math.PI*2); ctx.stroke();
    }

    drawGrilleCloth(ctx, x, y, w, h) {
        const innerM = w * 0.05;
        const panelH = h * 0.2;
        const gx = x + innerM;
        const gy = y + panelH;
        const gw = w - innerM*2;
        const gh = h - panelH - innerM;

        // Clip Region setzen, damit wir nicht über den Rand malen
        ctx.save();
        ctx.beginPath();
        ctx.rect(gx, gy, gw, gh);
        ctx.clip();

        // Silber/Graues Muster (Crosshatch)
        // Wir malen diagonale Linien
        ctx.strokeStyle = "rgba(180, 180, 190, 0.15)"; // Sehr transparent, damit man Speaker sieht
        ctx.lineWidth = 2;

        const spacing = 6;
        
        // Diagonal /
        for(let i = -gh; i < gw; i+=spacing) {
            ctx.beginPath();
            ctx.moveTo(gx + i, gy);
            ctx.lineTo(gx + i + gh, gy + gh);
            ctx.stroke();
        }

        // Diagonal \
        for(let i = 0; i < gw + gh; i+=spacing) {
            ctx.beginPath();
            ctx.moveTo(gx + i, gy);
            ctx.lineTo(gx + i - gh, gy + gh);
            ctx.stroke();
        }

        // Rahmen um den Stoff (Holzleiste)
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 4;
        ctx.strokeRect(gx, gy, gw, gh);

        ctx.restore();
    }

    drawControlPanel(ctx, x, y, w, h, audio) {
        const hPanel = h * 0.2;
        
        // Hintergrund: Gebürstetes Metall (Gradient)
        let grad = ctx.createLinearGradient(x, y, x, y + hPanel);
        grad.addColorStop(0, "#ccc");
        grad.addColorStop(0.5, "#fff");
        grad.addColorStop(1, "#999");
        
        // Oben abrunden (Clip)
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, w, hPanel, [20, 20, 0, 0]);
        ctx.clip();
        
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, hPanel);

        // --- BEDIENELEMENTE ---
        
        // 1. INPUT JACK (Links)
        const jackX = x + w * 0.1;
        const jackY = y + hPanel * 0.6;
        ctx.fillStyle = "#111";
        ctx.beginPath(); ctx.arc(jackX, jackY, 8, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "#888"; ctx.lineWidth = 3; ctx.stroke();
        // Label
        ctx.fillStyle = "#000"; ctx.font = "10px monospace"; ctx.fillText("INPUT", jackX-15, jackY - 15);

        // 2. REGLER (Knobs)
        const knobCount = 8;
        const startX = x + w * 0.25;
        const endX = x + w * 0.85;
        const step = (endX - startX) / (knobCount - 1);
        
        const labels = ["VOL", "TREB", "MID", "BASS", "REV", "SPD", "INT", "MAST"];

        for(let i=0; i<knobCount; i++) {
            const kx = startX + i * step;
            const ky = jackY;
            const size = w * 0.03;

            // Skirt (Unterlegscheibe mit Zahlen)
            ctx.fillStyle = "#111";
            ctx.beginPath(); ctx.arc(kx, ky, size*1.2, 0, Math.PI*2); ctx.fill();
            
            // Knob (Plastik)
            ctx.fillStyle = "#222";
            let kGrad = ctx.createRadialGradient(kx - 2, ky - 2, 0, kx, ky, size);
            kGrad.addColorStop(0, "#555");
            kGrad.addColorStop(1, "#000");
            ctx.fillStyle = kGrad;
            ctx.beginPath(); ctx.arc(kx, ky, size, 0, Math.PI*2); ctx.fill();

            // Zeiger (Weißer Strich)
            // Wenn Musik laut ist, wackeln die Knöpfe minimal (Vibration)
            let vib = (audio.kick > 0.6) ? (Math.random()-0.5)*0.2 : 0;
            let rotation = (Math.PI * 0.75) + (this.knobs[i] * (Math.PI * 1.5)) + vib; 
            
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(kx, ky);
            ctx.lineTo(kx + Math.cos(rotation) * size, ky + Math.sin(rotation) * size);
            ctx.stroke();

            // Text Label
            ctx.fillStyle = "#000";
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(labels[i], kx, ky - size - 8);
        }

        // 3. POWER SWITCH & JEWEL LIGHT (Rechts)
        const powerX = x + w * 0.93;
        
        // Schalter
        ctx.fillStyle = "#888";
        ctx.fillRect(powerX - 15, jackY - 10, 10, 20); // Metal Toggle
        
        // JEWEL LIGHT (Das Herzstück)
        const jewelX = powerX + 15;
        const jewelY = jackY;
        const jewelSize = 10;

        // Leuchtstärke basiert auf Snare/Highs oder einfach an
        const intensity = 0.5 + audio.snare * 0.5 + Math.random() * 0.1;
        
        // Glow Effekt
        let glow = ctx.createRadialGradient(jewelX, jewelY, 2, jewelX, jewelY, 30);
        glow.addColorStop(0, `rgba(255, 0, 0, ${intensity})`);
        glow.addColorStop(1, "rgba(255, 0, 0, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(jewelX - 30, jewelY - 30, 60, 60);

        // Das Glas selbst
        let jewelGrad = ctx.createRadialGradient(jewelX - 3, jewelY - 3, 0, jewelX, jewelY, jewelSize);
        jewelGrad.addColorStop(0, "#ffaaaa");
        jewelGrad.addColorStop(0.5, "#ff0000");
        jewelGrad.addColorStop(1, "#550000");
        ctx.fillStyle = jewelGrad;
        
        // Diamantform simulieren
        ctx.beginPath();
        ctx.arc(jewelX, jewelY, jewelSize, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
    }

    drawLogo(ctx, x, y, w, h) {
        const innerM = w * 0.05;
        const panelH = h * 0.2;
        
        // Logo Position: Oben Links auf dem Grille Cloth
        const lx = x + innerM + 20;
        const ly = y + panelH + 40;

        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(-0.1); // Das Fender Logo ist leicht schief

        // Schatten
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.font = "italic bold 40px serif"; 
        ctx.fillText("Pender", 2, 2);

        // Plastik-Effekt (Chrom/Weiß)
        ctx.lineWidth = 1;
        ctx.fillStyle = "#eee";
        ctx.strokeStyle = "#888";
        
        // Text zeichnen
        ctx.fillText("Pender", 0, 0);
        ctx.strokeText("Pender", 0, 0);

        // Unterstrich (Der typische Schweif)
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.quadraticCurveTo(60, 10, 110, -5);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#eee";
        ctx.stroke();

        // Kleiner Text drunter
        ctx.font = "italic 10px sans-serif";
        ctx.fillStyle = "#ccc";
        ctx.fillText("Twin Peverb", 60, 10);

        ctx.restore();
    }
}