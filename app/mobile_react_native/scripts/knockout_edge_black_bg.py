"""
Remove edge-connected black/near-black pixels so PNG alpha shows correctly in RN.
Stock icons often use solid #000 around the art — flood from edges through dark pixels.
"""
from __future__ import annotations

import sys
from collections import deque

from PIL import Image


def knockout_black_connected_to_edges(path_in: str, path_out: str, tol: int = 22) -> None:
    img = Image.open(path_in).convert("RGBA")
    px = img.load()
    w, h = img.size

    def is_near_black(r: int, g: int, b: int) -> bool:
        return r <= tol and g <= tol and b <= tol

    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def push_edge_pixels() -> None:
        for x in range(w):
            for y in (0, h - 1):
                r, g, b, a = px[x, y]
                if not seen[y][x] and a > 0 and is_near_black(r, g, b):
                    q.append((x, y))
        for y in range(h):
            for x in (0, w - 1):
                r, g, b, a = px[x, y]
                if not seen[y][x] and a > 0 and is_near_black(r, g, b):
                    q.append((x, y))

    push_edge_pixels()

    while q:
        x, y = q.popleft()
        if seen[y][x]:
            continue
        r, g, b, a = px[x, y]
        if a == 0 or not is_near_black(r, g, b):
            continue
        seen[y][x] = True
        px[x, y] = (r, g, b, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < w and 0 <= ny < h) or seen[ny][nx]:
                continue
            r2, g2, b2, a2 = px[nx, ny]
            if a2 > 0 and is_near_black(r2, g2, b2):
                q.append((nx, ny))

    img.save(path_out, "PNG")


if __name__ == "__main__":
    inp, outp = sys.argv[1], sys.argv[2]
    tol = int(sys.argv[3]) if len(sys.argv) > 3 else 22
    knockout_black_connected_to_edges(inp, outp, tol=tol)
    print(f"Wrote {outp}")
