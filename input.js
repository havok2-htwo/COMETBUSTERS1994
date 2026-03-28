import { DEFAULT_KEYBOARD_PROFILES, INPUT_ACTIONS } from "./constants.js";

const EMPTY_STATE = Object.freeze({
  left: false,
  right: false,
  thrust: false,
  fire: false,
  special: false,
  firePressed: false,
  specialPressed: false,
});

export class InputManager {
  constructor() {
    this.keys = new Set();
    this.currentStates = new Map();
    this.previousStates = new Map();
    this.pauseDown = false;
    this.pausePressed = false;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
  }

  destroy() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
  }

  handleKeyDown(event) {
    this.keys.add(event.code);
  }

  handleKeyUp(event) {
    this.keys.delete(event.code);
  }

  handleBlur() {
    this.keys.clear();
    this.currentStates.clear();
    this.previousStates.clear();
    this.pauseDown = false;
    this.pausePressed = false;
  }

  update(settings) {
    const previousPauseState = this.pauseDown;
    this.pauseDown = this.keys.has("Escape");

    const gamepads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    for (const pad of gamepads) {
      if (pad && pad.buttons[9]?.pressed) {
        this.pauseDown = true;
      }
    }

    this.pausePressed = this.pauseDown && !previousPauseState;

    this.previousStates = new Map(
      Array.from(this.currentStates.entries(), ([playerId, state]) => [
        playerId,
        { ...state },
      ]),
    );
    this.currentStates.clear();

    for (const playerConfig of settings.players) {
      const actionState = this.readPlayerState(playerConfig, settings.keyboardProfiles, gamepads);
      this.currentStates.set(playerConfig.id, actionState);
    }
  }

  readPlayerState(playerConfig, keyboardProfiles, gamepads) {
    const state = {
      left: false,
      right: false,
      thrust: false,
      fire: false,
      special: false,
    };

    if (!playerConfig.enabled) {
      return state;
    }

    if (playerConfig.device.startsWith("keyboard:")) {
      const profileId = playerConfig.device.split(":")[1];
      const profile =
        keyboardProfiles[profileId] ??
        DEFAULT_KEYBOARD_PROFILES[profileId] ??
        DEFAULT_KEYBOARD_PROFILES.kb1;

      for (const action of INPUT_ACTIONS) {
        const code = profile.bindings[action];
        state[action] = code ? this.keys.has(code) : false;
      }

      return state;
    }

    if (playerConfig.device.startsWith("gamepad:")) {
      const rawPadIndex = playerConfig.device.split(":")[1];
      let gamepad = null;

      if (rawPadIndex === "auto") {
        gamepad = gamepads[playerConfig.id - 1] ?? gamepads.find(Boolean) ?? null;
      } else {
        gamepad = gamepads[Number(rawPadIndex)] ?? null;
      }

      if (!gamepad) {
        return state;
      }

      const axisX = gamepad.axes[0] ?? 0;
      state.left = axisX < -0.35 || Boolean(gamepad.buttons[14]?.pressed);
      state.right = axisX > 0.35 || Boolean(gamepad.buttons[15]?.pressed);
      state.thrust =
        Boolean(gamepad.buttons[0]?.pressed) ||
        Boolean(gamepad.buttons[7]?.pressed) ||
        Boolean(gamepad.buttons[12]?.pressed);
      state.fire =
        Boolean(gamepad.buttons[2]?.pressed) ||
        Boolean(gamepad.buttons[5]?.pressed) ||
        Boolean(gamepad.buttons[1]?.pressed);
      state.special =
        Boolean(gamepad.buttons[3]?.pressed) ||
        Boolean(gamepad.buttons[4]?.pressed) ||
        Boolean(gamepad.buttons[6]?.pressed);
    }

    return state;
  }

  getPlayerState(playerId) {
    const current = this.currentStates.get(playerId) ?? EMPTY_STATE;
    const previous = this.previousStates.get(playerId) ?? EMPTY_STATE;

    return {
      ...current,
      firePressed: current.fire && !previous.fire,
      specialPressed: current.special && !previous.special,
    };
  }

  wasPausePressed() {
    return this.pausePressed;
  }

  getConnectedGamepads() {
    const gamepads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    return gamepads
      .filter(Boolean)
      .map((pad, index) => ({
        index,
        id: pad.id,
      }));
  }
}
