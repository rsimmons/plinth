const template = require('./template.html');

export default class Gainer {
  constructor(document, audioContext, settings) {
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0;

    this.inputs = {
      'audio': {type: 'audio', node: gainNode},
      'gain': {type: 'audio', node: gainNode.gain},
    };
    this.outputs = {
      'audio': {type: 'audio', node: gainNode},
    };
    const tmpElem = document.createElement('div');
    tmpElem.innerHTML = template;
    this.panelView = tmpElem.childNodes[0];
  }
}

Gainer.blockName = 'Gainer';
Gainer.helpText =
`Gainer is what's typically called a VCA (voltage controlled amplifier). It allows one audio-type signal to adjust the amplitude of another.

Gainer has two audio inputs, and one audio output. The output value at any instant is simply the two input values multiplied together. One input is named "audio" and one is named "gain" because typically one input is fed a listenable audio signal, while the other "gain" input is fed the output of an slower-varying envelope generator or LFO. That being said, the two inputs are completely symmetric. If fed two audio-rate input signals, Gainer will act as a ring modulator.

Gainer has no panel controls.`;
