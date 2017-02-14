const template = require('./template.html');

export default class Waverly {
  constructor(document, audioContext, settings) {
    const INIT_WAVEFORM = 'sine';
    const INIT_FREQUENCY = 440;
    const INIT_FM_SCALE = 100.0;

    const oscNode = audioContext.createOscillator();
    oscNode.type = INIT_WAVEFORM;
    oscNode.frequency.value = INIT_FREQUENCY;
    oscNode.start();

    const fmScalerNode = audioContext.createGain();
    fmScalerNode.gain.value = INIT_FM_SCALE;
    fmScalerNode.connect(oscNode.frequency);

    if (settings) {
      oscNode.type = settings.w;
      oscNode.frequency.value = settings.f;
      fmScalerNode.gain.value = settings.fm;
    }

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
    waveformSelectElem.value = oscNode.type;
    waveformSelectElem.addEventListener('input', () => {
      oscNode.type = waveformSelectElem.value;
    });

    const frequencyInputElem = this.panelView.querySelector('.frequency-input');
    frequencyInputElem.value = oscNode.frequency.value;
    frequencyInputElem.addEventListener('input', () => {
      const v = parseFloat(frequencyInputElem.value);
      if (v > 0) {
        oscNode.frequency.value = v;
      }
    });

    const fmScaleInputElem = this.panelView.querySelector('.fm-scale-input');
    fmScaleInputElem.value = fmScalerNode.gain.value;
    fmScaleInputElem.addEventListener('input', () => {
      const v = parseFloat(fmScaleInputElem.value);
      fmScalerNode.gain.value = v;
    });

    this.save = () => {
      return {
        w: oscNode.type,
        f: oscNode.frequency.value,
        fm: fmScalerNode.gain.value,
      };
    };
  }
}

Waverly.blockName = 'Waverly';
