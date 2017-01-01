import FileSaver from 'file-saver';

// These are JS code strings, to be eval()'d. We load them directly here
//  to simulate the scenario where they are dynamically loaded from a server
//  or from arbitrary (3rd party) URLs.
const availableBlocCodes = {
  'BeatClock': require('!raw!./blocs/beatclock/bundle.js'),
  'DrumSynth': require('!raw!./blocs/drumsynth/bundle.js'),
  'Orinami': require('!raw!./blocs/orinami/bundle.js'),
  'Racket': require('!raw!./blocs/racket/bundle.js'),
  'Waverly': require('!raw!./blocs/waverly/bundle.js'),
};

const blocPaletteElem = document.querySelector('#bloc-palette');
for (const blocName in availableBlocCodes) {
  const el = document.createElement('div');
  el.textContent = blocName;
  el.setAttribute('draggable', true);
  el.className = 'bloc-palette-item';
  blocPaletteElem.appendChild(el);
  el.addEventListener('dragstart', function(e) {
    e.dataTransfer.setData('text/javascript', availableBlocCodes[blocName]);
  }, false);
}

// Create a Web Audio context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

let rootBlocCode;
let rootBlocClass;
let rootBlocInst;

function loadRootBloc(code, settings) {
  // Unload any current root bloc
  if (rootBlocInst) {
    rootBlocInst.outputs.audio.node.disconnect(audioContext.destination);
    if (rootBlocInst.deactivate) {
      rootBlocInst.deactivate();
    }
    document.querySelector('#root-container').innerHTML = '';
  }

  rootBlocCode = code;
  rootBlocClass = eval(code);

  // Instantiate the root bloc, which will let the user dynamically instantiate
  //  and connect up other blocs.
  rootBlocInst = new rootBlocClass(document, audioContext, settings);

  // Mount the root bloc's window view
  // TODO: Handle case where windowView is undefined
  document.querySelector('#root-container').appendChild(rootBlocInst.windowView);

  // Connect root audio output to context final output
  rootBlocInst.outputs.audio.node.connect(audioContext.destination);
}

function loadEmptyRacket() {
  loadRootBloc(availableBlocCodes['Racket'], undefined);
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
    if (!presetObj.soniblocPreset) {
      console.log('not a preset');
    }
    loadRootBloc(presetObj.code, presetObj.settings);
  };
  reader.readAsText(file, 'utf-8');
});

document.querySelector('#save-preset-button').addEventListener('click', e => {
  e.preventDefault();

  let settings = null;
  if (rootBlocInst.save) {
    settings = rootBlocInst.save();
  } else {
    console.log("Loaded bloc doesn't support saving settings");
  }

  const presetObj = {
    'soniblocPreset': '0.1.0',
    'code': rootBlocCode,
    'settings': settings,
  };

  const presetJSON = JSON.stringify(presetObj);

  FileSaver.saveAs(new Blob([presetJSON], {type: "application/json;charset=utf-8"}), 'preset.json');
});

loadEmptyRacket();
