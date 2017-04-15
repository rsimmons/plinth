import React from 'react'

export default class NumericTextInput extends React.Component {
  constructor(props) {
    super(props);

    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    const {onChange, min, max} = this.props;

    const v = parseFloat(event.target.value);

    if (isNaN(v)) {
      return;
    }
    if ((min !== undefined) && (v < min)) {
      return;
    }
    if ((max !== undefined) && (v > max)) {
      return;
    }

    onChange(v);
  }

  render() {
    const {value, label, unit, min, max} = this.props;

    const extraProps = {};
    if (min !== undefined) {
      extraProps.min = min;
    }
    if (max !== undefined) {
      extraProps.min = max;
    }

    return (
      <label>
        {label}<br />
        <input type="number" step="any" value={value} onChange={this.handleChange} style={{width: '5em', textAlign: 'right'}} {...extraProps} />{unit || ''}
      </label>
    );
  }
}
