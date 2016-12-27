import htmlToElement from '../../util/htmlToElement';

export default class DrumSynth {
  constructor(document, audioContext) {
    const PITCH_LOW = 1;
    const PITCH_START = 440;
    const PITCH_DECAY = 0.1;

    let lastGateValue = false;
    const gateNotify = (time, value) => {
      console.log('drum synth gate', time, value);
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
    this.panelView = htmlToElement(document, '<div style="box-sizing: border-box; width: 128px; height: 256px; border: 1px solid black; padding: 5px;">DrumSynth</div>');
  }
}
