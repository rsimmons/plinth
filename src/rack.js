import FileSaver from 'file-saver';
import applyPolyfills from './polyfills';
import initWebAudio from './initWebAudio';

// Shim drag and drop for mobile browsers
var iosDragDropShim = { enableEnterLeave: true };
require('drag-drop-webkit-mobile');

applyPolyfills();

const availableBlockClasses = {}; // maps block class id to block class
[
  'bigben',
  'convolux',
  'egen',
  'gainer',
  'orinami',
  'scope',
  'thumper',
  'waverly',
].forEach(n => {
  availableBlockClasses[n] = require('./blocks/' + n + '/block.js').default; // hacky for now
});

import createRacketWithBlocks from './blocks/racket';
const availableBlockClassesIncludingRacks = Object.assign({}, availableBlockClasses);
availableBlockClassesIncludingRacks['racket'] = createRacketWithBlocks(availableBlockClasses);

// Create a Web Audio context
const audioContext = initWebAudio(window);

let rootBlockClassId;
let rootBlockInst;

function loadRootBlock(blockClassId, settings) {
  // Unload any current root block
  if (rootBlockInst) {
    rootBlockInst.outputs.audio.node.disconnect(audioContext.destination);
    if (rootBlockInst.deactivate) {
      rootBlockInst.deactivate();
    }
    document.querySelector('#root-container').innerHTML = '';
  }

  rootBlockClassId = blockClassId;

  // Instantiate the root block, which will let the user dynamically instantiate
  //  and connect up other blocks.
  rootBlockInst = new (availableBlockClassesIncludingRacks[blockClassId])(document, audioContext, settings);

  // Mount the root block's window view
  // TODO: Handle case where windowView is undefined
  document.querySelector('#root-container').appendChild(rootBlockInst.windowView);

  // Connect root audio output to context final output
  rootBlockInst.outputs.audio.node.connect(audioContext.destination);
}

function loadEmptyRacket() {
  loadRootBlock('racket', undefined);
}

document.querySelector('#load-racket-button').addEventListener('click', e => {
  e.preventDefault();
  loadEmptyRacket();
});

document.querySelector('#load-preset-button').addEventListener('click', e => {
  e.preventDefault();

  const files = document.querySelector('#load-preset-file-chooser').files;
  if (files.length < 1) {
    console.log('no file chosen');
    return;
  }
  const file = files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    // TODO: various error handling
    const presetJSON = e.target.result;
    const presetObj = JSON.parse(presetJSON);
    if (!presetObj.plinthPreset) {
      console.log('not a preset');
    }
    loadRootBlock(presetObj.blockClassId, presetObj.settings);
  };
  reader.readAsText(file, 'utf-8');
});

document.querySelector('#save-preset-button').addEventListener('click', e => {
  e.preventDefault();

  let settings = null;
  if (rootBlockInst.save) {
    settings = rootBlockInst.save();
  } else {
    console.log("Loaded block doesn't support saving settings");
  }

  const presetObj = {
    'plinthPreset': '0.1.0',
    'blockClassId': rootBlockClassId,
    'settings': settings,
  };

  const presetJSON = JSON.stringify(presetObj);

  FileSaver.saveAs(new Blob([presetJSON], {type: "application/json;charset=utf-8"}), 'preset.json');
});

loadEmptyRacket();
