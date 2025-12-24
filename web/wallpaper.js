/**
 * Handles Media Overlay positioning and Wallpaper Mode logic
 */

window.updateMediaPos = (pos) => {
    const overlay = document.getElementById('media-overlay');
    if (!overlay) return;

    // Remove all possible position classes
    overlay.classList.remove('pos-tl', 'pos-tr', 'pos-bl', 'pos-br');

    // Add new position class
    switch (pos) {
        case 'top-left': overlay.classList.add('pos-tl'); break;
        case 'top-right': overlay.classList.add('pos-tr'); break;
        case 'bottom-left': overlay.classList.add('pos-bl'); break;
        case 'bottom-right': overlay.classList.add('pos-br'); break;
    }
    
    // Smoothly show overlay when music plays (controlled via app.js/updateMediaInfo)
};

// Show restart hint for wallpaper mode
document.addEventListener('DOMContentLoaded', () => {
    const wallCheckbox = document.getElementById('wallpaper-mode');
    const wallHint = document.getElementById('wall-hint');
    
    if (wallCheckbox && wallHint) {
        wallCheckbox.onchange = () => {
            wallHint.style.display = 'block';
        };
    }
});