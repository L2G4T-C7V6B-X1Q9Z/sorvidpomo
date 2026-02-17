const Ctx =
  window.AudioContext ??
  (window as unknown as { webkitAudioContext: typeof AudioContext })
    .webkitAudioContext;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private unlocked = false;
  private volume = 0.6;
  private muted = false;

  ensure() {
    if (!this.ctx) {
      const ctx: AudioContext = new Ctx();
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : this.volume;
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
    }
  }

  unlock = async () => {
    this.ensure();
    if (this.ctx && !this.unlocked) {
      try {
        await this.ctx.resume();
        this.unlocked = true;
      } catch {}
    }
  };

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) {
      this.master.gain.value = m ? 0 : this.volume;
    }
  }

  blip(
    f: number,
    o: Partial<{
      type: OscillatorType;
      attack: number;
      decay: number;
      release: number;
      peak: number;
      sweep: number;
      lpf: number;
    }> = {}
  ) {
    this.ensure();
    if (!this.ctx || !this.master) return;
    const {
      type = "triangle",
      attack = 0.003,
      decay = 0.12,
      release = 0.06,
      peak = 0.8,
      sweep = 0,
      lpf = 9000,
    } = o;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = lpf;
    osc.type = type;
    osc.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(Math.max(1e-4, 0.001), t + attack + decay);
    g.gain.exponentialRampToValueAtTime(Math.max(1e-4, 0.0005), t + attack + decay + release);
    if (sweep) osc.frequency.linearRampToValueAtTime(f + sweep, t + attack + decay);
    osc.connect(lp);
    lp.connect(g);
    g.connect(this.master!);
    osc.start(t);
    osc.stop(t + attack + decay + release + 0.02);
  }

  chord(freqs: number[], opts: Parameters<SoundEngine["blip"]>[1]) {
    freqs.forEach((f, i) =>
      this.blip(f, { ...opts, peak: (opts?.peak ?? 0.8) * (i ? 0.7 : 1) })
    );
  }

  play(
    kind: "start" | "pause" | "skip" | "complete" | "click" | "tick",
    nextMode: "focus" | "break" = "break"
  ) {
    if (kind === "start")
      this.chord([520, 780], { attack: 0.004, decay: 0.11, release: 0.07, sweep: 14 });
    if (kind === "pause")
      this.blip(420, { type: "sine", decay: 0.12, release: 0.06, sweep: -18 });
    if (kind === "skip")
      this.blip(600, {
        type: "triangle",
        attack: 0.0015,
        decay: 0.07,
        release: 0.03,
        sweep: -10,
        lpf: 5200,
        peak: 0.55,
      });
    if (kind === "click")
      this.blip(600, {
        type: "sine",
        attack: 0.002,
        decay: 0.05,
        release: 0.02,
        peak: 0.15,
        lpf: 1500,
      });
    if (kind === "tick")
      this.blip(1000, {
        type: "sine",
        attack: 0.002,
        decay: 0.05,
        release: 0.02,
        peak: 0.12,
        lpf: 2000,
      });
    if (kind === "complete") {
      const a = 660;
      const base = [a, a * 1.25, a * 1.5, a * 2];
      const focusToBreak = base.concat(base.slice(0, -1).reverse());
      const breakToFocus = base.slice().reverse().concat(base.slice(1));
      const freqs = nextMode === "focus" ? breakToFocus : focusToBreak;
      const peaks = [0.5, 0.5, 0.5, 0.3, 0.3, 0.3, 0.15];
      freqs.forEach((f, i) =>
        setTimeout(
          () =>
            this.blip(f, {
              type: "sine",
              decay: 0.15,
              release: 0.15,
              peak: peaks[i],
            }),
          i * 180
        )
      );
    }
  }
}

export { SoundEngine };
export const sound = new SoundEngine();
