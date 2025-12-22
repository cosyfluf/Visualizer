class NeonRenderer {
    draw(ctx, width, height, data) {
        const numBars = 64;
        const totalGap = width * 0.15;
        const gap = totalGap / (numBars - 1);
        const barWidth = (width - totalGap) / numBars;

        let bass = data.bars[0] / 100;
        let gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#00F260');
        gradient.addColorStop(0.5, '#0575E6');
        gradient.addColorStop(1, `rgba(142, 45, 226, ${0.5 + bass})`);

        ctx.fillStyle = gradient;
        ctx.shadowBlur = 20 + (bass * 20);
        ctx.shadowColor = "rgba(5, 117, 230, 0.8)";

        for (let i = 0; i < numBars; i++) {
            let h = (data.bars[i] / 100) * height * 0.85;
            if (h < 4) h = 4;
            let x = i * (barWidth + gap);
            
            ctx.beginPath();
            ctx.roundRect(x, height - h, barWidth, h, [4, 4, 0, 0]);
            ctx.fill();
        }
    }
}