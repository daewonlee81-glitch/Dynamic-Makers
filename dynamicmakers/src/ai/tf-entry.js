/**
 * Separate bundle (dist/dm-ai.js): TensorFlow.js + the embedded MobileNet
 * feature extractor. Loaded only when the camera is used for AI 학습, so the
 * editor itself stays light. Works offline (no model download).
 */
import * as tf from '@tensorflow/tfjs-core';
import {loadLayersModel} from '@tensorflow/tfjs-layers';
import {loadGraphModel} from '@tensorflow/tfjs-converter';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import {MOBILENET} from './mobilenet-data';

const b64ToBuffer = b64 => {
    const raw = atob(b64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
};

let backendReady = null;
const ensureBackend = () => {
    if (!backendReady) {
        backendReady = (async () => {
            try {
                if (!(await tf.setBackend('webgl'))) throw new Error('no webgl');
            } catch (e) {
                await tf.setBackend('cpu');
            }
            await tf.ready();
        })();
    }
    return backendReady;
};

/** The pose model lives in its own file (dm-pose.js, 6 MB) and loads only when needed. */
const loadPoseScript = () => new Promise((resolve, reject) => {
    if (window.DMAI_POSE_MODEL) return resolve(window.DMAI_POSE_MODEL);
    const s = document.createElement('script');
    s.src = 'dm-pose.js';
    s.onload = () => (window.DMAI_POSE_MODEL ? resolve(window.DMAI_POSE_MODEL) :
        reject(new Error('스켈레톤 모델을 불러오지 못했습니다.')));
    s.onerror = () => reject(new Error('스켈레톤 모델(dm-pose.js)을 불러오지 못했습니다.'));
    document.head.append(s);
});

const loadMoveNet = async () => {
    await ensureBackend();
    const art = await loadPoseScript();
    const model = await loadGraphModel(tf.io.fromMemory(Object.assign({}, art, {
        weightData: b64ToBuffer(art.weightData).buffer
    })));
    window.DMAI_POSE_MODEL = null; // free the 6 MB text
    return model;
};

const loadMobilenet = async () => {
    await ensureBackend();
    const bytes = b64ToBuffer(MOBILENET.weightData);
    return loadLayersModel(tf.io.fromMemory({
        modelTopology: MOBILENET.modelTopology,
        weightSpecs: MOBILENET.weightSpecs,
        weightData: bytes.buffer
    }));
};

window.DMAI_TF = {tf, loadMobilenet, loadMoveNet};
