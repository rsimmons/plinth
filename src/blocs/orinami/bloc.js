import htmlToElement from '../../util/htmlToElement';

export default class Orinami {
  constructor(document, audioContext) {
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
    };

    setNumStages(INIT_STAGES);

    this.inputs = {
      'audio': {type: 'audio', node: inputGainNode}
    };
    this.outputs = {
      'audio': {type: 'audio', node: shaperNode},
    };
    this.panelView = htmlToElement(document, '<div style="box-sizing: border-box; width: 128px; height: 256px; padding: 5px; background-color: white;"><div>Orinami</div><div><label>Stages <input type="number" value="' + INIT_STAGES + '" min="' + MIN_STAGES + '" step="1" style="width: 50px" /></label></div></div>');

    this.panelView.querySelector('input').addEventListener('input', function(e) {
      const st = parseInt(e.target.value, 10);
      if (!isNaN(st)) {
        const fst = Math.floor(st);
        if (fst >= MIN_STAGES) {
          setNumStages(fst);
        }
      }
    }, false);
  }
}

Orinami.blocName = 'Orinami';
