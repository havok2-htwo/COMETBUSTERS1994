import { t } from "./i18n.js";

export const STORAGE_KEYS = {
  settings: "cometbusters.settings.v1",
  highscores: "cometbusters.highscores.v1",
};

export const PLAYER_COLORS = ["#62e2ff", "#ffb454", "#95ff7a", "#ff72cf"];

export const SPECIALS = [
  {
    id: "shield",
    label: "Shield",
    description: "Kurzzeitig unverwundbar und zerstort Objekte bei Kollision.",
  },
  {
    id: "hyperspace",
    label: "Hyperspace",
    description: "Springt an eine zufallige sichere Position.",
  },
  {
    id: "disrupter",
    label: "Disrupter",
    description: "Schockwelle, die Bullets und Cronies zerlegt und Asteroiden wegdruckt.",
  },
  {
    id: "cloak",
    label: "Cloak",
    description: "Macht das Schiff fur Cronies schwerer erfassbar.",
  },
];

export const ASTEROID_THEMES = [
  {
    id: "stone",
    name: "Comets",
    fill: "#7c6a4d",
    accent: "#d1b483",
    rim: "#f9e8c3",
    glow: "rgba(225, 184, 112, 0.12)",
  },
  {
    id: "eyeball",
    name: "Dead Planet",
    fill: "#efe7d5",
    accent: "#f571ff",
    rim: "#8b5a2b",
    glow: "rgba(255, 100, 219, 0.15)",
  },
  {
    id: "ice",
    name: "Cryo Rocks",
    fill: "#89b7d3",
    accent: "#e8fbff",
    rim: "#3c799c",
    glow: "rgba(90, 200, 255, 0.16)",
  },
  {
    id: "ember",
    name: "Inferno",
    fill: "#8a4931",
    accent: "#ffcb68",
    rim: "#ffd9a7",
    glow: "rgba(255, 145, 48, 0.14)",
  },
];

export const ASTEROID_SIZES = {
  large: { radius: 58, child: "medium", score: 120, speed: [34, 62] },
  medium: { radius: 34, child: "small", score: 200, speed: [48, 92] },
  small: { radius: 20, child: null, score: 320, speed: [80, 128] },
};

export const SCORE_VALUES = {
  crony: 350,
  ufo: 650,
  playerKill: 500,
  waveClear: 1000,
};

export const PLAYER_START_LIVES = 5;
export const MAX_PLAYERS = 4;
export const PLAYER_RADIUS = 32.4;
export const BULLET_RADIUS = 3;
export const CRONY_RADIUS = 19.2;
export const ITEM_TYPES = [
  {
    id: "rocket",
    label: "Rocket",
    color: "#ff8e52",
    glow: "rgba(255, 142, 82, 0.45)",
  },
  {
    id: "gatling",
    label: "Gatling",
    color: "#8ff5a8",
    glow: "rgba(143, 245, 168, 0.45)",
  },
  {
    id: "laser",
    label: "Laser",
    color: "#ff6fd1",
    glow: "rgba(255, 111, 209, 0.45)",
  },
  {
    id: "mega_destructor",
    label: "Mega Destructor",
    color: "#b94dff",
    glow: "rgba(185, 77, 255, 0.45)",
  },
];
export const TUNING_FIELDS = ["speed", "thrust", "shield", "burst"];
export const TUNING_TOTAL = 20;
export const TUNING_MIN = 1;
export const TUNING_MAX = 13;

export const DEFAULT_KEYBOARD_PROFILES = {
  kb1: {
    id: "kb1",
    label: "Keyboard 1",
    bindings: {
      left: "KeyA",
      right: "KeyD",
      thrust: "KeyW",
      fire: "Space",
      special: "ShiftLeft",
    },
  },
  kb2: {
    id: "kb2",
    label: "Keyboard 2",
    bindings: {
      left: "KeyJ",
      right: "KeyL",
      thrust: "KeyI",
      fire: "KeyK",
      special: "KeyU",
    },
  },
  kb3: {
    id: "kb3",
    label: "Keyboard 3",
    bindings: {
      left: "ArrowLeft",
      right: "ArrowRight",
      thrust: "ArrowUp",
      fire: "Numpad0",
      special: "Numpad1",
    },
  },
  kb4: {
    id: "kb4",
    label: "Keyboard 4",
    bindings: {
      left: "KeyF",
      right: "KeyH",
      thrust: "KeyT",
      fire: "KeyG",
      special: "KeyR",
    },
  },
};

export const DEFAULT_HIGHSCORES = [
  { initials: "BRO", score: 18130, level: 12 },
  { initials: "ACE", score: 16580, level: 11 },
  { initials: "N0V", score: 14340, level: 10 },
  { initials: "P1", score: 12110, level: 9 },
  { initials: "P2", score: 10820, level: 8 },
];

export const INPUT_ACTIONS = ["left", "right", "thrust", "fire", "special"];

export function createDefaultSettings() {
  return {
    options: {
      language: "en",
      playerCount: 1,
      asteroidBilliards: false,
      insanityMode: false,
      friendlyFire: false,
      itemsEnabled: true,
      particlesEnabled: true,
      screenShake: true,
      audioEnabled: true,
      pixelFilter: false,
      pixelSize: 1.5,
      sfxVolume: 50,
      musicVolume: 50,
    },
    keyboardProfiles: structuredClone(DEFAULT_KEYBOARD_PROFILES),
    players: Array.from({ length: MAX_PLAYERS }, (_, index) => {
      const playerId = index + 1;
      const specials = ["shield", "hyperspace", "disrupter", "cloak"];
      const defaultDevices = [
        "keyboard:kb1",
        "keyboard:kb2",
        "gamepad:0",
        "gamepad:1",
      ];

      return {
        id: playerId,
        name: `Pilot ${playerId}`,
        color: PLAYER_COLORS[index],
        enabled: playerId <= 2,
        device: defaultDevices[index],
        special: specials[index],
        tuning: normalizePlayerTuning({
          speed: 5,
          thrust: 5,
          shield: 5,
          burst: 5,
        }),
      };
    }),
  };
}

export function createDefaultPlayerState(playerConfig, spawnPoint) {
  return {
    id: playerConfig.id,
    name: playerConfig.name,
    color: playerConfig.color,
    special: playerConfig.special,
    device: playerConfig.device,
    tuning: structuredClone(playerConfig.tuning),
    x: spawnPoint.x,
    y: spawnPoint.y,
    vx: 0,
    vy: 0,
    angle: spawnPoint.angle,
    angularVelocity: 0,
    radius: PLAYER_RADIUS,
    lives: PLAYER_START_LIVES,
    score: 0,
    alive: true,
    respawnTimer: 0,
    invulnerableTimer: 2.2,
    specialCharge: 1,
    specialLockout: 0,
    specialActiveTimer: 0,
    specialSubState: "idle",
    shieldHeld: false,
    shieldActive: false,
    cloakActive: false,
    hyperspaceHidden: false,
    weaponType: null,
    weaponCharge: 0,
    weaponActiveTimer: 0,
    weaponLatchTimer: 0,
    shotCooldown: 0,
    lastHitBy: null,
    kills: 0,
  };
}

export function getSpecialLabel(id) {
  return t(`special.${id}.label`);
}

export function formatScore(score) {
  return Math.max(0, Math.round(score))
    .toString()
    .padStart(6, "0");
}

export function formatKeyCode(code) {
  if (!code) return t("keyboard.unbound");
  const map = {
    Space: "Space",
    ShiftLeft: "L-Shift",
    ShiftRight: "R-Shift",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    ArrowUp: "Up",
    ArrowDown: "Down",
    Numpad0: "Num 0",
    Numpad1: "Num 1",
    Numpad2: "Num 2",
    Numpad3: "Num 3",
    Numpad4: "Num 4",
    Numpad5: "Num 5",
    Numpad6: "Num 6",
    Numpad7: "Num 7",
    Numpad8: "Num 8",
    Numpad9: "Num 9",
    Escape: "Esc",
  };

  if (map[code]) return map[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function roundHalf(value) {
  return Math.round(value * 2) / 2;
}

export function normalizePlayerTuning(tuning) {
  const source = tuning ?? {};
  const output = {
    speed: Number(source.speed ?? 5),
    thrust: Number(source.thrust ?? 5),
    shield: Number(source.shield ?? 5),
    burst: Number(source.burst ?? 5),
  };

  for (const field of TUNING_FIELDS) {
    output[field] = roundHalf(clamp(output[field], TUNING_MIN, TUNING_MAX));
  }

  let sum = output.speed + output.thrust + output.shield + output.burst;
  if (sum === TUNING_TOTAL) {
    return output;
  }

  if (!Number.isFinite(sum) || sum <= 0) {
    return { speed: 5, thrust: 5, shield: 5, burst: 5 };
  }

  const scale = TUNING_TOTAL / sum;
  for (const field of TUNING_FIELDS) {
    output[field] = roundHalf(clamp(output[field] * scale, TUNING_MIN, TUNING_MAX));
  }

  sum = output.speed + output.thrust + output.shield + output.burst;
  const directions = ["burst", "thrust", "speed", "shield"];
  let safety = 0;
  while (sum !== TUNING_TOTAL && safety < 24) {
    safety += 1;
    const diff = roundHalf(TUNING_TOTAL - sum);
    if (diff > 0) {
      const field = directions.find((key) => output[key] <= TUNING_MAX - 0.5) ?? "speed";
      output[field] = roundHalf(output[field] + 0.5);
    } else {
      const field = directions.find((key) => output[key] >= TUNING_MIN + 0.5) ?? "speed";
      output[field] = roundHalf(output[field] - 0.5);
    }
    sum = output.speed + output.thrust + output.shield + output.burst;
  }

  return output;
}

export function adjustPlayerTuning(tuning, field, direction) {
  const next = normalizePlayerTuning(tuning);
  if (!TUNING_FIELDS.includes(field) || ![-1, 1].includes(direction)) {
    return next;
  }

  const others = TUNING_FIELDS.filter((entry) => entry !== field);
  const primaryDelta = direction;
  const otherDelta = direction > 0 ? -0.5 : 0.5;

  if (direction > 0) {
    if (next[field] > TUNING_MAX - 1) return next;
    if (others.some((entry) => next[entry] < TUNING_MIN + 0.5)) return next;
  } else {
    if (next[field] < TUNING_MIN + 1) return next;
    if (others.some((entry) => next[entry] > TUNING_MAX - 0.5)) return next;
  }

  next[field] = roundHalf(next[field] + primaryDelta);
  next[others[0]] = roundHalf(next[others[0]] + otherDelta);
  next[others[1]] = roundHalf(next[others[1]] + otherDelta);
  return normalizePlayerTuning(next);
}

export function getItemLabel(id) {
  return t(`item.${id}.label`);
}
