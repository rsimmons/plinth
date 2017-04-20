import React from 'react'

export default class GridSelector extends React.Component {
  constructor(props) {
    super(props);

    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(event) {
    this.props.onChange(event.target.dataset.value);
  }

  render() {
    const {options, value, label, color, bgColor, cellWidth, cellHeight} = this.props;

    return (
      <div>
        <label>{label}</label>
        <div style={{marginTop: 2}}>
          {options.map(o => {
            const active = o.value === value;
            return (
              <button key={o.value} style={{background: active ? color : bgColor, color: active ? bgColor : color, border: '1px solid ' + color, marginTop: -1, marginRight: -1, width: cellWidth, height: cellHeight, outline: 'none', padding: 0}} data-value={o.value} onClick={this.handleClick}>{o.label}</button>
            );
          })}
        </div>
      </div>
    );
  }
}
