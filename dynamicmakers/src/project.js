/**
 * Project helpers: empty project, file open/save, browser auto-save.
 * File format (.dmk; .json in the web preview) = Scratch 3 project.json text, so programs stay
 * compatible with the scratch-vm loader (and .sb3 files can be opened).
 */
const AUTOSAVE_KEY = 'dynamicmakers.autosave.v1';

// Costume metadata only; Dynamic Makers has no stage, so assets are never fetched.
const COSTUME = {
    name: 'robot', bitmapResolution: 1, dataFormat: 'svg', assetId: 'cd21514d0531fdffb22204e0ec5ed84a',
    md5ext: 'cd21514d0531fdffb22204e0ec5ed84a.svg', rotationCenterX: 0, rotationCenterY: 0
};

export const emptyProject = () => ({
    targets: [
        {
            isStage: true, name: 'Stage', variables: {}, lists: {}, broadcasts: {}, blocks: {}, comments: {},
            currentCostume: 0, costumes: [Object.assign({}, COSTUME, {name: 'backdrop'})], sounds: [], volume: 100,
            layerOrder: 0, tempo: 60, videoTransparency: 50, videoState: 'off', textToSpeechLanguage: null
        },
        {
            isStage: false, name: '로봇', variables: {}, lists: {}, broadcasts: {}, comments: {},
            blocks: {
                start: {opcode: 'event_whenflagclicked', next: null, parent: null, inputs: {}, fields: {},
                    shadow: false, topLevel: true, x: 60, y: 60}
            },
            currentCostume: 0, costumes: [COSTUME], sounds: [], volume: 100, layerOrder: 1, visible: false,
            x: 0, y: 0, size: 100, direction: 90, draggable: false, rotationStyle: 'all around'
        }
    ],
    monitors: [],
    extensions: ['cm550'],
    meta: {semver: '3.0.0', vm: '0.2.0', agent: 'Dynamic Makers'}
});

export const loadAutosave = () => {
    try {
        const raw = window.localStorage.getItem(AUTOSAVE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
};

export const saveAutosave = (name, projectJSON) => {
    try {
        window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({name, project: projectJSON, savedAt: Date.now()}));
        return true;
    } catch (e) {
        return false;
    }
};

export const download = (filename, content, type) => {
    const blob = new Blob([content], {type});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.append(a);
    a.click();
    // keep the anchor alive until the browser has picked up the file name
    setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(a.href);
    }, 1500);
};

export const safeFileName = name => (String(name || '').trim()
    .replace(/[\\/:*?"<>|]+/g, '_') || '다이나믹 메이커스');

/** Ask the user for a file; resolves {name, data} where data is ArrayBuffer (sb3) or string (dbx/json). */
export const pickFile = () => new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.dmk,.dbx,.sb3,.json';
    input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) return resolve(null);
        const reader = new FileReader();
        const isZip = /\.sb3$/i.test(file.name);
        reader.onload = () => resolve({name: file.name.replace(/\.(dmk|dbx|sb3|json)$/i, ''), data: reader.result});
        if (isZip) reader.readAsArrayBuffer(file);
        else reader.readAsText(file);
    });
    input.click();
});
