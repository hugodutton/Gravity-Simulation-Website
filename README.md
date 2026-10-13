# N-Body Gravity Simulator

An interactive gravity sandbox that runs entirely in your browser. Launch planets, build solar systems, watch a galaxy get disturbed by a passing star, and see Newtonian gravity do the rest. It's plain HTML, CSS and vanilla JavaScript, with no frameworks, no build step and no dependencies.

<!-- Add a screenshot or GIF here: ![N-body simulator](docs/screenshot.png) -->

**Live demo:** `https://YOUR-USERNAME.github.io/YOUR-REPO/` (replace after enabling GitHub Pages, see below)

## Features

- Real N-body physics: every body attracts every other body
- Click and drag to launch new bodies with the mass and velocity you choose
- Five scenarios: solar system, binary star with circumbinary planets, the figure-eight three-body orbit, a galaxy disc with an intruder, and a collapsing random cluster
- Optional merging on collision, conserving mass and momentum
- Live sliders for simulation speed, gravitational strength and new-body mass
- Fading orbit trails, zoom and pan
- An energy-drift readout so you can see how well the integrator conserves energy
- Sharp rendering on high-DPI screens; touch devices can launch bodies

## Getting started

No install needed. Clone the repo and open `index.html` in a browser:

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO
open index.html        # or double-click the file
```

If you prefer a local server: `python3 -m http.server`, then visit `http://localhost:8000`.

### Deploy with GitHub Pages

1. Push the project to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. After a minute your site is live at `https://YOUR-USERNAME.github.io/YOUR-REPO/`.

## Controls

| Action | How |
| --- | --- |
| Launch a body | Click and drag on the canvas. The arrow shows the launch velocity: a longer drag is faster. |
| Drop a stationary body | Click without dragging |
| Zoom | Scroll wheel (zooms towards the cursor) |
| Pan | Shift + drag, right-drag or middle-drag |
| Pause or resume | `Space` or the Pause button |
| Reset the scenario | Reset button |

The sliders change speed, the gravitational constant (G) and the mass of bodies you launch. Changing G mid-orbit is a good way to see what happens when the physics shifts underneath a stable system.

## How it works

**Gravity.** Each pair of bodies attracts with the force `F = G·m₁·m₂ / (r² + ε²)`. The small softening term `ε` stops the force from blowing up when two bodies pass very close to each other. Forces are summed over every pair, so the cost grows with the square of the body count.

**Integration.** Positions and velocities are advanced with velocity Verlet (a kick-drift-kick leapfrog scheme). It is second-order accurate and symplectic, so energy errors stay bounded over long runs instead of steadily growing, which is why orbits stay orbits.

**Time steps.** The simulation is sub-stepped so the step size never exceeds 0.05 time units, whatever the frame rate or speed setting. Simulated time is tied to real time, so it runs at the same pace on 60 Hz and 120 Hz displays.

**Collisions.** With merging on, two bodies that come within 70% of their combined radii become one. The new body has the summed mass, the mass-weighted centre position and the momentum-conserving velocity. Radius follows mass assuming constant density.

**Energy drift.** The panel compares total energy (kinetic plus potential) with a baseline. The baseline resets whenever you add a body, merge two, or change G, because those events change the energy on purpose.

**Rendering.** Everything is drawn on a 2D canvas. Trails are produced by fading the previous frame rather than storing point histories, so they cost nothing; they are cleared when you pan or zoom.

Units are arbitrary. With G = 1, a body at distance `r` from mass `M` has circular orbital speed `√(G·M / r)`, which is what the scenarios use.

## Project structure

```
├── index.html   # page layout and control panel
├── style.css    # styling
├── script.js    # physics, rendering and input handling
└── README.md
```

## Customising

- **Add a scenario:** add a function to the `presets` object in `script.js` (use `addBody` and `orbit`), then add a matching `<option value="yourName">` to the `#preset` select in `index.html`.
- **Tune the physics:** `EPS2` (softening), the `0.05` maximum step size and the `0.7` merge distance in `script.js` are the main knobs.

## Limitations and ideas

- The force calculation is O(n²). A few hundred bodies run smoothly on most machines; thousands would need a Barnes–Hut quadtree.
- The simulation is 2D only.
- Panning needs a mouse (or trackpad); touch screens can launch bodies and zoom is mouse-wheel only.
- Ideas: follow-the-body camera, velocity arrows, saving and loading scenarios, elastic collisions.

## License

MIT. Add a `LICENSE` file (GitHub can generate one for you when you create the repository).
