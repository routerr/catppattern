# AGENTS.md

Procedural generator that renders symmetric circular ("mandala-style") patterns using
matplotlib, coloured with the hardcoded Catppuccin Mocha palette. The entire project is
a single script: `catpattern.py` plus a `generate.sh` batch runner.

## Running

```bash
# install deps (there is NO requirements.txt / pyproject.toml — install manually)
pip install numpy matplotlib pillow

# generate with a specific seed (deterministic & reproducible)
python catpattern.py 42

# generate with a random seed (defaults to int(time.time()))
python catpattern.py

# animated GIF: the mandala stays at full size and its petal shapes wave
# randomly (seeded morph) out and back; first/last = the static plot. (Needs Pillow)
python catpattern.py 42 -gif
python catpattern.py 42 -gif --frames 80 --fps 24 --gif-size 800

# batch: N patterns with random seeds. Flags combine freely (size + -gif).
sh generate.sh 5
sh generate.sh 5 -gif
sh generate.sh 5 -gif -s
```

Each run writes `catpattern_<seed>.png` (or `.gif` with `-gif`) into the **script's own `results/` directory**
(absolute, CWD-independent) and prints the seed + chosen accent colours to stdout. The
PNGs already committed in the repo root are old sample outputs from before the `results/`
convention.

## Determinism model (important)

- A seed fully determines the output. Same seed → byte-identical pattern.
- Randomness is drawn from a **seeded `random.Random` instance** (`rng`), *not* the
  global `random` module. When adding randomness, use the passed-in `rng`, otherwise
  you break reproducibility.
- `numpy` is used only for array math / Bezier evaluation; it is **not** seeded.
  Do not introduce `np.random.*` for anything that must be seed-reproducible.
- In `-gif` mode an extra `random.Random((seed + 1) & 0x7FFFFFFF)` (`morph_rng`)
  drives the per-frame petal morph. It is created **after** `prepare_pattern` builds
  the families, so it is decoupled from the structure draws: a given seed yields the
  same families in both PNG and GIF mode, plus a fully reproducible morph path. GIFs
  are byte-reproducible for a given seed.

## Architecture / control flow

`generate_pattern(seed)` (PNG) and `generate_gif(seed, ...)` (GIF) share `prepare_pattern(seed, area_scale)`, which runs:

1. Seed → `random.Random` instance.
2. Pick 2 accent colours via `pick_distinct_accents(rng)` (hue-constrained — see Palette).
3. Build 2–4 "families": each family = one random bilateral-symmetric petal shape
   (built by `random_petal` -> `petal_from_controls` via `cubic_bezier`) + a rotational symmetry order `N`.
4. Render: each family's petal is plotted `N` times at equal angles `2π/n`.
   Colour is a cosine-cycle blend (`t = ½(1 − cos(2π·k/N))`) of the two accents, so the
   gradient wraps seamlessly (copy 0 and copy N share a colour → no seam, true
   rotational symmetry).
5. Draw a central "pupil" disc in `crust` with a thin mid-colour outline.
6. Save the figure (fixed size 3840×2160 @ 100 dpi, landscape) and close it. The GIF
   path instead saves a 16:9 4K (default 3840×2160) animation via raw PIL
   streaming frame assembly (yielding frames on the fly to minimize memory usage,
   bounded concurrency, and on-the-fly deduplication), rebuilding every petal from its
   (envelope-gated) morphed control points per frame.

### Key invariants when modifying

- **Bilateral symmetry of the petal is what guarantees whole-pattern rotational
  symmetry.** `random_petal` mirrors its upper Bezier arc to form the lower half
  (`y → −y`). If you make the petal asymmetric, the full circle will show a seam.
- The cosine colour cycle must return to its starting value at `k=N` to avoid a
  visible seam. Any new colouring scheme must be periodic over `N`.
- `half_w = 0.5 * W / H` keeps the aspect ratio square-ish so petals never clip
  horizontally. Changing `W`/`H` without preserving this ratio will clip.
- In `-gif` mode the displacement is `env(t) * R(t)` with `env = sin(pi*t/2)` (0 at
  `t=0` endpoints, 1 at `t=1` animation midpoint) and `R(t)` a seeded sum of
  sinusoids. This makes the first and last frame the un-morphed base (the same
  mandala as the static PNG) and the midpoint the peak morph. The palindromic
  schedule (`t = 0 -> 1 -> 0`, first frame == last) makes the second half retrace
  the first exactly, and the GIF loops seamlessly. Bilateral petal symmetry is
  rebuilt every frame by `petal_from_controls` (mirror `y -> -y`), so the morph
  never breaks whole-pattern rotational symmetry.

## Palette

`MOCHA` dict at the top holds the full Catppuccin Mocha palette (hex strings).
`ACCENTS` is the subset eligible for pattern colours; base/crust are used for the
background and pupil. Colours are converted via `hex_to_rgb` to 0–1 floats for
matplotlib.

### Accent selection — `pick_distinct_accents(rng)`

A naive `rng.sample(ACCENTS, 2)` would frequently return **near-monochrome pairs**
because the palette clusters: sky/sapphire/blue/lavender are all blue-ish
(hue gap ~9–15°), red/maroon and rosewater/flamingo likewise. That makes the cosine
gradient barely visible. `pick_distinct_accents` instead **re-draws pairs until the hue
gap ≥ 0.12 of the wheel (~43°)**, computed via `hue_distance` (shortest circular distance
on hue) on HSL hues from `hex_to_hsl` (via `colorsys.rgb_to_hls`). It uses the seeded
`rng`, so determinism is preserved. A fallback returns the widest pair in the palette
if no valid pair is found in 200 draws (statistically unreachable).

This is **seed-breaking**: a given seed now maps to different accents than it did under
the old `rng.sample` call, because the rng draw count changed. Old PNGs committed for a
seed are no longer reproducible with the same seed.

## Testing

There is **no test suite** and no test framework configured. Verification is visual:
run with a known seed and eyeball the output PNG, or compare against a committed
sample (e.g. `catpattern_42.png`). Regression testing would require hashing/SSIM
against a reference image — none exists yet.

## Notable gotchas

- No dependency manifest exists; a fresh checkout has no `requirements.txt`. Add deps
  manually or consider creating one.
- Output path is absolute and relative to the script (`SCRIPT_PATH/results/`), so
  the invocation CWD doesn't matter.
- `bbox_inches="tight"` is used on savefig; combined with the manual `subplots_adjust`
  it controls the final framing. Tweaking either can shift the rendered bounds.
- The PNG path needs only numpy+matplotlib; the `-gif` path additionally needs
  **Pillow** (`pip install pillow`). The `generate.sh` resolver probes for
  `numpy+matplotlib+Pillow` so the batch runner works for both modes. The GIF
  is landscape 16:9 (default `--gif-size 3840`) with ±0.5 vertical limits, so the circular mandala
  fills the frame vertically. The animation is at full size throughout (no bloom), so no
  consecutive frames are pixel-identical and the saved frame count equals the
  schedule length (`frames`).
- `generate.sh` may fail to resolve `python` under some nested-shell invocations on
  Windows (mvdan/sh PATH quirks); it probes `python`/`python3`/`py` for one with
  numpy+matplotlib+Pillow and uses its absolute path. If it still fails, run `sh generate.sh`
  rather than `./generate.sh`.
- The project is not a git repo and has no CI, lint, or formatter config.
