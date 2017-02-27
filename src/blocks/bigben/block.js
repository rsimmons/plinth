import EventEmitter from 'events';

import EventScheduler from './scheduler';

// CC BY 3.0 from https://www.iconfinder.com/icons/103169/alarm_clock_time_icon
const CLOCK_SVG_URL = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/PjwhRE9DVFlQRSBzdmcgIFBVQkxJQyAnLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4nICAnaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkJz48c3ZnIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDI0IDI0IiBoZWlnaHQ9IjI0cHgiIGlkPSJMYXllcl8xIiB2ZXJzaW9uPSIxLjEiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0cHgiIHhtbDpzcGFjZT0icHJlc2VydmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPjxnPjxnPjxwYXRoIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTEyLDBDNS4zNzUsMCwwLjAwMyw1LjM3MywwLjAwMywxMmMwLDYuNjI3LDUuMzcyLDEyLDExLjk5NywxMiAgICBjNi42MjYsMCwxMS45OTctNS4zNzMsMTEuOTk3LTEyQzIzLjk5Nyw1LjM3MywxOC42MjYsMCwxMiwweiBNMTYuNDEyLDE2LjcwOWwtMC4zNSwwLjM1Yy0wLjI5MSwwLjI5MS0wLjc4MiwwLjMwNS0xLjA4OCwwLjAyOSAgICBsLTQuNTItMy45NTVjLTAuMzA4LTAuMjc1LTAuNTQxLTAuODM4LTAuNTIxLTEuMjVsMC40MTktNy4xMzRDMTAuMzc0LDQuMzM2LDEwLjcyOSw0LDExLjE0Miw0aDAuNDkzICAgIGMwLjQxMywwLDAuNzY3LDAuMzM2LDAuNzg3LDAuNzQ4bDAuMzQzLDUuOTM0YzAuMDIxLDAuNDEzLDAuMjYyLDEsMC41MzUsMS4zMDlsMy4xNDQsMy42MjggICAgQzE2LjcxNywxNS45MjgsMTYuNzA0LDE2LjQxOCwxNi40MTIsMTYuNzA5eiIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9nPjwvZz48L3N2Zz4=';

function createEventOutput() {
  const subscribers = [];
  const subscribe = (cb) => {
    subscribers.push(cb);
    return () => {
      subscribers.splice(subscribers.indexOf(cb), 1);
    };
  };
  const emit = (time, value) => {
    for (const subscriber of subscribers) {
      subscriber(time, value);
    }
  };
  return [subscribe, emit];
}

export default class BigBen {
  constructor(document, audioContext, settings) {
    const TICKS_PER_BEAT = 4;
    const divs = [
      {outName: 'gate16', divisor: 1},
      {outName: 'gate8', divisor: 2},
      {outName: 'gate4', divisor: 4},
    ];

    this.inputs = {};
    this.outputs = {};

    for (const div of divs) {
      const [subscribe, emitter] = createEventOutput();
      this.outputs[div.outName] = {type: 'gateEvent', subscribe: subscribe};
      div.emitter = emitter;
    }

    this.tempo = 120;
    const MIN_TEMPO = 10;

    if (settings) {
      this.tempo = settings.t;
    }

    const tmpElem = document.createElement('div');
    tmpElem.innerHTML = '<div style="box-sizing: border-box; width: 62px; height: 256px; padding: 5px; background-color: #a72a2a;font-size:14px"><div style="text-align:center;margin:40px 0 20px"><img width="48" height="48" src="' + CLOCK_SVG_URL + '"></div><div><label>Tempo<br><input type="number" value="' + this.tempo + '" min="' + MIN_TEMPO + '" style="width: 50px" />bpm</label></div></div>';
    this.panelView = tmpElem.childNodes[0];

    this.panelView.querySelector('input').addEventListener('input', (e) => {
      const t = parseInt(e.target.value, 10);
      if (!isNaN(t) && (t >= MIN_TEMPO)) {
        this.tempo = t;
      }
    }, false);

    this._scheduler = new EventScheduler(audioContext);

    let nextTickTime = audioContext.currentTime + 0.1; // start first tick a little in the future
    let nextTickNumber = 0;

    this._scheduler.start((e) => {
      const secsPerTick = 60.0/(this.tempo*TICKS_PER_BEAT);

      while (nextTickTime < e.end) {
        for (const div of divs) {
          const ticksPerDiv = div.divisor;
          const tickDuration = ticksPerDiv*secsPerTick;

          if ((nextTickNumber % ticksPerDiv) === 0) {
            div.emitter(nextTickTime, true);
            div.emitter(nextTickTime+0.5*tickDuration, false);
            // TODO: "number"/count is Math.round(tick/ticksPerDiv) if we want to export that
          }
        }

        nextTickTime += secsPerTick;
        nextTickNumber++;
      }
    });
  }

  deactivate() {
    this._scheduler.stop();
  }

  save() {
    return {
      t: this.tempo,
    };
  }
}

BigBen.blockName = 'Big Ben';
BigBen.helpText =
`Big Ben is a clock generator. It outputs gate signals at a steady tempo, which is useful for advancing sequencers or triggering repetitive sounds.

The panel input lets you specify a tempo in beats per minute (BPM).

There are three gate outputs that emit gates at different time divisions of the specified tempo: gate16 is 16th notes, gate8 is 8th notes, and gate4 is quarter notes.`;
