/**
 * Robot poses taught by hand. A pose is {id: degrees}; in a project it is kept
 * as one text item of the list "로봇 자세", e.g. "1:180 2:175.5 3:92.3", so it
 * is saved with the program and students can see (and even edit) the numbers.
 */

const POSE_LIST_NAME = '로봇 자세';
const POSE_LIST_ID = 'dm-robot-poses';

const encodePose = pose => Object.keys(pose)
    .map(Number)
    .sort((a, b) => a - b)
    .map(id => `${id}:${Math.round(Number(pose[id]) * 10) / 10}`)
    .join(' ');

/** Tolerant of commas, extra spaces and "id=deg". Returns {} for empty text. */
const decodePose = text => {
    const pose = {};
    String(text || '').split(/[\s,;]+/).forEach(part => {
        const m = /^(\d{1,3})[:=](-?\d+(?:\.\d+)?)$/.exec(part.trim());
        if (m) pose[Number(m[1])] = Number(m[2]);
    });
    return pose;
};

const poseSize = pose => Object.keys(pose).length;

module.exports = {POSE_LIST_NAME, POSE_LIST_ID, encodePose, decodePose, poseSize};
