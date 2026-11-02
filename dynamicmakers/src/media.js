/**
 * scratch-blocks builds icon URLs as `${media}${file}`. We give it a fake
 * prefix and swap matching image hrefs for embedded data: URIs as soon as the
 * elements appear, so no image files have to be served.
 */
import {MEDIA} from './generated/media';

export const MEDIA_PREFIX = 'dm-media/';
const XLINK = 'http://www.w3.org/1999/xlink';

const fix = el => {
    for (const attr of ['href', 'xlink:href', 'src']) {
        const v = el.getAttribute && el.getAttribute(attr);
        if (v && v.startsWith(MEDIA_PREFIX)) {
            const data = MEDIA[v.slice(MEDIA_PREFIX.length)];
            if (!data) continue;
            if (attr === 'xlink:href') el.setAttributeNS(XLINK, 'xlink:href', data);
            else el.setAttribute(attr, data);
        }
    }
};

export const installMediaRewriter = () => {
    const scan = root => {
        if (root.nodeType !== 1) return;
        fix(root);
        if (root.querySelectorAll) root.querySelectorAll('image, img').forEach(fix);
    };
    new MutationObserver(records => {
        for (const r of records) {
            if (r.type === 'attributes') fix(r.target);
            else r.addedNodes.forEach(scan);
        }
    }).observe(document.documentElement, {
        subtree: true, childList: true, attributes: true, attributeFilter: ['href', 'xlink:href', 'src']
    });
    scan(document.documentElement);
};
