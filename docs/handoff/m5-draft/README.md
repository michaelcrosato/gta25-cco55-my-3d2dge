# M5 draft (parked, not part of the build)

These files are an early start on M5 (roads and traffic). They were written during M4's last session and parked here
when the owner asked for M4 to be finished and M5 left to the next session. They are not imported, built, linted
(`eslint.config.js` ignores `docs/handoff/**`) or tested by `npm test`. Use them, rework them or delete them: the
next session decides.

To restore them, run this from the repository's root:

```sh
cp -r docs/handoff/m5-draft/src docs/handoff/m5-draft/tests docs/handoff/m5-draft/tools . && rm -r docs/handoff/m5-draft
```

`eslint.config.js` already lists `nav` and `ai` in its determinism set.

## What is here

| File | What it is | State |
|---|---|---|
| `src/motor/nav/roadgraph.js` | `RoadGraph(city)`, the lane graph (PLAN.md 8.7). It turns the city's road strips into directed lanes per kind (`LANES`: offsets and speeds for street, avenue, alley, deck, ramp and stub), and the junctions, deck corners, tees and ramp feet into regions (overlapping regions merged). It cuts lanes where they are blocked and joins them with connectors (straight, left, right, U-turn, lane change; right turns go outer to outer, left turns inner to inner). It prunes to the strongly connected core with Tarjan's algorithm. It also provides `nearestLane`, `pointOn`, `pointOnConn` and `stats()`. | Works on Lowtown: 259 lanes, 662 connectors and 11 dropped pieces (the cut ends under the ramps), built in about 25 ms |
| `src/motor/nav/gps.js` | `GPS(graph)`, A* over the lanes. Each step costs the time to cross it, plus a penalty for the move (`MOVE_PENALTY`). `dijkstra` is the reference, and `routeTo(x, y, heading, tx, ty)` routes between two world points. | Works: A* matches Dijkstra on 1,000 pairs, and the median route across the city is under 2 ms |
| `src/motor/nav/signals.js` | Phase signals: NS green, amber, all red, then EW, offset junction by junction (knobs `signalGreen`, `signalAmber`, `signalClear`); `signalAt(region, t)` and `lightFor(conn, graph, t)`. Stop-sign junctions return `'stop'`. | Works |
| `tests/unit/roadgraph.test.mjs` | 4 tests: reachability and dead ends; connectors meet their lanes and turns keep to their lanes; A* against Dijkstra plus the 2 ms route; signal timing | All 4 passed with M4's final tree |
| `src/motor/ai/driver.js` | `DriverBrain(vehicle, graph, { rng, lane, s })`. It grows a path of lanes ahead (`TURN_W` weights; dead ends are never chosen unless forced), follows it by pure pursuit, keeps its distance by IDM (`idmGap`, `idmMin`, `idmAccel`, `idmBrake`) and slows for corners ahead. At junctions it keeps the stop lines (red, amber with a stopping-distance check, green). A left turn needs a claim on the junction; a stop sign means halt, then claim. It holds back when its exit is full (don't block the box). It also honks and passes, makes three-point turns at dead ends, and re-snaps to a lane when knocked more than 48 u off its path. | **Draft, with stalls** (below) |
| `tools/traffic-probe.mjs` | Runs N Cortezes with brains for S seconds of Lowtown, headless. It reports crash steps, the longest stall and the stuck cars, with their region and leader. | A probe, not a test |

## Known problems in the DriverBrain (the last probe run: 30 cars, 120 s)

The probe printed: `crash steps 10185, max still 108.7 s, avg health 91.1`.

- **Stop-sign junctions stall** for 23-42 s (regions j4, j18, j14). The suspected cause is the claim and the full-exit
  check holding each other up: a driver that holds the claim waits on `_exitFull` while every other approach waits on
  the claim. Two fixes to try: claim only once the exit is clear, and let a claim lapse when its owner isn't moving.
- **A car waits at a ramp foot** (region f49) for 35 s after a hard hit.
- **A car ends up in the sea**: the dead-end turnaround on Seawall Drive's north stub, at about (2481, 181), drove a
  car into the water. The three-point turn checks `world.water`, but it still went in.
- **Crashes inside the boxes** at j9, j15 and j16: drivers crossing each other's paths. Check which connectors cross,
  and give the claims their conflict sets.

## Not started

Everything else in M5: the annulus traffic spawner (spawning on live lanes away from dead ends), the sidewalks, the
PedBrain and crowd reactions, witnesses, the emergency services (the Medic and the Pumper on call), the Marching
Mimes, LOD, the AutoPlayer's core, and the 10-minute soak sims of accept 8.9 and 8.10.
