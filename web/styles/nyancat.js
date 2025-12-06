class NyanCatRenderer {
    constructor() {
        this.frame = 0; 
        this.stars = [];
        this.rainbowColors = ['#ff0000', '#ff9900', '#ffff00', '#33ff00', '#0099ff', '#6633ff'];
        
        // Sterne
        for(let i=0; i<50; i++) {
            this.stars.push({ x: Math.random(), y: Math.random(), size: Math.random() * 3 + 1 });
        }

        // GIF Element erzeugen
        this.catImg = document.getElementById('nyan-cat-gif');
        if (!this.catImg) {
            this.catImg = document.createElement('img');
            this.catImg.id = 'nyan-cat-gif';
            this.catImg.src = 'static/nyan-cat.gif'; // WICHTIG: Dateipfad prüfen!
            this.catImg.style.position = 'absolute';
            this.catImg.style.display = 'none';
            this.catImg.style.zIndex = '5';     
            this.catImg.style.width = '160px';  
            this.catImg.style.height = 'auto';
            
            const container = document.getElementById('container') || document.body;
            container.appendChild(this.catImg);
        }
    }

    draw(ctx, width, height, data) {
        let bass = 0;
        if(data.bars && data.bars.length > 0) {
            bass = data.bars.slice(0, 5).reduce((a,b)=>a+b,0) / 5;
            bass /= 255; 
        }

        this.frame += 0.1;

        if(this.catImg.style.display !== 'block') this.catImg.style.display = 'block';

        // Animation
        let speed = 0.005 + (bass * 0.045); 
        const catX = width * 0.4; 
        const catY = height * 0.5;
        
        let bounceSpeed = this.frame * 0.5 + (bass * 10); 
        let bounceHeight = (height * 0.02) + (bass * height * 0.05);
        let currentY = catY + Math.sin(bounceSpeed) * bounceHeight;

        this.catImg.style.left = (catX - 60) + 'px'; 
        this.catImg.style.top = (currentY - 30) + 'px';
        this.catImg.style.transform = `scale(${1.0 + (bass * 0.2)})`;

        // Hintergrund
        ctx.fillStyle = "#00435C"; ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "#fff";
        this.stars.forEach(star => {
            star.x -= speed; 
            if(star.x < 0) { star.x = 1; star.y = Math.random(); }
            ctx.fillRect(star.x * width, star.y * height, star.size + (bass * 20), star.size);
        });

        // Regenbogen
        const tailX = catX - 40; 
        const trailSegments = 40;
        const segmentWidth = tailX / trailSegments;
        const pSize = height * 0.005; 

        for(let i = 0; i < trailSegments; i++) {
            let audioIdx = Math.floor(i * (data.bars.length / trailSegments));
            let val = data.bars[audioIdx] || 0;
            
            let delay = (trailSegments - i) * 0.1;
            let waveY = Math.sin(bounceSpeed - delay) * bounceHeight;
            let audioOffset = (val / 255) * (height * 0.1); 

            let segY = catY + waveY + (i % 2 === 0 ? audioOffset : -audioOffset);
            let x = i * segmentWidth;
            let stripeHeight = pSize * 4; 

            this.rainbowColors.forEach((color, cIdx) => {
                ctx.fillStyle = color;
                let yPos = segY + (cIdx * stripeHeight) - (stripeHeight * 3);
                ctx.fillRect(x, yPos, segmentWidth + 1, stripeHeight);
            });
        }
    }
}