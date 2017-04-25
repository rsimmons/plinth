import React from 'react'

export default class GridSelector extends React.Component {
  constructor(props) {
    super(props);

    this.handleClickOrTouchStart = this.handleClickOrTouchStart.bind(this);
  }

  handleClickOrTouchStart(e) {
    e.preventDefault();
    this.props.onChange(e.target.dataset.value);
  }

  render() {
    const {options, value, label, color, bgColor, cellWidth, cellHeight} = this.props;

    return (
      <div>
        { label ? <label style={{marginBottom: 2}}>{label}</label> : '' }
        <div>
          {options.map(o => {
            const active = o.value === value;
            return (
              <button key={o.value} style={{background: active ? color : bgColor, color: active ? bgColor : color, border: '1px solid ' + color, marginTop: -1, marginRight: -1, width: cellWidth, height: cellHeight, outline: 'none', padding: 0, lineHeight: 1}} data-value={o.value} onClick={this.handleClickOrTouchStart} onTouchStart={this.handleClickOrTouchStart}>{o.label}</button>
            );
          })}
        </div>
      </div>
    );
  }
}
