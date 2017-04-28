import React from 'react'
import ReactDOM from 'react-dom';
import BlockRoot from '../../components/BlockRoot';
import Knob from '../../components/Knob';

class View extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {stages, setStages, smoothness, setSmoothness} = this.props;

    return (
      <BlockRoot widthUnits={1} extraStyles={{position: 'relative', padding: '10px', background: '#b2d9d8', fontSize: 14}}>
        <div style={{position: 'absolute', top: 78, left: 31}}><Knob label="Stages" width={58} value={stages} onChange={setStages} integral={true} min={0} max={8} /></div>
        <div style={{position: 'absolute', top: 178, left: 31}}><Knob label="Smooth" width={58} value={smoothness} onChange={setSmoothness} integral={true} min={0} max={6} /></div>
      </BlockRoot>
    );
  }
}

export default class Wavefolder {
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

    let stages = 0;
    let smoothness = 0;
    let inputGainLow;
    let renderReady = false;

    const recomputeCurve = () => {
      const points = Math.pow(2, smoothness+1)*(2*stages + 1) + 1
      const curve = new Float32Array(points);
      for (let i = 0; i < points; i++) {
        const x = (2*stages + 1)*Math.PI*(i/(points-1) - 0.5);
        curve[i] = Math.sin(x);
      }

      shaperNode.curve = curve;
      inputGainLow = 1.0/(points-1);
      // TODO: get inputGainNode gain based on inputGainLow and current Amount setting
    };

    const setStages = (v) => {
      if (isNaN(v) || (v < 0)) {
        return;
      }
      stages = v;

      recomputeCurve();

      render();
    };

    const setSmoothness = (v) => {
      if (isNaN(v) || (v < 0)) {
        return;
      }
      smoothness = v;

      recomputeCurve();

      render();
    };

    const render = () => {
      if (renderReady) {
        ReactDOM.render(<View stages={stages} setStages={setStages} smoothness={smoothness} setSmoothness={setSmoothness} />, viewContainer);
      }
    }

    if (!settings) {
      settings = {
        st: 4,
        sm: 6,
      };
    } else {
      // Backwards compat
      if (settings.sm === undefined) {
        settings.sm = 0;
      }
    }

    setStages(settings.st);
    setSmoothness(settings.sm);

    renderReady = true;
    render();

    this.save = () => {
      return {
        st: stages,
        sm: smoothness,
      };
    }

    this.destroy = () => {
      ReactDOM.unmountComponentAtNode(viewContainer);
    };
  }
}

Wavefolder.blockName = 'Wavefolder';
Wavefolder.helpText =
`Wavefolder stretches and folds input waveforms in the amplitude dimension, introducing extremely non-linear distortion.

Wavefolder first increases the amplitude of its input audio, and then any parts of the resulting waveform that exceed certain limits (the range -1 to 1) are "folded" back over those limits. In other words, when the waveform hits the limit, its direction is reversed to keep it within the range -1 to 1. Depending on the setting of the Smooth parameter, this fold maybe be hard/immediate) or soft/rounded. A waveform visualizer (such as Scope) is useful to understand what's going on.

If an input waveform has a low amplitude, it may not hit the thresholds for folding, and just have its amplitude increased.

The Stages control determines the maximum amount of stretching/folding (and hence distortion) that can occur.

The Smooth control determines whether folding is smoothed out or not. Smooth folding will produce less harmonics and aliasing artifacts.

It's recommended to use low-harmonic waveforms (sine and triangle) as inputs.
`;
