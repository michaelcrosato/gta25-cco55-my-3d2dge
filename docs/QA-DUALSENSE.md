# QA with a real DualSense on a TV

A 22-minute checklist for a person with a PS5 DualSense and a TV (PLAN.md 14; the triggers and the desktop app, L7). Everything here is also covered in
tests by a stand-in pad (`tests/fixtures/pads.mjs`: a DualSense's id at any index, not only pad 0, with analog
triggers) and by the bot playing every mission through it (`tools/bot.mjs --pad`); what a stand-in can't prove is how
it feels and reads from the sofa. Tick each line, and note anything that
fails with the screen it was on.

**Setup (1 min).** Chromium, Chrome or Edge on a computer plugged into the TV, full screen. The controller by USB or
Bluetooth. Open `dist/index.html`. Sit where you'd sit to play, about 10 feet back.

## 1. Glyphs and the title (2 min)

- [ ] Press any button on the attract mode: it leaves at once, to the title. The title's legend shows ✕ ○ △ □ (not
      A B X Y, and not keyboard keys).
- [ ] Unplug the controller and plug it in again on the title: still PlayStation symbols; a key pressed on a keyboard
      switches every prompt to keys, and the next pad button switches them back.
- [ ] SETTINGS, CONTROLS, Button symbols: Auto, PlayStation, Xbox, Nintendo each redraw every prompt.
- [ ] Every menu can be read from the sofa: no line you have to lean in for (SETTINGS, the map, the phone, the shop,
      JOB DONE). HUD size Large and Huge make it bigger still and nothing leaves the screen's edges.

## 2. The sticks and triggers (4 min)

- [ ] NEW GAME. Walk with the left stick: a light push walks, a full one runs; no drift with the stick let go.
- [ ] Hold L2: the aim locks on; R2 fires. Tap R2 at the range of a stick: the gun fires once.
- [ ] Get in a car (△). R2 a little: the car creeps; R2 halfway: about half the speed of R2 held; L2 brakes, then
      reverses. The speed follows the trigger smoothly, not in steps.
- [ ] R1 (the handbrake) slides the back out in a turn; L1 (nitro) when fitted.
- [ ] The right stick turns the camera (a flick a quarter, held a spin); with L2 held it aims instead and the camera
      holds still; R3 tapped cycles ISO, TOP-DOWN, MODE 7. ○ reloads, L2 + □ rolls, L3 in a car sounds the horn.
- [ ] SETTINGS, CONTROLS, Control scheme: Original. Now the right stick aims, R3 held with it turns the camera, ○
      rolls. Back to Modern.
- [ ] SETTINGS, CONTROLS: the stick dead zone and Invert aim change what the stick does at once.

## 3. Rumble (3 min)

- [ ] Crash the car into a wall: one hard shake; a light knock: a light one.
- [ ] Fire the Snub .38 (a tap) and the Persuader (a heavy kick): different strengths; the Buzzsaw a light buzz.
- [ ] A punch that lands: a short tap. An explosion near you (a car you shot burning out): a big shake, less from
      farther off.
- [ ] Get badly hurt (under a quarter of your health): a lub-dub heartbeat until you heal or die.
- [ ] Jump a car off a ramp (the Container Stack off Brick Lane): a thump on landing.
- [ ] SETTINGS, CONTROLS, Vibration at 0: no rumble at all; at full: stronger than the default.
- [ ] Leave it on the title for ten seconds into the attract mode: the demo crashes and shoots, and the controller
      never shakes.

## 4. The pad's own buttons (2 min)

- [ ] Options pauses and resumes; the touchpad opens the map; Create opens photo mode.
- [ ] D-pad ↑ the phone, ↓ the character switch, ← → the radio in a car and the weapons on foot.
- [ ] L3 + R3 together fire the character's ability.
- [ ] Rebind a button (SETTINGS, CONTROLS, REBIND): press the new one; it works in play and survives a reload of the
      page; DEFAULTS puts it back.

## 5. Losing the controller (1 min)

- [ ] Unplug it, or switch it off, in play: the game pauses with the pause screen.
- [ ] Plug it back in: the pause screen answers to it; resume.

## 6. The triggers and the light bar: WebHID (4 min)

In Chrome or Edge (not Firefox or Safari, which have no WebHID), or in the desktop app (`npm run desktop`), which
grants the controller at once. By USB first; then once by Bluetooth.

- [ ] Chrome or Edge: SETTINGS, CONTROLS, DualSense haptics: switch it Off and On with a key or a click (a pad's
      button can't open the browser's prompt). The browser asks which device: pick the DualSense. In the desktop app:
      no prompt at all.
- [ ] On foot with the Snub .38 drawn: R2 has a click partway down, like a gun's break; L2 a light stop. Fire it
      empty: R2 goes slack until it is reloaded.
- [ ] The Buzzsaw: R2 buzzes once pulled past a third, faster than a pistol could fire. The Boom Tube: a long, hard
      pull. Fists or the Snap camera: both triggers free.
- [ ] In a car: R2 gives a little all the way down; L2 is firmer. A bus or a van, firmer again. Shoot the car until it
      smokes: R2 coughs. Off a ramp, in the air: both go slack, and the landing thumps as before.
- [ ] The Duster on Ironside Airstrip: a light throttle; let the speed bleed off in a climb until it stalls: R2 shakes.
- [ ] The light bar: Dex's red, Viv's teal, Gus's orange as you switch between them. A star: it flashes red and blue,
      and the five player lights count the stars. Badly hurt: a slow red pulse.
- [ ] Pause (Options), the map, the phone: the triggers go slack. The attract mode: slack, the light bar dim, no
      rumble.
- [ ] The rumble (section 3) still felt, now from the same report: a crash, a shot, a blast.
- [ ] SETTINGS, CONTROLS, DualSense haptics Off: the triggers free and the light bar the system's again; the rumble
      back on the Gamepad API's.
- [ ] By Bluetooth: the same, and the sticks and buttons still answer (if they stop once haptics connect, note it: the
      controller's Bluetooth reports change mode for some systems; USB is the fallback).
- [ ] Unplug it in play: the game pauses (section 5); plug it in again: the triggers and the light bar come back by
      themselves, no prompt.

## 7. The desktop app (3 min)

- [ ] `npm run desktop:build`, then the app in `desktop/out/` (Windows: `grand-theft-moto.exe`; Linux and the Steam
      Deck: `grand-theft-moto`, in Game Mode added to Steam as a non-Steam game; macOS: the `.app`). It opens full
      screen on the attract mode; F11 in and out of full screen; Esc is the game's pause.
- [ ] Photo mode (Create, then ✕): the PNG lands in the Pictures folder.
- [ ] The Steam Deck: the Deck's own controls play it (Steam Input, as an Xbox pad); a DualSense plugged in plays it with
      its triggers.

## 8. Not tested, not available (out of scope)

- **HD haptics and the speaker:** the DualSense plays its haptics through audio channels the browser doesn't open, so
  the rumble is its two motors (by WebHID, or the Gamepad API's) and the triggers' effects (section 6).
- **Firefox and Safari** report a DualSense with other button numbers and have no WebHID: the game is built and tested
  on Chromium (in Firefox and Safari the rumble is the Gamepad API's, the triggers free, the light bar the system's).

**Report:** for each failed line, the screen, what you did, and what you expected. A phone video helps.
