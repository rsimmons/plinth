const template = require('./template.html');
const Fastidious = require('fastidious-envelope-generator');

export default class Egen {
  constructor(document, audioContext, settings) {
    // Create a value that outputs a constant 1, which we modulate by the gain to provide final output
    const constantBuffer = audioContext.createBuffer(1, 2, audioContext.sampleRate);
    const constantData = constantBuffer.getChannelData(0);
    constantData[0] = 1;
    constantData[1] = 1;
    const constantNode = audioContext.createBufferSource();
    constantNode.buffer = constantBuffer;
    constantNode.loop = true;
    constantNode.start();

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0;

    constantNode.connect(gainNode);

    const fast = new Fastidious(audioContext, gainNode.gain);
    fast.attackShape = fast.LINEAR;

    // Load settings or defaults
    if (!settings) {
      settings = {
        m: 'AD',
        rt: 0.01,
        ft: 0.1,
        fs: Fastidious.EXPONENTIAL,
      };
    }

    // Enact settings
    fast.mode = settings.m;
    fast.attackRate = 1.0/settings.rt;
    fast.decayShape = settings.fs;
    fast.decayRate = 1.0/settings.ft;
    fast.releaseShape = settings.fs;
    fast.releaseRate = 1.0/settings.ft;

    const gateNotify = (time, value) => {
      fast.gate(value, time);
    };

    this.inputs = {
      'gate': {type: 'gateEvent', notify: gateNotify},
    };
    this.outputs = {
      'audio': {type: 'audio', node: gainNode},
    };

    const tmpElem = document.createElement('div');
    tmpElem.innerHTML = template;
    this.panelView = tmpElem.childNodes[0];

    const modeSelectElem = this.panelView.querySelector('.mode-select');
    modeSelectElem.value = fast.mode;
    modeSelectElem.addEventListener('input', () => {
      fast.mode = modeSelectElem.value;
    });

    const MIN_TIME = 0.001;
    const MAX_TIME = 30;
    const LOG_MIN_TIME = Math.log(MIN_TIME);
    const LOG_MAX_TIME = Math.log(MAX_TIME);
    const timeToControlValue = (t) => ((Math.log(t) - LOG_MIN_TIME)/(LOG_MAX_TIME - LOG_MIN_TIME));
    const controlValueToTime = (v) => (Math.exp(LOG_MIN_TIME + v*(LOG_MAX_TIME-LOG_MIN_TIME)));

    const riseTimeInputElem = this.panelView.querySelector('.rise-time-input');
    riseTimeInputElem.value = timeToControlValue(1.0/fast.attackRate);
    riseTimeInputElem.addEventListener('input', () => {
      fast.attackRate = 1.0/controlValueToTime(riseTimeInputElem.value)
    });

    const fallTimeInputElem = this.panelView.querySelector('.fall-time-input');
    fallTimeInputElem.value = timeToControlValue(1.0/fast.decayRate);
    fallTimeInputElem.addEventListener('input', () => {
      fast.decayRate = 1.0/controlValueToTime(fallTimeInputElem.value)
      fast.releaseRate = 1.0/controlValueToTime(fallTimeInputElem.value)
    });

    const fallShapeSelectElem = this.panelView.querySelector('.fall-shape-select');
    fallShapeSelectElem.value = fast.decayShape;
    fallShapeSelectElem.addEventListener('input', () => {
      fast.decayShape = fallShapeSelectElem.value;
      fast.releaseShape = fallShapeSelectElem.value;
    });

    this.save = () => {
      return {
        m: fast.mode,
        rt: 1.0/fast.attackRate,
        ft: 1.0/fast.decayRate,
        fs: 1.0/fast.decayShape,
      };
    };
  }
}

Egen.blockName = 'Egen';
Egen.helpText =
`Egen is a multi-mode envelope generator.

Egen has a single gate-type input and a single audio-type output. Generally speaking, as the input gate signal turns on and off, the output value makes gradual transitions back and forth between 0 and 1.

Egen has two modes: attack-decay (/\\ shape) and attack-sustain-release (/‾\\ shape).

In attack-decay mode, as soon as the output value reaches 1 (end of attack phase), it immediately starts transitioning back to 0 (decay phase). Even if the gate goes off during the attack phase, the attack phase will continue uninterrupted. This means that it only matters when the input gate goes on, not when it goes off. Attack-decay mode is sometimes referred to as "trigger" mode, and is useful for generating percussive sounds that always have the same envelope shape regardless of how long the gate is held high.

In attack-sustain-release mode, the output value starts moving towards 1 when the gate goes on (attack phase). If it reaches 1 while the gate is still on, it stays at 1 (sustain phase). When the gate goes off, the output value starts moving towards 0 (release phase). If the gate goes off during attack phase, the envelope will immediately enter release phase and decay towards 0.

For all envelope types, if the gate goes high during the falling phase (decay or release), a new attack will begin from the current output value. In other words, the envelope will restart WITHOUT dropping to 0 and the output will not have any sudden jumps.

The Rise control sets the speed of the attack phase, i.e. how quickly the envelope transitions towards 1. The attack shape is always linear.

The Fall control sets the speed of the decay and release phases, i.e. how quickly the envelope transitions towards 0. The Fall Shape control can be set to LIN (fall linearly to 0) or EXP (decay exponentially to 0). Exponential decay tends to sound more like natural sounds.

Tip: Very fast envelopes that rise and fall in less than the time of a single audio wave cycle can be used to make "click" sounds.`;
