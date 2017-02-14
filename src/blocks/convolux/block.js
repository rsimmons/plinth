import {encode as b64encode, decode as b64decode} from 'base64-arraybuffer';
const template = require('./template.html');

export default class Convolux {
  constructor(document, audioContext, settings) {
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

    const tmpElem = document.createElement('div');
    tmpElem.innerHTML = template;
    this.panelView = tmpElem.childNodes[0];

    const responseSelectElem = this.panelView.querySelector('.response-select');
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

    const dryWetElem = this.panelView.querySelector('.dry-wet');
    dryWetElem.addEventListener('input', () => {
      setWetness(+dryWetElem.value);
    });

    const activeResponseNameElem = this.panelView.querySelector('.active-response-name');
    const activeResponseDurationElem = this.panelView.querySelector('.active-response-duration');
    const activeResponseDeleteElem = this.panelView.querySelector('.active-response-delete');
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
    const dropElem = this.panelView;

    const dtIsAcceptable = (dt) => {
      return (dt.types.indexOf('Files') >= 0);
    };

    dropElem.addEventListener('dragover', e => {
      if (dtIsAcceptable(e.dataTransfer)) {
        e.dataTransfer.dropEffect = 'copy';
        e.preventDefault();
        e.stopPropagation();
      }
    }, false);

    dropElem.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.types.indexOf('Files') >= 0) {
        const files = e.dataTransfer.files;
        const file = files[0];
        if (file.type.startsWith('audio/')) {
          // Got what appears to be audio, try decoding it
          const reader = new FileReader();
          reader.onload = () => {
            addResponse(file.name, reader.result, true);
          }
          reader.readAsArrayBuffer(file);
        } else {
          console.warn('Dropped file does not appear to be audio, ignoring');
        }
      } else {
        throw new Error('internal error');
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
      addResponse(settings.responses[ri].name, b64decode(settings.responses[ri].responseFileData), (ri === settings.activeResponseIdx));
    }
    updateResponseSelector();
    if (activeResponseIdx === null) {
      setActiveResponse(null);
    }
    setWetness(settings.wetness);
    setBypass(settings.bypass);

    this.save = () => {
      return {
        responses: responses.map(r => ({name: r.name, responseFileData: b64encode(r.responseFileData)})),
        activeResponseIdx,
        bypass,
        wetness,
      };
    };
  }
}

Convolux.blockName = 'Convolux';
