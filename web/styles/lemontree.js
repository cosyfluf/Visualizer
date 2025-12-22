// --- START OF FILE styles/lemon.js ---

class LemonTreeRenderer {
    constructor() {
        this.frame = 0;
        
        // --- 1. ZITRONEN PHYSIK ---
        this.lemons = []; // Die gefallenen Zitronen
        
        // --- 2. WOLKEN ---
        this.clouds = [];
        for(let i=0; i<5; i++) {
            this.clouds.push({ x: Math.random()*800, y: Math.random()*150, speed: 0.2 + Math.random()*0.5 });
        }

        // --- 3. AUTO (Driving around in my car) ---
        this.carX = -100;
        this.carDir = 1;

        // --- 4. BAUM ZUSTAND ---
        this.treeSway = 0;
    }

    analyze(data) {
        if (!data || !data.bars) return { kick: 0, snare: 0, mid: 0 };
        const b = data.bars;

        // Kick: Lässt Zitronen fallen
        let kickRaw = b.slice(0, 5).reduce((a,c)=>a+c,0) / 500;
        let kick = kickRaw > 0.5 ? Math.pow(kickRaw, 2) : 0;

        // Snare: Lässt den Baum wackeln
        let snare = b.slice(10, 30).reduce((a,c)=>a+c,0) / 2000;

        // Mitten: "Singende" Zitronen
        let mid = b.slice(20, 40).reduce((a,c)=>a+c,0) / 2000;

        return { kick, snare, mid };
    }

    draw(ctx, width, height, data) {
        const audio = this.analyze(data);
        this.frame++;

        // --- 1. HIMMEL (Blue Blue Sky) ---
        // Farbe ändert sich leicht mit der Stimmung (Audio)
        let blue = 230 + audio.kick * 25; 
        ctx.fillStyle = `rgb(${100 - audio.kick*50}, ${200 - audio.kick*20}, ${Math.min(255, blue)})`;
        ctx.fillRect(0, 0, width, height);

        // Sonne (oben rechts) - Pulsiert
        this.drawSun(ctx, width, audio);

        // Wolken (ziehen vorbei)
        this.drawClouds(ctx, width);

        // --- 2. HINTERGRUND LANDSCHAFT ---
        // Hügel
        ctx.fillStyle = "#6dc066"; // Helles Grasgrün
        ctx.beginPath();
        ctx.ellipse(width/2, height, width*0.8, height*0.4, 0, 0, Math.PI*2);
        ctx.fill();

        // Straße (für das Auto)
        ctx.fillStyle = "#888";
        ctx.fillRect(0, height - 80, width, 40);
        // Mittelstreifen
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.setLineDash([20, 20]);
        ctx.beginPath(); ctx.moveTo(0, height - 60); ctx.lineTo(width, height - 60); ctx.stroke();
        ctx.setLineDash([]);

        // --- 3. DAS AUTO (Driving too fast / driving too slow) ---
        this.drawCar(ctx, width, height, audio);

        // --- 4. DER LEMON TREE ---
        // Der Baum steht vorne mittig
        this.drawTree(ctx, width/2, height - 40, audio);

        // --- 5. FALLENDE ZITRONEN ---
        // Bei Kick spawnen neue Zitronen aus der Baumkrone
        if (audio.kick > 0.8 && this.frame % 5 === 0) {
            this.spawnLemon(width/2, height/2 - 50); // Startpunkt in der Krone
        }
        this.updateAndDrawLemons(ctx, height - 20, audio); // Bodenhöhe
    }

    drawSun(ctx, w, audio) {
        const r = 40 + audio.mid * 20;
        ctx.fillStyle = "#ffdd00";
        ctx.shadowBlur = 20 + audio.kick * 40;
        ctx.shadowColor = "orange";
        ctx.beginPath();
        ctx.arc(w - 80, 80, r, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Sonnenbrille auf der Sonne (Joke)
        if (audio.kick > 0.4) {
            ctx.fillStyle = "#000";
            ctx.fillRect(w - 100, 70, 20, 10);
            ctx.fillRect(w - 75, 70, 20, 10);
            ctx.lineWidth = 2; ctx.strokeStyle = "#000";
            ctx.beginPath(); ctx.moveTo(w-80, 75); ctx.lineTo(w-75, 75); ctx.stroke();
        }
    }

    drawClouds(ctx, w) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        this.clouds.forEach(c => {
            c.x += c.speed;
            if (c.x > w + 100) c.x = -100;
            
            // Comic Wolke: 3 Kreise
            ctx.beginPath();
            ctx.arc(c.x, c.y, 30, 0, Math.PI*2);
            ctx.arc(c.x+25, c.y-10, 35, 0, Math.PI*2);
            ctx.arc(c.x+50, c.y, 30, 0, Math.PI*2);
            ctx.fill();
        });
    }

    drawCar(ctx, w, h, audio) {
        // Bewegt sich schneller wenn Bass da ist
        let speed = 2 + audio.kick * 10;
        this.carX += speed * this.carDir;

        // Wenden am Rand
        if (this.carX > w + 100) { this.carDir = -1; this.carX = w + 100; }
        if (this.carX < -100) { this.carDir = 1; this.carX = -100; }

        const y = h - 75;
        
        ctx.save();
        ctx.translate(this.carX, y);
        if (this.carDir === -1) ctx.scale(-1, 1); // Spiegeln wenn zurück fahren

        // Auto Körper (Rotes Kastenauto)
        ctx.fillStyle = "#d00";
        ctx.fillRect(-30, -15, 60, 20); // Unten
        ctx.fillRect(-15, -30, 30, 15); // Oben (Kabine)

        // Räder (Hüpfen bei Bass)
        let bounce = audio.kick * 5;
        ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.arc(-20, 5 - bounce, 8, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(20, 5 - bounce, 8, 0, Math.PI*2); ctx.fill();

        ctx.restore();
    }

    drawTree(ctx, x, y, audio) {
        // Stamm (Wackelt zur Musik)
        const trunkH = 200;
        const sway = Math.sin(this.frame * 0.05) * 10 + (Math.sin(this.frame * 0.2) * audio.kick * 20);
        
        ctx.save();
        ctx.translate(x, y);

        // Stamm zeichnen (Braun)
        ctx.strokeStyle = "#8B4513";
        ctx.lineWidth = 25;
        ctx.lineCap = "round";
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        // Quadratische Kurve für Biegen
        ctx.quadraticCurveTo(sway, -trunkH / 2, sway * 1.5, -trunkH);
        ctx.stroke();

        // Krone (Das Blattwerk)
        ctx.translate(sway * 1.5, -trunkH);
        
        // Pulsiert mit Bass
        const crownScale = 1 + audio.kick * 0.2;
        ctx.scale(crownScale, crownScale);

        // Großes grünes Büschel
        ctx.fillStyle = "#228B22";
        ctx.beginPath();
        ctx.arc(0, -20, 80, 0, Math.PI*2); // Mitte
        ctx.arc(-60, 10, 50, 0, Math.PI*2); // Links
        ctx.arc(60, 10, 50, 0, Math.PI*2); // Rechts
        ctx.arc(0, -80, 60, 0, Math.PI*2); // Oben
        ctx.fill();

        // Fest hängende Zitronen (die noch nicht gefallen sind)
        this.drawHangingLemon(ctx, -30, -20, audio);
        this.drawHangingLemon(ctx, 40, -40, audio);
        this.drawHangingLemon(ctx, 0, -80, audio);

        ctx.restore();
    }

    drawHangingLemon(ctx, x, y, audio) {
        // Zitronen am Baum wackeln
        let shakeX = (Math.random()-0.5) * audio.snare * 10;
        let shakeY = (Math.random()-0.5) * audio.snare * 10;
        
        ctx.fillStyle = "#FFD700"; // Goldgelb
        ctx.beginPath();
        // Zitrone ist eine Ellipse
        ctx.ellipse(x + shakeX, y + shakeY, 15, 20, 0, 0, Math.PI*2);
        ctx.fill();
        
        // Stiel
        ctx.strokeStyle = "#0f0";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x+shakeX, y+shakeY-20); ctx.lineTo(x, y-25); ctx.stroke();
    }

    spawnLemon(x, y) {
        // Zufällige Richtung beim Fallen
        this.lemons.push({
            x: x + (Math.random()-0.5)*100,
            y: y,
            vx: (Math.random()-0.5) * 5,
            vy: -5, // Erst kurz hochhüpfen
            rot: Math.random(),
            vRot: (Math.random()-0.5) * 0.2
        });
        
        // Performance: Nicht zu viele Zitronen
        if(this.lemons.length > 20) this.lemons.shift();
    }

    updateAndDrawLemons(ctx, floorY, audio) {
        for(let i=this.lemons.length-1; i>=0; i--) {
            let l = this.lemons[i];
            
            // Physik
            l.vy += 0.5; // Schwerkraft
            l.x += l.vx;
            l.y += l.vy;
            l.rot += l.vRot;

            // Bodenkollision
            if (l.y > floorY) {
                l.y = floorY;
                l.vy *= -0.7; // Bounciness
                l.vx *= 0.95; // Reibung
                
                // Wenn sie fast still liegen, rollen sie weg oder verschwinden
                if(Math.abs(l.vy) < 1 && Math.abs(l.vx) < 0.1) {
                    l.vx = (l.x > ctx.canvas.width/2) ? 2 : -2; // Rollen weg
                }
            }

            // Zeichnen
            ctx.save();
            ctx.translate(l.x, l.y);
            ctx.rotate(l.rot);

            // Zitrone Körper
            ctx.fillStyle = "#ffff00"; // Hellgelb
            ctx.strokeStyle = "#daa520";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, 20, 25, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();

            // --- DAS GESICHT (JOKE) ---
            // Wenn Musik laut ist, Mund offen "Singing"
            // Wenn Musik leise, Mund neutral
            
            // Augen (Googly Eyes)
            ctx.fillStyle = "#fff";
            ctx.beginPath(); ctx.arc(-8, -5, 6, 0, Math.PI*2); ctx.fill(); // Links
            ctx.beginPath(); ctx.arc(8, -5, 6, 0, Math.PI*2); ctx.fill(); // Rechts
            
            // Pupillen (Wackeln)
            let px = (Math.random()-0.5)*2;
            let py = (Math.random()-0.5)*2;
            ctx.fillStyle = "#000";
            ctx.beginPath(); ctx.arc(-8+px, -5+py, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(8+px, -5+py, 2, 0, Math.PI*2); ctx.fill();

            // Mund
            ctx.fillStyle = "#000";
            ctx.beginPath();
            if (audio.mid > 0.3) {
                // Mund offen (O)
                ctx.arc(0, 10, 5 + audio.mid * 5, 0, Math.PI*2);
            } else {
                // Lächeln
                ctx.arc(0, 8, 8, 0, Math.PI, false);
            }
            ctx.fill();

            ctx.restore();

            // Aufräumen wenn aus dem Bild
            if (l.x < -50 || l.x > ctx.canvas.width + 50) {
                this.lemons.splice(i, 1);
            }
        }
    }
}