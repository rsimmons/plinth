import React from 'react'
import ReactDOM from 'react-dom';
import BlockRoot from '../../components/BlockRoot';
import GridSelector from '../../components/GridSelector';
import Knob from '../../components/Knob';
import FrequencyKnob from '../../components/FrequencyKnob';
import DecibelsKnob from '../../components/DecibelsKnob';

class View extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {mode, setMode, frequency, setFrequency, resonance, setResonance, gain, setGain, frequencyMod, setFrequencyMod, resonanceMod, setResonanceMod, gainMod, setGainMod} = this.props;
    const modeOptions = [
      {value: 'lowpass', label: 'LP'},
      {value: 'highpass', label: 'HP'},
      {value: 'bandpass', label: 'BP'},
      {value: 'notch', label: 'NT'},
      {value: 'lowshelf', label: 'LS'},
      {value: 'highshelf', label: 'HS'},
      {value: 'peaking', label: 'PK'},
      {value: 'allpass', label: 'AP'},
    ];

    return (
      <BlockRoot widthUnits={3} extraStyles={{position: 'relative', background: '#ddd', fontSize: '14px', padding: 10}}>
        <div style={{textAlign: 'center'}}><GridSelector label="Mode" value={mode} options={modeOptions} onChange={setMode} color='#333' bgColor='#ddd' cellWidth={40} cellHeight={25} /></div>
        <div style={{position: 'absolute', top: 128, left: 32}}><Knob label="Reso" width={50} value={resonance} onChange={setResonance} min={-10} max={30} /></div>
        <div style={{position: 'absolute', top: 215, left: 32, fontSize: 12}}><Knob label="Mod" width={40} value={resonanceMod} onChange={setResonanceMod} min={-40} max={40} /></div>
        <div style={{position: 'absolute', top: 128, left: 95}}><FrequencyKnob label="Frequency" width={60} value={frequency} onChange={setFrequency} min={20} max={20000} /></div>
        <div style={{position: 'absolute', top: 215, left: 95, fontSize: 12}}><Knob label="Mod" width={48} value={frequencyMod} onChange={setFrequencyMod} min={-10} max={10} /></div>
        <div style={{position: 'absolute', top: 128, left: 158}}><DecibelsKnob label="Gain" width={50} value={gain} onChange={setGain} min={-30} max={30} /></div>
        <div style={{position: 'absolute', top: 215, left: 158, fontSize: 12}}><Knob label="Mod" width={40} value={gainMod} onChange={setGainMod} min={-40} max={40} /></div>
      </BlockRoot>
    );
  }
}

export default class Filter {
  constructor(audioContext, viewContainer, settings) {
    const filterNode = audioContext.createBiquadFilter();
    const frequencyModGainNode = audioContext.createGain();
    const resonanceModGainNode = audioContext.createGain();
    const gainModGainNode = audioContext.createGain();

    frequencyModGainNode.connect(filterNode.detune);
    resonanceModGainNode.connect(filterNode.Q);
    gainModGainNode.connect(filterNode.gain);

    this.inputs = {
      'audio': {type: 'audio', node: filterNode},
      'frequency': {type: 'audio', node: frequencyModGainNode},
      'resonance': {type: 'audio', node: resonanceModGainNode},
      'gain': {type: 'audio', node: gainModGainNode},
    };
    this.outputs = {
      'audio': {type: 'audio', node: filterNode},
    };

    let renderReady = false;
    let frequencyMod;

    const setMode = (v) => {
      filterNode.type = v;
      render();
    };

    const setFrequency = (v) => {
      filterNode.frequency.value = v;
      render();
    };

    const setResonance = (v) => {
      filterNode.Q.value = v;
      render();
    };

    const setGain = (v) => {
      filterNode.gain.value = v;
      render();
    };

    const setFrequencyMod = (v) => {
      frequencyMod = v;
      frequencyModGainNode.gain.value = 1200*frequencyMod; // 1200 is to convert octaves into cents
      render();
    };

    const setResonanceMod = (v) => {
      resonanceModGainNode.gain.value = v;
      render();
    };

    const setGainMod = (v) => {
      gainModGainNode.gain.value = v;
      render();
    };

    const render = () => {
      if (renderReady) {
        ReactDOM.render(<View mode={filterNode.type} setMode={setMode} frequency={filterNode.frequency.value} setFrequency={setFrequency} resonance={filterNode.Q.value} setResonance={setResonance} gain={filterNode.gain.value} setGain={setGain} frequencyMod={frequencyMod} setFrequencyMod={setFrequencyMod} resonanceMod={resonanceModGainNode.gain.value} setResonanceMod={setResonanceMod} gainMod={gainModGainNode.gain.value} setGainMod={setGainMod} />, viewContainer);
      }
    }

    // Load settings or defaults
    if (!settings) {
      settings = {
        m: 'lowpass',
        f: 350,
        r: 1,
        g: 0,
        fm: 1,
        rm: 1,
        gm: 1,
      };
    }

    // Enact settings
    setMode(settings.m);
    setFrequency(settings.f);
    setResonance(settings.r);
    setGain(settings.g);
    setFrequencyMod(settings.fm);
    setResonanceMod(settings.rm);
    setGainMod(settings.gm);

    renderReady = true;
    render();

    this.save = () => {
      return {
        m: filterNode.type,
        f: filterNode.frequency.value,
        r: filterNode.Q.value,
        g: filterNode.gain.value,
        fm: frequencyMod,
        rm: resonanceModGainNode.gain.value,
        gm: gainModGainNode.gain.value,
      };
    };

    this.destroy = () => {
      ReactDOM.unmountComponentAtNode(viewContainer);
    };
  }
}

Filter.blockName = 'Filter';
Filter.helpText =
`Filter is a multimode second-order biquad filter, that includes EQ-style modes as well.

The selectable modes are Lowpass (LP), Highpass (HP), Bandpass (BP), Notch (NT), Lowshelf (LS), Highshelf (HS), Peaking (PK), Allpass (AP).

There are three parameters that control the behavior of filters: Frequency, Resonance, and Gain. Resonance does not have any effect in Lowshelf or Highshelf modes. Gain only has an effect in Lowshelf, Highshelf, and Peaking modes. Each of the three parameters has a main panel control to set its value (bigger knobs). Each parameter also has a corresponding input port. The smaller knobs labeled Mod modulate how much of the incoming signal at the input port is added to the parameter value. In other words, the incoming port signal (if any) is multiplied by the Mod value, and then added to the corresponding parameter. The frequency input port is exponentially scaled, in units of octaves. So an incoming signal of -2 would drop the frequency by two octaves.
`;
