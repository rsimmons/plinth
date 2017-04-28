import {generateWhiteNoise, generatePinkNoise, generateBrownNoise} from '../../noise';
const template = require('./template.html');

function applyDecay(arr, decayConstant) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] *= Math.exp(decayConstant*i/arr.length);
  }
}

export default class NoiseVerb {
  constructor(audioContext, viewContainer, settings) {

    // Create nodes
    const splitterNode = audioContext.createGain();
    splitterNode.gain.value = 1;

    const convolverNode = audioContext.createConvolver();
    convolverNode.normalize = true;

    const dryGainNode = audioContext.createGain();

    const wetGainNode = audioContext.createGain();

    const mergerNode = audioContext.createGain();
    mergerNode.gain.value = 1;

    // Connect nodes
    splitterNode.connect(convolverNode);
    splitterNode.connect(dryGainNode);
    convolverNode.connect(wetGainNode);
    dryGainNode.connect(mergerNode);
    wetGainNode.connect(mergerNode);

    const updateGains = () => {
      dryGainNode.gain.value = Math.sqrt(1 - wetness);
      wetGainNode.gain.value = Math.sqrt(wetness);
    };

    const computeIR = () => {
      const irBufferFrames = Math.floor(decayTime*audioContext.sampleRate);
      const IR_DECAY_CONSTANT = -Math.log(1000); // should be -60db
      const numChannels = width === 'stereo' ? 2 : 1;
      const irBuffer = audioContext.createBuffer(numChannels, irBufferFrames, audioContext.sampleRate);
      for (let ch = 0; ch < numChannels; ch++) {
        const chData = irBuffer.getChannelData(ch);
        switch (noiseColor) {
          case 'white':
            generateWhiteNoise(chData);
            break;
          case 'pink':
            generatePinkNoise(chData);
            break;
          case 'brown':
            generateBrownNoise(chData);
            break;
          default:
            throw new Error('bad color');
        }
        applyDecay(chData, IR_DECAY_CONSTANT);
      }
      convolverNode.buffer = irBuffer;
    };

    this.inputs = {
      'audio': {type: 'audio', node: splitterNode},
    };
    this.outputs = {
      'audio': {type: 'audio', node: mergerNode},
    };

    viewContainer.innerHTML = template;
    const textareaElem = viewContainer.querySelector('textarea');

    const noiseColorElem = viewContainer.querySelector('.noise-color-select');
    noiseColorElem.addEventListener('input', () => {
      noiseColor = noiseColorElem.value;
      computeIR();
    });

    const updateDecayTimeDisplay = () => {
      decayTimeDisplayElem.textContent = decayTime.toFixed(2) + 's';
    }

    const decayTimeInputElem = viewContainer.querySelector('.decay-time-input');
    const decayTimeDisplayElem = viewContainer.querySelector('.decay-time-display');
    decayTimeInputElem.addEventListener('input', () => {
      decayTime = +decayTimeInputElem.value;
      updateDecayTimeDisplay();
      computeIR();
    });

    const dryWetElem = viewContainer.querySelector('.dry-wet');
    dryWetElem.addEventListener('input', () => {
      wetness = +dryWetElem.value;
      updateGains();
    });

    const widthElem = viewContainer.querySelector('.width-select');
    widthElem.addEventListener('input', () => {
      width = widthElem.value;
      computeIR();
    });

    // Settings
    let decayTime;
    let wetness; // dry/wet setting
    let noiseColor;
    let width;

    if (settings) {
      decayTime = settings.d;
      wetness = settings.w;
      noiseColor = settings.c;
      width = settings.s;
    } else {
      decayTime = 3.0;
      wetness = 0.5;
      noiseColor = 'pink';
      width = 'stereo';
    }

    decayTimeInputElem.value = decayTime;
    dryWetElem.value = wetness;
    noiseColorElem.value = noiseColor;
    widthElem.value = width;

    updateDecayTimeDisplay();
    computeIR();
    updateGains();

    this.save = () => {
      return {
        d: decayTime,
        w: wetness,
        c: noiseColor,
        s: width,
      };
    };
  }
}

NoiseVerb.blockName = 'Noise Verb';
NoiseVerb.helpText =
`Noise Verb is a convolution reverb that uses computed, noise-based impulse responses.

The impulse responses that Noise Verb generates are simple noise with an exponential amplitude decay. This gives the reverb a very smooth but neutral character.

The Color panel control lets you choose the type of noise. White is brighest sounding, brown is the darkest sounding, and pink is in the middle. The Decay panel controls sets how long it takes for reverberations to decay. The Dry↔Wet slider sets the mix between between the original "dry" input sound and the "wet" reverberation sound in the output. The Width control chooses whether the output is mono or stereo. In stereo mode, the reverberations sound "wide" and encompassing, whereas in mono it sounds "narrow" as though it's originating from a single point.

Note that changes to the color or decay time controls will cause glitches in the output sound. This is an inevitable consequence of the way the convolution works.

Background icon CC BY 3.0 by Rahul, GB https://thenounproject.com/term/wave/76639/`;
