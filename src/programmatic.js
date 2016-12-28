import BeatClock from './blocs/beatclock/bloc';
import DrumSynth from './blocs/drumsynth/bloc';
import Orinami from './blocs/orinami/bloc';
import htmlToElement from './util/htmlToElement';

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Instantiate some blocs
const beatClock = new BeatClock(document, audioContext);
const drumSynth = new DrumSynth(document, audioContext);
const orinami = new Orinami(document, audioContext);

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
