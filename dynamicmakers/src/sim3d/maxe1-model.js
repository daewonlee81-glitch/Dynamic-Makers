/**
 * MAX-E1 (ROBOTIS ENGINEER Kit 1) for MuJoCo — an approximate model.
 *
 * From the assembly manual (ROBOTIS_ENGINEER_KIT1_MAX-E1_KR_ver2113, p.3-4, 39):
 * 6 × 2XL430-W250-T (12 axes) + CM-550 + LiPo 11.1 V 1300 mAh, XL-320D = head
 * dummy (no ID). Modules: ID 1·2 and 3·4 shoulders, 5·6 and 7·8 hips,
 * 9·10 and 11·12 at the ANKLES (bottom of the parallel-link legs). Driving the
 * shin from the ankle module is kinematically the same as a knee joint here,
 * because the parallel links keep the foot level with the body; only the mass
 * sits low (in the foot). Lengths/masses are still estimates (settings).
 *
 * Parallel-link legs are modelled with two passive joints per leg tied by
 * equality constraints:  knee_comp = -hip_pitch,  ankle_comp = -knee_pitch,
 * so the foot keeps the torso's pitch whatever the hip and knee do.
 *
 * Coordinates: x forward, y to the robot's left, z up. Metres, kilograms.
 */

export const MAXE1_DEFAULT = {
    // lengths (m) — from the ROBOTIS STEP drawings (sim/cad-measurements.json):
    // EF25-F11/F12 leg links 60 mm hole to hole, EF25-F15 foot 102 × 64 × 8 mm, EF25-F2 torso 108 mm
    footLength: 0.102, footWidth: 0.064, footThick: 0.008,
    ankleHeight: 0.03, // ankle roll axis above the sole
    shin: 0.06, thigh: 0.06, hipOffset: 0.025, // hip roll → hip pitch
    legSpacing: 0.07, // between the two hip roll axes
    torsoWidth: 0.108, torsoDepth: 0.06, torsoHeight: 0.14,
    shoulderWidth: 0.15, arm: 0.14, headRadius: 0.03,
    // masses (kg) — 2XL430 98 g each; frames from STEP volumes × 1.15 g/cm³; CM-550 + LiPo 1300 mAh ≈ 0.17 kg;
    // total ≈ 1.2 kg (torso holds CM-550, battery, 2 shoulder modules, head)
    torsoMass: 0.53, headMass: 0.03, armMass: 0.03,
    hipMass: 0.12, thighMass: 0.02, shinMass: 0.02, footMass: 0.14, // ankle module (98 g) sits in the foot
    // 2XL430-W250 as a position servo
    kp: 6.0, maxTorque: 1.4, damping: 0.06, armature: 0.006,
    friction: 1.0
};

/**
 * Which DYNAMIXEL ID drives which joint, the direction (sign) and the angle
 * (degrees) that means "straight" for that joint. Consecutive IDs share one
 * 2XL430 module. Module positions match the manual (p.4, p.39); which axis of
 * a module (A = odd, B = even) is pitch vs roll, and the directions, still need
 * a check on the real robot (3D 탭 > 로봇 설정).
 */
export const MAXE1_JOINT_MAP = [
    {id: 1, joint: 'R_shoulder_pitch', name: '오른팔 앞뒤', sign: 1, center: 180},
    {id: 2, joint: 'R_shoulder_roll', name: '오른팔 옆', sign: 1, center: 180},
    {id: 3, joint: 'L_shoulder_pitch', name: '왼팔 앞뒤', sign: -1, center: 180},
    {id: 4, joint: 'L_shoulder_roll', name: '왼팔 옆', sign: -1, center: 180},
    {id: 5, joint: 'R_hip_roll', name: '오른쪽 엉덩이 옆', sign: 1, center: 180},
    {id: 6, joint: 'R_hip_pitch', name: '오른쪽 엉덩이 앞뒤', sign: 1, center: 180},
    {id: 7, joint: 'L_hip_roll', name: '왼쪽 엉덩이 옆', sign: -1, center: 180},
    {id: 8, joint: 'L_hip_pitch', name: '왼쪽 엉덩이 앞뒤', sign: -1, center: 180},
    {id: 9, joint: 'R_knee', name: '오른쪽 발목 앞뒤 (무릎 굽힘)', sign: 1, center: 180},
    {id: 10, joint: 'R_ankle_roll', name: '오른쪽 발목 옆', sign: 1, center: 180},
    {id: 11, joint: 'L_knee', name: '왼쪽 발목 앞뒤 (무릎 굽힘)', sign: -1, center: 180},
    {id: 12, joint: 'L_ankle_roll', name: '왼쪽 발목 옆', sign: -1, center: 180}
];

export const ACTUATED = MAXE1_JOINT_MAP.map(j => j.joint);

const f = v => Number(v.toFixed(4));
/** solid box inertia about its centre (x = depth, y = width, z = height) */
const boxInertia = (m, x, y, z) => [(y * y) + (z * z), (x * x) + (z * z), (x * x) + (y * y)]
    .map(v => Number((m * v / 12).toExponential(3))).join(' ');
const v3 = (x, y, z) => `${f(x)} ${f(y)} ${f(z)}`;

/** Height of the hip roll axes above the floor when the legs are straight. */
export const hipHeight = p => p.ankleHeight + p.shin + p.thigh + p.hipOffset;

export const buildMJCF = (params = {}) => {
    const p = Object.assign({}, MAXE1_DEFAULT, params);
    const hipZ = hipHeight(p);
    const torsoZ = hipZ + 0.005 + (p.torsoHeight / 2);
    const jointAttrs = `damping="${p.damping}" armature="${p.armature}"`;
    const leg = (s, y) => `
      <body name="${s}_hip" pos="${v3(0, y, -(p.torsoHeight / 2) - 0.005)}">
        <joint name="${s}_hip_roll" axis="1 0 0" range="-0.6 0.6" ${jointAttrs}/>
        <inertial pos="0 0 -0.012" mass="${p.hipMass}" diaginertia="2e-5 2e-5 2e-5"/>
        <geom type="box" size="0.018 0.018 0.015" pos="0 0 -0.012" rgba="0.15 0.15 0.17 1"/>
        <body name="${s}_thigh" pos="0 0 ${f(-p.hipOffset)}">
          <joint name="${s}_hip_pitch" axis="0 1 0" range="-1.6 1.6" ${jointAttrs}/>
          <inertial pos="0 0 ${f(-p.thigh / 2)}" mass="${p.thighMass}" diaginertia="2e-5 2e-5 5e-6"/>
          <geom type="capsule" fromto="0 0 0 0 0 ${f(-p.thigh)}" size="0.012" rgba="0.2 0.2 0.22 1"/>
          <body name="${s}_knee_frame" pos="0 0 ${f(-p.thigh)}">
            <joint name="${s}_knee_comp" axis="0 1 0" range="-1.7 1.7" damping="0.005"/>
            <inertial pos="0 0 0" mass="0.001" diaginertia="1e-7 1e-7 1e-7"/>
            <body name="${s}_shin">
              <joint name="${s}_knee" axis="0 1 0" range="-1.6 1.6" ${jointAttrs}/>
              <inertial pos="0 0 ${f(-p.shin / 2)}" mass="${p.shinMass}" diaginertia="4e-5 4e-5 1e-5"/>
              <geom type="box" size="0.018 0.02 ${f(p.shin / 2)}" pos="0 0 ${f(-p.shin / 2)}" rgba="0.12 0.12 0.14 1"/>
              <body name="${s}_ankle_frame" pos="0 0 ${f(-p.shin)}">
                <joint name="${s}_ankle_comp" axis="0 1 0" range="-1.7 1.7" damping="0.005"/>
                <inertial pos="0 0 0" mass="0.001" diaginertia="1e-7 1e-7 1e-7"/>
                <body name="${s}_foot">
                  <joint name="${s}_ankle_roll" axis="1 0 0" range="-0.6 0.6" ${jointAttrs}/>
                  <inertial pos="0.005 0 ${f(-p.ankleHeight + (p.footThick / 2))}" mass="${p.footMass}" diaginertia="1e-5 3e-5 3e-5"/>
                  <geom name="${s}_sole" type="box" size="${v3(p.footLength / 2, p.footWidth / 2, p.footThick / 2)}"
                        pos="${v3(0.005, 0, -p.ankleHeight + (p.footThick / 2))}" rgba="0.18 0.42 0.75 1" friction="${p.friction} 0.02 0.002"/>
                  <site name="${s}_foot_site" pos="${v3(0.005, 0, -p.ankleHeight)}" size="0.004"/>
                </body>
              </body>
            </body>
          </body>
        </body>
      </body>`;
    const arm = (s, y, out) => `
      <body name="${s}_shoulder" pos="${v3(0, y, (p.torsoHeight / 2) - 0.02)}">
        <joint name="${s}_shoulder_pitch" axis="0 1 0" range="-3.1 3.1" ${jointAttrs}/>
        <inertial pos="0 0 0" mass="0.01" diaginertia="1e-6 1e-6 1e-6"/>
        <body name="${s}_arm">
          <joint name="${s}_shoulder_roll" axis="1 0 0" range="-1.7 1.7" ${jointAttrs}/>
          <inertial pos="0 ${f(out * 0.01)} ${f(-p.arm / 2)}" mass="${p.armMass}" diaginertia="8e-5 8e-5 1e-5"/>
          <geom type="capsule" fromto="0 ${f(out * 0.01)} 0 0 ${f(out * 0.01)} ${f(-p.arm)}" size="0.013" rgba="0.2 0.2 0.22 1"/>
        </body>
      </body>`;
    const eq = s => `
    <joint joint1="${s}_knee_comp" joint2="${s}_hip_pitch" polycoef="0 -1 0 0 0" solref="0.004 1"/>
    <joint joint1="${s}_ankle_comp" joint2="${s}_knee" polycoef="0 -1 0 0 0" solref="0.004 1"/>`;
    const act = j => `
    <position name="${j}" joint="${j}" kp="${p.kp}" forcerange="${-p.maxTorque} ${p.maxTorque}" ctrlrange="-3.14 3.14"/>`;
    return `<mujoco model="MAX-E1 (approx)">
  <compiler angle="radian" autolimits="true"/>
  <option timestep="0.002" integrator="implicitfast"/>
  <default>
    <geom contype="1" conaffinity="0" condim="3" friction="${p.friction} 0.02 0.002"/>
  </default>
  <visual><global offwidth="640" offheight="480"/></visual>
  <worldbody>
    <light pos="0 0 2" dir="0 0 -1" directional="true"/>
    <geom name="floor" type="plane" size="3 3 0.05" contype="0" conaffinity="1" rgba="0.9 0.92 0.95 1"/>
    <body name="torso" pos="0 0 ${f(torsoZ)}">
      <freejoint name="root"/>
      <inertial pos="0 0 0" mass="${p.torsoMass}" diaginertia="${boxInertia(p.torsoMass, p.torsoDepth, p.torsoWidth, p.torsoHeight)}"/>
      <geom name="torso" type="box" size="${v3(p.torsoDepth / 2, p.torsoWidth / 2, p.torsoHeight / 2)}" rgba="0.18 0.42 0.75 1"/>
      <geom name="head" type="sphere" size="${p.headRadius}" pos="${v3(0, 0, (p.torsoHeight / 2) + p.headRadius + 0.005)}"
            mass="${p.headMass}" rgba="0.95 0.95 0.97 1"/>
      <site name="imu" pos="0 0 0" size="0.005"/>${arm('R', -p.shoulderWidth / 2, -1)}${arm('L', p.shoulderWidth / 2, 1)}${leg('R', -p.legSpacing / 2)}${leg('L', p.legSpacing / 2)}
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
