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
    this.activeCanvasTouches = {}; // maps from identifier to object
    this.accumulatedValue = 0;

    this.handleInputFocus = this.handleInputFocus.bind(this);
    this.handleInputBlur = this.handleInputBlur.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleInputKeyDown = this.handleInputKeyDown.bind(this);
    this.defaultFormatInternalValue = this.defaultFormatInternalValue.bind(this);
    this.defaultInternalValueToNormalized = this.defaultInternalValueToNormalized.bind(this);
    this.defaultNormalizedValueToInternal = this.defaultNormalizedValueToInternal.bind(this);
    this.handleCanvasMouseDown = this.handleCanvasMouseDown.bind(this);
    this.handleCanvasMouseMove = this.handleCanvasMouseMove.bind(this);
    this.handleCanvasMouseUp = this.handleCanvasMouseUp.bind(this);
    this.handleCanvasTouchStart = this.handleCanvasTouchStart.bind(this);
    this.handleCanvasTouchEndOrCancel = this.handleCanvasTouchEndOrCancel.bind(this);
    this.handleCanvasTouchMove = this.handleCanvasTouchMove.bind(this);
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
    return this.props.integral ? v.toFixed() : Knob.formatWithMinimumDigits(v, 3);
  }

  formatInternalValue(v) {
    const impl = this.props.formatInternalValue || this.defaultFormatInternalValue;
    return impl(v);
  }

  defaultInternalValueToNormalized(v) {
    const curve = this.props.curve;
    const min = this.props.min;
    const max = this.props.max;

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
    const curve = this.props.curve;
    const min = this.props.min;
    const max = this.props.max;

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
    return this.props.integral ? parseInt(s) : parseFloat(s);
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
    document.addEventListener('mousemove', this.handleCanvasMouseMove);
    document.addEventListener('mouseup', this.handleCanvasMouseUp);
    this.mouseCaptured = true;
  }

  releaseMouse() {
    document.removeEventListener('mousemove', this.handleCanvasMouseMove);
    document.removeEventListener('mouseup', this.handleCanvasMouseUp);
    this.mouseCaptured = false;
  }

  handleCanvasMouseDown(e) {
    this.captureMouse();
    this.lastMousePosition = {x: e.nativeEvent.pageX, y: e.nativeEvent.pageY};
    this.canvasElem.focus(); // Since we preventDefault, need to do this manually
    e.preventDefault();
  }

  adjustValueByPixels(deltaPixels) {
    const deltaNormalizedValue = deltaPixels*DRAG_PIXELS_TO_NORMALIZED_VALUE;
    let newValue = this.normalizedValueToInternal(clampUnit(this.internalValueToNormalized(this.props.value + this.accumulatedValue) + deltaNormalizedValue));

    if (this.props.integral) {
      const roundedNewValue = Math.round(newValue);
      this.accumulatedValue = (newValue - roundedNewValue);
      newValue = roundedNewValue;
    }

    if (newValue !== this.props.value) {
      this.props.onChange(newValue);
    }
  }

  // dir should be -1 or 1
  bumpValue(dir) {
    if (this.props.integral) {
      let newValue = this.props.value + dir;
      if (newValue < this.props.min) {
        newValue = this.props.min;
      } else if (newValue > this.props.max) {
        newValue = this.props.max;
      }
      this.props.onChange(newValue);
    } else {
      this.adjustValueByPixels(dir);
    }
  }

  handleCanvasMouseMove(e) {
    const dx = e.pageX - this.lastMousePosition.x;
    const dy = e.pageY - this.lastMousePosition.y;
    this.lastMousePosition = {x: e.pageX, y: e.pageY};

    this.adjustValueByPixels(-dy);
  }

  handleCanvasMouseUp(e) {
    this.releaseMouse();
    this.lastMousePosition = undefined;
  }

  handleCanvasTouchStart(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches.item(i);
      this.activeCanvasTouches[t.identifier] = {
        screenX: t.screenX,
        screenY: t.screenY,
      };
    }
  }

  handleCanvasTouchEndOrCancel(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches.item(i);
      delete this.activeCanvasTouches[t.identifier];
    }
  }

  handleCanvasTouchMove(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches.item(i);
      const at = this.activeCanvasTouches[t.identifier];
      const dy = t.screenY - at.screenY;
      at.screenX = t.screenX;
      at.screenY = t.screenY;
      this.adjustValueByPixels(-dy);
    }
  }

  handleCanvasTouchCancel(e) {
    e.preventDefault();
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
        this.bumpValue(1);
        break;

      case 'ArrowDown':
        this.bumpValue(-1);
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
        <canvas ref={canvas => { this.canvasElem = canvas; }} width={canvasWidth} height={canvasHeight} onMouseDown={this.handleCanvasMouseDown} onTouchStart={this.handleCanvasTouchStart} onTouchEnd={this.handleCanvasTouchEndOrCancel} onTouchMove={this.handleCanvasTouchMove} onTouchCancel={this.handleCanvasTouchEndOrCancel} onFocus={this.handleCanvasFocus} onBlur={this.handleCanvasBlur} onKeyDown={this.handleCanvasKeyDown} style={{position: 'absolute', width: canvasWidth, height: canvasHeight, left: -0.5*canvasWidth, top: -0.5*canvasHeight, outline: 'none'}} tabIndex="0" />
        <input ref={(elem) => { this.inputElem = elem; }} type="text" style={{position: 'absolute', top: 0.5*canvasHeight - 5, width: 1.2*width, left: -0.6*width, textAlign: 'center', background: 'none', border: 0, fontSize: 'inherit', fontFamily: 'inherit'}} value={inputText} onFocus={this.handleInputFocus} onBlur={this.handleInputBlur} onChange={this.handleInputChange} {...inputExtraAttrs} />
      </div>
    );
  }
}

Knob.defaultProps = {
  curve: 'linear',
  min: 0,
  max: 1,
  integral: false,
};
