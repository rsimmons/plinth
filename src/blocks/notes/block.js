const template = require('./template.html');

export default class Notes {
  constructor(audioContext, viewContainer, settings) {
    this.inputs = {
    };
    this.outputs = {
    };

    viewContainer.innerHTML = template;
    const textareaElem = viewContainer.querySelector('textarea');

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

Notes.blockName = 'Notes';
Notes.helpText =
`Notes is a special block that doesn't process audio but merely provides a place to write notes about a patch.

Double click anywhere in the text area to allow/disallow editing the text.`;
