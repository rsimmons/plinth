const template = require('!raw!./template.html');

function removeChildren(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

export default class Racket {
  constructor(document, audioContext, settings) {
    this.inputs = {
    };
    this.outputs = {
    };

    const tmpElem = document.createElement('div');
    tmpElem.innerHTML = template;
    this.windowView = tmpElem.childNodes[0];

    const blockContainerElem = this.windowView.querySelector('.block-container');
    const patchInputSelectElem = this.windowView.querySelector('.patch-input-select');
    const patchOutputSelectElem = this.windowView.querySelector('.patch-output-select');
    const patchConnectButtonElem = this.windowView.querySelector('.patch-connect-button');
    const patchConnectionListElem = this.windowView.querySelector('.patch-connection-list');

    // We create a sort of fake block instances for the rack input and output, to simplify some things
    const rackInputPseudoblock = {
      outputs: {
      }
    };
    const rackOutputPseudoblock = {
      inputs: {
      }
    };

    let nextBlockIdNum = 1;
    const blockInfo = {// maps block id (our local unique id for block instances) to an info object
      'ri': {
        id: 'ri',
        code: null,
        _class: null,
        instance: rackInputPseudoblock,
        displayName: 'RACK INPUT',
      },
      'ro': {
        id: 'ro',
        code: null,
        _class: null,
        instance: rackOutputPseudoblock,
        displayName: 'RACK OUTPUT',
      }
    };

    const pseudoblockIds = new Set(['ri', 'ro']);

    let nextCxnIdNum = 1;
    const cxnInfo = {}; // maps connection id to info about connection

    const updatePatchConnectionList = () => {
      removeChildren(patchConnectionListElem);
      for (const cid in cxnInfo) {
        const info = cxnInfo[cid];
        const desc = blockInfo[info.outBlockId].displayName + ':' + info.outPortName + ' → ' + blockInfo[info.inBlockId].displayName + ':' + info.inPortName;
        const itemElem = document.createElement('li');
        itemElem.appendChild(document.createTextNode(desc + ' '));
        const removeElem = document.createElement('button');
        removeElem.textContent = 'remove';
        removeElem.addEventListener('click', () => {
          removeConnection(cid);
        });
        itemElem.appendChild(removeElem);
        patchConnectionListElem.appendChild(itemElem);
      }
    };

    const isValidConnection = ({outBlockId, outPortName, inBlockId, inPortName}) => {
      const outBlock = blockInfo[outBlockId].instance;
      const inBlock = blockInfo[inBlockId].instance;

      // Verify that port names are valid
      if (!outBlock.outputs.hasOwnProperty(outPortName)) {
        return false;
      }
      if (!inBlock.inputs.hasOwnProperty(inPortName)) {
        return false;
      }

      // Verify that these two ports aren't already connected
      for (const cid in cxnInfo) {
        const info = cxnInfo[cid];
        if ((info.outBlockId === outBlockId) && (info.outPortName === outPortName) && (info.inBlockId === inBlockId) && (info.inPortName === inPortName)) {
          return false;
        }
      }

      // Verify that ports are matching types
      if (outBlock.outputs[outPortName].type !== inBlock.inputs[inPortName].type) {
        return false;
      }

      // Didn't find any problems
      return true;
    }

    const parseConnectionSpec = () => {
      const inpid = patchInputSelectElem.value;
      const outpid = patchOutputSelectElem.value;
      if (!inpid || !outpid) {
        return null;
      }

      const [inBlockId, inPortName] = inpid.split(':');
      const [outBlockId, outPortName] = outpid.split(':');

      return {inBlockId, inPortName, outBlockId, outPortName};
    };

    const updatePatchConnectionValidity = () => {
      const cxnSpec = parseConnectionSpec();
      patchConnectButtonElem.disabled = !(cxnSpec && isValidConnection(cxnSpec));
    };

    const updatePatchConnectOptions = () => {
      // TODO: should we iterate in displayed order?
      // A "port id" is blockid:portname. We store input and output portids separately so don't need to distinguish.
      // In port ids (and therefore connections) we use special block ids of -1 for rack outputs and -2 for rack inputs.
      // These are both maps from port id to a string "display name"
      const inputPorts = {};
      const outputPorts = {};

      for (const bid in blockInfo) {
        const binst = blockInfo[bid].instance;
        const dname = blockInfo[bid].displayName;
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

      updatePatchConnectionValidity();
    };

    // Check if displayName of given block is unique, and if not alter so that it is
    const uniquifyDisplayName = (bid) => {
      const dn = blockInfo[bid].displayName;
      const otherDn = {}; // used as a Set
      for (const b in blockInfo) {
        if (b !== bid) {
          otherDn[blockInfo[b].displayName] = null;
        }
      }

      if (!otherDn.hasOwnProperty(dn)) {
        return; // all good
      }

      // There is a conflict, so try appending different integers until it's unique
      for (let i = 2; ; i++) {
        const n = dn + ' ' + i;
        if (!otherDn.hasOwnProperty(n)) {
          // Found a free name
          blockInfo[bid].displayName = n;
          return;
        }
      }
    };

    const addBlock = (code, settings, displayName) => {
      const bid = 'b' + nextBlockIdNum;
      nextBlockIdNum++;

      const blockClass = eval(code);
      const blockInst = new blockClass(document, audioContext, settings);

      blockInfo[bid] = {
        id: bid,
        code: code,
        _class: blockClass,
        instance: blockInst,
        displayName: displayName || blockClass.blockName,
        wrapperElem: undefined,
      };
      uniquifyDisplayName(bid);

      const wrapperElem = document.createElement('div');
      wrapperElem.style = 'margin: 1px';
      wrapperElem.setAttribute('data-blockid', bid);

      const headerElem = document.createElement('div');
      headerElem.style = 'background-color: #555; font-size: 12px; padding: 4px 6px; color: #ccc';
      const removeBlockElem = document.createElement('a');
      removeBlockElem.style = 'float:right;color: #ccc;text-decoration: none';
      removeBlockElem.href = '#';
      removeBlockElem.textContent = 'X';
      removeBlockElem.addEventListener('click', (e) => {
        e.preventDefault();
        removeBlock(bid);
      });
      headerElem.appendChild(removeBlockElem);
      headerElem.appendChild(document.createTextNode(blockInfo[bid].displayName));
      wrapperElem.appendChild(headerElem);

      if (blockInst.panelView) {
        wrapperElem.appendChild(blockInst.panelView);
      } else {
        const placeholderElem = document.createElement('div');
        placeholderElem.innerHTML = '<div style="box-sizing:border-box;width:62px;height:256px;text-align:center;font-size:14px;background:white;font-style:italic;color:gray;padding:100px 5px">No panel view</div>';
        wrapperElem.appendChild(placeholderElem);
      }

      blockContainerElem.appendChild(wrapperElem);
      blockInfo[bid].wrapperElem = wrapperElem;

      updatePatchConnectOptions();
    }

    const removeBlock = (bid) => {
      // Remove all connections to/from it
      const cidsToRemove = [];
      for (const cid in cxnInfo) {
        const info = cxnInfo[cid];
        if ((info.outBlockId === bid) || (info.inBlockId === bid)) {
          cidsToRemove.push(cid);
        }
      }
      for (const cid of cidsToRemove) {
        removeConnection(cid);
      }

      // Unmount its UI and wrapper
      blockContainerElem.removeChild(blockInfo[bid].wrapperElem);

      // Deactivate if it has a deactivation method
      const binst = blockInfo[bid].instance;
      if (binst.deactivate) {
        binst.deactivate();
      }

      delete blockInfo[bid];

      updatePatchConnectOptions();
    };

    const addRackInput = (portName, type) => {
      if (this.inputs[portName]) {
        throw new Error('port name already exists');
      }
      switch (type) {
        case 'audio':
          const dummyNode = audioContext.createGain();
          this.inputs[portName] = {type: 'audio', node: dummyNode};
          rackInputPseudoblock.outputs[portName] = {type: 'audio', node: dummyNode};
          break;

        default:
          throw new Error('Unsupported rack port type');
      }
    };

    const addRackOutput = (portName, type) => {
      if (this.outputs[portName]) {
        throw new Error('port name already exists');
      }
      switch (type) {
        case 'audio':
          const dummyNode = audioContext.createGain();
          this.outputs[portName] = {type: 'audio', node: dummyNode};
          rackOutputPseudoblock.inputs[portName] = {type: 'audio', node: dummyNode};
          break;

        default:
          throw new Error('Unsupported rack port type');
      }
    };

    const addConnection = ({outBlockId, outPortName, inBlockId, inPortName}) => {
      const cid = 'c' + nextCxnIdNum;
      nextCxnIdNum++;

      const info = {
        outBlockId,
        outPortName,
        inBlockId,
        inPortName,
        disconnect: undefined, // function to remove connection
      };
      cxnInfo[cid] = info;

      const outBlock = blockInfo[outBlockId].instance;
      const inBlock = blockInfo[inBlockId].instance;
      switch (outBlock.outputs[outPortName].type) {
        case 'audio':
          const outNode = outBlock.outputs[outPortName].node;
          const inNode = inBlock.inputs[inPortName].node;
          outNode.connect(inNode);
          info.disconnect = (() => {
            outNode.disconnect(inNode); // NOTE: This was added later on to Web Audio spec
          });
          break;

        case 'gateEvent':
          info.disconnect = outBlock.outputs[outPortName].subscribe(inBlock.inputs[inPortName].notify);
          break;

        default:
          throw new Error('Invalid port type');
      }

      updatePatchConnectionList();
      updatePatchConnectionValidity();
    }

    const removeConnection = (cid) => {
      const info = cxnInfo[cid];
      info.disconnect();
      delete cxnInfo[cid];
      updatePatchConnectionList();
      updatePatchConnectionValidity();
    };

    patchInputSelectElem.addEventListener('input', () => {
      updatePatchConnectionValidity();
    });
    patchOutputSelectElem.addEventListener('input', () => {
      updatePatchConnectionValidity();
    });

    patchConnectButtonElem.addEventListener('click', e => {
      e.preventDefault();

      const cxnSpec = parseConnectionSpec();
      if (!cxnSpec) {
        return;
      }

      if (!isValidConnection(cxnSpec)) {
        console.log('invalid');
        return;
      }
      addConnection(cxnSpec);
    });

    this.windowView.addEventListener('dragover', e => {
      // TODO: check if this is something we can accept
      e.dataTransfer.dropEffect = 'copy';
      e.preventDefault();
    }, false);

    this.windowView.addEventListener('drop', e => {
      e.preventDefault();
      const blockCode = e.dataTransfer.getData('text/javascript');
      addBlock(blockCode);
    }, false);

    // Load settings if present, otherwise set up some defaults
    if (settings) {
      const settingsObj = JSON.parse(settings);

      // Load de-duped code for contained blocks
      const codeMap = new Map(settingsObj.codeMap); // restore from array of pairs

      // Load blocks (sans pseudoblocks)
      for (const bid of settingsObj.blockOrder) {
        const binfo = settingsObj.blockMap[bid];
        addBlock(codeMap.get(binfo.codeId), binfo.settings, binfo.displayName);
      }

      // Create rack inputs/output ports
      for (const pn in settingsObj.rackInputPorts) {
        addRackInput(pn, settingsObj.rackInputPorts[pn].type);
      }
      for (const pn in settingsObj.rackOutputPorts) {
        addRackOutput(pn, settingsObj.rackOutputPorts[pn].type);
      }

      // Load connections
      for (const cxn of settingsObj.connections) {
        addConnection(cxn);
      }
    } else {
      // Set up single output port, audio
      addRackOutput('audio', 'audio');
    }

    // Do initial UI updates
    updatePatchConnectionValidity();
    updatePatchConnectOptions();

    // Store some stuff as member variables
    // TODO: hide these
    this.blockInfo = blockInfo;
    this.pseudoblockIds = pseudoblockIds;
    this.blockContainerElem = blockContainerElem;
    this.cxnInfo = cxnInfo;
    this.rackInputPseudoblock = rackInputPseudoblock;
    this.rackOutputPseudoblock = rackOutputPseudoblock;
    this.removeBlock = removeBlock;
  }

  deactivate() {
    // NOTE: We remove blocks one by one. It might be safe to just directly
    //  deactivate them and do less work, but this is easy and should be robust.
    const bids = [];
    for (const bid in this.blockInfo) {
      if (this.pseudoblockIds.has(bid)) {
        continue; // Skip pseudoblocks
      }
      bids.push(bid);
    }

    for (const bid of bids) {
      this.removeBlock(bid);
    }
  }

  save() {
    // Build map from block codes to unique ids
    const codeToId = new Map(); // maps code strings to unique integer ids
    let nextCodeId = 1;

    for (const bid in this.blockInfo) {
      if (this.pseudoblockIds.has(bid)) {
        continue; // Skip pseudoblocks
      }
      const binfo = this.blockInfo[bid];
      if (!codeToId.has(binfo.code)) {
        codeToId.set(binfo.code, nextCodeId);
        nextCodeId++;
      }
    }

    // Build reverse map from code id to code string, that we will save
    const codeMap = new Map();
    for (const [k, v] of codeToId) {
      codeMap.set(v, k);
    }

    // Build map from block id to saved block info
    const blockMap = {}; // since keys are strings, don't need to use Map
    for (const bid in this.blockInfo) {
      if (this.pseudoblockIds.has(bid)) {
        continue; // Skip pseudoblocks
      }
      const binfo = this.blockInfo[bid];
      blockMap[bid] = {
        codeId: codeToId.get(binfo.code),
        settings: binfo.instance.save ? binfo.instance.save() : null,
        displayName: binfo.displayName,
      }
    }

    // Iterate displayed blocks to find their order
    const blockOrder = [];
    for (const el of this.blockContainerElem.childNodes) {
      const bid = el.dataset.blockid;
      if (!bid || !blockMap[bid]) {
        throw new Error('internal error');
      }
      blockOrder.push(el.dataset.blockid);
    }

    // Store connections pretty much as-is
    const connections = [];
    for (const cid in this.cxnInfo) {
      const cinfo = this.cxnInfo[cid];
      connections.push({
        outBlockId: cinfo.outBlockId,
        outPortName: cinfo.outPortName,
        inBlockId: cinfo.inBlockId,
        inPortName: cinfo.inPortName,
      });
    }

    // Save the rack input and output ports
    const rackInputPorts = {};
    for (const pn in this.rackInputPseudoblock.outputs) {
      const pinfo = this.rackInputPseudoblock.outputs[pn];
      rackInputPorts[pn] = {type: pinfo.type};
    }
    const rackOutputPorts = {};
    for (const pn in this.rackOutputPseudoblock.inputs) {
      const pinfo = this.rackOutputPseudoblock.inputs[pn];
      rackOutputPorts[pn] = {type: pinfo.type};
    }

    return JSON.stringify({
      codeMap: [...codeMap], // convert to array of pairs for JSONification
      blockMap,
      blockOrder,
      connections,
      rackInputPorts,
      rackOutputPorts,
    });
  }
}

Racket.blockName = 'Racket';
