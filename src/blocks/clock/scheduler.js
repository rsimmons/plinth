export default class EventScheduler {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.running = false;
    this.timeoutID = null;
  }

  start(callback) {
    const TIMEOUT_DELAY = 0.05; // in seconds
    const BUFFER_DEPTH = 0.3; // in seconds

    const _this = this;

    let startTime = null;
    let bufferedUntil = null;

    const timeoutFunc = function() {
      if (!_this.running) {
        throw new Error('Internal error: timeoutFunc called but scheduler not running');
      }

      const t = _this.audioContext.currentTime;

      if (startTime === null) {
        startTime = t;
        bufferedUntil = t;
      }

      if (bufferedUntil < t) {
        console.log('FELL BEHIND BY', t - bufferedUntil);
      }

      const bufferUntil = t + BUFFER_DEPTH;

      callback({
        begin: bufferedUntil,
        end: bufferUntil,
        relativeBegin: bufferedUntil - startTime,
        relativeEnd: bufferUntil - startTime,
        start: startTime,
      });

      bufferedUntil = bufferUntil;

      _this.timeoutID = setTimeout(timeoutFunc, 1000*TIMEOUT_DELAY);
    }

    this.running = true;

    _this.timeoutID = setTimeout(timeoutFunc, 0);
  }

  stop() {
    this.running = false;

    if (this.timeoutID) {
      clearTimeout(this.timeoutID);

      this.timeoutID = null;
    }
  }
}
