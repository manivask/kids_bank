/**
 * KidsBank Sound FX Engine
 * Pure Web Audio API synthesized audio effects with zero external file dependencies.
 * Crisp, kid-friendly sound feedback optimized for touchscreen tablets.
 */

class SoundEffectsManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    _getAudioContext() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    setEnabled(enabled) {
        this.enabled = Boolean(enabled);
    }

    isEnabled() {
        return this.enabled;
    }

    /**
     * Tactile UI button click / keypad tap
     */
    playTap() {
        if (!this.enabled) return;
        try {
            const ctx = this._getAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04);

            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        } catch (e) {
            // Audio context policy or disabled
        }
    }

    /**
     * Cheerful coin chime when money is added / bonus earned
     */
    playCoin() {
        if (!this.enabled) return;
        try {
            const ctx = this._getAudioContext();
            if (!ctx) return;

            const t = ctx.currentTime;
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sine';
            osc2.type = 'sine';

            // High double ding (B5 -> E6)
            osc1.frequency.setValueAtTime(987.77, t); // B5
            osc1.frequency.setValueAtTime(1318.51, t + 0.08); // E6

            osc2.frequency.setValueAtTime(1975.53, t); // B6 overtone
            osc2.frequency.setValueAtTime(2637.02, t + 0.08); // E7 overtone

            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start(t);
            osc2.start(t);
            osc1.stop(t + 0.46);
            osc2.stop(t + 0.46);
        } catch (e) {}
    }

    /**
     * Friendly spend register sound
     */
    playSpend() {
        if (!this.enabled) return;
        try {
            const ctx = this._getAudioContext();
            if (!ctx) return;

            const t = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(520, t);
            osc.frequency.exponentialRampToValueAtTime(320, t + 0.12);

            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(t);
            osc.stop(t + 0.16);
        } catch (e) {}
    }

    /**
     * Celebration fanfare when a bonus or large allowance is awarded
     */
    playFanfare() {
        if (!this.enabled) return;
        try {
            const ctx = this._getAudioContext();
            if (!ctx) return;

            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            const noteDuration = 0.09;
            const t = ctx.currentTime;

            notes.forEach((freq, idx) => {
                const noteTime = t + idx * noteDuration;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, noteTime);

                gain.gain.setValueAtTime(0.15, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + (idx === notes.length - 1 ? 0.35 : 0.12));

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(noteTime);
                osc.stop(noteTime + 0.36);
            });
        } catch (e) {}
    }

    /**
     * Gentle error sound for invalid PIN or overspending
     */
    playError() {
        if (!this.enabled) return;
        try {
            const ctx = this._getAudioContext();
            if (!ctx) return;

            const t = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, t);
            osc.frequency.setValueAtTime(110, t + 0.1);

            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(t);
            osc.stop(t + 0.23);
        } catch (e) {}
    }
}

// Global instance
window.soundFX = new SoundEffectsManager();
