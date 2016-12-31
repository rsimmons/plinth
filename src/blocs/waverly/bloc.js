const template = require('raw!./template.html');

export default class Waverly {
  constructor(document, audioContext) {
    const INIT_FREQUENCY = 440;
    const INIT_WAVEFORM = 'sine';
    const INIT_FM_SCALE = 10.0;

    const oscNode = audioContext.createOscillator();
    oscNode.type = INIT_WAVEFORM;
    oscNode.frequency.value = INIT_FREQUENCY;
    oscNode.start();

    const fmScalerNode = audioContext.createGain();
    fmScalerNode.gain.value = INIT_FM_SCALE;
    fmScalerNode.connect(oscNode.frequency);

    this.inputs = {
      // 'pitch': {type: 'audio', node: undefined}, // TODO: need a way to convert linear to exponential to make this work
      'fm': {type: 'audio', node: fmScalerNode},
    };
    this.outputs = {
      'audio': {type: 'audio', node: oscNode},
    };
    const tmpElem = document.createElement('div');
    tmpElem.innerHTML = template;
    this.panelView = tmpElem.childNodes[0];

    const waveformSelectElem = this.panelView.querySelector('.waveform-select');
    waveformSelectElem.value = INIT_WAVEFORM;
    waveformSelectElem.addEventListener('input', () => {
      oscNode.type = waveformSelectElem.value;
    });

    const frequencyInputElem = this.panelView.querySelector('.frequency-input');
    frequencyInputElem.value = INIT_FREQUENCY;
    frequencyInputElem.addEventListener('input', () => {
      const f = parseInt(frequencyInputElem.value, 10);
      if (f > 0) {
        oscNode.frequency.value = f;
      }
    });
  }
}

Waverly.blocName = 'Waverly';
