
// These are JS code strings, to be eval()'d. We load them directly here
//  to simulate the scenario where they are dynamically loaded from a server
//  or from arbitrary (3rd party) URLs.
const availableBlocCodes = {
  'BeatClock': require('raw!./blocs/beatclock/bundle.js'),
  'DrumSynth': require('raw!./blocs/drumsynth/bundle.js'),
  'Orinami': require('raw!./blocs/orinami/bundle.js'),
  'Racket': require('raw!./blocs/racket/bundle.js'),
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

// This demo page is hard-coded to host a certain "rack" bloc,
//  within which the real action will happen.
const rackBlocCode = availableBlocCodes['Racket'];

// Instantiate the rack bloc, which will let the user dynamically instantiate
//  and connect up other blocs.
const rackBlocClass = eval(rackBlocCode);
const rackBloc = new rackBlocClass(document, audioContext);

// Mount the rack bloc's window view
document.querySelector('#rack-container').appendChild(rackBloc.windowView);
