import { AudioManager } from "./audio.js";
import { SPECIALS, TUNING_FIELDS, TUNING_TOTAL, adjustPlayerTuning, formatKeyCode } from "./constants.js";
import { t, setLanguage } from "./i18n.js";
import { CometBustersGame } from "./game_core.js";
import { InputManager } from "./input.js";
import {
  insertHighscore,
  loadHighscores,
  loadSettings,
  resetHighscores,
  saveSettings,
} from "./storage.js";

const elements = {
  body: document.body,
  canvas: document.querySelector("#game-canvas"),
  controlPanel: document.querySelector("#control-panel"),
  panelToggleButton: document.querySelector("#panel-toggle-button"),
  collapsePanelButton: document.querySelector("#collapse-panel-button"),
  languageSelect: document.querySelector("#language-select"),
  playerCount: document.querySelector("#player-count"),
  asteroidBilliards: document.querySelector("#asteroid-billiards"),
  insanityMode: document.querySelector("#insanity-mode"),
  friendlyFire: document.querySelector("#friendly-fire"),
  particlesEnabled: document.querySelector("#particles-enabled"),
  screenShake: document.querySelector("#screen-shake"),
  pixelFilter: document.querySelector("#pixel-filter"),
  audioEnabled: document.querySelector("#audio-enabled"),
  sfxVolume: document.querySelector("#sfx-volume"),
  musicVolume: document.querySelector("#music-volume"),
  playerConfigList: document.querySelector("#player-config-list"),
  keyboardProfileList: document.querySelector("#keyboard-profile-list"),
  gamepadStatus: document.querySelector("#gamepad-status"),
  highscoreList: document.querySelector("#highscore-list"),
  pauseOverlay: document.querySelector("#pause-overlay"),
  resumeButton: document.querySelector("#resume-button"),
  restartButton: document.querySelector("#restart-button"),
  openSettingsButton: document.querySelector("#open-settings-button"),
  highscoreOverlay: document.querySelector("#highscore-overlay"),
  highscorePrompt: document.querySelector("#highscore-prompt"),
  highscoreForm: document.querySelector("#highscore-form"),
  initialsInput: document.querySelector("#initials-input"),
  startOverlay: document.querySelector("#start-overlay"),
  centerStartButton: document.querySelector("#center-start-button"),
  startHighscoreList: document.querySelector("#start-highscore-list"),
};

const input = new InputManager();
const audio = new AudioManager();
let settings = loadSettings();
let highscores = loadHighscores();

setLanguage(settings.options.language || "en");

syncPlayerCount();

let pendingBinding = null;
let highscoreQueue = [];
let currentHighscoreEntry = null;
let highscoreDone = null;

const textures = {};
(() => {
  const TS = Date.now();
  const paths = [
    "spaceship/player1", "spaceship/player2", "spaceship/player3", "spaceship/player4",
    "ufo/ufo", "crony/crony",
    "items/rocket", "items/gatling", "items/laser", "items/shield"
  ];
  for (let i = 1; i <= 11; i++) {
    paths.push(`asteroid/level_${i}/L`);
    paths.push(`asteroid/level_${i}/M`);
    paths.push(`asteroid/level_${i}/S`);
  }
  paths.forEach(p => {
    const img = new Image();
    img.src = `assets/textures/${p}.png?v=${TS}`;
    textures[p] = img;
  });
})();

const game = new CometBustersGame(elements.canvas, input, audio, textures, {
  onPauseChange: (paused) => {
    elements.pauseOverlay.classList.toggle("hidden", !paused);
  },
  onHighscoreRequest: (entries, done) => {
    highscoreQueue = [...entries];
    highscoreDone = done;
    showNextHighscoreEntry();
  },
  onGameFinish: () => {
    elements.startOverlay.classList.remove("hidden");
  },
});

game.setSettings(settings);
game.setHighscores(highscores);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function refreshUiTexts() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.innerHTML = t(el.getAttribute("data-i18n"));
  });
}

function saveAndRefresh() {
  syncPlayerCount();
  saveSettings(settings);
  game.setSettings(settings);
  renderAll();
}

function syncPlayerCount() {
  const count = Math.max(1, Math.min(4, Number(settings.options.playerCount ?? 1)));
  settings.options.playerCount = count;
  settings.players.forEach((player, index) => {
    player.enabled = index < count;
  });
}

function sanitizeInitials(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3) || "AAA";
}

function setPanelCollapsed(collapsed) {
  elements.body.classList.toggle("panel-collapsed", collapsed);
  setTimeout(() => window.dispatchEvent(new Event("resize")), 200);
  if (!collapsed && game && game.started && !game.paused) {
    game.togglePause(true);
  }
}

function blurActiveElement() {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
  }
}

function renderHighscores() {
  const markup = highscores
    .map((entry) => {
      const initials = escapeHtml(entry.initials).padEnd(3, " ").replace(/ /g, "&nbsp;");
      const scoreStr = entry.score.toLocaleString("de-DE").padStart(7, " ").replace(/ /g, "&nbsp;");
      const lvlStr = String(entry.level).padStart(2, "0");
      return `<li>${initials}&nbsp;&nbsp;.....&nbsp;&nbsp;${scoreStr}&nbsp;&nbsp;.....&nbsp;&nbsp;L${lvlStr}</li>`;
    })
    .join("");
  elements.highscoreList.innerHTML = markup;
  if (elements.startHighscoreList) {
    elements.startHighscoreList.innerHTML = markup;
  }
  game.setHighscores(highscores);
}

function deviceOptions(selectedValue) {
  const baseOptions = [
    ["keyboard:kb1", t("keyboard.kb1")],
    ["keyboard:kb2", t("keyboard.kb2")],
    ["keyboard:kb3", t("keyboard.kb3")],
    ["keyboard:kb4", t("keyboard.kb4")],
    ["gamepad:auto", t("gamepad.auto")],
    ["gamepad:0", t("gamepad.1")],
    ["gamepad:1", t("gamepad.2")],
    ["gamepad:2", t("gamepad.3")],
    ["gamepad:3", t("gamepad.4")],
  ];

  return baseOptions
    .map(
      ([value, label]) =>
        `<option value="${value}" ${selectedValue === value ? "selected" : ""}>${label}</option>`,
    )
    .join("");
}

function renderPlayerCards() {
  const tuningLabels = {
    speed: t("pilots.speed"),
    thrust: t("pilots.thrust"),
    shield: t("pilots.shield"),
    burst: t("pilots.burst"),
  };

  elements.playerConfigList.innerHTML = settings.players
    .map((player) => {
      const disabledClass = player.enabled ? "" : " disabled";
      const specialOptions = SPECIALS.map(
        (special) =>
          `<option value="${special.id}" ${player.special === special.id ? "selected" : ""}>${special.label}</option>`,
      ).join("");
      const tuningMarkup = TUNING_FIELDS.map(
        (field) => `
          <div class="tuning-stepper">
            <span>${tuningLabels[field]}</span>
            <div class="stepper-controls">
              <button class="mini-button" type="button" data-player-id="${player.id}" data-tuning-field="${field}" data-direction="-1">-</button>
              <strong class="stepper-value">${player.tuning[field].toFixed(1)}</strong>
              <button class="mini-button" type="button" data-player-id="${player.id}" data-tuning-field="${field}" data-direction="1">+</button>
            </div>
          </div>
        `,
      ).join("");

      return `
        <article class="player-card${disabledClass}" data-player-id="${player.id}">
          <div class="player-header">
            <span class="player-color-dot" style="color:${player.color}; background:${player.color};"></span>
            <div>
              <p class="player-title">${player.name.startsWith("Pilot ") ? t("pilots.defaultName", { id: player.id }) : escapeHtml(player.name)}</p>
              <p class="player-subtitle">${player.enabled ? t("pilots.active") : t("pilots.reserved")}</p>
            </div>
            <span class="tuning-value">${player.enabled ? "ON" : "OFF"}</span>
          </div>

          <label>
            ${t("pilots.name")}
            <input data-field="name" data-player-id="${player.id}" type="text" maxlength="18" value="${escapeHtml(player.name)}" />
          </label>

          <label>
            ${t("pilots.input")}
            <select data-field="device" data-player-id="${player.id}">
              ${deviceOptions(player.device)}
            </select>
          </label>

          <label>
            ${t("pilots.special")}
            <select data-field="special" data-player-id="${player.id}">
              ${specialOptions}
            </select>
          </label>

          <div class="tuning-grid">
            <div class="tuning-total">${t("pilots.total")} ${TUNING_TOTAL.toFixed(1)}</div>
            ${tuningMarkup}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderKeyboardProfiles() {
  const actionLabels = {
    left: t("keyboard.left"),
    right: t("keyboard.right"),
    thrust: t("keyboard.thrust"),
    fire: t("keyboard.fire"),
    special: t("keyboard.special"),
  };

  elements.keyboardProfileList.innerHTML = Object.values(settings.keyboardProfiles)
    .map((profile) => {
      const buttons = Object.entries(profile.bindings)
        .map(
          ([action, code]) => `
            <button
              class="binding-button ${pendingBinding?.profileId === profile.id && pendingBinding?.action === action ? "is-listening" : ""}"
              type="button"
              data-profile-id="${profile.id}"
              data-action="${action}"
            >
              ${actionLabels[action]}: ${formatKeyCode(code)}
            </button>
          `,
        )
        .join("");

      return `
        <article class="keyboard-card">
          <strong>${t("keyboard." + profile.id)}</strong>
          <div class="binding-grid">${buttons}</div>
        </article>
      `;
    })
    .join("");
}

function renderOptions() {
  elements.languageSelect.value = settings.options.language || "en";
  elements.playerCount.value = String(settings.options.playerCount);
  elements.asteroidBilliards.checked = settings.options.asteroidBilliards;
  elements.insanityMode.checked = settings.options.insanityMode;
  elements.friendlyFire.checked = settings.options.friendlyFire;
  elements.particlesEnabled.checked = settings.options.particlesEnabled;
  elements.screenShake.checked = settings.options.screenShake;
  elements.pixelFilter.checked = settings.options.pixelFilter;
  elements.audioEnabled.checked = settings.options.audioEnabled;
  elements.sfxVolume.value = String(settings.options.sfxVolume ?? 50);
  elements.musicVolume.value = String(settings.options.musicVolume ?? 50);
  audio.setSfxVolume((settings.options.sfxVolume ?? 50) / 100);
  audio.setMusicVolume((settings.options.musicVolume ?? 50) / 100);
}

function renderGamepadStatus() {
  const connected = input.getConnectedGamepads();
  if (!connected.length) {
    elements.gamepadStatus.textContent = t("pilots.nogamepad");
    return;
  }

  elements.gamepadStatus.textContent = connected
    .map((pad) => t("gamepad.padId", { index: pad.index + 1, id: pad.id }))
    .join(" | ");
}

function renderAll() {
  refreshUiTexts();
  renderOptions();
  renderPlayerCards();
  renderKeyboardProfiles();
  renderHighscores();
  renderGamepadStatus();
}

function startGame() {
  audio.unlock();
  pendingBinding = null;
  highscoreQueue = [];
  currentHighscoreEntry = null;
  highscoreDone = null;
  blurActiveElement();
  elements.startOverlay.classList.add("hidden");
  elements.highscoreOverlay.classList.add("hidden");
  elements.pauseOverlay.classList.add("hidden");
  saveSettings(settings);
  renderAll();
  const wasOpen = !elements.body.classList.contains("panel-collapsed");
  setPanelCollapsed(true);

  if (wasOpen) {
    setTimeout(() => {
      game.start(settings, highscores);
    }, 250);
  } else {
    game.start(settings, highscores);
  }
}

function showNextHighscoreEntry() {
  currentHighscoreEntry = highscoreQueue.shift() ?? null;
  if (!currentHighscoreEntry) {
    elements.highscoreOverlay.classList.add("hidden");
    if (highscoreDone) {
      highscoreDone(highscores);
      highscoreDone = null;
    }
    renderHighscores();
    return;
  }

  const scoreText = currentHighscoreEntry.score.toLocaleString("de-DE");
  elements.highscorePrompt.textContent = t("highscore.prompt", { player: currentHighscoreEntry.playerName, score: scoreText });
  elements.initialsInput.value = sanitizeInitials(currentHighscoreEntry.playerName);
  elements.highscoreOverlay.classList.remove("hidden");
  elements.initialsInput.focus();
  elements.initialsInput.select();
}

elements.centerStartButton.addEventListener("click", startGame);
elements.resumeButton.addEventListener("click", () => {
  game.togglePause(false);
  setPanelCollapsed(true);
});
elements.restartButton.addEventListener("click", startGame);
elements.openSettingsButton.addEventListener("click", () => {
  setPanelCollapsed(false);
});

elements.panelToggleButton.addEventListener("click", () => setPanelCollapsed(false));
elements.collapsePanelButton.addEventListener("click", () => setPanelCollapsed(true));

elements.languageSelect.addEventListener("change", (event) => {
  settings.options.language = event.target.value;
  setLanguage(settings.options.language);
  saveAndRefresh();
});

elements.playerCount.addEventListener("change", (event) => {
  settings.options.playerCount = Number(event.target.value);
  saveAndRefresh();
});

[
  ["asteroidBilliards", elements.asteroidBilliards],
  ["insanityMode", elements.insanityMode],
  ["friendlyFire", elements.friendlyFire],
  ["particlesEnabled", elements.particlesEnabled],
  ["screenShake", elements.screenShake],
  ["pixelFilter", elements.pixelFilter],
  ["audioEnabled", elements.audioEnabled],
].forEach(([key, element]) => {
  element.addEventListener("change", () => {
    settings.options[key] = element.checked;
    saveAndRefresh();
  });
});

[
  ["sfxVolume", elements.sfxVolume],
  ["musicVolume", elements.musicVolume],
].forEach(([key, element]) => {
  element.addEventListener("input", () => {
    settings.options[key] = Number(element.value);
    audio.setSfxVolume((settings.options.sfxVolume ?? 50) / 100);
    audio.setMusicVolume((settings.options.musicVolume ?? 50) / 100);
  });
  element.addEventListener("change", () => {
    settings.options[key] = Number(element.value);
    saveAndRefresh();
  });
});

elements.playerConfigList.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
    return;
  }

  const playerId = Number(target.dataset.playerId);
  const field = target.dataset.field;
  const player = settings.players.find((entry) => entry.id === playerId);
  if (!player || !field) {
    return;
  }

  if (field === "name") {
    player.name = target.value.slice(0, 18) || `Pilot ${player.id}`;
  } else if (field === "device") {
    player.device = target.value;
  } else if (field === "special") {
    player.special = target.value;
  }

  saveAndRefresh();
});

elements.playerConfigList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-tuning-field]");
  if (!button) {
    return;
  }

  const playerId = Number(button.dataset.playerId);
  const field = button.dataset.tuningField;
  const direction = Number(button.dataset.direction);
  const player = settings.players.find((entry) => entry.id === playerId);
  if (!player || !field || !direction) {
    return;
  }

  player.tuning = adjustPlayerTuning(player.tuning, field, direction);
  saveAndRefresh();
});

elements.keyboardProfileList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-profile-id]");
  if (!button) {
    return;
  }

  pendingBinding = {
    profileId: button.dataset.profileId,
    action: button.dataset.action,
  };
  renderKeyboardProfiles();
});

window.addEventListener(
  "keydown",
  (event) => {
    if (pendingBinding) {
      event.preventDefault();
      const profile = settings.keyboardProfiles[pendingBinding.profileId];
      if (profile) {
        profile.bindings[pendingBinding.action] = event.code;
      }
      pendingBinding = null;
      saveAndRefresh();
      return;
    }

    const targetTag = document.activeElement?.tagName;
    const typingTarget = targetTag === "INPUT" || targetTag === "TEXTAREA" || targetTag === "SELECT";
    if (!typingTarget && game.started && ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      event.preventDefault();
    }

    if (!typingTarget && event.code === "KeyM") {
      setPanelCollapsed(!elements.body.classList.contains("panel-collapsed"));
    }
  },
  true,
);



elements.highscoreForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentHighscoreEntry) {
    return;
  }

  const initials = sanitizeInitials(elements.initialsInput.value);
  highscores = insertHighscore(highscores, {
    initials,
    score: currentHighscoreEntry.score,
    level: currentHighscoreEntry.level,
  });
  elements.highscoreOverlay.classList.add("hidden");
  showNextHighscoreEntry();
});

setInterval(renderGamepadStatus, 1200);

renderAll();
