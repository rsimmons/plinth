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
