import React from 'react'

import Knob from './Knob'

function formatInternalValue(v) {
  return Knob.formatWithMinimumDigits(100*v, 2) + '%';
}

export default function PercentageKnob(props) {
  return (
    <Knob value={props.value} label={props.label} width={props.width} min={props.min} max={props.max} onChange={props.onChange} formatInternalValue={formatInternalValue} />
  );
}
