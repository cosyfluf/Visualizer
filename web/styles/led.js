class LedRenderer {
    draw(ctx, width, height, data) {
        const numBars = 64;
        const gap = 2;
        const barWidth = (width / numBars) - gap;
        const blockHeight = 6;
        const blockGap = 2;

        ctx.shadowBlur = 0;

        for (let i = 0; i < numBars; i++) {
            let val = data.bars[i];
            let totalBlocks = Math.floor((height * 0.9) / (blockHeight + blockGap));
            let activeBlocks = Math.floor((val / 100) * totalBlocks);

            let x = i * (barWidth + gap) + gap/2;

            for (let b = 0; b < totalBlocks; b++) {
                let y = (height - 10) - (b * (blockHeight + blockGap));
                
                if (b < activeBlocks) {
                    if (b > totalBlocks * 0.85) ctx.fillStyle = "#ff0000"; // Peak
                    else if (b > totalBlocks * 0.6) ctx.fillStyle = "#ffcc00"; // Warning
                    else ctx.fillStyle = "#00ff00"; // Normal
                } else {
                    ctx.fillStyle = "#1a1a1a"; // Hintergrund Pixel
                }
                ctx.fillRect(x, y, barWidth, blockHeight);
            }
        }
    }
}