// --- START OF FILE styles/metal.js ---

class MetalShowRenderer {
    constructor() {
        this.frame = 0;
        
        // --- 1. DAS LOGO (Mitte) ---
        // Wir definieren keine statischen Punkte, sondern berechnen sie live für den Glitch-Effekt

        // --- 2. BELEUCHTUNG ---
        this.spots = [];
        const spotCount = 12;
        for(let i=0; i<spotCount; i++) {
            this.spots.push({
                xRatio: (i + 0.5) / spotCount, 
                angle: Math.PI / 2,
                color: '255, 255, 255',
                width: 1.0,
                flashTimer: 0
            });
        }

        // --- 3. PARTIKEL ---
        this.particles = [];    // Asche/Staub
        this.fireParticles = []; // Explosions-Feuer
        this.scratches = [];    // Bildstörungen

        this.shake = 0;
    }

    analyze(data) {
        if (!data || !data.bars) return { kick: 0, snare: 0, raw: [] };
        const b = data.bars;

        // Kick: Tiefbass (0-60Hz)
        let rawBass = b.slice(0, 4).reduce((a,b)=>a+b,0) / 400;
        let kick = rawBass > 0.65 ? Math.pow(rawBass, 4) : 0; 

        // Snare/Gitarren-Wand (500Hz-2kHz)
        let rawMid = b.slice(10, 25).reduce((a,b)=>a+b,0) / 1500;
        let snare = rawMid > 0.4 ? Math.pow(rawMid, 2) : 0;

        return { kick, snare, raw: b };
    }

    draw(ctx, width, height, data) {
        const audio = this.analyze(data);
        this.frame++;

        // --- 1. GLOBAL FX ---
        if (audio.kick > 0.8) this.shake = 50 * audio.kick;
        this.shake *= 0.85;

        // Background: "Asphalt" Dunkelgrau (Street Style)
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        
        // Shake it!
        let sx = (Math.random()-0.5) * this.shake;
        let sy = (Math.random()-0.5) * this.shake;
        ctx.translate(sx, sy);

        // --- 2. THE HYBRID SYMBOL (Mitte) ---
        // Das neue Herzstück: Graffiti-Paw im Industrial Look
        this.drawHybridLogo(ctx, width, height, audio);

        // --- 3. KRATZER & GLITCHES ---
        this.updateAndDrawScratches(ctx, width, height, audio);

        // --- 4. FEUER (Nur bei Drop) ---
        this.updateAndDrawFire(ctx, width, height, audio);

        // --- 5. LIGHTS ---
        ctx.globalCompositeOperation = 'lighter';
        this.drawBeams(ctx, width, height, audio);

        // --- 6. OVERLAYS ---
        // Scanlines (Retro Monitor Look)
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        for(let y=0; y<height; y+=3) {
            ctx.fillRect(0, y, width, 1);
        }

        ctx.restore();

        // Flash bei Kick
        if (audio.kick > 0.9) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
            ctx.fillRect(0, 0, width, height);
        }
        
        // Dreckige Vignette
        let grad = ctx.createRadialGradient(width/2, height/2, height*0.4, width/2, height/2, height);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.95)");
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,width,height);
    }

    // ==========================================
    //              VISUAL FX
    // ==========================================

    drawHybridLogo(ctx, width, height, audio) {
        const cx = width / 2;
        const cy = height / 2;
        
        // Größe pumpt mit Bass
        const baseSize = Math.min(width, height) * 0.35;
        const s = baseSize * (1.0 + audio.kick * 0.15);

        ctx.save();
        ctx.translate(cx, cy);

        // Zitter-Effekt (Glitch) bei Snare
        if (audio.snare > 0.5) {
            ctx.translate((Math.random()-0.5)*10, (Math.random()-0.5)*10);
        }

        // --- STIL: SPRAY PAINT STENCIL ---
        ctx.lineJoin = 'miter';
        ctx.lineCap = 'butt';

        // 1. DER RAHMEN (Zerbrochenes Quadrat wie LP Logo)
        // Wir zeichnen es "krakelig" (Scribble Style)
        ctx.strokeStyle = `rgba(220, 220, 220, ${0.8 + audio.snare * 0.2})`; // Dirty White
        ctx.lineWidth = 6 + audio.kick * 4;

        // Versatz-Variablen für den "Shattered"-Look
        const offset = audio.kick * 20; 

        ctx.beginPath();
        // Oben Links
        ctx.moveTo(-s - offset, -s + offset); 
        ctx.lineTo(-s/2, -s - offset); 
        // Oben Rechts
        ctx.moveTo(s/2, -s + offset); 
        ctx.lineTo(s + offset, -s - offset); 
        ctx.lineTo(s - offset, -s/2);
        // Unten Rechts
        ctx.moveTo(s + offset, s/2); 
        ctx.lineTo(s - offset, s + offset);
        // Unten Links
        ctx.moveTo(-s + offset, s - offset); 
        ctx.lineTo(-s - offset, s/2);
        ctx.lineTo(-s, -s/2); // Schließt den Kreis fast
        ctx.stroke();

        // 2. DAS SYMBOL (Die "Hybrid-Pfote")
        // Eine Mischung aus Biohazard und Wolfspfote
        
        // Farbe: Aggressives Rot oder Giftgrün (Je nach Zufall/Beat)
        // Hier: "Street Art Red"
        ctx.fillStyle = `rgba(255, 20, 20, ${0.8 + audio.snare})`; 
        ctx.shadowBlur = 20 + audio.kick * 30;
        ctx.shadowColor = "#f00";

        // Ballen (Mitte) - Dreieckig/Scharf
        ctx.beginPath();
        ctx.moveTo(0, s * 0.2);
        ctx.lineTo(s * 0.2, s * 0.5);
        ctx.lineTo(0, s * 0.7); // Spitze unten
        ctx.lineTo(-s * 0.2, s * 0.5);
        ctx.fill();

        // Krallen (3 Stück, wie Kratzer)
        // Links
        ctx.beginPath();
        ctx.moveTo(-s * 0.3, 0);
        ctx.lineTo(-s * 0.6, -s * 0.5); // Lang
        ctx.lineTo(-s * 0.2, -s * 0.2); // Zurück
        ctx.fill();

        // Mitte
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.1);
        ctx.lineTo(0, -s * 0.7 - (audio.kick * 50)); // Wächst mit Kick!
        ctx.lineTo(s * 0.1, -s * 0.2);
        ctx.fill();

        // Rechts
        ctx.beginPath();
        ctx.moveTo(s * 0.3, 0);
        ctx.lineTo(s * 0.6, -s * 0.5);
        ctx.lineTo(s * 0.2, -s * 0.2);
        ctx.fill();

        // 3. GLITCH TEXTURE (Dreck über dem Logo)
        if (audio.snare > 0.4) {
            ctx.fillStyle = "#000"; // Schwarze "Löcher"
            for(let k=0; k<5; k++) {
                const gx = (Math.random()-0.5) * s * 2;
                const gy = (Math.random()-0.5) * s * 2;
                ctx.fillRect(gx, gy, Math.random()*20 + 5, 2); // Horizontale Streifen
            }
        }

        ctx.restore();
    }

    updateAndDrawScratches(ctx, width, height, audio) {
        // Erzeugt weiße, dünne Linien wie auf altem Film
        if (Math.random() > 0.7) {
            this.scratches.push({
                x: Math.random() * width,
                life: 1.0,
                w: Math.random() * 2 + 1
            });
        }

        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        for(let i=this.scratches.length-1; i>=0; i--) {
            let sc = this.scratches[i];
            sc.life -= 0.1;
            if (sc.life <= 0) {
                this.scratches.splice(i,1); continue;
            }
            // Vertikale Kratzer
            ctx.fillRect(sc.x, 0, sc.w, height);
        }
    }

    updateAndDrawFire(ctx, width, height, audio) {
        // Massive Explosion bei Drop
        if (audio.kick > 0.85) {
            for(let i=0; i<15; i++) { // Weniger Partikel, aber größere
                this.fireParticles.push({
                    x: Math.random() * width,
                    y: height + 50,
                    vx: (Math.random()-0.5) * 5,
                    vy: -(Math.random() * 25 + 15),
                    size: Math.random() * 50 + 40, // Riesige Feuerbälle
                    life: 1.0,
                    hue: Math.random() > 0.7 ? 0 : 30 // Rot oder Orange
                });
            }
        }

        ctx.globalCompositeOperation = 'lighter';
        for(let i=this.fireParticles.length-1; i>=0; i--) {
            let p = this.fireParticles[i];
            p.x += p.vx; p.y += p.vy;
            p.size *= 0.94;
            p.life -= 0.04;
            
            if (p.life <= 0) { this.fireParticles.splice(i,1); continue; }

            // Grunge-Feuer: Kern hell, Rand dunkelrot
            let grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            grad.addColorStop(0, `hsla(${p.hue}, 100%, 80%, ${p.life})`);
            grad.addColorStop(0.6, `hsla(0, 100%, 30%, ${p.life * 0.5})`);
            grad.addColorStop(1, "rgba(0,0,0,0)");
            
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    drawBeams(ctx, width, height, audio) {
        // Beams sind hier "Suchscheinwerfer" (Searchlights)
        // Wie bei einem Gefängnisausbruch / Industrial Yard
        const originY = -50;
        
        this.spots.forEach((spot, i) => {
            const x = spot.xRatio * width;
            
            // Bewegung: Unruhig
            if (audio.snare > 0.5) {
                spot.angle = Math.PI/2 + (Math.random()-0.5) * 0.8; // Zittert
                spot.flashTimer = 1.0;
            } else {
                // Langsames Schwenken
                spot.angle += (Math.sin(this.frame * 0.02 + i) * 0.01);
            }

            spot.flashTimer *= 0.9;
            
            // Farbe: Kaltes Blau-Weiß oder Alarm-Rot
            let r = 200 + spot.flashTimer * 55;
            let g = 200 - spot.flashTimer * 200;
            let b = 255 - spot.flashTimer * 255;
            
            // Wenn Snare knallt -> Rot, sonst Blau/Weiß
            let color = `${Math.floor(r)},${Math.floor(g)},${Math.floor(b)}`;

            let alpha = 0.15 + spot.flashTimer * 0.6;
            
            // Zeichnen
            if (alpha > 0.05) {
                const beamLen = height * 1.8;
                const dx = Math.cos(spot.angle);
                const dy = Math.sin(spot.angle);
                
                // Scharfe Kanten (Industrial Look)
                ctx.beginPath();
                ctx.moveTo(x, originY);
                ctx.lineTo(x + dx*beamLen + 50, originY + dy*beamLen);
                ctx.lineTo(x + dx*beamLen - 50, originY + dy*beamLen);
                
                let grad = ctx.createLinearGradient(x, originY, x+dx*height, originY+dy*height);
                grad.addColorStop(0, `rgba(${color}, ${alpha})`);
                grad.addColorStop(1, "rgba(0,0,0,0)");
                
                ctx.fillStyle = grad;
                ctx.fill();
            }
        });
    }
}