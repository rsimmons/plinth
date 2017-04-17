import React from 'react'

import Knob from './Knob'

function formatInternalValue(v) {
  if (Math.abs(v) >= 1000) {
    return Knob.formatWithMinimumDigits(0.001*v, 3) + ' kHz';
  } else {
    return Knob.formatWithMinimumDigits(v, 3) + ' Hz';
  }
}

export default function FrequencyKnob(props) {
  return (
    <Knob value={props.value} label={props.label} width={props.width} onChange={props.onChange} formatInternalValue={formatInternalValue} />
  );
}
