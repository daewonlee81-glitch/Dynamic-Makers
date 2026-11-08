"""Search the rhythmic gait (gait.js numbers) for the current maxe1.xml.

Cross-entropy method like the app's 걸음 학습, but every candidate walks in
several varied worlds (weight, friction, motor stiffness; half of them with a
shove), so the gait that wins is a sturdy one, not a lucky one.

    python3 search_gait.py --gens 40 --pop 40 --worlds 8 --out gait.json
"""
import argparse
import json
from multiprocessing import Pool

import numpy as np

import maxe1_env as E

PARAMS = [  # same ranges as GAIT_PARAMS in gait.js
    ('period', 0.35, 1.2), ('height', 0.05, 0.6), ('sway', 0.06, 0.35), ('lift', 0.12, 0.5),
    ('stride', 0.0, 0.4), ('liftPhase', -3.14, 3.14), ('arm', 0.0, 0.6)]
LO = np.array([p[1] for p in PARAMS])
HI = np.array([p[2] for p in PARAMS])
_envs = {}


def to_gait(v):
    return {p[0]: float(x) for p, x in zip(PARAMS, np.clip(v, LO, HI))}


def _run(args):
    v, seed, push, seconds = args
    key = (push, seconds)
    if key not in _envs:
        _envs[key] = E.MaxE1Walk(seconds=seconds, push=push, randomize=True)
    env = _envs[key]
    env.gait = dict(E.DEFAULT_GAIT, **to_gait(v))
    r, info = env.rollout(None, seed=seed)
    return r, info['fell'], info['dx']


def score(pool, vs, seeds, seconds):
    jobs = [(v, s, i % 2 == 1, seconds) for v in vs for i, s in enumerate(seeds)]
    out = np.array(pool.map(_run, jobs, chunksize=8)).reshape(len(vs), len(seeds), 3)
    return out[:, :, 0].mean(1), out[:, :, 1].mean(1), out[:, :, 2].mean(1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gens', type=int, default=40)
    ap.add_argument('--pop', type=int, default=40)
    ap.add_argument('--worlds', type=int, default=8)
    ap.add_argument('--seconds', type=float, default=6.0)
    ap.add_argument('--seed', type=int, default=0)
    ap.add_argument('--start', default=None, help='json gait to start from')
    ap.add_argument('--out', default='gait.json')
    a = ap.parse_args()
    rng = np.random.default_rng(a.seed)
    start = json.load(open(a.start)) if a.start else E.DEFAULT_GAIT
    mu = np.array([start[p[0]] for p in PARAMS])
    sd = (HI - LO) * 0.15
    best, best_s = mu.copy(), -1e9
    with Pool() as pool:
        for g in range(a.gens):
            seeds = list(rng.integers(0, 10**6, a.worlds))
            vs = np.clip(mu + rng.standard_normal((a.pop, len(PARAMS))) * sd, LO, HI)
            vs[0] = best  # keep the best so far in the race (same worlds)
            s, falls, dx = score(pool, vs, seeds, a.seconds)
            el = np.argsort(-s)[:max(4, a.pop // 5)]
            mu = vs[el].mean(0)
            sd = np.maximum(vs[el].std(0), (HI - LO) * 0.01)
            if s[el[0]] > best_s or np.array_equal(vs[el[0]], best):
                best, best_s = vs[el[0]].copy(), s[el[0]]
            print(f'gen {g + 1:2d}  best {s[el[0]]:7.1f}  falls {falls[el[0]]:.2f}  dx {dx[el[0]] * 100:5.1f} cm', flush=True)
        # final check on 40 new worlds (20 with a shove)
        seeds = list(range(5000, 5040))
        s, falls, dx = score(pool, [best], seeds, a.seconds)
    g = to_gait(best)
    print('gait', json.dumps({k: round(v, 3) for k, v in g.items()}))
    print(f'check: score {s[0]:.1f}  falls {falls[0] * 100:.0f}%  forward {dx[0] * 100:.1f} cm')
    json.dump({k: round(v, 3) for k, v in g.items()}, open(a.out, 'w'))


if __name__ == '__main__':
    main()
