import React from 'react'
import ReactDOM from 'react-dom';
import BlockRoot from '../../components/BlockRoot';
import DecibelsKnob from '../../components/DecibelsKnob';
import {decibelsToAmplitudeRatio} from '../../decibels';

class View extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {gain, setGain} = this.props;
    return (
      <BlockRoot widthUnits={1} extraStyles={{position: 'relative', background: '#555', color: '#bbb', fontSize: '14px'}}>
        <div style={{position: 'absolute', top: 128, left: 31}}><DecibelsKnob label="Gain" width={58} value={gain} onChange={setGain} min={-35} max={35} /></div>
      </BlockRoot>
    );
  }
}

export default class Gain {
  constructor(audioContext, viewContainer, settings) {
    const gainNode = audioContext.createGain();

    this.inputs = {
      'audio': {type: 'audio', node: gainNode},
    };
    this.outputs = {
      'audio': {type: 'audio', node: gainNode},
    };

    let gain;
    let renderReady = false;

    const setGain = (v) => {
      gain = v;
      gainNode.gain.value = decibelsToAmplitudeRatio(gain);
      render();
    };

    const render = () => {
      if (renderReady) {
        ReactDOM.render(<View gain={gain} setGain={setGain} />, viewContainer);
      }
    }

    // Load settings or defaults
    if (!settings) {
      settings = {
        g: 0,
      };
    }

    // Enact settings
    setGain(settings.g);

    renderReady = true;
    render();

    this.save = () => {
      return {
        g: gain,
      };
    };

    this.destroy = () => {
      ReactDOM.unmountComponentAtNode(viewContainer);
    };
  }
}

Gain.blockName = 'Gain';
Gain.helpText =
`Gain is a simple manual gain control.

Gain has a a single audio input and single audio output. The incoming signal is amplified (for gain settings above 0) or attenuated (for gain settings less than 0). The typical use of a gain control is to change the volume of an audible signal, but it can also be used to scale control signals`;
