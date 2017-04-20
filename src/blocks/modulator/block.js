import React from 'react'
import ReactDOM from 'react-dom';
import BlockRoot from '../../components/BlockRoot';
import Knob from '../../components/Knob';

class View extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {offset, setOffset} = this.props;
    return (
      <BlockRoot widthUnits={1} extraStyles={{position: 'relative', background: '#333', color: '#bbb', fontSize: '14px'}}>
        <div style={{fontSize: 48, textAlign: 'center'}}>X</div>
        <div style={{position: 'absolute', top: 128, left: 31}}><Knob label="Offset" width={58} value={offset} onChange={setOffset} min={-2} max={2} /></div>
      </BlockRoot>
    );
  }
}

export default class Modulator {
  constructor(audioContext, viewContainer, settings) {
    const gainNode = audioContext.createGain();

    this.inputs = {
      'audio': {type: 'audio', node: gainNode},
      'mod': {type: 'audio', node: gainNode.gain},
    };
    this.outputs = {
      'audio': {type: 'audio', node: gainNode},
    };

    let offset;
    let renderReady = false;

    const setOffset = (v) => {
      offset = v;
      gainNode.gain.value = v;
      render();
    }

    const render = () => {
      if (renderReady) {
        ReactDOM.render(<View offset={offset} setOffset={setOffset} />, viewContainer);
      }
    }

    if (!settings) {
      settings = {
        o: 0,
      }
    }
    setOffset(settings.o);

    renderReady = true;
    render();

    this.save = () => {
      return {
        o: offset,
      };
    };

    this.destroy = () => {
      ReactDOM.unmountComponentAtNode(viewContainer);
    };
  }
}

Modulator.blockName = 'Modulator';
Modulator.helpText =
`Modulator is what's typically called a VCA (voltage controlled amplifier), VC Polarizer, Ring Modulator, or Multiplier. It allows one audio-type signal to modulate the amplitude of another.

Modulator has two audio inputs, and one audio output. The output value at any instant is simply the two input values multiplied together. One input is named "audio" and one is named "mod" (for for modulation) because typically one input is fed a listenable audio signal, while the other "mod" input is fed the output of an slower-varying envelope generator or LFO. If both inputs are connected to audio-rate signals, Modulator will act as a ring modulator.

Modulator has one panel control: Mod Offset. This value is summed with the signal (if any) connected to the "mod" input. If nothing is connected to the "mod" input, then Mod Offset lets you manually set the multiplication applied to the "audio" input. Keep in mind that mod can be negative, so this lets you invert signals as well.`;
