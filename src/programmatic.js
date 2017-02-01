import BigBen from './blocks/bigben/block';
import Thumper from './blocks/thumper/block';
import Scope from './blocks/scope/block';
import applyPolyfills from './polyfills';

applyPolyfills();

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Instantiate some blocks
const bigBen = new BigBen(document, audioContext);
const thumper = new Thumper(document, audioContext);
const scope = new Scope(document, audioContext);

// Place the block panel elements in the DOM.
const container = document.querySelector('#block-container');
for (const panel of [bigBen.panelView, thumper.panelView, scope.panelView]) {
  container.appendChild(panel);
}

// Connect up the blocks to each other.
bigBen.outputs.gate4.subscribe(thumper.inputs.gate.notify); // returns a “disconnect” closure that we discard here
thumper.outputs.audio.node.connect(scope.inputs.audio.node);
scope.outputs.audio.node.connect(audioContext.destination);
