export function decibelsToAmplitudeRatio(dbs) {
  return Math.pow(10, 0.05*dbs);
}

export function amplitudeRatioToDecibels(amp) {
  return 20*Math.log10(amp);
}
