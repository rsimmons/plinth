export function presetToJSON(blockClassId, settings) {
  const presetObj = {
    plinthPresetVersion: 0,
    b: blockClassId,
    s: settings,
  };

  return JSON.stringify(presetObj);
}

export function presetFromJSON(s) {
  const presetObj = JSON.parse(s);
  if (presetObj.plinthPresetVersion !== 0) {
    throw new Error('Can\'t load preset');
  }

  return {
    blockClassId: presetObj.b,
    settings: presetObj.s,
  };
}
