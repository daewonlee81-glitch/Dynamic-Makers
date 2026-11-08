/* Simple original icons (SVG data URIs) for the CM-550 category. */
const svgToUri = svg => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const controllerSvg = (bg, fg) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect x="4" y="6" width="32" height="28" rx="5" fill="${bg}" stroke="${fg}" stroke-width="2"/>
  <circle cx="14" cy="16" r="3" fill="${fg}"/>
  <circle cx="26" cy="16" r="3" fill="${fg}"/>
  <rect x="11" y="23" width="18" height="4" rx="2" fill="${fg}"/>
  <rect x="17" y="2" width="6" height="4" rx="1" fill="${fg}"/>
</svg>`;

module.exports = {
    blockIconURI: svgToUri(controllerSvg('#2E7CF6', '#ffffff')),
    menuIconURI: svgToUri(controllerSvg('#ffffff', '#2E7CF6'))
};
