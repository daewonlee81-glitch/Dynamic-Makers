/** URL of a file next to index.html, with its content hash (dist/index.html sets DM_ASSETS) so new releases are not cached. */
export const assetUrl = name => {
    const v = window.DM_ASSETS && window.DM_ASSETS[name];
    return v ? `${name}?v=${v}` : name;
};
