#!/usr/bin/env python3
"""Build a multi-resolution favicon.ico from the rasterised PNG icons."""
import struct, os

ICONS = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "brand", "icons")
SOURCES = [
    ("favicon-16x16.png", 16),
    ("favicon-32x32.png", 32),
    ("favicon-64x64.png", 64),
]

entries, blobs, offset = [], [], 6 + 16 * len(SOURCES)
for name, size in SOURCES:
    path = os.path.join(ICONS, name)
    with open(path, "rb") as fh:
        data = fh.read()
    entries.append(struct.pack("<BBBBHHII", size, size, 0, 0, 1, 32, len(data), offset))
    blobs.append(data)
    offset += len(data)

with open(os.path.join(ICONS, "favicon.ico"), "wb") as fh:
    fh.write(struct.pack("<HHH", 0, 1, len(SOURCES)))
    for e in entries:
        fh.write(e)
    for b in blobs:
        fh.write(b)

print(f"favicon.ico written ({os.path.getsize(os.path.join(ICONS, 'favicon.ico'))} bytes, "
      f"{len(SOURCES)} sizes)")
