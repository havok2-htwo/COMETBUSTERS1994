import {
  DEFAULT_HIGHSCORES,
  MAX_PLAYERS,
  STORAGE_KEYS,
  createDefaultSettings,
  normalizePlayerTuning,
} from "./constants.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function merge(base, incoming) {
  if (Array.isArray(base)) {
    if (!Array.isArray(incoming)) {
      return clone(base);
    }

    return base.map((item, index) => merge(item, incoming[index]));
  }

  if (base && typeof base === "object") {
    const output = {};
    const source = incoming && typeof incoming === "object" ? incoming : {};

    for (const [key, value] of Object.entries(base)) {
      output[key] = merge(value, source[key]);
    }

    return output;
  }

  return incoming === undefined ? base : incoming;
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) {
      return createDefaultSettings();
    }

    const parsed = JSON.parse(raw);
    const merged = merge(createDefaultSettings(), parsed);
    merged.players = merged.players.slice(0, MAX_PLAYERS);
    merged.players = merged.players.map((player) => ({
      ...player,
      tuning: normalizePlayerTuning(player.tuning),
    }));
    return merged;
  } catch (error) {
    console.warn("Konnte Settings nicht laden, verwende Defaults.", error);
    return createDefaultSettings();
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

export function loadHighscores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.highscores);
    if (!raw) {
      return clone(DEFAULT_HIGHSCORES);
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return clone(DEFAULT_HIGHSCORES);
    }

    return parsed
      .map((entry) => ({
        initials: String(entry.initials ?? "???")
          .slice(0, 3)
          .toUpperCase(),
        score: Number(entry.score ?? 0),
        level: Number(entry.level ?? 1),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 10);
  } catch (error) {
    console.warn("Konnte Highscores nicht laden, verwende Defaults.", error);
    return clone(DEFAULT_HIGHSCORES);
  }
}

export function saveHighscores(highscores) {
  localStorage.setItem(STORAGE_KEYS.highscores, JSON.stringify(highscores));
}

export function resetHighscores() {
  const fallback = clone(DEFAULT_HIGHSCORES);
  saveHighscores(fallback);
  return fallback;
}

export function insertHighscore(highscores, entry) {
  const next = [...highscores, entry]
    .map((item) => ({
      initials: String(item.initials ?? "???")
        .slice(0, 3)
        .toUpperCase(),
      score: Math.max(0, Math.round(Number(item.score ?? 0))),
      level: Math.max(1, Math.round(Number(item.level ?? 1))),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 10);

  saveHighscores(next);
  return next;
}

export function qualifiesForHighscore(highscores, score) {
  if (highscores.length < 10) return score > 0;
  return score > highscores[highscores.length - 1].score;
}
