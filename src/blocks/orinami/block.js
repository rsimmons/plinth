import React from 'react'
import ReactDOM from 'react-dom';
import BlockRoot from '../../components/BlockRoot';
import Knob from '../../components/Knob';

class View extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {stages, setStages} = this.props;

    return (
      <BlockRoot widthUnits={1} extraStyles={{position: 'relative', padding: '10px', background: '#b2d9d8', fontSize: 14}}>
        <div style={{position: 'absolute', top: 128, left: 31}}><Knob label="Stages" width={58} value={stages} onChange={setStages} integral={true} min={0} max={8} /></div>
      </BlockRoot>
    );
  }
}

export default class Orinami {
  constructor(audioContext, viewContainer, settings) {
    const inputGainNode = audioContext.createGain();
    inputGainNode.gain.value = 1.0;
    const shaperNode = audioContext.createWaveShaper();
    shaperNode.oversample = 'none';
    inputGainNode.connect(shaperNode);

    this.inputs = {
      'audio': {type: 'audio', node: inputGainNode}
    };
    this.outputs = {
      'audio': {type: 'audio', node: shaperNode},
    };

    let stages;
    let inputGainLow;
    let renderReady = false;

    const setStages = (v) => {
      if (isNaN(v) || (v < 0)) {
        return;
      }
      stages = v;

      const points = 2*(stages + 1);
      const curve = new Float32Array(points);
      for (let i = 0; i < points; i++) {
        curve[i] = ((stages + i) % 2) ? 1 : -1;
      }
      shaperNode.curve = curve;
      inputGainLow = 1.0/(points-1);
      // TODO: get inputGainNode gain based on inputGainLow and current Amount setting

      render();
    };

    const render = () => {
      if (renderReady) {
        ReactDOM.render(<View stages={stages} setStages={setStages} />, viewContainer);
      }
    }

    if (!settings) {
      settings = {
        st: 4,
      };
    }

    setStages(settings.st);

    renderReady = true;
    render();

    this.save = () => {
      return {
        st: stages,
      };
    }

    this.destroy = () => {
      ReactDOM.unmountComponentAtNode(viewContainer);
    };
  }
}

Orinami.blockName = 'Orinami';
Orinami.helpText =
`Orinami (折り波) is a wavefolder. It stretches and folds input waveforms in the amplitude dimension, introducing extremely non-linear distortion.

Orinami first increases the amplitude of its input audio, and then any parts of the resulting waveform that exceed certain limits (the range -1 to 1) are "folded" back over those limits. In other words, when the waveform hits the limit, its direction is reversed to keep it within the range -1 to 1. A waveform visualizer (such as Scope) is useful to understand what's going on.

If an input waveform has a low amplitude, it may not hit the thresholds for folding, and just have its amplitude increased.

Orinami has a control to set the number of "stages". Increasing numbers of stages cause more stretching and folding, and hence more distortion.`;
