// --- START OF FILE styles/scope.js ---

class PamegScopeRenderer {
    constructor() {
        this.frame = 0;
    }

    analyze(data) {
        if (!data) return { vol: 0, raw: [] };
        let raw = [];
        let vol = 0;

        if (data.raw && data.raw.length > 0) {
            raw = data.raw;
            let sum = 0;
            for(let i=0; i<raw.length; i++) {
                let v = (raw[i] - 128) / 128;
                sum += v*v;
            }
            vol = Math.sqrt(sum / raw.length);
        } else if (data.bars) {
            vol = data.bars.reduce((a,c)=>a+c,0) / (data.bars.length * 255);
            for(let i=0; i<256; i++) {
                // Synthetische Welle für Simulation
                let val = 128 + Math.sin(i * 0.1 + this.frame * 0.2) * (data.bars[0] * 0.8) 
                              + Math.sin(i * 0.05) * (data.bars[5] * 0.5)
                              + (Math.random()-0.5) * 2; // Rauschen
                raw.push(val);
            }
        }
        return { vol, raw };
    }

    draw(ctx, width, height, data) {
        const audio = this.analyze(data);
        this.frame++;

        // 1. Hintergrund (Dunkel)
        ctx.fillStyle = "#111"; 
        ctx.fillRect(0, 0, width, height);

        // 2. Proportionen (HM 412 ist fast quadratisch, leicht hochkant)
        // Wir orientieren uns an der Höhe
        const scopeH = Math.min(height * 0.9, 800);
        const scopeW = scopeH * 0.88; // Original Ratio
        const x = (width - scopeW) / 2;
        const y = (height - scopeH) / 2;

        ctx.save();
        ctx.translate(x, y);

        // --- HAUPTGERÄT ---
        this.drawPanelBackground(ctx, scopeW, scopeH);

        // --- LAYOUT DEFINITION ---
        const topH = scopeH * 0.48; // Oberer Bereich (Screen)
        const bottomH = scopeH - topH;
        
        // --- OBERER TEIL ---
        // Screen nimmt links ca 60% ein
        const screenW = scopeW * 0.62;
        this.drawScreenSection(ctx, 20, 40, screenW - 20, topH - 50, audio);
        
        // Rechtes Panel oben
        this.drawTopControls(ctx, screenW + 10, 40, scopeW - screenW - 30, topH - 50);

        // --- UNTERER TEIL ---
        // Aufgeteilt in 3 Sektionen: Amp 1, Amp 2, Timebase
        // HAMEG hat hier Linien um die Sektionen
        const bY = topH + 10;
        const bH = bottomH - 40;
        
        // Wir zeichnen die Rahmen-Boxen für die Sektionen
        const sectW = (scopeW - 40) / 2.1; // Breite der Amp Sektion
        
        // AMPLIFIER SEKTION (Links, geteilt in I und II)
        this.drawAmplifierSection(ctx, 20, bY, sectW, bH, audio);
        
        // TIMEBASE SEKTION (Rechts)
        const tbX = 20 + sectW + 10;
        const tbW = scopeW - tbX - 20;
        this.drawTimebaseSection(ctx, tbX, bY, tbW, bH, audio);

        // --- DETAILS ---
        this.drawScrewsAndHandle(ctx, scopeW, scopeH);

        ctx.restore();
    }

    drawPanelBackground(ctx, w, h) {
        // HAMEG "Kieselgrau" (Nicht weiß!)
        ctx.fillStyle = "#cfcfc4"; 
        
        // Gehäuseform
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, 6);
        ctx.fill();

        // Kante (Bezel)
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Header Text
        ctx.fillStyle = "#111";
        ctx.font = "700 14px Arial"; 
        ctx.textAlign = "left";
        ctx.fillText("OSCILLOSCOPE PM 412", 25, 25);
        
        ctx.textAlign = "right";
        ctx.font = "900 16px Arial"; 
        ctx.fillText("PAMEG", w - 25, 25);
    }

    drawScreenSection(ctx, x, y, w, h, audio) {
        // Schwarzer Lichtschutz (Hood) - Massiv und Tief
        ctx.fillStyle = "#101010";
        // Schattenwurf nach unten rechts für 3D Effekt
        ctx.shadowBlur = 10; ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowOffsetX=5; ctx.shadowOffsetY=5;
        ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowOffsetX=0; ctx.shadowOffsetY=0;

        // Innenrahmen (Tiefe)
        let grad = ctx.createLinearGradient(x, y, x+w, y+h);
        grad.addColorStop(0, "#444"); grad.addColorStop(0.1, "#111");
        ctx.strokeStyle = grad; ctx.lineWidth = 6; ctx.strokeRect(x+3, y+3, w-6, h-6);

        // CRT Screen Fläche
        const pad = 12;
        const crtX = x + pad; const crtY = y + pad;
        const crtW = w - pad*2; const crtH = h - pad*2;

        ctx.save();
        ctx.beginPath(); ctx.rect(crtX, crtY, crtW, crtH); ctx.clip();

        // Screen Hintergrund (Dunkles Phosphor-Grün/Grau)
        ctx.fillStyle = "#1f241f"; 
        ctx.fillRect(crtX, crtY, crtW, crtH);

        // Raster (Graticule) - Das HM412 Raster ist schwarz gedruckt auf der Scheibe!
        ctx.strokeStyle = "rgba(0,0,0,0.7)"; 
        ctx.lineWidth = 1.5;
        
        // Grid 10x8
        for(let i=1; i<10; i++) {
            let lx = crtX + i*(crtW/10);
            ctx.beginPath(); ctx.moveTo(lx, crtY); ctx.lineTo(lx, crtY+crtH); ctx.stroke();
            // Center Line Ticks
            if(i===5) {
                 for(let k=0; k<50; k++) {
                     let ly = crtY + k*(crtH/50);
                     ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(lx-2, ly); ctx.lineTo(lx+2, ly); ctx.stroke();
                 }
                 ctx.lineWidth=1.5;
            }
        }
        for(let i=1; i<8; i++) {
            let ly = crtY + i*(crtH/8);
            ctx.beginPath(); ctx.moveTo(crtX, ly); ctx.lineTo(crtX+crtW, ly); ctx.stroke();
            if(i===4) {
                 for(let k=0; k<50; k++) {
                     let lx = crtX + k*(crtW/50);
                     ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(lx, ly-2); ctx.lineTo(lx, ly+2); ctx.stroke();
                 }
                 ctx.lineWidth=1.5;
            }
        }

        // WAVEFORM
        if(audio.raw.length > 0) {
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            
            // Glow
            ctx.shadowBlur = 8; ctx.shadowColor = "rgba(50, 255, 50, 0.8)";
            ctx.strokeStyle = "#4f4"; ctx.lineWidth = 2.5;

            ctx.beginPath();
            const step = crtW / audio.raw.length;
            for(let i=0; i<audio.raw.length; i++) {
                let val = audio.raw[i] / 255;
                let px = crtX + i * step;
                let py = crtY + crtH - (val * crtH);
                if(i===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        
        // Innere Vignette (Glaswölbung)
        let vig = ctx.createRadialGradient(crtX+crtW/2, crtY+crtH/2, crtH*0.4, crtX+crtW/2, crtY+crtH/2, crtH);
        vig.addColorStop(0, "transparent");
        vig.addColorStop(1, "rgba(0,0,0,0.5)");
        ctx.fillStyle = vig;
        ctx.fillRect(crtX, crtY, crtW, crtH);

        ctx.restore();
    }

    drawTopControls(ctx, x, y, w, h) {
        // Rechteckiger Rahmen um die oberen Controls (Typisch Hameg)
        this.drawSectionBox(ctx, x, y, w, h/2); // Obere Hälfte für Y-Pos
        
        // X-POS & MAG
        this.drawSmallKnob(ctx, x + w*0.3, y + 35, "X-POS", "#555");
        this.drawSmallKnob(ctx, x + w*0.7, y + 35, "X-MAG", "#c33"); // Rot

        // Rahmen um die untere Hälfte
        this.drawSectionBox(ctx, x, y + h/2 + 5, w, h/2 - 5);

        // INTENS & FOCUS
        const lowerY = y + h/2 + 30;
        this.drawSmallKnob(ctx, x + w*0.3, lowerY, "INTENS", "#555");
        this.drawSmallKnob(ctx, x + w*0.7, lowerY, "FOCUS", "#555");

        // Power Switch ganz unten im Panel
        const swY = y + h - 30;
        this.drawRectSwitch(ctx, x + 20, swY);
        // Power LED
        ctx.fillStyle = "#d00"; ctx.beginPath(); ctx.arc(x+50, swY+8, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#000"; ctx.font = "10px Arial"; ctx.fillText("POWER", x+60, swY+12);
    }

    drawAmplifierSection(ctx, x, y, w, h, audio) {
        // Rahmen um die ganze Sektion
        this.drawSectionBox(ctx, x, y, w, h);

        const midX = x + w/2;
        
        // Vertikale Trennlinie zwischen CH I und CH II
        // Hameg HM412 hat oft eine gestrichelte oder dünne Linie
        ctx.strokeStyle = "#888"; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
        ctx.beginPath(); ctx.moveTo(midX, y+10); ctx.lineTo(midX, y+h-10); ctx.stroke();
        ctx.setLineDash([]);

        const yKnob = y + 70;
        const yBig = y + 160;

        // CH I (Links)
        const x1 = x + w*0.25;
        this.drawSmallKnob(ctx, x1, yKnob, "Y-POS I", "#555");
        // Schiebeschalter AC/DC
        this.drawRectSwitch(ctx, x1-10, yKnob + 40);
        // Großer Amplituden Knopf
        this.drawBigHamegKnob(ctx, x1, yBig, "AMPL. I", audio.vol * 3);
        // BNC Input
        this.drawBNC(ctx, x1, y+h-40, "CH I");

        // CH II (Rechts)
        const x2 = x + w*0.75;
        this.drawSmallKnob(ctx, x2, yKnob, "Y-POS II", "#555");
        this.drawRectSwitch(ctx, x2-10, yKnob + 40);
        this.drawBigHamegKnob(ctx, x2, yBig, "AMPL. II", 0);
        this.drawBNC(ctx, x2, y+h-40, "CH II");
    }

    drawTimebaseSection(ctx, x, y, w, h, audio) {
        // Rahmen
        this.drawSectionBox(ctx, x, y, w, h);

        const cx = x + w*0.4; // Hauptknopf etwas links der Mitte
        
        // Timebase Schiebeschalter oben
        this.drawRectSwitch(ctx, cx - 10, y + 40);

        // Großer Knopf
        this.drawBigHamegKnob(ctx, cx, y + 120, "TIMEBASE", 0.3);

        // Rechts: Trigger Controls
        const tx = x + w*0.8;
        this.drawSmallKnob(ctx, tx, y + 60, "LEVEL", "#c33"); // Rot
        this.drawRectSwitch(ctx, tx - 10, y + 110); // Trigger Source
        this.drawSmallKnob(ctx, tx, y + 160, "HOLD", "#555");

        // Inputs unten
        this.drawBNC(ctx, cx + 20, y+h-40, "EXT.");
    }

    // --- KOMPONENTEN ---

    drawSectionBox(ctx, x, y, w, h) {
        // Die typischen dünnen schwarzen Linien um Sektionen
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
    }

    drawBigHamegKnob(ctx, x, y, label, val) {
        const r = 32;
        // Skala (Grauer Kreis unten drunter)
        ctx.fillStyle = "#e5e5e5";
        ctx.beginPath(); ctx.arc(x, y, r+12, 0, Math.PI*2); ctx.fill();
        // Striche
        ctx.strokeStyle = "#000"; ctx.lineWidth = 1;
        for(let i=0; i<12; i++) {
            let a = i * (Math.PI/6);
            ctx.beginPath(); ctx.moveTo(x+Math.cos(a)*(r+5), y+Math.sin(a)*(r+5));
            ctx.lineTo(x+Math.cos(a)*(r+11), y+Math.sin(a)*(r+11)); ctx.stroke();
        }

        // Knopfkörper (Dunkles Grau)
        ctx.shadowBlur=6; ctx.shadowColor="rgba(0,0,0,0.4)";
        ctx.fillStyle = "#555"; 
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;

        // Innenteil (Etwas heller)
        ctx.fillStyle = "#666";
        ctx.beginPath(); ctx.arc(x, y, r-4, 0, Math.PI*2); ctx.fill();

        // Kappe (Rot für Calibrated, sonst Grau. Hameg meist Rot in der Mitte)
        ctx.fillStyle = "#b22";
        ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI*2); ctx.fill();

        // Zeiger (Weiß)
        let ang = Math.PI*0.8 + val;
        ctx.strokeStyle="#fff"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+Math.cos(ang)*r, y+Math.sin(ang)*r); ctx.stroke();

        // Label
        ctx.fillStyle = "#000"; ctx.font = "bold 10px Arial"; ctx.textAlign="center";
        ctx.fillText(label, x, y - r - 16);
    }

    drawSmallKnob(ctx, x, y, label, color) {
        const r = 11;
        // Schatten
        ctx.shadowBlur=3; ctx.shadowColor="rgba(0,0,0,0.5)";
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;
        
        // Weißer Strich
        ctx.strokeStyle="#fff"; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x, y-r); ctx.stroke();

        ctx.fillStyle = "#000"; ctx.font = "9px Arial"; ctx.textAlign="center";
        ctx.fillText(label, x, y - r - 6);
    }

    drawRectSwitch(ctx, x, y) {
        // Schwarzer Schiebeschalter
        ctx.fillStyle = "#111";
        ctx.fillRect(x, y, 20, 12);
        // Geriffelt
        ctx.fillStyle = "#333";
        ctx.fillRect(x+2, y+2, 16, 8);
    }

    drawBNC(ctx, x, y, label) {
        // Metall
        let g = ctx.createLinearGradient(x-10,y-10,x+10,y+10);
        g.addColorStop(0,"#ddd"); g.addColorStop(1,"#888");
        ctx.fillStyle = g; 
        ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle="#555"; ctx.lineWidth=1; ctx.stroke();
        
        // Isolator
        ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI*2); ctx.fill();
        // Loch
        ctx.fillStyle="#000"; ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI*2); ctx.fill();

        if(label) {
            ctx.fillStyle="#000"; ctx.font="9px Arial"; 
            ctx.fillText(label, x, y+24);
        }
    }

    drawScrewsAndHandle(ctx, w, h) {
        // Schrauben (4 Ecken)
        const s = 10;
        ctx.fillStyle = "#a0a0a0"; ctx.strokeStyle="#666"; ctx.lineWidth=1;
        [[s,s],[w-s,s],[s,h-s],[w-s,h-s]].forEach(p=>{
            ctx.beginPath(); ctx.arc(p[0],p[1],3.5,0,Math.PI*2); ctx.fill(); ctx.stroke();
            // Schlitz
            ctx.strokeStyle="#444"; ctx.beginPath(); ctx.moveTo(p[0]-2,p[1]); ctx.lineTo(p[0]+2,p[1]); ctx.stroke();
        });

        // Bügel (Handle) unten drunter
        ctx.strokeStyle = "#ccc"; ctx.lineWidth = 5; ctx.lineCap="round";
        ctx.beginPath(); 
        ctx.moveTo(w*0.1, h+4); ctx.lineTo(w*0.1, h+30);
        ctx.lineTo(w*0.9, h+30); ctx.lineTo(w*0.9, h+4);
        ctx.stroke();
    }
}