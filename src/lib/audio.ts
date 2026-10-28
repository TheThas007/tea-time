/**
 * Web Audio API synthesizer for live kitchen order alerts.
 * Generates an elegant chime without external audio assets.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    const saved = localStorage.getItem("teatime_admin_muted");
    this.isMuted = saved === "true";
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    localStorage.setItem("teatime_admin_muted", String(muted));
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Plays a pleasant 2-tone melodic chime: C6 (1046 Hz) -> E6 (1318 Hz)
   */
  public playNewOrderChime(): void {
    if (this.isMuted) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note 1: 880 Hz (A5)
      this.playTone(ctx, 880, now, 0.45, 0.25);
      // Note 2: 1320 Hz (E6)
      this.playTone(ctx, 1320, now + 0.18, 0.65, 0.35);
      // Note 3: 1760 Hz (A6)
      this.playTone(ctx, 1760, now + 0.36, 0.85, 0.4);
    } catch (e) {
      console.warn("Unable to play audio alert:", e);
    }
  }

  private playTone(ctx: AudioContext, freq: number, startTime: number, duration: number, maxVol: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(maxVol, startTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }
}

export const soundManager = new SoundManager();

