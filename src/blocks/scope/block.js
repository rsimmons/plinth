const template = require('./template.html');

export default class Scope {
  constructor(document, audioContext) {
    const CANVAS_WIDTH = 510;
    const CANVAS_HEIGHT = 256;
    const WINDOW_SIZE = 1024;
    const data = new Float32Array(WINDOW_SIZE);
    const analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = WINDOW_SIZE;

    const constantBuffer = audioContext.createBuffer(1, 2, audioContext.sampleRate);
    const constantData = constantBuffer.getChannelData(0);
    constantData[0] = 0;
    constantData[1] = 0;
    const source = audioContext.createBufferSource();
    source.buffer = constantBuffer;
    source.loop = true;
    source.start();
    source.connect(analyserNode);

    this.inputs = {
      'audio': {type: 'audio', node: analyserNode},
    };
    this.outputs = {
      'audio': {type: 'audio', node: analyserNode}, // pass through input
    };

    const tmpElem = document.createElement('div');
    tmpElem.innerHTML = template;
    this.panelView = tmpElem.childNodes[0];

    const canvasElem = this.panelView.querySelector('canvas');
    const canvasCtx = canvasElem.getContext('2d');

    const draw = () => {
      analyserNode.getFloatTimeDomainData(data);

      // Determine sync index, which will be leftmost displayed
      let syncIndex = 0; // default to zero if no good sync can be found
      for (let i = 0; i < (WINDOW_SIZE-CANVAS_WIDTH); i++) {
        if ((data[i] <= 0) && (data[i+1] > 0)) {
          syncIndex = i;
          break;
        }
      }

      canvasCtx.fillStyle = 'rgb(0, 0, 0)';
      canvasCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      canvasCtx.lineWidth = 1;
      canvasCtx.strokeStyle = 'rgb(0, 255, 0)';

      canvasCtx.beginPath();

      for (let x = 0; x < CANVAS_WIDTH; x++) {
        const y = 0.5*CANVAS_HEIGHT*(1-data[x+syncIndex]);

        if (x === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
      }

      canvasCtx.stroke();

      this.rafId = requestAnimationFrame(draw);
    };
    draw();
  }

  deactivate() {
    cancelAnimationFrame(this.rafId);
  }
}

Scope.blockName = 'Scope';
