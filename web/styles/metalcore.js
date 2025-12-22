class FractalOscilloscopeRenderer {
    constructor() {
        // Audio Smoothing States
        this.bass = 0;
        this.mid = 0;
        this.high = 0;
        this.frame = 0;
        
        // Performance Elements
        this.pyro = [];
        this.crowd = [];
        this.lightRotation = 0;
        
        // Initialize Crowd (Silhouettes in foreground)
        for (let i = 0; i < 45; i++) {
            this.crowd.push({
                x: Math.random(),
                jump: 0,
                offset: Math.random() * Math.PI * 2,
                size: Math.random() * 20 + 35,
                isThrowingHorns: Math.random() > 0.5
            });
        }
    }

    draw(ctx, width, height, data) {
        // --- AUDIO ANALYSIS ---
        let rawBass = 0, rawMid = 0, rawHigh = 0;
        if (data && data.bars && data.bars.length > 0) {
            // Focus on low frequencies for Bass
            for (let i = 0; i < 6; i++) rawBass += data.bars[i];
            rawBass /= (6 * 255);
            // Focus on middle frequencies for Vocals/Guitars
            for (let i = 10; i < 40; i++) rawMid += data.bars[i];
            rawMid /= (30 * 255);
            // Focus on highs for Cymbals/Snare
            for (let i = 50; i < data.bars.length; i++) rawHigh += data.bars[i];
            rawHigh /= ((data.bars.length - 50) * 255);
        }

        // Smoothing for fluid animations
        this.bass = this.bass * 0.8 + rawBass * 0.2;
        this.mid = this.mid * 0.8 + rawMid * 0.2;
        this.high = this.high * 0.7 + rawHigh * 0.3;
        this.frame++;

        const stageY = height * 0.75;
        const centerX = width / 2;
        const isIntense = rawBass > 0.65 || rawHigh > 0.5;

        // --- 1. STAGE & BACKGROUND ---
        ctx.fillStyle = "#020205"; // Deep black void
        ctx.fillRect(0, 0, width, height);

        // LED Wall (Visualizer in the background)
        this.drawLEDWall(ctx, width, stageY);

        // Reflective Stage Floor
        let floorGrad = ctx.createLinearGradient(0, stageY, 0, height);
        floorGrad.addColorStop(0, "#0a0a0f");
        floorGrad.addColorStop(1, "#000000");
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, stageY, width, height - stageY);

        // --- 2. THE BAND ---
        ctx.save();
        // Camera Shake on heavy bass hits
        if (this.bass > 0.5) {
            ctx.translate((Math.random() - 0.5) * 12 * this.bass, (Math.random() - 0.5) * 12 * this.bass);
        }

        this.drawDrummer(ctx, centerX, stageY - 10);
        this.drawGuitarist(ctx, centerX - width * 0.25, stageY, "V-Guitar", "#e61919"); // Lead
        this.drawGuitarist(ctx, centerX + width * 0.25, stageY, "Explorer", "#ffffff"); // Rhythm
        this.drawVocalist(ctx, centerX, stageY + 20);
        
        ctx.restore();

        // --- 3. LIGHTING & PYRO ---
        this.handlePyro(ctx, width, stageY, rawBass);
        this.drawStageLights(ctx, width, height, isIntense);

        // --- 4. FOREGROUND CROWD ---
        this.drawCrowd(ctx, width, height);
    }

    drawLEDWall(ctx, width, stageY) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        const barCount = 30;
        const barWidth = width / barCount;
        for (let i = 0; i < barCount; i++) {
            const h = (i % 3 === 0 ? this.bass : (i % 3 === 1 ? this.mid : this.high)) * stageY;
            ctx.fillStyle = `hsl(${200 + (i * 5)}, 100%, 50%)`;
            ctx.fillRect(i * barWidth, stageY - h, barWidth - 4, h);
        }
        ctx.restore();
    }

    drawDrummer(ctx, x, y) {
        const pulse = this.bass * 18;
        
        // Kick Drum
        ctx.fillStyle = "#050505";
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y - 35, 45 + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Cymbals (react to highs)
        const hit = this.high * 25;
        ctx.fillStyle = "#a68d4c";
        ctx.fillRect(x - 90, y - 110 - hit, 50, 6); // Crash Left
        ctx.fillRect(x + 40, y - 130 - hit * 0.5, 50, 6); // Ride Right

        // Drummer Silhouette
        ctx.fillStyle = "#000";
        const headMotion = Math.sin(this.frame * 0.2) * this.bass * 15;
        ctx.fillRect(x - 18, y - 95, 36, 45); // Torso
        ctx.beginPath();
        ctx.arc(x, y - 105 + headMotion, 14, 0, Math.PI * 2); // Head
        ctx.fill();
    }

    drawGuitarist(ctx, x, y, style, color) {
        const headbang = Math.abs(Math.sin(this.frame * 0.18)) * this.bass * 35;
        const strum = Math.sin(this.frame * 0.5) * 20 * this.mid;

        ctx.save();
        ctx.translate(x, y);

        // Legs (Power Stance)
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.moveTo(-20, 0); ctx.lineTo(-25, -45);
        ctx.moveTo(20, 0); ctx.lineTo(25, -45);
        ctx.stroke();

        // Torso
        ctx.fillStyle = "#000";
        ctx.fillRect(-18, -90, 36, 50);

        // Instrument
        ctx.strokeStyle = color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        if (style === "V-Guitar") {
            ctx.moveTo(-45, -55); ctx.lineTo(15, -65); ctx.lineTo(-45, -85); // V shape
        } else {
            ctx.strokeRect(-45, -70, 55, 18); // Boxy Explorer shape
        }
        ctx.stroke();

        // Strumming Arm
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(15, -80);
        ctx.lineTo(25 + strum, -55);
        ctx.stroke();

        // Head and Long Hair
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(0, -100 + headbang, 14, 0, Math.PI * 2);
        ctx.fill();

        // Windmill Hair effect during heavy parts
        if (this.bass > 0.4) {
            ctx.strokeStyle = "#080808";
            ctx.lineWidth = 3;
            for(let i = 0; i < 6; i++) {
                ctx.beginPath();
                ctx.moveTo(0, -100 + headbang);
                const hairAngle = (this.frame * 0.4) + (i * 1.2);
                ctx.lineTo(Math.cos(hairAngle) * 50, Math.sin(hairAngle) * 40 - 80 + headbang);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    drawVocalist(ctx, x, y) {
        const scream = this.mid * 45;
        ctx.save();
        ctx.translate(x, y);

        // Silhouette
        ctx.fillStyle = "#000";
        ctx.rotate(Math.sin(this.frame * 0.08) * 0.15); // Swaying
        ctx.fillRect(-15, -95, 30, 55); // Body
        ctx.beginPath();
        ctx.arc(0, -110 - scream/3, 15, 0, Math.PI * 2); // Head
        ctx.fill();

        // Mic Stand
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(12, -105 - scream/3);
        ctx.stroke();
        
        ctx.restore();
    }

    handlePyro(ctx, width, stageY, rawBass) {
        // Trigger flames on big bass drops
        if (rawBass > 0.8 && this.frame % 4 === 0) {
            this.pyro.push({ x: width * 0.08, life: 1.0 });
            this.pyro.push({ x: width * 0.92, life: 1.0 });
        }

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let i = this.pyro.length - 1; i >= 0; i--) {
            const p = this.pyro[i];
            const height = p.life * 350;
            
            const grad = ctx.createLinearGradient(0, stageY, 0, stageY - height);
            grad.addColorStop(0, "#ffcc00");
            grad.addColorStop(0.4, "#ff6600");
            grad.addColorStop(1, "transparent");
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(p.x - 25, stageY);
            ctx.quadraticCurveTo(p.x, stageY - height * 1.2, p.x + 25, stageY);
            ctx.fill();
            
            p.life *= 0.92;
            if (p.life < 0.01) this.pyro.splice(i, 1);
        }
        ctx.restore();
    }

    drawStageLights(ctx, width, height, isIntense) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const lightCount = 6;
        const colors = isIntense ? ["#ffffff", "#ff0000"] : ["#0033ff", "#6600ff"];
        
        this.lightRotation += 0.02 + this.mid * 0.05;

        for (let i = 0; i < lightCount; i++) {
            const x = (width / (lightCount + 1)) * (i + 1);
            const angle = Math.sin(this.lightRotation + i) * 0.6;
            
            ctx.save();
            ctx.translate(x, 0);
            ctx.rotate(angle);
            
            const beamGrad = ctx.createLinearGradient(0, 0, 0, height);
            beamGrad.addColorStop(0, colors[i % colors.length]);
            beamGrad.addColorStop(1, "transparent");
            
            ctx.fillStyle = beamGrad;
            ctx.globalAlpha = isIntense ? 0.4 : 0.2;
            ctx.beginPath();
            ctx.moveTo(-15, 0);
            const beamWidth = 60 + this.mid * 120;
            ctx.lineTo(-beamWidth, height);
            ctx.lineTo(beamWidth, height);
            ctx.lineTo(15, 0);
            ctx.fill();
            ctx.restore();
        }

        // Strobe effect for mosh parts
        if (isIntense && this.frame % 2 === 0) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
            ctx.fillRect(0, 0, width, height);
        }
        ctx.restore();
    }

    drawCrowd(ctx, width, height) {
        ctx.fillStyle = "#000";
        this.crowd.forEach(p => {
            // Jump logic
            const jumpForce = this.bass * 70;
            p.jump = p.jump * 0.7 + jumpForce * 0.3;
            
            const px = p.x * width;
            const py = height + 30 - p.jump - (Math.sin(this.frame * 0.12 + p.offset) * 12);
            
            // Head
            ctx.beginPath();
            ctx.arc(px, py - p.size, p.size * 0.45, 0, Math.PI * 2);
            ctx.fill();
            // Shoulders/Body
            ctx.fillRect(px - p.size * 0.7, py - p.size * 0.75, p.size * 1.4, p.size * 1.5);
            
            // Hand Sign (🤘)
            if (this.bass > 0.5 && p.isThrowingHorns) {
                ctx.fillRect(px + p.size/3, py - p.size - 25, 4, 18); // Index
                ctx.fillRect(px + p.size/3 + 10, py - p.size - 25, 4, 18); // Pinky
            }
        });
    }
}