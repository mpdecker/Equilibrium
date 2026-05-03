import * as Tone from "tone";

export interface AmbientParams {
  baseFrequency: number;
  chordIntervals: number[];
  filterCutoffMax: number;
  lfoSpeed: number;
  reverbWet: number;
  reverbDecay: number;
  volume: number;
  droneVolume: number;
  padVolume: number;
  arpVolume: number;
  bellVolume: number;
  subVolume: number;
  colorPalette: string[];
  oscillatorType: "sine" | "triangle" | "square" | "sawtooth";
  harmonicity: number; // 0.1 to 5.0
  modulationIndex: number; // 0 to 10
  noiseAmount: number; // 0.0 to 1.0
  noiseType: "white" | "pink" | "brown";
  delayTime: "8n" | "4n" | "2n";
  delayFeedback: number; // 0.0 to 0.9
  complexity: number; // 0.0 to 1.0
  attackTime: number; // 0.1 to 10.0
  releaseTime: number; // 0.1 to 20.0
  chorusDepth: number; // 0.0 to 1.0
  phaserFrequency: number; // 0.1 to 10.0
}

export interface EvolutionSettings {
  timbreDiversity: number; // 0.0 to 1.0
  evolutionSpeed: number; // 0.0 to 1.0
  feedbackSubtlety: number; // 0.0 to 1.0
  particleDensity: number; // 50 to 300
}

export const defaultSettings: EvolutionSettings = {
  timbreDiversity: 0.5,
  evolutionSpeed: 0.5,
  feedbackSubtlety: 0.8,
  particleDensity: 150,
};

export const defaultParams: AmbientParams = {
  baseFrequency: 110, // A2
  chordIntervals: [0, 7, 12, 16], // Root, Fifth, Octave, Major Third
  filterCutoffMax: 800,
  lfoSpeed: 0.1,
  reverbWet: 0.8,
  reverbDecay: 5.0,
  volume: 0,
  droneVolume: -5,
  padVolume: -5,
  arpVolume: -5,
  bellVolume: -5,
  subVolume: -5,
  colorPalette: ["#1e1b4b", "#4c1d95", "#0ea5e9"],
  oscillatorType: "sine",
  harmonicity: 2.0,
  modulationIndex: 2.0,
  noiseAmount: 0.1,
  noiseType: "pink",
  delayTime: "4n",
  delayFeedback: 0.4,
  complexity: 0.3,
  attackTime: 4.0,
  releaseTime: 8.0,
  chorusDepth: 0.5,
  phaserFrequency: 0.5,
};

export class AmbientEngine {
  private droneSynth: Tone.PolySynth;
  private arpSynth: Tone.PolySynth;
  private padSynth: Tone.PolySynth;
  private fmLeadSynth: Tone.PolySynth;
  private subSynth: Tone.PolySynth;
  private bellSynth: Tone.PolySynth;
  private textureSynth: Tone.MetalSynth;
  private noise: Tone.Noise;
  private noiseFilter: Tone.AutoFilter;
  private reverb: Tone.Reverb;
  private filter: Tone.Filter;
  private hpFilter: Tone.Filter;
  private chorus: Tone.Chorus;
  private phaser: Tone.Phaser;
  private vibrato: Tone.Vibrato;
  private tapeSaturation: Tone.Chebyshev;
  private pitchShift: Tone.PitchShift;
  private shimmerReverb: Tone.Reverb;
  private lfo: Tone.LFO;
  private lfo2: Tone.LFO;
  private lfo3: Tone.LFO;
  private lfo4: Tone.LFO;
  private autoPan: Tone.AutoPanner;
  private delay: Tone.FeedbackDelay;
  private compressor: Tone.Compressor;
  private limiter: Tone.Limiter;
  private started = false;
  public analyser: Tone.Analyser;

  private currentIntervals: number[] = [];
  private baseFreq: number = 110;
  private currentComplexity: number = 0.3;
  private currentEvolutionSpeed: number = 0.5;
  private arpLoop: Tone.Loop;
  private droneLoop: Tone.Loop;
  private padLoop: Tone.Loop;
  private leadLoop: Tone.Loop;
  private subLoop: Tone.Loop;
  private bellLoop: Tone.Loop;
  private textureLoop: Tone.Loop;
  private evolutionLoop: Tone.Loop;

  constructor() {
    // Effects Chain
    this.reverb = new Tone.Reverb({ decay: 10, wet: 0.5, preDelay: 0.2 });
    this.delay = new Tone.FeedbackDelay({
      maxDelay: 4,
      delayTime: "4n",
      feedback: 0.4,
      wet: 0.3,
    });
    this.filter = new Tone.Filter({
      type: "lowpass",
      frequency: 800,
      rolloff: -24,
    });
    this.hpFilter = new Tone.Filter({
      type: "highpass",
      frequency: 20, // Cut off subsonic rumble only
      rolloff: -24,
    });
    this.chorus = new Tone.Chorus(4, 2.5, 0.5).start();
    this.phaser = new Tone.Phaser({
      frequency: 0.1,
      octaves: 3,
      baseFrequency: 300,
    });
    this.autoPan = new Tone.AutoPanner({ frequency: 0.05, depth: 1 }).start();
    this.vibrato = new Tone.Vibrato({ frequency: 0.8, depth: 0.1, wet: 0.3 }); // Tape Wow
    this.tapeSaturation = new Tone.Chebyshev({ order: 51, wet: 0.1 }); // Tape warmth
    this.pitchShift = new Tone.PitchShift({ pitch: 12, windowSize: 0.1, delayTime: 0, feedback: 0.2 });
    this.shimmerReverb = new Tone.Reverb({ decay: 15, preDelay: 0.2, wet: 1 });

    this.lfo = new Tone.LFO({
      type: "sine",
      min: 200,
      max: 800,
      frequency: 0.05,
    }).connect(this.filter.frequency);

    this.analyser = new Tone.Analyser("waveform", 256);
    this.compressor = new Tone.Compressor({
      threshold: -30,
      ratio: 12,
      attack: 0.01,
      release: 0.2,
    });
    this.limiter = new Tone.Limiter(-5).toDestination();
    this.limiter.connect(this.analyser);

    // Drone Synth (Pad)
    this.droneSynth = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 2,
      oscillator: { type: "sine" },
      envelope: { attack: 4, decay: 2, sustain: 1, release: 8 },
      modulation: { type: "sine" },
      modulationEnvelope: { attack: 4, decay: 2, sustain: 1, release: 8 },
      volume: -15, // default
    });

    // Arp/Pluck Synth
    this.arpSynth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 1.5,
      modulationIndex: 2,
      oscillator: { type: "triangle" },
      envelope: { attack: 0.05, decay: 0.5, sustain: 0.2, release: 2 },
      modulation: { type: "square" },
      modulationEnvelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0,
        release: 0.2,
      },
      volume: -10, // default
    });

    this.padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 3, decay: 2, sustain: 0.8, release: 5 },
      volume: -15, // default
    });

    this.fmLeadSynth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3,
      modulationIndex: 5,
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.5, decay: 1, sustain: 0.5, release: 3 },
      modulation: { type: "square" },
      modulationEnvelope: { attack: 0.2, decay: 0.5, sustain: 0.2, release: 1 },
      volume: -15, // default
    });

    this.subSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 2, decay: 2, sustain: 1, release: 5 },
      volume: -12, // default
    });

    this.bellSynth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3.5,
      modulationIndex: 3,
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 2, sustain: 0, release: 2 },
      modulation: { type: "sine" },
      modulationEnvelope: { attack: 0.01, decay: 1, sustain: 0, release: 1 },
      volume: -8,
    });

    this.textureSynth = new Tone.MetalSynth({
      envelope: { attack: 0.1, decay: 0.1, release: 0.2 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
      volume: -20
    });

    this.noise = new Tone.Noise("pink");
    this.noiseFilter = new Tone.AutoFilter({
      frequency: "8m",
      baseFrequency: 200,
      octaves: 2.5,
      depth: 1,
    }).start();
    this.noise.chain(
      this.noiseFilter,
      this.reverb,
      this.hpFilter,
      this.compressor,
      this.analyser,
      this.limiter,
    );

    this.lfo2 = new Tone.LFO({
      type: "sine",
      min: 0.2,
      max: 0.5, // Stop delay feedback from getting crazy
      frequency: 0.1,
    }).start();

    this.lfo3 = new Tone.LFO({
      type: "triangle",
      min: 0.01,
      max: 0.5, // Modulate the LFO frequency gently
      frequency: 0.02,
    }).start();

    this.lfo4 = new Tone.LFO({
      type: "sine",
      min: -25,
      max: -5,
      frequency: "8m",
    }).start();

    // Cross modulation:
    Tone.connect(this.lfo3, this.lfo.frequency);
    Tone.connect(this.lfo2, this.delay.feedback);
    Tone.connect(this.lfo4, this.padSynth.volume); // slowly fade pads in and out

    this.droneSynth.chain(
      this.tapeSaturation,
      this.vibrato,
      this.phaser,
      this.filter,
      this.autoPan,
      this.delay,
      this.reverb,
      this.hpFilter,
      this.compressor,
      this.limiter,
    );
    this.arpSynth.chain(
      this.tapeSaturation,
      this.vibrato,
      this.delay,
      this.pitchShift,
      this.shimmerReverb,
      this.reverb,
      this.hpFilter,
      this.compressor,
      this.limiter,
    );
    this.padSynth.chain(
      this.tapeSaturation,
      this.vibrato,
      this.chorus,
      this.filter,
      this.reverb,
      this.hpFilter,
      this.compressor,
      this.limiter,
    );
    this.fmLeadSynth.chain(
      this.tapeSaturation,
      this.vibrato,
      this.autoPan,
      this.pitchShift,
      this.delay,
      this.shimmerReverb,
      this.reverb,
      this.hpFilter,
      this.compressor,
      this.limiter,
    );
    this.subSynth.chain(
      this.hpFilter,
      this.compressor,
      this.limiter,
    );
    this.bellSynth.chain(
      this.tapeSaturation,
      this.vibrato,
      this.delay,
      this.reverb,
      this.pitchShift,
      this.shimmerReverb,
      this.hpFilter,
      this.compressor,
      this.limiter,
    );
    this.textureSynth.chain(
      this.pitchShift,
      this.phaser,
      this.delay,
      this.shimmerReverb,
      this.reverb,
      this.hpFilter,
      this.compressor,
      this.analyser,
      this.limiter
    );

    // The limiter is already chained to analyser and destination previously

    this.bellLoop = new Tone.Loop((time) => {
      // Shimmering high bells
      const prob = this.currentComplexity * 0.3;
      if (Math.random() < prob && this.currentIntervals.length > 0) {
        let freq = this.baseFreq * Math.pow(2, this.currentIntervals[Math.floor(Math.random() * this.currentIntervals.length)] / 12);
        freq *= 4; // Two octaves up
        if (Math.random() > 0.5) freq *= 2;
        this.bellSynth.triggerAttackRelease(freq, "8n", time, 0.4);
      }
    }, "4n");

    this.subLoop = new Tone.Loop((time) => {
      // Anchoring sub bass
      if (Math.random() > 0.4 && this.currentIntervals.length > 0) {
        // play root note one or two octaves down
        let freq = this.baseFreq / 2;
        if (Math.random() > 0.5) freq /= 2;
        this.subSynth.triggerAttackRelease(freq, "2m", time, 0.4);
      }
    }, "4m");

    this.padLoop = new Tone.Loop((time) => {
      // Very slow evolving background
      if (Math.random() > 0.3 && this.currentIntervals.length > 0) {
        const freq = this.baseFreq * Math.pow(2, this.currentIntervals[0] / 12);
        const subFreq = freq / 2; // Sub octave
        this.padSynth.triggerAttackRelease(subFreq, "4m", time, 0.2);
        if (this.currentIntervals.length > 2) {
          const thirdFreq = this.baseFreq * Math.pow(2, this.currentIntervals[2] / 12);
          this.padSynth.triggerAttackRelease(thirdFreq, "4m", time, 0.15);
        }
      }
    }, "4m");

    this.leadLoop = new Tone.Loop((time) => {
      // Ethereal melodic bursts
      const prob = this.currentComplexity * 0.4;
      if (Math.random() < prob && this.currentIntervals.length > 0) {
        let freq = this.baseFreq * Math.pow(2, this.currentIntervals[Math.floor(Math.random() * this.currentIntervals.length)] / 12);
        freq *= 2; // Play an octave up
        this.fmLeadSynth.triggerAttackRelease(freq, "2n", time, 0.2);
      }
    }, "2n");

    this.droneLoop = new Tone.Loop((time) => {
      if (Math.random() > 0.3 && this.currentIntervals.length > 0) {
        const freq =
          this.baseFreq *
          Math.pow(
            2,
            this.currentIntervals[
              Math.floor(Math.random() * this.currentIntervals.length)
            ] / 12,
          );
        this.droneSynth.triggerAttackRelease(freq, "2m", time, 0.2);

        // Slightly detuned layer for thickness
        this.droneSynth.triggerAttackRelease(freq * 0.995, "2m", time, 0.1);
        this.droneSynth.triggerAttackRelease(freq * 1.005, "2m", time, 0.1);
      }
    }, "2m");

    this.arpLoop = new Tone.Loop((time) => {
      // Dynamic probability based on complexity AND a slow oscillation to make it feel living
      const generativeProbability =
        this.currentComplexity *
        (0.5 + 0.5 * Math.sin(time * 0.5 * this.currentEvolutionSpeed));

      if (
        Math.random() < generativeProbability &&
        this.currentIntervals.length > 0
      ) {
        const intervalChoice =
          this.currentIntervals[
            Math.floor(Math.random() * this.currentIntervals.length)
          ];
        let freq = this.baseFreq * Math.pow(2, intervalChoice / 12);
        if (Math.random() > 0.5) freq *= 2;
        if (Math.random() > 0.8) freq *= 2;

        // Slight velocity variations
        const vel = 0.1 + Math.random() * 0.2;
        this.arpSynth.triggerAttackRelease(freq, "16n", time, vel);
      }
    }, "8n");

    // Evolution loop to organically drift certain parameters based on settings
    this.textureLoop = new Tone.Loop((time) => {
      // Evolving metallic / granular texture
      const prob = this.currentComplexity * 0.5;
      if (Math.random() < prob) {
        // High harmonic bursts
        this.textureSynth.frequency.rampTo(this.baseFreq * (Math.random() * 4 + 1), 0.1, time);
        this.textureSynth.harmonicity = Math.random() * 10;
        this.textureSynth.triggerAttackRelease("16n", time, 0.1 + Math.random() * 0.1);
      }
    }, "16n");

    this.evolutionLoop = new Tone.Loop((time) => {
      // Small drifts in filter cutoffs or delays over a very long period
      const newMax =
        this.lfo.max + (Math.random() * 200 - 100) * this.currentEvolutionSpeed;
      if (typeof newMax === "number") {
        this.lfo.max = Math.max(200, Math.min(newMax, 4000));
      }
      
      // evolve delay time smoothly
      if (Math.random() > 0.7) {
        const times = ["8n", "4n", "4nd", "2n"];
        this.delay.delayTime.rampTo(times[Math.floor(Math.random() * times.length)], 4, time);
      }
    }, "8m");
  }

  async start() {
    if (this.started) return;
    console.log("Starting Tone framework...");
    await Tone.start();
    Tone.Transport.bpm.value = 60; // Slower, expansive Boards of Canada / Eno vibe
    console.log("Generating reverbs...");
    await this.reverb.generate();
    await this.shimmerReverb.generate();
    console.log("Reverbs generated. Starting LFOs and Transport.");
    this.lfo.start();
    Tone.Transport.start();

    // Trigger an immediate, guaranteed chord so the user knows audio is working
    if (this.currentIntervals.length > 1) {
      const now = Tone.now();
      const freq = this.baseFreq;
      this.droneSynth.triggerAttackRelease(freq, "2m", now, 0.4);
      this.padSynth.triggerAttackRelease(freq * Math.pow(2, this.currentIntervals[1] / 12), "2m", now + 0.1, 0.3);
      console.log("Guaranteed initial chord triggered at", now);
    } else if (this.currentIntervals.length === 1) {
      const now = Tone.now();
      const freq = this.baseFreq;
      this.droneSynth.triggerAttackRelease(freq, "2m", now, 0.4);
    }

    this.droneLoop.start(0);
    this.arpLoop.start(1);
    this.padLoop.start(0.5);
    this.leadLoop.start(1.5);
    this.subLoop.start(2);
    this.bellLoop.start(2.5);
    this.textureLoop.start(0.25);
    this.evolutionLoop.start(0);
    this.noise.start(0);
    this.started = true;
    console.log("Ambient Engine fully started!");
  }

  stop() {
    if (!this.started) return;
    this.droneSynth.releaseAll();
    this.arpSynth.releaseAll();
    this.padSynth.releaseAll();
    this.fmLeadSynth.releaseAll();
    this.subSynth.releaseAll();
    this.bellSynth.releaseAll();
    Tone.Transport.stop();
    this.droneLoop.stop();
    this.arpLoop.stop();
    this.padLoop.stop();
    this.leadLoop.stop();
    this.subLoop.stop();
    this.bellLoop.stop();
    this.textureLoop.stop();
    this.evolutionLoop.stop();
    this.noise.stop();
    this.started = false;
  }

  applyEvolutionSettings(settings: EvolutionSettings) {
    this.currentEvolutionSpeed = settings.evolutionSpeed;
  }

  applyParams(params: AmbientParams) {
    this.baseFreq = params.baseFrequency;
    this.currentIntervals = params.chordIntervals;
    this.currentComplexity = params.complexity;

    const now = Tone.now();

    this.delay.delayTime.rampTo(params.delayTime, 0.5, now);
    this.delay.feedback.rampTo(params.delayFeedback, 0.5, now);

    this.updateTimbre(params);

    this.lfo.max = params.filterCutoffMax;
    this.lfo.frequency.rampTo(params.lfoSpeed, 2, now);
    
    // Wire complexities to other LFOs dynamically
    this.lfo2.frequency.rampTo(params.lfoSpeed * 2 * this.currentEvolutionSpeed, 2, now);
    this.lfo3.frequency.rampTo(params.lfoSpeed * 0.5 * this.currentEvolutionSpeed, 2, now);
    this.lfo4.frequency.rampTo(params.lfoSpeed * 0.25 * this.currentEvolutionSpeed, 2, now);

    this.phaser.frequency.rampTo(params.phaserFrequency, 2, now);
    this.chorus.frequency.rampTo(params.lfoSpeed * 5, 2, now);
    this.chorus.depth = params.chorusDepth;
    this.autoPan.frequency.rampTo(params.lfoSpeed * 0.5, 2, now);
    
    // Tape Wow & Saturation
    this.vibrato.depth.rampTo(params.complexity * 0.4, 2, now);
    this.vibrato.frequency.rampTo(params.lfoSpeed * 2, 2, now);
    this.tapeSaturation.wet.rampTo(params.noiseAmount * 0.8, 2, now);

    // Noise settings
    this.noise.type = params.noiseType;
    // Map noiseAmount 0-1 to db (-60 to -10)
    const noiseVol =
      params.noiseAmount === 0 ? -100 : -60 + params.noiseAmount * 50;
    this.noise.volume.rampTo(noiseVol, 2, now);

    this.droneSynth.volume.rampTo(params.droneVolume, 2, now);
    this.padSynth.volume.rampTo(params.padVolume, 2, now);
    this.arpSynth.volume.rampTo(params.arpVolume, 2, now);
    this.bellSynth.volume.rampTo(params.bellVolume, 2, now);
    this.subSynth.volume.rampTo(params.subVolume, 2, now);
    this.fmLeadSynth.volume.rampTo(params.arpVolume - 2, 2, now); 
    this.textureSynth.volume.rampTo(params.droneVolume - 5, 2, now);

    this.reverb.wet.rampTo(Math.min(params.reverbWet, 0.95), 2, now);
    this.reverb.decay = Math.max(0.1, params.reverbDecay);
    Tone.Destination.volume.rampTo(Math.min(params.volume, -5), 2, now);
  }

  private updateTimbre(params: AmbientParams) {
    const drone = this.droneSynth as any;
    const arp = this.arpSynth as any;
    const pad = this.padSynth as any;
    const fm = this.fmLeadSynth as any;
    const sub = this.subSynth as any;
    const bell = this.bellSynth as any;

    console.log("Applying params to timbre:", params);

    const oscType =
      typeof params.oscillatorType === "string" &&
      ["sine", "triangle", "square", "sawtooth"].includes(params.oscillatorType)
        ? params.oscillatorType
        : "sine";

    drone.set({
      oscillator: { type: oscType },
      harmonicity: params.harmonicity,
      envelope: { attack: params.attackTime, decay: 2, sustain: 1, release: params.releaseTime },
    });

    const arpOscType =
      typeof params.oscillatorType === "string" &&
      ["sine", "triangle", "square", "sawtooth"].includes(params.oscillatorType)
        ? params.oscillatorType
        : "sine";

    arp.set({
      oscillator: { type: arpOscType },
      harmonicity: params.harmonicity * 1.5, // keep arp slightly offset harmonically
      modulationIndex: params.modulationIndex,
    });
    
    pad.set({
       oscillator: { type: oscType === "square" ? "triangle" : oscType },
       envelope: { attack: params.attackTime * 1.5, decay: 4, sustain: 0.8, release: params.releaseTime * 1.2 }
    });

    fm.set({
       harmonicity: params.harmonicity * 2.5,
       modulationIndex: params.modulationIndex * 1.5,
       oscillator: { type: "sine" },
       envelope: { attack: 0.1, decay: 0.8, sustain: 0.3, release: 4 }
    });
    
    sub.set({
       oscillator: { type: oscType === "sine" ? "sine" : "triangle" },
       envelope: { attack: 2, decay: 2, sustain: 1, release: 5 }
    });

    bell.set({
       harmonicity: params.harmonicity * 3.5,
       modulationIndex: params.modulationIndex * 0.5,
       oscillator: { type: "sine" },
       envelope: { attack: 0.01, decay: 2, sustain: 0, release: 2 }
    });
  }

  dispose() {
    this.stop();
    this.droneSynth.dispose();
    this.arpSynth.dispose();
    this.padSynth.dispose();
    this.fmLeadSynth.dispose();
    this.subSynth.dispose();
    this.bellSynth.dispose();
    this.textureSynth.dispose();
    this.noise.dispose();
    this.noiseFilter.dispose();
    this.reverb.dispose();
    this.shimmerReverb.dispose();
    this.pitchShift.dispose();
    this.filter.dispose();
    this.hpFilter.dispose();
    this.chorus.dispose();
    this.phaser.dispose();
    this.lfo.dispose();
    this.lfo2.dispose();
    this.lfo3.dispose();
    this.lfo4.dispose();
    this.autoPan.dispose();
    this.delay.dispose();
    this.compressor.dispose();
    this.limiter.dispose();
    this.analyser.dispose();
    this.droneLoop.dispose();
    this.arpLoop.dispose();
    this.padLoop.dispose();
    this.leadLoop.dispose();
    this.subLoop.dispose();
    this.bellLoop.dispose();
    this.textureLoop.dispose();
    this.evolutionLoop.dispose();
  }
}
