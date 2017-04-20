import React from 'react'
import ReactDOM from 'react-dom';
import BlockRoot from '../../components/BlockRoot';
import GridSelector from '../../components/GridSelector';
import TimeKnob from '../../components/TimeKnob';

const Fastidious = require('fastidious-envelope-generator');

class View extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {mode, setMode, riseTime, setRiseTime, fallTime, setFallTime} = this.props;
    const modeOptions = [
      {value: 'AD', label: '/\\'},
      {value: 'ASR', label: '/‾‾\\'},
    ];

    return (
      <BlockRoot widthUnits={2} extraStyles={{position: 'relative', padding: '10px', background: '#ddd', fontSize: '14px', textAlign: 'center'}}>
        <GridSelector label="Mode" value={mode} options={modeOptions} onChange={setMode} color='#333' bgColor='#ddd' cellWidth={40} cellHeight={25} />
        <div style={{position: 'absolute', top: 108, left: 63}}><TimeKnob label="Rise Time" width={58} value={riseTime} onChange={setRiseTime} min={0.001} max={30} /></div>
        <div style={{position: 'absolute', top: 204, left: 63}}><TimeKnob label="Fall Time" width={58} value={fallTime} onChange={setFallTime} min={0.001} max={30} /></div>
      </BlockRoot>
    );
  }
}

export default class Egen {
  constructor(audioContext, viewContainer, settings) {
    // Create a value that outputs a constant 1, which we modulate by the gain to provide final output
    const constantBuffer = audioContext.createBuffer(1, 2, audioContext.sampleRate);
    const constantData = constantBuffer.getChannelData(0);
    constantData[0] = 1;
    constantData[1] = 1;
    const constantNode = audioContext.createBufferSource();
    constantNode.buffer = constantBuffer;
    constantNode.loop = true;
    constantNode.start();

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0;

    constantNode.connect(gainNode);

    const fast = new Fastidious(audioContext, gainNode.gain);

    const gateNotify = (time, value) => {
      fast.gate(value, time);
    };

    this.inputs = {
      'gate': {type: 'gateEvent', notify: gateNotify},
    };
    this.outputs = {
      'audio': {type: 'audio', node: gainNode},
    };

    let renderReady = false;

    const setMode = (v) => {
      fast.mode = v;
      render();
    };

    const setRiseTime = (v) => {
      fast.attackTime = v;
      render();
    };

    const setFallTime = (v) => {
      fast.decayTime = v;
      fast.releaseTime = v;
      render();
    };

    const render = () => {
      if (renderReady) {
        ReactDOM.render(<View mode={fast.mode} setMode={setMode} riseTime={fast.attackTime} setRiseTime={setRiseTime} fallTime={fast.decayTime} setFallTime={setFallTime} />, viewContainer);
      }
    }

    // Load settings or defaults
    if (!settings) {
      settings = {
        m: 'AD',
        rt: 0.01,
        ft: 0.1,
        fs: Fastidious.EXPONENTIAL,
      };
    }

    // Enact settings
    setMode(settings.m);
    setRiseTime(settings.rt);
    setFallTime(settings.ft);

    renderReady = true;
    render();

    this.save = () => {
      return {
        m: fast.mode,
        rt: fast.attackTime,
        ft: fast.decayTime,
      };
    };

    this.destroy = () => {
      ReactDOM.unmountComponentAtNode(viewContainer);
    };
  }
}

Egen.blockName = 'Egen';
Egen.helpText =
`Egen is a multi-mode envelope generator.

Egen has a single gate-type input and a single audio-type output. Generally speaking, as the input gate signal turns on and off, the output value makes gradual transitions back and forth between 0 and 1.

Egen has two modes: attack-decay (/\\ shape) and attack-sustain-release (/‾‾\\ shape).

In attack-decay mode, as soon as the output value reaches 1 (end of attack phase), it immediately starts transitioning back to 0 (decay phase). Even if the gate goes off during the attack phase, the attack phase will continue uninterrupted. This means that it only matters when the input gate goes on, not when it goes off. Attack-decay mode is sometimes referred to as "trigger" mode, and is useful for generating percussive sounds that always have the same envelope shape regardless of how long the gate is held high.

In attack-sustain-release mode, the output value starts moving towards 1 when the gate goes on (attack phase). If it reaches 1 while the gate is still on, it stays at 1 (sustain phase). When the gate goes off, the output value starts moving towards 0 (release phase). If the gate goes off during attack phase, the envelope will immediately enter release phase and decay towards 0.

For all envelope types, if the gate goes high during the falling phase (decay or release), a new attack will begin from the current output value. In other words, the envelope will restart WITHOUT dropping to 0 and the output will not have any sudden jumps.

The Rise control sets the speed of the attack phase, i.e. how quickly the envelope transitions towards 1. The attack shape is almost-linear.

The Fall control sets the speed of the decay and release phases, i.e. how quickly the envelope transitions towards 0. The fall shape is an exponential decay, which tends to sound like natural sounds.

Tip: Very fast envelopes that rise and fall in less than the time of a single audio wave cycle can be used to make "click" sounds.`;
