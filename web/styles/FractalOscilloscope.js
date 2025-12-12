class FractalOscilloscopeRenderer {
    constructor() {
        this.baseRotation = 0;
        this.nebulaParticles = [];
        this.stars = [];
        this.shockwaves = [];
        this.lasers = [];
        this.bass = 0;
        this.mid = 0;
        this.high = 0;
        this.isSupernova = false;
        this.blackHolePulse = 0;
        this.spaceDriftX = 0;
        this.spaceDriftY = 0;
        this.driftSpeed = 0.1;
        this.lastBassPeak = 0;
        this.bassKickThreshold = 1.6;  // Threshold for bass kick detection
        this.bassKickCooldown = 0;
        this.bassKickDecay = 0;

        // Nebula Fog Particles
        for (let i = 0; i < 800; i++) {
            this.nebulaParticles.push({
                angle: Math.random() * Math.PI * 2,
                radius: 0,
                size: Math.random() * 5 + 1,
                speed: Math.random() * 0.01 + 0.005,
                hue: 220 + Math.random() * 120,
                alpha: Math.random() * 0.6 + 0.4,
                life: Math.random() * 100 + 50,
                maxLife: Math.random() * 100 + 50,
                spin: (Math.random() - 0.5) * 0.01,
                glow: Math.random() * 0.5 + 0.5
            });
        }

        // Stars (most twinkle, some radiant)
        for (let i = 0; i < 500; i++) {
            const isRadiant = Math.random() < 0.05;
            this.stars.push({
                x: Math.random() * 2 - 1,
                y: Math.random() * 2 - 1,
                size: isRadiant ? Math.random() * 2 + 1 : Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.7 + 0.3,
                twinkleSpeed: Math.random() * 0.003 + 0.001,
                twinklePhase: Math.random() * Math.PI * 2,
                hue: isRadiant ? 200 : 200 + Math.random() * 60,
                isRadiant: isRadiant,
                radiantPulse: Math.random() * 0.02 + 0.01,
                radiantPhase: Math.random() * Math.PI * 2,
                driftX: (Math.random() - 0.5) * 0.0001,
                driftY: (Math.random() - 0.5) * 0.0001
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
        this.bass = this.bass * 0.85 + rawBass * 0.15;
        this.mid = this.mid * 0.9 + rawMid * 0.1;
        this.high = this.high * 0.8 + rawHigh * 0.2;

        const bassFx = this.bass * 4;
        const midFx = this.mid * 3;
        const highFx = this.high * 5;
        this.isSupernova = rawBass > 0.6;
        this.blackHolePulse = this.isSupernova ? 1.5 : 1 + bassFx * 0.6;

        // Update space drift
        this.spaceDriftX += this.driftSpeed * 0.05;
        this.spaceDriftY += this.driftSpeed * 0.03;
        if (this.spaceDriftX > width) this.spaceDriftX = 0;
        if (this.spaceDriftY > height) this.spaceDriftY = 0;

        // --- BASS KICK DETECTION ---
        const bassKick = rawBass > this.bassKickThreshold && rawBass > this.lastBassPeak;
        this.lastBassPeak = rawBass;
        if (this.bassKickCooldown > 0) this.bassKickCooldown--;
        this.bassKickDecay = this.bassKickDecay * 0.9 + (bassKick ? 0.5 : 0);

        // --- TRIGGER LASERS ON BASS KICK ONLY ---
        if (bassKick && this.bassKickCooldown === 0) {
            const laserCount = 6;  // Number of lasers per kick
            for (let i = 0; i < laserCount; i++) {
                this.lasers.push({
                    angle: Math.random() * Math.PI * 2,
                    length: 0,
                    maxLength: Math.max(width, height) * (Math.random() * 0.7 + 0.3),
                    width: Math.random() * 3 + 1,
                    opacity: 1,
                    speed: Math.random() * 0.15 + 0.1,
                });
            }
            this.bassKickCooldown = 10;  // Prevent rapid retiggering
        }

        // Update lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.length += laser.speed * 60;
            laser.opacity -= 0.02;
            if (laser.opacity <= 0 || laser.length >= laser.maxLength) {
                this.lasers.splice(i, 1);
            }
        }

        const cx = width / 2;
        const cy = height / 2;

        // --- BACKGROUND: DEEP COSMIC VOID ---
        ctx.fillStyle = "rgba(0, 0, 10, 0.5)";
        ctx.fillRect(0, 0, width, height);

        // --- TWINKLING & RADIANT STARS (SLOWLY DRIFTING) ---
        ctx.save();
        ctx.translate(-this.spaceDriftX % width, -this.spaceDriftY % height);
        this.stars.forEach(s => {
            s.x += s.driftX * this.driftSpeed;
            s.y += s.driftY * this.driftSpeed;
            if (s.x < -1) s.x = 1;
            if (s.x > 1) s.x = -1;
            if (s.y < -1) s.y = 1;
            if (s.y > 1) s.y = -1;

            if (s.isRadiant) {
                const pulse = Math.sin(Date.now() * s.radiantPulse + s.radiantPhase) * 0.2 + 0.8;
                const size = s.size * pulse * 1.5;
                const alpha = s.alpha * pulse;

                // Glow
                const gradient = ctx.createRadialGradient(
                    cx + s.x * width/2, cy + s.y * height/2, 0,
                    cx + s.x * width/2, cy + s.y * height/2, size * 3
                );
                gradient.addColorStop(0, `hsla(${s.hue}, 100%, 90%, ${alpha})`);
                gradient.addColorStop(1, "transparent");
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(cx + s.x * width/2, cy + s.y * height/2, size * 3, 0, Math.PI * 2);
                ctx.fill();

                // Rays
                ctx.strokeStyle = `hsla(${s.hue}, 100%, 90%, ${alpha * 0.7})`;
                ctx.lineWidth = 0.5;
                for (let i = 0; i < 6; i++) {
                    const rayAngle = (i / 6) * Math.PI * 2;
                    const rayLength = size * 5 * pulse;
                    ctx.beginPath();
                    ctx.moveTo(cx + s.x * width/2, cy + s.y * height/2);
                    ctx.lineTo(
                        cx + s.x * width/2 + Math.cos(rayAngle) * rayLength,
                        cy + s.y * height/2 + Math.sin(rayAngle) * rayLength
                    );
                    ctx.stroke();
                }

                // Core
                ctx.fillStyle = `hsla(${s.hue}, 100%, 95%, ${alpha})`;
                ctx.beginPath();
                ctx.arc(cx + s.x * width/2, cy + s.y * height/2, size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                const twinkle = Math.sin(Date.now() * s.twinkleSpeed + s.twinklePhase) * 0.4 + 0.6;
                ctx.fillStyle = `hsla(${s.hue}, 100%, ${80 + twinkle * 20}%, ${s.alpha * twinkle})`;
                ctx.beginPath();
                ctx.arc(cx + s.x * width/2, cy + s.y * height/2, s.size * twinkle, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.restore();

        // --- GLOBAL VORTEX ROTATION & SHAKE ---
        ctx.save();
        ctx.translate(cx, cy);

        // Shake on bass kick
        let shakeX = 0, shakeY = 0;
        if (this.bassKickDecay > 0.1) {
            shakeX = (Math.random() - 0.5) * (this.bassKickDecay * 30);
            shakeY = (Math.random() - 0.5) * (this.bassKickDecay * 30);
        }
        if (this.isSupernova) {
            shakeX = (Math.random() - 0.5) * 100;
            shakeY = (Math.random() - 0.5) * 100;
        }
        ctx.translate(shakeX, shakeY);

        // --- RED LASERS (FROM CENTER, BASS KICK ONLY) ---
        ctx.globalCompositeOperation = "lighter";
        this.lasers.forEach(laser => {
            const endX = Math.cos(laser.angle) * laser.length;
            const endY = Math.sin(laser.angle) * laser.length;
            ctx.strokeStyle = `rgba(255, 50, 50, ${laser.opacity})`;
            ctx.lineWidth = laser.width;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Glow at tip
            const glowGradient = ctx.createRadialGradient(endX, endY, 0, endX, endY, laser.width * 6);
            glowGradient.addColorStop(0, `rgba(255, 50, 50, ${laser.opacity * 0.8})`);
            glowGradient.addColorStop(1, "transparent");
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(endX, endY, laser.width * 4, 0, Math.PI * 2);
            ctx.fill();
        });

        // --- NEBULA FOG (BILLOWING FROM CENTER) ---
        this.nebulaParticles.forEach(p => {
            p.angle += p.spin;
            p.radius += p.speed * (1 + bassFx * 2);
            p.life--;
            if (p.life <= 0) {
                p.radius = 0;
                p.life = p.maxLife;
                p.hue = 220 + Math.random() * 120;
                p.alpha = Math.random() * 0.6 + 0.4;
            }
            const maxRadius = Math.max(width, height) * 0.8;
            if (p.radius > maxRadius) p.radius = maxRadius;

            const x = Math.cos(p.angle) * p.radius;
            const y = Math.sin(p.angle) * p.radius;
            const size = p.size * (1 + highFx * 0.3) * p.glow;
            const hue = this.isSupernova ? 270 + Math.random() * 60 : p.hue;
            const alpha = p.alpha * (1 - p.radius / maxRadius);

            ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        });

        // --- SUPERNOVA ARMS (HYPERSPACE TUNNEL) ---
        this.baseRotation += 0.005 + (this.mid * 0.03);
        if (this.isSupernova) this.baseRotation += 0.15;
        ctx.rotate(this.baseRotation);

        const numArms = 12;
        const baseSize = Math.min(width, height) * 0.15;
        const size = baseSize * this.blackHolePulse;

        for (let i = 0; i < numArms; i++) {
            const angle = (i / numArms) * Math.PI * 2;
            const armLen = size * 1.6;
            const glitchX = this.isSupernova ? (Math.random() - 0.5) * 40 : 0;
            const glitchY = this.isSupernova ? (Math.random() - 0.5) * 40 : 0;

            const sx = Math.cos(angle) * (size * 0.1);
            const sy = Math.sin(angle) * (size * 0.1);
            const cpx = Math.cos(angle + 1.2) * armLen + glitchX;
            const cpy = Math.sin(angle + 1.2) * armLen + glitchY;
            const ex = Math.cos(angle) * armLen + glitchX;
            const ey = Math.sin(angle) * armLen + glitchY;

            const hue = 220 + (i / numArms) * 120;
            ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
            ctx.shadowColor = `hsl(${hue}, 100%, 80%)`;
            ctx.shadowBlur = this.isSupernova ? 60 : 20 + bassFx * 40;
            ctx.lineWidth = this.isSupernova ? 30 : 10 + bassFx * 15;
            ctx.lineCap = "round";
            ctx.globalAlpha = 0.95;

            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(cpx, cpy, ex, ey);
            ctx.stroke();

            // Inner glow
            ctx.shadowBlur = 10;
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(cpx, cpy, ex, ey);
            ctx.stroke();
        }

        // --- BLACK HOLE CORE (BRIGHT SINGULARITY) ---
        ctx.fillStyle = "white";
        ctx.shadowBlur = 100 + bassFx * 150;
        ctx.shadowColor = "white";
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
        const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.25);
        coreGradient.addColorStop(0, "white");
        coreGradient.addColorStop(0.7, "hsl(270, 100%, 70%)");
        coreGradient.addColorStop(1, "transparent");
        ctx.fillStyle = coreGradient;
        ctx.fill();

        // --- SUPERNOVA SHOCKWAVES ---
        if (rawBass > 0.5 && Math.random() > 0.3) {
            this.shockwaves.push({
                r: 10,
                opacity: 1,
                width: this.isSupernova ? 50 : 30,
                hue: this.isSupernova ? 300 : 240,
            });
        }

        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            let sw = this.shockwaves[i];
            sw.r += 20 + bassFx * 30;
            sw.opacity -= 0.02;
            sw.width -= 0.5;
            if (sw.opacity <= 0) {
                this.shockwaves.splice(i, 1);
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, sw.r, 0, Math.PI * 2);
                ctx.strokeStyle = `hsla(${sw.hue}, 100%, 70%, ${sw.opacity})`;
                ctx.lineWidth = sw.width;
                ctx.stroke();
            }
        }

        // --- SUPERNOVA GLITCH FX (POST PROCESSING) ---
        if (this.isSupernova) {
            ctx.save();
            ctx.globalCompositeOperation = "screen";
            const numSlices = 15;
            const sliceHeight = height / numSlices;
            for (let k = 0; k < numSlices; k++) {
                const offsetX = (Math.random() - 0.5) * 100;
                if (Math.random() > 0.3) {
                    ctx.fillStyle = `hsla(${Math.random() * 60 + 240}, 100%, 70%, 0.4)`;
                    ctx.fillRect(
                        offsetX - width / 2,
                        k * sliceHeight - height / 2,
                        width,
                        sliceHeight + (Math.random() * 15)
                    );
                }
            }
            // Light Flare
            if (Math.random() > 0.6) {
                ctx.fillStyle = "white";
                ctx.globalCompositeOperation = "add";
                ctx.beginPath();
                ctx.arc(
                    (Math.random() - 0.5) * width / 2,
                    (Math.random() - 0.5) * height / 2,
                    Math.random() * 100 + 50,
                    0,
                    Math.PI * 2
                );
                const flareGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 100);
                flareGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
                flareGradient.addColorStop(1, "transparent");
                ctx.fillStyle = flareGradient;
                ctx.fill();
            }
            ctx.restore();
        }

        ctx.restore();
    }
}
