"""
Strip studio white + baked checkerboard from notifications empty art.

  cd app/mobile_react_native
  python scripts/process-notifications-empty-art.py

Reads: assets/illustrations/notifications-empty-source.png
Writes: assets/illustrations/notifications-empty.png
"""

from __future__ import annotations

import io
import sys
from collections import deque

import numpy as np
from PIL import Image

try:
    from rembg import remove
except ImportError:
    print("pip install rembg", file=sys.stderr)
    raise

ROOT = __file__.replace("\\", "/").rsplit("/", 2)[0]
SRC = f"{ROOT}/assets/illustrations/notifications-empty-source.png"
DST = f"{ROOT}/assets/illustrations/notifications-empty.png"


def bfs_reachable(
    h: int,
    w: int,
    walk: np.ndarray,
    seeds: list[tuple[int, int]],
) -> np.ndarray:
    reachable = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for y, x in seeds:
        if walk[y, x] and not reachable[y, x]:
            reachable[y, x] = True
            q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and walk[ny, nx] and not reachable[ny, nx]:
                reachable[ny, nx] = True
                q.append((ny, nx))
    return reachable


def clear_small_components(
    a: np.ndarray,
    member: np.ndarray,
    max_area: int,
) -> int:
    """Clear alpha for 4-connected components of `member` with area <= max_area."""
    h, w = member.shape
    vis = np.zeros((h, w), dtype=bool)
    cleared = 0
    for y in range(h):
        for x in range(w):
            if not member[y, x] or vis[y, x]:
                continue
            comp: list[tuple[int, int]] = []
            dq: deque[tuple[int, int]] = deque([(y, x)])
            vis[y, x] = True
            while dq:
                cy, cx = dq.popleft()
                comp.append((cy, cx))
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and member[ny, nx] and not vis[ny, nx]:
                        vis[ny, nx] = True
                        dq.append((ny, nx))
            if len(comp) <= max_area:
                for cy, cx in comp:
                    a[cy, cx, 3] = 0
                    cleared += 1
    return cleared


def main() -> None:
    with open(SRC, "rb") as f:
        raw = f.read()
    png_out = remove(raw, alpha_matting=True, alpha_matting_foreground_threshold=240)
    a = np.array(Image.open(io.BytesIO(png_out)).convert("RGBA"), dtype=np.uint8)
    h, w = a.shape[:2]

    rgb = a[:, :, :3].astype(np.float32)
    mn = rgb.min(axis=2)
    mx = rgb.max(axis=2)
    rng = mx - mn
    mean = rgb.mean(axis=2)
    alpha = a[:, :, 3].astype(np.float32)

    transparent = alpha < 30

    # Pass 1: near-pure white connected to image edge (studio + bright checker cells)
    near_white = (rng <= 14.0) & (mean >= 242.0) & (alpha > 35)
    walk1 = transparent | near_white
    seeds: list[tuple[int, int]] = []
    for x in range(w):
        for y in (0, h - 1):
            if walk1[y, x]:
                seeds.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if walk1[y, x]:
                seeds.append((y, x))
    r1 = bfs_reachable(h, w, walk1, seeds)
    kill1 = near_white & r1
    a[kill1, 3] = 0
    alpha = a[:, :, 3].astype(np.float32)

    # Pass 2: light flat neutrals in small blobs (baked checker in gaps, handle holes)
    m2 = (
        (rng <= 22.0)
        & (mean >= 165.0)
        & (mean <= 248.0)
        & (alpha > 35)
    )
    clear_small_components(a, m2, max_area=14_000)

    alpha = a[:, :, 3].astype(np.float32)
    # Pass 3: darker flat grays in tiny blobs (darker checker squares)
    m3 = (
        (rng <= 28.0)
        & (mean >= 130.0)
        & (mean <= 215.0)
        & (alpha > 35)
    )
    clear_small_components(a, m3, max_area=6_000)

    Image.fromarray(a, "RGBA").save(DST, optimize=True)
    op = (a[:, :, 3] > 128).mean()
    print(f"Wrote {DST} opaque_fraction={op:.4f}")


if __name__ == "__main__":
    main()
