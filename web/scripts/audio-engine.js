let audioCtx, source, splitter, analyserL, analyserR, dataArrayL, dataArrayR;

function calculateHz(barIndex) {
    if(barIndex < 0) barIndex = 0;
    if(barIndex > 64) barIndex = 64;
    return Math.round(30 * Math.pow((15000 / 30), (barIndex / 64)));
}

function initAudio() {
    if (audioCtx) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
            source = audioCtx.createMediaStreamSource(stream);
            splitter = audioCtx.createChannelSplitter(2);
            analyserL = audioCtx.createAnalyser();
            analyserR = audioCtx.createAnalyser();
            analyserL.fftSize = 4096; 
            analyserR.fftSize = 4096;
            source.connect(splitter);
            splitter.connect(analyserL, 0);
            splitter.connect(analyserR, 1);
            dataArrayL = new Uint8Array(analyserL.frequencyBinCount);
            dataArrayR = new Uint8Array(analyserR.frequencyBinCount);
            addLog("INFO", "Audio Engine started.");
        });
    } catch(e) { addLog("ERROR", "Audio Init Failed."); }
}

function updateHzDisplay() {
    let startIdx = parseInt(bassOffsetSetting);
    let endIdx = startIdx + parseInt(bassRangeSetting);
    document.getElementById('hz-display').innerText = `${calculateHz(startIdx)} Hz - ${calculateHz(endIdx)} Hz`;
}