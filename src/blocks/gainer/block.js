const template = require('./template.html');

export default class Gainer {
  constructor(audioContext, viewContainer, settings) {
    const gainNode = audioContext.createGain();

    this.inputs = {
      'audio': {type: 'audio', node: gainNode},
      'gain': {type: 'audio', node: gainNode.gain},
    };
    this.outputs = {
      'audio': {type: 'audio', node: gainNode},
    };
    viewContainer.innerHTML = template;

    let baseGain;

    const setBaseGain = (v) => {
      baseGain = v;
      gainNode.gain.value = v;
    }

    const baseGainInputElem = viewContainer.querySelector('.base-gain-input');
    baseGainInputElem.addEventListener('input', () => {
      const v = parseFloat(baseGainInputElem.value);
      if (!Number.isNaN(v)) {
        baseGain = v;
        gainNode.gain.value = baseGain;
      }
    });

    if (settings) {
      baseGain = settings.g;
    } else {
      baseGain = 0;
    }
    gainNode.gain.value = baseGain;
    baseGainInputElem.value = baseGain;

    this.save = () => {
      return {
        g: baseGain,
      };
    };
  }
}

Gainer.blockName = 'Gainer';
Gainer.helpText =
`Gainer is what's typically called a VCA (voltage controlled amplifier). It allows one audio-type signal to adjust the amplitude of another.

Gainer has two audio inputs, and one audio output. The output value at any instant is simply the two input values multiplied together. One input is named "audio" and one is named "gain" because typically one input is fed a listenable audio signal, while the other "gain" input is fed the output of an slower-varying envelope generator or LFO. If both inputs are connected to audio-rate signals, Gainer will act as a ring modulator.

Gainer has one panel control: Base Gain. This value is summed with the signal (if any) connected to the "gain" input. If nothing is connected to the "gain" input, then Base Gain lets you manually set the gain applied to the "audio" input. Keep in mind that gain can be negative, so this lets you invert signals as well.`;
