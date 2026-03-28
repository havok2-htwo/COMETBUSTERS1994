# Comet Busters 1994 Tribute

Ein lokal spielbares Browser-Arcade-Spiel als Hommage an `Comet Busters!` von 1994.

## Features

- 1 bis 4 Spieler
- Keyboard- und Gamepad-Steuerung
- Wrap-Around-Flugphysik ohne Reibung
- Asteroiden in drei Groessen mit Splits
- Cronies/Smiley-Gegner mit einfacher Suchlogik
- Kleines UFO mit Zickzack-Flug und roten Schuessen
- Specials: `Shield`, `Hyperspace`, `Disrupter`, `Cloak`
- Optionaler `Asteroiden-Billard`-Modus
- Persistente Highscores mit Initialen
- Audio-Fallback per WebAudio, optional mit zufaellig gewaelten WAV-Dateien pro Event

## Starten

1. Im Projektordner `start_server.bat` starten.
2. Im Browser `http://127.0.0.1:8080` aufrufen.
3. Links Spieler, Eingaben und Specials einstellen.
4. `Spiel starten` klicken.

Alternativ:

```powershell
python -m http.server 8080
```

## Audio-Dateien

Wenn du eigene Sounds nutzen willst, lege WAV-Dateien in die passenden Unterordner unter [sounds](/x:/dev/COMETBUSTERS1994/sounds). Alle `.wav`-Dateien eines Events werden beim Start geladen und dann zufaellig ausgewaehlt.

Wichtige Event-Ordner:

- `player_shot`, `gatling_fire`, `laser_fire`
- `rocket_launch`, `rocket_thrust`
- `game_start`, `wave_start`, `wave_clear`, `game_over`
- `explosion_large`, `explosion_medium`, `explosion_small`, `explosion_ship`
- `shield`, `hyperspace`, `disrupter`
- `crony_spawn`, `crony_die`
- `ufo_spawn`, `ufo_fire`, `ufo_die`
- `item_pickup`, `respawn`

Wenn in einem Event-Ordner keine WAV-Datei liegt, nutzt das Spiel automatisch die bisherigen eingebauten Fallback-Sounds.

## Steuerung

- Keyboard-Profile lassen sich direkt im linken Panel umbelegen.
- Gamepads nutzen den Browser-Gamepad-Support.
- Standard-Gamepad:
  - Stick links/rechts oder D-Pad: drehen
  - `A` / Trigger: Schub
  - `X` / `RB` / `B`: Feuer
  - `Y` / `LB`: Special
  - `Start`: Pause

## Referenz

Die hochgeladenen Screens unter [old_reference_images](/x:/dev/COMETBUSTERS1994/old_reference_images) dienten als visuelle Orientierung fur HUD und Stimmung.
