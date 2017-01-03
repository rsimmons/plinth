import BeatClock from './blocks/beatclock/block';
import DrumSynth from './blocks/drumsynth/block';
import Orinami from './blocks/orinami/block';

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Instantiate some blocks
const beatClock = new BeatClock(document, audioContext);
const drumSynth = new DrumSynth(document, audioContext);
const orinami = new Orinami(document, audioContext);

// Place the block panel elements in the DOM.
const container = document.querySelector('#block-container');
for (const panel of [beatClock.panelView, drumSynth.panelView, orinami.panelView]) {
  const tmpElem = document.createElement('div');
  tmpElem.innerHTML = '<div style="border-top: 20px solid #ccc;"></div>';
  const wrapper = tmpElem.childNodes[0];
  wrapper.appendChild(panel);
  container.appendChild(wrapper);
}

// Connect up the blocks to each other.
beatClock.outputs.gate4.subscribe(drumSynth.inputs.gate.notify); // returns a “disconnect” closure that we discard here
drumSynth.outputs.audio.node.connect(orinami.inputs.audio.node);
orinami.outputs.audio.node.connect(audioContext.destination);
