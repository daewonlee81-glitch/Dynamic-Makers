#!/usr/bin/env python3
"""ROBOTIS MAX-E1 example motions (.mtn3, R+ Task 3.0) -> src/sim3d/maxe1-motions.json

Usage: python3 scripts/gen-maxe1-motions.py 03_ENG1_MAX_E1_KR.mtn3 src/sim3d/maxe1-motions.json
Keeps pages (key frames: frame number at 128 per second, pose = degrees from the
centre for IDs 1..12), flows (pages in turn, loops, speed) and call numbers.
"""
import json, re, sys

src, out = sys.argv[1], sys.argv[2]
x = open(src, encoding='utf-8').read()
r2 = lambda v: 0 if abs(v) < 0.005 else round(v, 2)
pages = {}
for m in re.finditer(r'<Page name="([^"]+)">([\s\S]*?)</Page>', x):
    steps = [[int(f)] + [r2(float(v)) for v in p.split()] for f, p in re.findall(r'<step frame="(\d+)" pose="([^"]+)"', m.group(2))]
    if steps:
        pages[m.group(1)] = steps
flows = {}
for m in re.finditer(r'<Flow name="([^"]+)"[^>]*>([\s\S]*?)</Flow>', x):
    units = [[p, int(l), float(s)] for p, s, l in re.findall(r'main="([^"]+)" mainSpeed="([^"]+)" loop="(\d+)"', m.group(2)) if p in pages]
    if units:
        flows[m.group(1)] = units
calls = [[int(i), f] for i, f in re.findall(r'callIndex="(\d+)"[^>]*flow="([^"]+)"', x) if f in flows]
data = {
    'source': 'ROBOTIS ENGINEER Kit 1 MAX-E1 example motion file (03_ENG1_MAX_E1_KR.mtn3), (c) ROBOTIS',
    'frameSeconds': 1 / 128,
    'ids': list(range(1, 13)),
    'pages': pages, 'flows': flows, 'calls': calls
}
json.dump(data, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(out, len(pages), 'pages', len(flows), 'flows', len(calls), 'calls')
