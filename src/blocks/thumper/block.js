// Drum icon by Raz Cohen, CC BY 3.0 US, from https://thenounproject.com/term/bass-drum/118259/
const DRUM_SVG_URL = require('./drum.svg');

export default class Thumper {
  constructor(document, audioContext, settings) {
    const PITCH_LOW = 1;
    const PITCH_START = 440;
    const PITCH_DECAY = 0.1;

    let lastGateValue = false;
    const gateNotify = (time, value) => {
      if (value && !lastGateValue) {
        // TODO: initiate hit at time
        oscNode.frequency.setValueAtTime(PITCH_START, time);
        oscNode.frequency.exponentialRampToValueAtTime(PITCH_LOW, time+PITCH_DECAY);
      }
      lastGateValue = value;
    };

    const oscNode = audioContext.createOscillator();
    oscNode.type = 'sine';
    oscNode.frequency.value = PITCH_LOW;
    oscNode.start();

    this.inputs = {
      'gate': {type: 'gateEvent', notify: gateNotify},
    };
    this.outputs = {
      'audio': {type: 'audio', node: oscNode},
    };

    const tmpElem = document.createElement('div');
    tmpElem.innerHTML = '<div style="box-sizing: border-box; width: 126px; height: 256px; padding: 5px; background-color: #e8a35f;position:relative"><div style="text-align:center;position:absolute;width:116px;bottom:0px"><img width="100" height="100" src=' + DRUM_SVG_URL + '></div></div>';
    this.panelView = tmpElem.childNodes[0];
  }
}

Thumper.blockName = 'Thumper';
