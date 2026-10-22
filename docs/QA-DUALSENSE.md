# QA with a real DualSense on a TV

A 15-minute checklist for a person with a PS5 DualSense and a TV (PLAN.md 14). Everything here is also covered in
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
- [ ] Right stick held with R3 turns the ISO camera (and MODE 7's rail); R3 tapped cycles ISO, TOP-DOWN, MODE 7.
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

## 6. Not tested, not available (out of scope)

- **Adaptive triggers and HD haptics** need WebHID, which the browser's Gamepad API doesn't expose (PLAN.md 8.1): the
  triggers have no resistance, and the rumble is the pad's two motors only.
- **The light bar and the speaker** aren't reachable from the Gamepad API either.
- **Firefox and Safari** report a DualSense with other button numbers: the game is built and tested on Chromium.

**Report:** for each failed line, the screen, what you did, and what you expected. A phone video helps.
