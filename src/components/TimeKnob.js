import React from 'react'

import Knob from './Knob'

function formatInternalValue(v) {
  if (Math.abs(v) < 1) {
    return Knob.formatWithMinimumDigits(1000*v, 3) + ' ms';
  } else {
    return Knob.formatWithMinimumDigits(v, 3) + ' s';
  }
}

export default function TimeKnob(props) {
  return (
    <Knob curve="log" formatInternalValue={formatInternalValue} {...props} />
  );
}
