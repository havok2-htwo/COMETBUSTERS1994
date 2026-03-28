# Comet Busters 1994 Tribute

**A Game by havok2**

Lokales Browser-Arcade-Spiel als Hommage an `Comet Busters!` von 1994. Das Projekt ist auf schnellen Couch-Koop oder lokales Versus mit `1` bis `4` Spielern ausgelegt und kombiniert klassische Asteroiden-Action mit Specials, Weapon-Drops, persistenten Highscores und bewusst ueberzeichneter 90s-Arcade-Praesentation.

## Projektstatus

- Der aktuell genutzte Runtime-Pfad ist `index.html` -> `main.js` -> `game_core.js`.
- Die Mehrsprachigkeit wird gerade separat eingebaut.
- Geplant sind `Englisch`, `Deutsch`, `Franzoesisch`, `Spanisch` und `Italienisch`.
- Solange der Umbau laeuft, koennen Texte, Benennungen oder einzelne Codepfade noch uneinheitlich wirken.

## Feature-Ueberblick

- `1` bis `4` lokale Spieler an einem Rechner
- Keyboard- und Gamepad-Steuerung
- Freie Zuordnung von Namen, Eingabegeraeten und Specials pro Pilot
- Vier Tuning-Werte pro Spieler: `Speed`, `Thrust`, `Shield`, `Burst`
- Feste Tuning-Gesamtsumme von `20`, damit alle Builds vergleichbar bleiben
- `5` Leben pro Spieler, sichere Respawns und lokaler Highscore-Eintrag mit Initialen
- Wrap-Around-Spielfeld ohne Reibung
- Asteroiden in `large`, `medium`, `small` mit Split-Logik
- Level-Countdown, Wave-Clear-Pausen und wechselnde Asteroiden-Themes
- Cronies/Smileys als jagende Gegner
- UFO-Gegner mit Zickzack-Flug und roten Schuessen
- Weapon-Drops: `Rocket`, `Gatling`, `Laser`
- Specials: `Shield`, `Hyperspace`, `Disrupter`, `Cloak`
- Optionale Modi und Komfort-Optionen:
  - `Asteroiden-Billard`
  - `Insanity Mode`
  - `Friendly Fire`
  - `Partikeleffekte`
  - `Screen Shake`
  - `Retro Pixel Filter`
  - `Audio`
  - getrennte `SFX`- und `Musik`-Lautstaerke
- Browser-Audio mit echten Dateien aus `assets/audio/` plus WebAudio-Fallback, falls Dateien fehlen

## Spielablauf

1. Im linken Panel Spielerzahl, Modi, Audio und Eingabegeraete einstellen.
2. Fuer jeden aktiven Piloten Namen, Special und Tuning festlegen.
3. `Spiel starten` klicken.
4. Jede Runde beginnt mit einem kurzen Countdown.
5. Asteroiden zerlegen, Gegner ueberleben, Weapon-Drops einsammeln und moeglichst lange durchhalten.
6. Sind Asteroiden, Cronies und UFOs einer Welle beseitigt, startet nach kurzer Pause das naechste Level.
7. Wenn alle Spieler keine Leben mehr haben, endet das Match. Qualifizierte Scores werden lokal in die Highscore-Liste eingetragen.

## Spieler-Tuning

Jeder Pilot verteilt insgesamt `20` Punkte auf vier Werte:

- `Speed`: beeinflusst Topspeed, Wendigkeit und allgemeines Impulsverhalten
- `Thrust`: bestimmt, wie schnell das Schiff beschleunigt
- `Shield`: verbessert Schild-Effizienz, Respawn-Schutz und die trage Masse des Schiffs
- `Burst`: senkt die Schussabklingzeit der Standardwaffe

Die Stepper im Setup sorgen automatisch dafuer, dass die Gesamtsumme bei `20` bleibt.

## Specials

- `Shield`: wird gehalten statt einmalig ausgeloest. Macht kurzzeitig unverwundbar und zerlegt Objekte bei direkter Kollision. Wenn die Ladung komplett leer ist, greift ein Lockout, bevor wieder geladen werden kann.
- `Hyperspace`: versteckt das Schiff fuer einige Sekunden und setzt es danach an eine moeglichst sichere Position zurueck.
- `Disrupter`: loest eine expandierende Schockwelle aus. Sie zerlegt Bullets, Cronies und UFOs, sprengt Asteroiden auf und schubst andere Spieler weg.
- `Cloak`: macht den Spieler fuer Cronies und andere Zielsysteme unsichtbar. Wenn der Effekt endet, waehrend das Schiff in einem Objekt steckt, stirbt der Spieler.

## Weapon-Drops

Ab `Level 2` kann jeweils ein schwebender Pickup auf dem Feld erscheinen:

- `Rocket`: feuert eine kurze Salve aus zielsuchenden Raketen
- `Gatling`: sehr schnelle Streufeuer-Variante der Standardwaffe
- `Laser`: kontinuierlicher Strahl statt einzelner Projektile

Die HUD-Anzeige zeigt fuer jede Waffe eine eigene Ladungsleiste. Ein neuer Pickup ersetzt die aktuell ausgeruestete Spezialwaffe.

## Gegner und Progression

- Asteroiden starten als grosse Brocken und splitten sich stufenweise herunter.
- Beim Zerstoeren von Asteroiden koennen Cronies entstehen.
- UFOs erscheinen ab `Level 4`.
- Fuer jede Welle werden neue sichere Spawn-Orte fuer Asteroiden gesucht, damit Spieler nicht sofort ueberrannt werden.
- Respawns erfolgen nur, wenn ein Spawnpunkt gerade frei genug ist.

## Spielmodi und Optionen

- `Asteroiden-Billard`: aktiviert Kollisionen zwischen Asteroiden. Dadurch wird das Feld deutlich physischer und chaotischer.
- `Insanity Mode`: Schuesse, Raketen und Laser schubsen Asteroiden hauptsaechlich nur noch herum, statt sie normal zu zerstoeren. Das erzeugt mehr Impuls- und Kettenreaktions-Chaos.
- `Friendly Fire`: macht Waffen-Treffer zwischen Spielern toedlich. Wenn die Option aus ist, koennen andere Spieler durch Projektile trotzdem noch weggeschoben werden.
- `Partikeleffekte`: Schub, Explosionen, Funken und Pickup-Bursts.
- `Screen Shake`: Kamera-Shake bei groesseren Einschlaegen und Explosionen.
- `Retro Pixel Filter`: rendert das Bild leicht herunter- und wieder hochskaliert fuer einen crunchigeren Look.
- `Audio`: aktiviert/deaktiviert Soundeffekte und Musik global.

## Punkte

- `Asteroid large`: `120`
- `Asteroid medium`: `200`
- `Asteroid small`: `320`
- `Crony`: `350`
- `UFO`: `650`
- `Spieler-Kill`: `500`
- `Wave Clear`: `1000` pro noch lebendem Spieler

## Steuerung

### Allgemein

- `Esc`: Pause umschalten
- `Gamepad Start`: Pause umschalten
- `M`: Seitenpanel ein- oder ausklappen
- Wird das Panel waehrend eines laufenden Spiels geoeffnet, pausiert das Spiel automatisch.

### Tastatur

Alle Keyboard-Profile koennen direkt im linken Panel umbelegt werden. Standardbelegung:

- `Keyboard 1`: `A` links, `D` rechts, `W` Schub, `Space` Feuer, `Left Shift` Special
- `Keyboard 2`: `J` links, `L` rechts, `I` Schub, `K` Feuer, `U` Special
- `Keyboard 3`: `Left` links, `Right` rechts, `Up` Schub, `Numpad 0` Feuer, `Numpad 1` Special
- `Keyboard 4`: `F` links, `H` rechts, `T` Schub, `G` Feuer, `R` Special

### Gamepad

Standard-Mapping:

- linker Stick links/rechts oder D-Pad: drehen
- `A`, `RT` oder D-Pad oben: Schub
- `X`, `RB` oder `B`: Feuer
- `Y`, `LB` oder `LT`: Special
- `Start`: Pause

Zusaetzlich gibt es `gamepad:auto`, damit ein Spieler automatisch ein verfuegbares Pad nutzen kann.

## Anleitung für absolute Beginner

Du möchtest das Spiel einfach nur laden und spielen? Folge dieser Schritt-für-Schritt-Anleitung:

### 1. Das Spiel herunterladen (Kopieren)
Du musst das Spiel auf deinen PC kopieren (klonen).
1. Öffne ein Terminal (Eingabeaufforderung / PowerShell in Windows) oder Terminal (Mac/Linux).
2. Tippe folgenden Befehl ein und drücke Enter:
   ```bash
   git clone https://github.com/havok2-htwo/COMETBUSTERS1994.git
   ```
3. Gehe in den heruntergeladenen Ordner:
   ```bash
   cd COMETBUSTERS1994
   ```

### 2. Das Spiel starten
Da dieses Spiel Bilder und Sounds lokal lädt, kann man die `index.html` nicht einfach per Doppelklick öffnen. Es braucht einen Mini-Server im Hintergrund (Python ist meistens schon vorinstalliert).

* **Für Windows-Nutzer:**
  Im Ordner liegt eine Datei namens `start_server.bat`. Du kannst diese Datei einfach **doppelklicken** oder im Terminal `start_server.bat` eingeben.

* **Für Linux/Mac-Nutzer:**
  Im Ordner liegt ein Skript namens `start_server.sh`. Mache es im Terminal zuerst ausführbar und starte es dann:
  ```bash
  chmod +x start_server.sh
  ./start_server.sh
  ```

Das Skript startet den Hintergrund-Server und öffnet danach automatisch deinen Browser auf **http://127.0.0.1:8080**.

### 3. Alternative manuelle Methode (Python/npm)
Falls die Skripte nicht klappen, kannst du den Server manuell im Terminal starten, während du dich im `COMETBUSTERS1994` Ordner befindest:

```bash
# Entweder über Python 3:
python3 -m http.server 8080

# Oder bei älteren Python-Versionen:
python -m http.server 8080

# Oder falls Node.js installiert ist:
npm run serve
```
Danach im Browser aufrufen: `http://127.0.0.1:8080`

## Audio und Musik

### Soundeffekte

Der Loader sucht WAV-Dateien in `assets/audio/<event>/` und waehlt pro Event zufaellig eine Datei aus.

Verwendete Event-Ordner:

- `player_shot`
- `player_hit_push`
- `gatling_fire`
- `laser_fire`
- `rocket_launch`
- `rocket_thrust`
- `game_start`
- `wave_start`
- `wave_clear`
- `explosion_large`
- `explosion_medium`
- `explosion_small`
- `explosion_ship`
- `game_over`
- `shield`
- `hyperspace`
- `disrupter`
- `crony_spawn`
- `crony_die`
- `item_pickup`
- `ufo_spawn`
- `ufo_fire`
- `ufo_die`
- `respawn`

Fehlen Dateien in einem Event-Ordner, nutzt das Spiel automatisch generierte Fallback-Sounds per WebAudio.

### Musik

Hintergrundmusik wird aus `assets/audio/music/` geladen. Unterstuetzt werden derzeit:

- `.mp3`
- `.ogg`
- `.wav`

Sind keine Musikdateien vorhanden, laeuft das Spiel einfach ohne Hintergrundmusik weiter.

### Hinweis zu aelteren Doku-Resten

Aeltere Hinweise in `AUDIO_FILES.txt` oder `assets/audio/README.md` stammen noch aus einem frueheren Stand mit `sounds/...`. Fuer den aktuellen Build ist `assets/audio/...` massgeblich.

## Persistenz

Das Spiel speichert lokal im Browser:

- Einstellungen unter `cometbusters.settings.v1`
- Highscores unter `cometbusters.highscores.v1`

Das bedeutet:

- Einstellungen und Scores sind browser- und profilgebunden.
- Ein anderer Browser oder ein privates Fenster sieht andere bzw. keine gespeicherten Daten.

## Projektstruktur

- `index.html`: UI-Shell, Setup-Panel, Overlays und Canvas
- `main.js`: verbindet DOM, Settings, Audio, Input und den Game-Loop
- `game_core.js`: aktuelle Haupt-Spiellogik
- `constants.js`: Defaults, Specials, Tuning, Scores, Storage-Keys
- `input.js`: Keyboard- und Gamepad-Abfrage
- `audio.js`: Laden und Abspielen von Sounds und Musik
- `storage.js`: Laden/Speichern von Einstellungen und Highscores via `localStorage`
- `style.css`: Layout, HUD-nahe UI und Responsive-Verhalten
- `assets/textures/`: Schiffe, Asteroiden, Gegner und Item-Sprites
- `assets/audio/`: Soundeffekte und Musik

## Entwicklerhinweise

- `game.js` liegt noch im Projekt, wird von `index.html` aktuell aber nicht geladen und ist eher als aelterer Entwicklungsstand zu verstehen.
- Das Spiel ist momentan klar fuer Desktop-Browser und lokales Multiplayer-Setup gedacht. Es gibt keine Touch-Steuerung.
- Da parallel an Lokalisierung gearbeitet wird, sind kleinere Inkonsistenzen in Texten oder Dateinamen aktuell erwartbar.

## Referenzmaterial

Die Dateien in `old_reference_images/` wurden als visuelle Orientierung fuer Stil, HUD und Gesamtstimmung verwendet. Falls der Ordner lokal gerade fehlt oder geaendert wurde, hat das keinen Einfluss auf die Laufzeit des Spiels.
