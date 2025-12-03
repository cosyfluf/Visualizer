class KittRenderer {
    draw(ctx, width, height, data) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#ff0000";
        ctx.fillStyle = "#ff1a1a";

        const numBars = 64;
        const barWidth = (width / numBars) * 1.5;
        const center = width / 2;
        const limit = numBars / 2;

        for (let i = 0; i < limit; i++) {
            // Von Mitte nach außen
            let val = data.bars[i];
            let h = (val / 100) * height * 0.6;
            if(h < 2) h = 2;

            let y = (height / 2) - (h / 2);
            let xRight = center + (i * barWidth);
            let xLeft = center - ((i + 1) * barWidth);

            ctx.fillRect(xRight + 1, y, barWidth - 2, h);
            ctx.fillRect(xLeft + 1, y, barWidth - 2, h);
        }
    }
}