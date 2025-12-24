window.addEventListener('resize', resize);

window.addEventListener('click', () => {
    if (!audioCtx) initAudio();
});

window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveSettings(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'e') { 
        e.preventDefault(); 
        document.getElementById('console-overlay').style.display = 'flex'; 
    }
    if (e.key === 'F11' && window.pywebview) {
        e.preventDefault(); 
        window.pywebview.api.toggle_fullscreen();
    }
});

window.addEventListener('load', () => {
    resize();
    draw();
    initAudio();
});

setInterval(() => {
    if (currentStyleName === 'oscilloscopemusic' && audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}, 1000);