import React from 'react'
import ReactDOM from 'react-dom';
import createConstantNode from '../../createConstantNode';
import createEventOutput from '../../createEventOutput';
import BlockRoot from '../../components/BlockRoot';
import Knob from '../../components/Knob';

class View extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {stepData, position, onToggleGate, onSetPitch} = this.props;
    return (
      <BlockRoot widthUnits={4} extraStyles={{position: 'relative', background: '#777', fontSize: 14}}>
        {stepData.map((sd, i) => {
          const active = i === position;
          const stepX = (i % 4)*64 - 1;
          const stepY = Math.floor(i / 4)*128;

          return (
            <div key={i} style={{position: 'absolute', left: stepX, top: stepY}}>
              <button style={{position: 'absolute', background: active ? '#cb390b' : '#999', border: 'none', left: 6, top: 4, width: 52, height: 10, outline: 'none', padding: 0}}></button>
              <button style={{position: 'absolute', background: sd.gate ? '#5cbc5c' : '#999', border: 'none', left: 6, top: 20, width: 52, height: 40, outline: 'none', padding: 0, borderRadius: 2}} onMouseDown={() => onToggleGate(i)} onTouchStart={() => onToggleGate(i)}></button>
              <div style={{position: 'absolute', left: 32, top: 90, fontSize: 12}}><Knob width={52} value={sd.pitch} onChange={(v) => {onSetPitch(i, v)}} integral={true} min={-24} max={24} /></div>
            </div>
          );
        })}
      </BlockRoot>
    );
  }
}

export default class Sequencer {
  constructor(audioContext, viewContainer, settings) {
    // Create a node that outputs a constant 1, which we modulate with subsequent gain nodes to provide final outputs
    const constantNode = createConstantNode(audioContext, 1);

    const pitchOutGainNode = audioContext.createGain();
    pitchOutGainNode.gain.value = 0;
    constantNode.connect(pitchOutGainNode);

    let lastClockGateValue = false;
    const clockInNotify = (time, value) => {
      if (value !== lastClockGateValue) {
        clock(time, value);
      }
      lastClockGateValue = value;
    };

    const [gateOutSubscribe, gateOutEmit] = createEventOutput();

    this.inputs = {
      'clock': {type: 'gateEvent', notify: clockInNotify},
    };
    this.outputs = {
      'gate': {type: 'gateEvent', subscribe: gateOutSubscribe},
      'pitch': {type: 'audio', node: pitchOutGainNode},
    };

    let position = 0;
    let positionPlayed = false;
    let steps = 8;
    let stepData;
    let gateOutput = false;

    const updatePitchOutput = (time) => {
      const v = (1/12)*stepData[position].pitch;
      pitchOutGainNode.gain.setValueAtTime(v, time);
    };

    const clock = (time, value) => {
      if (value) {
        // After a reset (or init), we will not have played the "current" position,
        //  so upon clock, we should not step forward.
        if (positionPlayed) {
          position = (position + 1) % steps;
        }
        positionPlayed = true;

        if (stepData[position].gate) {
          gateOutEmit(time, true);
          gateOutput = true;
        }

        updatePitchOutput(time);
      } else {
        if (gateOutput) {
          gateOutEmit(time, false);
          gateOutput = false;
        }
      }
      render();
    };

    const onToggleGate = (idx) => {
      stepData[idx].gate = !stepData[idx].gate;
      render();
    };

    const onSetPitch = (idx, v) => {
      stepData[idx].pitch = v;
      render();
    };

    let renderReady = false;

    const render = () => {
      if (renderReady) {
        ReactDOM.render(<View stepData={stepData} position={position} onToggleGate={onToggleGate} onSetPitch={onSetPitch} />, viewContainer);
      }
    }

    if (!settings) {
      settings = {
        s: 8,
        sd: [],
      }

      for (let i = 0; i < settings.s; i++) {
        settings.sd[i] = {
          g: false,
          p: 0,
        }
      }
    }

    // Enact settings
    steps = settings.s; // TODO: call setSteps when we have one
    stepData = settings.sd.map(d => ({
      gate: d.g,
      pitch: d.p,
    }));

    updatePitchOutput(0);

    renderReady = true;
    render();

    this.save = () => {
      return {
        s: steps,
        sd: stepData.map(d => ({
          g: d.gate,
          p: d.pitch,
        })),
      };
    };

    this.destroy = () => {
      ReactDOM.unmountComponentAtNode(viewContainer);
    };
  }
}

Sequencer.blockName = 'Sequencer';
Sequencer.helpText =
`
`;
