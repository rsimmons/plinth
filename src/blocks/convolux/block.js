const template = require('./template.html');

export default class Convolux {
  constructor(audioContext, viewContainer, settings) {
    // Create and connect up nodes
    const splitterNode = audioContext.createGain();
    splitterNode.gain.value = 1;

    const convolverNode = audioContext.createConvolver();
    convolverNode.normalize = true;

    const dryGainNode = audioContext.createGain();

    const wetGainNode = audioContext.createGain();

    const mergerNode = audioContext.createGain();
    mergerNode.gain.value = 1;

    splitterNode.connect(convolverNode);
    splitterNode.connect(dryGainNode);
    convolverNode.connect(wetGainNode);
    dryGainNode.connect(mergerNode);
    wetGainNode.connect(mergerNode);

    // Settings
    const responses = [];
    let activeResponseIdx = null; // index into responses
    let wetness; // dry/wet setting
    let bypass; // boolean

    const updateGains = () => {
      if (bypass || (activeResponseIdx === null)) {
        dryGainNode.gain.value = 1;
        wetGainNode.gain.value = 0;
      } else {
        dryGainNode.gain.value = Math.sqrt(1 - wetness);
        wetGainNode.gain.value = Math.sqrt(wetness);
      }
    };

    const setWetness = (v) => {
      wetness = v;
      if ((wetness < 0) && (wetness > 1)) {
        throw new Error('internal error');
      }        
      updateGains();
      dryWetElem.value = v;
    };

    const setBypass = (v) => {
      bypass = v;
      if (typeof(bypass) !== 'boolean') {
        throw new Error('internal error');
      }
      updateGains();
      // TODO: update bypass control when it exists
    };

    const setActiveResponse = (idx) => {
      if (idx === null) {
        activeResponseIdx = idx;
        convolverNode.buffer = null; // probably not necessary but might catch bugs
      } else {
        const rb = responses[idx].responseBuffer;
        if (rb) {
          activeResponseIdx = idx;
          convolverNode.buffer = rb;
        } else {
          console.warn('Warning: Can\'t switch to response, buffer is missing');
        }
      }
      responseSelectElem.value = activeResponseIdx;
      updateResponseInfo();
      updateGains(); // because null/non-null repsonse changes gains
    };

    const addResponse = (name, responseFileData, makeActive) => {
      const responseInfo = {
        name,
        responseBuffer: null, // null means still loading
        responseFileData,
      };
      const addedIdx = responses.length;
      responses.push(responseInfo);

      updateResponseSelector();

      audioContext.decodeAudioData(responseFileData, (audioBuffer) => {
        // Successfully decoded to an AudioBuffer
        responseInfo.responseBuffer = audioBuffer;
        updateResponseSelector();
        if (makeActive) {
          setActiveResponse(addedIdx);
        }
      }, () => {
        console.warn('Failed to decode audio file');
      });
    };

    const removeActiveResponse = () => {
      responses.splice(activeResponseIdx, 1);
      if (responses.length === 0) {
        setActiveResponse(null);
      } else {
        setActiveResponse(activeResponseIdx-1);
      }
      updateResponseSelector();
    };

    this.inputs = {
      'audio': {type: 'audio', node: splitterNode},
    };
    this.outputs = {
      'audio': {type: 'audio', node: mergerNode},
    };

    viewContainer.innerHTML = template;

    const responseSelectElem = viewContainer.querySelector('.response-select');
    const updateResponseSelector = () => {
      responseSelectElem.innerHTML = '';
      for (let i = 0; i < responses.length; i++) {
        const r = responses[i];
        const optionElem = document.createElement('option');
        optionElem.textContent = r.name;
        optionElem.value = i;
        if (!r.responseBuffer) {
          optionElem.disabled = true;
        }
        responseSelectElem.appendChild(optionElem);
      }
      responseSelectElem.value = activeResponseIdx;
    };
    responseSelectElem.addEventListener('input', () => {
      setActiveResponse(+responseSelectElem.value);
    });

    const dryWetElem = viewContainer.querySelector('.dry-wet');
    dryWetElem.addEventListener('input', () => {
      setWetness(+dryWetElem.value);
    });

    const activeResponseNameElem = viewContainer.querySelector('.active-response-name');
    const activeResponseDurationElem = viewContainer.querySelector('.active-response-duration');
    const activeResponseDeleteElem = viewContainer.querySelector('.active-response-delete');
    const updateResponseInfo = () => {
      if (activeResponseIdx === null) {
        activeResponseNameElem.textContent = '';
        activeResponseDurationElem.textContent = ''
         activeResponseDeleteElem.style.visibility = 'hidden';
      } else {
        activeResponseNameElem.textContent = responses[activeResponseIdx].name;
        activeResponseDurationElem.textContent = responses[activeResponseIdx].responseBuffer.duration.toFixed(3) + 's';
        activeResponseDeleteElem.style.visibility = 'visible';
      }
    };

    activeResponseDeleteElem.addEventListener('click', () => {
      removeActiveResponse();
    });

    // Handle drag and drop of IRs
    const dropElem = viewContainer;

    const isFilesTransfer = (dt) => {
      for (const t of dt.types) {
        if (t === 'Files') {
          return true;
        }
      }
    };

    const extractAudioFileFromDataTransfer = (dt) => {
      if (isFilesTransfer(dt)) {
        const files = dt.files;
        const file = files[0];
        if (file.type.startsWith('audio/')) {
          return file;
        }
      }

      return null;
    };

    dropElem.addEventListener('dragover', e => {
      if (isFilesTransfer(e.dataTransfer)) {
        e.dataTransfer.dropEffect = 'copy';
        e.preventDefault();
        e.stopPropagation();
      }
    }, false);

    dropElem.addEventListener('drop', e => {
      const file = extractAudioFileFromDataTransfer(e.dataTransfer);
      if (file) {
        e.preventDefault();
        e.stopPropagation();

        // Got what appears to be audio, try decoding it
        const reader = new FileReader();
        reader.onload = () => {
          addResponse(file.name, reader.result, true);
        }
        reader.readAsArrayBuffer(file);
      }
    }, false);

    // Load settings or defaults
    if (!settings) {
      settings = {
        responses: [],
        activeResponseIdx: null,
        bypass: false,
        wetness: 0.5,
      };
    }

    // Enact settings
    for (let ri = 0; ri < settings.responses.length; ri++) {
      addResponse(settings.responses[ri].name, settings.responses[ri].responseFileData, (ri === settings.activeResponseIdx));
    }
    updateResponseSelector();
    if (activeResponseIdx === null) {
      setActiveResponse(null);
    }
    setWetness(settings.wetness);
    setBypass(settings.bypass);

    this.save = () => {
      return {
        responses: responses.map(r => ({name: r.name, responseFileData: r.responseFileData})),
        activeResponseIdx,
        bypass,
        wetness,
      };
    };
  }
}

Convolux.blockName = 'Convolux';
Convolux.helpText =
`Convolux is an audio convolver, typically used for applying reverb.

A special audio sample called an "impulse response" is used to capture the sound of a space. An impulse response sounds like a single loud click or clap recorded in a reverberating space. Using that impulse response, the same reverberation can be applied to any audio you want using a process called "convolution".

To load an impulse repsonse into Convolux, drag and drop the audio file onto the Convolux panel. Multiple responses can be added, and switched betweeb using the dropdown menu. The Dry↔Wet slider sets the mix between between the original "dry" input sound and the "wet" convolved sound in the output.

Many impulse responses can be found for free on the internet. Also, percussive samples such as cymbals, snares, and claps can be used as impulse responses to get unusual reverb-type sounds.`;
