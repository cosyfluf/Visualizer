/**
 * editor-logic.js
 * Steuert die Interaktion, Objektverwaltung und das UI-Rendering
 */

let elements = []; // Liste aller Objekte im Editor
let selectedId = null;
let currentTool = 'select'; // select, move, scale, rotate
let isDragging = false;
let startMousePos = { x: 0, y: 0 };
let startObjPos = { x: 0, y: 0, w: 0, h: 0, rot: 0 };

// Canvas Referenz (ID 'viz' kommt aus deiner core.js)
const canvas = document.getElementById('viz');
const ctx = canvas.getContext('2d');

// Initialisierung beim Laden
window.addEventListener('load', () => {
    // Falls core.js resize() hat, rufen wir es auf
    if (typeof resize === 'function') resize();
    
    setupCanvasInteractions();
    setupDragAndDrop();
    renderLayerList();
});

// --- TOOL SYSTEM ---
function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tool-${tool}`).classList.add('active');
}

// --- OBJEKT VERWALTUNG ---
function addObj(type) {
    const id = "obj_" + Date.now();
    const newObj = {
        id: id,
        type: type,
        name: `${type}_${elements.length + 1}`,
        x: 350, y: 175, // Startposition Mitte
        w: 100, h: 100,
        rot: 0,
        color: '#0078d4',
        alpha: 1,
        img: null,
        src: null
    };

    // Integration in deine custom-engine.js (falls vorhanden)
    if (typeof customScene !== 'undefined') {
        customScene.objects[id] = newObj;
    }

    elements.push(newObj);
    selectObj(id);
    renderLayerList();
}

function selectObj(id) {
    selectedId = id;
    renderLayerList();
    renderProperties();
}

function deleteObj() {
    if (!selectedId) return;
    elements = elements.filter(el => el.id !== selectedId);
    if (typeof customScene !== 'undefined') delete customScene.objects[selectedId];
    selectedId = null;
    renderLayerList();
    renderProperties();
}

// --- UI RENDERING ---
function renderLayerList() {
    const list = document.getElementById('layer-list');
    list.innerHTML = '';
    
    // Wir rendern von oben nach unten (letztes Element oben)
    [...elements].reverse().forEach(el => {
        const item = document.createElement('div');
        item.className = `layer-item ${selectedId === el.id ? 'active' : ''}`;
        item.innerHTML = `
            <i class="fas ${getIcon(el.type)}"></i>
            <span>${el.name}</span>
        `;
        item.onclick = () => selectObj(el.id);
        list.appendChild(item);
    });
}

function getIcon(type) {
    if (type === 'rect') return 'fa-square';
    if (type === 'circle') return 'fa-circle';
    if (type === 'visualizer') return 'fa-chart-bar';
    return 'fa-image';
}

function renderProperties() {
    const props = document.getElementById('properties-panel');
    const el = elements.find(e => e.id === selectedId);
    
    if (!el) {
        props.innerHTML = '<div class="empty-state">Select an object</div>';
        return;
    }

    props.innerHTML = `
        <div class="prop-group">
            <label>Name</label>
            <input type="text" value="${el.name}" oninput="updateActiveObj('name', this.value)">
        </div>
        <div class="prop-row">
            <div class="prop-group">
                <label>X Position</label>
                <input type="number" value="${Math.round(el.x)}" oninput="updateActiveObj('x', this.value)">
            </div>
            <div class="prop-group">
                <label>Y Position</label>
                <input type="number" value="${Math.round(el.y)}" oninput="updateActiveObj('y', this.value)">
            </div>
        </div>
        <div class="prop-row">
            <div class="prop-group">
                <label>Width</label>
                <input type="number" value="${Math.round(el.w)}" oninput="updateActiveObj('w', this.value)">
            </div>
            <div class="prop-group">
                <label>Height</label>
                <input type="number" value="${Math.round(el.h)}" oninput="updateActiveObj('h', this.value)">
            </div>
        </div>
        <div class="prop-group">
            <label>Rotation (${el.rot}°)</label>
            <input type="range" min="0" max="360" value="${el.rot}" oninput="updateActiveObj('rot', this.value)">
        </div>
        <div class="prop-group">
            <label>Color</label>
            <input type="color" value="${el.color}" style="height:30px; padding:2px;" oninput="updateActiveObj('color', this.value)">
        </div>
        <button class="save-btn" style="width:100%; margin-top:10px; background:#444;" onclick="openScripts()">
            <i class="fas fa-code"></i> Edit Logic Canvas
        </button>
        <button class="save-btn" style="width:100%; margin-top:10px; background:var(--danger);" onclick="deleteObj()">
            <i class="fas fa-trash"></i> Delete Object
        </button>
    `;
}

function updateActiveObj(key, val) {
    const el = elements.find(e => e.id === selectedId);
    if (!el) return;
    
    // Werte konvertieren
    if (['x', 'y', 'w', 'h', 'rot'].includes(key)) val = parseFloat(val);
    
    el[key] = val;
    
    // Sync mit custom-engine.js
    if (typeof customScene !== 'undefined') customScene.objects[selectedId][key] = val;
    
    // Falls Name geändert wurde, Layerliste updaten
    if (key === 'name') renderLayerList();
}

// --- CANVAS INTERAKTION (Transformations-Logik) ---
function setupCanvasInteractions() {
    canvas.addEventListener('mousedown', e => {
        if (!selectedId || currentTool === 'select') return;
        
        isDragging = true;
        const el = elements.find(e => e.id === selectedId);
        
        startMousePos = { x: e.clientX, y: e.clientY };
        startObjPos = { x: el.x, y: el.y, w: el.w, h: el.h, rot: el.rot };
    });

    window.addEventListener('mousemove', e => {
        if (!isDragging || !selectedId) return;

        const el = elements.find(e => e.id === selectedId);
        const dx = e.clientX - startMousePos.x;
        const dy = e.clientY - startMousePos.y;

        if (currentTool === 'move') {
            el.x = startObjPos.x + dx;
            el.y = startObjPos.y + dy;
        } 
        else if (currentTool === 'scale') {
            el.w = Math.max(10, startObjPos.w + dx);
            el.h = Math.max(10, startObjPos.h + dy);
        }
        else if (currentTool === 'rotate') {
            el.rot = (startObjPos.rot + dx) % 360;
        }

        renderProperties();
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

// --- IMAGE DRAG & DROP ---
function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');

    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.style.backgroundColor = "rgba(0, 120, 212, 0.05)";
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.backgroundColor = "transparent";
    });

    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.style.backgroundColor = "transparent";
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const id = "img_" + Date.now();
                    const newImgObj = {
                        id: id,
                        type: 'image',
                        name: "Image_" + (elements.length + 1),
                        x: 100, y: 100,
                        w: img.width / 2, h: img.height / 2,
                        rot: 0, color: '#ffffff', alpha: 1,
                        img: img, src: event.target.result
                    };
                    elements.push(newImgObj);
                    if (typeof customScene !== 'undefined') customScene.objects[id] = newImgObj;
                    selectObj(id);
                };
            };
            reader.readAsDataURL(files[0]);
        }
    });
}

// --- MODAL & SONSTIGES ---
function openScripts() {
    document.getElementById('script-modal').style.display = 'flex';
}

function closeScripts() {
    document.getElementById('script-modal').style.display = 'none';
}

function saveProject() {
    const projectName = document.getElementById('project-name').value;
    const data = JSON.stringify(elements);
    console.log("Saving Project:", projectName, data);
    alert("Project saved to console!");
}

// Integration mit deiner Audio-Engine Statusanzeige
setInterval(() => {
    if (typeof audioCtx !== 'undefined' && audioCtx.state === 'running') {
        document.getElementById('hz-display').innerText = "Engine: Active";
        document.getElementById('hz-display').style.color = "#00ff00";
    }
}, 1000);