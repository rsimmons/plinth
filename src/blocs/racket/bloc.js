import sha256 from 'js-sha256';
const template = require('raw!./template.html');

function removeChildren(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

export default class Racket {
  constructor(document, audioContext) {
    const outputNode = audioContext.createGain();

    this.inputs = {
    };
    this.outputs = {
      'audio': {type: 'audio', node: outputNode},
    };

    this.windowView = document.createElement('div');
    this.windowView.innerHTML = template;

    const blocContainerElem = this.windowView.querySelector('.bloc-container');
    const patchInputSelectElem = this.windowView.querySelector('.patch-input-select');
    const patchOutputSelectElem = this.windowView.querySelector('.patch-output-select');
    const patchConnectButtonElem = this.windowView.querySelector('.patch-connect-button');

    // We create a sort of fake bloc instance for the rack final audio output, to simplify some things
    const rackAudioOutPseudoBloc = {
      inputs: {
        'audio': {type: 'audio', node: outputNode},
      }
    };

    let nextBlocIdNum = 1;
    const blocInfo = {// maps bloc id (our local unique id for bloc instances) to an info object
      'ro': {
        id: 'ro',
        code: null,
        _class: null,
        instance: rackAudioOutPseudoBloc,
        displayedName: 'RACK OUTPUT',
      }
    };

    let nextCxnIdNum = 1;
    const cxnInfo = {}; // maps connection id to info about connection

    const updatePatchConnectOptions = () => {
      // TODO: should we iterate in displayed order?
      // A "port id" is blocid:portname. We store input and output portids separately so don't need to distinguish.
      // In port ids (and therefore connections) we use special bloc ids of -1 for rack outputs and -2 for rack inputs.
      // These are both maps from port id to a string "display name"
      const inputPorts = {};
      const outputPorts = {};

      for (const bid in blocInfo) {
        const binst = blocInfo[bid].instance;
        const dname = blocInfo[bid].displayedName;
        for (const pn in binst.inputs) {
          inputPorts[bid + ':' + pn] = dname + ':' + pn;
        }
        for (const pn in binst.outputs) {
          outputPorts[bid + ':' + pn] = dname + ':' + pn;
        }
      }

      removeChildren(patchInputSelectElem);
      for (const pn in inputPorts) {
        var oe = document.createElement('option');
        oe.textContent = inputPorts[pn] + ' IN';
        oe.value = pn;
        patchInputSelectElem.appendChild(oe);
      }

      removeChildren(patchOutputSelectElem);
      for (const pn in outputPorts) {
        var oe = document.createElement('option');
        oe.textContent = outputPorts[pn] + ' OUT';
        oe.value = pn;
        patchOutputSelectElem.appendChild(oe);
      }
    };
    updatePatchConnectOptions();

    const addBloc = (code) => {
      const bid = 'b' + nextBlocIdNum;
      nextBlocIdNum++;

      const blocClass = eval(code);
      const blocInst = new blocClass(document, audioContext);

      // TODO: need to check first if bloc has a panel view
      const wrapperElem = document.createElement('div');
      wrapperElem.appendChild(blocInst.panelView);
      wrapperElem.setAttribute('data-blocid', bid);
      blocContainerElem.appendChild(wrapperElem);

      blocInfo[bid] = {
        id: bid,
        code: code,
        _class: blocClass,
        instance: blocInst,
        displayedName: blocClass.blocName,
      };

      updatePatchConnectOptions();
    }

    const isValidConnection = (outBlocId, outPortName, inBlocId, inPortName) => {
      const outBloc = blocInfo[outBlocId].instance;
      const inBloc = blocInfo[inBlocId].instance;
      if (!outBloc.outputs.hasOwnProperty(outPortName)) {
        return false;
      }
      if (!inBloc.inputs.hasOwnProperty(inPortName)) {
        return false;
      }
      // TODO: verify that these two ports aren't already connected
      if (outBloc.outputs[outPortName].type !== inBloc.inputs[inPortName].type) {
        return false;
      }
      return true;
    }

    const addConnection = (outBlocId, outPortName, inBlocId, inPortName) => {
      const cid = 'c' + nextCxnIdNum;
      nextCxnIdNum++;

      const info = {
        outBlocId,
        outPortName,
        inBlocId,
        inPortName,
        disconnect: undefined, // function to remove connection
      };
      cxnInfo[cid] = info;

      const outBloc = blocInfo[outBlocId].instance;
      const inBloc = blocInfo[inBlocId].instance;
      switch (outBloc.outputs[outPortName].type) {
        case 'audio':
          const outNode = outBloc.outputs[outPortName].node;
          const inNode = inBloc.inputs[inPortName].node;
          outNode.connect(inNode);
          info.disconnect = (() => {
            outNode.disconnect(inNode); // NOTE: This was added later on to Web Audio spec
          });
          break;

        case 'gateEvent':
          info.disconnect = outBloc.outputs[outPortName].subscribe(inBloc.inputs[inPortName].notify);
          break;

        default:
          throw new Error('Invalid port type');
      }
    }

    patchConnectButtonElem.addEventListener('click', e => {
      e.preventDefault();

      const inpid = patchInputSelectElem.value;
      const outpid = patchOutputSelectElem.value;
      if (!inpid && !outpid) {
        return;
      }

      const [inBlocId, inPortName] = inpid.split(':');
      const [outBlocId, outPortName] = outpid.split(':');
      if (!isValidConnection(outBlocId, outPortName, inBlocId, inPortName)) {
        console.log('invalid');
        return;
      }
      addConnection(outBlocId, outPortName, inBlocId, inPortName);
    });

    this.windowView.addEventListener('dragover', e => {
      // TODO: check if this is something we can accept
      e.dataTransfer.dropEffect = 'copy';
      e.preventDefault();
    }, false);

    this.windowView.addEventListener('drop', e => {
      e.preventDefault();
      const blocCode = e.dataTransfer.getData('text/javascript');
      addBloc(blocCode);
    }, false);
  }
}

Racket.blocName = 'Racket';
