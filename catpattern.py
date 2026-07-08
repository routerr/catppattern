#!/usr/bin/env python3
"""
Catppuccin Mocha - Symmetric Circular Pattern Generator

Each seed produces a structurally unique pattern through:
  • 2–4 independent "families" of petal curves
  • Each family: one random Bezier shape duplicated N times at equal angles
    (where N is chosen randomly per family) filling the full 360°
  • Multiple families with different N values create complex interference
  • Two random Catppuccin Mocha accent colours blended as a gradient

Usage:
    python catpattern.py [seed] [-s|-xs|-xxs|-xxxs] [-h|--horizontal] [-gif] [--frames N] [--fps N] [--gif-size PX]

Modes:
    (default)  render a static PNG (catpattern_<seed>.png)
    -gif       render an animated GIF (catpattern_<seed>.gif): the mandala
               stays near full size with a bounded outer-radius wave, while
               its petal Bezier control points and outer endpoint radius
               wiggle along seeded random sinusoid paths whose phase always
               advances forward. The first and last frames are the un-morphed
               base (the same mandala as the static PNG), so the GIF loops
               cleanly without retracing backward. Same seed
               -> same families as the PNG plus a deterministic morph.

Size flags (-s/-xs/-xxs/-xxxs) shrink the pattern and apply to both modes.
-h/--horizontal renders a 2532x1170 landscape iPhone wallpaper canvas. For GIFs,
--gif-size becomes the horizontal long edge when this flag is used.
GIF-only tunables: --frames (exact count, default 1400 = 15s * 93fps),
                   --fps (default 93), --gif-size (width in px, maintaining
                   16:9 ratio, default 3840; horizontal default 2532).
"""

import colorsys
import numpy as np
import matplotlib.pyplot as plt
import os
import random
import sys
import time


SCRIPT_PATH = os.path.dirname(os.path.abspath(__file__))
RESULTS_DIR = os.path.join(SCRIPT_PATH, "results")
MOTION_SCALE = 1.5
DEFAULT_GIF_FPS = 93
DEFAULT_GIF_SECONDS = 15
DEFAULT_GIF_FRAMES = 1400
PNG_SIZE = (3840, 2160)
DEFAULT_GIF_SIZE = 3840
HORIZONTAL_WALLPAPER_SIZE = (2532, 1170)


MOCHA = {
    "base": "#11111b",
    "mantle": "#181825",
    "crust": "#11111b",
    "surface0": "#313244",
    "surface1": "#45475a",
    "surface2": "#585b70",
    "overlay0": "#6c7086",
    "rosewater": "#f5e0dc",
    "flamingo": "#f2cdcd",
    "pink": "#f5c2e7",
    "mauve": "#cba6f7",
    "red": "#f38ba8",
    "maroon": "#eba0ac",
    "peach": "#fab387",
    "yellow": "#f9e2af",
    "green": "#a6e3a1",
    "teal": "#94e2d5",
    "sky": "#89dceb",
    "sapphire": "#74c7ec",
    "blue": "#89b4fa",
    "lavender": "#b4befe",
}

ACCENTS = [
    "rosewater",
    "flamingo",
    "pink",
    "mauve",
    "red",
    "maroon",
    "peach",
    "yellow",
    "green",
    "teal",
    "sky",
    "sapphire",
    "blue",
    "lavender",
]


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) / 255.0 for i in (0, 2, 4))


def hex_to_hsl(h):
    """Hex (#rrggbb) → (hue, saturation, lightness), each in [0, 1]."""
    r, g, b = hex_to_rgb(h)
    return colorsys.rgb_to_hls(r, g, b)  # returns (h, l, s)


def hue_distance(h1, h2):
    """Shortest circular distance between two hues, both in [0, 1]."""
    d = abs(h1 - h2) % 1.0
    return min(d, 1.0 - d)


def pick_distinct_accents(rng):
    """
    Pick two accent names whose hues are sufficiently far apart.

    Catppuccin Mocha accents cluster: sky/sapphire/blue/lavender are all blue-ish,
    red/maroon are pink-ish, rosewater/flamingo are beige-pink.  A naive
    rng.sample would often return a near-monochrome pair (e.g. sky + sapphire),
    making the cosine gradient barely visible.  Instead we draw pairs until the
    hue gap clears a threshold (≥ 0.12 of the full hue wheel ≈ 43°).  This uses
    the seeded rng, so results stay seed-deterministic.
    """
    MIN_HUE_GAP = 0.12
    for _ in range(200):
        a, b = rng.sample(ACCENTS, 2)
        if (
            hue_distance(hex_to_hsl(MOCHA[a])[0], hex_to_hsl(MOCHA[b])[0])
            >= MIN_HUE_GAP
        ):
            return a, b
    # Fallback (statistically unreachable): widest pair in the palette.
    best, best_d = None, -1.0
    for i in range(len(ACCENTS)):
        for j in range(i + 1, len(ACCENTS)):
            d = hue_distance(
                hex_to_hsl(MOCHA[ACCENTS[i]])[0], hex_to_hsl(MOCHA[ACCENTS[j]])[0]
            )
            if d > best_d:
                best, best_d = (ACCENTS[i], ACCENTS[j]), d
    return best


def lerp_color(c1_hex, c2_hex, t):
    c1 = hex_to_rgb(c1_hex)
    c2 = hex_to_rgb(c2_hex)
    return tuple(a + (b - a) * t for a, b in zip(c1, c2))


def lerp_color_arr(c1_hex, c2_hex, t):
    """Vectorized linear interpolation between two hex colors for an array of t values in [0, 1]."""
    c1 = np.array(hex_to_rgb(c1_hex), dtype=np.float32)
    c2 = np.array(hex_to_rgb(c2_hex), dtype=np.float32)
    return c1[np.newaxis, :] + (c2 - c1)[np.newaxis, :] * t[:, np.newaxis]


def cubic_bezier(p0, p1, p2, p3, n=320):
    """Evaluate a cubic Bezier curve at n points clustered at the endpoints."""
    linear_t = np.linspace(0, 1, n)
    t = 0.5 * (1.0 - np.cos(np.pi * linear_t))
    x = (
        (1 - t) ** 3 * p0[0]
        + 3 * (1 - t) ** 2 * t * p1[0]
        + 3 * (1 - t) * t**2 * p2[0]
        + t**3 * p3[0]
    )
    y = (
        (1 - t) ** 3 * p0[1]
        + 3 * (1 - t) ** 2 * t * p1[1]
        + 3 * (1 - t) * t**2 * p2[1]
        + t**3 * p3[1]
    )
    return x, y


def petal_from_controls(p1, p2, R, n=320):
    """Closed bilateral-symmetric petal from origin to (R, 0) given the two
    inner cubic-Bezier control points p1, p2.  Upper arc = Bezier(0->R);
    lower arc = mirror (y -> -y).  Symmetric about the x-axis, so rotating
    it preserves strict rotational symmetry for the whole family."""
    p0 = np.array([0.0, 0.0])
    p3 = np.array([R, 0.0])
    x_up, y_up = cubic_bezier(p0, p1, p2, p3, n)
    x_full = np.concatenate([x_up, x_up[::-1]])
    y_full = np.concatenate([y_up, -y_up[::-1]])
    return x_full, y_full


def random_petal(R, rng, n=320):
    """
    Closed bilateral-symmetric petal from origin to radius R.

    The upper half is a random cubic Bezier from (0,0) -> (R,0).
    The lower half is its mirror (y -> -y), so the petal is symmetric
    about the x-axis.  When rotated to angle theta the full petal shape
    is symmetric about the spoke at angle theta -- strict rotational
    symmetry is preserved for the whole family.

    Control point ranges are intentionally wide so petal shapes vary
    from slender needle-like curves to fat lobes to S-bends.

    Returns (x, y, p1, p2) so callers (e.g. the GIF morph) can rebuild
    the petal from its control points.
    """
    r1 = rng.uniform(0.06, 0.72) * R
    a1 = rng.uniform(-0.25, 0.85) * np.pi  # allow dip below x-axis -> S curves
    p1 = np.array([r1 * np.cos(a1), r1 * np.sin(a1)])

    r2 = rng.uniform(0.22, 0.96) * R
    a2 = rng.uniform(-0.12, 0.62) * np.pi
    p2 = np.array([r2 * np.cos(a2), r2 * np.sin(a2)])

    x_full, y_full = petal_from_controls(p1, p2, R, n)
    return x_full, y_full, p1, p2


def _draw_family(ax, x_petal, y_petal, sym_N, lw, alpha, accent1, accent2):
    """Plot one family: sym_N rotated copies of a petal with the cosine
    colour cycle that wraps seamlessly at k=0 / k=N (no seam)."""
    for k in range(sym_N):
        angle = k * 2.0 * np.pi / sym_N
        cos_a, sin_a = np.cos(angle), np.sin(angle)
        x_rot = x_petal * cos_a - y_petal * sin_a
        y_rot = x_petal * sin_a + y_petal * cos_a

        t_c = 0.5 * (1.0 - np.cos(2.0 * np.pi * k / sym_N))
        color = lerp_color(accent1, accent2, t_c)

        ax.plot(
            x_rot,
            y_rot,
            color=color,
            alpha=alpha,
            linewidth=lw,
            solid_capstyle="round",
            solid_joinstyle="round",
            antialiased=(lw >= 0.8),
        )


def _draw_pupil(ax, accent1, accent2, pupil_r, scale_factor=1.0):
    """Central pupil disc in crust with a thin mid-colour outline."""
    mid_color = lerp_color(accent1, accent2, 0.5)
    ax.add_patch(plt.Circle((0, 0), pupil_r, color=MOCHA["crust"], zorder=20))
    ax.add_patch(
        plt.Circle(
            (0, 0),
            pupil_r,
            fill=False,
            edgecolor=mid_color,
            linewidth=1.1 * scale_factor,
            alpha=0.55,
            zorder=21,
            antialiased=(1.1 * scale_factor >= 0.8),
        )
    )


def build_families(rng, semi_major, lw_scale):
    """2-4 families, each = one random bilateral petal + a rotational
    symmetry order N.  Uses the seeded rng so the structure is
    seed-reproducible.  Stores the control points for later re-evaluation
    (used by the GIF morph)."""
    num_families = rng.randint(2, 4)
    families = []
    for i in range(num_families):
        R_fam = semi_major * rng.uniform(0.65, 1.00)  # each family can differ in size
        sym_N = rng.randint(14, 46)  # symmetry order (copies)
        # Mild density-aware stroke: slightly thicker when sparse, slightly
        # thinner when dense. Overall bump is small to keep patterns light.
        density = (
            0.7 * (sym_N - 14) / 32.0 + 0.3 * (num_families - 2) / 2.0
        )  # 0 sparse ... 1 dense
        lw = rng.uniform(1.4, 2.4) * (1.0 - 0.15 * density) * lw_scale * 1.8
        alpha = rng.uniform(0.28, 0.55)
        x_p, y_p, p1, p2 = random_petal(R_fam, rng)
        families.append(
            dict(x=x_p, y=y_p, N=sym_N, lw=lw, alpha=alpha, R=R_fam, p1=p1, p2=p2)
        )
        print(
            f"  Family {i + 1}: N={sym_N}, R={R_fam:.3f}, "
            f"lw={lw:.2f}, alpha={alpha:.2f}"
        )
    return families


def prepare_pattern(seed, area_scale):
    """Shared preamble for PNG and GIF: seed -> rng, accents, geometry and
    family structure.  The rng draw order is identical to the original
    single-pass generator, so a given seed yields byte-identical structure
    (and byte-identical PNGs) regardless of mode."""
    if seed is None:
        seed = int(time.time())

    rng = random.Random(seed)
    tag = {
        1.0: "",
        0.5: "  [small]",
        0.25: "  [extra-small]",
        0.1: "  [micro]",
        0.05: "  [nano]",
    }.get(area_scale, f"  [{area_scale:.0%}]")
    print(f"Seed: {seed}{tag}")

    accent1_name, accent2_name = pick_distinct_accents(rng)
    accent1 = MOCHA[accent1_name]
    accent2 = MOCHA[accent2_name]
    print(f"Accents: {accent1_name} ({accent1})  +  {accent2_name} ({accent2})")

    # semi_major is the outer radius in normalised coords (view = +/-0.5 height)
    semi_major = rng.uniform(0.34, 0.46)
    pupil_r = semi_major * rng.uniform(0.06, 0.13)

    # Size modes: shrink the centered pattern to a fraction of its area.
    if area_scale != 1.0:
        k = area_scale**0.5
        semi_major *= k
        pupil_r *= k

    lw_scale = area_scale**0.5
    families = build_families(rng, semi_major, lw_scale)

    return dict(
        seed=seed,
        rng=rng,
        accent1=accent1,
        accent2=accent2,
        accent1_name=accent1_name,
        accent2_name=accent2_name,
        semi_major=semi_major,
        pupil_r=pupil_r,
        families=families,
    )


def _area_suffix(area_scale):
    return {1.0: "", 0.5: "_small", 0.25: "_xs", 0.1: "_xxs", 0.05: "_xxxs"}.get(
        area_scale, f"_{int(area_scale * 100)}"
    )


def _output_suffix(area_scale, horizontal):
    return ("_horizontal" if horizontal else "") + _area_suffix(area_scale)


def _view_limits(width, height):
    half_h = 0.5
    half_w = half_h * width / height
    return half_w, half_h


def _gif_canvas_size(horizontal, size):
    if horizontal:
        if size is None:
            return HORIZONTAL_WALLPAPER_SIZE
        width = int(size)
        ratio = HORIZONTAL_WALLPAPER_SIZE[1] / HORIZONTAL_WALLPAPER_SIZE[0]
        return width, max(1, int(round(width * ratio)))

    if size is None:
        return PNG_SIZE
    width = int(size)
    ratio = PNG_SIZE[1] / PNG_SIZE[0]
    return width, max(1, int(round(width * ratio)))


def generate_pattern(seed=None, area_scale=1.0, horizontal=False):
    p = prepare_pattern(seed, area_scale)
    seed = p["seed"]

    # -- Figure -------------------------------------------------------------------
    W, H = HORIZONTAL_WALLPAPER_SIZE if horizontal else PNG_SIZE
    dpi = 100
    fig, ax = plt.subplots(figsize=(W / dpi, H / dpi), dpi=dpi)
    fig.patch.set_facecolor(MOCHA["base"])
    ax.set_facecolor(MOCHA["base"])
    ax.set_aspect("equal")
    ax.axis("off")

    half_w, half_h = _view_limits(W, H)
    ax.set_xlim(-half_w, half_w)
    ax.set_ylim(-half_h, half_h)

    # -- Draw ---------------------------------------------------------------------
    scale_factor = H / 2160.0
    for fam in p["families"]:
        _draw_family(
            ax,
            fam["x"],
            fam["y"],
            fam["N"],
            fam["lw"] * scale_factor,
            fam["alpha"],
            p["accent1"],
            p["accent2"],
        )
    _draw_pupil(ax, p["accent1"], p["accent2"], p["pupil_r"], scale_factor)

    # -- Save ---------------------------------------------------------------------
    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    os.makedirs(RESULTS_DIR, exist_ok=True)
    suffix = _output_suffix(area_scale, horizontal)
    out = os.path.join(RESULTS_DIR, f"catpattern_{seed}{suffix}.png")
    fig.savefig(
        out,
        dpi=dpi,
        facecolor=MOCHA["base"],
        edgecolor="none",
        bbox_inches="tight",
        pad_inches=0,
    )
    plt.close(fig)
    print(f"Saved: {out}")
    return out


def _morph_components(families, morph_rng):
    """Pre-generate smooth, seeded per-family morph data.

    For each inner control point (p1, p2) and each axis (x, y), store a
    small sum of sinusoids. A separate bounded radius component lets the outer
    endpoint move. Integer frequencies keep the wave path deterministic and
    return every component to its start value at the end of the cycle.
    """
    morph = []
    for fam in families:
        R = fam["R"]
        fam_comps = []
        for _ in (0, 1):  # p1, p2
            cp_comps = []
            for _axis in (0, 1):  # x, y
                ncomp = morph_rng.randint(2, 3)
                amps = [morph_rng.uniform(0.04, 0.11) * R for _ in range(ncomp)]
                freqs = [morph_rng.randint(1, 2) for _ in range(ncomp)]
                phases = [morph_rng.uniform(0.0, 2.0 * np.pi) for _ in range(ncomp)]
                cp_comps.append((amps, freqs, phases))
            fam_comps.append(cp_comps)

        radius_comps = (
            [morph_rng.uniform(0.025, 0.055) * R],
            [morph_rng.randint(1, 2)],
            [morph_rng.uniform(0.0, 2.0 * np.pi)],
        )
        fam_comps.append([radius_comps])  # pseudo control point 2, axis 0
        morph.append(fam_comps)
    return morph


def _wiggle(morph, fam_idx, cp_idx, axis, t):
    """Scalar displacement for a control point or radius pseudo-point.

    cp_idx is 0 for p1, 1 for p2, and 2 for the endpoint radius component.
    Axis is 0=x / 1=y for controls; radius uses axis 0.
    """
    amps, freqs, phases = morph[fam_idx][cp_idx][axis]
    return sum(
        a * np.sin(2.0 * np.pi * f * t + ph) for a, f, ph in zip(amps, freqs, phases)
    )


def _loop_delta(morph, fam_idx, cp_idx, axis, phase):
    """Forward-loop displacement relative to phase 0.

    Using wiggle(phase) - wiggle(0) makes the first and last frames exactly the
    base controls while phase still advances in one direction through the cycle.
    """
    if phase <= 0.0 or phase >= 1.0:
        return 0.0
    return _wiggle(morph, fam_idx, cp_idx, axis, phase) - _wiggle(
        morph, fam_idx, cp_idx, axis, 0.0
    )


def _morphed_controls(fam, morph, fam_idx, phase):
    """Return smooth per-frame Bezier controls and endpoint radius.

    p0 stays fixed at the centre. p3 can slide along the petal axis within a
    small clamped range, so the outer circle breathes without a large bloom.
    The two inner handles are scaled with the radius first, then waved, keeping
    each animated half-petal a single smooth cubic Bezier.
    """
    base_R = fam["R"]
    max_radius_delta = 0.08 * MOTION_SCALE * base_R
    radius_delta = MOTION_SCALE * _loop_delta(morph, fam_idx, 2, 0, phase)
    radius_delta = float(np.clip(radius_delta, -max_radius_delta, max_radius_delta))
    R_m = base_R + radius_delta
    radius_scale = R_m / base_R

    p1 = fam["p1"].copy() * radius_scale
    p2 = fam["p2"].copy() * radius_scale

    # Let the outer handle carry most of the wave. The inner handle still moves
    # enough to keep the old organic motion, but less so the centre stays calm.
    handle_scales = (0.45, 1.0)
    for cp_idx, point in enumerate((p1, p2)):
        scale = handle_scales[cp_idx]
        point[0] += scale * MOTION_SCALE * _loop_delta(morph, fam_idx, cp_idx, 0, phase)
        point[1] += scale * MOTION_SCALE * _loop_delta(morph, fam_idx, cp_idx, 1, phase)

    return p1, p2, R_m


def _forward_loop_schedule(frame_count):
    """Exact-length forward phase schedule including matching endpoints."""
    count = max(2, int(frame_count))
    return [i / (count - 1) for i in range(count)]


def _gif_delays_cs(frame_count, fps):
    """Per-frame GIF delays in centiseconds, spread to match target FPS.

    GIF timing is quantized to 10 ms. Native rates such as 100 fps
    map exactly; non-native rates get extra centiseconds distributed across the
    frames so the total playback length remains correct.
    """
    count = max(1, int(frame_count))
    target_total_cs = max(count, int(round(count * 100.0 / fps)))
    base = min(65535, target_total_cs // count)
    extra = target_total_cs - base * count
    delays = []
    for i in range(count):
        bump = ((i + 1) * extra // count) - (i * extra // count)
        delays.append(min(65535, base + bump))
    return delays


def _loop_delta_arr(morph, fam_idx, cp_idx, axis, phases):
    """Vectorized forward-loop displacement relative to phase 0 for an array of phases."""
    w = _wiggle(morph, fam_idx, cp_idx, axis, phases) - _wiggle(
        morph, fam_idx, cp_idx, axis, 0.0
    )
    # Clamp/mask for phase <= 0.0 or phase >= 1.0 (endpoints are exactly 0.0)
    mask = (phases > 0.0) & (phases < 1.0)
    return w * mask


def _morphed_controls_arr(fam, morph, fam_idx, phases):
    """Vectorized version of _morphed_controls for an array of phases.
    Returns p1, p2 of shape [frames, 2] and R_m of shape [frames].
    """
    base_R = fam["R"]
    max_radius_delta = 0.08 * MOTION_SCALE * base_R
    radius_delta = MOTION_SCALE * _loop_delta_arr(morph, fam_idx, 2, 0, phases)
    radius_delta = np.clip(radius_delta, -max_radius_delta, max_radius_delta)
    R_m = base_R + radius_delta
    radius_scale = R_m / base_R

    # p1, p2 initially scaled with the radius scale (shape [frames, 2])
    p1 = fam["p1"][np.newaxis, :] * radius_scale[:, np.newaxis]
    p2 = fam["p2"][np.newaxis, :] * radius_scale[:, np.newaxis]

    handle_scales = (0.45, 1.0)
    for cp_idx, p in enumerate((p1, p2)):
        scale = handle_scales[cp_idx]
        delta_x = (
            scale * MOTION_SCALE * _loop_delta_arr(morph, fam_idx, cp_idx, 0, phases)
        )
        delta_y = (
            scale * MOTION_SCALE * _loop_delta_arr(morph, fam_idx, cp_idx, 1, phases)
        )
        p[:, 0] += delta_x
        p[:, 1] += delta_y

    return p1, p2, R_m


def _cubic_bezier_arr(p0, p1, p2, p3, n=320):
    """Evaluate a cubic Bezier curve at n points for all frames.
    p1, p2, p3 have shape [frames, 2].
    Returns x, y of shape [frames, n].
    """
    linear_t = np.linspace(0, 1, n)
    t = (0.5 * (1.0 - np.cos(np.pi * linear_t)))[np.newaxis, :]  # shape [1, n]

    p1_x, p1_y = p1[:, 0:1], p1[:, 1:2]  # shape [frames, 1]
    p2_x, p2_y = p2[:, 0:1], p2[:, 1:2]
    p3_x, p3_y = p3[:, 0:1], p3[:, 1:2]

    x = (
        (1 - t) ** 3 * p0[0]
        + 3 * (1 - t) ** 2 * t * p1_x
        + 3 * (1 - t) * t**2 * p2_x
        + t**3 * p3_x
    )
    y = (
        (1 - t) ** 3 * p0[1]
        + 3 * (1 - t) ** 2 * t * p1_y
        + 3 * (1 - t) * t**2 * p2_y
        + t**3 * p3_y
    )
    return x, y


def _petal_from_controls_arr(p1, p2, R, n=320):
    """Closed bilateral-symmetric petal from origin to radius R for all frames.
    Returns x_full, y_full of shape [frames, 2 * n].
    """
    p0 = np.array([0.0, 0.0])
    p3 = np.zeros((len(R), 2))
    p3[:, 0] = R

    x_up, y_up = _cubic_bezier_arr(p0, p1, p2, p3, n)
    x_full = np.concatenate([x_up, x_up[:, ::-1]], axis=1)
    y_full = np.concatenate([y_up, -y_up[:, ::-1]], axis=1)
    return x_full, y_full


def _stream_save_gif(out, first_p, frame_iterable):
    """Write GIF frames directly to a file stream one-by-one to prevent Pillow's
    default behavior of accumulating all normalized frame copies in memory."""
    from PIL import GifImagePlugin

    with open(out, "wb") as fp:
        info = {
            "loop": 0,
            "duration": first_p.info.get("duration", 100),
            "disposal": 1,
            "optimize": True,
        }
        first_p.encoderinfo = info
        first_normalized = GifImagePlugin._normalize_palette(first_p, None, info)

        # Write global header using the first frame
        for block in GifImagePlugin._get_global_header(first_normalized, info):
            fp.write(block)

        # Write the base/first frame
        GifImagePlugin._write_frame_data(fp, first_normalized, (0, 0), info)

        # Sequentially write each frame and discard it immediately
        for im in frame_iterable:
            frame_info = {
                "duration": im.info.get("duration", 100),
                "disposal": 1,
                "optimize": True,
            }
            im.encoderinfo = frame_info
            p_im = GifImagePlugin._normalize_palette(im, None, frame_info)
            GifImagePlugin._write_frame_data(fp, p_im, (0, 0), frame_info)

        # Write closing block
        fp.write(b";")


def generate_gif(
    seed=None,
    area_scale=1.0,
    frames=DEFAULT_GIF_FRAMES,
    fps=DEFAULT_GIF_FPS,
    size=None,
    n_petal=None,
    horizontal=False,
):
    """Animate the mandala as a smooth Bezier-handle wave.

    The pattern stays near full size throughout. Each petal starts at the
    centre, while its outer endpoint can slide along the petal axis within a
    small bounded radius range. Its two inner cubic-Bezier handles follow
    seeded sinusoid paths. The animated curve is therefore still a smooth cubic
    on each half-petal, with only the original mirrored petal tip as a possible
    sharp turn on the outer circle. The animation phase only moves forward;
    offsets are measured relative to phase 0, so the first and last frames are
    the same un-morphed base without a back-and-forth retrace. Default GIF
    timing: 1400 frames at 93 fps for 15 seconds.

    Determinism: structure comes from prepare_pattern (same seed -> same
    families as the PNG); the wave uses a separate rng seeded from
    (seed + 1) so it is decoupled from the structure draws yet fully
    reproducible.  Bilateral petal symmetry is preserved by rebuilding each
    full petal with petal_from_controls, which mirrors the upper Bezier arc
    every frame.
    """
    try:
        from PIL import Image, ImageChops
    except ImportError as exc:
        raise SystemExit("GIF export requires Pillow: pip install pillow") from exc

    p = prepare_pattern(seed, area_scale)
    seed = p["seed"]
    morph_rng = random.Random((seed + 1) & 0x7FFFFFFF)
    morph = _morph_components(p["families"], morph_rng)

    # -- Figure -------------------------------------------------------------------
    W, H = _gif_canvas_size(horizontal, size)
    dpi = 100
    fig, ax = plt.subplots(figsize=(W / dpi, H / dpi), dpi=dpi)
    fig.patch.set_facecolor(MOCHA["base"])
    ax.set_facecolor(MOCHA["base"])
    ax.set_aspect("equal")
    ax.axis("off")
    half_w, half_h = _view_limits(W, H)
    ax.set_xlim(-half_w, half_w)
    ax.set_ylim(-half_h, half_h)
    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)

    # Dynamic Bezier step scaling based on target canvas resolution (using 80 points standard due to cosine spacing)
    if n_petal is None:
        canvas_edge = max(W, H)
        n_petal = max(40, min(240, int(canvas_edge * 80 / 720)))

    # Exact-count forward loop. The phase advances from 0 to 1 once; both ends
    # render the base shape, and every intermediate frame advances forward.
    schedule = _forward_loop_schedule(frames)
    schedule_arr = np.array(schedule, dtype=np.float32)

    from matplotlib.collections import LineCollection

    # Resolution-aware linewidth scaling
    scale_factor = H / 2160.0

    # Pre-create all line collections
    line_collections = []
    for fam in p["families"]:
        sym_N = fam["N"]
        k_indices = np.arange(sym_N)
        t_c = 0.5 * (1.0 - np.cos(2.0 * np.pi * k_indices / sym_N))

        # Vectorized color lerping
        rgb_colors = lerp_color_arr(p["accent1"], p["accent2"], t_c)
        alphas = np.full((sym_N, 1), fam["alpha"], dtype=np.float32)
        rgba_colors = np.concatenate([rgb_colors, alphas], axis=1)

        # Create a LineCollection with these segment colors and properties
        lc = LineCollection(
            [],
            colors=rgba_colors,
            linewidths=fam["lw"] * scale_factor,
            capstyle="round",
            joinstyle="round",
            antialiaseds=(fam["lw"] * scale_factor >= 0.8),
        )
        ax.add_collection(lc)
        line_collections.append(lc)

    # Pre-create static pupil patches (zorder ensures proper layering)
    mid_color = lerp_color(p["accent1"], p["accent2"], 0.5)
    pupil_circle = plt.Circle((0, 0), p["pupil_r"], color=MOCHA["crust"], zorder=20)
    pupil_outline = plt.Circle(
        (0, 0),
        p["pupil_r"],
        fill=False,
        edgecolor=mid_color,
        linewidth=1.1 * scale_factor,
        alpha=0.55,
        zorder=21,
        antialiased=(1.1 * scale_factor >= 0.8),
    )
    ax.add_patch(pupil_circle)
    ax.add_patch(pupil_outline)

    # Precompute coordinates for all families and frames
    precomputed_data = []
    max_r_coord = 0.0
    for fam_idx, fam in enumerate(p["families"]):
        p1_m, p2_m, R_m = _morphed_controls_arr(fam, morph, fam_idx, schedule_arr)
        max_r_coord = max(max_r_coord, float(np.max(R_m)))

        x_full, y_full = _petal_from_controls_arr(p1_m, p2_m, R_m, n=n_petal)

        sym_N = fam["N"]
        angles = np.arange(sym_N) * (2.0 * np.pi / sym_N)
        cos_a = np.cos(angles)[np.newaxis, :, np.newaxis]  # shape [1, N, 1]
        sin_a = np.sin(angles)[np.newaxis, :, np.newaxis]  # shape [1, N, 1]

        x_full_exp = x_full[:, np.newaxis, :]
        y_full_exp = y_full[:, np.newaxis, :]

        x_rot = (x_full_exp * cos_a - y_full_exp * sin_a).astype(np.float32)
        y_rot = (x_full_exp * sin_a + y_full_exp * cos_a).astype(np.float32)

        # Stack coordinates to shape [frames, N, 2 * n_petal, 2] for LineCollection
        coords = np.stack([x_rot, y_rot], axis=-1)

        precomputed_data.append(dict(coords=coords))

    w_fig, h_fig = fig.canvas.get_width_height()

    # Process and optimize frames concurrently (non-dithered quantization)
    def _optimize_frame(img):
        return img.convert("RGB").convert("P", dither=Image.Dither.NONE)

    # Calculate per-frame delays in milliseconds
    delays_ms = [d * 10 for d in _gif_delays_cs(frames, fps)]

    # Draw and process the first frame (frame 0) to use as the base image for save()
    for fam_idx, lc in enumerate(line_collections):
        coords = precomputed_data[fam_idx]["coords"]
        lc.set_segments(coords[0])
    fig.canvas.draw()
    rgba_buffer = fig.canvas.buffer_rgba()
    first_img = Image.frombuffer(
        "RGBA", (w_fig, h_fig), rgba_buffer, "raw", "RGBA", 0, 1
    ).copy()
    first_p = _optimize_frame(first_img)
    first_p.info["duration"] = delays_ms[0]

    # Bounded concurrency frame streaming generator with on-the-fly deduplication and buffer pool
    def frame_generator():
        from concurrent.futures import ThreadPoolExecutor
        import os
        import gc
        from PIL import ImageChops

        cpu_count = os.cpu_count() or 4
        max_workers = min(cpu_count, 8)
        active_limit = 2 * max_workers

        # Pre-allocate buffer pool (NumPy arrays) to avoid allocation overhead
        buffer_pool = [
            np.empty((h_fig, w_fig, 4), dtype=np.uint8) for _ in range(active_limit + 2)
        ]

        def draw_frame(fi, buf):
            for fam_idx, lc in enumerate(line_collections):
                coords = precomputed_data[fam_idx]["coords"]
                lc.set_segments(coords[fi])
            fig.canvas.draw()
            rgba_buffer = fig.canvas.buffer_rgba()

            # Copy memoryview data directly into our leased buffer array
            src = np.frombuffer(rgba_buffer, dtype=np.uint8).reshape(h_fig, w_fig, 4)
            np.copyto(buf, src)

            # Wrap buffer without making a copy
            return Image.frombuffer("RGBA", (w_fig, h_fig), buf, "raw", "RGBA", 0, 1)

        futures = {}
        next_submit = 1
        next_yield = 1

        def optimize_frame(img, buf):
            p_im = img.convert("RGB").convert("P", dither=Image.Dither.NONE)
            return p_im, buf

        def submit_next():
            nonlocal next_submit
            if next_submit < len(schedule):
                # Lease buffer from pool (should always have one available due to active_limit size)
                buf = (
                    buffer_pool.pop()
                    if buffer_pool
                    else np.empty((h_fig, w_fig, 4), dtype=np.uint8)
                )
                img = draw_frame(next_submit, buf)
                fut = executor.submit(optimize_frame, img, buf)
                futures[next_submit] = fut
                next_submit += 1

        buffered_frame = None
        buffered_delay = 0
        total_saved_frames = 1

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Pre-submit initial batch
            for _ in range(active_limit):
                submit_next()

            while next_yield < len(schedule) or buffered_frame is not None:
                if next_yield < len(schedule):
                    submit_next()

                    fut = futures.pop(next_yield)
                    curr_frame, buf = fut.result()
                    buffer_pool.append(buf)  # return buffer to pool

                    curr_delay = delays_ms[next_yield]
                    next_yield += 1

                    # Periodic explicit garbage collection
                    if next_yield % 100 == 0:
                        gc.collect()

                    if buffered_frame is None:
                        buffered_frame = curr_frame
                        buffered_delay = curr_delay
                    else:
                        diff = ImageChops.difference(curr_frame, buffered_frame)
                        if diff.getbbox() is None:
                            # Identical frame: accumulate delay
                            buffered_delay += curr_delay
                        else:
                            # Yield the buffered frame with its final accumulated delay
                            buffered_frame.info["duration"] = buffered_delay
                            total_saved_frames += 1
                            yield buffered_frame

                            # Buffer the new unique frame
                            buffered_frame = curr_frame
                            buffered_delay = curr_delay
                else:
                    # Final yield at end of stream
                    if buffered_frame is not None:
                        buffered_frame.info["duration"] = buffered_delay
                        total_saved_frames += 1
                        yield buffered_frame
                        buffered_frame = None

        print(
            f"Frame deduplication: reduced from {len(schedule)} to {total_saved_frames} frames."
        )

    os.makedirs(RESULTS_DIR, exist_ok=True)
    suffix = _output_suffix(area_scale, horizontal)
    out = os.path.join(RESULTS_DIR, f"catpattern_{seed}{suffix}.gif")

    # Save the frames as an optimized GIF directly using PIL via streaming
    _stream_save_gif(out, first_p, frame_generator())
    plt.close(fig)
    print(f"Saved: {out}")
    return out


if __name__ == "__main__":
    area_scale = 1.0
    seed = None
    gif = False
    horizontal = False
    frames = DEFAULT_GIF_FRAMES
    fps = DEFAULT_GIF_FPS
    gif_size = None

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        arg = args[i]
        if arg in ("-s", "--small"):
            area_scale = 0.5
        elif arg in ("-xs", "--extra-small"):
            area_scale = 0.25
        elif arg in ("-xxs", "--micro"):
            area_scale = 0.1
        elif arg in ("-xxxs", "--nano"):
            area_scale = 0.05
        elif arg in ("-gif", "--gif"):
            gif = True
        elif arg in ("-h", "--horizontal"):
            horizontal = True
        elif arg == "--frames" and i + 1 < len(args):
            i += 1
            frames = int(args[i])
        elif arg == "--fps" and i + 1 < len(args):
            i += 1
            fps = int(args[i])
        elif arg == "--gif-size" and i + 1 < len(args):
            i += 1
            gif_size = int(args[i])
        elif seed is None:
            seed = int(arg)
        i += 1

    if gif:
        generate_gif(
            seed,
            area_scale=area_scale,
            frames=frames,
            fps=fps,
            size=gif_size,
            horizontal=horizontal,
        )
    else:
        generate_pattern(seed, area_scale=area_scale, horizontal=horizontal)
