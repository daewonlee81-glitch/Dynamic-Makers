/**
 * MAX-E1 (ROBOTIS ENGINEER Kit 1) for MuJoCo, built from the ROBOTIS STEP parts.
 *
 * The parts are assembled in scripts/maxe1_asm.py the way the manual
 * (ROBOTIS_ENGINEER_KIT1_MAX-E1_KR_ver2113) puts them together; joint
 * positions, masses, centres of mass and inertias come from that assembly
 * (scripts/gen-maxe1-cad.py -> maxe1-cad.json). 6 × 2XL430-W250-T (12 axes):
 * ID 1·2 and 3·4 shoulders (pitch axis turned 15° by the angled ends of the
 * EF25-F2 torso), 5·6 and 7·8 hips, 9·10 and 11·12 ankles.
 *
 * Legs are double parallel links: hip pitch → thigh link (F12, 60 mm) → knee
 * block (F10, its two pins 15.5 mm apart) → shin link (F12, 60 mm) → ankle
 * module (pitch, then roll 24 mm below). Modelled with two passive joints per
 * leg tied by equality constraints (knee_comp = -hip_pitch, ankle_comp =
 * -knee), so the knee block and the ankle module keep the torso's pitch. The
 * ankle module's pitch drives the shin, which here is the "knee" joint.
 *
 * Coordinates: x forward, y to the robot's left, z up. Metres, kilograms.
 */
import CAD from './maxe1-cad.json' with {type: 'json'};

export const MODEL_VERSION = 4; // saved robot settings from an older model are not reused

export const MAXE1_DEFAULT = {
    extraMass: 0, // kg added to the torso (e.g. a sensor you mounted)
    // 2XL430-W250 as a position servo
    kp: 6.0, maxTorque: 1.4, damping: 0.06, armature: 0.006,
    friction: 1.0
};

/**
 * Which DYNAMIXEL ID drives which joint, the direction (sign) and the angle
 * (degrees) that means "straight" for that joint. Consecutive IDs share one
 * 2XL430 module (A = odd, B = even).
 * The directions come from ROBOTIS' own MAX-E1 example motions
 * (03_ENG1_MAX_E1.mtn3): its symmetric poses (앉기 107, 브라보 109, 일어서기 105)
 * fix how left and right relate, and 앉기 (knees forward), 인사 108 (right arm
 * up in front), 왼발킥 120 (weight onto the right foot, left leg kicks forward)
 * and the walk 150-154 (weight onto the standing leg) fix the rest. Played in
 * the 3D world with these signs, the official walk 150 → 152 ×5 → 154 walks
 * about 90 cm forward without falling.
 */
export const MAXE1_JOINT_MAP = [
    {id: 1, joint: 'R_shoulder_pitch', name: '오른팔 앞뒤', sign: -1, center: 180},
    {id: 2, joint: 'R_shoulder_roll', name: '오른팔 옆', sign: -1, center: 180},
    {id: 3, joint: 'L_shoulder_pitch', name: '왼팔 앞뒤', sign: 1, center: 180},
    {id: 4, joint: 'L_shoulder_roll', name: '왼팔 옆', sign: 1, center: 180},
    {id: 5, joint: 'R_hip_roll', name: '오른쪽 엉덩이 옆', sign: -1, center: 180},
    {id: 6, joint: 'R_hip_pitch', name: '오른쪽 엉덩이 앞뒤', sign: 1, center: 180},
    {id: 7, joint: 'L_hip_roll', name: '왼쪽 엉덩이 옆', sign: -1, center: 180},
    {id: 8, joint: 'L_hip_pitch', name: '왼쪽 엉덩이 앞뒤', sign: 1, center: 180},
    {id: 9, joint: 'R_knee', name: '오른쪽 발목 앞뒤 (무릎 굽힘)', sign: -1, center: 180},
    {id: 10, joint: 'R_ankle_roll', name: '오른쪽 발목 옆', sign: 1, center: 180},
    {id: 11, joint: 'L_knee', name: '왼쪽 발목 앞뒤 (무릎 굽힘)', sign: -1, center: 180},
    {id: 12, joint: 'L_ankle_roll', name: '왼쪽 발목 옆', sign: 1, center: 180}
];

export const ACTUATED = MAXE1_JOINT_MAP.map(j => j.joint);

const f = v => Number(v.toFixed(5));
const v3 = (x, y, z) => `${f(x)} ${f(y)} ${f(z)}`;
const B = CAD.bodies;
const rel = (child, parent) => B[child].pos.map((v, i) => v - B[parent].pos[i]);
const inertial = (name, extra = 0) => {
    const b = B[name];
    return `<inertial pos="${v3(...b.com)}" mass="${f(b.mass + extra)}" fullinertia="${b.fullinertia.join(' ')}"/>`;
};

/** Height of the torso body (box centre) above the floor when standing straight. */
export const standHeight = () => B.torso.pos[2];

export const buildMJCF = (params = {}) => {
    const p = Object.assign({}, MAXE1_DEFAULT, params);
    const D = CAD.dims;
    const ja = `damping="${p.damping}" armature="${p.armature}"`;
    const dark = 'rgba="0.15 0.15 0.17 1"';
    const frame = 'rgba="0.3 0.32 0.36 1"';
    const leg = s => `
      <body name="${s}_hip" pos="${v3(...rel(`${s}_hip`, 'torso'))}">
        <joint name="${s}_hip_roll" axis="1 0 0" range="-0.6 0.6" ${ja}/>
        ${inertial(`${s}_hip`)}
        <geom type="box" size="0.0205 0.0205 0.0235" pos="0 0 -0.012" ${dark}/>
        <body name="${s}_thigh" pos="${v3(...rel(`${s}_thigh`, `${s}_hip`))}">
          <joint name="${s}_hip_pitch" axis="0 1 0" range="-1.6 1.6" ${ja}/>
          ${inertial(`${s}_thigh`)}
          <geom type="capsule" fromto="0 0 0 0 0 -0.06" size="0.011" ${frame}/>
          <body name="${s}_knee_frame" pos="${v3(...rel(`${s}_knee_frame`, `${s}_thigh`))}">
            <joint name="${s}_knee_comp" axis="0 1 0" range="-1.7 1.7" damping="0.005"/>
            ${inertial(`${s}_knee_frame`)}
            <geom type="box" size="0.016 0.018 0.016" pos="0.012 0 -0.008" ${frame}/>
            <body name="${s}_shin" pos="${v3(...rel(`${s}_shin`, `${s}_knee_frame`))}">
              <joint name="${s}_knee" axis="0 1 0" range="-1.6 1.6" ${ja}/>
              ${inertial(`${s}_shin`)}
              <geom type="capsule" fromto="0 0 0 0 0 -0.06" size="0.011" ${frame}/>
              <body name="${s}_ankle_frame" pos="${v3(...rel(`${s}_ankle_frame`, `${s}_shin`))}">
                <joint name="${s}_ankle_comp" axis="0 1 0" range="-1.7 1.7" damping="0.005"/>
                ${inertial(`${s}_ankle_frame`)}
                <geom type="box" size="0.0205 0.0205 0.0235" pos="0 0 -0.012" ${dark}/>
                <body name="${s}_foot" pos="${v3(...rel(`${s}_foot`, `${s}_ankle_frame`))}">
                  <joint name="${s}_ankle_roll" axis="1 0 0" range="-0.6 0.6" ${ja}/>
                  ${inertial(`${s}_foot`)}
                  <geom name="${s}_sole" type="box" size="${v3(D.sole[0] / 2, D.sole[1] / 2, D.sole[2] / 2)}"
                        pos="${v3(0, 0, -D.ankleRoll + (D.sole[2] / 2))}" rgba="0.18 0.42 0.75 1" friction="${p.friction} 0.02 0.002"/>
                  <site name="${s}_foot_site" pos="${v3(0, 0, -D.ankleRoll)}" size="0.004"/>
                </body>
              </body>
            </body>
          </body>
        </body>
      </body>`;
    const arm = (s, out) => {
        const t = D.shoulderTilt * Math.PI / 180;
        const axis = v3(0, Math.cos(t), out * Math.sin(t)); // pitch axis (F2 end-face normal): tilted 15° up toward the outside, square to the hanging arm
        const dir = [0, out * Math.sin(t), -Math.cos(t)]; // hanging arm direction
        const L = D.armLength;
        return `
      <body name="${s}_shoulder" pos="${v3(...rel(`${s}_shoulder`, 'torso'))}">
        <joint name="${s}_shoulder_pitch" axis="${axis}" range="-3.1 3.1" ${ja}/>
        ${inertial(`${s}_shoulder`)}
        <geom type="box" size="0.0205 0.0205 0.0235" ${dark}/>
        <body name="${s}_arm" pos="${v3(...rel(`${s}_arm`, `${s}_shoulder`))}">
          <joint name="${s}_shoulder_roll" axis="1 0 0" range="-1.7 1.7" ${ja}/>
          ${inertial(`${s}_arm`)}
          <geom type="capsule" fromto="0 0 0 ${v3(dir[0] * L, dir[1] * L, dir[2] * L)}" size="0.013" ${frame}/>
        </body>
      </body>`;
    };
    const eq = s => `
    <joint joint1="${s}_knee_comp" joint2="${s}_hip_pitch" polycoef="0 -1 0 0 0" solref="0.004 1"/>
    <joint joint1="${s}_ankle_comp" joint2="${s}_knee" polycoef="0 -1 0 0 0" solref="0.004 1"/>`;
    const act = j => `
    <position name="${j}" joint="${j}" kp="${p.kp}" forcerange="${-p.maxTorque} ${p.maxTorque}" ctrlrange="-3.14 3.14"/>`;
    const box = D.box;
    const zc = B.torso.pos[2];
    return `<mujoco model="MAX-E1 (ROBOTIS STEP parts)">
  <compiler angle="radian" autolimits="true"/>
  <option timestep="0.002" integrator="implicitfast"/>
  <default>
    <geom contype="1" conaffinity="0" condim="3" friction="${p.friction} 0.02 0.002"/>
  </default>
  <visual><global offwidth="640" offheight="480"/></visual>
  <worldbody>
    <light pos="0 0 2" dir="0 0 -1" directional="true"/>
    <geom name="floor" type="plane" size="3 3 0.05" contype="0" conaffinity="1" rgba="0.9 0.92 0.95 1"/>
    <body name="torso" pos="0 0 ${f(zc)}">
      <freejoint name="root"/>
      ${inertial('torso', p.extraMass)}
      <geom name="torso" type="box" size="${v3(box[0] / 2, box[1] / 2, box[2] / 2)}" rgba="0.18 0.42 0.75 1"/>
      <geom name="pelvis" type="box" size="0.022 0.047 0.022" pos="0 0 ${f(-0.0436)}" ${frame}/>
      <geom name="battery" type="box" size="0.0163 0.045 0.024" pos="${v3(-0.0433, 0, B.R_hip.pos[2] + 0.008 - zc)}" ${dark}/>
      <geom name="head" type="box" size="0.021 0.017 0.023" pos="0 0 ${f((box[2] / 2) + 0.023)}" rgba="0.95 0.95 0.97 1"/>
      <site name="imu" pos="0 0 0" size="0.005"/>${arm('R', -1)}${arm('L', 1)}${leg('R')}${leg('L')}
    </body>
  </worldbody>
  <equality>${eq('R')}${eq('L')}
  </equality>
  <actuator>${ACTUATED.map(act).join('')}
  </actuator>
  <sensor>
    <framequat name="imu_quat" objtype="site" objname="imu"/>
    <gyro name="imu_gyro" site="imu"/>
    <accelerometer name="imu_acc" site="imu"/>
  </sensor>
</mujoco>
`;
};
