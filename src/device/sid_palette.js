/*
 * SID SYNTH panel palette: the single source of truth for every colour on the
 * panel. ES5, because it runs both in Node (the build colours the patch) and
 * in Max's classic js object (the build prepends it to sid_ui_logic.js, which
 * recolours muted controls at run time).
 *
 * Colours are set directly on every object rather than taken from Live's
 * theme, so the device looks the same in every Live theme.
 *
 * A muted or locked control is drawn as the whole control at 35% opacity over
 * its cell. That is computed here per colour, so the device never relies on
 * Live's `active 0` compositing, which blends against the wrong surface.
 */
var SID_PALETTE = (function () {
    var HEX = {
        gutter: '#383838',
        cell: '#6B6B6B',
        display: '#565656',
        divider: '#616161',
        dividerDisplay: '#4B4B4B',
        field: '#2E2E2E',
        off: '#5B5B5B',
        offDisplay: '#474747',
        accent: '#FF9C39',
        onText: '#161616',
        track: '#3C3C3C',
        trackDisplay: '#353535',
        title: '#F6F6F6',
        label: '#E4E4E4',
        value: '#F7F7F7',
        sub: '#E2E2E2',
        focus: '#E8E8E8',
        graph: '#00BCCC',
        arc: '#00BCCC',
        zeroLine: '#3E3E3E',
        graphHandle: '#F0F0F0',
        dotOff: '#454545',
        dotOffOnAccent: '#C77A2C'
    };
    var MUTED_ALPHA = 0.35;

    function hex(h) {
        var v = parseInt(h.replace('#', ''), 16);
        return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255, 1];
    }
    function mix(fg, bg, a) {
        return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1];
    }
    function round(c) {
        return [Math.round(c[0] * 1e6) / 1e6, Math.round(c[1] * 1e6) / 1e6, Math.round(c[2] * 1e6) / 1e6, c[3]];
    }
    function color(name) { return hex(HEX[name]); }

    // The display (OSCILLATOR/PWM) cell spans x 208..331.
    function isDisplayRect(rect) {
        return !!(rect && rect[0] >= 208 && rect[0] < 332);
    }

    var SECTION_TOGGLES = { sid_vib_on: 1, sid_trem_on: 1, sid_pwm_on: 1, sid_fenv_on: 1, sid_motion_on: 1 };
    var CAPTIONS = { lbl_arpeggio: 1 };
    // Momentary buttons: Live draws these live.text objects as pills, so the
    // button is transparent and a square panel (btnbg_*) draws its fill.
    var GHOST_BUTTONS = { sid_prev: 1, sid_next: 1, sid_save_patch: 1, sid_cancel: 1, sid_resend: 1, sid_panic: 1, sid_random: 1, sid_bank_folder: 1, icon_sid_bank_folder: 1 };

    function roleOf(maxclass, varname) {
        var v = varname || '';
        switch (maxclass) {
            case 'live.dial': return 'dial';
            case 'live.numbox': return 'numbox';
            case 'live.menu': return 'menu';
            case 'live.tab': return 'tab';
            case 'live.adsrui': return 'adsr';
            case 'multislider': return 'steps';
            case 'panel':
                if (v === 'step_zero') return 'stepZero';
                return null;
            case 'textedit': return 'textedit';
            case 'live.comment':
                if (CAPTIONS[v]) return 'caption';
                if (v.indexOf('title_') >= 0 || v === 'lbl_fenv_title' || v === 'lbl_motion_title' ||
                    v === 'lbl_expression_title') return 'title';
                return 'label';
            case 'live.text':
                if (v.indexOf('info_') === 0) return null; // invisible help zones keep their clear colours
                if (SECTION_TOGGLES[v]) return 'square';
                if (GHOST_BUTTONS[v]) return 'ghost';
                return 'button';
        }
        return null;
    }

    // Returns {attribute: [r,g,b,a]} for a role, on the normal or display
    // surface, active or muted. Every colour attribute the object uses is set,
    // so switching between states never leaves a stale colour behind.
    function style(role, display, muted) {
        var surface = color(display ? 'display' : 'cell');
        function m(name) { var c = color(name); return round(muted ? mix(c, surface, MUTED_ALPHA) : c); }
        var field = m('field'), value = m('value'), off = m(display ? 'offDisplay' : 'off');
        var accent = m('accent'), onText = m('onText'), sub = m('sub');
        var focus = round(color('focus')), surf = round(surface);
        switch (role) {
            case 'dial':
                var track = m(display ? 'trackDisplay' : 'track');
                return {
                    // Value arcs use the mock's teal, so orange means only "selected / on".
                    activedialcolor: m('arc'), dialcolor: m('arc'),
                    activefgdialcolor: track, fgdialcolor: track,
                    activeneedlecolor: value, needlecolor: value,
                    textcolor: m('label'), panelcolor: surf, focusbordercolor: surf
                };
            case 'numbox':
                var bar = field;
                return {
                    activebgcolor: field, bgcolor: field,
                    activeslidercolor: bar, slidercolor: bar,
                    bordercolor: field, focusbordercolor: focus,
                    textcolor: value, lcdcolor: value, lcdbgcolor: field, inactivelcdcolor: value,
                    tricolor: value, tricolor2: value, activetricolor: value, activetricolor2: value
                };
            case 'menu':
                return {
                    activebgcolor: field, bgcolor: field,
                    bordercolor: field, focusbordercolor: focus,
                    textcolor: value, tricolor: value, activetricolor: value,
                    lcdcolor: value, lcdbgcolor: field, inactivelcdcolor: value,
                    hltcolor: round(color('accent')), hlttextcolor: round(color('onText'))
                };
            case 'tab':
            case 'button':
                return {
                    bgcolor: off, activebgcolor: off,
                    bgoncolor: accent, activebgoncolor: accent,
                    textcolor: sub, activetextcolor: sub, textoffcolor: sub,
                    textoncolor: onText, activetextoncolor: onText,
                    bordercolor: off, focusbordercolor: off
                };
            case 'ghost':
                var clear = [0, 0, 0, 0];
                return {
                    bgcolor: clear, activebgcolor: clear, bgoncolor: clear, activebgoncolor: clear,
                    textcolor: sub, activetextcolor: sub, textoffcolor: sub,
                    textoncolor: accent, activetextoncolor: accent,
                    bordercolor: clear, focusbordercolor: clear
                };
            case 'square':
                return {
                    bgcolor: field, activebgcolor: field,
                    bgoncolor: accent, activebgoncolor: accent,
                    bordercolor: field, focusbordercolor: field
                };
            case 'label':
                return { textcolor: m('label') };
            case 'caption':
            case 'title':
                return { textcolor: m('title') };
            case 'adsr':
                return {
                    bgcolor: field, activebgcolor: field,
                    linecolor: m('graph'), activelinecolor: m('graph'),
                    handlecolor: m('graphHandle'), activehandlecolor: m('graphHandle'),
                    activehovercolor: accent
                };
            case 'stepZero':
                return { bgfillcolor: m('zeroLine'), bordercolor: m('zeroLine') };
            case 'steps':
                return { slidercolor: m('graph'), bgcolor: field, bordercolor: field };
            case 'textedit':
                return { bgcolor: field, textcolor: value, bordercolor: field, focusbordercolor: focus };
        }
        return {};
    }

    return {
        HEX: HEX, hex: hex, mix: mix, color: function (n) { return round(color(n)); },
        roleOf: roleOf, style: style, isDisplayRect: isDisplayRect, MUTED_ALPHA: MUTED_ALPHA
    };
})();
if (typeof module !== 'undefined') module.exports = SID_PALETTE;
