// Web Audio API procedural sound synthesizer for vehicle simulation
class SoundEffects {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.muted = false;

        // Audio nodes
        this.masterGain = null;
        this.engineOsc1 = null;
        this.engineOsc2 = null;
        this.engineGain = null;
        this.engineFilter = null;
        
        this.screechNode = null;
        this.screechGain = null;
        this.screechFilter = null;

        this.windGain = null;
        this.windFilter = null;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            // Master Gain
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            // --- Engine Sound (Dual Sub-Harmonic Sawtooth + Lowpass) ---
            this.engineOsc1 = this.ctx.createOscillator();
            this.engineOsc1.type = 'sawtooth';
            this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

            this.engineOsc2 = this.ctx.createOscillator();
            this.engineOsc2.type = 'triangle';
            this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

            this.engineFilter = this.ctx.createBiquadFilter();
            this.engineFilter.type = 'lowpass';
            this.engineFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
            this.engineFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

            this.engineOsc1.connect(this.engineFilter);
            this.engineOsc2.connect(this.engineFilter);
            this.engineFilter.connect(this.engineGain);
            this.engineGain.connect(this.masterGain);

            this.engineOsc1.start();
            this.engineOsc2.start();

            // --- Tire Screech (White Noise + Bandpass Filter) ---
            const bufferSize = this.ctx.sampleRate * 2;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const whiteNoise = this.ctx.createBufferSource();
            whiteNoise.buffer = noiseBuffer;
            whiteNoise.loop = true;

            this.screechFilter = this.ctx.createBiquadFilter();
            this.screechFilter.type = 'bandpass';
            this.screechFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
            this.screechFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

            this.screechGain = this.ctx.createGain();
            this.screechGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

            whiteNoise.connect(this.screechFilter);
            this.screechFilter.connect(this.screechGain);
            this.screechGain.connect(this.masterGain);
            whiteNoise.start();

            // --- Wind Rush Noise ---
            const windNoise = this.ctx.createBufferSource();
            windNoise.buffer = noiseBuffer;
            windNoise.loop = true;

            this.windFilter = this.ctx.createBiquadFilter();
            this.windFilter.type = 'lowpass';
            this.windFilter.frequency.setValueAtTime(200, this.ctx.currentTime);

            this.windGain = this.ctx.createGain();
            this.windGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

            windNoise.connect(this.windFilter);
            this.windFilter.connect(this.windGain);
            this.windGain.connect(this.masterGain);
            windNoise.start();

            this.initialized = true;
        } catch (e) {
            console.warn("Audio initialization error: ", e);
        }
    }

    update(rpm, throttle, speed, isDrifting) {
        if (!this.initialized || this.muted) return;

        const time = this.ctx.currentTime;
        // Engine frequency calculation based on RPM (range 800 - 8000)
        const baseFreq = 35 + (rpm / 8000) * 160;
        this.engineOsc1.frequency.setTargetAtTime(baseFreq, time, 0.05);
        this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.01, time, 0.05);

        // Filter cutoff opens with throttle and RPM
        const cutoff = 300 + (rpm / 8000) * 1800 + (throttle ? 700 : 0);
        this.engineFilter.frequency.setTargetAtTime(cutoff, time, 0.05);

        // Engine volume modulates with throttle
        const vol = 0.15 + (throttle ? 0.25 : 0.05) + (rpm / 8000) * 0.15;
        this.engineGain.gain.setTargetAtTime(vol, time, 0.05);

        // Screech volume based on drift and speed
        const screechTarget = (isDrifting && speed > 15) ? Math.min(0.35, (speed / 100) * 0.4) : 0;
        this.screechGain.gain.setTargetAtTime(screechTarget, time, 0.04);
        this.screechFilter.frequency.setTargetAtTime(1200 + Math.random() * 400, time, 0.05);

        // Wind noise based on speed (km/h)
        const windVol = Math.min(0.25, Math.pow(speed / 240, 2) * 0.25);
        this.windGain.gain.setTargetAtTime(windVol, time, 0.1);
        this.windFilter.frequency.setTargetAtTime(200 + (speed / 250) * 800, time, 0.1);
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.4, this.ctx.currentTime);
        }
        return this.muted;
    }
}

window.SoundEffects = SoundEffects;
