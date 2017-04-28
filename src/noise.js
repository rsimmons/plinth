export function generateWhiteNoise(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = Math.random()*2 - 1;
  }
}

// based on code from http://noisehack.com/generate-noise-web-audio-api/
export function generatePinkNoise(arr) {
  let b0, b1, b2, b3, b4, b5, b6;
  b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0;
  for (let i = 0; i < arr.length; i++) {
    const white = Math.random()*2 - 1;
    b0 = 0.99886*b0 + white*0.0555179;
    b1 = 0.99332*b1 + white*0.0750759;
    b2 = 0.96900*b2 + white*0.1538520;
    b3 = 0.86650*b3 + white*0.3104856;
    b4 = 0.55000*b4 + white*0.5329522;
    b5 = -0.7616*b5 - white*0.0168980;
    arr[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white*0.5362;
    arr[i] *= 0.11; // (roughly) compensate for gain
    b6 = white*0.115926;
  }
}

export function generateBrownNoise(arr) {
  let lastOut = 0;
  for (let i = 0; i < arr.length; i++) {
    const white = Math.random()*2 - 1;
    arr[i] = (lastOut + (0.02*white))/1.02;
    lastOut = arr[i];
    arr[i] *= 3.5; // (roughly) compensate for gain
  }
}

