import queryString from 'query-string';
import FileSaver from 'file-saver';
import LZString from 'lz-string';
import applyPolyfills from './polyfills';
import initWebAudio from './initWebAudio';
import {presetSaveToBlob, presetLoadFromArrayBuffer, presetSaveToJSONIfNoBlobs, presetLoadFromJSON} from './presetSerialization';

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
  'remark',
  'scope',
  'thumper',
  'verbatim',
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

function loadEmptyRack() {
  const EMPTY_RACK_SETTINGS = {"bm":{"ro":{"b":"__ro","s":{"p":{"audio":{"t":"audio"}}},"n":"Rack Outputs"},"b1":{"b":"remark","s":{"t":"WELCOME TO PLINTH!\n\nSome tips to get you started:\n- Drag blocks from the block palette on the left into the rack area on the right.\n- Press the Flip button (or space bar) to show the back view of the rack, where you can click or drag to wire connections between block ports.\n- To remove wires, toggle Delete Wires mode and click on them.\n- Click on any block in the palette for help.\n- To hear something, connect an audio generating block (such as Waverly) to the Rack Outputs block audio port.\n- Unwanted blocks can be deleted with the small X button in the back view. Once you've read this, feel free to delete this block.\n\nHappy patching!"},"n":"Remark"}},"bo":["b1","ro"],"c":[]};
  loadRootBlock('racket', EMPTY_RACK_SETTINGS);
}

const loadScreenElem = document.querySelector('#load-screen');
const loadScreenCloseButtonElem = document.querySelector('#load-screen-close-button');

const LOAD_SCREEN_FADE_TIME = 0.15;

function showLoadScreen() {
  if (rootBlockInst) {
    loadScreenCloseButtonElem.style.visibility = 'visible';
  } else {
    loadScreenCloseButtonElem.style.visibility = 'hidden';
  }

  loadScreenElem.style.transition = 'visibility 0s,opacity ' + LOAD_SCREEN_FADE_TIME + 's linear';
  loadScreenElem.style.visibility = 'visible';
  loadScreenElem.style.opacity = '1';
  loadScreenElem.style.pointerEvents = 'auto';
}

function hideLoadScreen() {
  loadScreenElem.style.transition = 'visibility 0s linear ' + LOAD_SCREEN_FADE_TIME + 's,opacity ' + LOAD_SCREEN_FADE_TIME + 's linear';
  loadScreenElem.style.visibility = 'hidden';
  loadScreenElem.style.opacity = '0';
  loadScreenElem.style.pointerEvents = 'none';
}

loadScreenCloseButtonElem.addEventListener('click', e => {
  e.preventDefault();
  hideLoadScreen();
});

document.querySelector('#load-empty-rack-button').addEventListener('click', e => {
  e.preventDefault();
  loadEmptyRack();
  hideLoadScreen();
});

const loadPresetFileChooserElem = document.querySelector('#load-preset-file-chooser');
loadPresetFileChooserElem.addEventListener('change', e => {
  e.preventDefault();

  const files = loadPresetFileChooserElem.files;
  if (files.length < 1) {
    // No file chosen
    return;
  }
  const file = files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    // TODO: various error handling
    const presetArrayBuffer = e.target.result;
    console.time('preset load');
    const {blockClassId, settings} = presetLoadFromArrayBuffer(presetArrayBuffer);
    console.timeEnd('preset load');
    loadRootBlock(blockClassId, settings);
    hideLoadScreen();
  };
  reader.readAsArrayBuffer(file);
});

document.querySelector('#new-patch-button').addEventListener('click', e => {
  e.preventDefault();
  showLoadScreen();
});

const linkScreenElem = document.querySelector('#link-screen');
const linkScreenURLElem = document.querySelector('#link-screen textarea');
const linkURLLengthElem = document.querySelector('#link-url-length');

const showLinkScreen = (url) => {
  linkScreenURLElem.value = url;
  linkURLLengthElem.textContent = url.length;
  linkScreenElem.style.display = 'block';
};

const hideLinkScreen = () => {
  linkScreenElem.style.display = 'none';
};

linkScreenElem.addEventListener('click', (e) => {
  if (e.target === linkScreenElem) {
    hideLinkScreen();
  }
}, false);

document.querySelector('#link-preset-button').addEventListener('click', e => {
  e.preventDefault();

  const settings = rootBlockInst.save(); // blocks don't always have save method, but here we assume it does
  const presetJSON = presetSaveToJSONIfNoBlobs(rootBlockClassId, settings);

  if (presetJSON) {
    const compressedPresetJSON = LZString.compressToEncodedURIComponent(presetJSON);
    const url = location.href + '#' + queryString.stringify({ // TODO: make sure location.href has no hash?
      a: 'preset',
      p: compressedPresetJSON,
    });
    showLinkScreen(url);
  } else {
    // TODO: handle this better
    alert('Can\'t make links to patches that include samples');
  }
});

document.querySelector('#save-preset-button').addEventListener('click', e => {
  e.preventDefault();

  const settings = rootBlockInst.save(); // blocks don't always have save method, but here we assume it does

  console.time('preset save');
  const presetBlob = presetSaveToBlob(rootBlockClassId, settings);
  console.timeEnd('preset save');

  const datetimeStr = (new Date()).toISOString().replace(/[-:.ZT]/g, '').substring(0, 14);
  FileSaver.saveAs(presetBlob, 'preset_' + datetimeStr + '.plinth');
});

const loadPresetFromURL = (url) => {
  const req = new XMLHttpRequest();
  req.open('GET', url, true);
  req.responseType = 'arraybuffer';
  req.onload = (event) => {
    const presetArrayBuffer = req.response;
    const {blockClassId, settings} = presetLoadFromArrayBuffer(presetArrayBuffer);
    loadRootBlock(blockClassId, settings);
    hideLoadScreen();
  };
  req.send(null);
};

const DEMO_RACKS = [
  {
    id: 'kick',
    title: 'Simple Kick',
  },
  {
    id: 'blips',
    title: 'Blips',
  },
];

const loadDemoId = (id) => {
  loadPresetFromURL('demo_racks/' + id + '.plinth');
};

const handleLoadDemoClick = (e) => {
  e.preventDefault();
  loadDemoId(e.target.dataset.demoid);
};

const demoRacksContainerElem = document.querySelector('#load-screen-demo-patches-container');
for (const rack of DEMO_RACKS) {
  const el = document.createElement('button');
  el.className = 'load-screen-buttony';
  el.textContent = 'Demo / ' + rack.title;
  el.dataset.demoid = rack.id;
  el.addEventListener('click', handleLoadDemoClick, false);
  demoRacksContainerElem.appendChild(el);
}

const handleLocationHash = () => {
  if (location.hash && (location.hash.length > 0)) {
    const parsed = queryString.parse(location.hash);
    history.replaceState({}, document.title, location.href.substr(0, location.href.length-location.hash.length));
    switch (parsed.a) {
      case 'demo':
        loadDemoId(parsed.i);
        break;

      case 'preset':
        const presetJSON = LZString.decompressFromEncodedURIComponent(parsed.p);
        const {blockClassId, settings} = presetLoadFromJSON(presetJSON);
        loadRootBlock(blockClassId, settings);
        hideLoadScreen();
        break;

      default:
        // do nothing
    }
  }
}

handleLocationHash();
