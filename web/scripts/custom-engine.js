/**
 * scripts/custom-engine.js
 */

let customImageObjects = {}; // Cache für geladene Bilder
let customScene = {
    background: null,
    objects: {} // { id: { img, x, y, scale, rotation, alpha } }
};

async function processCustomLogic(data) {
    if (!currentCustomLogic) return;

    let bass = data.bars.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    let isBassHit = bass > (35 * bassSensSetting);

    for (const block of currentCustomLogic) {
        // --- INITIALISIERUNG ---
        if (block.type === 'set_bg') {
            customScene.background = block.params.url;
        }

        if (block.type === 'add_img') {
            const id = block.params.id;
            if (!customScene.objects[id]) {
                customScene.objects[id] = {
                    url: block.params.url,
                    x: parseFloat(block.params.x) || 50,
                    y: parseFloat(block.params.y) || 50,
                    scale: parseFloat(block.params.scale) || 1,
                    rotation: 0,
                    alpha: 1
                };
            }
        }

        // --- ANIMATION / TRIGGER ---
        if (block.type === 'move_obj' && isBassHit) {
            const target = block.params.target;
            if (customScene.objects[target]) {
                // Beispiel: Hüpfen bei Bass
                customScene.objects[target].y -= 10; 
            }
        }
        
        // Sanfte Rückkehr (Physics)
        for (let id in customScene.objects) {
            let obj = customScene.objects[id];
            // Schwerkraft / Rückkehr zur Basis-Y (vereinfacht)
            if (obj.y < 50) obj.y += 1; 
        }
    }
}

// Neue Funktion zum Zeichnen der Custom-Elemente
function drawCustomLayers(ctx, width, height) {
    // 1. Hintergrund
    if (customScene.background) {
        const img = getImage(`editor/custom/static/${customScene.background}`);
        if (img.complete) ctx.drawImage(img, 0, 0, width, height);
    }

    // 2. Objekte
    for (let id in customScene.objects) {
        const obj = customScene.objects[id];
        const img = getImage(`editor/custom/static/${obj.url}`);
        if (img.complete) {
            ctx.save();
            ctx.globalAlpha = obj.alpha;
            const drawX = (obj.x / 100) * width;
            const drawY = (obj.y / 100) * height;
            const w = img.width * obj.scale;
            const h = img.height * obj.scale;
            
            ctx.translate(drawX, drawY);
            ctx.rotate(obj.rotation * Math.PI / 180);
            ctx.drawImage(img, -w/2, -h/2, w, h);
            ctx.restore();
        }
    }
}

// Hilfsfunktion zum Cachen von Bildern
function getImage(src) {
    if (!customImageObjects[src]) {
        customImageObjects[src] = new Image();
        customImageObjects[src].src = src;
    }
    return customImageObjects[src];
}