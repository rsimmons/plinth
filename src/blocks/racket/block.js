const template = require('!raw!./template.html');

function removeChildren(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

const uid32 = () => Math.random().toString(16).substring(2, 10);
const uid64 = () => uid32() + uid32();

export default class Racket {
  constructor(document, audioContext, settings) {
    this.inputs = {
    };
    this.outputs = {
    };

    const tmpElem = document.createElement('div');
    tmpElem.innerHTML = template;
    this.windowView = tmpElem.childNodes[0];
    let addingWireAttachedJack = null; // jack element of anchored end of wire we are currently adding, if any
    let addingWireLooseCoord = null;
    let currentEnteredJack = null;

    const blockContainerElem = this.windowView.querySelector('.block-container');
    const patchInputSelectElem = this.windowView.querySelector('.patch-input-select');
    const patchOutputSelectElem = this.windowView.querySelector('.patch-output-select');
    const patchConnectButtonElem = this.windowView.querySelector('.patch-connect-button');
    const patchConnectionListElem = this.windowView.querySelector('.patch-connection-list');

    const wiresCanvasElem = document.createElement('canvas');
    wiresCanvasElem.style = 'position:absolute;pointer-events:none';
    this.windowView.appendChild(wiresCanvasElem);

    const addingWireCanvasElem = document.createElement('canvas');
    addingWireCanvasElem.style = 'position:absolute;pointer-events:none';
    this.windowView.appendChild(addingWireCanvasElem);

    // We create a sort of fake block instances for the rack input and output, to simplify some things
    const rackInputPseudoblock = {
      outputs: {
      }
    };
    const rackOutputPseudoblock = {
      inputs: {
      }
    };

    const blockInfo = {// maps block id (our local unique id for block instances) to an info object
      'ri': {
        id: 'ri',
        code: null,
        _class: null,
        instance: rackInputPseudoblock,
        displayName: 'RACK INPUT',
        wrapperElem: null,
        portContainerElem: this.windowView.querySelector('.rack-input-ports'),
      },
      'ro': {
        id: 'ro',
        code: null,
        _class: null,
        instance: rackOutputPseudoblock,
        displayName: 'RACK OUTPUT',
        wrapperElem: null,
        portContainerElem: this.windowView.querySelector('.rack-output-ports'),
      }
    };

    const pseudoblockIds = new Set(['ri', 'ro']);

    const cxnInfo = {}; // maps connection id to info about connection

    let showFront = true;

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

    const updateFrontBackDisplay = () => {
      for (const bid in blockInfo) {
        const we = blockInfo[bid].wrapperElem;
        if (we) {
          if (showFront) {
            we.firstChild.style.display = 'block';
            we.lastChild.style.display = 'none';
          } else {
            we.firstChild.style.display = 'none';
            we.lastChild.style.display = 'block';
          }
        }
      }

      updateWires();
      updateAddingWire();
    };

    const toggleFrontBackDisplay = () => {
      showFront = !showFront;
      updateFrontBackDisplay();
    };

    const matchElemSize = (targetElem, sourceElem) => {
      targetElem.style.left = sourceElem.offsetLeft;
      targetElem.style.top = sourceElem.offsetTop;
      targetElem.style.width = sourceElem.offsetWidth;
      targetElem.style.height = sourceElem.offsetHeight;
      targetElem.width = sourceElem.offsetWidth;
      targetElem.height = sourceElem.offsetHeight;
    };

    const getJackCoords = (bid, inout, pn) => {
      const jackElem = blockInfo[bid].portContainerElem.querySelector('.port-jack[data-inout="' + inout + '"][data-portname="' + pn + '"]');
      return {
        x: jackElem.offsetLeft + ((inout === 'output') ? (jackElem.offsetWidth-12) : 12),
        y: jackElem.offsetTop + 0.5*jackElem.offsetHeight,
      };
    };

    const updateWires = () => {
      if (showFront) {
        wiresCanvasElem.style.display = 'none';
      } else {
        wiresCanvasElem.style.display = 'block';

        // Size and position canvas to overlay view
        const overElem = this.windowView;
        matchElemSize(wiresCanvasElem, overElem);

        const ctx = wiresCanvasElem.getContext('2d');
        const cWidth = wiresCanvasElem.width;
        const cHeight = wiresCanvasElem.height;

        ctx.clearRect(0, 0, cWidth, cHeight);

        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgb(0, 255, 0)';
        ctx.globalAlpha = 0.5;

        ctx.beginPath();
        for (const cid in cxnInfo) {
          const cinfo = cxnInfo[cid];
          const outCoords = getJackCoords(cinfo.outBlockId, 'output', cinfo.outPortName);
          const inCoords = getJackCoords(cinfo.inBlockId, 'input', cinfo.inPortName);
          ctx.moveTo(outCoords.x - overElem.offsetLeft, outCoords.y - overElem.offsetTop);
          ctx.lineTo(inCoords.x - overElem.offsetLeft, inCoords.y - overElem.offsetTop);
        }
        ctx.stroke();
      }
    };

    const addingWireCxnSpec = () => {
      if (currentEnteredJack) {
        if (addingWireAttachedJack.dataset.inout === 'input') {
          if (currentEnteredJack.dataset.inout === 'input') {
            return null;
          } else if (currentEnteredJack.dataset.inout === 'output') {
            return {
              outBlockId: currentEnteredJack.dataset.blockid,
              outPortName: currentEnteredJack.dataset.portname,
              inBlockId: addingWireAttachedJack.dataset.blockid,
              inPortName: addingWireAttachedJack.dataset.portname,
            };
          } else {
            throw new Error('internal error');
          }
        } else if (addingWireAttachedJack.dataset.inout === 'output') {
          if (currentEnteredJack.dataset.inout === 'input') {
            return {
              outBlockId: addingWireAttachedJack.dataset.blockid,
              outPortName: addingWireAttachedJack.dataset.portname,
              inBlockId: currentEnteredJack.dataset.blockid,
              inPortName: currentEnteredJack.dataset.portname,
            };
          } else if (currentEnteredJack.dataset.inout === 'output') {
            return null;
          } else {
            throw new Error('internal error');
          }
        } else {
          throw new Error('internal error');
        }
      } else {
        return null;
      }
    };

    const updateAddingWire = () => {
      if (showFront || !addingWireAttachedJack) {
        addingWireCanvasElem.style.display = 'none';
      } else {
        addingWireCanvasElem.style.display = 'block';

        const attachedJackCoords = getJackCoords(addingWireAttachedJack.dataset.blockid, addingWireAttachedJack.dataset.inout, addingWireAttachedJack.dataset.portname);

        const cxnSpec = addingWireCxnSpec();
        const willBeValid = cxnSpec && isValidConnection(cxnSpec);

        // Size and position canvas to overlay view
        const overElem = this.windowView;
        matchElemSize(addingWireCanvasElem, overElem);

        const ctx = addingWireCanvasElem.getContext('2d');
        const cWidth = addingWireCanvasElem.width;
        const cHeight = addingWireCanvasElem.height;

        ctx.clearRect(0, 0, cWidth, cHeight);

        ctx.lineWidth = 5;
        ctx.strokeStyle = willBeValid ? 'rgb(0, 255, 0)' : 'rgb(255, 0, 0)';
        ctx.globalAlpha = 0.75;

        ctx.beginPath();
        ctx.moveTo(attachedJackCoords.x - overElem.offsetLeft, attachedJackCoords.y - overElem.offsetTop);
        ctx.lineTo(addingWireLooseCoord.x - overElem.offsetLeft, addingWireLooseCoord.y - overElem.offsetTop);
        ctx.stroke();
      }
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

    const finishAddingWire = () => {
      if (!addingWireAttachedJack) {
        throw new Error('internal error');
      }

      if (currentEnteredJack) {
        const cxnSpec = addingWireCxnSpec();
        if (cxnSpec && isValidConnection(cxnSpec)) {
          addConnection(cxnSpec);
        }
      }

      addingWireAttachedJack = null;
      addingWireLooseCoord = null;
    };

    const handleJackMouseDown = (e) => {
      e.preventDefault();
      const jackElem = e.currentTarget;

      if (addingWireAttachedJack) {
        finishAddingWire();
      } else {
        addingWireAttachedJack = jackElem;
        addingWireLooseCoord = {x: e.clientX, y: e.clientY};
      }
      updateAddingWire();
    };

    const handleMouseUp = (e) => {
      if (addingWireAttachedJack) {
        e.preventDefault();
        if (currentEnteredJack === addingWireAttachedJack) {
          // mouseup on same jack that we started on, ignore it
        } else {
          finishAddingWire();
          updateAddingWire();
        }
      }
    };
    document.addEventListener('mouseup', handleMouseUp, false);

    const handleMouseMove = (e) => {
      if (addingWireAttachedJack) {
        addingWireLooseCoord = {x: e.clientX, y: e.clientY};
        updateAddingWire();
      }
    };
    document.addEventListener('mousemove', handleMouseMove, false);

    const JACK_NORMAL_BACKGROUND_COLOR = '#999';
    const JACK_HOVER_BACKGROUND_COLOR = '#ddd';

    const handleJackMouseEnter = (e) => {
      const jackElem = e.currentTarget;
      jackElem.style.backgroundColor = JACK_HOVER_BACKGROUND_COLOR;
      currentEnteredJack = e.currentTarget;
    }

    const handleJackMouseLeave = (e) => {
      const jackElem = e.currentTarget;
      jackElem.style.backgroundColor = JACK_NORMAL_BACKGROUND_COLOR;
      currentEnteredJack = null;
    }

    const addJackElem = (blockId, inout, portName, isInput, container) => {
      const jackElem = document.createElement('div');
      jackElem.style = 'color:black;font-size:12px;display:inline-block;box-sizing:border-box;border:1px solid #555;margin:2px 0;padding:3px 6px;border-radius:2px';
      jackElem.style.backgroundColor = JACK_NORMAL_BACKGROUND_COLOR;
      jackElem.dataset.blockid = blockId;
      jackElem.dataset.inout = inout;
      jackElem.dataset.portname = portName;
      jackElem.className = 'port-jack';
      jackElem.addEventListener('mousedown', handleJackMouseDown, false);
      jackElem.addEventListener('mouseenter', handleJackMouseEnter, false);
      jackElem.addEventListener('mouseleave', handleJackMouseLeave, false);
      jackElem.textContent = isInput ? ('\u25B7 ' + portName) : (portName + ' \u25BA');

      const wrapperElem = document.createElement('div');
      if (!isInput) {
        wrapperElem.style.textAlign = 'right';
      }
      wrapperElem.appendChild(jackElem);

      container.appendChild(wrapperElem);
    };

    const addBlock = (code, settings, blockId, displayName) => {
      const blockClass = eval(code);
      const blockInst = new blockClass(document, audioContext, settings);

      const bid = blockId || 'b' + uid64();

      blockInfo[bid] = {
        id: bid,
        code: code,
        _class: blockClass,
        instance: blockInst,
        displayName: displayName || blockClass.blockName,
        wrapperElem: undefined,
        panelWidth: undefined,
        panelHeight: undefined,
        portContainerElem: undefined,
      };
      uniquifyDisplayName(bid);

      let effectivePanelViewElem; // either the real panel view element or a placeholder
      if (blockInst.panelView) {
        effectivePanelViewElem = blockInst.panelView;
      } else {
        const PLACEHOLDER_WIDTH = 62;
        const PLACEHOLDER_HEIGHT = 256;
        const tmpElem = document.createElement('div');
        tmpElem.innerHTML = '<div style="box-sizing:border-box;width:' + PLACEHOLDER_WIDTH + 'px;height:' + PLACEHOLDER_HEIGHT + 'px;text-align:center;font-size:14px;background:white;font-style:italic;color:gray;padding:100px 5px">No panel view</div>';
        effectivePanelViewElem = tmpElem.firstChild;
      }

      const wrapperElem = document.createElement('div');
      wrapperElem.style = 'margin: 1px';
      wrapperElem.setAttribute('data-blockid', bid);
      wrapperElem.appendChild(effectivePanelViewElem);

      blockContainerElem.appendChild(wrapperElem);
      blockInfo[bid].wrapperElem = wrapperElem;

      // Can only query these dimensions once the elem has been added to page
      blockInfo[bid].panelWidth = effectivePanelViewElem.offsetWidth;
      blockInfo[bid].panelHeight = effectivePanelViewElem.offsetHeight;

      // Create back panel
      const removeBlockElem = document.createElement('a');
      removeBlockElem.style = 'float:right;color: #ccc;text-decoration: none';
      removeBlockElem.href = '#';
      removeBlockElem.textContent = 'X';
      removeBlockElem.addEventListener('click', (e) => {
        e.preventDefault();
        removeBlock(bid);
      });

      const headerElem = document.createElement('div');
      headerElem.style = 'background-color: #555; font-size: 12px; padding: 4px 6px; color: #ccc';
      headerElem.appendChild(removeBlockElem);
      headerElem.appendChild(document.createTextNode(blockInfo[bid].displayName));

      const portContainerElem = document.createElement('div');
      portContainerElem.style = 'padding: 5px';
      blockInfo[bid].portContainerElem = portContainerElem;

      const backPanelElem = document.createElement('div');
      backPanelElem.style = 'width:' + blockInfo[bid].panelWidth + 'px;height:' + blockInfo[bid].panelHeight + 'px;background-color:#ccc';
      backPanelElem.appendChild(headerElem);
      backPanelElem.appendChild(portContainerElem);
      wrapperElem.appendChild(backPanelElem);

      // Add elements representing ports
      for (const pn in blockInst.inputs) {
        addJackElem(bid, 'input', pn, true, portContainerElem);
      }
      for (const pn in blockInst.outputs) {
        addJackElem(bid, 'output', pn, false, portContainerElem);
      }

      updateFrontBackDisplay(); // sort of overkill to update all blocks, but keeps code neat
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
          addJackElem('ri', 'output', portName, false, blockInfo['ri'].portContainerElem);
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
          addJackElem('ro', 'input', portName, true, blockInfo['ro'].portContainerElem);
          break;

        default:
          throw new Error('Unsupported rack port type');
      }
    };

    const addConnection = ({outBlockId, outPortName, inBlockId, inPortName}) => {
      const cid = 'c' + uid64();

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
      updateWires();
    }

    const removeConnection = (cid) => {
      const info = cxnInfo[cid];
      info.disconnect();
      delete cxnInfo[cid];
      updatePatchConnectionList();
      updatePatchConnectionValidity();
      updateWires();
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
        addBlock(codeMap.get(binfo.codeId), binfo.settings, bid, binfo.displayName);
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

    const onKeydownFunc = (e) => {
      if (e.key === ' ') {
        toggleFrontBackDisplay();
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', onKeydownFunc);

    this.windowView.querySelector('.toggle-front-back-button').addEventListener('click', () => {
      toggleFrontBackDisplay();
    });

    // Do initial UI updates
    updatePatchConnectionValidity();
    updatePatchConnectOptions();
    updateWires();

    this.deactivate = () => {
      // NOTE: We remove blocks one by one. It might be safe to just directly
      //  deactivate them and do less work, but this is easy and should be robust.
      const bids = [];
      for (const bid in blockInfo) {
        if (pseudoblockIds.has(bid)) {
          continue; // Skip pseudoblocks
        }
        bids.push(bid);
      }

      for (const bid of bids) {
        removeBlock(bid);
      }

      document.removeEventListener('keydown', onKeydownFunc);
      document.removeEventListener('mouseup', handleMouseUp, false);
      document.removeEventListener('mousemove', handleMouseMove, false);
    };

    // Store some stuff as member variables
    // TODO: move save definition in here and get rid of these
    this.blockInfo = blockInfo;
    this.pseudoblockIds = pseudoblockIds;
    this.blockContainerElem = blockContainerElem;
    this.cxnInfo = cxnInfo;
    this.rackInputPseudoblock = rackInputPseudoblock;
    this.rackOutputPseudoblock = rackOutputPseudoblock;
    this.removeBlock = removeBlock;
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
