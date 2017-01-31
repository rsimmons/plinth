import BigBen from './blocks/bigben/block';
import Thumper from './blocks/thumper/block';
import Orinami from './blocks/orinami/block';

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Instantiate some blocks
const bigBen = new BigBen(document, audioContext);
const thumper = new Thumper(document, audioContext);
const orinami = new Orinami(document, audioContext);

// Place the block panel elements in the DOM.
const container = document.querySelector('#block-container');
for (const panel of [bigBen.panelView, thumper.panelView, orinami.panelView]) {
  const tmpElem = document.createElement('div');
  tmpElem.innerHTML = '<div style="border-top: 20px solid #ccc;"></div>';
  const wrapper = tmpElem.childNodes[0];
  wrapper.appendChild(panel);
  container.appendChild(wrapper);
}

// Connect up the blocks to each other.
bigBen.outputs.gate4.subscribe(thumper.inputs.gate.notify); // returns a “disconnect” closure that we discard here
thumper.outputs.audio.node.connect(orinami.inputs.audio.node);
orinami.outputs.audio.node.connect(audioContext.destination);
