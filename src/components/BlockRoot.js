import React from 'react'

export default class BlockRoot extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {widthUnits, extraStyles} = this.props;
    const widthPx = 64*widthUnits - 2;

    return (
      <div style={{boxSizing: 'border-box', width: widthPx+'px', height: '256px', ...extraStyles}}>{this.props.children}</div>
    );
  }
}
