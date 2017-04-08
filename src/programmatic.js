import BigBen from './blocks/bigben/block';
import Thumper from './blocks/thumper/block';
import Scope from './blocks/scope/block';
import applyPolyfills from './polyfills';
import initWebAudio from './initWebAudio';

applyPolyfills();

const audioContext = initWebAudio(window);

const topContainer = document.querySelector('#block-container');
function makeContainer() {
  const elem = document.createElement('div');
  topContainer.appendChild(elem);
  return elem;
}

// Instantiate some blocks, mounting in container
const bigBen = new BigBen(audioContext, makeContainer());
const thumper = new Thumper(audioContext, makeContainer());
const scope = new Scope(audioContext, makeContainer());

// Connect up the blocks to each other.
bigBen.outputs.gate4.subscribe(thumper.inputs.gate.notify); // returns a “disconnect” closure that we discard here
thumper.outputs.audio.node.connect(scope.inputs.audio.node);
scope.outputs.audio.node.connect(audioContext.destination);
