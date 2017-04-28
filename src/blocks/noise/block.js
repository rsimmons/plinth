import React from 'react'
import ReactDOM from 'react-dom';
import BlockRoot from '../../components/BlockRoot';
import {generateWhiteNoise, generatePinkNoise, generateBrownNoise} from '../../noise';

class View extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {color, setColor} = this.props;
    const BUTTON_SIDE = 50;
    const options = [
      {name: 'white', color: 'white'},
      {name: 'pink', color: 'pink'},
      {name: 'brown', color: '#663300'},
    ];

    return (
      <BlockRoot widthUnits={1} extraStyles={{position: 'relative', background: '#999'}}>
        {options.map((o, i) => {
          const active = o.name === color;
          const centerX = 31;
          const centerY = 256*(i+0.5)/options.length;
          const left = centerX - 0.5*BUTTON_SIDE;
          const top = centerY - 0.5*BUTTON_SIDE;
          return (
            <button key={o.name} style={{position: 'absolute', boxSizing: 'border-box', left: left, top: top, width: BUTTON_SIDE, height: BUTTON_SIDE, background: o.color, border: active ? '5px solid black' : 'none', outline: 'none', padding: 0}} onClick={() => {setColor(o.name)}}></button>
          );
        })}
      </BlockRoot>
    );
  }
}

export default class Noise {
  constructor(audioContext, viewContainer, settings) {
    const outputNode = audioContext.createGain();
    outputNode.gain.value = 1;

    const createSourceNode = (filler) => {
      const NUM_SECONDS = 4;
      const NUM_FRAMES = NUM_SECONDS*audioContext.sampleRate;
      const buffer = audioContext.createBuffer(1, NUM_FRAMES, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      filler(data);
      const sourceNode = audioContext.createBufferSource();
      sourceNode.buffer = buffer;
      sourceNode.loop = true;
      sourceNode.start();
      return sourceNode;
    };

    const colorSources = {
      'white': createSourceNode(generateWhiteNoise), 
      'pink': createSourceNode(generatePinkNoise), 
      'brown': createSourceNode(generateBrownNoise), 
    };

    this.inputs = {
    };
    this.outputs = {
      'audio': {type: 'audio', node: outputNode},
    };

    let color;
    let renderReady = false;

    const setColor = (v) => {
      if (v === color) {
        return;
      }

      if (color) {
        colorSources[color].disconnect();
      }

      color = v;

      colorSources[color].connect(outputNode);

      render();
    };

    const render = () => {
      if (renderReady) {
        ReactDOM.render(<View color={color} setColor={setColor} />, viewContainer);
      }
    }

    if (!settings) {
      settings = {
        c: 'pink',
      }
    }

    setColor(settings.c);

    renderReady = true;
    render();

    this.save = () => {
      return {
        c: color,
      };
    };

    this.destroy = () => {
      ReactDOM.unmountComponentAtNode(viewContainer);
    };
  }
}

Noise.blockName = 'Noise';
Noise.helpText =
`Noise is a simple noise generator.

The panel buttons let you select between three "colors" of noise: white, pink, and brown. White is the brightest sounding, with more high frequencies, and brown is the darkest sounding with less high frequencies.
`;
