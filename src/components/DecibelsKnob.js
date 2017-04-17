import React from 'react'

import Knob from './Knob'

function formatInternalValue(v) {
  return Knob.formatWithMinimumDigits(v, 3) + ' db';
}

export default function DecibelsKnob(props) {
  return (
    <Knob value={props.value} label={props.label} width={props.width} min={props.min} max={props.max} onChange={props.onChange} formatInternalValue={formatInternalValue} />
  );
}
