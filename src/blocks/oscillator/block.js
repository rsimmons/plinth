import React from 'react'
import ReactDOM from 'react-dom';
import BlockRoot from '../../components/BlockRoot';
import GridSelector from '../../components/GridSelector';
import FrequencyKnob from '../../components/FrequencyKnob';

const FREQ_RANGE_RATIO = 4096; // 12 octaves
const HI_LOW_FREQ_RATIO = 512; // 9 octaves
const HI_FREQ_MIN = 4;
const HI_FREQ_MAX = HI_FREQ_MIN*FREQ_RANGE_RATIO;
const LOW_FREQ_MIN = HI_FREQ_MIN / HI_LOW_FREQ_RATIO;
const LOW_FREQ_MAX = HI_FREQ_MAX / HI_LOW_FREQ_RATIO;

class View extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {waveform, setWaveform, freqSpec, setFreqSpec, frequency, setFrequency, fmScale, setFmScale} = this.props;
    const waveformOptions = [
      {value: 'sine', label: 'SIN'},
      {value: 'triangle', label: 'TRI'},
      {value: 'square', label: 'SQR'},
      {value: 'sawtooth', label: 'SAW'},
    ];

    const freqSpecOptions = [
      // {value: 'p', label: '♪'},
      {value: 'l', label: 'LO'},
      {value: 'h', label: 'HI'},
    ];

    return (
      <BlockRoot widthUnits={2} extraStyles={{position: 'relative', padding: '10px', background: '#dfe3eb', fontSize: 14, textAlign: 'center'}}>
        <div>
          <GridSelector value={waveform} options={waveformOptions} onChange={setWaveform} color='#333' bgColor='#dfe3eb' cellWidth={40} cellHeight={25} />
        </div>
        <div style={{marginTop: '10px'}}>
          <GridSelector value={freqSpec} options={freqSpecOptions} onChange={setFreqSpec} color='#333' bgColor='#dfe3eb' cellWidth={30} cellHeight={25} />
        </div>
        <div style={{position: 'absolute', top: 142, left: 64}}><FrequencyKnob label="Frequency" width={60} value={frequency} onChange={setFrequency} min={(freqSpec === 'h') ? HI_FREQ_MIN : LOW_FREQ_MIN} max={(freqSpec === 'h') ? HI_FREQ_MAX : LOW_FREQ_MAX} /></div>
        <div style={{position: 'absolute', top: 224, left: 64, fontSize: 12}}><FrequencyKnob label="FM Scale" width={40} value={fmScale} onChange={setFmScale} min={(freqSpec === 'h') ? HI_FREQ_MIN : LOW_FREQ_MIN} max={(freqSpec === 'h') ? HI_FREQ_MAX : LOW_FREQ_MAX} /></div>
      </BlockRoot>
    );
  }
}

export default class Oscillator {
  constructor(audioContext, viewContainer, settings) {
    const oscNode = audioContext.createOscillator();
    const fmScalerNode = audioContext.createGain();
    fmScalerNode.connect(oscNode.frequency);

    this.inputs = {
      // 'pitch': {type: 'audio', node: undefined}, 1/oct
      'fm': {type: 'audio', node: fmScalerNode},
    };
    this.outputs = {
      'audio': {type: 'audio', node: oscNode},
    };

    let waveform;
    let freqSpec;
    let frequency;
    let fmScale;
    let renderReady = false;

    const setWaveform = (v) => {
      waveform = v;
      oscNode.type = waveform;
      render();
    };

    const setFreqSpec = (v) => {
      if (v === 'l') {
        if (freqSpec === 'h') {
          setFrequency(frequency/HI_LOW_FREQ_RATIO);
          setFmScale(fmScale/HI_LOW_FREQ_RATIO);
        }
      } else if (v === 'h') {
        if (freqSpec === 'l') {
          setFrequency(frequency*HI_LOW_FREQ_RATIO);
          setFmScale(fmScale*HI_LOW_FREQ_RATIO);
        }
      } else {
        throw new Error('invalid freqSpec value');
      }

      freqSpec = v;
      render();
    }

    const setFrequency = (v) => {
      frequency = v;
      oscNode.frequency.value = frequency;
      render();
    };

    const setFmScale = (v) => {
      fmScale = v;
      fmScalerNode.gain.value = fmScale;
      render();
    };

    const render = () => {
      if (renderReady) {
        ReactDOM.render(<View waveform={waveform} setWaveform={setWaveform} freqSpec={freqSpec} setFreqSpec={setFreqSpec} frequency={frequency} setFrequency={setFrequency} fmScale={fmScale} setFmScale={setFmScale} />, viewContainer);
      }
    }

    if (!settings) {
      settings = {
        w: 'sine',
        fs: 'h',
        f: 440,
        fm: 100,
      }
    }

    // Backward compatibility
    if (settings.fs === undefined) {
      settings.fs = (settings.f) > 16 ? 'h' : 'l';
    }

    setWaveform(settings.w);
    setFreqSpec(settings.fs);
    setFrequency(settings.f);
    setFmScale(settings.fm);

    oscNode.start();
    renderReady = true;
    render();

    this.save = () => {
      return {
        w: waveform,
        fs: freqSpec,
        f: frequency,
        fm: fmScale,
      };
    };

    this.destroy = () => {
      ReactDOM.unmountComponentAtNode(viewContainer);
    };
  }
}

Oscillator.blockName = 'Oscillator';
Oscillator.helpText =
`Oscillator is an oscillator with switchable waveform and linear FM input.

The available waveforms are sine (SIN), triangle, (TRI), square (SQR), sawtooth (SAW).

The fm input is scaled by the FM Scale panel setting and then added to the oscillator frequency in hertz. So for example, if an audio signal in the range [-1,1] is connected to the fm input, and the FM Scale is set to 100 hz, the oscillator frequency will be modulated between 100hz up and 100hz down.`;
