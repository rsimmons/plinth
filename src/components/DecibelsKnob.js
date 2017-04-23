import React from 'react'

import Knob from './Knob'

function formatInternalValue(v) {
  return Knob.formatWithMinimumDigits(v, 3) + ' db';
}

export default function DecibelsKnob(props) {
  return (
    <Knob formatInternalValue={formatInternalValue} {...props} />
  );
}
