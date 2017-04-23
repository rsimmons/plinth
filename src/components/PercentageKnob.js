import React from 'react'

import Knob from './Knob'

function formatInternalValue(v) {
  return Knob.formatWithMinimumDigits(100*v, 2) + '%';
}

export default function PercentageKnob(props) {
  return (
    <Knob formatInternalValue={formatInternalValue} {...props} />
  );
}
