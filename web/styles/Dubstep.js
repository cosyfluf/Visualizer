// --- START OF FILE styles/dubstep.js ---

class DubstepShowRenderer {
    constructor() {
        this.frame = 0;
        this.hue = 280; 

        // --- 1. TUNNEL SYSTEM ---
        this.gridZ = 0; 
        
        // --- 2. SATELLITE CUBES (3D Würfel an den Seiten) ---
        this.cubeRot = 0; // Rotation der Würfel

        // --- 3. STARS ---
        this.stars = [];
        for(let i=0; i<80; i++) {
            this.stars.push({
                x: (Math.random() - 0.5) * 3000,
                y: (Math.random() - 0.5) * 3000,
                z: Math.random() * 2000
            });
        }

        // --- 4. RINGS ---
        this.rings = [];
    }

    analyze(data) {
        if (!data || !data.bars) return { bass: 0, mid: 0, high: 0, raw: [] };
        const b = data.bars;

        // Bass: Fokus auf Kick (0-5)
        let bassRaw = b.slice(0, 5).reduce((a,c)=>a+c,0) / 500;
        let bass = bassRaw > 0.6 ? Math.pow(bassRaw, 3) : 0; 

        // Mid: Der "Growl" Bereich (10-30)
        let mid = b.slice(10, 30).reduce((a,c)=>a+c,0) / 2000;

        // High: Hi-Hats (30-50)
        let high = b.slice(30, 50).reduce((a,c)=>a+c,0) / 2000;

        return { bass, mid, high, raw: b };
    }

    draw(ctx, width, height, data) {
        const audio = this.analyze(data);
        this.frame++;
        
        // Langsamer Farbwechsel + Kick-Flash
        this.hue = 270 + Math.sin(this.frame * 0.005) * 30;
        if(audio.bass > 0.8) this.hue += 30;

        // Background
        ctx.fillStyle = "#050010";
        ctx.fillRect(0, 0, width, height);

        // Shake bei Drop
        ctx.save();
        if (audio.bass > 0.7) {
            let s = audio.bass * 20;
            ctx.translate((Math.random()-0.5)*s, (Math.random()-0.5)*s);
        }

        const cx = width / 2;
        const cy = height / 2;

        // 1. Hintergrund-Sterne (Warp)
        this.drawWarpStars(ctx, cx, cy, width, height, audio);

        // 2. Tunnel Grid (Boden & Decke)
        this.drawTunnelGrid(ctx, cx, cy, width, height, audio);

        // 3. Side-EQs (Die Füller an den Rändern)
        this.drawSideEQ(ctx, width, height, audio);

        // 4. Schwebende Würfel (Links/Rechts)
        this.drawSideCubes(ctx, width, height, audio);

        // 5. Center Core & Ringe
        this.drawCore(ctx, cx, cy, audio);
        if (audio.bass > 0.85) this.rings.push({ z: 0, opacity: 1.0 });
        this.drawRings(ctx, cx, cy);

        // 6. Blitze (Überlagerung)
        if (audio.high > 0.6) this.drawLightning(ctx, width, height);

        ctx.restore();

        // Vignette
        let grad = ctx.createRadialGradient(cx, cy, height*0.4, cx, cy, height);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(1, "rgba(0,0,0,0.7)");
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,width,height);
    }

    // ==========================================
    //           NEUE SEITEN-EFFEKTE
    // ==========================================

    drawSideEQ(ctx, w, h, audio) {
        // Zeichnet massive Balken links und rechts, die zur Mitte drücken
        const barCount = 10;
        const barH = h / barCount;
        
        ctx.fillStyle = `hsla(${this.hue}, 100%, 50%, 0.3)`;
        ctx.shadowBlur = 20;
        ctx.shadowColor = `hsla(${this.hue}, 100%, 50%, 0.8)`;

        // Wir nutzen die Rohdaten für Variation
        const raw = audio.raw || [];

        for(let i=0; i<barCount; i++) {
            // Datenwert holen (gemappt auf 0-1)
            let val = (raw[i*2] || 0) / 255; 
            
            // Breite basierend auf Lautstärke + Bass Boost
            let barW = (w * 0.1) + (val * w * 0.15) * (1 + audio.bass);

            let y = i * barH;
            
            // Linke Seite
            ctx.fillRect(0, y + 5, barW, barH - 10);
            
            // Rechte Seite
            ctx.fillRect(w - barW, y + 5, barW, barH - 10);

            // Helle Kante zur Mitte hin
            ctx.fillStyle = "#fff";
            ctx.fillRect(barW - 2, y + 5, 2, barH - 10); // Links Kante
            ctx.fillRect(w - barW, y + 5, 2, barH - 10); // Rechts Kante
            
            // Farbe zurücksetzen für den Füllbereich
            ctx.fillStyle = `hsla(${this.hue}, 100%, 50%, 0.4)`;
        }
        ctx.shadowBlur = 0;
    }

    drawSideCubes(ctx, w, h, audio) {
        // Rotation erhöhen bei Highs/Snare
        this.cubeRot += 0.01 + audio.high * 0.1;

        // Positionen der Würfel (Links und Rechts der Mitte schwebend)
        const size = 60 + audio.bass * 20;
        const yPos = h / 2;
        const xOffset = w * 0.25; // Viertel vom Rand weg

        ctx.strokeStyle = "#0ff"; // Cyan Neon
        ctx.lineWidth = 2;

        // Linker Würfel
        this.drawWireframeCube(ctx, w * 0.15, yPos, size, this.cubeRot);
        
        // Rechter Würfel
        this.drawWireframeCube(ctx, w * 0.85, yPos, size, -this.cubeRot);
    }

    drawWireframeCube(ctx, cx, cy, size, rot) {
        // Simpler 3D Würfel Projektion
        const vertices = [
            [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], // Front
            [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]      // Back
        ];

        const edges = [
            [0,1], [1,2], [2,3], [3,0], // Front Face
            [4,5], [5,6], [6,7], [7,4], // Back Face
            [0,4], [1,5], [2,6], [3,7]  // Connecting Lines
        ];

        ctx.beginPath();
        // Rotation Matrix (Y-Achse & X-Achse gemischt)
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);

        const project = (v) => {
            let x = v[0] * size;
            let y = v[1] * size;
            let z = v[2] * size;

            // Rotation Y
            let x2 = x * cos - z * sin;
            let z2 = x * sin + z * cos;
            
            // Rotation X (leicht gekippt)
            let y2 = y * Math.cos(0.5) - z2 * Math.sin(0.5);

            return [cx + x2, cy + y2];
        };

        const projectedVerts = vertices.map(project);

        edges.forEach(edge => {
            const p1 = projectedVerts[edge[0]];
            const p2 = projectedVerts[edge[1]];
            ctx.moveTo(p1[0], p1[1]);
            ctx.lineTo(p2[0], p2[1]);
        });
        ctx.stroke();
    }

    // ==========================================
    //           CORE SYSTEM
    // ==========================================

    drawWarpStars(ctx, cx, cy, w, h, audio) {
        let speed = 20 + audio.bass * 150;
        ctx.fillStyle = "#fff";
        this.stars.forEach(s => {
            s.z -= speed;
            if(s.z <= 1) { s.z = 2000; s.x = (Math.random()-0.5)*3000; s.y = (Math.random()-0.5)*3000; }
            
            let k = 400 / s.z;
            let px = cx + s.x * k;
            let py = cy + s.y * k;
            
            if(px>0 && px<w && py>0 && py<h) {
                let size = (1 - s.z/2000)*3;
                if(audio.bass > 0.6) {
                    // Warp Linien bei Bass
                    ctx.beginPath(); ctx.strokeStyle = `rgba(255,255,255,0.5)`;
                    ctx.moveTo(px,py); 
                    ctx.lineTo(px + (px-cx)*0.05, py + (py-cy)*0.05); 
                    ctx.stroke();
                } else {
                    ctx.fillRect(px, py, size, size);
                }
            }
        });
    }

    drawTunnelGrid(ctx, cx, cy, width, height, audio) {
        this.gridZ -= (10 + audio.bass * 80);
        if(this.gridZ < 0) this.gridZ += 200;

        ctx.strokeStyle = `hsla(${this.hue}, 100%, 50%, 0.3)`;
        ctx.lineWidth = 1;
        
        // Vertikale Linien (Perspektive)
        ctx.beginPath();
        for(let i=-8; i<=8; i++) {
             if(i===0) continue;
             let xOff = i * 300;
             // Zeichne Linie vom Fluchtpunkt nach außen
             ctx.moveTo(cx, cy);
             ctx.lineTo(cx + xOff * 4, cy + 300 * 4); // Boden
             ctx.moveTo(cx, cy);
             ctx.lineTo(cx + xOff * 4, cy - 300 * 4); // Decke
        }
        ctx.stroke();

        // Horizontale Linien (Bewegung)
        for(let i=0; i<15; i++) {
            let z = (this.gridZ + i * 200); 
            let k = 400 / z;
            let alpha = z / 3000;
            if(k > 10 || k < 0) continue;

            ctx.strokeStyle = `hsla(${this.hue}, 100%, 60%, ${1-alpha})`;
            let yFloor = cy + 300 * k;
            let yCeil = cy - 300 * k;
            let wLine = width * 3 * k;

            ctx.beginPath();
            ctx.moveTo(cx - wLine, yFloor); ctx.lineTo(cx + wLine, yFloor);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(cx - wLine, yCeil); ctx.lineTo(cx + wLine, yCeil);
            ctx.stroke();
        }
    }

    drawCore(ctx, cx, cy, audio) {
        const r = 40 + audio.bass * 30;
        
        // Glow
        let g = ctx.createRadialGradient(cx,cy, r, cx,cy, r*4);
        g.addColorStop(0, `hsla(${this.hue}, 100%, 50%, 0.6)`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, r*4, 0, Math.PI*2); ctx.fill();

        // Hexagon Core
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 4;
        ctx.beginPath();
        for(let i=0; i<6; i++) {
            let a = i * Math.PI/3 + this.frame*0.02;
            let x = cx + Math.cos(a)*r;
            let y = cy + Math.sin(a)*r;
            if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.closePath();
        ctx.stroke();

        // Innenleben
        if(audio.mid > 0.3) {
            ctx.fillStyle = "#fff";
            ctx.beginPath(); ctx.arc(cx, cy, r*0.5, 0, Math.PI*2); ctx.fill();
        }
    }

    drawRings(ctx, cx, cy) {
        ctx.lineWidth = 3;
        for(let i=this.rings.length-1; i>=0; i--) {
            let r = this.rings[i];
            r.z += 25;
            r.opacity -= 0.03;
            if(r.opacity<=0) { this.rings.splice(i,1); continue; }
            
            let k = 500 / (1000 - r.z);
            if(k<0) continue;

            ctx.strokeStyle = `rgba(255,255,255,${r.opacity})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 100*k, 0, Math.PI*2);
            ctx.stroke();
        }
    }

    drawLightning(ctx, w, h) {
        ctx.strokeStyle = `rgba(200, 255, 255, 0.5)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(Math.random()*w, 0);
        ctx.lineTo(Math.random()*w, h);
        ctx.stroke();
    }
}