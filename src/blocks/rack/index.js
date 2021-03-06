const template = require('./template.html');
const ENTER_SVG_URL = require('./enter.svg');
const EXIT_SVG_URL = require('./exit.svg');

function removeChildren(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

class Sequence {
  constructor() {
    this.value = 1;
  }

  set(v) {
    this.value = v;
  }

  next() {
    return this.value++;
  }
}

const makeRackPseudoBlockClass = (rackInst, isInput) => {
  const cls = class {
    constructor(audioContext, viewContainer, settings) {
      this.inputs = {};
      this.outputs = {};

      // Enter/Exit icons CC BY 3.0 by Rockicon, https://thenounproject.com/rockicon/collection/famous-icons-bold/
      viewContainer.innerHTML = '<div style="box-sizing:border-box;width:62px;height:256px;text-align:center;font-size:14px;background:#ccc;color:black;padding:95px 5px"><img width="52" height="52" src=' + (isInput ? ENTER_SVG_URL : EXIT_SVG_URL) + '><br>' + (isInput ? 'IN' : 'OUT') + '</div>';

      const rackPortGroup = isInput ? rackInst.inputs : rackInst.outputs;
      const thisPortGroup = isInput ? this.outputs : this.inputs;

      const addPort = (portName, type) => {
        if (rackPortGroup[portName]) {
          throw new Error('port name already exists');
        }
        switch (type) {
          case 'audio':
            const dummyNode = audioContext.createGain();
            rackPortGroup[portName] = {type: 'audio', node: dummyNode};
            thisPortGroup[portName] = {type: 'audio', node: dummyNode};
            break;

          default:
            throw new Error('Unsupported rack port type');
        }
      };

      if (settings) {
        for (const pn in settings.p) {
          addPort(pn, settings.p[pn].t);
        }
      } else {
        // Set up default ports
        if (!isInput) {
          addPort('audio', 'audio');
        }
      }

      this.save = () => {
        const ports = {};
        for (const pn in thisPortGroup) {
          ports[pn] = {t: thisPortGroup[pn].type};
        }
        return {
          p: ports,
        };
      };
    }
  };
  cls.blockName = isInput ? 'Rack Inputs' : 'Rack Outputs';
  cls.helpText = isInput ?
`Rack Inputs is a special block that lets you output audio from the rack.

Any input signals provided to the rack can be accessed via the output ports of the Rack Inputs block.

Unlike normal blocks, there can be only one Rack Inputs block in a rack, and it can't be deleted.`:
`Rack Outputs is a special block that lets you output signals from the rack. Currently, it only supports a single audio signal.

Connect any audio signal to the Rack Outputs audio input, and that signal will be the final output of the rack.

Unlike normal blocks, there can be only one Rack Outputs block in a rack, and it can't be deleted.`;

  return cls;
};

export default (availableBlockClasses) => {
// Don't indent to keep things nicer-looking
class Rack {
  constructor(audioContext, viewContainer, settings) {
    const RACK_INPUTS_PSEUDO_CLASS_ID = '__ri';
    const RACK_OUTPUTS_PSEUDO_CLASS_ID = '__ro';
    const RACK_INPUTS_PSEUDO_BLOCK_ID = 'ri';
    const RACK_OUTPUTS_PSEUDO_BLOCK_ID = 'ro';
    const availableBlockClassesPlusPseudo = Object.assign({}, availableBlockClasses);
    availableBlockClassesPlusPseudo[RACK_INPUTS_PSEUDO_CLASS_ID] = makeRackPseudoBlockClass(this, true);
    availableBlockClassesPlusPseudo[RACK_OUTPUTS_PSEUDO_CLASS_ID] = makeRackPseudoBlockClass(this, false);

    this.inputs = {};
    this.outputs = {};

    const document = viewContainer.ownerDocument;

    viewContainer.innerHTML = template;
    let addingWireAttachedJack = null; // jack element of anchored end of wire we are currently adding, if any
    let addingWireLooseCoord = null;
    let currentEnteredJack = null;
    let mousePos = null;
    let deletingWiresMode = false; // Are we in delete-wires mode?

    const blockPaletteElem = viewContainer.querySelector('.block-palette');
    const deleteWiresButtonElem = viewContainer.querySelector('.delete-wires-button');
    const blockContainerElem = viewContainer.querySelector('.block-container');
    const patchInputSelectElem = viewContainer.querySelector('.patch-input-select');
    const patchOutputSelectElem = viewContainer.querySelector('.patch-output-select');
    const patchConnectButtonElem = viewContainer.querySelector('.patch-connect-button');
    const patchConnectionListElem = viewContainer.querySelector('.patch-connection-list');

    const wiresCanvasElem = document.createElement('canvas');
    wiresCanvasElem.style.cssText = 'position:absolute;pointer-events:none';
    viewContainer.appendChild(wiresCanvasElem);

    const addingWireCanvasElem = document.createElement('canvas');
    addingWireCanvasElem.style.cssText = 'position:absolute;pointer-events:none';
    viewContainer.appendChild(addingWireCanvasElem);

    // Fill block palette
    const BLOCK_CLASS_ID_MIME_TYPE = 'application/prs.plinth-block-class-id';
    for (const blockClassId in availableBlockClasses) {
      const blockClass = availableBlockClasses[blockClassId];
      const el = document.createElement('div');
      el.textContent = blockClass.blockName;
      el.setAttribute('draggable', true);
      el.setAttribute('title', 'Click for help');
      el.style.cssText = 'padding:5px 10px;margin:6px 0;color:#222;background:#bbb;cursor:move;cursor:grab;cursor:-moz-grab;cursor:-webkit-grab';
      blockPaletteElem.appendChild(el);
      el.addEventListener('dragstart', function(e) {
        e.dataTransfer.setData(BLOCK_CLASS_ID_MIME_TYPE, blockClassId);
      }, false);
      (() => {
        el.addEventListener('click', () => { showBlockHelp(blockClass); });
      })();
      el.addEventListener('mouseenter', (e) => {
        e.target.style.background = '#ddd';
      });
      el.addEventListener('mouseleave', (e) => {
        e.target.style.background = '#bbb';
      });
    }

    const blockInfo = {}; // maps block id (our local unique id for block instances) to an info object

    const cxnInfo = {}; // maps connection id to info about connection

    const blockIdSeq = new Sequence();
    const cxnIdSeq = new Sequence();

    let showFront = true;

    const blockHelpPanelElem = viewContainer.querySelector('.block-help-panel');
    const blockHelpTitleElem = viewContainer.querySelector('.block-help-title');
    const blockHelpBodyElem = viewContainer.querySelector('.block-help-body');
    const newlinesToPs = (s) => {
      const result = document.createElement('div');
      for (const v of s.split('\n')) {
        const pElem = document.createElement('p');
        pElem.textContent = v;
        result.appendChild(pElem);
      }
      return result;
    }
    const showBlockHelp = (blockClass) => {
      blockHelpPanelElem.style.display = 'block';
      blockHelpTitleElem.textContent = blockClass.blockName;
      if (blockClass.helpText) {
        blockHelpBodyElem.innerHTML = '';
        blockHelpBodyElem.appendChild(newlinesToPs(blockClass.helpText));
      } else {
        blockHelpBodyElem.innerHTML = '<em>No help text available</em>';
      }
    };

    const hideBlockHelp = () => {
      blockHelpPanelElem.style.display = 'none';
    };

    blockHelpPanelElem.querySelector('.block-help-panel-close-button').addEventListener('click', () => {
      hideBlockHelp();
    });

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

    const updateBackPanelDimensions = (bid) => {
      const we = blockInfo[bid].wrapperElem;
      if (we) {
        const frontPanelElem = we.firstChild;
        const backPanelElem = we.lastChild;
        backPanelElem.style.width = frontPanelElem.offsetWidth + 'px';
        backPanelElem.style.height = frontPanelElem.offsetHeight + 'px';
      }
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
      updateDeleteWiresButton();
    };

    const toggleFrontBackDisplay = () => {
      if (showFront) {
        // Update all back panel dimensions before we switch to back view
        for (const bid in blockInfo) {
          updateBackPanelDimensions(bid);
        }
      }

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
      const jackElem = blockInfo[bid].jackContainerElem.querySelector('.port-jack[data-inout="' + inout + '"][data-portname="' + pn + '"]');
      return {
        x: jackElem.offsetLeft + ((inout === 'output') ? (jackElem.offsetWidth-12) : 12) - blockContainerElem.scrollLeft,
        y: jackElem.offsetTop + 0.5*jackElem.offsetHeight - blockContainerElem.scrollTop,
      };
    };

    const updateWires = () => {
      const hitWireCxnIds = [];

      if (showFront) {
        wiresCanvasElem.style.display = 'none';
      } else {
        wiresCanvasElem.style.display = 'block';

        // Size and position canvas to overlay block container
        const overElem = blockContainerElem;
        matchElemSize(wiresCanvasElem, overElem);

        const ctx = wiresCanvasElem.getContext('2d');
        const cWidth = wiresCanvasElem.width;
        const cHeight = wiresCanvasElem.height;

        ctx.clearRect(0, 0, cWidth, cHeight);

        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.5;

        for (const cid in cxnInfo) {
          const cinfo = cxnInfo[cid];
          const outCoords = getJackCoords(cinfo.outBlockId, 'output', cinfo.outPortName);
          const inCoords = getJackCoords(cinfo.inBlockId, 'input', cinfo.inPortName);

          const strokeWire = () => {
            ctx.beginPath();
            ctx.moveTo(outCoords.x - overElem.offsetLeft, outCoords.y - overElem.offsetTop);
            ctx.lineTo(inCoords.x - overElem.offsetLeft, inCoords.y - overElem.offsetTop);
            ctx.stroke();
          };

          let hit = false;
          if (deletingWiresMode) {
            // Do a "test" stroke just for hit detection
            ctx.strokeStyle = 'rgba(0, 0, 0, 0)';
            ctx.lineWidth = 20;
            strokeWire();
            hit = ctx.isPointInStroke(mousePos.x - overElem.offsetLeft, mousePos.y - overElem.offsetTop);
          }

          // Now do the real stroke with color based on hit detection
          ctx.strokeStyle = hit ? 'rgb(255, 0, 0)' : 'rgb(0, 255, 0)';
          ctx.lineWidth = 6;
          strokeWire();

          if (hit) {
            hitWireCxnIds.push(cid);
          }
        }
      }

      return hitWireCxnIds;
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

        // Size and position canvas to overlay block container
        const overElem = blockContainerElem;
        matchElemSize(addingWireCanvasElem, overElem);

        const ctx = addingWireCanvasElem.getContext('2d');
        const cWidth = addingWireCanvasElem.width;
        const cHeight = addingWireCanvasElem.height;

        ctx.clearRect(0, 0, cWidth, cHeight);

        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.strokeStyle = willBeValid ? 'rgb(0, 255, 0)' : 'rgb(255,105,180)';
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

    const updateDeleteWiresButton = () => {
      deleteWiresButtonElem.style.color = showFront ? 'rgb(92, 104, 97)' : '#9aada2';
      deleteWiresButtonElem.style.cursor = showFront ? 'default' : 'pointer';
      deleteWiresButtonElem.style.backgroundColor = (!showFront && deletingWiresMode) ? 'rgb(170,0,0)' : 'transparent';
      deleteWiresButtonElem.disabled = showFront;
    };

    const toggleDeleteWiresMode = () => {
      if (deletingWiresMode) {
        deletingWiresMode = false;
        updateWires();
      } else {
        addingWireAttachedJack = null;
        addingWireLooseCoord = null;
        deletingWiresMode = true;
        if (currentEnteredJack) {
          currentEnteredJack.style.backgroundColor = JACK_NORMAL_BACKGROUND_COLOR;
          currentEnteredJack.style.cursor = 'default';
        }
        updateWires();
        updateAddingWire();
      }
      updateDeleteWiresButton();
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
      if (deletingWiresMode) {
        return;
      }

      e.preventDefault();
      const jackElem = e.currentTarget;

      if (addingWireAttachedJack) {
        finishAddingWire();
      } else {
        addingWireAttachedJack = jackElem;
        addingWireLooseCoord = {x: e.pageX, y: e.pageY};
      }
      updateAddingWire();
    };

    const handleMouseDown = (e) => {
      if (deletingWiresMode) {
        const hitWireCxnIds = updateWires();
        if (hitWireCxnIds.length > 0) {
          e.preventDefault();
          for (const cid of hitWireCxnIds) {
            removeConnection(cid);
          }
        }
      }
    };
    document.addEventListener('mousedown', handleMouseDown, false);

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
      mousePos = {x: e.pageX, y: e.pageY};
      if (!showFront && deletingWiresMode) {
        updateWires();
      }
      if (addingWireAttachedJack) {
        addingWireLooseCoord = {x: e.pageX, y: e.pageY};
        updateAddingWire();
      }
    };
    document.addEventListener('mousemove', handleMouseMove, false);

    const JACK_NORMAL_BACKGROUND_COLOR = '#bbb';
    const JACK_HOVER_BACKGROUND_COLOR = '#eee';

    const handleJackMouseEnter = (e) => {
      const jackElem = e.currentTarget;
      if (!deletingWiresMode) {
        jackElem.style.backgroundColor = JACK_HOVER_BACKGROUND_COLOR;
        jackElem.style.cursor = 'pointer';
      }
      currentEnteredJack = jackElem;
    }

    const handleJackMouseLeave = (e) => {
      const jackElem = e.currentTarget;
      jackElem.style.backgroundColor = JACK_NORMAL_BACKGROUND_COLOR;
      jackElem.style.cursor = 'default';
      currentEnteredJack = null;
    }

    const createJackElem = (blockId, inout, portName, ralign) => {
      const jackElem = document.createElement('div');
      jackElem.style.cssText = 'color:black;font-size:12px;display:inline-block;box-sizing:border-box;border:1px solid #555;margin:2px 0;padding:3px 6px;border-radius:2px;word-break:break-word;cursor:pointer;user-select:none';
      jackElem.style.backgroundColor = JACK_NORMAL_BACKGROUND_COLOR;
      jackElem.dataset.blockid = blockId;
      jackElem.dataset.inout = inout;
      jackElem.dataset.portname = portName;
      jackElem.className = 'port-jack';
      jackElem.addEventListener('mousedown', handleJackMouseDown, false);
      jackElem.addEventListener('mouseenter', handleJackMouseEnter, false);
      jackElem.addEventListener('mouseleave', handleJackMouseLeave, false);
      jackElem.textContent = (inout === 'input') ? ('\u25B7 ' + portName) : (portName + ' \u25BA');

      const wrapperElem = document.createElement('div');
      if (ralign) {
        wrapperElem.style.textAlign = 'right';
      }
      wrapperElem.appendChild(jackElem);

      return wrapperElem;
    };

    const addBlock = (blockClassId, settings, blockId, displayName) => {
      const viewContainerElem = document.createElement('div');

      const blockClass = availableBlockClassesPlusPseudo[blockClassId];
      const blockInst = new blockClass(audioContext, viewContainerElem, settings);

      const bid = blockId || 'b' + blockIdSeq.next();

      blockInfo[bid] = {
        id: bid,
        blockClassId,
        instance: blockInst,
        displayName: displayName || blockClass.blockName,
        wrapperElem: undefined, // first child is front panel, second child is back panel
        jackContainerElem: undefined,
      };
      uniquifyDisplayName(bid);

      if (!viewContainerElem.hasChildNodes()) {
        const PLACEHOLDER_WIDTH = 62;
        const PLACEHOLDER_HEIGHT = 256;
        viewContainerElem.innerHTML = '<div style="box-sizing:border-box;width:' + PLACEHOLDER_WIDTH + 'px;height:' + PLACEHOLDER_HEIGHT + 'px;text-align:center;font-size:14px;background:white;font-style:italic;color:gray;padding:100px 5px">No view</div>';
      }

      const wrapperElem = document.createElement('div');
      wrapperElem.style.cssText = 'margin: 1px';
      wrapperElem.setAttribute('data-blockid', bid);
      wrapperElem.appendChild(viewContainerElem);

      blockContainerElem.appendChild(wrapperElem);
      blockInfo[bid].wrapperElem = wrapperElem;

      // Create back panel
      const showHelpElem = document.createElement('a');
      showHelpElem.style.cssText = 'float:right;color: #ccc;text-decoration: none;margin-right:3px';
      showHelpElem.href = '#';
      showHelpElem.textContent = '?';
      showHelpElem.addEventListener('click', (e) => {
        e.preventDefault();
        showBlockHelp(blockClass);
      });

      const removeBlockElem = document.createElement('a');
      removeBlockElem.style.cssText = 'float:right;color: #ccc;text-decoration: none';
      removeBlockElem.href = '#';
      removeBlockElem.textContent = 'X';
      removeBlockElem.addEventListener('click', (e) => {
        e.preventDefault();
        removeBlock(bid);
      });

      const headerElem = document.createElement('div');
      headerElem.style.cssText = 'background-color: #555; font-size: 12px; padding: 4px 6px; color: #ccc';
      if (!blockClassId.startsWith('__')) { // Hacky way to test if pseudoblock
        headerElem.appendChild(removeBlockElem);
      }
        headerElem.appendChild(showHelpElem);
      headerElem.appendChild(document.createTextNode(blockInfo[bid].displayName));

      const jackContainerElem = document.createElement('div');
      jackContainerElem.style.cssText = 'padding: 5px';
      blockInfo[bid].jackContainerElem = jackContainerElem;

      const backPanelElem = document.createElement('div');
      backPanelElem.style.cssText = 'background-color:#ddd';
      backPanelElem.appendChild(headerElem);
      backPanelElem.appendChild(jackContainerElem);
      wrapperElem.appendChild(backPanelElem);

      // Add elements representing ports
      for (const pn in blockInst.inputs) {
        jackContainerElem.appendChild(createJackElem(bid, 'input', pn));
      }
      for (const pn in blockInst.outputs) {
        jackContainerElem.appendChild(createJackElem(bid, 'output', pn, true));
      }

      updateBackPanelDimensions(bid);
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

      // Deactivate if it has a deactivation method
      const binst = blockInfo[bid].instance;
      if (binst.deactivate) {
        binst.deactivate();
      }

      // Unmount its UI and wrapper
      blockContainerElem.removeChild(blockInfo[bid].wrapperElem);

      delete blockInfo[bid];

      updateWires();
      updatePatchConnectOptions();
    };

    const addConnection = ({outBlockId, outPortName, inBlockId, inPortName}) => {
      const cid = 'c' + cxnIdSeq.next();

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

    const extractFromDataTransfer = (dt) => {
      for (const t of dt.types) {
        if (t === BLOCK_CLASS_ID_MIME_TYPE) {
          return dt.getData(BLOCK_CLASS_ID_MIME_TYPE);
        }
      }

      return null;
    };

    blockContainerElem.addEventListener('dragover', e => {
      if (extractFromDataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      e.preventDefault();
      e.stopPropagation();
  }, false);

    blockContainerElem.addEventListener('drop', e => {
      const blockClassId = extractFromDataTransfer(e.dataTransfer);
      if (blockClassId) {
        addBlock(blockClassId);
      }
      e.preventDefault();
      e.stopPropagation();
    }, false);

    // Load settings if present, otherwise set up some defaults
    if (settings) {
      // Load blocks
      for (const bid of settings.bo) {
        const binfo = settings.bm[bid];
        addBlock(binfo.b, binfo.s, bid, binfo.n);
      }

      // Advance block id sequence number
      const blockSeqNums = [];
      for (const bid of settings.bo) {
        if (bid[0] === 'b') {
          blockSeqNums.push(+bid.slice(1));
        }
      }
      blockIdSeq.set(Math.max(...blockSeqNums)+1);

      // Load connections
      for (const cxn of settings.c) {
        addConnection({
          outBlockId: cxn.ob,
          outPortName: cxn.op,
          inBlockId: cxn.ib,
          inPortName: cxn.ip,
        });
      }
    } else {
      // Set up default (pseudo) blocks
      // addBlock(RACK_INPUTS_PSEUDO_CLASS_ID, null, RACK_INPUTS_PSEUDO_BLOCK_ID, 'Rack Inputs') // Don't need this yet
      addBlock(RACK_OUTPUTS_PSEUDO_CLASS_ID, null, RACK_OUTPUTS_PSEUDO_BLOCK_ID, 'Rack Outputs');
    }

    const onKeydownFunc = (e) => {
      if (!((e.target === document.body) || (e.target == document.documentElement))) {
        // This should ignore keypresses that were done while an input element was focused
        return;
      }
      if (e.keyCode === 32) {
        toggleFrontBackDisplay();
        e.preventDefault();
      } else if (e.keyCode === 68) {
        if (!showFront) {
          toggleDeleteWiresMode();
          e.preventDefault();
        }
      }
    };
    document.addEventListener('keydown', onKeydownFunc);

    viewContainer.querySelector('.toggle-front-back-button').addEventListener('click', () => {
      toggleFrontBackDisplay();
    });

    deleteWiresButtonElem.addEventListener('click', () => {
      toggleDeleteWiresMode();
    });

    blockContainerElem.addEventListener('scroll', () => {
      updateWires();
      updateAddingWire();
    });

    const onResizeFunc = () => {
      updateWires();
      updateAddingWire();
    };
    window.addEventListener('resize', onResizeFunc);

    // Do initial UI updates
    updatePatchConnectionValidity();
    updatePatchConnectOptions();
    updateWires();

    this.deactivate = () => {
      // NOTE: We remove blocks one by one. It might be safe to just directly
      //  deactivate them and do less work, but this is easy and should be robust.
      const bids = [];
      for (const bid in blockInfo) {
        bids.push(bid);
      }

      for (const bid of bids) {
        removeBlock(bid);
      }

      document.removeEventListener('keydown', onKeydownFunc);
      document.removeEventListener('mousedown', handleMouseDown, false);
      document.removeEventListener('mouseup', handleMouseUp, false);
      document.removeEventListener('mousemove', handleMouseMove, false);
      window.removeEventListener('resize', onResizeFunc);
    };

    // Store some stuff as member variables
    // TODO: move save definition in here and get rid of these
    this.blockInfo = blockInfo;
    this.blockContainerElem = blockContainerElem;
    this.cxnInfo = cxnInfo;
    this.removeBlock = removeBlock;
  }

  save() {
    // Build map from block id to saved block info
    const blockMap = {}; // since keys are strings, don't need to use Map
    for (const bid in this.blockInfo) {
      const binfo = this.blockInfo[bid];
      blockMap[bid] = {
        b: binfo.blockClassId,
        s: binfo.instance.save ? binfo.instance.save() : null,
        n: binfo.displayName,
      }
    }

    // Iterate displayed blocks to find their order
    const blockOrder = [];
    for (const el of [...this.blockContainerElem.childNodes]) {
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
        ob: cinfo.outBlockId,
        op: cinfo.outPortName,
        ib: cinfo.inBlockId,
        ip: cinfo.inPortName,
      });
    }

    return {
      bm: blockMap,
      bo: blockOrder,
      c: connections,
    };
  }
}

Rack.blockName = 'Rack';

// End of un-indented Rack class definition
return Rack;
}
