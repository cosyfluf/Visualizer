// --- START OF FILE styles/metal.js ---

class MetalShowRenderer {
    constructor() {
        this.frame = 0;
        
        // --- 1. HINTERGRUND EFFEKTE ---
        // Nebel-System
        this.smokeParticles = [];
        for(let i=0; i<15; i++) {
            this.smokeParticles.push({
                x: Math.random(), 
                y: Math.random(),
                size: 0.5 + Math.random(),
                vx: (Math.random()-0.5) * 0.001,
                alpha: Math.random() * 0.2
            });
        }

        // Digital Glitch Fragmente
        this.glitches = [];

        // --- 2. 3D TUNNEL ---
        this.tunnelRings = [];
        for(let i=0; i<12; i++) { // Weniger Ringe, dafür dicker
            this.tunnelRings.push({ z: i * 80, rot: Math.random() });
        }

        // --- 3. HEXAGON HIVE ---
        this.hexagons = [];
        for(let x=0; x<12; x++) {
            for(let y=0; y<8; y++) {
                this.hexagons.push({ 
                    x, y, 
                    active: 0, 
                    decay: Math.random() * 0.05 + 0.02 
                });
            }
        }

        // --- 4. BEAMS ---
        this.spots = [];
        for(let i=0; i<8; i++) {
            this.spots.push({
                xRatio: (i + 0.5) / 8, 
                angle: Math.PI / 2,
                color: '200, 255, 255',
                flash: 0
            });
        }

        // --- 5. CHAOS PARTICLES ---
        this.sparks = [];
        this.fire = [];
        this.shatter = [];

        this.shake = 0;
    }

    analyze(data) {
        if (!data || !data.bars) return { kick: 0, snare: 0, high: 0, raw: [] };
        const b = data.bars;

        // Kick (Bass)
        let rawBass = b.slice(0, 3).reduce((a,b)=>a+b,0) / 300;
        let kick = rawBass > 0.6 ? Math.pow(rawBass, 3) : 0; 

        // Snare (Mitten)
        let rawMid = b.slice(8, 20).reduce((a,b)=>a+b,0) / 1200;
        let snare = rawMid > 0.4 ? Math.pow(rawMid, 2) : 0;

        // High (Cymbals für Blitze)
        let rawHigh = b.slice(30, 50).reduce((a,b)=>a+b,0) / 2000;
        let high = rawHigh > 0.5 ? rawHigh : 0;

        return { kick, snare, high, raw: b };
    }

    draw(ctx, width, height, data) {
        const audio = this.analyze(data);
        this.frame += 1 + audio.kick; 

        // --- SHAKE SETUP ---
        if (audio.kick > 0.8) this.shake = 30 * audio.kick;
        this.shake *= 0.85;

        // Background: Nicht ganz schwarz, sondern tiefes Dunkelgrau für Nebel
        ctx.fillStyle = "#050505";
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        let sx = (Math.random()-0.5) * this.shake;
        let sy = (Math.random()-0.5) * this.shake;
        ctx.translate(sx, sy);

        // --- LAYER 1: ATMOSPHÄRE (Hintergrund) ---
        this.drawSmoke(ctx, width, height, audio);
        this.drawDigitalGlitches(ctx, width, height, audio);

        // --- LAYER 2: STRUKTUR ---
        // Hexagons leuchten stärker bei Bass
        ctx.lineWidth = 1 + audio.kick * 2;
        this.drawHexagons(ctx, width, height, audio);
        
        this.drawTunnel(ctx, width, height, audio);

        // --- LAYER 3: LIGHTSHOW ---
        ctx.globalCompositeOperation = 'lighter';
        this.drawBeams(ctx, width, height, audio);
        
        // Electric Arcs (Blitze im Hintergrund)
        if (audio.high > 0.6) this.drawLightning(ctx, width, height);

        // --- LAYER 4: LOGO & ACTION ---
        this.drawLogo(ctx, width, height, audio);

        this.updateAndDrawSparks(ctx, width, height, audio);
        this.updateAndDrawFire(ctx, width, height, audio);

        if (audio.kick > 0.95) this.triggerShatter(width, height);
        this.drawShatter(ctx);

        ctx.restore();

        // --- LAYER 5: FINISH ---
        // Strobe
        if (audio.kick > 0.9) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.1})`;
            ctx.fillRect(0, 0, width, height);
        }

        // Vignette & Scanlines
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        for(let y=0; y<height; y+=4) ctx.fillRect(0, y, width, 1); // Scanlines

        let grad = ctx.createRadialGradient(width/2, height/2, height*0.2, width/2, height/2, height);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.8)");
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,width,height);
    }

    // ==========================================
    //              NEUE EFFEKTE
    // ==========================================

    drawSmoke(ctx, width, height, audio) {
        // Zeichnet große, langsame Wolken im Hintergrund
        this.smokeParticles.forEach(p => {
            p.x += p.vx;
            // Wrap around
            if(p.x < -0.5) p.x = 1.5;
            if(p.x > 1.5) p.x = -0.5;

            const x = p.x * width;
            const y = p.y * height;
            const r = p.size * (width * 0.4);

            // Pulsieren mit Bass
            const alpha = p.alpha * (1 + audio.kick);

            let grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, `rgba(30, 40, 50, ${alpha})`); // Bläulicher Rauch
            grad.addColorStop(1, "rgba(0,0,0,0)");
            
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
        });
    }

    drawDigitalGlitches(ctx, width, height, audio) {
        // Spawn Random Glitches (Matrix Style)
        if (Math.random() > 0.8) {
            this.glitches.push({
                x: Math.random() * width,
                y: Math.random() * height,
                w: Math.random() * 50 + 10,
                h: Math.random() * 100 + 20,
                life: 1.0,
                color: Math.random() > 0.5 ? "#0ff" : "#fff" // Cyan oder Weiß
            });
        }

        for(let i=this.glitches.length-1; i>=0; i--) {
            let g = this.glitches[i];
            g.life -= 0.1;
            if(g.life <= 0) { this.glitches.splice(i,1); continue; }

            ctx.fillStyle = g.color;
            ctx.globalAlpha = g.life * 0.1; // Sehr transparent
            ctx.fillRect(g.x, g.y, g.w, g.h);
            
            // Text-Effekt simulieren (kleine Striche)
            ctx.fillStyle = "#fff";
            if(Math.random()>0.5) ctx.fillRect(g.x, g.y + Math.random()*g.h, g.w, 2);
        }
        ctx.globalAlpha = 1.0;
    }

    drawLightning(ctx, width, height) {
        // Zufällige Blitze im Hintergrund bei hohen Tönen
        if (Math.random() > 0.7) return;

        ctx.strokeStyle = "rgba(200, 255, 255, 0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        let x = Math.random() * width;
        let y = 0;
        ctx.moveTo(x, y);
        while(y < height) {
            x += (Math.random() - 0.5) * 50;
            y += Math.random() * 50 + 10;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    // ==========================================
    //           BESTEHENDE EFFEKTE
    // ==========================================

    drawHexagons(ctx, width, height, audio) {
        const cols = 12;
        const size = width / cols;
        const h = size * Math.sin(Math.PI/3);

        this.hexagons.forEach(hex => {
            // Trigger
            if (Math.random() > 0.995) hex.active = 1.0;
            if (audio.snare > 0.7 && Math.random() > 0.8) hex.active = 1.0;
            
            hex.active -= hex.decay;
            if (hex.active < 0) hex.active = 0;

            // Zeichnen: Immer sichtbar (dunkel), hell bei active
            const xOff = (hex.y % 2 === 0) ? 0 : size * 0.5;
            const px = hex.x * size + xOff;
            const py = hex.y * h;

            // Basis Grid (Dunkelgrau)
            ctx.strokeStyle = `rgba(50, 50, 60, 0.3)`; 
            
            // Active Grid (Cyan / Weiß)
            if (hex.active > 0.01) {
                ctx.strokeStyle = `rgba(100, 255, 255, ${hex.active})`;
                ctx.fillStyle = `rgba(0, 255, 255, ${hex.active * 0.2})`;
            }

            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = 2 * Math.PI / 6 * i;
                const x_i = px + size/2 + size/2 * Math.cos(angle);
                const y_i = py + size/2 + size/2 * Math.sin(angle);
                if (i === 0) ctx.moveTo(x_i, y_i); else ctx.lineTo(x_i, y_i);
            }
            ctx.closePath();
            if (hex.active > 0.01) ctx.fill();
            ctx.stroke();
        });
    }

    drawTunnel(ctx, width, height, audio) {
        const cx = width / 2;
        const cy = height / 2;
        
        this.tunnelRings.forEach((ring, i) => {
            ring.z -= (8 + audio.kick * 30);
            if (ring.z <= 0) ring.z = 1000;

            const fov = 350;
            const scale = fov / (fov + ring.z);
            const ringSize = Math.max(width, height) * scale;
            const alpha = scale * (0.3 + audio.snare * 0.4);

            ctx.save();
            ctx.translate(cx, cy);
            // Ringe rotieren gegeneinander
            const dir = i%2===0 ? 1 : -1;
            ctx.rotate(ring.rot + this.frame * 0.005 * dir);
            
            // Linkin Park Farben: Rot & Cyan Mix
            ctx.strokeStyle = (i % 3 === 0) 
                ? `rgba(255, 50, 50, ${alpha})` 
                : `rgba(50, 255, 255, ${alpha * 0.6})`;
            
            ctx.lineWidth = 2 * scale;
            ctx.strokeRect(-ringSize/2, -ringSize/2, ringSize, ringSize);
            ctx.restore();
        });
    }

    drawLogo(ctx, width, height, audio) {
        const cx = width / 2;
        const cy = height / 2;
        const s = (Math.min(width, height) * 0.25) * (1 + audio.kick * 0.25);

        ctx.save();
        ctx.translate(cx, cy);
        
        // Glitch Offset
        if (audio.kick > 0.8) {
            ctx.translate((Math.random()-0.5)*15, 0);
            ctx.fillStyle = "rgba(0, 255, 255, 0.4)";
            this.drawClawShape(ctx, s * 1.05); // Ghost
        }

        // Haupt-Logo
        ctx.shadowBlur = 20 + audio.kick * 40;
        ctx.shadowColor = "#f00";
        ctx.fillStyle = "#fff";
        
        this.drawClawShape(ctx, s);

        // Tech-Ring (Pulsiert)
        ctx.strokeStyle = `rgba(255, 0, 0, ${0.3 + audio.snare})`;
        ctx.lineWidth = 2;
        // Unterbrochener Ring
        ctx.beginPath();
        ctx.arc(0, 0, s * 1.4, 0, Math.PI * 1.5);
        ctx.stroke();
        
        // Zweiter Ring dreht sich
        ctx.rotate(this.frame * 0.05);
        ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
        ctx.beginPath(); ctx.arc(0,0, s * 1.2, 0, 1); ctx.stroke();

        ctx.restore();
    }

    drawClawShape(ctx, size) {
        ctx.beginPath();
        // Ballen
        ctx.moveTo(0, size * 0.3);
        ctx.lineTo(size * 0.25, size * 0.6);
        ctx.lineTo(0, size * 0.8);
        ctx.lineTo(-size * 0.25, size * 0.6);
        ctx.fill();
        
        // Krallen
        const clawW = size * 0.15;
        const clawH = size * 0.9;
        // Mitte
        ctx.moveTo(-clawW/2, 0); ctx.lineTo(clawW/2, 0); ctx.lineTo(0, -clawH); ctx.fill();
        // Seiten
        ctx.save(); ctx.rotate(-0.4); 
        ctx.moveTo(-clawW/2, -size*0.2); ctx.lineTo(clawW/2, -size*0.2); ctx.lineTo(0, -clawH*0.9); ctx.fill();
        ctx.restore();
        ctx.save(); ctx.rotate(0.4); 
        ctx.moveTo(-clawW/2, -size*0.2); ctx.lineTo(clawW/2, -size*0.2); ctx.lineTo(0, -clawH*0.9); ctx.fill();
        ctx.restore();
    }

    drawBeams(ctx, width, height, audio) {
        const originY = -50;
        this.spots.forEach((spot, i) => {
            const x = spot.xRatio * width;
            if (audio.kick > 0.8) {
                spot.angle = Math.PI/2 + (Math.random()-0.5) * 1.5;
                spot.flash = 1.0;
                spot.color = '255, 50, 50';
            } else {
                spot.angle += Math.sin(this.frame * 0.03 + i) * 0.02;
                spot.flash *= 0.9;
                spot.color = '0, 255, 255';
            }
            let alpha = 0.05 + spot.flash * 0.5; // Basis-Nebel sichtbar
            if (alpha > 0.02) {
                const len = height * 1.5;
                const dx = Math.cos(spot.angle);
                const dy = Math.sin(spot.angle);
                ctx.beginPath();
                ctx.moveTo(x, originY);
                ctx.lineTo(x + dx*len + 50, originY + dy*len);
                ctx.lineTo(x + dx*len - 50, originY + dy*len);
                let grad = ctx.createLinearGradient(x, originY, x+dx*height, originY+dy*height);
                grad.addColorStop(0, `rgba(${spot.color}, ${alpha})`);
                grad.addColorStop(1, "rgba(0,0,0,0)");
                ctx.fillStyle = grad;
                ctx.fill();
            }
        });
    }

    updateAndDrawSparks(ctx, width, height, audio) {
        if (audio.snare > 0.6) {
            const side = Math.random() > 0.5 ? 0 : width;
            const dir = side === 0 ? 1 : -1;
            for(let i=0; i<8; i++) {
                this.sparks.push({
                    x: side, y: Math.random() * height,
                    vx: dir * (Math.random() * 20 + 5),
                    vy: (Math.random()-0.5) * 10,
                    life: 1.0
                });
            }
        }
        ctx.fillStyle = "#ffaa00";
        for(let i=this.sparks.length-1; i>=0; i--) {
            let s = this.sparks[i];
            s.x += s.vx; s.y += s.vy; s.vy += 0.5; s.life -= 0.05;
            if (s.life <= 0) { this.sparks.splice(i,1); continue; }
            ctx.globalAlpha = s.life;
            ctx.fillRect(s.x, s.y, 5, 2);
        }
        ctx.globalAlpha = 1.0;
    }

    updateAndDrawFire(ctx, width, height, audio) {
        if (audio.kick > 0.85) {
            for(let i=0; i<15; i++) {
                this.fire.push({
                    x: Math.random() * width, y: height + 20,
                    vx: (Math.random()-0.5) * 5, vy: -(Math.random() * 20 + 10),
                    size: Math.random() * 40 + 20, life: 1.0,
                    hue: Math.random() > 0.8 ? 50 : 0
                });
            }
        }
        ctx.globalCompositeOperation = 'lighter';
        for(let i=this.fire.length-1; i>=0; i--) {
            let p = this.fire[i];
            p.x += p.vx; p.y += p.vy; p.size *= 0.95; p.life -= 0.04;
            if (p.life <= 0) { this.fire.splice(i,1); continue; }
            let grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            grad.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${p.life})`);
            grad.addColorStop(1, `rgba(0,0,0,0)`);
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        }
    }

    triggerShatter(width, height) {
        for(let i=0; i<4; i++) {
            this.shatter.push({
                x: Math.random() * width, y: Math.random() * height,
                size: Math.random() * 100 + 50, rot: Math.random() * Math.PI, life: 1.0
            });
        }
    }

    drawShatter(ctx) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.globalCompositeOperation = 'overlay';
        for(let i=this.shatter.length-1; i>=0; i--) {
            let s = this.shatter[i];
            s.life -= 0.1;
            if (s.life <= 0) { this.shatter.splice(i,1); continue; }
            ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
            ctx.beginPath(); ctx.moveTo(0, -s.size); ctx.lineTo(s.size/2, s.size); ctx.lineTo(-s.size/2, s.size);
            ctx.fill(); ctx.restore();
        }
    }
}