import FileSaver from 'file-saver';

// These are JS code strings, to be eval()'d. We load them directly here
//  to simulate the scenario where they are dynamically loaded from a server
//  or from arbitrary (3rd party) URLs.
const availableBlockCodes = {
  'Big Ben': require('!raw!./blocks/bigben/bundle.js'),
  'Convolux': require('!raw!./blocks/convolux/bundle.js'),
  'Egen': require('!raw!./blocks/egen/bundle.js'),
  'Gainer': require('!raw!./blocks/gainer/bundle.js'),
  'Orinami': require('!raw!./blocks/orinami/bundle.js'),
  'Racket': require('!raw!./blocks/racket/bundle.js'),
  'Scope': require('!raw!./blocks/scope/bundle.js'),
  'Thumper': require('!raw!./blocks/thumper/bundle.js'),
  'Waverly': require('!raw!./blocks/waverly/bundle.js'),
};

const blockPaletteElem = document.querySelector('#block-palette');
for (const blockName in availableBlockCodes) {
  const el = document.createElement('div');
  el.textContent = blockName;
  el.setAttribute('draggable', true);
  el.className = 'block-palette-item';
  blockPaletteElem.appendChild(el);
  el.addEventListener('dragstart', function(e) {
    e.dataTransfer.setData('text/javascript', availableBlockCodes[blockName]);
  }, false);
}

// Create a Web Audio context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

let rootBlockCode;
let rootBlockClass;
let rootBlockInst;

function loadRootBlock(code, settings) {
  // Unload any current root block
  if (rootBlockInst) {
    rootBlockInst.outputs.audio.node.disconnect(audioContext.destination);
    if (rootBlockInst.deactivate) {
      rootBlockInst.deactivate();
    }
    document.querySelector('#root-container').innerHTML = '';
  }

  rootBlockCode = code;
  rootBlockClass = eval(code);

  // Instantiate the root block, which will let the user dynamically instantiate
  //  and connect up other blocks.
  rootBlockInst = new rootBlockClass(document, audioContext, settings);

  // Mount the root block's window view
  // TODO: Handle case where windowView is undefined
  document.querySelector('#root-container').appendChild(rootBlockInst.windowView);

  // Connect root audio output to context final output
  rootBlockInst.outputs.audio.node.connect(audioContext.destination);
}

function loadEmptyRacket() {
  loadRootBlock(availableBlockCodes['Racket'], undefined);
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
    loadRootBlock(presetObj.code, presetObj.settings);
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
    'code': rootBlockCode,
    'settings': settings,
  };

  const presetJSON = JSON.stringify(presetObj);

  FileSaver.saveAs(new Blob([presetJSON], {type: "application/json;charset=utf-8"}), 'preset.json');
});

loadEmptyRacket();
