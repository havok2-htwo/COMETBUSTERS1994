import {
  ASTEROID_SIZES,
  ASTEROID_THEMES,
  BULLET_RADIUS,
  CRONY_RADIUS,
  ITEM_TYPES,
  MAX_PLAYERS,
  PLAYER_RADIUS,
  SCORE_VALUES,
  createDefaultPlayerState,
  createDefaultSettings,
  formatScore,
  getItemLabel,
  getSpecialLabel,
} from "./constants.js";
import { qualifiesForHighscore } from "./storage.js";

const TWO_PI = Math.PI * 2;
const BULLET_SPEED = 560;
const BULLET_LIFETIME = 1.15;
const NORMAL_WEAPON_RANGE = BULLET_SPEED * BULLET_LIFETIME;
const RESPAWN_DELAY = 2.6;
const SAFE_RESPAWN_DISTANCE = 156;
const WAVE_SAFE_RADIUS = 210;
const CRONY_THRUST = 144;
const CRONY_MAX_SPEED = 270;
const ITEM_MAX_SPEED = 90;
const ROCKET_SPEED = 500;
const ROCKET_HOMING = 260;
const ROCKET_MAX_SPEED = 620;
const ROCKET_VOLLEY_SIZE = 4;
const SHIELD_LOCKOUT = 5;
const GENERIC_RECHARGE = 0.2;
const ITEM_SPAWN_MIN = 14;
const ITEM_SPAWN_MAX = 22;
const UFO_RADIUS = 35;
const UFO_SPAWN_MIN = 18;
const UFO_SPAWN_MAX = 32;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function wrap(value, limit) {
  if (value < 0) return value + limit;
  if (value >= limit) return value - limit;
  return value;
}

function toroidalDelta(from, to, size) {
  let delta = to - from;
  if (delta > size * 0.5) delta -= size;
  if (delta < -size * 0.5) delta += size;
  return delta;
}

function toroidalDistance(entityA, entityB, width, height) {
  const dx = toroidalDelta(entityA.x, entityB.x, width);
  const dy = toroidalDelta(entityA.y, entityB.y, height);
  return { dx, dy, distance: Math.hypot(dx, dy) };
}

function normalizeVector(x, y) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length, length };
}

function vectorFromAngle(angle) {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function perpendicular(x, y) {
  return { x: -y, y: x };
}

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function themeForLevel(level) {
  return ASTEROID_THEMES[(level - 1) % ASTEROID_THEMES.length];
}

function spawnPoints(width, height) {
  const margin = Math.min(width, height) * 0.22;
  return [
    { x: margin, y: margin, angle: Math.PI * 0.25 },
    { x: width - margin, y: margin, angle: Math.PI * 0.75 },
    { x: margin, y: height - margin, angle: Math.PI * 1.75 },
    { x: width - margin, y: height - margin, angle: Math.PI * 1.25 },
  ];
}

function asteroidMass(asteroid) {
  const map = {
    large: 132,
    medium: 78,
    small: 44,
  };
  return map[asteroid.size] ?? 60;
}

function createAsteroidShape(radius) {
  const pointCount = randInt(8, 12);
  return Array.from({ length: pointCount }, (_, index) => {
    const angle = (index / pointCount) * TWO_PI;
    const variance = rand(0.72, 1.22);
    return {
      x: Math.cos(angle) * radius * variance,
      y: Math.sin(angle) * radius * variance,
    };
  });
}

function createStars(width, height, count = 170) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: rand(0.9, 2.4),
    alpha: rand(0.18, 0.95),
    speed: rand(0.3, 1.2),
    twinkle: rand(0, TWO_PI),
  }));
}

function withAlpha(color, alpha) {
  const clampedAlpha = clamp(alpha, 0, 1);

  if (color.startsWith("rgba(")) {
    const parts = color.slice(5, -1).split(",").map((part) => part.trim());
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${clampedAlpha})`;
  }

  if (color.startsWith("rgb(")) {
    const parts = color.slice(4, -1).split(",").map((part) => part.trim());
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${clampedAlpha})`;
  }

  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const normalizedHex =
      hex.length === 3
        ? hex
            .split("")
            .map((value) => value + value)
            .join("")
        : hex;

    const r = Number.parseInt(normalizedHex.slice(0, 2), 16);
    const g = Number.parseInt(normalizedHex.slice(2, 4), 16);
    const b = Number.parseInt(normalizedHex.slice(4, 6), 16);

    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
    }
  }

  return color;
}

function formatLevel(level) {
  return `Level ${String(level).padStart(2, "0")}`;
}

function findTheme(themeId) {
  return ASTEROID_THEMES.find((entry) => entry.id === themeId) ?? ASTEROID_THEMES[0];
}

function segmentCircleHit(start, end, circle, width, height) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dot = dx * dx + dy * dy || 1;

  for (let offsetX = -width; offsetX <= width; offsetX += width) {
    for (let offsetY = -height; offsetY <= height; offsetY += height) {
      const cx = circle.x + offsetX;
      const cy = circle.y + offsetY;
      const fx = cx - start.x;
      const fy = cy - start.y;
      const t = clamp((fx * dx + fy * dy) / dot, 0, 1);
      const closestX = start.x + dx * t;
      const closestY = start.y + dy * t;
      const distance = Math.hypot(cx - closestX, cy - closestY);

      if (distance <= circle.radius) {
        return { hit: true, t, x: wrap(closestX, width), y: wrap(closestY, height), distance };
      }
    }
  }

  return { hit: false };
}

export class CometBustersGame {
  constructor(canvas, input, audio, textures = {}, callbacks = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    this.pixelCanvas = document.createElement("canvas");
    this.pixelCtx = this.pixelCanvas.getContext("2d", { alpha: false });
    this.input = input;
    this.audio = audio;
    this.textures = textures;
    this.callbacks = callbacks;

    this.settings = createDefaultSettings();
    this.highscores = [];
    this.players = [];
    this.asteroids = [];
    this.bullets = [];
    this.rockets = [];
    this.cronies = [];
    this.ufos = [];
    this.items = [];
    this.laserBeams = [];
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
    this.stars = [];

    this.width = 0;
    this.height = 0;
    this.devicePixelRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    this.started = false;
    this.paused = false;
    this.pauseLocked = false;
    this.awaitingHighscoreEntry = false;
    this.lastTimestamp = 0;
    this.level = 0;
    this.countdownTimer = 0;
    this.betweenRoundsTimer = 0;
    this.bannerText = "Comet Busters";
    this.bannerSubtext = "Spiel starten, um loszulegen";
    this.bannerPulse = 0;
    this.theme = ASTEROID_THEMES[0];
    this.cameraShake = 0;
    this.gameOverHandled = false;
    this.waveActive = false;
    this.ambientCronyTimer = 9;
    this.itemSpawnTimer = rand(ITEM_SPAWN_MIN, ITEM_SPAWN_MAX);
    this.ufoSpawnTimer = rand(UFO_SPAWN_MIN, UFO_SPAWN_MAX);
    this.rocketThrusterAudioTimer = 0;
    this.clock = 0;
    this.frameHandle = 0;

    this.handleResize = this.handleResize.bind(this);
    this.loop = this.loop.bind(this);

    window.addEventListener("resize", this.handleResize);
    this.handleResize();
    this.frameHandle = requestAnimationFrame(this.loop);
  }

  destroy() {
    cancelAnimationFrame(this.frameHandle);
    window.removeEventListener("resize", this.handleResize);
  }

  setHighscores(highscores) {
    this.highscores = highscores;
  }

  setSettings(settings) {
    this.settings = structuredClone(settings);
    this.audio.setEnabled(this.settings.options.audioEnabled);
  }

  start(settings, highscores) {
    this.setSettings(settings);
    this.setHighscores(highscores);
    this.started = true;
    this.paused = false;
    this.awaitingHighscoreEntry = false;
    this.gameOverHandled = false;
    this.bannerPulse = 0;
    this.cameraShake = 0;
    this.clearWorld();
    this.players = this.createRuntimePlayers();
    this.beginLevel(1, { freshMatch: true });
    this.audio.play("game_start", { volume: 0.25 });
    this.callbacks.onPauseChange?.(false);
  }

  restart() {
    this.start(this.settings, this.highscores);
  }

  clearWorld() {
    this.asteroids = [];
    this.bullets = [];
    this.rockets = [];
    this.cronies = [];
    this.ufos = [];
    this.items = [];
    this.laserBeams = [];
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
    this.waveActive = false;
    this.rocketThrusterAudioTimer = 0;
  }

  createRuntimePlayers() {
    const points = spawnPoints(this.width, this.height);
    const enabledPlayers = this.settings.players.filter((player) => player.enabled).slice(0, MAX_PLAYERS);
    const fallback = enabledPlayers.length ? enabledPlayers : [this.settings.players[0]];

    return fallback.map((playerConfig, index) => {
      const spawnPoint = points[index] ?? points[0];
      const player = createDefaultPlayerState(playerConfig, spawnPoint);
      player.spawnPointIndex = index;
      player.stats = this.buildStats(playerConfig);
      player.trailTimer = 0;
      player.flashTimer = 0;
      player.specialCharge = 1;
      player.weaponCharge = 0;
      return player;
    });
  }

  buildStats(playerConfig) {
    const tuning = playerConfig.tuning;
    const speed = clamp(Number(tuning.speed ?? 5), 1, 13);
    const thrust = clamp(Number(tuning.thrust ?? 5), 1, 13);
    const shield = clamp(Number(tuning.shield ?? 5), 1, 13);
    const burst = clamp(Number(tuning.burst ?? 5), 1, 13);

    return {
      maxSpeed: 108 + speed * 18,
      thrustPower: 68 + thrust * 19,
      turnAcceleration: (8.4 + speed * 0.44) * 1.5,
      turnDrag: 3.6,
      mass: 28 + shield * 2.5,
      bulletCooldown: clamp(0.3 - burst * 0.015, 0.08, 0.3),
      spawnInvulnerability: 1.9,
      shieldDrain: clamp(0.42 - shield * 0.014, 0.19, 0.42),
      shieldRecharge: 0.1 + shield * 0.013,
      specialRecharge: GENERIC_RECHARGE,
      impactScale: 1 + speed * 0.035,
    };
  }

  handleResize() {
    const stage = this.canvas.parentElement ?? document.body;
    const width = Math.max(640, Math.round(stage.clientWidth || window.innerWidth));
    const height = Math.max(480, Math.round(stage.clientHeight || window.innerHeight));

    this.width = width;
    this.height = height;

    this.canvas.width = Math.round(width * this.devicePixelRatio);
    this.canvas.height = Math.round(height * this.devicePixelRatio);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.context.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0);
    this.stars = createStars(width, height);
  }

  beginLevel(level, { freshMatch = false } = {}) {
    this.level = level;
    this.theme = themeForLevel(level);
    this.waveActive = false;
    this.countdownTimer = 3.4;
    this.betweenRoundsTimer = 0;
    this.ambientCronyTimer = clamp(12 - level * 0.4, 4.4, 12);
    this.itemSpawnTimer = rand(ITEM_SPAWN_MIN, ITEM_SPAWN_MAX);
    this.ufoSpawnTimer = rand(
      Math.max(8, UFO_SPAWN_MIN - Math.min(7, level * 0.5)),
      Math.max(14, UFO_SPAWN_MAX - Math.min(10, level * 0.45)),
    );
    this.bannerText = formatLevel(level);
    this.bannerSubtext = this.theme.name;
    this.bannerPulse = 2.8;

    const points = spawnPoints(this.width, this.height);
    this.asteroids = [];
    this.bullets = [];
    this.rockets = [];
    this.cronies = [];
    this.ufos = [];
    this.laserBeams = [];
    this.shockwaves = this.shockwaves.filter((wave) => !wave.damaging);

    for (const player of this.players) {
      player.flashTimer = 0;
      player.shieldHeld = false;
      player.shieldActive = false;
      player.cloakActive = false;
      player.hyperspaceHidden = false;
      player.specialActiveTimer = 0;
      player.weaponActiveTimer = 0;
      player.weaponLatchTimer = 0;
      player.shotCooldown = 0;
      if (player.lives <= 0) {
        player.alive = false;
        continue;
      }

      if (freshMatch) {
        const spawnPoint = points[player.spawnPointIndex] ?? points[0];
        player.x = spawnPoint.x;
        player.y = spawnPoint.y;
        player.vx = 0;
        player.vy = 0;
        player.angle = spawnPoint.angle;
        player.angularVelocity = 0;
        player.specialCharge = 1;
        player.specialLockout = 0;
        player.weaponType = null;
        player.weaponCharge = 0;
      }

      if (!player.alive && player.lives > 0) {
        player.respawnTimer = Math.max(player.respawnTimer, 1.2);
      }
    }
  }

  togglePause(forceValue = null) {
    if (!this.started || this.awaitingHighscoreEntry) {
      return;
    }

    const nextValue = forceValue ?? !this.paused;
    this.paused = nextValue;
    this.callbacks.onPauseChange?.(this.paused);
  }

  loop(timestamp) {
    if (!this.lastTimestamp) {
      this.lastTimestamp = timestamp;
    }

    const deltaSeconds = clamp((timestamp - this.lastTimestamp) / 1000, 0, 0.05);
    this.lastTimestamp = timestamp;

    this.update(deltaSeconds);
    this.render();

    this.frameHandle = requestAnimationFrame(this.loop);
  }

  update(deltaSeconds) {
    this.clock += deltaSeconds;
    this.bannerPulse = Math.max(0, this.bannerPulse - deltaSeconds);
    this.cameraShake = Math.max(0, this.cameraShake - deltaSeconds * 1.35);
    this.input.update(this.settings);

    if (this.input.wasPausePressed() && !this.pauseLocked) {
      this.togglePause();
      this.pauseLocked = true;
    }

    if (!this.input.wasPausePressed()) {
      this.pauseLocked = false;
    }

    this.updateStars(deltaSeconds);
    this.updateFloatingTexts(deltaSeconds);
    this.updateParticles(deltaSeconds);
    this.updateShockwaves(deltaSeconds);

    if (!this.started || this.paused) {
      return;
    }

    if (this.countdownTimer > 0) {
      this.countdownTimer -= deltaSeconds;
      if (this.countdownTimer <= 0) {
        this.countdownTimer = 0;
        this.spawnWave();
      }
    }

    if (this.betweenRoundsTimer > 0) {
      this.betweenRoundsTimer -= deltaSeconds;
      if (this.betweenRoundsTimer <= 0) {
        this.betweenRoundsTimer = 0;
        this.beginLevel(this.level + 1);
      }
    }

    if (this.isGameOver()) {
      this.handleGameOver();
      return;
    }

    this.updatePlayers(deltaSeconds);
    this.updateBullets(deltaSeconds);
    this.updateRockets(deltaSeconds);
    this.updateAsteroids(deltaSeconds);
    this.updateCronies(deltaSeconds);
    this.updateUfos(deltaSeconds);
    this.updateItems(deltaSeconds);
    this.rebuildLaserBeams();
    this.handleShockwaveHits();
    this.handleBulletHits();
    this.handleRocketHits();
    this.handleLaserHits();
    this.handlePlayerCollisions();
    this.handleItemPickups();

    if (this.settings.options.asteroidBilliards) {
      this.handleAsteroidBilliards();
    }

    this.tryRespawns(deltaSeconds);
    // this.tryAmbientCronySpawn(deltaSeconds);
    this.tryUfoSpawn(deltaSeconds);
    this.tryItemSpawn(deltaSeconds);
    this.cleanupEntities();

    if (this.waveActive && !this.asteroids.length && !this.cronies.length && !this.ufos.length) {
      this.handleWaveClear();
    }
  }

  updateStars(deltaSeconds) {
    for (const star of this.stars) {
      star.y += star.speed * deltaSeconds * 8;
      star.twinkle += deltaSeconds * star.speed * 0.8;
      if (star.y > this.height + 4) {
        star.y = -4;
        star.x = Math.random() * this.width;
      }
    }
  }

  spawnWave() {
    this.waveActive = true;
    const count = clamp(1 + Math.floor((this.level - 1) / 2) + randInt(0, 2), 1, 10);
    for (let index = 0; index < count; index += 1) {
      const position = this.findWaveSpawnLocation(ASTEROID_SIZES.large.radius);
      this.asteroids.push(this.createAsteroid("large", position.x, position.y));
    }
    this.audio.play("wave_start", { volume: 0.16, playbackRate: 1.06 });
  }

  createAsteroid(size, x, y, overrides = {}) {
    const sizeConfig = ASTEROID_SIZES[size];
    const angle = rand(0, TWO_PI);
    const speed = rand(sizeConfig.speed[0], sizeConfig.speed[1]) * (1 + this.level * 0.04);
    const direction = vectorFromAngle(angle);

    return {
      id: makeId("asteroid"),
      kind: "asteroid",
      size,
      x,
      y,
      vx: overrides.vx ?? direction.x * speed,
      vy: overrides.vy ?? direction.y * speed,
      angle: overrides.angle ?? rand(0, TWO_PI),
      angularVelocity: overrides.angularVelocity ?? rand(-1.2, 1.2),
      radius: sizeConfig.radius,
      themeId: overrides.themeId ?? this.theme.id,
      shape: overrides.shape ?? createAsteroidShape(sizeConfig.radius),
      dead: false,
    };
  }

  createBullet(source, options = {}) {
    const spread = options.spread ?? 0;
    const angle = (options.angle ?? source.angle ?? 0) + spread;
    const heading = vectorFromAngle(angle);
    const spawnDistance = options.spawnDistance ?? (source.radius ?? PLAYER_RADIUS) + 8;
    const speed = BULLET_SPEED * (options.speedMultiplier ?? 1);
    const inheritedVx = options.inheritVx ?? source.vx ?? 0;
    const inheritedVy = options.inheritVy ?? source.vy ?? 0;

    return {
      id: makeId("bullet"),
      kind: "bullet",
      x: wrap(source.x + heading.x * spawnDistance, this.width),
      y: wrap(source.y + heading.y * spawnDistance, this.height),
      vx: inheritedVx + heading.x * speed,
      vy: inheritedVy + heading.y * speed,
      life: BULLET_LIFETIME * (options.lifeMultiplier ?? 1),
      radius: BULLET_RADIUS,
      ownerId: options.ownerId ?? source.id ?? null,
      sourceId: options.sourceId ?? source.id ?? null,
      sourceKind: options.sourceKind ?? source.kind ?? "player",
      color: options.color ?? source.color ?? "#ffffff",
      push: options.push ?? 210,
      deadly: options.deadly ?? true,
      dead: false,
    };
  }

  createRocket(player, spread = 0, laneIndex = 0, laneCount = 1) {
    const angle = player.angle + spread;
    const heading = vectorFromAngle(angle);
    const side = perpendicular(heading.x, heading.y);
    const laneOffset = laneCount <= 1 ? 0 : (laneIndex - (laneCount - 1) / 2) * 9;
    return {
      id: makeId("rocket"),
      kind: "rocket",
      ownerId: player.id,
      x: wrap(player.x + heading.x * (player.radius + 16) + side.x * laneOffset, this.width),
      y: wrap(player.y + heading.y * (player.radius + 16) + side.y * laneOffset, this.height),
      vx: player.vx + heading.x * ROCKET_SPEED,
      vy: player.vy + heading.y * ROCKET_SPEED,
      angle,
      radius: 7,
      life: 6,
      armTimer: 0.18,
      color: "#ff9d54",
      dead: false,
    };
  }

  createUfo() {
    const fromLeft = Math.random() < 0.5;
    const y = rand(this.height * 0.18, this.height * 0.82);
    const speed = rand(150, 210) + this.level * 4.5;
    const direction = fromLeft ? 1 : -1;

    return {
      id: makeId("ufo"),
      kind: "ufo",
      x: fromLeft ? -UFO_RADIUS * 2.4 : this.width + UFO_RADIUS * 2.4,
      y,
      baseY: y,
      vx: speed * direction,
      vy: 0,
      angle: direction > 0 ? 0 : Math.PI,
      radius: UFO_RADIUS,
      amplitude: rand(38, 92),
      zigzagSpeed: rand(2.4, 4.3),
      phase: rand(0, TWO_PI),
      fireTimer: rand(0.8, 1.9),
      dead: false,
    };
  }

  createItem(type, x, y) {
    return {
      id: makeId("item"),
      kind: "item",
      type,
      x,
      y,
      vx: rand(-ITEM_MAX_SPEED, ITEM_MAX_SPEED),
      vy: rand(-ITEM_MAX_SPEED, ITEM_MAX_SPEED),
      angle: rand(0, TWO_PI),
      angularVelocity: rand(-2.4, 2.4),
      radius: 15,
      dead: false,
    };
  }

  updatePlayers(deltaSeconds) {
    let anyThrusting = false;
    for (const player of this.players) {
      const controls = this.input.getPlayerState(player.id);
      player.flashTimer = Math.max(0, player.flashTimer - deltaSeconds);
      player.shotCooldown = Math.max(0, player.shotCooldown - deltaSeconds);
      player.invulnerableTimer = Math.max(0, player.invulnerableTimer - deltaSeconds);
      player.specialLockout = Math.max(0, player.specialLockout - deltaSeconds);
      player.weaponActiveTimer = Math.max(0, player.weaponActiveTimer - deltaSeconds);
      player.weaponLatchTimer = Math.max(0, player.weaponLatchTimer - deltaSeconds);

      if (!player.alive) {
        player.shieldActive = false;
        player.cloakActive = false;
        player.hyperspaceHidden = false;
        continue;
      }

      this.updatePlayerSpecial(player, controls, deltaSeconds);
      if (player.hyperspaceHidden) {
        continue;
      }

      const turnInput = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
      player.angularVelocity += turnInput * player.stats.turnAcceleration * deltaSeconds;
      player.angularVelocity *= Math.max(0.74, 1 - player.stats.turnDrag * deltaSeconds);
      player.angle += player.angularVelocity * deltaSeconds;

      if (controls.thrust) {
        anyThrusting = true;
        const thrustDirection = vectorFromAngle(player.angle);
        const oldSpeed = Math.hypot(player.vx, player.vy);

        player.vx += thrustDirection.x * player.stats.thrustPower * deltaSeconds;
        player.vy += thrustDirection.y * player.stats.thrustPower * deltaSeconds;

        const newSpeed = Math.hypot(player.vx, player.vy);
        if (newSpeed > player.stats.maxSpeed && newSpeed > oldSpeed) {
          const limit = Math.max(player.stats.maxSpeed, oldSpeed);
          const ratio = limit / newSpeed;
          player.vx *= ratio;
          player.vy *= ratio;
        }

        const backX = player.x - thrustDirection.x * player.radius;
        const backY = player.y - thrustDirection.y * player.radius;
        const pushRadius = player.radius * 6.0;
        const pushStrength = 4550 * deltaSeconds;

        const looseEntities = [...this.asteroids, ...this.cronies, ...this.items, ...this.players.filter(p => this.isPlayerSolid(p) && p.id !== player.id)];
        for (const entity of looseEntities) {
          if (entity.dead) continue;
          const delta = toroidalDistance({x: backX, y: backY}, entity, this.width, this.height);
          if (delta.distance < pushRadius + entity.radius) {
            const heading = normalizeVector(delta.dx, delta.dy);
            const strength = pushStrength * (1 - delta.distance / (pushRadius + entity.radius));
            this.applyImpactAtPoint(entity, heading.x, heading.y, strength, entity.x, entity.y);
          }
        }

        player.trailTimer -= deltaSeconds;
        if (this.settings.options.particlesEnabled && player.trailTimer <= 0) {
          player.trailTimer = 0.022;
          this.spawnThrusterParticles(player);
        }
      } else {
        player.trailTimer = 0;
      }

      this.updatePlayerFire(player, controls, deltaSeconds);
      player.x = wrap(player.x + player.vx * deltaSeconds, this.width);
      player.y = wrap(player.y + player.vy * deltaSeconds, this.height);
    }
    
    this.playerThrusterAudioTimer = Math.max(0, (this.playerThrusterAudioTimer || 0) - deltaSeconds);
    if (anyThrusting && this.playerThrusterAudioTimer <= 0) {
      this.audio.play("rocket_thrust", { volume: 0.07, playbackRate: rand(1.15, 1.35) });
      this.playerThrusterAudioTimer = 0.15;
    }
  }

  updatePlayerSpecial(player, controls, deltaSeconds) {
    const canRecharge = !player.shieldActive && !player.cloakActive && !player.hyperspaceHidden;

    if (player.special === "shield") {
      player.shieldHeld = controls.special;
      if (player.shieldHeld && player.specialCharge > 0 && player.specialLockout <= 0) {
        player.shieldActive = true;
        player.specialCharge = Math.max(0, player.specialCharge - player.stats.shieldDrain * deltaSeconds);
        if (player.specialCharge <= 0.001) {
          player.specialCharge = 0;
          player.shieldActive = false;
          player.specialLockout = SHIELD_LOCKOUT;
        }
      } else {
        player.shieldActive = false;
        if (player.specialLockout <= 0) {
          player.specialCharge = Math.min(1, player.specialCharge + player.stats.shieldRecharge * deltaSeconds);
        }
      }
      return;
    }

    if (player.special === "cloak") {
      if (controls.specialPressed && !player.cloakActive && player.specialCharge >= 1 && player.specialLockout <= 0) {
        player.cloakActive = true;
        player.specialActiveTimer = 4.6;
        player.specialCharge = 0;
        this.spawnVisualWave(player.x, player.y, 70, "rgba(213, 241, 255, 0.65)", 0.4, 5);
        this.audio.play("shield", { volume: 0.12, playbackRate: 1.5 });
      }

      if (player.cloakActive) {
        player.specialActiveTimer -= deltaSeconds;
        if (player.specialActiveTimer <= 0) {
          player.cloakActive = false;
          if (this.overlapsSolid(player)) {
            this.destroyPlayer(player);
          }
        }
      } else if (canRecharge) {
        player.specialCharge = Math.min(1, player.specialCharge + GENERIC_RECHARGE * deltaSeconds);
      }
      return;
    }

    if (player.special === "hyperspace") {
      if (controls.specialPressed && !player.hyperspaceHidden && player.specialCharge >= 1 && player.specialLockout <= 0) {
        player.hyperspaceHidden = true;
        player.specialActiveTimer = 5;
        player.specialCharge = 0;
        player.vx = 0;
        player.vy = 0;
        this.spawnVisualWave(player.x, player.y, 96, player.color, 0.55, 5);
        this.audio.play("hyperspace", { volume: 0.18 });
      }

      if (player.hyperspaceHidden) {
        player.specialActiveTimer -= deltaSeconds;
        if (player.specialActiveTimer <= 0) {
          const destination = this.findSafeLocation(150);
          player.x = destination.x;
          player.y = destination.y;
          player.hyperspaceHidden = false;
          player.invulnerableTimer = Math.max(player.invulnerableTimer, 1.2);
          this.spawnVisualWave(player.x, player.y, 110, player.color, 0.55, 5);
        }
      } else if (canRecharge) {
        player.specialCharge = Math.min(1, player.specialCharge + GENERIC_RECHARGE * deltaSeconds);
      }
      return;
    }

    if (player.special === "disrupter") {
      if (controls.specialPressed && player.specialCharge >= 1 && player.specialLockout <= 0) {
        this.shockwaves.push({
          id: makeId("wave"),
          kind: "shockwave",
          ownerId: player.id,
          x: player.x,
          y: player.y,
          radius: 0,
          lastRadius: 0,
          maxRadius: 240 + player.stats.impactScale * 24,
          life: 0.52,
          maxLife: 0.52,
          tint: "rgba(146, 235, 255, 0.95)",
          width: 4,
          damaging: true,
        });
        player.specialCharge = 0;
        this.audio.play("disrupter", { volume: 0.18 });
      } else {
        const rechargeRate = player.special === "disrupter" ? GENERIC_RECHARGE * 0.5 : GENERIC_RECHARGE;
        player.specialCharge = Math.min(1, player.specialCharge + rechargeRate * deltaSeconds);
      }
    }
  }

  updatePlayerFire(player, controls, deltaSeconds) {
    if (player.weaponType === "laser") {
      if (controls.firePressed && player.weaponCharge > 0) {
        player.weaponLatchTimer = Math.max(player.weaponLatchTimer, 0.5);
        this.audio.play("laser_fire", { volume: 0.16, playbackRate: rand(0.96, 1.08) });
      }
      if (controls.fire && player.weaponCharge > 0) {
        player.weaponLatchTimer = Math.max(player.weaponLatchTimer, 0.14);
      }
      if (player.weaponLatchTimer > 0 && player.weaponCharge > 0) {
        player.weaponActiveTimer = Math.max(player.weaponActiveTimer, 0.06);
        player.weaponCharge = Math.max(0, player.weaponCharge - deltaSeconds / 2.1);
        if (player.weaponCharge <= 0) {
          this.clearWeapon(player);
        }
      }
      return;
    }

    if (player.weaponType === "gatling") {
      if (controls.fire && player.shotCooldown <= 0 && player.weaponCharge > 0) {
        this.bullets.push(
          this.createBullet(player, {
            spread: rand(-0.045, 0.045),
            lifeMultiplier: 1.25,
            push: 220,
          }),
        );
        player.shotCooldown = Math.max(0.03, player.stats.bulletCooldown / 3);
        player.weaponCharge = Math.max(0, player.weaponCharge - 0.02166);
        player.flashTimer = 0.06;
        this.audio.play("gatling_fire", { volume: 0.1, playbackRate: rand(1.08, 1.24) });
        if (player.weaponCharge <= 0) {
          this.clearWeapon(player);
        }
      }
      return;
    }

    if (player.weaponType === "rocket") {
      if (controls.firePressed && player.shotCooldown <= 0 && player.weaponCharge > 0) {
        const actualVolley = 3; 
        for (let index = 0; index < actualVolley; index += 1) {
          const spread = actualVolley <= 1 ? 0 : (index - (actualVolley - 1) / 2) * 0.09;
          this.rockets.push(this.createRocket(player, spread, index, actualVolley));
        }
        player.shotCooldown = 0.68;
        player.weaponCharge = Math.max(0, player.weaponCharge - 0.5);
        player.flashTimer = 0.12;
        this.audio.play("rocket_launch", { volume: 0.18, playbackRate: rand(1.04, 1.14) });
        this.audio.play("rocket_thrust", { volume: 0.1, playbackRate: rand(0.96, 1.08) });
        if (player.weaponCharge <= 0.01) {
          this.clearWeapon(player);
        }
      }
      return;
    }

    if (controls.fire && player.shotCooldown <= 0) {
      this.bullets.push(this.createBullet(player));
      player.shotCooldown = player.stats.bulletCooldown;
      player.flashTimer = 0.08;
      this.audio.play("player_shot", { volume: 0.12, playbackRate: rand(0.96, 1.04) });
    }
  }

  clearWeapon(player) {
    player.weaponType = null;
    player.weaponCharge = 0;
    player.weaponActiveTimer = 0;
    player.weaponLatchTimer = 0;
  }

  updateBullets(deltaSeconds) {
    for (const bullet of this.bullets) {
      bullet.life -= deltaSeconds;
      bullet.x = wrap(bullet.x + bullet.vx * deltaSeconds, this.width);
      bullet.y = wrap(bullet.y + bullet.vy * deltaSeconds, this.height);
      if (bullet.life <= 0) {
        bullet.dead = true;
      }
    }
  }

  updateRockets(deltaSeconds) {
    this.rocketThrusterAudioTimer = Math.max(0, this.rocketThrusterAudioTimer - deltaSeconds);

    for (const rocket of this.rockets) {
      rocket.life -= deltaSeconds;
      rocket.armTimer -= deltaSeconds;
      if (rocket.life <= 0) {
        rocket.dead = true;
        continue;
      }

      const target = rocket.armTimer <= 0 ? this.findRocketTarget(rocket) : null;
      if (target) {
        const delta = toroidalDistance(rocket, target, this.width, this.height);
        const heading = normalizeVector(delta.dx, delta.dy);
        rocket.vx += heading.x * ROCKET_HOMING * deltaSeconds;
        rocket.vy += heading.y * ROCKET_HOMING * deltaSeconds;
      }

      const speed = Math.hypot(rocket.vx, rocket.vy);
      const maxSpeed = ROCKET_MAX_SPEED;
      if (speed > maxSpeed) {
        const ratio = maxSpeed / speed;
        rocket.vx *= ratio;
        rocket.vy *= ratio;
      }

      rocket.angle = Math.atan2(rocket.vy, rocket.vx);
      rocket.x = wrap(rocket.x + rocket.vx * deltaSeconds, this.width);
      rocket.y = wrap(rocket.y + rocket.vy * deltaSeconds, this.height);
      if (this.settings.options.particlesEnabled) {
        this.spawnRocketTrail(rocket);
      }
    }

    if (this.rockets.length && this.rocketThrusterAudioTimer <= 0) {
      this.audio.play("rocket_thrust", { volume: 0.045, playbackRate: rand(0.98, 1.08) });
      this.rocketThrusterAudioTimer = 0.2;
    }
  }

  updateAsteroids(deltaSeconds) {
    for (const asteroid of this.asteroids) {
      asteroid.angle += asteroid.angularVelocity * deltaSeconds;
      asteroid.x = wrap(asteroid.x + asteroid.vx * deltaSeconds, this.width);
      asteroid.y = wrap(asteroid.y + asteroid.vy * deltaSeconds, this.height);
    }
  }

  updateCronies(deltaSeconds) {
    for (const crony of this.cronies) {
      const target = this.findCronyTarget(crony);
      if (target) {
        const delta = toroidalDistance(crony, target, this.width, this.height);
        const heading = normalizeVector(delta.dx, delta.dy);
        crony.vx += heading.x * CRONY_THRUST * deltaSeconds;
        crony.vy += heading.y * CRONY_THRUST * deltaSeconds;
      }

      const speed = Math.hypot(crony.vx, crony.vy);
      if (speed > CRONY_MAX_SPEED + this.level * 4) {
        const ratio = (CRONY_MAX_SPEED + this.level * 4) / speed;
        crony.vx *= ratio;
        crony.vy *= ratio;
      }

      crony.x = wrap(crony.x + crony.vx * deltaSeconds, this.width);
      crony.y = wrap(crony.y + crony.vy * deltaSeconds, this.height);
      crony.angle = Math.atan2(crony.vy, crony.vx);
      crony.pulse += deltaSeconds * 8;
    }
  }

  updateUfos(deltaSeconds) {
    for (const ufo of this.ufos) {
      const previousY = ufo.y;
      ufo.x += ufo.vx * deltaSeconds;
      ufo.y = wrap(ufo.baseY + Math.sin(this.clock * ufo.zigzagSpeed + ufo.phase) * ufo.amplitude, this.height);
      ufo.vy = (ufo.y - previousY) / Math.max(deltaSeconds, 0.0001);
      ufo.angle = Math.atan2(ufo.vy * 0.45, ufo.vx);
      ufo.fireTimer -= deltaSeconds;

      if (ufo.fireTimer <= 0) {
        const shotAngle = rand(0, TWO_PI);
        this.bullets.push(
          this.createBullet(ufo, {
            angle: shotAngle,
            ownerId: null,
            sourceId: ufo.id,
            sourceKind: "ufo",
            color: "#ff4d52",
            push: 180,
          }),
        );
        ufo.fireTimer = rand(1.1, 2.4);
        this.audio.play("ufo_fire", { volume: 0.08, playbackRate: rand(0.94, 1.04) });
      }

      if (
        (ufo.vx > 0 && ufo.x > this.width + ufo.radius * 3) ||
        (ufo.vx < 0 && ufo.x < -ufo.radius * 3)
      ) {
        ufo.dead = true;
      }
    }
  }

  updateItems(deltaSeconds) {
    for (const item of this.items) {
      item.angle += item.angularVelocity * deltaSeconds;
      item.x = wrap(item.x + item.vx * deltaSeconds, this.width);
      item.y = wrap(item.y + item.vy * deltaSeconds, this.height);
      for (const asteroid of this.asteroids) {
        if (asteroid.dead) continue;
        const delta = toroidalDistance(item, asteroid, this.width, this.height);
        if (delta.distance <= item.radius + asteroid.radius) {
          this.resolveBounce(item, asteroid, 18, asteroidMass(asteroid), delta);
        }
      }
    }
  }

  updateShockwaves(deltaSeconds) {
    for (const wave of this.shockwaves) {
      wave.life -= deltaSeconds;
      wave.lastRadius = wave.radius;
      const progress = 1 - Math.max(0, wave.life) / wave.maxLife;
      wave.radius = wave.maxRadius * Math.sin(progress * Math.PI * 0.5);
    }
  }

  updateParticles(deltaSeconds) {
    for (const particle of this.particles) {
      particle.life -= deltaSeconds;
      particle.x = wrap(particle.x + particle.vx * deltaSeconds, this.width);
      particle.y = wrap(particle.y + particle.vy * deltaSeconds, this.height);
    }
  }

  updateFloatingTexts(deltaSeconds) {
    for (const item of this.floatingTexts) {
      item.life -= deltaSeconds;
      item.y -= 26 * deltaSeconds;
      item.alpha = Math.max(0, item.life / item.maxLife);
    }
  }

  rebuildLaserBeams() {
    this.laserBeams = [];
    for (const player of this.players) {
      if (!player.alive || player.hyperspaceHidden || player.weaponType !== "laser" || player.weaponActiveTimer <= 0) {
        continue;
      }

      const heading = vectorFromAngle(player.angle);
      const start = {
        x: wrap(player.x + heading.x * (player.radius + 8), this.width),
        y: wrap(player.y + heading.y * (player.radius + 8), this.height),
      };
      const end = {
        x: start.x + heading.x * NORMAL_WEAPON_RANGE,
        y: start.y + heading.y * NORMAL_WEAPON_RANGE,
      };
      this.laserBeams.push({
        id: makeId("laser"),
        kind: "laserBeam",
        ownerId: player.id,
        start,
        end,
        angle: player.angle,
        color: "#ff0000",
      });
    }
  }

  handleShockwaveHits() {
    for (const wave of this.shockwaves) {
      if (!wave.damaging) continue;
      for (const bullet of this.bullets) {
        if (bullet.dead) continue;
        const delta = toroidalDistance(wave, bullet, this.width, this.height);
        if (delta.distance >= wave.lastRadius && delta.distance <= wave.radius) {
          bullet.dead = true;
          this.spawnSpark(bullet.x, bullet.y, bullet.color);
        }
      }

      for (const crony of this.cronies) {
        if (crony.dead) continue;
        const delta = toroidalDistance(wave, crony, this.width, this.height);
        if (delta.distance >= wave.lastRadius && delta.distance <= wave.radius + crony.radius) {
          this.destroyCrony(crony, wave.ownerId);
        }
      }

      for (const ufo of this.ufos) {
        if (ufo.dead) continue;
        const delta = toroidalDistance(wave, ufo, this.width, this.height);
        if (delta.distance >= wave.lastRadius && delta.distance <= wave.radius + ufo.radius) {
          this.destroyUfo(ufo, wave.ownerId);
        }
      }

      for (const asteroid of this.asteroids) {
        if (asteroid.dead) continue;
        const delta = toroidalDistance(wave, asteroid, this.width, this.height);
        if (delta.distance >= wave.lastRadius && delta.distance <= wave.radius + asteroid.radius) {
          const heading = normalizeVector(delta.dx, delta.dy);
          this.destroyAsteroid(asteroid, wave.ownerId, false, {
            directionX: heading.x,
            directionY: heading.y,
            spread: 0,
            randomness: [0.087, 0.174],
          });
        }
      }

      for (const player of this.players) {
        if (!this.isPlayerSolid(player) || player.id === wave.ownerId) continue;
        const delta = toroidalDistance(wave, player, this.width, this.height);
        if (delta.distance >= wave.lastRadius && delta.distance <= wave.radius + player.radius) {
          const heading = normalizeVector(delta.dx, delta.dy);
          const strength = 1200 * Math.max(0, 1 - delta.distance / wave.maxRadius);
          this.applyImpactAtPoint(player, heading.x, heading.y, strength, player.x, player.y);
        }
      }
    }
  }

  handleBulletHits() {
    for (const bullet of this.bullets) {
      if (bullet.dead) continue;

      for (const asteroid of this.asteroids) {
        if (asteroid.dead) continue;
        const delta = toroidalDistance(bullet, asteroid, this.width, this.height);
        if (delta.distance <= bullet.radius + asteroid.radius) {
          bullet.dead = true;
          const direction = normalizeVector(bullet.vx, bullet.vy);
          if (this.settings.options.insanityMode) {
            this.applyImpactAtPoint(asteroid, direction.x, direction.y, bullet.push, bullet.x, bullet.y);
            this.spawnSpark(bullet.x, bullet.y, bullet.color);
          } else {
            this.destroyAsteroid(asteroid, bullet.ownerId, false, {
              directionX: direction.x,
              directionY: direction.y,
            });
          }
          break;
        }
      }

      if (bullet.dead) continue;

      for (const crony of this.cronies) {
        if (crony.dead) continue;
        const delta = toroidalDistance(bullet, crony, this.width, this.height);
        if (delta.distance <= bullet.radius + crony.radius) {
          bullet.dead = true;
          this.destroyCrony(crony, bullet.ownerId);
          break;
        }
      }

      if (bullet.dead) continue;

      for (const ufo of this.ufos) {
        if (ufo.dead || (bullet.sourceKind === "ufo" && bullet.sourceId === ufo.id)) continue;
        const delta = toroidalDistance(bullet, ufo, this.width, this.height);
        if (delta.distance <= bullet.radius + ufo.radius) {
          bullet.dead = true;
          this.destroyUfo(ufo, bullet.ownerId);
          break;
        }
      }

      if (bullet.dead) continue;

      for (const player of this.players) {
        if (!this.isPlayerSolid(player)) continue;
        const delta = toroidalDistance(bullet, player, this.width, this.height);
        if (delta.distance <= bullet.radius + player.radius) {
          bullet.dead = true;
          this.handlePlayerWeaponHit(player, bullet.ownerId, bullet.vx, bullet.vy, bullet.x, bullet.y, bullet.push, "bullet");
          break;
        }
      }
    }
  }

  handleRocketHits() {
    for (const rocket of this.rockets) {
      if (rocket.dead) continue;

      for (const asteroid of this.asteroids) {
        if (asteroid.dead) continue;
        const delta = toroidalDistance(rocket, asteroid, this.width, this.height);
        if (delta.distance <= rocket.radius + asteroid.radius) {
          rocket.dead = true;
          const direction = normalizeVector(rocket.vx, rocket.vy);
          if (this.settings.options.insanityMode) {
            this.applyImpactAtPoint(asteroid, direction.x, direction.y, 360, rocket.x, rocket.y);
          } else {
            this.destroyAsteroid(asteroid, rocket.ownerId, false, {
              directionX: direction.x,
              directionY: direction.y,
            });
          }
          this.spawnExplosion(rocket.x, rocket.y, "#ff8e52", 1.1, rocket.vx, rocket.vy, true);
          break;
        }
      }

      if (rocket.dead) continue;

      for (const crony of this.cronies) {
        if (crony.dead) continue;
        const delta = toroidalDistance(rocket, crony, this.width, this.height);
        if (delta.distance <= rocket.radius + crony.radius) {
          rocket.dead = true;
          this.destroyCrony(crony, rocket.ownerId);
          this.spawnExplosion(rocket.x, rocket.y, "#ff8e52", 1.1, rocket.vx, rocket.vy, true);
          break;
        }
      }

      if (rocket.dead) continue;

      for (const ufo of this.ufos) {
        if (ufo.dead) continue;
        const delta = toroidalDistance(rocket, ufo, this.width, this.height);
        if (delta.distance <= rocket.radius + ufo.radius) {
          rocket.dead = true;
          this.destroyUfo(ufo, rocket.ownerId);
          this.spawnExplosion(rocket.x, rocket.y, "#ff8e52", 1.1, rocket.vx, rocket.vy, true);
          break;
        }
      }

      if (rocket.dead) continue;

      for (const player of this.players) {
        if (!this.isPlayerSolid(player)) continue;
        const delta = toroidalDistance(rocket, player, this.width, this.height);
        if (delta.distance <= rocket.radius + player.radius) {
          rocket.dead = true;
          this.handlePlayerWeaponHit(player, rocket.ownerId, rocket.vx, rocket.vy, rocket.x, rocket.y, 340, "rocket");
          this.spawnExplosion(rocket.x, rocket.y, "#ff8e52", 1.1, rocket.vx, rocket.vy, true);
          break;
        }
      }
    }
  }

  handleLaserHits() {
    for (const beam of this.laserBeams) {
      const owner = this.players.find((player) => player.id === beam.ownerId);
      if (!owner) continue;
      const direction = vectorFromAngle(beam.angle);

      for (const asteroid of this.asteroids) {
        if (asteroid.dead) continue;
        const hit = segmentCircleHit(beam.start, beam.end, asteroid, this.width, this.height);
        if (!hit.hit) continue;
        if (this.settings.options.insanityMode) {
          this.applyImpactAtPoint(asteroid, direction.x, direction.y, 120, hit.x, hit.y);
        } else {
          this.destroyAsteroid(asteroid, owner.id, false, {
            directionX: direction.x,
            directionY: direction.y,
          });
        }
      }

      for (const crony of this.cronies) {
        if (crony.dead) continue;
        const hit = segmentCircleHit(beam.start, beam.end, crony, this.width, this.height);
        if (hit.hit) {
          this.destroyCrony(crony, owner.id);
        }
      }

      for (const ufo of this.ufos) {
        if (ufo.dead) continue;
        const hit = segmentCircleHit(beam.start, beam.end, ufo, this.width, this.height);
        if (hit.hit) {
          this.destroyUfo(ufo, owner.id);
        }
      }

      for (const player of this.players) {
        if (!this.isPlayerSolid(player) || player.id === owner.id) continue;
        const hit = segmentCircleHit(beam.start, beam.end, player, this.width, this.height);
        if (!hit.hit) continue;
        this.handlePlayerWeaponHit(player, owner.id, direction.x * 400, direction.y * 400, hit.x, hit.y, 180, "laser");
      }
    }
  }

  handlePlayerWeaponHit(player, attackerId, vx, vy, hitX, hitY, pushStrength, sourceType) {
    const direction = normalizeVector(vx, vy);
    const canKill = attackerId == null ? true : this.settings.options.friendlyFire;

    if (player.shieldActive || player.invulnerableTimer > 0) {
      this.applyImpactAtPoint(player, direction.x, direction.y, pushStrength * 0.3, hitX, hitY);
      this.spawnSpark(hitX, hitY, player.color);
      this.audio.play("player_hit_push", { volume: 0.35, playbackRate: rand(0.9, 1.1) });
      return;
    }

    if (!canKill) {
      this.applyImpactAtPoint(player, direction.x, direction.y, pushStrength * 2.85, hitX, hitY);
      this.spawnSpark(hitX, hitY, player.color);
      this.audio.play("player_hit_push", { volume: 0.35, playbackRate: rand(0.9, 1.1) });
      return;
    }

    this.destroyPlayer(player, attackerId);
    if (sourceType !== "laser") {
      this.spawnExplosion(hitX, hitY, player.color, 1, vx * 0.2, vy * 0.2, true);
    }
  }

  handlePlayerCollisions() {
    for (const player of this.players) {
      if (!this.isPlayerSolid(player)) continue;

      for (const asteroid of this.asteroids) {
        if (asteroid.dead) continue;
        const delta = toroidalDistance(player, asteroid, this.width, this.height);
        if (delta.distance > player.radius + asteroid.radius) continue;

        const heading = normalizeVector(delta.dx, delta.dy);
        this.destroyAsteroid(asteroid, player.id, true, {
          directionX: heading.x,
          directionY: heading.y,
        });

        if (player.shieldActive || player.invulnerableTimer > 0) {
          this.applyImpactAtPoint(player, -heading.x, -heading.y, 90, player.x, player.y);
        } else {
          this.destroyPlayer(player);
        }
      }

      for (const crony of this.cronies) {
        if (crony.dead) continue;
        const delta = toroidalDistance(player, crony, this.width, this.height);
        if (delta.distance > player.radius + crony.radius) continue;

        if (player.shieldActive || player.invulnerableTimer > 0) {
          this.destroyCrony(crony, player.id);
        } else {
          this.destroyPlayer(player);
          this.destroyCrony(crony, player.id);
        }
      }

      for (const ufo of this.ufos) {
        if (ufo.dead) continue;
        const delta = toroidalDistance(player, ufo, this.width, this.height);
        if (delta.distance > player.radius + ufo.radius) continue;

        if (player.shieldActive || player.invulnerableTimer > 0) {
          this.destroyUfo(ufo, player.id);
        } else {
          this.destroyPlayer(player);
          this.destroyUfo(ufo);
        }
      }
    }

    for (let index = 0; index < this.players.length; index += 1) {
      const playerA = this.players[index];
      if (!this.isPlayerSolid(playerA)) continue;

      for (let innerIndex = index + 1; innerIndex < this.players.length; innerIndex += 1) {
        const playerB = this.players[innerIndex];
        if (!this.isPlayerSolid(playerB)) continue;

        const delta = toroidalDistance(playerA, playerB, this.width, this.height);
        if (delta.distance > playerA.radius + playerB.radius) continue;

        if (playerA.invulnerableTimer > 0 || playerB.invulnerableTimer > 0) {
          this.resolveBounce(playerA, playerB, playerA.stats.mass, playerB.stats.mass, delta);
          continue;
        }

        if (playerA.shieldActive && playerB.shieldActive) {
          this.resolveBounce(playerA, playerB, playerA.stats.mass, playerB.stats.mass, delta);
          continue;
        }

        if (playerA.shieldActive && !playerB.shieldActive) {
          this.destroyPlayer(playerB, playerA.id);
          this.applyImpactAtPoint(playerA, -delta.dx, -delta.dy, 120, playerA.x, playerA.y);
          continue;
        }

        if (playerB.shieldActive && !playerA.shieldActive) {
          this.destroyPlayer(playerA, playerB.id);
          this.applyImpactAtPoint(playerB, delta.dx, delta.dy, 120, playerB.x, playerB.y);
          continue;
        }

        this.destroyPlayer(playerA, playerB.id);
        this.destroyPlayer(playerB, playerA.id);
      }
    }
  }

  handleItemPickups() {
    for (const item of this.items) {
      if (item.dead) continue;
      for (const player of this.players) {
        if (!this.isPlayerCollecting(player)) continue;
        const delta = toroidalDistance(item, player, this.width, this.height);
        if (delta.distance <= item.radius + player.radius) {
          item.dead = true;
          player.weaponType = item.type;
          player.weaponCharge = 2;
          player.weaponActiveTimer = 0;
          player.weaponLatchTimer = 0;
          this.spawnBurst(item.x, item.y, this.getItemColor(item.type), 16, 140, 0.8, item.vx, item.vy);
          this.floatingTexts.push({
            id: makeId("weapon"),
            x: item.x,
            y: item.y - 18,
            text: getItemLabel(item.type),
            color: this.getItemColor(item.type),
            life: 1.1,
            maxLife: 1.1,
            alpha: 1,
          });
          this.audio.play("item_pickup", { volume: 0.12, playbackRate: rand(0.98, 1.08) });
        }
      }
    }
  }

  handleAsteroidBilliards() {
    for (let index = 0; index < this.asteroids.length; index += 1) {
      const asteroidA = this.asteroids[index];
      if (asteroidA.dead) continue;

      for (let innerIndex = index + 1; innerIndex < this.asteroids.length; innerIndex += 1) {
        const asteroidB = this.asteroids[innerIndex];
        if (asteroidB.dead) continue;
        const delta = toroidalDistance(asteroidA, asteroidB, this.width, this.height);
        if (delta.distance > asteroidA.radius + asteroidB.radius) continue;
        this.resolveBounce(asteroidA, asteroidB, asteroidMass(asteroidA), asteroidMass(asteroidB), delta);
      }
    }
  }

  resolveBounce(entityA, entityB, massA, massB, delta) {
    const normal = normalizeVector(delta.dx, delta.dy);
    const overlap = entityA.radius + entityB.radius - Math.max(delta.distance, 1);

    const totalMass = massA + massB;
    const ratioA = massB / totalMass;
    const ratioB = massA / totalMass;

    entityA.x = wrap(entityA.x - normal.x * overlap * ratioA, this.width);
    entityA.y = wrap(entityA.y - normal.y * overlap * ratioA, this.height);
    entityB.x = wrap(entityB.x + normal.x * overlap * ratioB, this.width);
    entityB.y = wrap(entityB.y + normal.y * overlap * ratioB, this.height);

    const relativeVelocityX = entityA.vx - entityB.vx;
    const relativeVelocityY = entityA.vy - entityB.vy;
    const speedOnNormal = relativeVelocityX * normal.x + relativeVelocityY * normal.y;
    if (speedOnNormal > 0) {
      return;
    }

    const restitution = 0.95;
    const impulse = (-(1 + restitution) * speedOnNormal) / (1 / massA + 1 / massB);
    const impulseX = impulse * normal.x;
    const impulseY = impulse * normal.y;
    entityA.vx += impulseX / massA;
    entityA.vy += impulseY / massA;
    entityB.vx -= impulseX / massB;
    entityB.vy -= impulseY / massB;
    entityA.angularVelocity += impulse / (massA * entityA.radius * 6);
    entityB.angularVelocity -= impulse / (massB * entityB.radius * 6);
  }

  applyImpactAtPoint(target, directionX, directionY, strength, hitX, hitY) {
    const heading = normalizeVector(directionX, directionY);
    const mass = target.kind === "asteroid" ? asteroidMass(target) : target.kind === "player" ? target.stats.mass : 16;
    const impulseX = heading.x * strength;
    const impulseY = heading.y * strength;
    target.vx += impulseX / mass;
    target.vy += impulseY / mass;
    const relX = hitX - target.x;
    const relY = hitY - target.y;
    const torque = (relX * impulseY - relY * impulseX) / (mass * Math.max(target.radius, 1) * 10);
    target.angularVelocity += torque;
  }

  destroyAsteroid(asteroid, scorerId = null, collisionKill = false, impact = null) {
    if (asteroid.dead) return;
    asteroid.dead = true;

    if (scorerId) {
      this.awardScore(scorerId, ASTEROID_SIZES[asteroid.size].score);
    }

    const fragmentSize = ASTEROID_SIZES[asteroid.size].child;
    if (fragmentSize) {
      const fragmentCount = randInt(2, 3);
      const baseDirection =
        impact ? normalizeVector(impact.directionX ?? 1, impact.directionY ?? 0) : normalizeVector(asteroid.vx, asteroid.vy);
      for (let index = 0; index < fragmentCount; index += 1) {
        let jitter = rand(-0.18, 0.18);
        if (impact?.randomness) {
          jitter = rand(impact.randomness[0], impact.randomness[1]) * (Math.random() < 0.5 ? 1 : -1);
        }
        const spreadMultiplier = impact?.spread ?? 0.9;
        const angle = Math.atan2(baseDirection.y, baseDirection.x) + (index - (fragmentCount - 1) / 2) * spreadMultiplier + jitter;
        const direction = vectorFromAngle(angle);
        const position = this.findFragmentSpawnPosition(asteroid.x, asteroid.y, ASTEROID_SIZES[fragmentSize].radius);
        const speed = rand(ASTEROID_SIZES[fragmentSize].speed[0], ASTEROID_SIZES[fragmentSize].speed[1]);
        this.asteroids.push(
          this.createAsteroid(fragmentSize, position.x, position.y, {
            vx: asteroid.vx * 0.46 + direction.x * speed,
            vy: asteroid.vy * 0.46 + direction.y * speed,
            angularVelocity: asteroid.angularVelocity + rand(-1.4, 1.4),
            themeId: asteroid.themeId,
          }),
        );
      }
    }

    const cronyChance = collisionKill ? 0 : clamp(0.02 + this.level * 0.01, 0.02, 0.18);
    if (Math.random() < cronyChance) {
      const spawnCount = randInt(1, 5);
      for (let i = 0; i < spawnCount; i++) {
        if (this.cronies.length > 12) break;
        this.spawnCrony(
          asteroid.x,
          asteroid.y,
          asteroid.vx * 0.25 + rand(-60, 60),
          asteroid.vy * 0.25 + rand(-60, 60)
        );
      }
    }

    this.spawnExplosion(
      asteroid.x,
      asteroid.y,
      findTheme(asteroid.themeId).accent,
      asteroid.size === "large" ? 1.15 : asteroid.size === "medium" ? 0.88 : 0.65,
      asteroid.vx,
      asteroid.vy,
      false,
    );
    this.audio.play(`explosion_${asteroid.size}`, {
      volume: asteroid.size === "large" ? 0.22 : 0.14,
      playbackRate: asteroid.size === "small" ? 1.4 : asteroid.size === "medium" ? 1.12 : 0.92,
    });
    this.cameraShake = Math.max(this.cameraShake, asteroid.size === "large" ? 0.58 : 0.26);
  }

  spawnCrony(x, y, vx = rand(-40, 40), vy = rand(-40, 40)) {
    this.cronies.push({
      id: makeId("crony"),
      kind: "crony",
      x,
      y,
      vx,
      vy,
      angle: 0,
      radius: CRONY_RADIUS,
      pulse: rand(0, TWO_PI),
      dead: false,
    });
    this.audio.play("crony_spawn", { volume: 0.08, playbackRate: rand(0.9, 1.15) });
  }

  destroyCrony(crony, scorerId = null) {
    if (crony.dead) return;
    crony.dead = true;
    if (scorerId) {
      this.awardScore(scorerId, SCORE_VALUES.crony);
    }
    this.spawnExplosion(crony.x, crony.y, "#f7ea74", 0.82, crony.vx, crony.vy, true);
    this.audio.play("crony_die", { volume: 0.1, playbackRate: 0.72 });
    this.cameraShake = Math.max(this.cameraShake, 0.18);
  }

  destroyUfo(ufo, scorerId = null) {
    if (ufo.dead) return;
    ufo.dead = true;
    if (scorerId) {
      this.awardScore(scorerId, SCORE_VALUES.ufo ?? 650);
    }
    this.spawnExplosion(ufo.x, ufo.y, "#ff6961", 1.05, ufo.vx, ufo.vy, true);
    this.audio.play("ufo_die", { volume: 0.13, playbackRate: rand(0.86, 0.96) });
    this.cameraShake = Math.max(this.cameraShake, 0.24);
  }

  destroyPlayer(player, attackerId = null) {
    if (!player.alive) return;
    player.alive = false;
    player.hyperspaceHidden = false;
    player.cloakActive = false;
    player.shieldActive = false;
    player.shieldHeld = false;
    player.lives = Math.max(0, player.lives - 1);
    player.respawnTimer = player.lives > 0 ? RESPAWN_DELAY : 0;
    player.weaponType = null;
    player.weaponCharge = 0;
    player.weaponActiveTimer = 0;
    player.weaponLatchTimer = 0;
    this.spawnExplosion(player.x, player.y, player.color, 1.55, player.vx, player.vy, true);
    this.audio.play("explosion_ship", { volume: 0.28, playbackRate: 0.74 });
    this.cameraShake = Math.max(this.cameraShake, 0.72);

    if (attackerId && attackerId !== player.id) {
      this.awardScore(attackerId, SCORE_VALUES.playerKill);
      const attacker = this.players.find((entry) => entry.id === attackerId);
      if (attacker) {
        attacker.kills += 1;
      }
    }
  }

  awardScore(playerId, amount) {
    const player = this.players.find((entry) => entry.id === playerId);
    if (!player) return;
    player.score += amount;
    this.floatingTexts.push({
      id: makeId("score"),
      x: player.x,
      y: player.y - 22,
      text: `+${amount}`,
      color: player.color,
      life: 0.9,
      maxLife: 0.9,
      alpha: 1,
    });
  }

  isSpawnSafe(x, y, distance, { includePlayers = true } = {}) {
    const probe = { x, y };
    for (const asteroid of this.asteroids) {
      if (toroidalDistance(probe, asteroid, this.width, this.height).distance < distance + asteroid.radius) {
        return false;
      }
    }
    for (const crony of this.cronies) {
      if (toroidalDistance(probe, crony, this.width, this.height).distance < distance + crony.radius) {
        return false;
      }
    }
    for (const ufo of this.ufos) {
      if (!ufo.dead && toroidalDistance(probe, ufo, this.width, this.height).distance < distance + ufo.radius) {
        return false;
      }
    }
    if (includePlayers) {
      for (const player of this.players) {
        if (player.alive && !player.hyperspaceHidden && toroidalDistance(probe, player, this.width, this.height).distance < distance + player.radius) {
          return false;
        }
      }
    }
    return true;
  }

  findSafeLocation(radius) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const x = rand(radius, this.width - radius);
      const y = rand(radius, this.height - radius);
      if (this.isSpawnSafe(x, y, radius + 70)) {
        return { x, y };
      }
    }
    return {
      x: rand(radius, this.width - radius),
      y: rand(radius, this.height - radius),
    };
  }

  findWaveSpawnLocation(radius) {
    const respawns = spawnPoints(this.width, this.height);
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const x = rand(radius, this.width - radius);
      const y = rand(radius, this.height - radius);
      const probe = { x, y };
      const safeFromPlayers = this.players.every((player) => {
        if (!player.alive || player.hyperspaceHidden) return true;
        return toroidalDistance(probe, player, this.width, this.height).distance >= WAVE_SAFE_RADIUS + radius;
      });
      const safeFromRespawns = respawns.every(
        (point) => toroidalDistance(probe, point, this.width, this.height).distance >= WAVE_SAFE_RADIUS * 0.78 + radius,
      );
      const safeFromAsteroids = this.asteroids.every(
        (asteroid) => toroidalDistance(probe, asteroid, this.width, this.height).distance >= asteroid.radius + radius + 24,
      );
      if (safeFromPlayers && safeFromRespawns && safeFromAsteroids) {
        return { x, y };
      }
    }
    return this.findSafeLocation(radius + 48);
  }

  findFragmentSpawnPosition(x, y, radius) {
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const angle = rand(0, TWO_PI);
      const distance = radius * 1.9 + rand(6, 18);
      const candidate = {
        x: wrap(x + Math.cos(angle) * distance, this.width),
        y: wrap(y + Math.sin(angle) * distance, this.height),
      };
      const safeFromAsteroids = this.asteroids.every((asteroid) => {
        if (asteroid.dead) return true;
        return toroidalDistance(candidate, asteroid, this.width, this.height).distance >= asteroid.radius + radius + 6;
      });
      const safeFromPlayers = this.players.every((player) => {
        if (!player.alive || player.hyperspaceHidden) return true;
        return toroidalDistance(candidate, player, this.width, this.height).distance >= player.radius + radius + 8;
      });
      if (safeFromAsteroids && safeFromPlayers) {
        return candidate;
      }
    }
    return { x, y };
  }

  overlapsSolid(player) {
    if (!player.alive) return false;
    for (const asteroid of this.asteroids) {
      if (!asteroid.dead && toroidalDistance(player, asteroid, this.width, this.height).distance < player.radius + asteroid.radius) {
        return true;
      }
    }
    for (const crony of this.cronies) {
      if (!crony.dead && toroidalDistance(player, crony, this.width, this.height).distance < player.radius + crony.radius) {
        return true;
      }
    }
    for (const ufo of this.ufos) {
      if (!ufo.dead && toroidalDistance(player, ufo, this.width, this.height).distance < player.radius + ufo.radius) {
        return true;
      }
    }
    for (const other of this.players) {
      if (other.id === player.id || !this.isPlayerSolid(other)) continue;
      if (toroidalDistance(player, other, this.width, this.height).distance < player.radius + other.radius) {
        return true;
      }
    }
    return false;
  }

  findCronyTarget(crony) {
    const candidates = this.players.filter((player) => this.isPlayerTargetable(player));
    let bestTarget = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const player of candidates) {
      const delta = toroidalDistance(crony, player, this.width, this.height);
      if (delta.distance < bestDistance) {
        bestDistance = delta.distance;
        bestTarget = player;
      }
    }
    return bestTarget;
  }

  findRocketTarget(rocket) {
    const smileyTarget = this.cronies
      .filter((crony) => !crony.dead)
      .sort(
        (left, right) =>
          toroidalDistance(rocket, left, this.width, this.height).distance -
          toroidalDistance(rocket, right, this.width, this.height).distance,
      )[0];
    if (smileyTarget) {
      return smileyTarget;
    }
    const ufoTarget = this.ufos
      .filter((ufo) => !ufo.dead)
      .sort(
        (left, right) =>
          toroidalDistance(rocket, left, this.width, this.height).distance -
          toroidalDistance(rocket, right, this.width, this.height).distance,
      )[0];
    if (ufoTarget) {
      return ufoTarget;
    }
    return this.asteroids
      .filter((asteroid) => !asteroid.dead)
      .sort(
        (left, right) =>
          toroidalDistance(rocket, left, this.width, this.height).distance -
          toroidalDistance(rocket, right, this.width, this.height).distance,
      )[0];
  }

  isPlayerSolid(player) {
    return player.alive && !player.hyperspaceHidden && !player.cloakActive;
  }

  isPlayerCollecting(player) {
    return player.alive && !player.hyperspaceHidden;
  }

  isPlayerTargetable(player) {
    return player.alive && !player.hyperspaceHidden && !player.cloakActive;
  }

  isGameOver() {
    return this.players.length > 0 && this.players.every((player) => player.lives <= 0);
  }

  handleGameOver() {
    if (this.gameOverHandled) {
      return;
    }

    this.gameOverHandled = true;
    this.audio.play("game_over", { volume: 0.22, playbackRate: 0.94 });
    this.bannerText = "Game Over";
    this.bannerSubtext = `Erreicht: ${formatLevel(this.level)}`;
    this.bannerPulse = 999;

    const candidates = this.players
      .filter((player) => qualifiesForHighscore(this.highscores, player.score))
      .sort((left, right) => right.score - left.score)
      .map((player) => ({
        playerId: player.id,
        playerName: player.name,
        color: player.color,
        score: player.score,
        level: this.level,
      }));

    if (candidates.length) {
      this.awaitingHighscoreEntry = true;
      this.callbacks.onHighscoreRequest?.(candidates, (updatedHighscores) => {
        this.highscores = updatedHighscores;
        this.awaitingHighscoreEntry = false;
        this.callbacks.onGameFinish?.();
      });
    } else {
      this.callbacks.onGameFinish?.();
    }
  }

  handleWaveClear() {
    if (this.betweenRoundsTimer > 0) return;
    this.waveActive = false;
    for (const player of this.players) {
      if (player.alive) {
        player.score += SCORE_VALUES.waveClear;
      }
    }
    this.betweenRoundsTimer = 3.2;
    this.bannerText = "Sector Clear";
    this.bannerSubtext = `Sprung zu ${formatLevel(this.level + 1)}`;
    this.bannerPulse = 2.8;
    this.audio.play("wave_clear", { volume: 0.12, playbackRate: 1.35 });
  }

  tryRespawns(deltaSeconds) {
    const points = spawnPoints(this.width, this.height);
    for (const player of this.players) {
      if (player.alive || player.lives <= 0) continue;
      player.respawnTimer = Math.max(0, player.respawnTimer - deltaSeconds);
      if (player.respawnTimer > 0) continue;

      const spawnPoint = points[player.spawnPointIndex] ?? points[0];
      if (!this.isSpawnSafe(spawnPoint.x, spawnPoint.y, SAFE_RESPAWN_DISTANCE)) {
        player.respawnTimer = 0.5;
        continue;
      }

      player.x = spawnPoint.x;
      player.y = spawnPoint.y;
      player.vx = 0;
      player.vy = 0;
      player.angle = spawnPoint.angle;
      player.angularVelocity = 0;
      player.alive = true;
      player.invulnerableTimer = player.stats.spawnInvulnerability;
      this.spawnBurst(player.x, player.y, player.color, 24, 120, 0.9);
      this.audio.play("respawn", { volume: 0.08, playbackRate: rand(0.96, 1.08) });
    }
  }

  tryAmbientCronySpawn(deltaSeconds) {
    this.ambientCronyTimer -= deltaSeconds;
    if (this.level < 3 || !this.waveActive || this.ambientCronyTimer > 0) {
      return;
    }

    const cap = clamp(1 + Math.floor(this.level / 4), 1, 5);
    if (this.cronies.length >= cap) {
      this.ambientCronyTimer = rand(3.2, 7.4);
      return;
    }

    const edge = randInt(0, 3);
    const position =
      edge === 0
        ? { x: rand(0, this.width), y: 20 }
        : edge === 1
          ? { x: this.width - 20, y: rand(0, this.height) }
          : edge === 2
            ? { x: rand(0, this.width), y: this.height - 20 }
            : { x: 20, y: rand(0, this.height) };

    this.spawnCrony(position.x, position.y);
    this.ambientCronyTimer = rand(
      8.8 - Math.min(4.8, this.level * 0.2),
      13.5 - Math.min(4.5, this.level * 0.18),
    );
  }

  tryItemSpawn(deltaSeconds) {
    this.itemSpawnTimer -= deltaSeconds;
    if (this.level < 2 || !this.waveActive || this.itemSpawnTimer > 0 || this.items.some((item) => !item.dead)) {
      return;
    }

    const type = ITEM_TYPES[randInt(0, ITEM_TYPES.length - 1)].id;
    const position = this.findSafeLocation(40);
    this.items.push(this.createItem(type, position.x, position.y));
    this.itemSpawnTimer = rand(ITEM_SPAWN_MIN, ITEM_SPAWN_MAX);
  }

  tryUfoSpawn(deltaSeconds) {
    this.ufoSpawnTimer -= deltaSeconds;
    if (this.level < 4 || !this.waveActive || this.ufoSpawnTimer > 0 || this.ufos.some((ufo) => !ufo.dead)) {
      return;
    }

    const ufo = this.createUfo();
    this.ufos.push(ufo);
    this.audio.play("ufo_spawn", { volume: 0.1, playbackRate: rand(0.94, 1.06) });
    this.ufoSpawnTimer = rand(
      Math.max(8, UFO_SPAWN_MIN - Math.min(7, this.level * 0.45)),
      Math.max(14, UFO_SPAWN_MAX - Math.min(9, this.level * 0.38)),
    );
  }

  cleanupEntities() {
    this.bullets = this.bullets.filter((bullet) => !bullet.dead);
    this.rockets = this.rockets.filter((rocket) => !rocket.dead);
    this.asteroids = this.asteroids.filter((asteroid) => !asteroid.dead);
    this.cronies = this.cronies.filter((crony) => !crony.dead);
    this.ufos = this.ufos.filter((ufo) => !ufo.dead);
    this.items = this.items.filter((item) => !item.dead);
    this.particles = this.particles.filter((particle) => particle.life > 0);
    this.shockwaves = this.shockwaves.filter((wave) => wave.life > 0);
    this.floatingTexts = this.floatingTexts.filter((item) => item.life > 0);
  }

  getItemColor(type) {
    return ITEM_TYPES.find((item) => item.id === type)?.color ?? "#ffffff";
  }

  spawnThrusterParticles(player) {
    const backward = vectorFromAngle(player.angle + Math.PI);
    const side = perpendicular(backward.x, backward.y);
    for (const offset of [-1, 1]) {
      for (let index = 0; index < 4; index += 1) {
        this.particles.push({
          id: makeId("particle"),
          x: player.x + backward.x * (player.radius * 0.88) + side.x * (player.radius * 0.33) * offset + rand(-2, 2),
          y: player.y + backward.y * (player.radius * 0.88) + side.y * (player.radius * 0.33) * offset + rand(-2, 2),
          vx: player.vx + backward.x * rand(90, 180) + side.x * rand(-18, 18),
          vy: player.vy + backward.y * rand(90, 180) + side.y * rand(-18, 18),
          life: rand(0.22, 0.44),
          color: index % 2 === 0 ? "#ffd85c" : "#ff7b39",
          radius: rand(1.5, 2.8),
        });
      }
    }
  }

  spawnRocketTrail(rocket) {
    const backward = vectorFromAngle(rocket.angle + Math.PI);
    for (let index = 0; index < 3; index += 1) {
      this.particles.push({
        id: makeId("particle"),
        x: rocket.x + backward.x * 8 + rand(-1.5, 1.5),
        y: rocket.y + backward.y * 8 + rand(-1.5, 1.5),
        vx: rocket.vx + backward.x * rand(50, 100),
        vy: rocket.vy + backward.y * rand(50, 100),
        life: rand(0.18, 0.32),
        color: index === 0 ? "#fff1a6" : "#ff8e52",
        radius: rand(1.2, 2.3),
      });
    }
  }

  spawnBurst(x, y, color, count, speed, lifeMultiplier, inheritVx = 0, inheritVy = 0) {
    if (!this.settings.options.particlesEnabled) return;
    for (let index = 0; index < count; index += 1) {
      const angle = rand(0, TWO_PI);
      const magnitude = rand(speed * 0.3, speed);
      const direction = vectorFromAngle(angle);
      this.particles.push({
        id: makeId("particle"),
        x,
        y,
        vx: inheritVx * 0.35 + direction.x * magnitude,
        vy: inheritVy * 0.35 + direction.y * magnitude,
        life: rand(0.2, 0.8) * lifeMultiplier,
        color,
        radius: rand(1.3, 3.4),
      });
    }
  }

  spawnWarmExplosion(x, y, intensity, inheritVx, inheritVy) {
    if (!this.settings.options.particlesEnabled) return;
    const warmPalette = ["#ff5b37", "#ff8e2c", "#ffd65a"];
    const count = Math.round(40 * intensity * 5);
    for (let index = 0; index < count; index += 1) {
      const angle = rand(0, TWO_PI);
      const magnitude = rand(80, 260) * intensity;
      const direction = vectorFromAngle(angle);
      this.particles.push({
        id: makeId("warm"),
        x,
        y,
        vx: inheritVx * 0.45 + direction.x * magnitude,
        vy: inheritVy * 0.45 + direction.y * magnitude,
        life: rand(0.18, 0.75) * intensity,
        color: warmPalette[index % warmPalette.length],
        radius: rand(1.1, 3),
      });
    }
  }

  spawnVisualWave(x, y, maxRadius, tint, duration, width) {
    this.shockwaves.push({
      id: makeId("visual-wave"),
      kind: "shockwave",
      x,
      y,
      radius: 0,
      lastRadius: 0,
      maxRadius,
      life: duration,
      maxLife: duration,
      tint,
      width,
      damaging: false,
    });
  }

  spawnExplosion(x, y, baseColor, intensity, inheritVx = 0, inheritVy = 0, addVisualWave = false) {
    this.spawnBurst(x, y, baseColor, Math.round(18 * intensity), 210 * intensity, 1.4, inheritVx, inheritVy);
    this.spawnWarmExplosion(x, y, intensity, inheritVx, inheritVy);
    if (addVisualWave) {
      this.spawnVisualWave(x, y, 70 + intensity * 40, "rgba(255, 193, 92, 0.65)", 0.32, 5);
    }
  }

  spawnSpark(x, y, color) {
    this.spawnBurst(x, y, color, 10, 120, 0.42);
  }

  drawWrapped(entity, radius, draw) {
    const xOffsets = [0];
    const yOffsets = [0];

    if (entity.x < radius) xOffsets.push(this.width);
    if (entity.x > this.width - radius) xOffsets.push(-this.width);
    if (entity.y < radius) yOffsets.push(this.height);
    if (entity.y > this.height - radius) yOffsets.push(-this.height);

    for (const offsetX of xOffsets) {
      for (const offsetY of yOffsets) {
        draw(entity.x + offsetX, entity.y + offsetY);
      }
    }
  }

  render() {
    const ctx = this.context;
    ctx.save();
    ctx.fillStyle = "#020406";
    ctx.fillRect(0, 0, this.width, this.height);
    this.drawBackground(ctx);

    if (this.cameraShake > 0 && this.settings.options.screenShake) {
      ctx.translate(rand(-1, 1) * this.cameraShake * 13, rand(-1, 1) * this.cameraShake * 13);
    }

    this.drawParticles(ctx);
    this.drawShockwaves(ctx);
    this.drawItems(ctx);
    this.drawAsteroids(ctx);
    this.drawCronies(ctx);
    this.drawUfos(ctx);
    this.drawBullets(ctx);
    this.drawRockets(ctx);
    this.drawLaserBeams(ctx);
    this.drawPlayers(ctx);
    this.drawFloatingTexts(ctx);
    ctx.restore();

    this.drawHud(ctx);
    this.drawBanner(ctx);
    this.drawAttractText(ctx);
    this.drawPauseTint(ctx);

    if (this.settings.options.pixelFilter) {
      const w = this.canvas.width;
      const h = this.canvas.height;
      const pxSize = 1.1;
      const scaledW = Math.ceil(w / pxSize);
      const scaledH = Math.ceil(h / pxSize);
      
      if (this.pixelCanvas.width !== scaledW) this.pixelCanvas.width = scaledW;
      if (this.pixelCanvas.height !== scaledH) this.pixelCanvas.height = scaledH;
      
      this.pixelCtx.imageSmoothingEnabled = false;
      this.pixelCtx.drawImage(this.canvas, 0, 0, w, h, 0, 0, scaledW, scaledH);
      
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.pixelCanvas, 0, 0, scaledW, scaledH, 0, 0, w, h);
    }
  }

  drawBackground(ctx) {
    const glow = ctx.createRadialGradient(
      this.width * 0.75,
      this.height * 0.22,
      0,
      this.width * 0.75,
      this.height * 0.22,
      this.width * 0.36,
    );
    glow.addColorStop(0, this.theme.glow);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const star of this.stars) {
      const alpha = star.alpha * (0.65 + Math.sin(star.twinkle) * 0.25);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
  }

  drawParticles(ctx) {
    for (const particle of this.particles) {
      const alpha = clamp(particle.life / 0.8, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, TWO_PI);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawShockwaves(ctx) {
    for (const wave of this.shockwaves) {
      const alpha = clamp(wave.life / wave.maxLife, 0, 1);
      this.drawWrapped(wave, wave.radius + 10, (x, y) => {
        for (let layer = 0; layer < 3; layer += 1) {
          const layerAlpha = alpha * (0.55 - layer * 0.14);
          ctx.strokeStyle = withAlpha(wave.tint, layerAlpha);
          ctx.lineWidth = wave.width + layer * 2;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(0, wave.radius - layer * 3), 0, TWO_PI);
          ctx.stroke();
        }
      });
    }
  }

  drawItems(ctx) {
    for (const item of this.items) {
      const color = this.getItemColor(item.type);
      this.drawWrapped(item, item.radius + 6, (x, y) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(item.angle);
        const tex = this.textures && this.textures[`items/${item.type}`];
        if (tex && tex.complete && tex.naturalWidth > 1) {
          ctx.drawImage(tex, -item.radius, -item.radius, item.radius * 2, item.radius * 2);
        } else {
          ctx.fillStyle = color;
          ctx.strokeStyle = "#f5fcff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -14);
          ctx.lineTo(11, 0);
          ctx.lineTo(0, 14);
          ctx.lineTo(-11, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#041017";
          ctx.font = 'bold 10px "Lucida Console", "Courier New", monospace';
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(getItemLabel(item.type).slice(0, 1), 0, 1);
        }
        ctx.restore();
      });
    }
  }

  drawAsteroids(ctx) {
    for (const asteroid of this.asteroids) {
      this.drawWrapped(asteroid, asteroid.radius + 10, (x, y) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(asteroid.angle);
        const levelClass = ((this.level - 1) % 11) + 1;
        const sizeClass = asteroid.size === "large" ? "L" : (asteroid.size === "medium" ? "M" : "S");
        const tex = this.textures && this.textures[`asteroid/level_${levelClass}/${sizeClass}`];
        if (tex && tex.complete && tex.naturalWidth > 1) {
          ctx.drawImage(tex, -asteroid.radius, -asteroid.radius, asteroid.radius * 2, asteroid.radius * 2);
        } else if (asteroid.themeId === "eyeball") {
          this.drawEyeballAsteroid(ctx, asteroid);
        } else {
          this.drawRockAsteroid(ctx, asteroid);
        }
        ctx.restore();
      });
    }
  }

  drawRockAsteroid(ctx, asteroid) {
    const theme = findTheme(asteroid.themeId);
    ctx.fillStyle = theme.fill;
    ctx.strokeStyle = theme.rim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    asteroid.shape.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = theme.accent;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(-asteroid.radius * 0.4, -asteroid.radius * 0.1);
    ctx.lineTo(asteroid.radius * 0.3, asteroid.radius * 0.35);
    ctx.moveTo(-asteroid.radius * 0.2, asteroid.radius * 0.4);
    ctx.lineTo(asteroid.radius * 0.2, -asteroid.radius * 0.3);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawEyeballAsteroid(ctx, asteroid) {
    const radius = asteroid.radius;
    ctx.fillStyle = "#ece7dd";
    ctx.strokeStyle = "#97734b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TWO_PI);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(152, 62, 87, 0.55)";
    ctx.beginPath();
    ctx.moveTo(-radius * 0.75, -radius * 0.2);
    ctx.lineTo(-radius * 0.1, -radius * 0.06);
    ctx.moveTo(-radius * 0.25, radius * 0.58);
    ctx.lineTo(radius * 0.2, radius * 0.15);
    ctx.stroke();
    const irisRadius = radius * 0.45;
    ctx.fillStyle = "#f26bff";
    ctx.beginPath();
    ctx.arc(radius * 0.08, -radius * 0.08, irisRadius, 0, TWO_PI);
    ctx.fill();
    ctx.fillStyle = "#1f1124";
    ctx.beginPath();
    ctx.arc(radius * 0.08, -radius * 0.08, irisRadius * 0.45, 0, TWO_PI);
    ctx.fill();
  }

  drawCronies(ctx) {
    for (const crony of this.cronies) {
      this.drawWrapped(crony, crony.radius + 6, (x, y) => {
        const pulse = 1 + Math.sin(crony.pulse) * 0.08;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(pulse, pulse);
        const tex = this.textures && this.textures["crony/crony"];
        if (tex && tex.complete && tex.naturalWidth > 1) {
          ctx.drawImage(tex, -crony.radius, -crony.radius, crony.radius * 2, crony.radius * 2);
        } else {
          ctx.fillStyle = "#f6ee77";
          ctx.strokeStyle = "#d9b431";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, crony.radius, 0, TWO_PI);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#1c1c1c";
          ctx.beginPath();
          ctx.arc(-5, -4, 2.6, 0, TWO_PI);
          ctx.arc(5, -4, 2.6, 0, TWO_PI);
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 3, 6, 0.1 * Math.PI, 0.9 * Math.PI);
          ctx.stroke();
        }
        ctx.restore();
      });
    }
  }

  drawUfos(ctx) {
    for (const ufo of this.ufos) {
      if (ufo.x < -ufo.radius * 3 || ufo.x > this.width + ufo.radius * 3) {
        continue;
      }

      ctx.save();
      ctx.translate(ufo.x, ufo.y);
      ctx.rotate(ufo.angle);
      const tex = this.textures && this.textures["ufo/ufo"];
      if (tex && tex.complete && tex.naturalWidth > 1) {
        ctx.drawImage(tex, -ufo.radius, -ufo.radius, ufo.radius * 2, ufo.radius * 2);
      } else {
        ctx.fillStyle = "#d73444";
        ctx.strokeStyle = "#ffd7d9";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, ufo.radius * 0.95, ufo.radius * 0.5, 0, 0, TWO_PI);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#7cf0ff";
        ctx.beginPath();
        ctx.ellipse(0, -ufo.radius * 0.15, ufo.radius * 0.48, ufo.radius * 0.26, 0, Math.PI, TWO_PI);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 95, 95, 0.6)";
        ctx.beginPath();
        ctx.moveTo(-ufo.radius * 0.4, ufo.radius * 0.15);
        ctx.lineTo(ufo.radius * 0.4, ufo.radius * 0.15);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawBullets(ctx) {
    for (const bullet of this.bullets) {
      this.drawWrapped(bullet, 6, (x, y) => {
        const trailLength = 0.045;
        const trailX = x - bullet.vx * trailLength;
        const trailY = y - bullet.vy * trailLength;

        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(trailX, trailY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = bullet.color;
        ctx.lineWidth = bullet.radius * 2;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.globalAlpha = 1.0;
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(x, y, bullet.radius, 0, TWO_PI);
        ctx.fill();
      });
    }
  }

  drawRockets(ctx) {
    for (const rocket of this.rockets) {
      this.drawWrapped(rocket, rocket.radius + 8, (x, y) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rocket.angle);
        const tex = this.textures && this.textures["items/rocket"];
        if (tex && tex.complete && tex.naturalWidth > 1) {
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(tex, -rocket.radius, -rocket.radius, rocket.radius * 2, rocket.radius * 2);
        } else {
          ctx.fillStyle = "#ff9d54";
          ctx.strokeStyle = "#fff0c0";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(-8, 6);
          ctx.lineTo(-3, 0);
          ctx.lineTo(-8, -6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      });
    }
  }

  drawLaserBeams(ctx) {
    for (const beam of this.laserBeams) {
      const gradient = ctx.createLinearGradient(beam.start.x, beam.start.y, beam.end.x, beam.end.y);
      gradient.addColorStop(0, "rgba(255,255,255,0.95)");
      gradient.addColorStop(0.25, beam.color);
      gradient.addColorStop(1, "rgba(255,255,255,0.08)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(beam.start.x, beam.start.y);
      ctx.lineTo(beam.end.x, beam.end.y);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(beam.start.x, beam.start.y);
      ctx.lineTo(beam.end.x, beam.end.y);
      ctx.stroke();
    }
  }

  drawPlayers(ctx) {
    for (const player of this.players) {
      if (!player.alive || player.hyperspaceHidden) continue;
      this.drawWrapped(player, player.radius + 14, (x, y) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(player.angle);
        if (player.cloakActive) {
          ctx.globalAlpha = 0.18;
        }
        const tex = this.textures && this.textures[`spaceship/player${player.id}`];
        if (tex && tex.complete && tex.naturalWidth > 1) {
          ctx.save();
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(tex, -player.radius, -player.radius, player.radius * 2, player.radius * 2);
          ctx.restore();
        } else {
          ctx.lineWidth = 2;
          ctx.strokeStyle = player.color;
          ctx.fillStyle = "rgba(230, 242, 255, 0.88)";
          ctx.beginPath();
          ctx.moveTo(18, 0);
          ctx.lineTo(-12, 10);
          ctx.lineTo(-7, 0);
          ctx.lineTo(-12, -10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-7, 0);
          ctx.lineTo(-16, 12);
          ctx.moveTo(-7, 0);
          ctx.lineTo(-16, -12);
          ctx.stroke();
        }

        if (player.flashTimer > 0) {
          ctx.fillStyle = `rgba(255, 235, 145, ${player.flashTimer * 10})`;
          ctx.beginPath();
          ctx.arc(player.radius, 0, 5, 0, TWO_PI);
          ctx.fill();
        }

        if (player.shieldActive || player.invulnerableTimer > 0) {
          const flicker =
            player.shieldActive && player.specialCharge < 0.2
              ? 0.25 + Math.abs(Math.sin(this.clock * 28)) * 0.75
              : 1;
          const alpha = player.shieldActive ? 0.75 * flicker : 0.3;
          ctx.strokeStyle = `rgba(150, 237, 255, ${alpha})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, player.radius + 8, 0, TWO_PI);
          ctx.stroke();
        }
        ctx.restore();
      });
    }
  }

  drawFloatingTexts(ctx) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '14px "Lucida Console", "Courier New", monospace';
    for (const item of this.floatingTexts) {
      ctx.fillStyle = item.color;
      ctx.globalAlpha = item.alpha;
      ctx.fillText(item.text, item.x, item.y);
      ctx.globalAlpha = 1;
    }
  }

  drawHud(ctx) {
    ctx.save();
    ctx.fillStyle = "#7fe6ff";
    ctx.strokeStyle = "#7fe6ff";
    ctx.font = '20px "Lucida Console", "Courier New", monospace';
    ctx.textBaseline = "top";
    const corners = [
      { x: 26, y: 18, align: "left" },
      { x: this.width - 26, y: 18, align: "right" },
      { x: 26, y: this.height - 116, align: "left" },
      { x: this.width - 26, y: this.height - 116, align: "right" },
    ];

    this.players.forEach((player, index) => {
      const corner = corners[index] ?? corners[0];
      ctx.textAlign = corner.align;
      ctx.fillStyle = player.color;
      ctx.fillText(formatScore(player.score), corner.x, corner.y);
      const step = 18;
      for (let life = 0; life < player.lives; life += 1) {
        const shipX = corner.align === "left" ? corner.x + life * step : corner.x - life * step;
        this.drawMiniShip(ctx, shipX, corner.y + 34, player.color, corner.align === "left" ? 1 : -1);
      }

      ctx.font = '11px "Lucida Console", "Courier New", monospace';
      ctx.fillStyle = "#cfefff";
      ctx.fillText(getSpecialLabel(player.special), corner.x, corner.y + 60);
      this.drawMeterBar(
        ctx,
        corner.align === "left" ? corner.x : corner.x - 100,
        corner.y + 78,
        100,
        player.specialCharge,
        player.color,
        player.specialLockout > 0 ? "#ff6a7c" : "rgba(255,255,255,0.12)",
      );

      const weaponLabel = player.weaponType ? getItemLabel(player.weaponType) : "Weapon Slot";
      ctx.fillStyle = "#bde3ff";
      ctx.fillText(weaponLabel, corner.x, corner.y + 94);
      this.drawMeterBar(
        ctx,
        corner.align === "left" ? corner.x : corner.x - 100,
        corner.y + 112,
        100,
        player.weaponCharge / 2,
        player.weaponType ? this.getItemColor(player.weaponType) : "#3d4d5f",
        "rgba(255,255,255,0.08)",
      );
      ctx.font = '20px "Lucida Console", "Courier New", monospace';
    });

    ctx.fillStyle = "rgba(219, 236, 255, 0.8)";
    ctx.textAlign = "center";
    ctx.font = '14px "Lucida Console", "Courier New", monospace';
    const modeBits = [];
    if (this.settings.options.asteroidBilliards) modeBits.push("Billiards");
    if (this.settings.options.insanityMode) modeBits.push("Insanity");
    ctx.fillText(
      `Asteroids ${this.asteroids.length}  |  Cronies ${this.cronies.length}${modeBits.length ? `  |  ${modeBits.join(" + ")}` : ""}`,
      this.width * 0.5,
      18,
    );
    ctx.restore();
  }

  drawMeterBar(ctx, x, y, width, fill, color, backColor) {
    ctx.fillStyle = backColor;
    ctx.fillRect(x, y, width, 8);
    ctx.strokeStyle = "rgba(127, 230, 255, 0.55)";
    ctx.strokeRect(x, y, width, 8);
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, Math.max(0, width - 2) * clamp(fill, 0, 1), 6);
  }

  drawMiniShip(ctx, x, y, color, direction) {
    ctx.save();
    ctx.translate(x, y);
    if (direction < 0) {
      ctx.scale(-1, 1);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, 4);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-5, -4);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  drawBanner(ctx) {
    if (!this.bannerText || this.bannerPulse <= 0) {
      return;
    }

    const alpha = Math.min(1, this.bannerPulse > 3 ? 0.9 : this.bannerPulse / 2.6);
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(255, 217, 90, ${alpha})`;
    ctx.font = 'bold 28px "Lucida Console", "Courier New", monospace';
    ctx.fillText(this.bannerText, this.width * 0.5, this.height * 0.18);
    ctx.fillStyle = `rgba(205, 237, 255, ${alpha * 0.9})`;
    ctx.font = '16px "Lucida Console", "Courier New", monospace';
    ctx.fillText(this.bannerSubtext, this.width * 0.5, this.height * 0.18 + 28);
    if (this.countdownTimer > 0) {
      const countdownValue = Math.ceil(this.countdownTimer);
      ctx.fillStyle = "rgba(247, 247, 255, 0.92)";
      ctx.font = 'bold 74px "Lucida Console", "Courier New", monospace';
      ctx.fillText(`${countdownValue}`, this.width * 0.5, this.height * 0.5);
    }
    ctx.restore();
  }

  drawAttractText(ctx) {
    if (this.started) {
      return;
    }

    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd95a";
    ctx.font = 'bold 48px "Lucida Console", "Courier New", monospace';
    ctx.fillText("COMET BUSTERS!", this.width * 0.5, this.height * 0.34);
    ctx.fillStyle = "#d8f5ff";
    ctx.font = '18px "Lucida Console", "Courier New", monospace';
    ctx.fillText("Arcade tribute fur 1 bis 4 Spieler", this.width * 0.5, this.height * 0.34 + 42);
    ctx.fillStyle = "rgba(216, 245, 255, 0.75)";
    ctx.font = '14px "Lucida Console", "Courier New", monospace';
    ctx.fillText(
      "Stats, Specials und Input links einstellen und dann starten.",
      this.width * 0.5,
      this.height * 0.34 + 76,
    );
    ctx.restore();
  }

  drawPauseTint(ctx) {
    if (!this.paused) return;
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }
}
