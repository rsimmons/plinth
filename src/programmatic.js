import Clock from './blocks/clock/block';
import Kick from './blocks/kick/block';
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
const clock = new Clock(audioContext, makeContainer());
const kick = new Kick(audioContext, makeContainer());
const scope = new Scope(audioContext, makeContainer());

// Connect up the blocks to each other.
clock.outputs.gate4.subscribe(kick.inputs.gate.notify); // returns a “disconnect” closure that we discard here
kick.outputs.audio.node.connect(scope.inputs.audio.node);
scope.outputs.audio.node.connect(audioContext.destination);
