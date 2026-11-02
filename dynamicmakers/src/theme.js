/**
 * Dynamic Makers colour theme for scratch-blocks.
 * Core Scratch categories keep their familiar colours so students who know
 * Scratch feel at home; robot categories use the RoboMakers brand blue and
 * companion colours.
 */
export const BRAND = '#2E6ABF';

const style = (primary, secondary, tertiary) => ({
    colourPrimary: primary,
    colourSecondary: secondary,
    colourTertiary: tertiary,
    colourQuaternary: tertiary
});

// Robot block groups (cm550 extension opcodes are re-styled into these).
export const ROBOT_STYLES = {
    db_dxl: style('#2E6ABF', '#2759A3', '#1F4A8A'), // 다이나믹셀 — brand blue
    db_controller: style('#0FA3A3', '#0D8F8F', '#0A7A7A'), // 컨트롤러
    db_port: style('#E5739B', '#DB5C88', '#C94A76'), // 센서·포트
    db_motion: style('#7E57D9', '#6E48C7', '#5E3BB0'), // 모션
    db_advanced: style('#5E6E87', '#516078', '#435168'), // 고급
    db_mymotors: style('#1C8FB8', '#187CA0', '#136786') // 연결된 모터 (model-specific)
};

export const blockColors = {
    motion: style('#4C97FF', '#4280D7', '#3373CC'),
    looks: style('#8A94A8', '#7B8599', '#6B7589'), // used for 출력(말하기) blocks
    sounds: style('#CF63CF', '#C94FC9', '#BD42BD'),
    control: style('#FFAB19', '#EC9C13', '#CF8B17'),
    event: style('#FFBF00', '#E6AC00', '#CC9900'),
    sensing: style('#5CB1D6', '#47A8D1', '#2E8EB8'),
    pen: style('#0FBD8C', '#0DA57A', '#0B8E69'),
    operators: style('#59C059', '#46B946', '#389438'),
    data: style('#FF8C1A', '#FF8000', '#DB6E00'),
    data_lists: style('#FF661A', '#FF5500', '#E64D00'),
    more: style('#FF6680', '#FF4D6A', '#FF3355'),
    ...ROBOT_STYLES,
    text: '#FFFFFF',
    workspace: '#F7F9FC',
    toolboxHover: BRAND,
    toolboxSelected: '#E8EEF8',
    toolboxText: '#4A5468',
    toolbox: '#FFFFFF',
    flyout: '#F1F4F9',
    scrollbar: '#CED6E2',
    scrollbarHover: '#B8C2D2',
    textField: '#FFFFFF',
    textFieldText: '#4A5468',
    insertionMarker: '#000000',
    insertionMarkerOpacity: 0.2,
    dragShadowOpacity: 0.6,
    stackGlow: '#FFF200',
    stackGlowSize: 4,
    stackGlowOpacity: 1,
    replacementGlow: '#FFFFFF',
    replacementGlowSize: 2,
    replacementGlowOpacity: 1,
    colourPickerStroke: '#FFFFFF',
    fieldShadow: 'rgba(255, 255, 255, 0.3)',
    dropDownShadow: 'rgba(0, 0, 0, .3)',
    numPadBackground: '#547AB2',
    numPadBorder: '#435F91',
    numPadActiveBackground: '#435F91',
    numPadText: 'white',
    valueReportBackground: '#FFFFFF',
    valueReportBorder: '#AAAAAA',
    menuHover: 'rgba(0, 0, 0, 0.2)'
};
