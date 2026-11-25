/*
 * Panel controls: one entry per Live parameter, in parameter order.
 *
 * Each entry builds one Live control and a "set <key> <value>" message to the
 * controller (or `command` instead). The order of this list is each
 * parameter's Live order number, so entries are only ever appended; a removed
 * control leaves a {retired} placeholder so later numbers do not move.
 *
 *   key      controller name        param  Live parameter name (never renamed)
 *   label    short name             type   toggle | menu | tab | bar | dial | slider
 *   x y w h  presentation rect      labelRect / labelVar / labelAlign  caption above
 */
const TARGETS=['Cutoff','Reso','PWM Width','PWM Depth','Vib Depth','Trem Rate','Sustain'];
const EXPRESSION_TARGETS=['OFF'].concat(TARGETS);

const CONTROLS=[
  // MODE
  {key:'playmode',varname:'sid_mode_play',param:'Play Mode',label:'Play',type:'menu',enums:['ARP','POLY','MONO','5TH','OCT','OCT+','ARP+'],initial:1,x:86,y:14,w:60,h:15},
  {key:'arpspeed',varname:'sid_arp_speed',param:'Arpeggiator Speed',label:'Speed',type:'bar',min:1,max:31,initial:8,x:86,y:59,w:34,h:15,labelRect:[84,47,36],labelVar:'lbl_arp_speed'},
  {key:'arpdir',varname:'sid_arp_dir',param:'Arpeggiator Direction',label:'Dir',type:'tab',enums:['DN','UP','ALT'],initial:1,x:124,y:59,w:78,h:15,labelRect:[122,47,80],labelVar:'lbl_dir'},
  {key:'porta',varname:'sid_mode_porta',param:'Portamento',label:'PORTA',type:'toggle',initial:0,text:'PORTA',x:150,y:14,w:52,h:15},

  // VIBRATO
  {key:'vibon',varname:'sid_vib_on',param:'Vibrato On',label:'Vibrato',type:'toggle',initial:0,text:'',x:86,y:88,w:9,h:9},
  {key:'vibfreq',varname:'sid_vib_freq',param:'Vibrato Frequency',label:'Freq',type:'bar',min:0,max:31,initial:1,x:86,y:109,w:36,h:14,labelRect:[84,97,38],labelVar:'lbl_vib_freq'},
  {key:'vibrate',varname:'sid_vib_rate',param:'Vibrato Rate',label:'Rate',type:'bar',min:1,max:32,initial:30,x:126,y:109,w:36,h:14,labelRect:[124,97,38],labelVar:'lbl_vib_rate'},
  {key:'vibdelay',varname:'sid_vib_delay',param:'Vibrato Delay',label:'Delay',type:'bar',min:0,max:31,initial:0,x:166,y:109,w:36,h:14,labelRect:[164,97,38],labelVar:'lbl_vib_delay'},
  {key:'vibtype',varname:'sid_vib_type',param:'Vibrato Type',label:'Type',type:'menu',enums:['U+D','INC','UP','DN'],initial:0,x:86,y:135,w:56,h:14,labelRect:[84,123,58],labelVar:'lbl_vib_type'},
  {key:'vibretrig',varname:'sid_vib_retrig',param:'Vibrato Retrigger',label:'Retrig',type:'menu',enums:['N','Y'],initial:0,x:146,y:135,w:56,h:14,labelRect:[144,123,58],labelVar:'lbl_vib_retrig'},
  {retired:'vibwheel'},  // Vibrato Wheel, removed in v0.19.2 (the keyboard's mod wheel does the same job)

  // OSCILLATOR (waveform toggles send "wavebit <part> <0|1>")
  {key:'wavepulse',varname:'sid_wave_pulse',param:'Wave Pulse',label:'Pulse',type:'toggle',initial:1,command:'wavebit pulse',text:'',fontsize:7,picture:'sid_wave_pulse.svg',x:212,y:15,w:28,h:32},
  {key:'wavesaw',varname:'sid_wave_saw',param:'Wave Saw',label:'Saw',type:'toggle',initial:0,command:'wavebit saw',text:'',fontsize:7,picture:'sid_wave_saw.svg',x:241,y:15,w:28,h:32},
  {key:'wavetri',varname:'sid_wave_tri',param:'Wave Triangle',label:'Triangle',type:'toggle',initial:0,command:'wavebit tri',text:'',fontsize:7,picture:'sid_wave_tri.svg',x:270,y:15,w:28,h:32},
  {key:'wavenoise',varname:'sid_wave_noise',param:'Wave Noise',label:'Noise',type:'toggle',initial:0,command:'wavebit noise',text:'',fontsize:7,picture:'sid_wave_noise.svg',x:299,y:15,w:28,h:32},
  {key:'ring',varname:'sid_ringm',param:'Ring Modulation',label:'Ring',type:'toggle',initial:0,text:'Ring',fontsize:8.5,x:212,y:53,w:37,h:15},
  {key:'sync',varname:'sid_hsync',param:'Hard Sync',label:'Sync',type:'toggle',initial:0,text:'Sync',fontsize:8.5,x:251,y:53,w:37,h:15},
  {key:'click',varname:'sid_click',param:'Attack Click',label:'Click',type:'toggle',initial:0,text:'Click',fontsize:8.5,x:290,y:53,w:37,h:15},

  // PWM
  {key:'pwmon',varname:'sid_pwm_on',param:'PWM On',label:'PWM',type:'toggle',initial:0,text:'',x:212,y:88,w:9,h:9},
  {key:'pwmwidth',varname:'sid_pwm_width',param:'PWM Width',label:'Width',type:'dial',min:0,max:127,initial:120,shownumber:1,appearance:3,x:210,y:103,w:52,h:66},
  {key:'pwmrate',varname:'sid_pwm_rate',param:'PWM Rate',label:'Rate',type:'bar',min:0,max:31,initial:19,x:294,y:99,w:34,h:14,labelRect:[260,99,31],labelAlign:2,labelVar:'lbl_pwm_rate'},
  {key:'pwmdepth',varname:'sid_pwm_depth',param:'PWM Depth',label:'Depth',type:'bar',min:0,max:31,initial:22,x:294,y:116,w:34,h:14,labelRect:[260,116,31],labelAlign:2,labelVar:'lbl_pwm_depth'},
  {key:'pwmcycle',varname:'sid_pwm_cycle',param:'PWM Cycle',label:'Cycle',type:'menu',enums:['D+U','U+D','UP','DN'],initial:0,x:294,y:133,w:34,h:14,labelRect:[260,133,31],labelAlign:2,labelVar:'lbl_pwm_cycle'},
  {key:'pwmretrig',varname:'sid_pwm_retrig',param:'PWM Retrigger',label:'Retrig',type:'menu',enums:['LEG','Y','N'],initial:0,x:294,y:150,w:34,h:14,labelRect:[260,150,31],labelAlign:2,labelVar:'lbl_pwm_retrig'},

  // FILTER
  {key:'filtermode',varname:'sid_filter_type',param:'Filter Mode',label:'Filter',type:'tab',enums:['OFF','LP','BP','HP'],initial:0,fontsize:7,lines:1,x:396,y:2,w:86,h:11},
  {key:'cutoff',varname:'sid_filter_cutoff',param:'Filter Cutoff',label:'Cutoff',type:'dial',min:0,max:127,initial:64,shownumber:1,appearance:3,x:336,y:17,w:50,h:66},
  {key:'resonance',varname:'sid_filter_reso',param:'Filter Resonance',label:'Reso',type:'dial',min:0,max:15,initial:0,appearance:3,x:386,y:17,w:48,h:66},
  {key:'fenvamount',varname:'sid_fenv_amt',param:'Filter Envelope Amount',label:'Amt',type:'dial',min:-31,max:31,initial:16,x:490,y:110,w:34,h:52},  // Cutoff Env Amount (its parameter order sits here)
  {key:'filterrate',varname:'sid_filter_rate',param:'Filter Motion Rate',label:'Rate',type:'bar',min:0,max:31,initial:16,x:438,y:22,w:44,h:13,labelRect:[436,10,46],labelVar:'lbl_filter_rate'},
  {key:'filtercycle',varname:'sid_filter_cycle',param:'Filter Motion Cycle',label:'Cycle',type:'menu',enums:['OFF','D+U','U+D','UP','DN'],initial:0,x:438,y:46,w:44,h:13,labelRect:[436,34,46],labelVar:'lbl_filter_cycle'},
  {key:'filterretrig',varname:'sid_filter_retrig',param:'Filter Motion Retrigger',label:'Retrig',type:'menu',enums:['LEG','Y','N'],initial:0,x:438,y:70,w:44,h:13,labelRect:[436,58,46],labelVar:'lbl_filter_retrig'},

  // CUTOFF ENV (Live-side)
  {key:'fenvon',varname:'sid_fenv_on',param:'Filter Envelope On',label:'Cutoff Env',type:'toggle',initial:0,text:'',x:492,y:24,w:9,h:9},
  {key:'fenvattack',varname:'sid_fenv_atk',param:'Filter Envelope Attack',label:'Attack',type:'dial',min:0,max:2000,initial:20,unitstyle:9,units:'%.0f ms',shownumber:1,x:524,y:110,w:34,h:52},
  {key:'fenvdecay',varname:'sid_fenv_dec',param:'Filter Envelope Decay',label:'Decay',type:'dial',min:0,max:4000,initial:300,unitstyle:9,units:'%.0f ms',shownumber:1,x:558,y:110,w:34,h:52},
  {key:'fenvsustain',varname:'sid_fenv_sus',param:'Filter Envelope Sustain',label:'Sustain',type:'dial',min:0,max:100,initial:35,unitstyle:5,shownumber:1,x:592,y:110,w:34,h:52},
  {key:'fenvrelease',varname:'sid_fenv_rel',param:'Filter Envelope Release',label:'Release',type:'dial',min:0,max:4000,initial:300,unitstyle:9,units:'%.0f ms',shownumber:1,x:626,y:110,w:34,h:52},

  // TREMOLO
  {key:'tremon',varname:'sid_trem_on',param:'Tremolo On',label:'Tremolo',type:'toggle',initial:0,text:'',x:86,y:157,w:9,h:9},
  {key:'tremrate',varname:'sid_trem_rate',param:'Tremolo Rate',label:'Rate',type:'bar',min:0,max:31,initial:17,x:166,y:154,w:36,h:14,labelRect:[133,154,30],labelAlign:2,labelVar:'lbl_trem_rate'},

  // ENVELOPE
  {key:'envretrig',varname:'sid_env_retrig',param:'Amp Envelope Retrigger',label:'Retrig',type:'menu',enums:['AUTO','ALW','LEG'],initial:0,x:436,y:86,w:46,h:12},
  {key:'attack',varname:'sid_env_attack',param:'Amp Attack',label:'Attack',type:'dial',min:0,max:15,initial:4,shownumber:1,x:336,y:110,w:34,h:52},
  {key:'decay',varname:'sid_env_decay',param:'Amp Decay',label:'Decay',type:'dial',min:0,max:15,initial:8,shownumber:1,x:374,y:110,w:34,h:52},
  {key:'sustain',varname:'sid_env_sustain',param:'Amp Sustain',label:'Sustain',type:'dial',min:0,max:15,initial:6,shownumber:1,x:412,y:110,w:34,h:52},
  {key:'release',varname:'sid_env_release',param:'Amp Release',label:'Release',type:'dial',min:0,max:15,initial:0,shownumber:1,x:450,y:110,w:34,h:52},

  // STEP MOD (Live-side; parameters keep the name Clocked Motion)
  {key:'motionon',varname:'sid_motion_on',param:'Clocked Motion On',label:'Motion',type:'toggle',initial:0,text:'',x:492,y:24,w:9,h:9},
  {key:'motiontarget',varname:'sid_motion_target',param:'Clocked Motion Target',label:'Target',type:'menu',enums:TARGETS,initial:0,x:492,y:45,w:58,h:14,labelRect:[490,33,60],labelVar:'lbl_motion_target'},
  {key:'motiondivision',varname:'sid_motion_division',param:'Clocked Motion Division',label:'Rate',type:'menu',enums:['1/4','1/8','1/8T','1/16','1/16T','1/16D','1/32','1/32T'],initial:3,x:553,y:45,w:38,h:14,labelRect:[551,33,40],labelVar:'lbl_motion_division'},
  {key:'motionlength',varname:'sid_motion_length',param:'Clocked Motion Length',label:'Len',type:'bar',min:1,max:8,initial:8,x:594,y:45,w:30,h:14,labelRect:[592,33,32],labelVar:'lbl_motion_length'},
  {key:'motionamount',varname:'sid_motion_amount',param:'Clocked Motion Amount',label:'Amt',type:'bar',min:-31,max:31,initial:16,x:627,y:45,w:33,h:14,labelRect:[625,33,36],labelVar:'lbl_motion_amount'},
  ...[100,0,75,-25,50,-50,25,-75].map((initial,index)=>({key:`motionstep${index+1}`,varname:`sid_motion_step_${index+1}`,
    param:`Clocked Motion Step ${index+1}`,label:`${index+1}`,type:'slider',min:-100,max:100,initial,showname:0,orientation:0,
    hidePresentation:true,x:850+index*40,y:94,w:32,h:66})),

  // EXPRESSION (Live-side)
  {key:'veltarget',varname:'sid_velocity_target',param:'Velocity Target',label:'Velocity',type:'menu',enums:EXPRESSION_TARGETS,initial:0,x:536,y:45,w:84,h:14},
  {key:'velamount',varname:'sid_velocity_amount',param:'Velocity Amount',label:'Amt',type:'bar',min:-31,max:31,initial:16,x:624,y:45,w:36,h:14},
  {key:'presstarget',varname:'sid_pressure_target',param:'Aftertouch Target',label:'Pressure',type:'menu',enums:EXPRESSION_TARGETS,initial:0,x:536,y:65,w:84,h:14},
  {key:'pressamount',varname:'sid_pressure_amount',param:'Aftertouch Amount',label:'Amt',type:'bar',min:-31,max:31,initial:16,x:624,y:65,w:36,h:14},

  // STEP MOD, added later
  {key:'motionsmooth',varname:'sid_motion_smooth',param:'Clocked Motion Smooth',label:'Smooth',type:'bar',min:0,max:100,initial:0,ptype:1,unitstyle:5,x:624,y:21,w:36,h:13,labelRect:[576,21,45],labelAlign:2,labelVar:'lbl_motion_smooth'},

  // EXPRESSION, added in v0.19.0
  {key:'wheeltarget',varname:'sid_wheel_target',param:'Wheel Target',label:'Wheel',type:'menu',enums:['VIBRATO'].concat(TARGETS),initial:0,x:536,y:85,w:84,h:14,labelRect:[490,85,44],labelVar:'lbl_wheel_row'},
  {key:'wheelamount',varname:'sid_wheel_amount',param:'Wheel Amount',label:'Amt',type:'bar',min:-31,max:31,initial:16,x:624,y:85,w:36,h:14},
  {key:'bendtarget',varname:'sid_bend_target',param:'Bend Target',label:'Bend',type:'menu',enums:EXPRESSION_TARGETS,initial:0,x:536,y:105,w:84,h:14,labelRect:[490,105,44],labelVar:'lbl_bend_row'},
  {key:'bendamount',varname:'sid_bend_amount',param:'Bend Amount',label:'Amt',type:'bar',min:-31,max:31,initial:16,x:624,y:105,w:36,h:14},
  {key:'keytarget',varname:'sid_key_target',param:'Key Track Target',label:'Key',type:'menu',enums:EXPRESSION_TARGETS,initial:0,x:536,y:125,w:84,h:14,labelRect:[490,125,44],labelVar:'lbl_key_row'},
  {key:'keyamount',varname:'sid_key_amount',param:'Key Track Amount',label:'Amt',type:'bar',min:-31,max:31,initial:16,x:624,y:125,w:36,h:14},
  {key:'velenv',varname:'sid_vel_env',param:'Velocity to Cutoff Env',label:'Vel > Cutoff Env',type:'bar',min:0,max:100,initial:0,ptype:1,unitstyle:5,x:624,y:145,w:36,h:14,labelRect:[490,145,130],labelVar:'lbl_velenv_row'}
];

// Live Info View help, from the SID SYNTH manual.
const HELP={
  playmode:'Selects the SID voice mode. ARP and ARP+ cycle held notes; POLY gives true SID polyphony; MONO uses one voice; OCT, OCT+, and 5TH layer a second voice at a fixed interval.',
  arpspeed:'Sets arpeggiator speed in ARP/ARP+ and glide rate for Portamento in the other modes. When the C64 follows MIDI clock, ARP/ARP+ treat it as a note division (1/1 to 1/64 triplet, two steps per division), shown beside ARPEGGIO as SYNC.',
  arpdir:'Chooses up, down, or alternating note order for ARP and ARP+. It is inactive in the other voice modes, and a fresh MIDI chord starts predictably from the direction-dependent edge note.',
  porta:'Glides new notes to pitch at the Speed setting instead of jumping. It works in the single-voice modes and independently per voice in POLY, but is unavailable in ARP and ARP+.',

  vibon:'Turns SID SYNTH vibrato on or off. Released notes continue to wobble through their release tails instead of snapping immediately to a flat pitch.',
  vibfreq:'Sets vibrato depth: how far pitch swings around the played note. Small values at high Rate make a shimmer; larger values at slower Rate create a wide sway.',
  vibrate:'Sets how quickly vibrato cycles. Vibrato Rate is stored in the C64 patch and is separate from the performance-only Wheel depth.',
  vibdelay:'Sets the delay before patch vibrato begins. The performance Wheel bypasses this delay while raised and hands control back to the patch when returned to zero.',
  vibtype:'Selects bidirectional, ramp-in, up-only, or down-only vibrato motion. The directional types change how the pitch movement develops around the note.',
  vibretrig:'N lets vibrato and its delay flow across tied notes; Y restarts the delay and vibrato on every new note. Arpeggiator steps and octave-doubled voices do not retrigger it.',

  wavepulse:'Enables the SID pulse waveform. Pulse plays at full level by itself and is the waveform most strongly affected by PWM; it can be combined with Saw and Triangle.',
  wavesaw:'Enables the SID saw waveform. Combined SID waveforms interact inside the chip rather than mixing, so their level and character vary between SID revisions.',
  wavetri:'Enables the SID triangle waveform. Ring modulation forces Triangle because the SID ring modulator produces its effect through the triangle output.',
  wavenoise:'Selects SID noise. Noise is a single exclusive waveform; choosing it disables Pulse, Saw, and Triangle combinations.',
  ring:'Enables ring modulation on voice 1 using voice 3 as the carrier, producing a metallic octave-related tone. It forces Triangle and is mutually exclusive with Hard Sync.',
  sync:'Enables hard sync on voice 1 against a carrier voice. Each note begins with a bright, harsh sweep that settles into a rich octave-up timbre; it is mutually exclusive with Ring.',
  click:'Adds a roughly 22 ms burst of high-rate noise at each note attack for a sharper bass or lead transient. It is most audible with fast Attack and fires once per new chord in ARP modes.',

  pwmon:'Turns the pulse-width LFO on or off. It acts strongly on Pulse and more subtly on combined waveforms containing Pulse; it has no effect on Saw, Triangle, Noise, or Tri+Saw.',
  pwmwidth:'Sets the starting pulse duty cycle and the restart point when PWM Retrig is active. MIDI uses the full 0-127 range, while a saved C64 slot recalls the nearest 32-step panel value.',
  pwmrate:'Sets the speed of the pulse-width sweep.',
  pwmdepth:'Sets how far pulse width moves from Width. Small Depth gives a subtle shimmer; large Depth with a one-way cycle can produce a dramatic filter-like sweep.',
  pwmcycle:'Chooses the PWM path: down-up, up-down, rising ramp, or falling ramp. Two-way shapes breathe smoothly; one-way ramps reset sharply for a more rhythmic effect.',
  pwmretrig:'LEG restarts PWM from Width only after a genuine note gap; Y restarts on every new note; N never restarts and continues from its current position.',

  filtermode:'Selects filter Off, low-pass, band-pass, or high-pass. The filter processes all sounding voices except a carrier reserved by Ring or Sync until POLY needs that voice.',
  cutoff:'Sets the shared filter cutoff and the ceiling used by SID SYNTH native filter motion. MIDI uses all 128 values for smooth sweeps; saved C64 slots recall the nearest panel step.',
  resonance:'Emphasizes frequencies around Cutoff. The SID provides 16 real resonance steps, so MIDI cannot make this control finer.',
  filterrate:'Sets the speed of SID SYNTH native automatic filter motion. This native rate is free-running; only the arpeggiator follows incoming MIDI clock.',
  filtercycle:'Chooses native filter motion: Off, bounce down first, bounce up first, always rising, or always falling.',
  filterretrig:'Controls when SID SYNTH native filter motion restarts as notes arrive. Use LEG for phrase-level motion, Y for every note, or N for uninterrupted motion.',

  fenvon:'Enables the Live-side note-triggered Cutoff Envelope. It moves Cutoff by MIDI CC and is not stored in the C64 sound or SLO patch.',
  fenvamount:'Sets the bipolar depth of the Live-side Cutoff Envelope around the patch Cutoff. Positive values open the filter; negative values move it in the opposite direction.',
  fenvattack:'Sets how long the Live-side Cutoff Envelope takes to reach its peak after a note-on.',
  fenvdecay:'Sets how long the Live-side Cutoff Envelope takes to move from its peak to Sustain.',
  fenvsustain:'Sets the Cutoff Envelope level held while notes remain down.',
  fenvrelease:'Sets how long the Cutoff Envelope takes to return to the patch Cutoff after the final held note is released.',

  tremon:'Turns amplitude modulation on or off. Tremolo depth is fixed at maximum in SID SYNTH.',
  tremrate:'Sets the speed of SID SYNTH tremolo. The rate remains free-running and does not follow MIDI clock.',
  envretrig:'AUTO retriggers plucky low-sustain sounds but connects sustained lines; ALWAYS restarts every note; LEGATO never retriggers. It has no effect in POLY, ARP, or ARP+.',
  attack:'Sets how quickly SID amplitude rises after a note starts. The SID chip provides 16 actual Attack steps.',
  decay:'Sets how quickly SID amplitude falls from the Attack peak toward Sustain. Short Decay with low Sustain creates a pluck.',
  sustain:'Sets the held amplitude level after Decay. Raising Sustain while a note is already held cannot raise that note; the new value is heard on the next trigger.',
  release:'Sets how long the sound fades after note-off. In ARP/ARP+, a long Release can let the arpeggio continue through a fading tail when MIDI clock is not running.',

  motionon:'Enables Step Mod, the Live-side step modulator. It sends one documented CC offset per selected musical step and restores the underlying patch value when disabled.',
  motiontarget:'Selects which SID SYNTH setting Step Mod offsets: Cutoff, Resonance, PWM Width, PWM Depth, Vibrato Depth, Tremolo Rate, or Sustain (a fade: lowering it fades held notes, raising it is heard from the next note).',
  motiondivision:'Sets the Step Mod step interval relative to Live tempo, including straight, triplet, and dotted divisions.',
  motionlength:'Sets how many of the eight Step Mod steps are used before the pattern repeats.',
  motionamount:'Sets the maximum bipolar offset applied by the Step Mod steps. Each step scales this amount by its own percentage.',
  motionsmooth:'Glides between steps instead of jumping. 0% gives hard steps; higher values ease from one step to the next over that share of the step, and 100% joins the steps into one continuous, tempo-synced wave, like a drawable LFO.',

  veltarget:'Maps incoming note velocity to one documented SID SYNTH destination. OFF leaves velocity unmapped; the original note velocity still passes through. Targets: Cutoff, Resonance, PWM Width, PWM Depth, Vibrato Depth, Tremolo Rate or Sustain (a fade: lowering it fades held notes, raising it is heard from the next note).',
  velamount:'Sets the bipolar depth of the velocity mapping. The offset is strongest at velocity 127 and returns when all held notes are released.',
  presstarget:'Maps incoming channel aftertouch to one documented SID SYNTH destination. OFF leaves aftertouch unmapped; incoming MIDI continues to pass through. Targets: Cutoff, Resonance, PWM Width, PWM Depth, Vibrato Depth, Tremolo Rate or Sustain (a fade: lowering it fades held notes, raising it is heard from the next note).',
  pressamount:'Sets the bipolar depth of the channel-aftertouch mapping. The offset follows pressure from 0 to 127 and returns at zero.',
  wheeltarget:'Chooses what the mod wheel (CC1) does. VIBRATO keeps SID SYNTH\'s own performance wheel: vibrato comes in at once, skipping the patch delay, and is never saved. Any other target takes the wheel over: native wheel vibrato is released, CC1 is no longer passed to the C64, and the wheel offsets that target instead. Other targets: Cutoff, Resonance, PWM Width, PWM Depth, Vibrato Depth, Tremolo Rate or Sustain (a fade).',
  wheelamount:'Sets the bipolar depth of a mapped mod wheel. Unused while Wheel is set to VIBRATO.',
  bendtarget:'Adds a second destination for pitch bend. Bend always keeps bending pitch on SID SYNTH; this also moves the chosen target up and down with the wheel. Targets: Cutoff, Resonance, PWM Width, PWM Depth, Vibrato Depth, Tremolo Rate or Sustain (a fade: lowering it fades held notes, raising it is heard from the next note).',
  bendamount:'Sets the bipolar depth of the pitch-bend mapping at full bend.',
  keytarget:'Key tracking: the last note played offsets a target, centred on C3 and reaching full Amount four octaves away. Key to Cutoff keeps the filter brightness even across the keyboard, which the SID filter does not do by itself. Targets: Cutoff, Resonance, PWM Width, PWM Depth, Vibrato Depth, Tremolo Rate or Sustain (a fade: lowering it fades held notes, raising it is heard from the next note).',
  keyamount:'Sets the bipolar depth of key tracking at four octaves from C3.',
  velenv:'Scales the Cutoff Envelope depth by note velocity. 0% ignores velocity; 100% makes the sweep fully velocity-sensitive, so soft notes barely open the filter and hard notes open it fully.'
};
for (let step=1;step<=8;step++) {
  HELP[`motionstep${step}`]=`Sets Clocked Motion step ${step} from -100% to +100% of Amount. The step offsets the selected target without rewriting the stored C64 patch value.`;
}
for (const control of CONTROLS) if (control.key) control.info=HELP[control.key];

module.exports={CONTROLS,TARGETS,EXPRESSION_TARGETS};
