"""MAX-E1 assembled from the ROBOTIS STEP parts, following the assembly manual.

World frame (mm): x forward, y left, z up, origin on the floor between the feet,
robot standing at zero pose. Each instance: part, rotation (images of the part's
native x/y/z axes), anchor (native mm) placed at a world point, and the body it
moves with. Feature positions come from STEP circle edges (circles.json).
"""
import numpy as np

V = lambda *a: np.array(a, float)
X, Y, Z = V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)
N = lambda v: v / np.linalg.norm(v)

# ---- key dimensions taken from the parts --------------------------------
SOLE_T = 8.2            # F15 thickness
F14_PIVOT = 25.5        # F14 base outer face (y=37) to its arm pivot (y=11.5)
MOD_AXES = 24.0         # 2XL430: axis A at y=+12, axis B at y=-12
LINK = 60.0             # F11 / F12 pivot to pivot
KNEE = 15.5             # F10: F12 pins at y=+-7.75
F4_PIVOT = 21.5         # F4 bottom face to waist pivot
F3_TOP = 17.7           # waist pivot to F3 top face
BOX_H = 50.6            # torso box (two F2 L-sections)
LEG_Y = 35.2            # F14 hip brackets at x=+-35.2 on F4
F11_DX = 26.5           # parallel bars in front of the drive links (F9 lug / F10 pins)
F11_DZ = 5.0

ANKLE_ROLL = SOLE_T + F14_PIVOT
ANKLE_PITCH = ANKLE_ROLL + MOD_AXES
KNEE_LO = ANKLE_PITCH + LINK          # shin F12 top pin
KNEE_HI = KNEE_LO + KNEE              # thigh F12 bottom pin
HIP_PITCH = KNEE_HI + LINK
HIP_ROLL = HIP_PITCH + MOD_AXES
F4_BOTTOM = HIP_ROLL + F14_PIVOT
WAIST = F4_BOTTOM + F4_PIVOT
BOX_BOTTOM = WAIST + F3_TOP
BOX_C = BOX_BOTTOM + BOX_H / 2

# shoulders: F2 end faces are turned 15 deg; horn centre at native (50.3, -13.3, 0)
T15 = np.radians(15)


def inst(part, ax, anchor, at, body, color='frame'):
    R = np.column_stack([N(V(*a)) for a in ax])
    assert abs(np.linalg.det(R) - 1) < 1e-6, (part, np.linalg.det(R))
    t = V(*at) - R @ V(*anchor)
    M = np.eye(4)
    M[:3, :3] = R
    M[:3, 3] = t
    return {'part': part, 'M': M, 'body': body, 'color': color}


def mirror(items):
    """left side = mirror image of the right side (y -> -y); part shapes mirrored too."""
    S = np.diag([1, -1, 1, 1])
    out = []
    for it in items:
        b = it['body']
        out.append(dict(it, M=S @ it['M'], body='L' + b[1:] if b[0] == 'R' else b, mirror=True))
    return out


def right_leg():
    y = -LEG_Y
    it = []
    # foot: sole, F14 bracket, ankle module (roll axis = F14 pivot, pitch above)
    it.append(inst('EF25-F15', (Y, Z, X), (0, 0, 0), (0, y, SOLE_T / 2), 'R_foot', 'sole'))
    it.append(inst('EF25-F14', (-Y, -Z, X), (0, 37, 0), (0, y, SOLE_T), 'R_foot'))
    # ankle 2XL430: B (x_mod) = roll along X, A (z_mod) = pitch along Y, A above B
    it.append(inst('2XL-430', (X, Z, -Y), (0, -12, 0), (0, y, ANKLE_ROLL), 'R_ankle_frame', 'servo'))
    # F9 on the module's top face (+y_mod): its pitch-axis line (y=13.2,z=0) on axis A,
    # plate (+y_F9) pointing down into the module, lug (z=-26.5) toward the front
    it.append(inst('EF25-F9', (Y, -Z, -X), (0, 13.2, 0), (0, y, ANKLE_PITCH), 'R_ankle_frame'))
    # shin: drive link F12 on the ankle pitch horn (horn end y=+30 down), bar F11 behind
    it.append(inst('EF25-F12', (Y, -Z, -X), (0, 30, 0), (0, y, ANKLE_PITCH), 'R_shin'))
    it.append(inst('EF25-F11', (Y, Z, X), (0, -30, 0), (F11_DX, y, ANKLE_PITCH - F11_DZ), 'R_shin_bar'))
    # knee block F10 (y up, z forward-ish): lower F12 pin at (y=-7.75, z=-33.75)
    it.append(inst('EF25-F10', (Y, Z, X), (0, -7.75, -33.75), (0, y, KNEE_LO), 'R_knee_frame'))
    # thigh: F12 drive link from hip pitch horn (y=+30 up) down to the knee, F11 behind
    it.append(inst('EF25-F12', (Y, Z, X), (0, -30, 0), (0, y, KNEE_HI), 'R_thigh'))
    it.append(inst('EF25-F11', (Y, Z, X), (0, -30, 0), (F11_DX, y, KNEE_HI + F11_DZ), 'R_thigh_bar'))
    # hip 2XL430: A (z_mod) = roll along X on top, B (x_mod) = pitch along Y below
    it.append(inst('2XL-430', (Y, Z, X), (0, -12, 0), (0, y, HIP_PITCH), 'R_hip', 'servo'))
    it.append(inst('EF25-F9', (-Y, Z, -X), (0, 13.2, 0), (0, y, HIP_PITCH), 'R_hip'))
    # pelvis bracket F14 (base up under F4), pivot on the hip roll axis
    it.append(inst('EF25-F14', (Y, Z, X), (0, 11.5, 0), (0, y, HIP_ROLL), 'torso'))
    return it


def right_arm():
    it = []
    n = V(0, -np.cos(T15), np.sin(T15))      # shoulder pitch axis, outward (right side)
    d = V(0, -np.sin(T15), -np.cos(T15))     # along the hanging arm
    P = V(0, -50.3, BOX_C + 13.3)            # horn centre on the F2 end face
    # module: A (z_mod, horn face +z) = pitch, horn toward the torso; B = roll along X
    it.append(inst('2XL-430', (-X, -d, -n), (0, 12, 21.0), P, 'R_shoulder', 'servo'))
    R = P + 21.0 * n + MOD_AXES * d          # roll axis point (module centre line)
    # F14: pivot on the roll axis, base toward the hand
    it.append(inst('EF25-F14', (np.cross(d, X), d, X), (0, 11.5, 0), R, 'R_arm'))
    top = R + F14_PIVOT * d
    # F5 arm + F7 claw share one frame: F5 top centre (-45.4, 0, -2.5), arm along -y
    for p in ('EF25-F5', 'EF25-F7'):
        it.append(inst(p, (np.cross(-d, X), -d, X), (-45.4, 0, -2.5), top, 'R_arm'))
    return it


def torso():
    it = []
    it.append(inst('EF25-F4', (Y, Z, X), (0, -21.5, 0), (0, 0, F4_BOTTOM), 'torso'))
    it.append(inst('EF25-F3', (Y, Z, X), (0, 0, 0), (0, 0, WAIST), 'torso'))
    # two F2 L-sections make one closed box: lower one (bottom + front plate),
    # upper one turned 180 deg about Y (top + back plate, shoulders on its angled ends)
    it.append(inst('EF25-F2', (-Y, Z, -X), (0, 0, 0), (0, 0, BOX_C), 'torso'))
    it.append(inst('EF25-F2', (-Y, -Z, X), (0, 0, 0), (0, 0, BOX_C), 'torso'))
    it.append(inst('EF25-F28', (Y, Z, X), (0, 35.0, 12.8), (25.2 + 3, 0, BOX_C + BOX_H / 2 + 2), 'torso', 'cover'))
    # XL-320D (head dummy) standing on the top centre: horn face (the "eye") forward, horn end down
    it.append(inst('XL-320', (-Y, -Z, X), (0, 9, 1.5), (0, 0, BOX_C + BOX_H / 2), 'torso', 'servo'))
    # back: F26 holder screwed on the back arms of the two hip F14 brackets, battery clipped on it
    it.append(inst('EF25-F26', (Y, Z, X), (0, 0, 0), (-22.2 - 2.4, 0, HIP_ROLL + 8), 'torso'))
    it.append(inst('EF25-F27', (-Y, Z, -X), (0, 0, -3.1), (-22.2 - 4.8, 0, HIP_ROLL + 8), 'torso', 'servo'))
    # CM-550: its bottom (mounting) face on the back plate of the box, buttons facing back
    it.append(inst('CM-550', (Y, -Z, -X), (0, 0, -11.0), (-25.2, 0, BOX_C), 'torso', 'servo'))
    # head shell F1: joined to the XL-320 sides by the SPD-3b5 plates (6 mm hole grid), so it can only be
    # turned in 90 deg steps against the XL-320 — here 180 deg about the horn axis (manual p.11 step 14):
    # slab on top rising toward the back, fork at the back, window over the eye
    it.append(inst('EF25-F1', (Y, Z, X), (0, 0, 0), (-17.4, 0, BOX_C + BOX_H / 2 + 18.0), 'torso', 'frame'))
    return it


def assembly():
    r = right_leg() + right_arm()
    return torso() + r + mirror(r)


# joint axes at zero pose (world mm) for the physics model
def joints():
    y = -LEG_Y
    n = V(0, -np.cos(T15), np.sin(T15))
    d = V(0, -np.sin(T15), -np.cos(T15))
    P = V(0, -50.3, BOX_C + 13.3)
    return {
        'R_shoulder_pitch': (P + 21.0 * n, n),
        'R_shoulder_roll': (P + 21.0 * n + MOD_AXES * d, X),
        'R_hip_roll': (V(0, y, HIP_ROLL), X),
        'R_hip_pitch': (V(0, y, HIP_PITCH), Y),
        'R_knee_hi': (V(0, y, KNEE_HI), Y),
        'R_knee_lo': (V(0, y, KNEE_LO), Y),
        'R_ankle_pitch': (V(0, y, ANKLE_PITCH), Y),
        'R_ankle_roll': (V(0, y, ANKLE_ROLL), X),
    }


if __name__ == '__main__':
    for k, v in joints().items():
        print(k, np.round(v[0], 1), np.round(v[1], 3))
    print('box', BOX_BOTTOM, BOX_C, BOX_BOTTOM + BOX_H)
