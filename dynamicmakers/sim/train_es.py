"""Train a MAX-E1 walking policy with Evolution Strategies (numpy only, no GPU).

    python train_es.py                     # train → policy.json (open it in the app's 3D tab)
    python train_es.py --project my.dmk    # start from the gait learned in the app (걸음 학습)
    python train_es.py --eval policy.json  # compare gait-only vs policy under random shoves

ES in one sentence: make many slightly different copies of the network, see
which copies walk better, and move the network toward them. (OpenAI, 2017)
"""
import argparse
import json
import os
import time
from multiprocessing import Pool

import numpy as np

from maxe1_env import MaxE1Walk, new_policy, flatten, unflatten

_env = None
_template = None


def _init(gait, seconds, seed):
    global _env
    _env = MaxE1Walk(gait=gait, seconds=seconds, seed=seed + os.getpid())


def _score(args):
    vec, template, seeds = args
    pol = unflatten(template, vec)
    return float(np.mean([_env.rollout(pol, seed=s)[0] for s in seeds]))


def _mean_score(pool, theta, policy, seeds):
    parts = [seeds[i::2] for i in range(2)]
    return float(np.mean(pool.map(_score, [(theta, policy, p) for p in parts])))


def load_gait(project):
    with open(project, encoding='utf-8') as f:
        data = json.load(f)
    g = (data.get('dynamicmakers') or {}).get('gait')
    if not g:
        raise SystemExit(f'{project}: 학습한 걸음(dynamicmakers.gait)이 없습니다. 앱의 3D 탭에서 걸음 학습 후 저장하세요.')
    return g


def evaluate(path, episodes=20, seed=123):
    with open(path, encoding='utf-8') as f:
        pol = json.load(f)
    env = MaxE1Walk(gait=pol['gait'], seconds=8.0, seed=seed)
    for name, p in (('걸음만', None), ('걸음 + 정책', pol)):
        res = [env.rollout(p, seed=seed + i) for i in range(episodes)]
        falls = sum(r[1]['fell'] for r in res)
        dist = np.mean([r[1]['dx'] for r in res])
        print(f'{name:10s}  넘어짐 {falls}/{episodes}회   평균 {dist * 100:5.1f} cm   평균 점수 {np.mean([r[0] for r in res]):6.1f}')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--iters', type=int, default=60)
    ap.add_argument('--pop', type=int, default=24, help='copies per iteration (even number)')
    ap.add_argument('--sigma', type=float, default=0.03)
    ap.add_argument('--lr', type=float, default=0.003)
    ap.add_argument('--episodes', type=int, default=6, help='episodes per copy (same shoves for every copy)')
    ap.add_argument('--seconds', type=float, default=6.0)
    ap.add_argument('--hidden', type=int, default=32)
    ap.add_argument('--workers', type=int, default=os.cpu_count() or 2)
    ap.add_argument('--project', help='.dmk file whose learned gait to start from')
    ap.add_argument('--out', default='policy.json')
    ap.add_argument('--seed', type=int, default=0)
    ap.add_argument('--eval', metavar='POLICY', help='only compare gait vs policy')
    a = ap.parse_args()
    if a.eval:
        evaluate(a.eval)
        return
    gait = load_gait(a.project) if a.project else None
    policy = new_policy(hidden=a.hidden, gait=gait, seed=a.seed)
    theta = flatten(policy)
    rng = np.random.default_rng(a.seed)
    half = a.pop // 2
    best = -1e9
    t0 = time.time()
    with Pool(a.workers, initializer=_init, initargs=(policy['gait'], a.seconds, a.seed)) as pool:
        test_seeds = list(range(10_000, 10_000 + 12))  # fixed check-up worlds
        base = _mean_score(pool, theta, policy, test_seeds)
        print(f'시작 (걸음만): 점수 {base:.1f}')
        for it in range(1, a.iters + 1):
            seeds = [int(x) for x in rng.integers(0, 1_000_000, a.episodes)]  # same worlds for all copies
            eps = rng.standard_normal((half, theta.size))
            cands = [theta + a.sigma * e for e in eps] + [theta - a.sigma * e for e in eps]
            scores = np.array(pool.map(_score, [(c, policy, seeds) for c in cands]))
            # rank-based fitness shaping: robust to the scale of the reward
            ranks = np.empty(len(scores))
            ranks[np.argsort(scores)] = np.arange(len(scores))
            util = ranks / (len(scores) - 1) - 0.5
            grad = ((util[:half] - util[half:])[:, None] * eps).sum(0) / (half * a.sigma)
            theta = theta + a.lr * grad
            cur = _mean_score(pool, theta, policy, test_seeds)
            if cur > best:
                best = cur
                out = unflatten(policy, theta)
                out['score'] = cur
                out['iterations'] = it
                with open(a.out, 'w', encoding='utf-8') as f:
                    json.dump(out, f)
            print(f'{it:3d}/{a.iters}  현재 {cur:7.1f}  최고 {best:7.1f}  ({time.time() - t0:5.0f}초)', flush=True)
    print(f'저장: {a.out} — 앱의 3D 탭 > 강화학습 정책 > [정책 파일 열기]')


if __name__ == '__main__':
    main()
