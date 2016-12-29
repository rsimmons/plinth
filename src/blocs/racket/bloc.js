import sha256 from 'js-sha256';

export default class Racket {
  constructor(document, audioContext) {
    const outputNode = audioContext.createGain();

    this.inputs = {
    };
    this.outputs = {
      'audio': {type: 'audio', node: outputNode},
    };

    // Create interface
    this.windowView = document.createElement('div');
    this.windowView.style = 'display: flex; flex-direction: column; min-height: 100%; background-color: #222';

    const headerElem = document.createElement('div');
    headerElem.style = 'background-color: #ffdcbd; font-size: 18px; padding: 5px 10px; text-align: center;';
    headerElem.textContent = 'Racket';
    this.windowView.appendChild(headerElem);

    const columnsElem = document.createElement('div');
    columnsElem.style = 'flex-grow: 1; display: flex';
    this.windowView.appendChild(columnsElem);

    const blocContainerElem = document.createElement('div');
    blocContainerElem.style = 'flex: 1; display: flex; flex-wrap: wrap';
    columnsElem.appendChild(blocContainerElem);

    const patchingPanelElem = document.createElement('div');
    patchingPanelElem.style = 'flex: 0 0 300px; background-color: rgb(187, 218, 212); padding: 5px';
    patchingPanelElem.textContent = 'TODO: patching controls here';
    columnsElem.appendChild(patchingPanelElem);

    let nextBlocId = 1;
    const blocInfo = {}; // maps bloc id (our local unique id for bloc instances) to an info object

    const addBloc = (code) => {
      const bid = nextBlocId;
      nextBlocId++;

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
      };
    }

    this.windowView.addEventListener('dragover', function(e) {
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
