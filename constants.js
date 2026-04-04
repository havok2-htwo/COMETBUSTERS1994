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
  // --- Existing Levels 1–11 (original images, renamed) ---
  // Level 1
  {
    id: "stone",
    name: "Comets",
    fill: "#7c6a4d",
    accent: "#d1b483",
    rim: "#f9e8c3",
    glow: "rgba(225, 184, 112, 0.12)",
  },
  // Level 2
  {
    id: "eyeball",
    name: "DeathStar",
    fill: "#efe7d5",
    accent: "#f571ff",
    rim: "#8b5a2b",
    glow: "rgba(255, 100, 219, 0.15)",
  },
  // Level 3
  {
    id: "ice",
    name: "Solar System",
    fill: "#89b7d3",
    accent: "#e8fbff",
    rim: "#3c799c",
    glow: "rgba(90, 200, 255, 0.16)",
  },
  // Level 4
  {
    id: "ember",
    name: "Billiard Ballet",
    fill: "#8a4931",
    accent: "#ffcb68",
    rim: "#ffd9a7",
    glow: "rgba(255, 145, 48, 0.14)",
  },
  // Level 5
  {
    id: "lvl5",
    name: "Inferno",
    fill: "#b33d1a",
    accent: "#ff7a2e",
    rim: "#ffe5a3",
    glow: "rgba(255, 110, 30, 0.16)",
  },
  // Level 6
  {
    id: "lvl6",
    name: "Nebula Drift",
    fill: "#4a3477",
    accent: "#c895ff",
    rim: "#e8d0ff",
    glow: "rgba(170, 120, 255, 0.14)",
  },
  // Level 7
  {
    id: "lvl7",
    name: "Golf Genesis",
    fill: "#2d6e3f",
    accent: "#a4f5a4",
    rim: "#e0ffd8",
    glow: "rgba(100, 220, 100, 0.13)",
  },
  // Level 8
  {
    id: "lvl8",
    name: "Barney the Dinosaur",
    fill: "#7a3e9d",
    accent: "#d98fff",
    rim: "#f0d0ff",
    glow: "rgba(180, 100, 255, 0.15)",
  },
  // Level 9
  {
    id: "lvl9",
    name: "Alexa Apocalypse",
    fill: "#2c4e6e",
    accent: "#5ecfff",
    rim: "#c5ecff",
    glow: "rgba(70, 180, 255, 0.14)",
  },
  // Level 10
  {
    id: "lvl10",
    name: "Rim Resistance",
    fill: "#6b5533",
    accent: "#e8c272",
    rim: "#fff3d0",
    glow: "rgba(220, 180, 90, 0.13)",
  },
  // Level 11
  {
    id: "lvl11",
    name: "Star Sacrify",
    fill: "#8c2828",
    accent: "#ff6b6b",
    rim: "#ffd0d0",
    glow: "rgba(255, 80, 80, 0.15)",
  },
  // --- New Levels 12–46 (35 new images) ---
  // Level 12 – CD
  {
    id: "cd",
    name: "Cosmic Disc",
    fill: "#a0a8b8",
    accent: "#e4f0ff",
    rim: "#d0dcec",
    glow: "rgba(180, 200, 240, 0.13)",
  },
  // Level 13 – bowling ball
  {
    id: "bowling",
    name: "Strike Zone",
    fill: "#1a1a2e",
    accent: "#ff3d5a",
    rim: "#cc2244",
    glow: "rgba(255, 50, 80, 0.14)",
  },
  // Level 14 – cactus ball
  {
    id: "cactus",
    name: "Thorned Frontier",
    fill: "#3d7a3d",
    accent: "#b8f060",
    rim: "#e0ffa0",
    glow: "rgba(140, 220, 60, 0.13)",
  },
  // Level 15 – cannonball
  {
    id: "cannon",
    name: "Iron Barrage",
    fill: "#3a3a3a",
    accent: "#a0a0a0",
    rim: "#d0d0d0",
    glow: "rgba(150, 150, 150, 0.12)",
  },
  // Level 16 – coconut
  {
    id: "coconut",
    name: "Tropical Havoc",
    fill: "#6b4a2a",
    accent: "#c8a060",
    rim: "#f5e0b0",
    glow: "rgba(190, 150, 80, 0.13)",
  },
  // Level 17 – coin
  {
    id: "coin",
    name: "Golden Orbit",
    fill: "#c8a020",
    accent: "#ffe668",
    rim: "#fff8c0",
    glow: "rgba(255, 220, 60, 0.15)",
  },
  // Level 18 – compass
  {
    id: "compass",
    name: "Navigator's Ruin",
    fill: "#b89060",
    accent: "#f0d8a0",
    rim: "#fff0d0",
    glow: "rgba(220, 180, 100, 0.12)",
  },
  // Level 19 – balloon
  {
    id: "balloon",
    name: "Pop Panic",
    fill: "#e03040",
    accent: "#ff8888",
    rim: "#ffd0d0",
    glow: "rgba(255, 60, 80, 0.15)",
  },
  // Level 20 – tomato
  {
    id: "tomato",
    name: "Salsa Supernova",
    fill: "#cc2020",
    accent: "#ff6040",
    rim: "#ffa080",
    glow: "rgba(255, 70, 30, 0.14)",
  },
  // Level 21 – cookie
  {
    id: "cookie",
    name: "Crumble Core",
    fill: "#c8944a",
    accent: "#e8c888",
    rim: "#fff0d0",
    glow: "rgba(200, 160, 80, 0.13)",
  },
  // Level 22 – cosmic donut
  {
    id: "cosmic_donut",
    name: "Galactic Glaze",
    fill: "#e070b0",
    accent: "#ffb0e0",
    rim: "#ffe0f0",
    glow: "rgba(255, 130, 200, 0.15)",
  },
  // Level 23 – crystal ball
  {
    id: "crystal",
    name: "Crystal Prophecy",
    fill: "#6080c0",
    accent: "#a0c8ff",
    rim: "#d8ecff",
    glow: "rgba(120, 170, 255, 0.16)",
  },
  // Level 24 – cupcake
  {
    id: "cupcake",
    name: "Frosted Fury",
    fill: "#e89070",
    accent: "#ffc0a8",
    rim: "#ffe8d8",
    glow: "rgba(255, 160, 120, 0.14)",
  },
  // Level 25 – daisy
  {
    id: "daisy",
    name: "Petal Storm",
    fill: "#f0e040",
    accent: "#fff890",
    rim: "#fffce0",
    glow: "rgba(240, 230, 60, 0.13)",
  },
  // Level 26 – disco ball
  {
    id: "disco",
    name: "Disco Detonation",
    fill: "#c0c0d0",
    accent: "#e8e8ff",
    rim: "#f8f8ff",
    glow: "rgba(200, 200, 255, 0.16)",
  },
  // Level 27 – donut
  {
    id: "donut",
    name: "Sugar Rush",
    fill: "#d8904a",
    accent: "#f0c080",
    rim: "#ffe8c0",
    glow: "rgba(220, 160, 70, 0.13)",
  },
  // Level 28 – flower head
  {
    id: "flower",
    name: "Blossom Barrage",
    fill: "#d05090",
    accent: "#ff90c0",
    rim: "#ffd0e8",
    glow: "rgba(255, 100, 170, 0.14)",
  },
  // Level 29 – frisbee
  {
    id: "frisbee",
    name: "Disc Overdrive",
    fill: "#2080d0",
    accent: "#60b8ff",
    rim: "#b0e0ff",
    glow: "rgba(50, 150, 255, 0.15)",
  },
  // Level 30 – marshmallow
  {
    id: "marshmallow",
    name: "Marshmallow Mayhem",
    fill: "#f0e8e0",
    accent: "#fff8f0",
    rim: "#ffffff",
    glow: "rgba(240, 230, 220, 0.12)",
  },
  // Level 31 – rubber ball
  {
    id: "rubber_ball",
    name: "Bounce Blitz",
    fill: "#d03020",
    accent: "#ff6050",
    rim: "#ffa090",
    glow: "rgba(255, 60, 40, 0.14)",
  },
  // Level 32 – magic orb
  {
    id: "magic_orb",
    name: "Arcane Tempest",
    fill: "#4030a0",
    accent: "#9080ff",
    rim: "#c8c0ff",
    glow: "rgba(120, 100, 255, 0.16)",
  },
  // Level 33 – meatball
  {
    id: "meatball",
    name: "Meatball Madness",
    fill: "#8a4028",
    accent: "#c87050",
    rim: "#e8a888",
    glow: "rgba(180, 90, 50, 0.13)",
  },
  // Level 34 – melon
  {
    id: "melon",
    name: "Melon Meltdown",
    fill: "#308830",
    accent: "#80e060",
    rim: "#c0ffa0",
    glow: "rgba(80, 200, 60, 0.14)",
  },
  // Level 35 – plasma orb
  {
    id: "plasma",
    name: "Plasma Protocol",
    fill: "#3060c0",
    accent: "#60a0ff",
    rim: "#a0d0ff",
    glow: "rgba(60, 130, 255, 0.16)",
  },
  // Level 36 – pufferfish
  {
    id: "puffer",
    name: "Pufferfish Peril",
    fill: "#c8b050",
    accent: "#f0e080",
    rim: "#fff8c0",
    glow: "rgba(220, 190, 60, 0.13)",
  },
  // Level 37 – pumpkin
  {
    id: "pumpkin",
    name: "Pumpkin Purge",
    fill: "#d87020",
    accent: "#ffa040",
    rim: "#ffd090",
    glow: "rgba(240, 130, 30, 0.15)",
  },
  // Level 38 – robot head
  {
    id: "robot",
    name: "Mech Massacre",
    fill: "#607080",
    accent: "#90b0c8",
    rim: "#c8dce8",
    glow: "rgba(100, 140, 180, 0.14)",
  },
  // Level 39 – rose bloom
  {
    id: "rose",
    name: "Rose Revolution",
    fill: "#c0304a",
    accent: "#ff6880",
    rim: "#ffb0c0",
    glow: "rgba(255, 70, 100, 0.15)",
  },
  // Level 40 – rubber duck
  {
    id: "duck",
    name: "Quack Attack",
    fill: "#f0d030",
    accent: "#fff060",
    rim: "#fffca0",
    glow: "rgba(250, 220, 30, 0.14)",
  },
  // Level 41 – snowball
  {
    id: "snow",
    name: "Blizzard Burst",
    fill: "#d8e8f0",
    accent: "#f0f8ff",
    rim: "#ffffff",
    glow: "rgba(200, 230, 255, 0.14)",
  },
  // Level 42 – sunflower
  {
    id: "sunflower",
    name: "Solar Bloom",
    fill: "#e0b020",
    accent: "#ffe050",
    rim: "#fff8a0",
    glow: "rgba(240, 200, 30, 0.14)",
  },
  // Level 43 – vinyl record
  {
    id: "vinyl",
    name: "Vinyl Vendetta",
    fill: "#1a1a1a",
    accent: "#505060",
    rim: "#909098",
    glow: "rgba(80, 80, 100, 0.13)",
  },
  // Level 44 – apple
  {
    id: "apple",
    name: "Apple Armageddon",
    fill: "#c02020",
    accent: "#ff4040",
    rim: "#ff9090",
    glow: "rgba(255, 40, 40, 0.14)",
  },
  // Level 45 – eyeball
  {
    id: "eyeball_new",
    name: "Ocular Onslaught",
    fill: "#e8e0d0",
    accent: "#e060ff",
    rim: "#906030",
    glow: "rgba(230, 80, 255, 0.15)",
  },
  // Level 46 – orange
  {
    id: "orange",
    name: "Citrus Siege",
    fill: "#e08020",
    accent: "#ffa040",
    rim: "#ffd090",
    glow: "rgba(240, 150, 30, 0.14)",
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
  {
    id: "extra_life",
    label: "Extra Life",
    color: "#ff4080",
    glow: "rgba(255, 64, 128, 0.50)",
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
