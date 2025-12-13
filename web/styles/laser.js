// --- START OF FILE styles/laser.js ---

class LaserShowRenderer {
    constructor() {
        this.frame = 0;
        this.beatTimer = 0;
        this.sceneTimer = 0;
        
        // Zustandsautomat für die "Show"
        // Szenen: 0=Idle/Sweep, 1=Tunnel/Focus, 2=Chaos/Strobe, 3=Rain/Particles
        this.currentScene = 0;
        this.sceneDuration = 400; // Frames pro Szene

        // --- FIXTURES (Die Lampen) ---
        
        // 1. Moving Heads (Boden)
        this.heads = [];
        for(let i = 0; i < 8; i++) {
            this.heads.push({
                xParam: i, // Position im Array
                angle: -Math.PI / 2,
                targetAngle: -Math.PI / 2,
                color: 0,
                active: true
            });
        }

        // 2. Ceiling Lasers (Decke)
        this.lasers = [];
        for(let i = 0; i < 12; i++) {
            this.lasers.push({
                xParam: i,
                angle: Math.PI / 2,
                active: false
            });
        }

        // 3. Blinder Matrix (Hintergrundwand)
        this.blinders = [];
        for(let y=0; y<4; y++) {
            for(let x=0; x<6; x++) {
                this.blinders.push({ x, y, intensity: 0, decay: 0.1 });
            }
        }

        // 4. Partikel (Sparks, Smoke)
        this.particles = [];
        this.shockwaves = [];
    }

    // Hilfsfunktion: Helligkeit basierend auf Audio berechnen
    getAudioData(data) {
        if (!data || !data.bars) return { bass: 0, mid: 0, treble: 0, raw: [] };
        
        const raw = data.bars;
        // Bass (0-5), Mid (10-25), Treble (30-50)
        let bass = raw.slice(0, 5).reduce((a,b)=>a+b,0) / 500; // 0.0 - 1.0
        let mid = raw.slice(6, 20).reduce((a,b)=>a+b,0) / 1400;
        let treble = raw.slice(25, 50).reduce((a,b)=>a+b,0) / 2500;

        // Exponential curve für mehr "Punch"
        bass = Math.pow(bass, 1.5) * 2.0; 
        
        return { bass, mid, treble, raw };
    }

    draw(ctx, width, height, data) {
        const audio = this.getAudioData(data);
        const t = this.frame * 0.05;

        // --- LOGIK & SHOW STEUERUNG ---
        this.frame++;
        this.sceneTimer++;

        // Beat Detection (Simpel)
        let isBeat = false;
        if (audio.bass > 0.6 && this.beatTimer <= 0) {
            isBeat = true;
            this.beatTimer = 10; // Cooldown
        } else {
            this.beatTimer--;
        }

        // Szenenwechsel (Automatisch oder bei Drop)
        if (this.sceneTimer > this.sceneDuration) {
            this.sceneTimer = 0;
            // Zyklus: 0 -> 1 -> 2 (Drop) -> 3 -> 0
            this.currentScene = (this.currentScene + 1) % 4;
            
            // Zufällige Szenenlänge für Abwechslung
            this.sceneDuration = 200 + Math.random() * 300;
        }

        // Override: Wenn Bass extrem ist, erzwinge Chaos-Szene (Drop)
        if (audio.bass > 1.2 && this.currentScene !== 2) {
           // Optional: Sofort in den Drop-Modus springen
        }

        // --- RENDERING START ---
        
        // 1. Screen Shake bei Bass
        ctx.save();
        if (audio.bass > 0.8) {
            const shake = (audio.bass - 0.8) * 15;
            const dx = (Math.random() - 0.5) * shake;
            const dy = (Math.random() - 0.5) * shake;
            ctx.translate(dx, dy);
        }

        // Clear mit Fade-Effekt (Motion Blur)
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)"; // Nicht ganz schwarz -> Spuren
        ctx.fillRect(-20, -20, width+40, height+40);

        // Additive Farbmischung für "Licht"-Look aktivieren
        ctx.globalCompositeOperation = 'lighter';

        // --- BACKGROUND BLINDERS (LED WALL) ---
        this.drawBlinders(ctx, width, height, audio, isBeat);

        // --- MOVING HEADS (CHOREOGRAFIE) ---
        this.updateAndDrawHeads(ctx, width, height, audio, t);

        // --- LASER BEAMS (OBEN) ---
        this.updateAndDrawLasers(ctx, width, height, audio, t);

        // --- PARTICLES & PYRO ---
        this.drawParticles(ctx, width, height, audio);

        // --- STROBE FLASH ---
        // Blitz bei jedem Kick im Chaos-Modus oder sehr hohem Bass
        if ((this.currentScene === 2 && isBeat) || audio.bass > 1.3) {
            ctx.fillStyle = `rgba(255, 255, 255, ${audio.bass * 0.3})`;
            ctx.fillRect(0, 0, width, height);
        }

        // Shockwaves zeichnen
        if (isBeat && Math.random() > 0.6) {
            this.shockwaves.push({ r: 0, opacity: 1, color: this.getSceneColor(this.frame) });
        }
        this.drawShockwaves(ctx, width, height);

        // Restore Context (Shake & Blend Mode reset)
        ctx.restore();
        
        // Vignette (drüberlegen, damit Ränder dunkel bleiben)
        let grad = ctx.createRadialGradient(width/2, height/2, height*0.3, width/2, height/2, height*0.9);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.6)");
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,width,height);
    }

    // --- SUB-ROUTINEN ---

    getSceneColor(offset) {
        // Farbpaletten je nach Szene
        // 0: Cyan/Blue (Chill), 1: Purple/Green (Build), 2: Red/White (Drop), 3: Rainbow
        switch(this.currentScene) {
            case 0: return (offset % 50) + 180; // Cyan -> Blau
            case 1: return (offset % 100) + 260; // Lila -> Pink
            case 2: return (Math.random() * 30) - 15; // Rot/Orange (Flackernd)
            case 3: return (offset * 2) % 360; // Regenbogen
        }
        return 0;
    }

    drawBlinders(ctx, width, height, audio, isBeat) {
        const cols = 6;
        const rows = 4;
        const cellW = width / cols;
        const cellH = (height * 0.4) / rows; // Nur obere 40%

        this.blinders.forEach((b, i) => {
            // Logik: Blinder aktivieren
            if (isBeat && Math.random() > 0.7) b.intensity = 1.0;
            if (this.currentScene === 2 && Math.random() > 0.8) b.intensity = 1.0; // Chaos strobe
            
            b.intensity *= 0.85; // Schnelles Abklingen

            if (b.intensity > 0.01) {
                const cx = b.x * cellW + cellW/2;
                const cy = b.y * cellH + cellH/2;
                
                const hue = this.getSceneColor(this.frame);
                ctx.fillStyle = `hsla(${hue}, 100%, 80%, ${b.intensity})`;
                
                // Glow
                ctx.shadowBlur = 20 * b.intensity;
                ctx.shadowColor = `hsla(${hue}, 100%, 50%, 1)`;
                
                ctx.beginPath();
                ctx.arc(cx, cy, 5 + (b.intensity * 10), 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0; // Reset für Performance
            }
        });
    }

    updateAndDrawHeads(ctx, width, height, audio, t) {
        const count = this.heads.length;
        const hue = this.getSceneColor(this.frame);
        
        this.heads.forEach((h, i) => {
            const xBase = (width / (count + 1)) * (i + 1);
            const yBase = height; // Boden

            // --- CHOREOGRAFIE LOGIK ---
            let desiredAngle = -Math.PI / 2; // Senkrecht nach oben

            if (this.currentScene === 0) {
                // Modus 0: Langsames Fächern (Sky Scanner)
                desiredAngle = -Math.PI/2 + Math.sin(t * 0.5 + (i * 0.3)) * 0.5;
            } 
            else if (this.currentScene === 1) {
                // Modus 1: Kreuzen in der Mitte (X-Formation)
                const side = i < count/2 ? 1 : -1;
                desiredAngle = -Math.PI/2 + (side * 0.4) + Math.sin(t * 2) * 0.1;
            }
            else if (this.currentScene === 2) {
                // Modus 2: DROP / Chaos (Schnell & Zufällig)
                if (Math.random() > 0.8) h.targetAngle = -Math.PI/2 + (Math.random()-0.5) * 2.0;
                // Interpoliere nicht im Chaos, springe fast
                desiredAngle = h.targetAngle || -Math.PI/2;
            }
            else {
                // Modus 3: Synchrone Welle
                desiredAngle = -Math.PI/2 + Math.sin(t + i) * 0.8;
            }

            // Smooth Interpolation (außer im Drop)
            const smooth = (this.currentScene === 2) ? 0.3 : 0.05;
            h.angle += (desiredAngle - h.angle) * smooth;

            // Zeichnen
            const beamLen = height * 1.5;
            const endX = xBase + Math.cos(h.angle) * beamLen;
            const endY = yBase + Math.sin(h.angle) * beamLen;

            // Beam Breite variiert mit Bass
            const widthBeam = 2 + (audio.bass * 10);
            
            // Strahl (Gradient für "Ausfaden")
            let grad = ctx.createLinearGradient(xBase, yBase, endX, endY);
            grad.addColorStop(0, `hsla(${hue}, 100%, 70%, ${0.3 + audio.mid})`);
            grad.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
            
            ctx.fillStyle = grad;
            
            // Dreieckiger Strahl (sieht volumetrischer aus)
            ctx.beginPath();
            ctx.moveTo(xBase, yBase);
            ctx.lineTo(endX - widthBeam*2, endY);
            ctx.lineTo(endX + widthBeam*2, endY);
            ctx.fill();

            // Heller Kern in der Mitte
            ctx.strokeStyle = `rgba(255,255,255, ${0.4 + audio.bass * 0.4})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(xBase, yBase); ctx.lineTo(endX, endY); ctx.stroke();
            
            // Lichtquelle am Boden
            ctx.fillStyle = `hsl(${hue}, 100%, 80%)`;
            ctx.beginPath(); ctx.arc(xBase, yBase, 6 + audio.bass * 4, 0, Math.PI*2); ctx.fill();
        });
    }

    updateAndDrawLasers(ctx, width, height, audio, t) {
        // Nur aktiv in intensiven Szenen
        if (this.currentScene === 0) return; 

        const hue = (this.getSceneColor(this.frame) + 180) % 360; // Komplementärfarbe
        const count = this.lasers.length;

        this.lasers.forEach((l, i) => {
            const xBase = (width / count) * i + (width / count / 2);
            
            // Laser blinken schnell im Takt
            if (this.frame % 4 === 0) {
                 // Zufälliges Muster basierend auf Audio-Spektrum
                 const spectrumIdx = Math.floor((i / count) * 20);
                 l.active = audio.raw[spectrumIdx] > 120; // Schwellenwert
            }

            if (l.active || this.currentScene === 2) {
                let targetX = width / 2;
                let targetY = height;

                if (this.currentScene === 1) {
                     // Tunnel Effekt
                     targetX = width/2 + Math.cos(t * 2 + i) * (width * 0.3);
                     targetY = height/2 + Math.sin(t * 2 + i) * (height * 0.3);
                } else if (this.currentScene === 3) {
                    // Rain
                    targetX = xBase;
                    targetY = height;
                }

                // Laser Beam
                ctx.lineWidth = 2 + audio.treble * 4;
                ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${0.6 + audio.treble})`;
                
                // Glow Effect via Shadow
                ctx.shadowBlur = 15;
                ctx.shadowColor = `hsla(${hue}, 100%, 50%, 1)`;
                
                ctx.beginPath();
                ctx.moveTo(xBase, 0);
                ctx.lineTo(targetX, targetY);
                ctx.stroke();

                ctx.shadowBlur = 0; // Reset
                
                // Impact Point Dot
                ctx.fillStyle = "#fff";
                ctx.beginPath(); ctx.arc(targetX, targetY, 3, 0, Math.PI*2); ctx.fill();
            }
        });
    }

    drawParticles(ctx, width, height, audio) {
        // Neue Partikel spawnen
        const spawnRate = this.currentScene === 2 ? 5 : 1;
        if (audio.mid > 0.4) {
            for(let i=0; i<spawnRate; i++) {
                this.particles.push({
                    x: Math.random() * width,
                    y: height, // Von unten nach oben (Pyro) oder oben nach unten (Sparks)
                    vx: (Math.random() - 0.5) * 4,
                    vy: -(Math.random() * 5 + 5 + (audio.bass * 10)),
                    life: 1.0,
                    size: Math.random() * 3 + 1,
                    hue: this.currentScene === 2 ? 40 : this.getSceneColor(this.frame) // Gold im Drop
                });
            }
        }

        for(let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // Schwerkraft
            p.life -= 0.02;

            if(p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.life})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            ctx.fill();
        }
    }

    drawShockwaves(ctx, width, height) {
        ctx.lineWidth = 3;
        for(let i = this.shockwaves.length - 1; i >= 0; i--) {
            let s = this.shockwaves[i];
            s.r += 25; // Speed
            s.opacity -= 0.05;
            
            if (s.opacity <= 0) {
                this.shockwaves.splice(i, 1);
                continue;
            }

            ctx.strokeStyle = `hsla(${s.color}, 100%, 80%, ${s.opacity})`;
            ctx.beginPath();
            ctx.arc(width/2, height/2, s.r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}