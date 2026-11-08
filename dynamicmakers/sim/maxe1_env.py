"""MAX-E1 walking environment for reinforcement learning (MuJoCo).

Same world as the app's 3D tab (maxe1.xml is exported from the app), same
rhythmic gait (gait.js), same control timing (new targets 25x/s, servo speed
6 rad/s) and the same network maths as policy.js, so a policy trained here
runs unchanged in 다이나믹 메이커스 — in the 3D simulator and on the robot.

The network does not walk from scratch: it adds small corrections (residuals)
to the rhythmic gait from what the CM-550 IMU feels (tilt + gyro).
"""
import json
import math
import os

import mujoco
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
CONTROL_DT = 0.04
SERVO_SPEED = 6.0
JOINTS = ['R_shoulder_pitch', 'R_shoulder_roll', 'L_shoulder_pitch', 'L_shoulder_roll',
          'R_hip_roll', 'R_hip_pitch', 'L_hip_roll', 'L_hip_pitch',
          'R_knee', 'R_ankle_roll', 'L_knee', 'L_ankle_roll']
OBS_DIM = 6 + len(JOINTS)
OBS_SCALE = [1.0, 1.0, 0.2, 0.2, 1.0, 1.0] + [1.0] * len(JOINTS)

DEFAULT_GAIT = {'period': 0.381, 'height': 0.154, 'sway': 0.084, 'lift': 0.12,
                'stride': 0.248, 'liftPhase': -2.664, 'arm': 0.328}


def gait_targets(g, t, k=1.0):
    """Exactly gait.js gaitTargets(): joint -> radians."""
    ph = 2 * math.pi * t / g['period']
    roll = g['sway'] * math.sin(ph) * k
    out = {}
    for s, sg in (('R', 1), ('L', -1)):
        lift = g['lift'] * max(0.0, math.sin(ph + g['liftPhase'] + (math.pi if s == 'L' else 0.0))) * k
        step = g['stride'] * math.cos(ph) * sg * k
        out[s + '_hip_roll'] = roll
        out[s + '_ankle_roll'] = -roll
        out[s + '_hip_pitch'] = -g['height'] * k - lift + step
        out[s + '_knee'] = g['height'] * k + lift
        out[s + '_shoulder_pitch'] = -g['arm'] * math.cos(ph) * sg * k
        out[s + '_shoulder_roll'] = 0.0
    return out


def mlp_act(policy, obs):
    """Exactly policy.js policyAct()."""
    x = np.asarray(obs, dtype=np.float64)
    layers = policy['layers']
    for i, L in enumerate(layers):
        x = np.asarray(L['W']) @ x + np.asarray(L['b'])
        if i < len(layers) - 1:
            x = np.tanh(x)
    return np.tanh(x) * policy.get('scale', 0.25)


class MaxE1Walk:
    """episode = `seconds` of walking; reward = forward progress, staying up, small corrections."""

    def __init__(self, xml=os.path.join(HERE, 'maxe1.xml'), gait=None, seconds=6.0,
                 push=True, randomize=True, seed=0):
        self.model = mujoco.MjModel.from_xml_path(xml)
        self.data = mujoco.MjData(self.model)
        self.gait = dict(DEFAULT_GAIT, **(gait or {}))
        self.seconds = seconds
        self.push = push
        self.randomize = randomize
        self.rng = np.random.default_rng(seed)
        m = self.model
        self.act = [mujoco.mj_name2id(m, mujoco.mjtObj.mjOBJ_ACTUATOR, j) for j in JOINTS]
        self.torso = mujoco.mj_name2id(m, mujoco.mjtObj.mjOBJ_BODY, 'torso')
        self.base = {'mass': m.body_mass.copy(), 'fric': m.geom_friction.copy(),
                     'gain': m.actuator_gainprm.copy(), 'bias': m.actuator_biasprm.copy()}
        self.hold = int(round(CONTROL_DT / m.opt.timestep))

    # ---- world variation (domain randomisation): the real robot is never exactly the model
    def _vary(self):
        m, b = self.model, self.base
        m.body_mass[:] = b['mass']
        m.geom_friction[:] = b['fric']
        m.actuator_gainprm[:] = b['gain']
        m.actuator_biasprm[:] = b['bias']
        if not self.randomize:
            return
        m.body_mass[:] = b['mass'] * self.rng.uniform(0.85, 1.15, size=b['mass'].shape)
        m.geom_friction[:, 0] = b['fric'][:, 0] * self.rng.uniform(0.7, 1.3)
        k = self.rng.uniform(0.8, 1.2)
        m.actuator_gainprm[:, 0] = b['gain'][:, 0] * k
        m.actuator_biasprm[:, 1] = b['bias'][:, 1] * k

    def imu(self):
        d = self.data
        w, x, y, z = d.sensordata[0:4]
        roll = math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y))
        pitch = math.asin(max(-1.0, min(1.0, 2 * (w * y - z * x))))
        return roll, pitch, d.sensordata[4], d.sensordata[5]

    def obs(self, t, cmd):
        roll, pitch, gx, gy = self.imu()
        ph = 2 * math.pi * t / self.gait['period']
        o = [roll, pitch, gx, gy, math.sin(ph), math.cos(ph)] + [cmd[j] for j in JOINTS]
        return np.asarray(o) * np.asarray(OBS_SCALE)

    def fallen(self):
        d = self.data
        return d.qpos[2] < 0.15 or d.xmat[self.torso][8] < 0.6

    def rollout(self, policy=None, seed=None):
        """Run one episode. policy: dict (dm-policy-1) or None (gait only). Returns (reward, info).
        The same `seed` gives the same world variation and shove (fair comparisons)."""
        if seed is not None:
            self.rng = np.random.default_rng(seed)
        m, d = self.model, self.data
        self._vary()
        mujoco.mj_resetData(m, d)
        cmd_servo = np.zeros(m.nu)
        goal = np.zeros(m.nu)
        lim = SERVO_SPEED * m.opt.timestep
        n = int(round(self.seconds / m.opt.timestep))
        push_at = self.rng.uniform(1.5, self.seconds - 1.0) if self.push else -1
        push_f = self.rng.choice([-1, 1]) * self.rng.uniform(1.0, 3.5)
        prev = None
        reward = 0.0
        effort = 0.0
        tilt = 0.0
        fell = False
        for i in range(n):
            t = i * m.opt.timestep
            if i % self.hold == 0:
                k = min(1.0, t / 0.6)
                tg = gait_targets(self.gait, t, k)
                if policy is not None:
                    res = mlp_act(policy, self.obs(t, prev or tg))
                    for j, r in zip(JOINTS, res):
                        tg[j] += r * k
                    effort += float(np.sum(res ** 2))
                prev = tg
                r_, p_, _, _ = self.imu()
                tilt += (r_ * r_ + p_ * p_) * CONTROL_DT  # dense signal: stay upright
                for a, j in zip(self.act, JOINTS):
                    goal[a] = tg[j]
            # a sideways shove for 0.1 s: the policy should learn to catch it
            d.xfrc_applied[self.torso, 1] = push_f if push_at <= t < push_at + 0.1 else 0.0
            cmd_servo += np.clip(goal - cmd_servo, -lim, lim)
            d.ctrl[:] = cmd_servo
            mujoco.mj_step(m, d)
            if i % self.hold == 0 and self.fallen():
                fell = True
                break
        alive = d.time
        dx, dy = d.qpos[0], d.qpos[1]
        reward = (100 * dx * (alive / self.seconds) - 30 * abs(dy) + 10 * alive - (30 if fell else 0)
                  - 0.5 * effort - 20 * tilt)
        return reward, {'dx': dx, 'dy': dy, 'alive': alive, 'fell': fell}


def new_policy(hidden=32, scale=0.25, gait=None, seed=0):
    """Small random first layer, zero last layer: starts as 'gait only'."""
    rng = np.random.default_rng(seed)
    return {
        'format': 'dm-policy-1', 'name': 'MAX-E1 ES policy', 'joints': JOINTS,
        'gait': dict(DEFAULT_GAIT, **(gait or {})), 'scale': scale, 'obs_scale': OBS_SCALE,
        'layers': [
            {'W': (rng.standard_normal((hidden, OBS_DIM)) * 0.3).tolist(), 'b': [0.0] * hidden},
            {'W': np.zeros((len(JOINTS), hidden)).tolist(), 'b': [0.0] * len(JOINTS)},
        ],
    }


def flatten(policy):
    return np.concatenate([np.ravel(L['W']) for L in policy['layers']] + [np.ravel(L['b']) for L in policy['layers']])


def unflatten(policy, vec):
    out = json.loads(json.dumps(policy))
    i = 0
    shapes = [np.shape(L['W']) for L in policy['layers']]
    for L, sh in zip(out['layers'], shapes):
        n = sh[0] * sh[1]
        L['W'] = vec[i:i + n].reshape(sh).tolist()
        i += n
    for L, sh in zip(out['layers'], shapes):
        L['b'] = vec[i:i + sh[0]].tolist()
        i += sh[0]
    return out
