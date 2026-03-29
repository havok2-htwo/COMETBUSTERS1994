const SOUND_ROOT = "./assets/audio";

export const SOUND_EVENTS = [
  "player_shot",
  "player_hit_push",
  "gatling_fire",
  "laser_fire",
  "rocket_launch",
  "rocket_thrust",
  "game_start",
  "wave_start",
  "wave_clear",
  "explosion_large",
  "explosion_medium",
  "explosion_small",
  "explosion_ship",
  "game_over",
  "shield",
  "hyperspace",
  "disrupter",
  "crony_spawn",
  "crony_die",
  "item_pickup",
  "ufo_spawn",
  "ufo_fire",
  "ufo_die",
  "respawn",
  "recharge",
  "player_out",
  "mega_destructor"
];

function pickRandom(values) {
  if (!values?.length) {
    return null;
  }
  return values[Math.floor(Math.random() * values.length)];
}

export class AudioManager {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.buffers = new Map();
    this.musicBuffers = [];
    this.loadingStarted = false;
    this.unlocked = false;
    this.sfxVolume = 0.5;
    this.musicVolume = 0.5;
    this.currentMusicSource = null;
    this.musicGainNode = null;
    this.loops = new Map();

    this.unlock = this.unlock.bind(this);
    window.addEventListener("pointerdown", this.unlock, { once: true });
    window.addEventListener("keydown", this.unlock, { once: true });
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.musicGainNode) {
      this.musicGainNode.gain.value = enabled ? this.musicVolume : 0;
    }
  }

  async unlock() {
    if (this.unlocked) {
      return;
    }

    try {
      this.context = this.context ?? new AudioContext();
      await this.context.resume();
      this.unlocked = true;
      this.loadAssets();
    } catch (error) {
      console.warn("Audio konnte nicht initialisiert werden.", error);
    }
  }

  async loadAssets() {
    if (this.loadingStarted || !this.context) {
      return;
    }

    this.loadingStarted = true;

    this.loadMusic();
    await Promise.all(
      SOUND_EVENTS.map(async (eventName) => {
        try {
          const folderUrl = `${SOUND_ROOT}/${eventName}/`;
          const response = await fetch(folderUrl);
          if (!response.ok) {
            throw new Error(`Sound-Ordner fehlt: ${folderUrl}`);
          }

          const html = await response.text();
          const parser = new DOMParser();
          const documentRef = parser.parseFromString(html, "text/html");
          const fileUrls = [...documentRef.querySelectorAll("a[href]")]
            .map((anchor) => anchor.getAttribute("href"))
            .filter(Boolean)
            .map((href) => new URL(href, response.url))
            .filter((url) => url.pathname.toLowerCase().endsWith(".wav"))
            .map((url) => url.toString());

          if (!fileUrls.length) {
            return;
          }

          const decoded = await Promise.all(
            fileUrls.map(async (url) => {
              const fileResponse = await fetch(url);
              if (!fileResponse.ok) {
                throw new Error(`Audio-Datei fehlt: ${url}`);
              }
              const arrayBuffer = await fileResponse.arrayBuffer();
              return this.context.decodeAudioData(arrayBuffer);
            }),
          );

          const readyBuffers = decoded.filter(Boolean);
          if (readyBuffers.length) {
            this.buffers.set(eventName, readyBuffers);
          }
        } catch (error) {
          console.info(`Audio-Fallback fur ${eventName} aktiv.`, error);
        }
      }),
    );
  }

  setSfxVolume(vol) {
    this.sfxVolume = vol;
  }

  setMusicVolume(vol) {
    this.musicVolume = vol;
    if (this.musicGainNode) {
      this.musicGainNode.gain.value = this.enabled ? this.musicVolume : 0;
    }
  }

  async loadMusic() {
    if (!this.context) return;
    try {
      const folderUrl = `${SOUND_ROOT}/music/`;
      const response = await fetch(folderUrl);
      if (!response.ok) return;

      const html = await response.text();
      const parser = new DOMParser();
      const documentRef = parser.parseFromString(html, "text/html");
      const fileUrls = [...documentRef.querySelectorAll("a[href]")]
        .map((anchor) => anchor.getAttribute("href"))
        .filter(Boolean)
        .map((href) => new URL(href, response.url))
        .filter((url) => {
          const lower = url.pathname.toLowerCase();
          return lower.endsWith(".mp3") || lower.endsWith(".ogg") || lower.endsWith(".wav");
        })
        .map((url) => url.toString());

      if (!fileUrls.length) return;

      const decoded = await Promise.all(
        fileUrls.map(async (url) => {
          try {
            const fileResponse = await fetch(url);
            if (!fileResponse.ok) return null;
            const arrayBuffer = await fileResponse.arrayBuffer();
            return await this.context.decodeAudioData(arrayBuffer);
          } catch (e) {
            return null;
          }
        }),
      );

      this.musicBuffers = decoded.filter(Boolean);
      if (this.musicBuffers.length > 0 && this.unlocked) {
        this.playNextMusic();
      }
    } catch (error) {
      console.info("Keine Musik gefunden, ueberspringe Hintergrundmusik.", error);
    }
  }

  playNextMusic() {
    if (!this.context || this.musicBuffers.length === 0) return;
    if (this.currentMusicSource) {
      this.currentMusicSource.stop();
      this.currentMusicSource.disconnect();
    }
    if (!this.musicGainNode) {
      this.musicGainNode = this.context.createGain();
      this.musicGainNode.connect(this.context.destination);
    }
    
    this.musicGainNode.gain.value = this.enabled ? this.musicVolume : 0;
    
    const buffer = pickRandom(this.musicBuffers);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.musicGainNode);
    
    source.onended = () => {
      this.playNextMusic();
    };
    
    source.start();
    this.currentMusicSource = source;
  }

  _applyPanning(sourceNode, baseVolume, options) {
    if (!this.context) return { gainLeft: null, gainRight: null, merger: null };

    const gainLeft = this.context.createGain();
    const gainRight = this.context.createGain();

    let leftVol = baseVolume;
    let rightVol = baseVolume;

    const skipStereo = ["game_start", "game_over", "wave_start", "wave_clear", "respawn", "item_pickup", "shield", "recharge"].includes(options.eventName);

    if (options.x !== undefined && options.screenWidth && !skipStereo) {
      const fraction = options.x / options.screenWidth;
      if (fraction < 0.333) {
        rightVol = baseVolume * (0.5 + 0.5 * (fraction / 0.333));
      } else if (fraction > 0.666) {
        leftVol = baseVolume * (1.0 - 0.5 * ((fraction - 0.666) / 0.334));
      }
    }

    gainLeft.gain.value = leftVol;
    gainRight.gain.value = rightVol;

    const merger = this.context.createChannelMerger(2);
    merger.connect(this.context.destination);

    gainLeft.connect(merger, 0, 0);
    gainRight.connect(merger, 0, 1);

    sourceNode.connect(gainLeft);
    sourceNode.connect(gainRight);

    return { gainLeft, gainRight, merger };
  }

  play(name, options = {}) {
    if (!this.enabled) {
      return;
    }

    const volume = (options.volume ?? 0.22) * this.sfxVolume * 2;
    const playbackRate = options.playbackRate ?? 1;
    options.eventName = name;

    if (!this.context || this.context.state !== "running") {
      this.playFallback(name, volume, playbackRate, options);
      return;
    }

    const variants = this.buffers.get(name);
    const buffer = pickRandom(variants);
    if (!buffer) {
      this.playFallback(name, volume, playbackRate, options);
      return;
    }

    const gainNode = this.context.createGain();
    gainNode.gain.value = 1.0; 
    
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    source.connect(gainNode);

    this._applyPanning(gainNode, volume, options);
    source.start();
  }

  playFallback(name, volume, playbackRate = 1, options = {}) {
    if (!this.context) {
      return;
    }

    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    const profiles = {
      player_shot: { from: 440, to: 190, duration: 0.08, type: "square" },
      player_hit_push: { from: 180, to: 90, duration: 0.12, type: "sawtooth" },
      gatling_fire: { from: 620, to: 280, duration: 0.05, type: "square" },
      laser_fire: { from: 760, to: 420, duration: 0.16, type: "sawtooth" },
      rocket_launch: { from: 180, to: 80, duration: 0.24, type: "sawtooth" },
      rocket_thrust: { from: 110, to: 70, duration: 0.18, type: "triangle" },
      game_start: { from: 220, to: 440, duration: 0.18, type: "triangle" },
      wave_start: { from: 260, to: 620, duration: 0.14, type: "triangle" },
      wave_clear: { from: 480, to: 720, duration: 0.22, type: "triangle" },
      explosion_large: { from: 150, to: 26, duration: 0.34, type: "sawtooth" },
      explosion_medium: { from: 170, to: 44, duration: 0.26, type: "sawtooth" },
      explosion_small: { from: 220, to: 72, duration: 0.16, type: "sawtooth" },
      explosion_ship: { from: 130, to: 34, duration: 0.36, type: "sawtooth" },
      game_over: { from: 180, to: 60, duration: 0.42, type: "triangle" },
      shield: { from: 240, to: 380, duration: 0.14, type: "triangle" },
      hyperspace: { from: 320, to: 720, duration: 0.16, type: "triangle" },
      disrupter: { from: 120, to: 560, duration: 0.22, type: "sawtooth" },
      crony_spawn: { from: 660, to: 330, duration: 0.1, type: "square" },
      crony_die: { from: 540, to: 210, duration: 0.12, type: "square" },
      item_pickup: { from: 520, to: 760, duration: 0.1, type: "triangle" },
      ufo_spawn: { from: 410, to: 290, duration: 0.26, type: "sine" },
      ufo_fire: { from: 320, to: 180, duration: 0.1, type: "square" },
      ufo_die: { from: 260, to: 70, duration: 0.2, type: "sawtooth" },
      respawn: { from: 360, to: 540, duration: 0.14, type: "triangle" },
      recharge: { from: 440, to: 880, duration: 0.1, type: "sine" },
      player_out: { from: 220, to: 30, duration: 0.6, type: "sawtooth" },
      mega_destructor: { from: 120, to: 20, duration: 0.8, type: "square" },
    };

    const profile = profiles[name] ?? profiles.player_shot;
    const now = this.context.currentTime;

    oscillator.type = profile.type;
    oscillator.frequency.setValueAtTime(profile.from * playbackRate, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(profile.to * playbackRate, 1),
      now + profile.duration,
    );

    gainNode.gain.setValueAtTime(Math.max(0.0001, 1.0), now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);

    oscillator.connect(gainNode);
    this._applyPanning(gainNode, volume, options);

    oscillator.start(now);
    oscillator.stop(now + profile.duration);
  }

  playLoop(name, options = {}) {
    if (!this.enabled || !this.context || this.context.state !== "running") return;

    const loopKey = options.loopKey ?? name;

    // If loop already running, just update volume/pan in-place
    const existing = this.loops.get(loopKey);
    if (existing) {
      const vol = (options.volume ?? 0.2) * this.sfxVolume * 2;
      existing.gainNode.gain.value = vol;
      if (existing.panner && options.x !== undefined && options.screenWidth) {
        // Convert 0-33% left / 66-100% right to StereoPanner range [-1, 1]
        const frac = options.x / options.screenWidth;
        const pan = (frac - 0.5) * 2; // -1 (full left) to +1 (full right)
        // Clamp so centre zone stays at 0, edges reach max ±0.5 (~-6dB)
        existing.panner.pan.value = Math.max(-0.5, Math.min(0.5, pan * 0.5));
      }
      return;
    }

    // Build the audio graph ONCE
    const gainNode = this.context.createGain();
    gainNode.gain.value = (options.volume ?? 0.2) * this.sfxVolume * 2;

    let panner = null;
    try {
      panner = this.context.createStereoPanner();
      panner.pan.value = 0;
      gainNode.connect(panner);
      panner.connect(this.context.destination);
    } catch (_) {
      // StereoPanner not supported – connect directly
      gainNode.connect(this.context.destination);
    }

    const variants = this.buffers.get(name);
    const buffer = variants ? pickRandom(variants) : null;

    let source;
    if (buffer) {
      source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gainNode);
      source.start(0);
    } else {
      // Fallback: oscillator
      source = this.context.createOscillator();
      source.type = "sawtooth";
      source.frequency.value = 180;
      source.connect(gainNode);
      source.start(0);
    }

    this.loops.set(loopKey, { source, gainNode, panner });
  }

  stopLoop(name) {
    const entry = this.loops.get(name);
    if (!entry) return;
    try { entry.source.stop(); } catch (_) {}
    try { entry.source.disconnect(); } catch (_) {}
    try { entry.gainNode.disconnect(); } catch (_) {}
    try { entry.panner?.disconnect(); } catch (_) {}
    this.loops.delete(name);
  }
}
