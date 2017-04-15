import React from 'react'

export default class Select extends React.Component {
  constructor(props) {
    super(props);

    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    this.props.onChange(event.target.value);
  }

  render() {
    const {options, value, label} = this.props;

    return (
      <label>
        {label}<br />
        <select value={value} onChange={this.handleChange}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    );
  }
}
