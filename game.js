import {
  ASTEROID_SIZES,
  ASTEROID_THEMES,
  BULLET_RADIUS,
  CRONY_RADIUS,
  MAX_PLAYERS,
  PLAYER_RADIUS,
  SCORE_VALUES,
  createDefaultPlayerState,
  createDefaultSettings,
  formatScore,
  getSpecialLabel,
} from "./constants.js";
import { qualifiesForHighscore } from "./storage.js";

const TWO_PI = Math.PI * 2;
const TURN_SPEED = 3.4;
const BULLET_SPEED = 560;
const BULLET_LIFETIME = 1.15;
const RESPAWN_DELAY = 2.6;
const SAFE_RESPAWN_DISTANCE = 156;
const CRONY_THRUST = 92;
const CRONY_MAX_SPEED = 180;

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

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function themeForLevel(level) {
  return ASTEROID_THEMES[(level - 1) % ASTEROID_THEMES.length];
}

function spawnPoints(width, height) {
  const margin = Math.min(width, height) * 0.11;
  return [
    { x: margin, y: margin, angle: Math.PI * 0.25 },
    { x: width - margin, y: margin, angle: Math.PI * 0.75 },
    { x: margin, y: height - margin, angle: Math.PI * 1.75 },
    { x: width - margin, y: height - margin, angle: Math.PI * 1.25 },
  ];
}

function asteroidMass(asteroid) {
  return asteroid.radius * 1.4;
}

function shipMass(player) {
  return 28 + player.stats.shieldDuration * 4;
}

function createAsteroidShape(radius) {
  const pointCount = randInt(8, 12);
  return Array.from({ length: pointCount }, (_, index) => {
    const angle = (index / pointCount) * TWO_PI;
    const variance = rand(0.7, 1.24);
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
    size: rand(0.9, 2.3),
    alpha: rand(0.18, 0.95),
    speed: rand(0.3, 1.2),
    twinkle: rand(0, TWO_PI),
  }));
}

function formatLevel(level) {
  return `Level ${String(level).padStart(2, "0")}`;
}

export class CometBustersGame {
  constructor(canvas, input, audio, callbacks = {}) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    this.input = input;
    this.audio = audio;
    this.callbacks = callbacks;

    this.settings = createDefaultSettings();
    this.highscores = [];
    this.players = [];
    this.asteroids = [];
    this.bullets = [];
    this.cronies = [];
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
    this.ambientCronyTimer = 9;
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
    this.beginLevel(1);
    this.audio.play("start", { volume: 0.25 });
    this.callbacks.onPauseChange?.(false);
  }

  restart() {
    this.start(this.settings, this.highscores);
  }

  clearWorld() {
    this.asteroids = [];
    this.bullets = [];
    this.cronies = [];
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
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
      return player;
    });
  }

  buildStats(playerConfig) {
    const tuning = playerConfig.tuning;
    const speed = clamp(Number(tuning.speed ?? 3), 1, 5);
    const thrust = clamp(Number(tuning.thrust ?? 3), 1, 5);
    const shield = clamp(Number(tuning.shield ?? 3), 1, 5);

    return {
      maxSpeed: 190 + speed * 26,
      thrustPower: 128 + thrust * 30,
      turnSpeed: TURN_SPEED + speed * 0.06,
      shieldDuration: 1.9 + shield * 0.42,
      bulletCooldown: clamp(0.22 - thrust * 0.015, 0.11, 0.22),
      spawnInvulnerability: 1.8 + shield * 0.22,
      specialCooldown: {
        shield: 8.9 - shield * 0.35,
        hyperspace: 6.9 - speed * 0.18,
        disrupter: 8.4 - thrust * 0.2,
        cloak: 10.2 - shield * 0.15,
      },
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

  beginLevel(level) {
    this.level = level;
    this.theme = themeForLevel(level);
    this.countdownTimer = 3.4;
    this.betweenRoundsTimer = 0;
    this.ambientCronyTimer = clamp(12 - level * 0.45, 4.2, 12);
    this.bannerText = formatLevel(level);
    this.bannerSubtext = this.theme.name;
    this.bannerPulse = 2.8;

    this.clearWorld();

    const points = spawnPoints(this.width, this.height);
    for (const player of this.players) {
      if (player.lives <= 0) {
        player.alive = false;
        continue;
      }

      const spawnPoint = points[player.spawnPointIndex] ?? points[0];
      player.x = spawnPoint.x;
      player.y = spawnPoint.y;
      player.vx = 0;
      player.vy = 0;
      player.angle = spawnPoint.angle;
      player.alive = true;
      player.respawnTimer = 0;
      player.invulnerableTimer = player.stats.spawnInvulnerability;
      player.shieldTimer = 0;
      player.cloakTimer = 0;
      player.specialCooldown = 0.6;
      player.shotCooldown = 0;
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
    this.bannerPulse = Math.max(0, this.bannerPulse - deltaSeconds);
    this.cameraShake = Math.max(0, this.cameraShake - deltaSeconds * 2.8);
    this.input.update(this.settings);

    if (this.input.wasPausePressed() && !this.pauseLocked) {
      this.togglePause();
      this.pauseLocked = true;
    }

    if (!this.input.wasPausePressed()) {
      this.pauseLocked = false;
    }

    this.updateStars(deltaSeconds);

    if (!this.started || this.paused) {
      return;
    }

    this.updateFloatingTexts(deltaSeconds);
    this.updateParticles(deltaSeconds);

    if (this.countdownTimer > 0) {
      this.countdownTimer -= deltaSeconds;
      if (this.countdownTimer <= 0) {
        this.spawnWave();
      }
      return;
    }

    if (this.betweenRoundsTimer > 0) {
      this.betweenRoundsTimer -= deltaSeconds;
      if (this.betweenRoundsTimer <= 0) {
        this.beginLevel(this.level + 1);
      }
      return;
    }

    if (this.isGameOver()) {
      this.handleGameOver();
      return;
    }

    this.updatePlayers(deltaSeconds);
    this.updateBullets(deltaSeconds);
    this.updateAsteroids(deltaSeconds);
    this.updateCronies(deltaSeconds);
    this.updateShockwaves(deltaSeconds);
    this.handleCollisions();
    this.tryRespawns(deltaSeconds);
    this.tryAmbientCronySpawn(deltaSeconds);
    this.cleanupEntities();

    if (!this.asteroids.length && !this.cronies.length) {
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
    const count = clamp(1 + Math.floor((this.level - 1) / 2) + randInt(0, 2), 1, 10);
    for (let index = 0; index < count; index += 1) {
      const position = this.findSafeLocation(ASTEROID_SIZES.large.radius * 1.8);
      this.asteroids.push(this.createAsteroid("large", position.x, position.y));
    }
  }

  createAsteroid(size, x, y, source = null) {
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
      vx: source ? source.vx : direction.x * speed,
      vy: source ? source.vy : direction.y * speed,
      angle: rand(0, TWO_PI),
      spin: rand(-1.2, 1.2),
      radius: sizeConfig.radius,
      themeId: this.theme.id,
      shape: createAsteroidShape(sizeConfig.radius),
      dead: false,
    };
  }

  createBullet(player) {
    const heading = vectorFromAngle(player.angle);
    const spawnDistance = player.radius + 8;

    return {
      id: makeId("bullet"),
      x: wrap(player.x + heading.x * spawnDistance, this.width),
      y: wrap(player.y + heading.y * spawnDistance, this.height),
      vx: player.vx + heading.x * BULLET_SPEED,
      vy: player.vy + heading.y * BULLET_SPEED,
      life: BULLET_LIFETIME,
      radius: BULLET_RADIUS,
      ownerId: player.id,
      color: player.color,
      dead: false,
    };
  }

  updatePlayers(deltaSeconds) {
    for (const player of this.players) {
      player.flashTimer = Math.max(0, player.flashTimer - deltaSeconds);
      player.specialCooldown = Math.max(0, player.specialCooldown - deltaSeconds);
      player.shotCooldown = Math.max(0, player.shotCooldown - deltaSeconds);
      player.invulnerableTimer = Math.max(0, player.invulnerableTimer - deltaSeconds);
      player.shieldTimer = Math.max(0, player.shieldTimer - deltaSeconds);
      player.cloakTimer = Math.max(0, player.cloakTimer - deltaSeconds);

      if (!player.alive) {
        continue;
      }

      const controls = this.input.getPlayerState(player.id);
      if (controls.left) player.angle -= player.stats.turnSpeed * deltaSeconds;
      if (controls.right) player.angle += player.stats.turnSpeed * deltaSeconds;

      if (controls.thrust) {
        const thrustDirection = vectorFromAngle(player.angle);
        player.vx += thrustDirection.x * player.stats.thrustPower * deltaSeconds;
        player.vy += thrustDirection.y * player.stats.thrustPower * deltaSeconds;

        const speed = Math.hypot(player.vx, player.vy);
        if (speed > player.stats.maxSpeed) {
          const ratio = player.stats.maxSpeed / speed;
          player.vx *= ratio;
          player.vy *= ratio;
        }

        player.trailTimer -= deltaSeconds;
        if (this.settings.options.particlesEnabled && player.trailTimer <= 0) {
          player.trailTimer = 0.035;
          this.spawnThrusterParticles(player);
        }
      } else {
        player.trailTimer = 0;
      }

      if (controls.fire && player.shotCooldown <= 0) {
        this.bullets.push(this.createBullet(player));
        player.shotCooldown = player.stats.bulletCooldown;
        player.flashTimer = 0.08;
        this.audio.play("shoot", { volume: 0.12, playbackRate: rand(0.96, 1.04) });
      }

      if (controls.specialPressed && player.specialCooldown <= 0) {
        this.useSpecial(player);
      }

      player.x = wrap(player.x + player.vx * deltaSeconds, this.width);
      player.y = wrap(player.y + player.vy * deltaSeconds, this.height);
    }
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

  updateAsteroids(deltaSeconds) {
    for (const asteroid of this.asteroids) {
      asteroid.angle += asteroid.spin * deltaSeconds;
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
        const speed = Math.hypot(crony.vx, crony.vy);
        if (speed > CRONY_MAX_SPEED + this.level * 4) {
          const ratio = (CRONY_MAX_SPEED + this.level * 4) / speed;
          crony.vx *= ratio;
          crony.vy *= ratio;
        }
      }

      crony.x = wrap(crony.x + crony.vx * deltaSeconds, this.width);
      crony.y = wrap(crony.y + crony.vy * deltaSeconds, this.height);
      crony.angle = Math.atan2(crony.vy, crony.vx);
      crony.pulse += deltaSeconds * 8;
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

  useSpecial(player) {
    const cooldowns = player.stats.specialCooldown;
    switch (player.special) {
      case "shield":
        player.shieldTimer = Math.max(player.shieldTimer, player.stats.shieldDuration);
        player.specialCooldown = cooldowns.shield;
        this.spawnBurst(player.x, player.y, player.color, 12, 160, 1.1);
        this.audio.play("shield", { volume: 0.15 });
        break;
      case "hyperspace": {
        const destination = this.findSafeLocation(140);
        this.spawnBurst(player.x, player.y, player.color, 16, 220, 0.9);
        player.x = destination.x;
        player.y = destination.y;
        player.vx *= 0.35;
        player.vy *= 0.35;
        player.invulnerableTimer = Math.max(player.invulnerableTimer, 1.2);
        player.specialCooldown = cooldowns.hyperspace;
        this.spawnBurst(player.x, player.y, player.color, 16, 220, 0.9);
        this.audio.play("teleport", { volume: 0.18 });
        break;
      }
      case "disrupter":
        this.shockwaves.push({
          id: makeId("wave"),
          ownerId: player.id,
          x: player.x,
          y: player.y,
          radius: 0,
          lastRadius: 0,
          maxRadius: 210 + player.tuning.thrust * 18,
          life: 0.44,
          maxLife: 0.44,
        });
        player.specialCooldown = cooldowns.disrupter;
        this.audio.play("disrupter", { volume: 0.18 });
        break;
      case "cloak":
        player.cloakTimer = 4.3 + player.tuning.speed * 0.45;
        player.specialCooldown = cooldowns.cloak;
        this.spawnBurst(player.x, player.y, "#d5f1ff", 10, 120, 0.6);
        this.audio.play("shield", { volume: 0.1, playbackRate: 1.6 });
        break;
      default:
        break;
    }
  }

  handleCollisions() {
    this.handleShockwaveHits();
    this.handleBulletHits();
    this.handlePlayerCollisions();

    if (this.settings.options.asteroidBilliards) {
      this.handleAsteroidBilliards();
    }
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
      player.alive = true;
      player.invulnerableTimer = player.stats.spawnInvulnerability;
      player.specialCooldown = 1.4;
      player.shotCooldown = 0;
      this.spawnBurst(player.x, player.y, player.color, 12, 100, 0.7);
    }
  }

  tryAmbientCronySpawn(deltaSeconds) {
    this.ambientCronyTimer -= deltaSeconds;
    if (this.level < 3 || this.ambientCronyTimer > 0) {
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

  cleanupEntities() {
    this.bullets = this.bullets.filter((bullet) => !bullet.dead);
    this.asteroids = this.asteroids.filter((asteroid) => !asteroid.dead);
    this.cronies = this.cronies.filter((crony) => !crony.dead);
    this.particles = this.particles.filter((particle) => particle.life > 0);
    this.shockwaves = this.shockwaves.filter((wave) => wave.life > 0);
    this.floatingTexts = this.floatingTexts.filter((item) => item.life > 0);
  }

  handleShockwaveHits() {
    for (const wave of this.shockwaves) {
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

      for (const asteroid of this.asteroids) {
        if (asteroid.dead) continue;
        const delta = toroidalDistance(wave, asteroid, this.width, this.height);
        if (delta.distance >= wave.lastRadius && delta.distance <= wave.radius + asteroid.radius) {
          const heading = normalizeVector(delta.dx, delta.dy);
          asteroid.vx += heading.x * 90;
          asteroid.vy += heading.y * 90;
        }
      }

      for (const player of this.players) {
        if (!player.alive || player.id === wave.ownerId) continue;
        const delta = toroidalDistance(wave, player, this.width, this.height);
        if (delta.distance >= wave.lastRadius && delta.distance <= wave.radius + player.radius) {
          const heading = normalizeVector(delta.dx, delta.dy);
          player.vx += heading.x * 120;
          player.vy += heading.y * 120;
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
          this.destroyAsteroid(asteroid, bullet.ownerId);
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

      if (bullet.dead || !this.settings.options.friendlyFire) continue;

      for (const player of this.players) {
        if (!player.alive || player.id === bullet.ownerId) continue;
        const delta = toroidalDistance(bullet, player, this.width, this.height);
        if (delta.distance <= bullet.radius + player.radius) {
          bullet.dead = true;
          if (player.shieldTimer > 0 || player.invulnerableTimer > 0) {
            this.spawnSpark(player.x, player.y, player.color);
          } else {
            this.destroyPlayer(player, bullet.ownerId);
          }
          break;
        }
      }
    }
  }

  handlePlayerCollisions() {
    for (const player of this.players) {
      if (!player.alive) continue;

      for (const asteroid of this.asteroids) {
        if (asteroid.dead) continue;
        const delta = toroidalDistance(player, asteroid, this.width, this.height);
        if (delta.distance <= player.radius + asteroid.radius) {
          if (player.shieldTimer > 0 || player.invulnerableTimer > 0) {
            this.destroyAsteroid(asteroid, player.id, true);
            const heading = normalizeVector(delta.dx, delta.dy);
            player.vx -= heading.x * 40;
            player.vy -= heading.y * 40;
          } else {
            this.destroyPlayer(player);
          }
        }
      }

      for (const crony of this.cronies) {
        if (crony.dead) continue;
        const delta = toroidalDistance(player, crony, this.width, this.height);
        if (delta.distance <= player.radius + crony.radius) {
          if (player.shieldTimer > 0 || player.invulnerableTimer > 0) {
            this.destroyCrony(crony, player.id);
          } else {
            this.destroyPlayer(player);
          }
        }
      }
    }

    for (let index = 0; index < this.players.length; index += 1) {
      const playerA = this.players[index];
      if (!playerA.alive) continue;

      for (let innerIndex = index + 1; innerIndex < this.players.length; innerIndex += 1) {
        const playerB = this.players[innerIndex];
        if (!playerB.alive) continue;

        const delta = toroidalDistance(playerA, playerB, this.width, this.height);
        if (delta.distance > playerA.radius + playerB.radius) continue;

        if (playerA.invulnerableTimer > 0 || playerB.invulnerableTimer > 0) {
          this.resolveBounce(playerA, playerB, shipMass(playerA), shipMass(playerB), delta);
          continue;
        }

        if (playerA.shieldTimer > 0 && playerB.shieldTimer > 0) {
          this.resolveBounce(playerA, playerB, shipMass(playerA), shipMass(playerB), delta);
          continue;
        }

        if (playerA.shieldTimer > 0 && playerB.shieldTimer <= 0) {
          this.destroyPlayer(playerB, playerA.id);
          this.bumpEntity(playerA, delta.dx, delta.dy, -60);
          continue;
        }

        if (playerB.shieldTimer > 0 && playerA.shieldTimer <= 0) {
          this.destroyPlayer(playerA, playerB.id);
          this.bumpEntity(playerB, delta.dx, delta.dy, 60);
          continue;
        }

        this.destroyPlayer(playerA, playerB.id);
        this.destroyPlayer(playerB, playerA.id);
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
    const overlap = entityA.radius + entityB.radius - delta.distance;

    entityA.x = wrap(entityA.x - normal.x * overlap * 0.5, this.width);
    entityA.y = wrap(entityA.y - normal.y * overlap * 0.5, this.height);
    entityB.x = wrap(entityB.x + normal.x * overlap * 0.5, this.width);
    entityB.y = wrap(entityB.y + normal.y * overlap * 0.5, this.height);

    const relativeVelocityX = entityA.vx - entityB.vx;
    const relativeVelocityY = entityA.vy - entityB.vy;
    const speedOnNormal = relativeVelocityX * normal.x + relativeVelocityY * normal.y;

    if (speedOnNormal > 0) {
      return;
    }

    const restitution = 1;
    const impulse = (-(1 + restitution) * speedOnNormal) / (1 / massA + 1 / massB);
    const impulseX = impulse * normal.x;
    const impulseY = impulse * normal.y;

    entityA.vx += impulseX / massA;
    entityA.vy += impulseY / massA;
    entityB.vx -= impulseX / massB;
    entityB.vy -= impulseY / massB;
  }

  bumpEntity(entity, dx, dy, force) {
    const heading = normalizeVector(dx, dy);
    entity.vx += heading.x * force;
    entity.vy += heading.y * force;
  }

  destroyAsteroid(asteroid, scorerId = null, collisionKill = false) {
    if (asteroid.dead) return;
    asteroid.dead = true;

    if (scorerId) {
      this.awardScore(scorerId, ASTEROID_SIZES[asteroid.size].score);
    }

    const fragmentSize = ASTEROID_SIZES[asteroid.size].child;
    if (fragmentSize) {
      const fragmentCount = randInt(2, 3);
      for (let index = 0; index < fragmentCount; index += 1) {
        const angle = (index / fragmentCount) * TWO_PI + rand(-0.35, 0.35);
        const direction = vectorFromAngle(angle);
        const speed = rand(
          ASTEROID_SIZES[fragmentSize].speed[0],
          ASTEROID_SIZES[fragmentSize].speed[1],
        );
        this.asteroids.push({
          ...this.createAsteroid(fragmentSize, asteroid.x, asteroid.y),
          vx: asteroid.vx * 0.5 + direction.x * speed,
          vy: asteroid.vy * 0.5 + direction.y * speed,
        });
      }
    }

    const cronyChance = collisionKill
      ? 0
      : asteroid.size === "large"
        ? 0
        : clamp(0.05 + this.level * 0.018, 0.05, 0.34);
    if (Math.random() < cronyChance && this.cronies.length < clamp(1 + Math.floor(this.level / 3), 1, 5)) {
      this.spawnCrony(asteroid.x, asteroid.y, asteroid.vx * 0.25, asteroid.vy * 0.25);
    }

    this.spawnBurst(asteroid.x, asteroid.y, this.theme.accent, 18, 180, 1.3);
    this.audio.play("explosion", {
      volume: asteroid.size === "large" ? 0.22 : 0.14,
      playbackRate: asteroid.size === "small" ? 1.4 : asteroid.size === "medium" ? 1.12 : 0.92,
    });
    this.cameraShake = Math.max(this.cameraShake, asteroid.size === "large" ? 0.45 : 0.18);
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
    this.audio.play("crony", { volume: 0.08, playbackRate: rand(0.9, 1.15) });
  }

  destroyCrony(crony, scorerId = null) {
    if (crony.dead) return;
    crony.dead = true;
    if (scorerId) {
      this.awardScore(scorerId, SCORE_VALUES.crony);
    }
    this.spawnBurst(crony.x, crony.y, "#f7ea74", 14, 150, 0.9);
    this.audio.play("crony", { volume: 0.1, playbackRate: 0.72 });
    this.cameraShake = Math.max(this.cameraShake, 0.12);
  }

  destroyPlayer(player, attackerId = null) {
    if (!player.alive) return;
    player.alive = false;
    player.lives = Math.max(0, player.lives - 1);
    player.respawnTimer = player.lives > 0 ? RESPAWN_DELAY : 0;
    player.shieldTimer = 0;
    player.cloakTimer = 0;
    this.spawnBurst(player.x, player.y, player.color, 28, 230, 1.5);
    this.audio.play("explosion", { volume: 0.28, playbackRate: 0.74 });
    this.cameraShake = Math.max(this.cameraShake, 0.4);

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

  isSpawnSafe(x, y, distance) {
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
    for (const player of this.players) {
      if (player.alive && toroidalDistance(probe, player, this.width, this.height).distance < distance + player.radius) {
        return false;
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

  findCronyTarget(crony) {
    const visiblePlayers = this.players.filter(
      (player) => player.alive && !(player.cloakTimer > 0 && player.shieldTimer <= 0),
    );
    const candidates = visiblePlayers.length ? visiblePlayers : this.players.filter((player) => player.alive);
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

  isGameOver() {
    return this.players.length > 0 && this.players.every((player) => player.lives <= 0);
  }

  handleGameOver() {
    if (this.gameOverHandled) {
      return;
    }

    this.gameOverHandled = true;
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
      });
    }
  }

  handleWaveClear() {
    if (this.betweenRoundsTimer > 0) return;
    for (const player of this.players) {
      if (player.alive) {
        player.score += SCORE_VALUES.waveClear;
      }
    }
    this.betweenRoundsTimer = 3.2;
    this.bannerText = "Sector Clear";
    this.bannerSubtext = `Sprung zu ${formatLevel(this.level + 1)}`;
    this.bannerPulse = 2.8;
    this.audio.play("start", { volume: 0.12, playbackRate: 1.35 });
  }

  spawnThrusterParticles(player) {
    const backward = vectorFromAngle(player.angle + Math.PI);
    for (let index = 0; index < 2; index += 1) {
      this.particles.push({
        id: makeId("particle"),
        x: player.x + backward.x * 14 + rand(-4, 4),
        y: player.y + backward.y * 14 + rand(-4, 4),
        vx: player.vx + backward.x * rand(30, 90) + rand(-20, 20),
        vy: player.vy + backward.y * rand(30, 90) + rand(-20, 20),
        life: rand(0.18, 0.35),
        color: "#ffd978",
        radius: rand(1.2, 2.2),
      });
    }
  }

  spawnBurst(x, y, color, count, speed, lifeMultiplier) {
    if (!this.settings.options.particlesEnabled) return;
    for (let index = 0; index < count; index += 1) {
      const angle = rand(0, TWO_PI);
      const magnitude = rand(speed * 0.3, speed);
      const direction = vectorFromAngle(angle);
      this.particles.push({
        id: makeId("particle"),
        x,
        y,
        vx: direction.x * magnitude,
        vy: direction.y * magnitude,
        life: rand(0.2, 0.8) * lifeMultiplier,
        color,
        radius: rand(1.3, 3.4),
      });
    }
  }

  spawnSpark(x, y, color) {
    this.spawnBurst(x, y, color, 6, 100, 0.45);
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
      ctx.translate(rand(-1, 1) * this.cameraShake * 10, rand(-1, 1) * this.cameraShake * 10);
    }

    this.drawParticles(ctx);
    this.drawShockwaves(ctx);
    this.drawAsteroids(ctx);
    this.drawCronies(ctx);
    this.drawBullets(ctx);
    this.drawPlayers(ctx);
    this.drawFloatingTexts(ctx);

    ctx.restore();

    this.drawHud(ctx);
    this.drawBanner(ctx);
    this.drawAttractText(ctx);
    this.drawPauseTint(ctx);
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
      this.drawWrapped(wave, wave.radius + 6, (x, y) => {
        ctx.strokeStyle = `rgba(146, 235, 255, ${alpha * 0.95})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, wave.radius, 0, TWO_PI);
        ctx.stroke();
      });
    }
  }

  drawAsteroids(ctx) {
    for (const asteroid of this.asteroids) {
      this.drawWrapped(asteroid, asteroid.radius + 10, (x, y) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(asteroid.angle);

        if (asteroid.themeId === "eyeball") {
          this.drawEyeballAsteroid(ctx, asteroid);
        } else {
          this.drawRockAsteroid(ctx, asteroid);
        }

        ctx.restore();
      });
    }
  }

  drawRockAsteroid(ctx, asteroid) {
    const theme = ASTEROID_THEMES.find((entry) => entry.id === asteroid.themeId) ?? this.theme;
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

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.arc(radius * 0.22, -radius * 0.22, radius * 0.1, 0, TWO_PI);
    ctx.fill();
  }

  drawCronies(ctx) {
    for (const crony of this.cronies) {
      this.drawWrapped(crony, crony.radius + 6, (x, y) => {
        const pulse = 1 + Math.sin(crony.pulse) * 0.08;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(pulse, pulse);
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
        ctx.restore();
      });
    }
  }

  drawBullets(ctx) {
    for (const bullet of this.bullets) {
      this.drawWrapped(bullet, 6, (x, y) => {
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(x, y, bullet.radius, 0, TWO_PI);
        ctx.fill();
      });
    }
  }

  drawPlayers(ctx) {
    for (const player of this.players) {
      if (!player.alive) continue;
      this.drawWrapped(player, player.radius + 14, (x, y) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(player.angle);
        if (player.cloakTimer > 0) {
          ctx.globalAlpha = 0.35;
        }

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

        if (player.flashTimer > 0) {
          ctx.fillStyle = `rgba(255, 235, 145, ${player.flashTimer * 10})`;
          ctx.beginPath();
          ctx.arc(18, 0, 5, 0, TWO_PI);
          ctx.fill();
        }

        if (player.shieldTimer > 0 || player.invulnerableTimer > 0) {
          const alpha = player.shieldTimer > 0 ? 0.78 : 0.35;
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
      { x: 26, y: this.height - 96, align: "left" },
      { x: this.width - 26, y: this.height - 96, align: "right" },
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

      const specialLabel = getSpecialLabel(player.special);
      ctx.font = '11px "Lucida Console", "Courier New", monospace';
      ctx.fillStyle = "#cfefff";
      ctx.fillText(`${specialLabel}`, corner.x, corner.y + 62);

      const barWidth = 88;
      const barX = corner.align === "left" ? corner.x : corner.x - barWidth;
      const cooldownDuration = player.stats.specialCooldown[player.special] ?? 8;
      const fill = 1 - clamp(player.specialCooldown / cooldownDuration, 0, 1);

      ctx.strokeStyle = "rgba(127, 230, 255, 0.55)";
      ctx.strokeRect(barX, corner.y + 80, barWidth, 8);
      ctx.fillStyle = player.color;
      ctx.fillRect(barX + 1, corner.y + 81, (barWidth - 2) * fill, 6);
      ctx.font = '20px "Lucida Console", "Courier New", monospace';
    });

    ctx.fillStyle = "rgba(219, 236, 255, 0.8)";
    ctx.textAlign = "center";
    ctx.font = '14px "Lucida Console", "Courier New", monospace';
    ctx.fillText(`Asteroids ${this.asteroids.length}  |  Cronies ${this.cronies.length}`, this.width * 0.5, 18);
    ctx.restore();
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
      "Steuerung und Specials links konfigurieren, dann Spiel starten.",
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
