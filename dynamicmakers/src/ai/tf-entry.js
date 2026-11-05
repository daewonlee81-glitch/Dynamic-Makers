/**
 * Separate bundle (dist/dm-ai.js): TensorFlow.js + the embedded MobileNet
 * feature extractor. Loaded only when the camera is used for AI 학습, so the
 * editor itself stays light. Works offline (no model download).
 */
import * as tf from '@tensorflow/tfjs-core';
import {loadLayersModel} from '@tensorflow/tfjs-layers';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
import {MOBILENET} from './mobilenet-data';

const loadMobilenet = async () => {
    try {
        await tf.setBackend('webgl');
    } catch (e) {
        await tf.setBackend('cpu');
    }
    await tf.ready();
    const raw = atob(MOBILENET.weightData);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return loadLayersModel(tf.io.fromMemory({
        modelTopology: MOBILENET.modelTopology,
        weightSpecs: MOBILENET.weightSpecs,
        weightData: bytes.buffer
    }));
};

window.DMAI_TF = {tf, loadMobilenet};
