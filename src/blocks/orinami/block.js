export default class Orinami {
  constructor(document, audioContext, settings) {
    const MIN_STAGES = 0;
    const INIT_STAGES = 4;

    let inputGainLow;

    const inputGainNode = audioContext.createGain();
    inputGainNode.gain.value = 1.0;
    const shaperNode = audioContext.createWaveShaper();
    shaperNode.oversample = 'none';

    inputGainNode.connect(shaperNode);

    const setNumStages = (stages) => {
      const points = 2*(stages + 1);
      const curve = new Float32Array(points);
      for (let i = 0; i < points; i++) {
        curve[i] = ((stages + i) % 2) ? 1 : -1;
      }
      shaperNode.curve = curve;
      inputGainLow = 1.0/(points-1);
      // TODO: get inputGainNode gain based on inputGainLow and current Amount setting
      this.stages = stages;
    };

    if (settings) {
      setNumStages(settings.st);
    } else {
      setNumStages(INIT_STAGES);
    }

    this.inputs = {
      'audio': {type: 'audio', node: inputGainNode}
    };
    this.outputs = {
      'audio': {type: 'audio', node: shaperNode},
    };

    const tmpElem = document.createElement('div');
    tmpElem.innerHTML = '<div style="box-sizing: border-box; width: 126px; height: 256px; padding: 5px; background-color: white;"><div>Orinami</div><div><label>Stages <input type="number" value="' + this.stages + '" min="' + MIN_STAGES + '" step="1" style="width: 50px" /></label></div></div>';
    this.panelView = tmpElem.childNodes[0];

    this.panelView.querySelector('input').addEventListener('input', (e) => {
      const st = parseInt(e.target.value, 10);
      if (!isNaN(st)) {
        const fst = Math.floor(st);
        if (fst >= MIN_STAGES) {
          setNumStages(fst);
        }
      }
    }, false);
  }

  save() {
    return {
      st: this.stages,
    };
  }
}

Orinami.blockName = 'Orinami';
Orinami.helpText =
`Orinami (折り波) is a wavefolder. It stretches and folds input waveforms in the amplitude dimension, introducing extremely non-linear distortion.

Orinami first increases the amplitude of its input audio, and then any parts of the resulting waveform that exceed certain limits (the range -1 to 1) are "folded" back over those limits. In other words, when the waveform hits the limit, its direction is reversed to keep it within the range -1 to 1. A waveform visualizer (such as Scope) is useful to understand what's going on.

If an input waveform has a low amplitude, it may not hit the thresholds for folding, and just have its amplitude increased.

Orinami has a control to set the number of "stages". Increasing numbers of stages cause more stretching and folding, and hence more distortion.`;
