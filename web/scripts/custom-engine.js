function processCustomLogic(data) {
    if (!currentCustomLogic) return;

    // Bass-Erkennung für die Blöcke
    let bass = data.bars.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    let isBassHit = bass > (40 * bassSensSetting); // Schwellenwert basierend auf Einstellungen

    currentCustomLogic.forEach(block => {
        let triggered = false;
        
        // Events prüfen
        if (block.type === 'on_bass' && isBassHit) triggered = true;
        if (block.type === 'on_beat') triggered = true; // Vereinfacht

        if (triggered) {
            // Aktionen ausführen
            if (block.type === 'move_obj') {
                // Wir setzen Variablen, die der Renderer nutzen kann
                customVars.x = parseFloat(block.params.x || 0);
            }
            if (block.type === 'change_color') {
                customVars.color = block.params.color;
            }
            if (block.type === 'reset') {
                customVars.x = 0;
                customVars.y = 0;
            }
        } else {
            // Sanftes Zurückgleiten (Interpolation), wenn kein Trigger
            customVars.x *= 0.9; 
        }
    });
}