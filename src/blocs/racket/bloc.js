import htmlToElement from '../../util/htmlToElement';

export default class Racket {
  constructor(document, audioContext) {
    const outputNode = audioContext.createGain();

    this.inputs = {
    };
    this.outputs = {
      'audio': {type: 'audio', node: outputNode},
    };

    this.windowView = htmlToElement(document, '<div style="display: flex; flex-wrap: wrap; height: 100%"></div>');

    this.windowView.addEventListener('dragover', function(e) {
      e.dataTransfer.dropEffect = 'copy';
      e.preventDefault();
    }, false);

    this.windowView.addEventListener('drop', e => {
      e.preventDefault();
      const blocCode = e.dataTransfer.getData('text/javascript');
      const blocClass = eval(blocCode);
      const blocInst = new blocClass(document, audioContext);
      // TODO: need to check if bloc has a panel view
      this.windowView.appendChild(blocInst.panelView);
    }, false);

/*
// Place the bloc panel elements in the DOM.
const container = document.querySelector('#bloc-container');
for (const panel of [beatClock.panelView, drumSynth.panelView, orinami.panelView]) {
  const wrapper = htmlToElement(document, '<div style="border-top: 20px solid #ccc;"></div>');
  wrapper.appendChild(panel);
  container.appendChild(wrapper);
}

// Connect up the blocs to each other.
beatClock.outputs.gate4.subscribe(drumSynth.inputs.gate.notify); // returns a “disconnect” closure that we discard here
drumSynth.outputs.audio.node.connect(orinami.inputs.audio.node);
orinami.outputs.audio.node.connect(audioContext.destination);
*/

    // this.panelView.querySelector('input').addEventListener('input', function(e) {
    //   const st = parseInt(e.target.value, 10);
    //   if (!isNaN(st)) {
    //     const fst = Math.floor(st);
    //     if (fst >= MIN_STAGES) {
    //       setNumStages(fst);
    //     }
    //   }
    // }, false);
  }
}
