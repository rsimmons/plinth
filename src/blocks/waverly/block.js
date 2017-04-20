import React from 'react'
import ReactDOM from 'react-dom';
import BlockRoot from '../../components/BlockRoot';
import GridSelector from '../../components/GridSelector';
import NumericTextInput from '../../components/NumericTextInput';

class View extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {waveform, setWaveform, frequency, setFrequency, fmScale, setFmScale} = this.props;
    const waveformOptions = [
      {value: 'sine', label: 'SIN'},
      {value: 'triangle', label: 'TRI'},
      {value: 'square', label: 'SQR'},
      {value: 'sawtooth', label: 'SAW'},
    ];

    return (
      <BlockRoot widthUnits={2} extraStyles={{padding: '10px', background: '#dfe3eb', fontSize: 14}}>
        <div>
          <GridSelector label="Waveform" value={waveform} options={waveformOptions} onChange={setWaveform} color='#333' bgColor='#dfe3eb' cellWidth={40} cellHeight={25} />
        </div>
        <div style={{marginTop: '10px'}}><NumericTextInput label="Frequency" value={frequency} onChange={setFrequency} min={0} unit="hz" /></div>
        <div style={{marginTop: '10px'}}><NumericTextInput label="FM Scale" value={fmScale} onChange={setFmScale} /></div>
      </BlockRoot>
    );
  }
}

export default class Waverly {
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
    let frequency;
    let fmScale;
    let renderReady = false;

    const setWaveform = (v) => {
      waveform = v;
      oscNode.type = waveform;
      render();
    };

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
        ReactDOM.render(<View waveform={waveform} setWaveform={setWaveform} frequency={frequency} setFrequency={setFrequency} fmScale={fmScale} setFmScale={setFmScale} />, viewContainer);
      }
    }

    if (!settings) {
      settings = {
        w: 'sine',
        f: 440,
        fm: 100,
      }
    }

    setWaveform(settings.w);
    setFrequency(settings.f);
    setFmScale(settings.fm);

    oscNode.start();
    renderReady = true;
    render();

    this.save = () => {
      return {
        w: waveform,
        f: frequency,
        fm: fmScale,
      };
    };

    this.destroy = () => {
      ReactDOM.unmountComponentAtNode(viewContainer);
    };
  }
}

Waverly.blockName = 'Waverly';
Waverly.helpText =
`Waverly is a oscillator with switchable waveform and linear FM input.

The available waveforms are sine (SIN), triangle, (TRI), square (SQR), sawtooth (SAW).

The fm input is scaled by the FM Scale panel setting and then added to the oscillator frequency in hertz. So for example, if an audio signal in the range [-1,1] is connected to the fm input, and the FM Scale is set to 100, the oscillator frequency will be modulated between 100hz up and 100hz down.`;
