/**
 * Separate bundle (dist/dm-sim.js): MuJoCo (WebAssembly) + three.js + the
 * MAX-E1 world. Loaded only when the 3D tab is opened.
 */
import {loadMujoco, PhysicsSim} from './physics';
import {SimView} from './view';

window.DMSIM = {loadMujoco, PhysicsSim, SimView};
