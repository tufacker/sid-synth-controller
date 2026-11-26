/*
 * SID SYNTH panel logic (Max classic js). Presentation only: it sends no MIDI.
 *
 * It mutes controls that do nothing in the current mode, lights the page dots,
 * the Step Mod playhead and length masks, the EDITED marker and button presses,
 * and swaps the buttons for save mode. The build prepends sid_palette.js, so
 * every colour comes from SID_PALETTE.
 *
 *   lock = muted and not clickable (the setting does nothing in this mode)
 *   fade = muted but still editable (its section is switched off)
 *
 * Messages in: <state key> <value> (see S), page, playhead, slot, savemode,
 * dirty, press <button>, and bang (read every state from the panel).
 */
autowatch = 1;
inlets = 1;
outlets = 0;

var S = { mode:1, ringm:0, pwm:0, vib:0, trem:0, fenv:0, motion:0, ftype:0, vel:0, press:0, page:0, porta:0, len:8, playhead:-1, wheel:0, bend:0, key:0, velenv:0 };
var STEPS = 16; // Step Mod steps
var savedWave = null;
// Controls report their values while the device loads; those are not edits.
var dirtyReadyAt = new Date().getTime() + 2500;
var roleCache = {};

function stepNames(prefix) {
    var out = [], i;
    for (i = 1; i <= STEPS; i++) out.push(prefix + i);
    return out;
}

var LOCK = {
    // Dir only applies to the arpeggiator (manual: greyed outside ARP/ARP+).
    notArp:['sid_arp_dir','lbl_arpeggio','lbl_dir'],
    // Portamento is locked in ARP/ARP+ on the C64.
    arp:['sid_mode_porta'],
    // Envelope Retrig has no effect in POLY, ARP or ARP+ (manual, Envelope and Retrig).
    noEnvRetrig:['sid_env_retrig','lbl_env_retrig'],
    // Speed is shared: arpeggio rate in ARP/ARP+, glide rate for Portamento
    // in every other mode. Outside ARP with PORTA off the C64 greys it and
    // ignores it, so it is locked too.
    speedIdle:['sid_arp_speed','lbl_arp_speed'],
    ringm:['sid_wave_pulse','sid_wave_saw','sid_wave_tri','sid_wave_noise']
};
var FADE = {
    pwmOff:['sid_pwm_width','sid_pwm_rate','sid_pwm_depth','sid_pwm_cycle','sid_pwm_retrig',
        'lbl_pwm_rate','lbl_pwm_depth','lbl_pwm_cycle','lbl_pwm_retrig'],
    vibOff:['sid_vib_freq','sid_vib_rate','sid_vib_delay','sid_vib_type','sid_vib_retrig',
        'lbl_vib_freq','lbl_vib_rate','lbl_vib_delay','lbl_vib_type','lbl_vib_retrig'],
    tremOff:['sid_trem_rate','lbl_trem_rate'],
    fenvOff:['sid_fenv_shape','sid_fenv_amt','sid_fenv_atk','sid_fenv_dec','sid_fenv_sus','sid_fenv_rel'],
    motionOff:['sid_motion_target','sid_motion_division','sid_motion_length','sid_motion_amount','sid_motion_steps',
        'sid_motion_smooth','lbl_motion_smooth',
        'lbl_motion_target','lbl_motion_division','lbl_motion_length','lbl_motion_amount']
        .concat(stepNames('lbl_motion_index_')).concat(stepNames('lbl_motion_value_'))
        .concat(['step_zero']),
    filterOff:['sid_filter_cutoff','sid_filter_reso','sid_filter_rate','sid_filter_cycle','sid_filter_retrig',
        'lbl_filter_rate','lbl_filter_cycle','lbl_filter_retrig'],
    // An expression Amount does nothing while its source has no target
    // (Wheel on VIBRATO plays SID SYNTH's own wheel vibrato instead).
    velIdle:['sid_velocity_amount'],
    pressIdle:['sid_pressure_amount'],
    wheelNative:['sid_wheel_amount'],
    bendIdle:['sid_bend_amount'],
    keyIdle:['sid_key_amount']
};

function conditions() {
    return {
        notArp:!(S.mode === 0 || S.mode === 6),
        arp:(S.mode === 0 || S.mode === 6),
        noEnvRetrig:(S.mode === 0 || S.mode === 1 || S.mode === 6),
        speedIdle:!(S.mode === 0 || S.mode === 6) && !S.porta,
        ringm:!!S.ringm,
        pwmOff:!S.pwm,
        vibOff:!S.vib,
        tremOff:!S.trem,
        fenvOff:!S.fenv,
        motionOff:!S.motion,
        filterOff:S.ftype === 0,
        velIdle:S.vel === 0,
        pressIdle:S.press === 0,
        wheelNative:S.wheel === 0,
        bendIdle:S.bend === 0,
        keyIdle:S.key === 0
    };
}

function obj(name) {
    var o = this.patcher.getnamed(name);
    if (!o) post('sid_ui_logic: no object named ' + name + '\n');
    return o;
}

function roleInfo(name, o) {
    if (!roleCache[name]) {
        roleCache[name] = {
            role:SID_PALETTE.roleOf(o.maxclass, name),
            display:SID_PALETTE.isDisplayRect(o.getattr('presentation_rect') || o.rect)
        };
    }
    return roleCache[name];
}

function paint(name, o, muted) {
    var info = roleInfo(name, o), map, attr, c;
    if (!info.role) return;
    map = SID_PALETTE.style(info.role, info.display, muted);
    for (attr in map) {
        c = map[attr];
        o.message(attr, c[0], c[1], c[2], c[3]);
    }
}

function apply() {
    var c = conditions(), state = {}, k, i, n, o, s;
    for (k in LOCK) for (i = 0; i < LOCK[k].length; i++) {
        n = LOCK[k][i]; state[n] = state[n] || {lock:false, fade:false}; if (c[k]) state[n].lock = true;
    }
    for (k in FADE) for (i = 0; i < FADE[k].length; i++) {
        n = FADE[k][i]; state[n] = state[n] || {lock:false, fade:false}; if (c[k]) state[n].fade = true;
    }
    for (n in state) {
        o = obj(n); if (!o) continue; s = state[n];
        // Labels and overlay panels never take clicks; leave their ignoreclick alone.
        if (o.maxclass !== 'live.comment' && o.maxclass !== 'panel') o.message('ignoreclick', s.lock ? 1 : 0);
        paint(n, o, s.lock || s.fade);
    }
}

// ENV / MOTION / EXPR status dots (panels). On a grey tab: orange when that
// page's feature is active, dark when not. On the selected orange tab: ink
// when active, a darker orange when not.
var DOTS = ['dot_fenv','dot_motion','dot_expression'];
function paintDots() {
    var active = [!!S.fenv, !!S.motion,
        (S.vel > 0) || (S.press > 0) || (S.wheel > 0) || (S.bend > 0) || (S.key > 0) || (S.velenv > 0)], i, o, c, name;
    for (i = 0; i < DOTS.length; i++) {
        o = obj(DOTS[i]); if (!o) continue;
        if (S.page === i) name = active[i] ? 'onText' : 'dotOffOnAccent';
        else name = active[i] ? 'accent' : 'dotOff';
        c = SID_PALETTE.color(name);
        o.message('bgfillcolor', c[0], c[1], c[2], c[3]);
    }
}

// Step bars: darken the steps beyond Len so the pattern length is visible.
function paintStepMasks() {
    var field = SID_PALETTE.color('field'), i, o, a;
    for (i = 1; i <= STEPS; i++) {
        o = obj('step_mask_' + i); if (!o) continue;
        a = i > S.len ? 0.62 : 0;
        o.message('bgfillcolor', field[0], field[1], field[2], a);
    }
}

// Step Mod playhead: the current step's number turns orange and a 2 px
// bar lights above its column. Cleared on reset (-1) and while Motion is off.
var shownHead = -1;
function paintPlayhead() {
    var head = S.motion ? S.playhead : -1, accent = SID_PALETTE.color('accent'), o, n;
    if (head === shownHead) return;
    if (shownHead >= 0) {
        o = obj('step_head_' + (shownHead + 1)); if (o) o.message('bgfillcolor', accent[0], accent[1], accent[2], 0);
        n = 'lbl_motion_index_' + (shownHead + 1); o = obj(n); if (o) paint(n, o, !S.motion);
    }
    if (head >= 0) {
        o = obj('step_head_' + (head + 1)); if (o) o.message('bgfillcolor', accent[0], accent[1], accent[2], 1);
        o = obj('lbl_motion_index_' + (head + 1)); if (o) o.message('textcolor', accent[0], accent[1], accent[2], 1);
    }
    shownHead = head;
}

function resetPlayhead() {
    var accent = SID_PALETTE.color('accent'), i, o;
    for (i = 1; i <= STEPS; i++) { o = obj('step_head_' + i); if (o) o.message('bgfillcolor', accent[0], accent[1], accent[2], 0); }
    shownHead = -1;
    paintPlayhead();
}

// EDITED marker under the patch name: orange while the sound has edits not
// yet saved to a bank, invisible otherwise. "dirty 1" is ignored for the first
// seconds after load (controls report their restored values then); "dirty 2"
// (a restored set that differs from its slot) always shows.
function paintDirty(on) {
    var o = obj('lbl_dirty'), c = SID_PALETTE.color('accent');
    if (o) o.message('textcolor', c[0], c[1], c[2], on ? 1 : 0);
}

// Momentary buttons (< > SAVE CANCEL RESEND RANDOM PANIC) flash orange when pressed,
// so a press is visible however briefly the mouse is held.
var saveModeOn = 0;
var flashTasks = {};
function paintButton(name, lit) {
    var b = obj(name), fill = obj('btnbg_' + name);
    var bg = SID_PALETTE.color(lit ? 'accent' : 'off'), ink = SID_PALETTE.color(lit ? 'onText' : 'sub');
    var pressInk = SID_PALETTE.color(lit ? 'onText' : 'accent');
    if (fill) { fill.message('bgfillcolor', bg[0], bg[1], bg[2], bg[3]); fill.message('bordercolor', bg[0], bg[1], bg[2], bg[3]); }
    if (b) {
        b.message('textcolor', ink[0], ink[1], ink[2], 1); b.message('activetextcolor', ink[0], ink[1], ink[2], 1);
        b.message('textoffcolor', ink[0], ink[1], ink[2], 1);
        b.message('textoncolor', pressInk[0], pressInk[1], pressInk[2], 1); b.message('activetextoncolor', pressInk[0], pressInk[1], pressInk[2], 1);
    }
}
function restingLit(name) { return name === 'sid_save_patch' && saveModeOn; }
function flash(name) {
    if (!obj(name)) return;
    paintButton(name, 1);
    if (flashTasks[name]) flashTasks[name].cancel();
    flashTasks[name] = new Task(function () { paintButton(name, restingLit(name)); }, this);
    flashTasks[name].schedule(180);
}

// Save mode: < and > give way to CANCEL, and SAVE becomes an orange STORE.
function paintSaveMode(on) {
    saveModeOn = on ? 1 : 0;
    var i, o, show = on ? ['sid_cancel', 'btnbg_sid_cancel'] : ['sid_prev', 'sid_next', 'btnbg_sid_prev', 'btnbg_sid_next'],
        hide = on ? ['sid_prev', 'sid_next', 'btnbg_sid_prev', 'btnbg_sid_next'] : ['sid_cancel', 'btnbg_sid_cancel'];
    for (i = 0; i < hide.length; i++) { o = obj(hide[i]); if (o) o.hidden = 1; }
    for (i = 0; i < show.length; i++) { o = obj(show[i]); if (o) o.hidden = 0; }
    var save = obj('sid_save_patch');
    if (save) { save.message('text', on ? 'STORE' : 'SAVE'); save.message('texton', on ? 'STORE' : 'SAVE'); }
    paintButton('sid_save_patch', saveModeOn);
}

function readWave() {
    var names = ['sid_wave_pulse','sid_wave_saw','sid_wave_tri','sid_wave_noise'], values = [], i, o;
    for (i = 0; i < names.length; i++) { o = obj(names[i]); values.push(o ? Math.round(o.getvalueof()) : 0); }
    return values;
}

function showWave(values) {
    var names = ['sid_wave_pulse','sid_wave_saw','sid_wave_tri','sid_wave_noise'], i, o;
    for (i = 0; i < names.length; i++) { o = obj(names[i]); if (o) o.message('set', values[i]); }
}

function ringmChanged(on) {
    if (on) { if (savedWave === null) savedWave = readWave(); showWave([0,0,1,0]); }
    else if (savedWave !== null) { showWave(savedWave); savedWave = null; }
}

function anything() {
    if (messagename === 'press') { flash(String(arguments[0])); return; }
    var key = messagename, v = arguments.length ? Math.round(arguments[0]) : 0;
    if (key === 'slot') {
        savedWave = null;
        return;
    }
    if (key === 'savemode') { paintSaveMode(v); return; }
    if (key === 'dirty') { if (v === 1 && new Date().getTime() < dirtyReadyAt) return; paintDirty(v); return; }
    if (!S.hasOwnProperty(key)) { post('sid_ui_logic: unknown message ' + key + '\n'); return; }
    if (key === 'playhead') { S.playhead = v; paintPlayhead(); return; }
    var previousRing = S.ringm;
    S[key] = v;
    if (key === 'ringm' && S.ringm !== previousRing) ringmChanged(S.ringm);
    apply();
    paintDots();
    paintStepMasks();
    resetPlayhead();
}

function bang() {
    function read(name, fallback) { var o = obj(name); return o ? Math.round(o.getvalueof()) : fallback; }
    S.mode = read('sid_mode_play', S.mode);
    S.ringm = read('sid_ringm', S.ringm);
    S.pwm = read('sid_pwm_on', S.pwm);
    S.vib = read('sid_vib_on', S.vib);
    S.trem = read('sid_trem_on', S.trem);
    S.fenv = read('sid_fenv_on', S.fenv);
    S.motion = read('sid_motion_on', S.motion);
    S.ftype = read('sid_filter_type', S.ftype);
    S.vel = read('sid_velocity_target', S.vel);
    S.press = read('sid_pressure_target', S.press);
    S.page = read('sid_m4l_page', S.page);
    S.porta = read('sid_mode_porta', S.porta);
    S.len = read('sid_motion_length', S.len);
    S.wheel = read('sid_wheel_target', S.wheel);
    S.bend = read('sid_bend_target', S.bend);
    S.key = read('sid_key_target', S.key);
    S.velenv = read('sid_vel_env', S.velenv);
    if (S.ringm) ringmChanged(1);
    apply();
    paintDots();
    paintStepMasks();
}
