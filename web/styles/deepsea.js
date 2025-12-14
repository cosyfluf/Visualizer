// --- START OF FILE styles/deepsea.js ---

class DeepSeaRenderer {
    constructor() {
        this.frame = 0;
        
        // --- 1. PARTIKEL (Bubbles & Plankton) ---
        this.particles = [];
        for(let i=0; i<60; i++) this.particles.push(this.createParticle());

        // --- 2. TENTAKEL SYSTEM ---
        this.tentacles = [];
        const numTentacles = 12;
        for(let i=0; i<numTentacles; i++) {
            this.tentacles.push({
                offset: i * (Math.PI * 2 / numTentacles),
                length: 150 + Math.random() * 100,
                nodes: Array(20).fill({x:0, y:0})
            });
        }

        // --- 3. NEUE FEATURES ---
        
        // Fisch-Schwarm
        this.fish = [];
        for(let i=0; i<30; i++) {
            this.fish.push({
                x: Math.random() * 2000, 
                y: Math.random() * 500 + 100,
                speed: 1 + Math.random() * 2,
                size: 2 + Math.random() * 4,
                hue: Math.random() > 0.5 ? 180 : 300 // Cyan oder Pink
            });
        }

        // Boden-Offset für Parallax-Effekt
        this.floorOffset = 0;
        
        // Druckwellen
        this.shockwaves = [];
    }

    createParticle() {
        return {
            x: Math.random(), 
            y: Math.random(),
            size: Math.random() * 3 + 1,
            speed: Math.random() * 0.5 + 0.2,
            type: Math.random() > 0.8 ? 'bubble' : 'plankton',
            alpha: Math.random()
        };
    }

    analyze(data) {
        if (!data || !data.bars) return { bass: 0, mid: 0, high: 0 };
        const b = data.bars;
        // Bass: Starker Fokus auf Kick für Shockwaves
        let bass = b.slice(0, 5).reduce((a,c)=>a+c,0) / 500;
        let kick = bass > 0.6 ? Math.pow(bass, 3) : 0;
        
        let mid = b.slice(10, 30).reduce((a,c)=>a+c,0) / 2000;
        let high = b.slice(30, 50).reduce((a,c)=>a+c,0) / 2000;
        return { bass: kick, mid, high };
    }

    draw(ctx, width, height, data) {
        const audio = this.analyze(data);
        this.frame++;

        // --- 1. BACKGROUND ---
        let grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, "#000010"); 
        grad.addColorStop(0.5, "#000820");
        grad.addColorStop(1, "#000005"); 
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height * 0.4;

        // --- 2. HINTERGRUND EFFEKTE ---
        this.drawGodRays(ctx, width, height, audio);
        
        // Fische (Hinter der Qualle)
        this.updateAndDrawFish(ctx, width, height, audio);

        // Meeresboden (Hintere Ebene)
        this.drawSeabed(ctx, width, height, audio, 0.5, "#000a30", 0);

        // Partikel (Plankton)
        this.updateAndDrawParticles(ctx, width, height, audio, false); 

        // --- 3. THE JELLYFISH ---
        ctx.save();
        const floatY = Math.sin(this.frame * 0.02) * 20;
        
        // Shockwave bei Basskick
        if (audio.bass > 0.8) {
             // Bild wackelt leicht
             ctx.translate((Math.random()-0.5)*10, (Math.random()-0.5)*10);
             this.shockwaves.push({ r: 50, alpha: 0.8 });
        }
        ctx.translate(cx, cy + floatY);

        const hue = 190 + Math.sin(this.frame * 0.01) * 40; 
        const glowSize = 30 + audio.bass * 60;
        ctx.shadowBlur = glowSize;
        ctx.shadowColor = `hsla(${hue}, 100%, 70%, 0.6)`;

        this.drawTentacles(ctx, audio, hue);
        this.drawBody(ctx, audio, hue);
        ctx.restore();

        // --- 4. VORDERGRUND EFFEKTE ---
        // Shockwaves zeichnen
        this.drawShockwaves(ctx, cx, cy + floatY);

        // Meeresboden (Vordere Ebene mit Pflanzen)
        this.drawSeabed(ctx, width, height, audio, 1.0, "#000000", 1);

        // Partikel (Bubbles)
        this.updateAndDrawParticles(ctx, width, height, audio, true); 
    }

    // ======================================
    //           NEUE FUNKTIONEN
    // ======================================

    updateAndDrawFish(ctx, w, h, audio) {
        // Fische schwimmen im Hintergrund
        for(let f of this.fish) {
            // Bewegung nach Links
            let currentSpeed = f.speed;
            
            // Wenn Bass kickt, schwimmen sie schneller weg (Fluchtinstinkt)
            if (audio.bass > 0.5) {
                currentSpeed *= 4;
                f.y += (Math.random()-0.5) * 10; // Panisches Zittern
            }

            f.x -= currentSpeed;

            // Wrap Around
            if (f.x < -50) {
                f.x = w + 50 + Math.random() * 200;
                f.y = Math.random() * h * 0.8;
            }

            // Zeichnen
            ctx.fillStyle = `hsla(${f.hue}, 100%, 70%, 0.6)`;
            ctx.shadowBlur = 5;
            ctx.shadowColor = ctx.fillStyle;
            
            // Fisch Form (Einfacher Tropfen)
            ctx.beginPath();
            ctx.ellipse(f.x, f.y, f.size * 3, f.size, 0, 0, Math.PI*2);
            ctx.fill();
            
            // Schwanzflosse wackelt
            const tailWag = Math.sin(this.frame * 0.5) * 5;
            ctx.beginPath();
            ctx.moveTo(f.x + f.size * 3, f.y);
            ctx.lineTo(f.x + f.size * 5, f.y - 3 + tailWag);
            ctx.lineTo(f.x + f.size * 5, f.y + 3 + tailWag);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    drawSeabed(ctx, w, h, audio, speedMult, color, layerIndex) {
        // Parallax Bewegung
        this.floorOffset += 1 * speedMult + (audio.bass * 2);
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, h);

        const nodeCount = 20;
        const step = w / nodeCount;

        // Felsenlandschaft generieren mit Sinuswellen
        for (let i = 0; i <= nodeCount + 1; i++) {
            const x = i * step;
            // Wir nutzen floorOffset für die x-Verschiebung der Welle
            const noise = Math.sin((x + this.floorOffset) * 0.01) * 50 
                        + Math.sin((x + this.floorOffset * 0.5) * 0.03) * 30;
            
            let y = h - 50 - (layerIndex * 50) + noise;
            ctx.lineTo(x, y);

            // Nur auf der vorderen Ebene (layerIndex 1) Pflanzen zeichnen
            if (layerIndex === 1 && i % 3 === 0) {
                this.drawSeaPlant(ctx, x, y, audio);
            }
        }

        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
    }

    drawSeaPlant(ctx, x, y, audio) {
        // Leuchtende Pflanzen auf den Felsen
        // Wir müssen hier "zwischenspeichern", sonst verbinden sich die Pfade mit dem Boden
        ctx.save();
        
        // Wiegen im Strom
        const sway = Math.sin(this.frame * 0.03 + x) * 20 + (audio.mid * 20);
        
        ctx.strokeStyle = `hsla(${160 + audio.bass*50}, 80%, 50%, 0.5)`;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";

        // Gras-Büschel
        for(let k=0; k<3; k++) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            // Bezier Kurve nach oben
            ctx.quadraticCurveTo(x + sway, y - 50, x + sway + (k-1)*15, y - 80 - Math.random()*20);
            ctx.stroke();
            
            // Leuchtender Punkt oben drauf
            ctx.fillStyle = "#fff";
            ctx.beginPath(); 
            // Endpunkt berechnen (vereinfacht)
            ctx.arc(x + sway + (k-1)*15, y - 80, 2, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();
        // Farbe zurücksetzen für den Boden
        ctx.fillStyle = "#000000"; 
    }

    drawShockwaves(ctx, cx, cy) {
        ctx.lineWidth = 2;
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            let sw = this.shockwaves[i];
            sw.r += 10;
            sw.alpha -= 0.02;

            if (sw.alpha <= 0) {
                this.shockwaves.splice(i, 1);
                continue;
            }

            // Verzerrungs-Ring (Weiß/Cyan)
            ctx.strokeStyle = `rgba(150, 255, 255, ${sw.alpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(cx, cy, sw.r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // ======================================
    //           BESTEHENDE FUNKTIONEN
    // ======================================

    drawGodRays(ctx, w, h, audio) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        const numRays = 6;
        for(let i=0; i<numRays; i++) {
            const angle = Math.sin(this.frame * 0.01 + i) * 0.15;
            const alpha = 0.05 + audio.high * 0.1;
            ctx.save();
            ctx.translate(w/2, -50);
            ctx.rotate(angle);
            let g = ctx.createLinearGradient(0,0,0,h);
            g.addColorStop(0, `rgba(200,255,255,${alpha})`);
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.moveTo(-20,0); ctx.lineTo(20,0); ctx.lineTo(100+i*30, h); ctx.lineTo(-100-i*30, h); ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }

    drawBody(ctx, audio, hue) {
        const r = 60 + audio.bass * 25;
        // Inner Glow
        ctx.fillStyle = `hsla(${hue}, 80%, 40%, 0.8)`;
        ctx.beginPath(); ctx.arc(0, 10, r * 0.5, 0, Math.PI*2); ctx.fill();
        // Outer Shell
        let g = ctx.createRadialGradient(0,0,r*0.3, 0,0,r);
        g.addColorStop(0, `hsla(${hue}, 100%, 90%, 0.1)`);
        g.addColorStop(1, `hsla(${hue}, 100%, 70%, 0.5)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-r, 20);
        ctx.bezierCurveTo(-r, -r*1.4, r, -r*1.4, r, 20);
        // Wavy bottom
        for(let i=r; i>=-r; i-=5) ctx.lineTo(i, 20 + Math.sin(i*0.3+this.frame*0.2)*5);
        ctx.fill();
    }

    drawTentacles(ctx, audio, hue) {
        ctx.lineCap = "round";
        this.tentacles.forEach((t, idx) => {
            const startX = Math.cos(t.offset) * 30;
            const startY = 20;
            ctx.beginPath(); ctx.moveTo(startX, startY);
            
            let stroke = ctx.createLinearGradient(0,0,0,t.length);
            stroke.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.3)`);
            stroke.addColorStop(1, `hsla(${hue}, 100%, 90%, 0.9)`);
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 3;

            let px = startX, py = startY;
            for(let i=0; i<t.nodes.length; i++) {
                let f = i/t.nodes.length;
                let wave = Math.sin(this.frame*0.05 + f*6 + idx) * (f*35);
                let react = Math.sin(this.frame + i) * (audio.mid * 20 * f);
                let tx = startX + wave + react;
                let ty = startY + i * (t.length/t.nodes.length);
                let mx = (px + tx)/2, my = (py + ty)/2;
                ctx.quadraticCurveTo(px, py, mx, my);
                px = tx; py = ty;
            }
            ctx.lineTo(px, py); ctx.stroke();
        });
    }

    updateAndDrawParticles(ctx, w, h, audio, front) {
        this.particles.forEach(p => {
            if ((front && p.type==='bubble') || (!front && p.type==='plankton')) {
                if(p.type==='bubble') {
                    p.y -= p.speed * (1 + audio.high*3);
                    p.x += Math.sin(this.frame*0.1 + p.y)*0.5;
                } else {
                    p.x += Math.cos(this.frame*0.01)*0.2;
                    p.y += Math.sin(this.frame*0.01)*0.2;
                }
                if(p.y < -10) { p.y = 1.1; p.x = Math.random(); }
                
                let x = p.x * w, y = p.y * h;
                ctx.fillStyle = p.type==='bubble' ? `rgba(255,255,255,0.4)` : `rgba(100,255,200,${p.alpha})`;
                ctx.beginPath(); ctx.arc(x,y,p.size*(1+audio.bass*0.5),0,Math.PI*2); ctx.fill();
            }
        });
    }
}