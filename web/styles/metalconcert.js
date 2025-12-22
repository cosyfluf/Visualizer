class MetalConcertRenderer {
    constructor() {
        this.bass = 0;
        this.mid = 0;
        this.high = 0;
        
        this.isMoshMode = false;
        this.intensity = 0;
        
        this.flames = [];
        this.particles = []; // For smoke and sparks
        this.lightAngle = 0;
        this.strobeTimer = 0;
        
        // Initialize some "Stage Smoke"
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random(),
                y: Math.random(),
                size: Math.random() * 40 + 20,
                vx: (Math.random() - 0.5) * 0.002,
                vy: -Math.random() * 0.002,
                alpha: Math.random() * 0.2
            });
        }
    }

    draw(ctx, width, height, data) {
        // --- AUDIO ANALYSIS ---
        let rawBass = 0, rawMid = 0, rawHigh = 0;
        if (data && data.bars && data.bars.length > 0) {
            for (let i = 0; i < 4; i++) rawBass += data.bars[i];
            rawBass /= (4 * 255);
            for (let i = 8; i < 20; i++) rawMid += data.bars[i];
            rawMid /= (12 * 255);
            for (let i = 30; i < data.bars.length; i++) rawHigh += data.bars[i];
            rawHigh /= ((data.bars.length - 30) * 255);
        }

        // Smoothing
        this.bass = this.bass * 0.8 + rawBass * 0.2;
        this.mid = this.mid * 0.8 + rawMid * 0.2;
        this.high = this.high * 0.7 + rawHigh * 0.3;
        
        this.isMoshMode = rawBass > 0.65 || rawHigh > 0.5;
        this.intensity = (this.bass + this.mid + this.high) / 3;

        // --- BACKGROUND / STAGE ---
        ctx.fillStyle = "#050505";
        ctx.fillRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height / 2;
        const groundY = height * 0.85;

        // --- AMPS (WALL OF SOUND) ---
        this.drawAmps(ctx, width, groundY);

        // --- SMOKE EFFECT ---
        this.drawSmoke(ctx, width, height);

        // --- PYROTECHNICS (Triggered by Bass) ---
        if (rawBass > 0.75 && Math.random() > 0.7) {
            this.flames.push({ x: width * 0.1, life: 1.0 });
            this.flames.push({ x: width * 0.9, life: 1.0 });
            if (this.isMoshMode) {
                this.flames.push({ x: width * 0.3, life: 1.0 });
                this.flames.push({ x: width * 0.7, life: 1.0 });
            }
        }
        this.drawFlames(ctx, groundY);

        // --- THE BAND ---
        ctx.save();
        // Slight screen shake on heavy bass
        if (this.bass > 0.5) {
            ctx.translate((Math.random()-0.5) * 10 * this.bass, (Math.random()-0.5) * 10 * this.bass);
        }

        this.drawDrummer(ctx, cx, groundY - 20);
        this.drawGuitarist(ctx, cx - width * 0.25, groundY, "left");
        this.drawGuitarist(ctx, cx + width * 0.25, groundY, "right");
        this.drawVocalist(ctx, cx, groundY + 20);

        ctx.restore();

        // --- LIGHT SHOW ---
        this.drawLights(ctx, width, height);
        
        // --- STROBE EFFECT (During Mosh Mode) ---
        if (this.isMoshMode) {
            this.strobeTimer++;
            if (this.strobeTimer % 2 === 0) {
                ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
                ctx.fillRect(0, 0, width, height);
            }
        }
    }

    drawAmps(ctx, width, groundY) {
        const ampCount = 6;
        const ampWidth = width / 8;
        const ampHeight = 120;
        
        ctx.fillStyle = "#111";
        for (let i = 0; i < ampCount; i++) {
            const x = (i < 3) ? (i * ampWidth + 20) : (width - (i-2) * ampWidth - 20);
            const y = groundY - ampHeight;
            
            // Outer Box
            ctx.strokeStyle = "#222";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, ampWidth - 10, ampHeight);
            
            // Speaker Cones (Vibrating)
            const vibration = this.bass * 8;
            ctx.fillStyle = "#0a0a0a";
            ctx.beginPath();
            ctx.arc(x + (ampWidth-10)/2, y + ampHeight/3, 20 + vibration, 0, Math.PI * 2);
            ctx.arc(x + (ampWidth-10)/2, y + (ampHeight*2)/3, 20 + vibration, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawDrummer(ctx, x, y) {
        const pulse = this.bass * 15;
        ctx.fillStyle = "#000";
        
        // Kick Drum
        ctx.beginPath();
        ctx.arc(x, y, 40 + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#333";
        ctx.stroke();

        // Drummer Silhouette
        ctx.fillRect(x - 15, y - 80 - (this.mid * 10), 30, 40); // Torso
        ctx.beginPath();
        ctx.arc(x, y - 90 - (this.mid * 15), 12, 0, Math.PI * 2); // Head
        ctx.fill();

        // Cymbals (React to Highs)
        const cymbalShake = this.high * 20;
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 3;
        // Left Cymbal
        ctx.beginPath();
        ctx.moveTo(x - 60, y - 50);
        ctx.lineTo(x - 80, y - 100 - cymbalShake);
        ctx.stroke();
        // Right Cymbal
        ctx.beginPath();
        ctx.moveTo(x + 60, y - 50);
        ctx.lineTo(x + 80, y - 100 - cymbalShake);
        ctx.stroke();
    }

    drawGuitarist(ctx, x, y, side) {
        const headbang = Math.sin(Date.now() * 0.01) * this.bass * 20;
        const bounce = Math.sin(Date.now() * 0.008) * 5;

        ctx.fillStyle = "#000";
        // Body
        ctx.save();
        ctx.translate(x, y + bounce);
        
        // Legs
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(-10, 0); ctx.lineTo(-20, -40);
        ctx.moveTo(10, 0); ctx.lineTo(20, -40);
        ctx.stroke();

        // Torso
        ctx.fillRect(-15, -80, 30, 45);

        // Head (Headbanging)
        ctx.beginPath();
        ctx.arc(0, -90 + headbang, 12, 0, Math.PI * 2);
        ctx.fill();

        // Guitar
        ctx.strokeStyle = side === "left" ? "#400" : "#004";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-40, -50 + headbang/2);
        ctx.lineTo(40, -70);
        ctx.stroke();

        ctx.restore();
    }

    drawVocalist(ctx, x, y) {
        const power = this.mid * 30;
        ctx.fillStyle = "#000";
        
        ctx.save();
        ctx.translate(x, y);
        
        // Torso leaning back
        ctx.rotate(this.mid * 0.2);
        ctx.fillRect(-12, -85, 24, 45);
        
        // Head / Mouth
        ctx.beginPath();
        ctx.arc(0, -95 - power/2, 13, 0, Math.PI * 2);
        ctx.fill();
        
        // Mic Stand
        ctx.strokeStyle = "#666";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-10, -85 - power/2);
        ctx.stroke();

        ctx.restore();
    }

    drawFlames(ctx, groundY) {
        ctx.globalCompositeOperation = "lighter";
        for (let i = this.flames.length - 1; i >= 0; i--) {
            const f = this.flames[i];
            const h = f.life * 200;
            
            const grad = ctx.createLinearGradient(0, groundY, 0, groundY - h);
            grad.addColorStop(0, "rgba(255, 100, 0, 0.8)");
            grad.addColorStop(0.5, "rgba(255, 50, 0, 0.4)");
            grad.addColorStop(1, "transparent");
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(f.x - 20, groundY);
            ctx.quadraticCurveTo(f.x, groundY - h * 1.2, f.x + 20, groundY);
            ctx.fill();
            
            f.life -= 0.05;
            if (f.life <= 0) this.flames.splice(i, 1);
        }
        ctx.globalCompositeOperation = "source-over";
    }

    drawSmoke(ctx, width, height) {
        ctx.fillStyle = "rgba(100, 100, 100, 0.1)";
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.y < 0) p.y = 1;
            
            ctx.beginPath();
            ctx.arc(p.x * width, p.y * height, p.size * (1 + this.bass), 0, Math.PI * 2);
            ctx.globalAlpha = p.alpha;
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    drawLights(ctx, width, height) {
        this.lightAngle += 0.02 + this.mid * 0.1;
        const colors = this.isMoshMode ? ["#f00", "#fff", "#f0f"] : ["#05f", "#00f", "#333"];
        
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < 4; i++) {
            const lx = (width / 5) * (i + 1);
            const angle = Math.sin(this.lightAngle + i) * 0.5;
            
            ctx.save();
            ctx.translate(lx, 0);
            ctx.rotate(angle);
            
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, height);
            grad.addColorStop(0, colors[i % colors.length]);
            grad.addColorStop(0.6, "transparent");
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(-20, 0);
            ctx.lineTo(-100, height);
            ctx.lineTo(100, height);
            ctx.lineTo(20, 0);
            ctx.fill();
            ctx.restore();
        }
        ctx.globalCompositeOperation = "source-over";
    }
}