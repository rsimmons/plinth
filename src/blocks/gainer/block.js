const template = require('!raw!./template.html');

export default class Gainer {
  constructor(document, audioContext, settings) {
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0;

    this.inputs = {
      'audio': {type: 'audio', node: gainNode},
      'gain': {type: 'audio', node: gainNode.gain},
    };
    this.outputs = {
      'audio': {type: 'audio', node: gainNode},
    };
    const tmpElem = document.createElement('div');
    tmpElem.innerHTML = template;
    this.panelView = tmpElem.childNodes[0];
  }
}

Gainer.blockName = 'Gainer';
