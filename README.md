# Comet Busters 1994 Tribute

**A Game by havok2**

Local browser arcade game as a tribute to `Comet Busters!` from 1994. The project is designed for fast couch co-op or local versus with `1` to `4` players and combines classic asteroid action with specials, weapon drops, persistent highscores, and deliberately exaggerated 90s arcade presentation.

[![Gameplay Video](https://img.youtube.com/vi/E7HvAQXh4fg/0.jpg)](https://youtu.be/E7HvAQXh4fg)


## Project Status

- The currently used runtime path is `index.html` -> `main.js` -> `game_core.js`.
- Multilanguage support is implemented and working.
- Supported languages are `English`, `German`, `French`, `Spanish` and `Italian`.

## Feature Overview

- `1` to `4` local players on one computer.
- Keyboard and gamepad controls.
- Free assignment of names, input devices, and specials per pilot.
- Four tuning values per player: `Speed`, `Thrust`, `Shield`, `Burst`.
- Fixed total tuning sum of `20` to keep all builds comparable.
- `5` lives per player, safe respawns, and local highscore entry with initials.
- Wrap-around playfield without friction (ships, bullets, particles, and force effects all wrap correctly).
- Asteroids in `large`, `medium`, `small` with split logic.
- Level countdown, wave-clear pauses, and changing asteroid themes.
- Cronies/Smileys as hunting enemies.
- UFO enemies with zigzag flight and red shots.
- Weapon drops: `Rocket`, `Gatling`, `Laser`, `Mega Destructor` (rare).
- Specials: `Shield`, `Hyperspace`, `Disrupter`, `Cloak`.
- Optional modes and comfort options:
  - `Asteroid Billiards`
  - `Insanity Mode`
  - `Friendly Fire`
  - `Items` (can be disabled for a pure hardcore experience)
  - `Particle Effects`
  - `Screen Shake`
  - `Retro Pixel Filter`
  - `Audio`
  - Separate `SFX` and `Music` volume
- Browser audio using real files from `assets/audio/` plus WebAudio fallback if files are missing.
- Spatial stereo audio: sounds pan left/right based on where they occur on screen.

## Gameplay

1. Set the player count, modes, audio, and input devices in the left panel.
2. For each active pilot, adjust the name, special, and tuning.
3. Click `Start Game`.
4. Every round begins with a short countdown.
5. Blast asteroids, survive enemies, collect weapon drops, and hold out as long as possible.
6. Once all asteroids, cronies, and UFOs of a wave are eliminated, the next level starts after a brief pause.
7. If all players run out of lives, the match ends. Qualifying scores are entered into the local highscore list.

## Player Tuning

Each pilot distributes a total of `20` points across four stats:

- `Speed`: Influences top speed, maneuverability, and general momentum handling.
- `Thrust`: Determines how fast the ship accelerates.
- `Shield`: Improves shield efficiency, respawn protection, and the ship's mass.
- `Burst`: Lowers the cooldown of the standard weapon.

The steppers in the setup automatically ensure the sum remains exactly `20`.

## Specials

- `Shield`: Channelled instead of a single trigger. Grants brief invulnerability and destroys objects on direct impact. If the charge is completely depleted, a lockout triggers before it can be recharged.
- `Hyperspace`: Hides the ship for a few seconds and then reappears at the safest possible random location.
- `Disrupter`: Unleashes an expanding shockwave. It destroys bullets, cronies, and UFOs, breaks asteroids, and pushes other players away.
- `Cloak`: Makes the player invisible to cronies and other targeting systems. If the effect ends while the ship is inside an object, the player dies.

## Weapon Drops

Starting from `Level 2`, a floating pickup can appear on the field:

- `Rocket`: Fires a short burst of homing missiles.
- `Gatling`: Very fast rapid-fire variant of the standard weapon.
- `Laser`: Continuous beam instead of individual projectiles. Wraps around screen edges.
- `Mega Destructor` *(rare – ~8% spawn chance)*: Fires a single, massive expanding shockwave that clears the entire screen of asteroids, cronies, and UFOs instantly. Accompanied by heavy camera shake.

The HUD shows a dedicated charge bar for every active weapon. A new pickup replaces the currently equipped special weapon.

The `Items` option in the setup panel can be disabled entirely for a pure ships-only experience.

## Enemies and Progression

- Asteroids start as large chunks and split stepwise down to smaller pieces.
- Destroying asteroids has a chance to spawn Cronies.
- UFOs start appearing from `Level 4` onwards.
- Every wave looks for secure spawn locations for asteroids so players aren't instantly overrun.
- Respawns only occur when a spawn point is clear enough.

## Game Modes and Options

- `Asteroid Billiards`: Enables collisions between asteroids. This makes the field significantly more physical and chaotic.
- `Insanity Mode`: Shots, rockets, and lasers mostly push asteroids around instead of destroying them normally. This creates high-momentum and chain-reaction chaos.
- `Friendly Fire`: Makes weapon hits between players lethal. If disabled, other players can still be pushed away by projectiles.
- `Items Enabled`: Toggles whether weapon drops appear on the field. Disable for a pure, hardcore asteroids experience.
- `Particle Effects`: Thrusters, explosions, sparks and pickup bursts.
- `Screen Shake`: Camera shake on larger impacts and explosions.
- `Retro Pixel Filter`: Renders the image slightly downscaled and upscaled again for a crunchier look. Pixel size is adjustable via slider.
- `Audio`: Globally toggles sound effects and music.

## Scoring

- `Asteroid large`: `120`
- `Asteroid medium`: `200`
- `Asteroid small`: `320`
- `Crony`: `350`
- `UFO`: `650`
- `Player Kill`: `500`
- `Wave Clear`: `1000` per surviving player

## Controls

### General

- `Esc`: Toggle pause
- `Gamepad Start`: Toggle pause
- `M`: Toggle the side panel
- If the panel is opened during an active game, the game pauses automatically.

### Keyboard

All keyboard profiles can be remapped directly in the left panel. Default bindings:

- `Keyboard 1`: `A` left, `D` right, `W` thrust, `Space` fire, `Left Shift` special
- `Keyboard 2`: `J` left, `L` right, `I` thrust, `K` fire, `U` special
- `Keyboard 3`: `Left` left, `Right` right, `Up` thrust, `Numpad 0` fire, `Numpad 1` special
- `Keyboard 4`: `F` left, `H` right, `T` thrust, `G` fire, `R` special

### Gamepad

Default mapping:

- Left Stick left/right or D-Pad: Rotate
- `A`, `RT` or D-Pad up: Thrust
- `X`, `RB` or `B`: Fire
- `Y`, `LB` or `LT`: Special
- `Start`: Pause

There is also a `gamepad:auto` input which lets a player automatically bind to an available gamepad.

## Absolute Beginners Guide

You just want to download the game and play it? Follow this step-by-step guide:

### 1. Download the Game (Clone)
You need to copy (clone) the game to your PC.
1. Open a terminal (Command Prompt / PowerShell on Windows) or Terminal (Mac/Linux).
2. Type the following command and press Enter:
   ```bash
   git clone https://github.com/havok2-htwo/COMETBUSTERS1994.git
   ```
3. Enter the downloaded folder:
   ```bash
   cd COMETBUSTERS1994
   ```

### 2. Start the Game
Because this game loads images and sound files locally, you can't just double-click `index.html`. It needs a mini-server running in the background (Python is usually pre-installed on most systems).

* **For Windows users:**
  There is a file called `start_server.bat` in the folder. You can simply **double-click** it or type `start_server.bat` in your terminal.

* **For Linux/Mac users:**
  There is a script called `start_server.sh` in the folder. Make it executable first and then run it:
  ```bash
  chmod +x start_server.sh
  ./start_server.sh
  ```

The script starts the background server and automatically opens your browser at **http://127.0.0.1:8080**.

### 3. Alternative Manual Method (Python/npm)
If the scripts don't work, you can start the server manually in your terminal while inside the `COMETBUSTERS1994` folder:

```bash
# Using Python 3:
python3 -m http.server 8080

# Or with older Python versions:
python -m http.server 8080

# Or if Node.js is installed:
npm run serve
```
Then open your browser and navigate to: `http://127.0.0.1:8080`

## Audio and Music

### Sound Effects

The loader searches for WAV files in `assets/audio/<event>/` and picks a random file per event.

Used event folders:

| Folder | Trigger |
|---|---|
| `player_shot` | Standard weapon fire |
| `player_hit_push` | Player pushed by weapon |
| `gatling_fire` | Gatling gun shot |
| `laser_fire` | Laser beam start |
| `rocket_launch` | Rocket fired |
| `rocket_thrust` | Rocket in flight |
| `game_start` | Match begins |
| `wave_start` | New wave countdown |
| `wave_clear` | Wave completed |
| `explosion_large` | Large asteroid destroyed |
| `explosion_medium` | Medium asteroid destroyed |
| `explosion_small` | Small asteroid destroyed |
| `explosion_ship` | Player ship destroyed |
| `game_over` | All players eliminated |
| `shield` | Shield active (looped while held) |
| `hyperspace` | Hyperspace jump |
| `disrupter` | Disrupter shockwave |
| `mega_destructor` | Mega Destructor fired |
| `crony_spawn` | Crony/Smiley appears |
| `crony_die` | Crony eliminated |
| `item_pickup` | Weapon drop collected |
| `ufo_spawn` | UFO appears |
| `ufo_fire` | UFO shoots |
| `ufo_die` | UFO eliminated |
| `respawn` | Player respawns |
| `recharge` | Special ability fully recharged |
| `player_out` | A player loses their last life (if others still alive) |

If an event folder is missing files, the game automatically falls back to generated WebAudio placeholder sounds.

### Spatial Audio

All in-game sounds are spatially panned based on where they occur on screen:

- Left third of screen → slightly quieter on the right speaker
- Centre third → full stereo
- Right third of screen → slightly quieter on the left speaker

Maximum attenuation is `-6 dB`. UI sounds (game start, game over, wave clear etc.) are always played in full stereo.

### Music

Background music is loaded from `assets/audio/music/`. Currently supported formats:

- `.mp3`
- `.ogg`
- `.wav`

If no music files are found, the game will seamlessly continue without background music.


## Persistence

The game saves locally in your browser:

- Settings under `cometbusters.settings.v1`
- Highscores under `cometbusters.highscores.v1`

This means:

- Settings and scores are tightly tied to your browser and local profile.
- A different browser or an incognito window will have different (or zero) saved data.

## Project Structure

- `index.html`: UI shell, setup panel, overlays, and canvas
- `main.js`: Binds DOM, settings, audio, input, and the game loop
- `game_core.js`: Current core game logic
- `constants.js`: Defaults, specials, tuning, scores, storage keys
- `input.js`: Keyboard and gamepad polling
- `audio.js`: Loading and playback of sounds and music
- `storage.js`: Loading/saving settings and highscores via `localStorage`
- `style.css`: Layout, contextual HUD UI and responsive behavior
- `i18n.js`: Translation engine and dictionary
- `assets/textures/`: Ships, asteroids, enemies, and item sprites
- `assets/audio/`: Sound effects and music

## Developer Notes

- `game.js` is still in the project but currently not loaded by `index.html`. It serves as an older development baseline.
- The game is primarily intended for desktop browsers and local multiplayer setups. There are currently no touch controls.
- As localization was recently introduced, minor inconsistencies in text strings or filenames might still pop up.
