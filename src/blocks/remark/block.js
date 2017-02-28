const template = require('./template.html');

export default class Remark {
  constructor(document, audioContext, settings) {
    this.inputs = {
    };
    this.outputs = {
    };

    const tmpElem = document.createElement('div');
    tmpElem.innerHTML = template;
    this.panelView = tmpElem.childNodes[0];
    const textareaElem = this.panelView.querySelector('textarea');

    textareaElem.addEventListener('dblclick', (e) => {
      textareaElem.readOnly = !textareaElem.readOnly;
      e.preventDefault();
    }, true);

    if (settings) {
      textareaElem.value = settings.t;
      textareaElem.readOnly = true;
    }

    this.save = () => {
      return {
        t: textareaElem.value,
      };
    };
  }
}

Remark.blockName = 'Remark';
Remark.helpText =
`Remark is a special block that doesn't process audio but merely provides a place to write notes about a patch.

Double click anywhere in the text area to allow/disallow editing the text.`;
