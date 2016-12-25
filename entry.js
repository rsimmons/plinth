import BeatClock from './blocs/beatclock/BeatClock';
import DrumSynth from './blocs/drumsynth/DrumSynth';
import htmlToElement from './util/htmlToElement';

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Instantiate some blocs
const beatClock = new BeatClock(document, audioContext);
const drumSynth = new DrumSynth(document, audioContext);
// const reverb = new Reverb(document, audioContext);

// Place the bloc panel elements in the DOM.
const container = document.querySelector('#bloc-container');
for (const panel of [beatClock.panel, drumSynth.panel]) {
  const wrapper = htmlToElement(document, '<div style="border-top: 20px solid #ccc;"></div>');
  wrapper.appendChild(panel);
  container.appendChild(wrapper);
}

// Connect up the blocs to each other.
beatClock.outputs.gate4.subscribe(drumSynth.inputs.gate.notify); // returns a “disconnect” closure that we discard here
drumSynth.outputs.audio.node.connect(audioContext.destination);

// drumSynth.outputs.audio.node.connect(reverb.inputs.audio.node);
// reverb.outputs.audio.node.connect(audioContext.destination); // we could alternatively use a special “final output” bloc

