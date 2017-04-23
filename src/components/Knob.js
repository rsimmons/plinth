import React from 'react'

const DRAG_PIXELS_TO_NORMALIZED_VALUE = 0.008; 

const clampUnit = (v) => {
  if (v < 0) {
    return 0;
  } else if (v > 1) {
    return 1;
  } else if (isNaN(v)) {
    return 0;
  } else {
    return v;
  }
}

export default class Knob extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      inputFocused: false,
      editingText: null,
      canvasFocused: false,
    };

    this.mouseCaptured = false;
    this.lastMousePosition;

    this.handleInputFocus = this.handleInputFocus.bind(this);
    this.handleInputBlur = this.handleInputBlur.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleInputKeyDown = this.handleInputKeyDown.bind(this);
    this.defaultInternalValueToNormalized = this.defaultInternalValueToNormalized.bind(this);
    this.defaultNormalizedValueToInternal = this.defaultNormalizedValueToInternal.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleCanvasFocus = this.handleCanvasFocus.bind(this);
    this.handleCanvasBlur = this.handleCanvasBlur.bind(this);
    this.handleCanvasKeyDown = this.handleCanvasKeyDown.bind(this);
    this.captureMouse = this.captureMouse.bind(this);
    this.releaseMouse = this.releaseMouse.bind(this);
  }

  // Utility method that can also be used by other components that use this one
  static formatWithMinimumDigits(v, minDigits) {
    for (let i = 0; ; i++) {
      const s = v.toFixed(i);
      const len = (s.match(/[0-9]/g)||[]).length;
      if (len >= minDigits) {
        return s;
      }
    }
  }

  defaultFormatInternalValue(v) {
    return Knob.formatWithMinimumDigits(v, 3);
  }

  formatInternalValue(v) {
    const impl = this.props.formatInternalValue || this.defaultFormatInternalValue;
    return impl(v);
  }

  getEffectiveCurve() {
    return this.props.curve || 'linear';
  }

  getEffectiveMin() {
    return (this.props.min !== undefined) ? this.props.min : 0;
  }

  getEffectiveMax() {
    return (this.props.max !== undefined) ? this.props.max : 0;
  }

  defaultInternalValueToNormalized(v) {
    const curve = this.getEffectiveCurve();
    const min = this.getEffectiveMin();
    const max = this.getEffectiveMax();

    let nv;

    if (curve === 'linear') {
      nv = (v - min)/(max - min);
    } else if (curve === 'log') {
      nv = Math.log(v/min)/Math.log(max/min);
    } else {
      throw new Error('Unrecognized value for curve', curve);
    }

    return nv;
  }

  // This _may_ result in a value outside [0,1], or even NaN
  internalValueToNormalized(v) {
    const impl = this.props.internalValueToNormalized || this.defaultInternalValueToNormalized;
    return impl(v);
  }

  defaultNormalizedValueToInternal(nv) {
    const curve = this.getEffectiveCurve();
    const min = this.getEffectiveMin();
    const max = this.getEffectiveMax();

    let v;

    if (curve === 'linear') {
      v = min + nv*(max - min);
    } else if (curve === 'log') {
      v = min * Math.exp(nv * Math.log(max/min));
    } else {
      throw new Error('Unrecognized value for curve', curve);
    }

    return v;
  }

  // This expects a value within [0,1]
  normalizedValueToInternal(nv) {
    if ((nv < 0) || (nv > 1)) {
      console.warn('normalizedValueToInternal: input out of range');
    }

    const impl = this.props.normalizedValueToInternal || this.defaultNormalizedValueToInternal;
    return impl(nv);
  }

  parseToInternalValue(s) {
    return parseFloat(s);
  }

  componentDidMount() {
    this.updateCanvas();
  }

  componentDidUpdate() {
    this.updateCanvas();
  }

  componentWillUnmount() {
    if (this.mouseCaptured) {
      this.releaseMouse();
    }
  }

  handleInputFocus() {
    this.setState({
      inputFocused: true,
      editingText: '',
    });
  }

  commitEditText() {
    const v = this.parseToInternalValue(this.inputElem.value);
    if (isNaN(v)) {
      // Ignore the edit
    } else {
      this.props.onChange(v);
    }
  }

  handleInputBlur() {
    this.commitEditText();
    this.setState({
      inputFocused: false,
      editingText: null,
    });
  }

  handleInputChange(e) {
    if (this.state.inputFocused) {
      this.setState({
        editingText: e.target.value,
      });
    } else {
      // NOTE: I'm not sure if this code can be reached, but if it can, I think this is the right behavior
      this.commitEditText();
    }
  }

  handleInputKeyDown(e) {
    switch (e.key) {
      case 'Enter':
        this.inputElem.blur();
        break;

      case 'Escape':
        this.inputElem.value = ''; // NOTE: This is a hacky way to cause the edit to be cancelled, but seems to work
        this.inputElem.blur();
        break;
    }
  }

  captureMouse() {
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    this.mouseCaptured = true;
  }

  releaseMouse() {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    this.mouseCaptured = false;
  }

  handleMouseDown(e) {
    this.captureMouse();
    this.lastMousePosition = {x: e.nativeEvent.pageX, y: e.nativeEvent.pageY};
    this.canvasElem.focus(); // Since we preventDefault, need to do this manually
    e.preventDefault();
  }

  adjustValueByPixels(deltaPixels) {
    const deltaNormalizedValue = deltaPixels*DRAG_PIXELS_TO_NORMALIZED_VALUE;

    const newValue = this.normalizedValueToInternal(clampUnit(this.internalValueToNormalized(this.props.value)+deltaNormalizedValue));
    this.props.onChange(newValue);
  }

  handleMouseMove(e) {
    const dx = e.pageX - this.lastMousePosition.x;
    const dy = e.pageY - this.lastMousePosition.y;
    this.lastMousePosition = {x: e.pageX, y: e.pageY};

    this.adjustValueByPixels(-dy);
  }

  handleMouseUp(e) {
    this.releaseMouse();
    this.lastMousePosition = undefined;
  }

  handleCanvasFocus() {
    this.setState({
      canvasFocused: true,
    });
  }

  handleCanvasBlur() {
    this.setState({
      canvasFocused: false,
    });
  }

  handleCanvasKeyDown(e) {
    switch (e.key) {
      case 'ArrowUp':
        this.adjustValueByPixels(1);
        break;

      case 'ArrowDown':
        this.adjustValueByPixels(-1);
        break;
    }
  }

  updateCanvas() {
    const canvasWidth = this.canvasElem.width;
    const canvasHeight = this.canvasElem.height;

    const ctx = this.canvasElem.getContext('2d');

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const knobCenterX = 0.5*canvasWidth;
    const knobCenterY = 0.5*canvasHeight;
    const knobRadius = 0.3*canvasWidth;
    const arcRadius = 0.45*canvasWidth;
    const bottomHalfAngle = Math.PI/6;
    const beginAngle = 0.5*Math.PI+bottomHalfAngle;
    const endAngle = 2.5*Math.PI-bottomHalfAngle;
    const nv = this.internalValueToNormalized(this.props.value);
    let currentAngle;
    let validAngle;
    if ((nv < 0) || (nv > 1) || isNaN(nv)) {
      validAngle = false;
    } else {
      currentAngle = beginAngle + this.internalValueToNormalized(this.props.value)*(endAngle - beginAngle);
      validAngle = true;
    }

    const activeArcStyle = 'rgb(102, 153, 255)';
    const inactiveArcStyle = 'rgb(150, 150, 150)';
    const knobFaceStyle = 'rgb(200, 200, 200)';
    const notchStyle = 'rgb(64, 64, 64)';

    ctx.lineWidth = 2;
    if (validAngle) {
      ctx.strokeStyle = activeArcStyle;
      ctx.beginPath();
      ctx.arc(knobCenterX, knobCenterY, arcRadius, beginAngle, currentAngle);
      ctx.stroke();
      ctx.strokeStyle = inactiveArcStyle;
      ctx.beginPath();
      ctx.arc(knobCenterX, knobCenterY, arcRadius, currentAngle, endAngle);
      ctx.stroke();
    } else {
      ctx.strokeStyle = inactiveArcStyle;
      ctx.beginPath();
      ctx.arc(knobCenterX, knobCenterY, arcRadius, beginAngle, endAngle);
      ctx.stroke();
    }

    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = knobFaceStyle;

    ctx.beginPath();
    ctx.arc(knobCenterX, knobCenterY, knobRadius, 0, 2*Math.PI);
    ctx.fill();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowColor = 'rgba(0, 0, 0, 0)';

    if (validAngle) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = notchStyle;

      ctx.translate(knobCenterX, knobCenterY);
      ctx.rotate(currentAngle);
      ctx.translate(-knobCenterX, -knobCenterY);

      ctx.beginPath();
      ctx.moveTo(knobCenterX+knobRadius, knobCenterY);
      ctx.lineTo(knobCenterX+0.25*knobRadius, knobCenterY);
      ctx.stroke();

      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    if (this.state.canvasFocused) {
      const FOCUS_CIRCLE_RADIUS = 2;
      ctx.lineWidth = 1;
      ctx.strokeStyle = inactiveArcStyle;
      ctx.beginPath();
      ctx.arc(knobCenterX, knobCenterY, 0.65*canvasWidth, 0, 2*Math.PI);
      ctx.stroke();
    }
  }

  render() {
    const {value, label, width} = this.props;

    const canvasWidth = width;
    const canvasHeight = width;
    const WIDE_WIDTH = 200; // For centering text in absolutely positioned elements

    const inputText = this.state.inputFocused ? this.state.editingText : this.formatInternalValue(value);
    const inputExtraAttrs = this.state.inputFocused ? { onKeyDown: this.handleInputKeyDown } : {};

    return (
      <div style={{position: 'relative'}}>
        <label style={{display: 'block', position: 'absolute', top: -(0.5*canvasHeight + 15), width: WIDE_WIDTH, left: -0.5*WIDE_WIDTH, textAlign: 'center', whiteSpace: 'nowrap'}}>{label}</label>
        <canvas ref={canvas => { this.canvasElem = canvas; }} width={canvasWidth} height={canvasHeight} onMouseDown={this.handleMouseDown} onFocus={this.handleCanvasFocus} onBlur={this.handleCanvasBlur} onKeyDown={this.handleCanvasKeyDown} style={{position: 'absolute', width: canvasWidth, height: canvasHeight, left: -0.5*canvasWidth, top: -0.5*canvasHeight, outline: 'none'}} tabIndex="0" />
        <input ref={(elem) => { this.inputElem = elem; }} type="text" style={{position: 'absolute', top: 0.5*canvasHeight - 5, width: 1.2*width, left: -0.6*width, textAlign: 'center', background: 'none', border: 0, fontSize: 'inherit', fontFamily: 'inherit'}} value={inputText} onFocus={this.handleInputFocus} onBlur={this.handleInputBlur} onChange={this.handleInputChange} {...inputExtraAttrs} />
      </div>
    );
  }
}
