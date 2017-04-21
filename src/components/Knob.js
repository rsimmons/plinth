import React from 'react'

const DRAG_PIXELS_TO_NORMALIZED_VALUE = 0.008; 

const clampUnit = (v) => {
  if (v < 0) {
    return 0;
  } else if (v > 1) {
    return 1;
  } else {
    return v;
  }
}

export default class Knob extends React.Component {
  constructor(props) {
    super(props);

    this.mouseCaptured = false;
    this.lastMousePosition;

    this.defaultInternalValueToNormalized = this.defaultInternalValueToNormalized.bind(this);
    this.defaultNormalizedValueToInternal = this.defaultNormalizedValueToInternal.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
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

  defaultInternalValueToNormalized(v) {
    const curve = this.props.curve || 'linear';
    const min = this.props.min || 0;
    const max = this.props.max || 1;

    let nv;

    if (curve === 'linear') {
      nv = (v - min)/(max - min);
    } else if (curve === 'log') {
      nv = Math.log(v/min)/Math.log(max/min);
    } else {
      throw new Error('Unrecognized value for curve', curve);
    }

    if ((nv < 0) || (nv > 1)) {
      console.warn('defaultInternalValueToNormalized: result out of range');
    }

    return nv;
  }

  // This should never result in a normalized value outside [0,1]
  internalValueToNormalized(v) {
    const impl = this.props.internalValueToNormalized || this.defaultInternalValueToNormalized;
    return impl(v);
  }

  defaultNormalizedValueToInternal(nv) {
    if ((nv < 0) || (nv > 1)) {
      console.warn('defaultNormalizedValueToInternal: input out of range');
    }

    const curve = this.props.curve || 'linear';
    const min = this.props.min || 0;
    const max = this.props.max || 1;

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

  normalizedValueToInternal(v) {
    const impl = this.props.normalizedValueToInternal || this.defaultNormalizedValueToInternal;
    return impl(v);
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
    e.preventDefault();
  }

  handleMouseMove(e) {
    const dx = e.pageX - this.lastMousePosition.x;
    const dy = e.pageY - this.lastMousePosition.y;
    this.lastMousePosition = {x: e.pageX, y: e.pageY};

    const deltaPixels = -dy;
    const deltaNormalizedValue = deltaPixels*DRAG_PIXELS_TO_NORMALIZED_VALUE;

    const newValue = this.normalizedValueToInternal(clampUnit(this.internalValueToNormalized(this.props.value)+deltaNormalizedValue));
    this.props.onChange(newValue);
  }

  handleMouseUp(e) {
    this.releaseMouse();
    this.lastMousePosition = undefined;
  }

  updateCanvas() {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    const ctx = this.canvas.getContext('2d');

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const knobCenterX = 0.5*canvasWidth;
    const knobCenterY = 0.5*canvasHeight;
    const knobRadius = 0.3*canvasWidth;
    const arcRadius = 0.45*canvasWidth;
    const bottomHalfAngle = Math.PI/6;
    const beginAngle = 0.5*Math.PI+bottomHalfAngle;
    const endAngle = 2.5*Math.PI-bottomHalfAngle;
    const currentAngle = beginAngle + this.internalValueToNormalized(this.props.value)*(endAngle - beginAngle);

    const activeArcStyle = 'rgb(102, 153, 255)';
    const inactiveArcStyle = 'rgb(150, 150, 150)';
    const knobFaceStyle = 'rgb(200, 200, 200)';
    const notchStyle = 'rgb(64, 64, 64)';

    ctx.lineWidth = 2;
    ctx.strokeStyle = activeArcStyle;
    ctx.beginPath();
    ctx.arc(knobCenterX, knobCenterY, arcRadius, beginAngle, currentAngle);
    ctx.stroke();
    ctx.strokeStyle = inactiveArcStyle;
    ctx.beginPath();
    ctx.arc(knobCenterX, knobCenterY, arcRadius, currentAngle, endAngle);
    ctx.stroke();

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

  render() {
    const {value, label, width} = this.props;

    const canvasWidth = width;
    const canvasHeight = width;
    const WIDE_WIDTH = 200; // For centering text in absolutely positioned elements

    return (
      <div style={{position: 'relative'}}>
        <label style={{display: 'block', position: 'absolute', top: -(0.5*canvasHeight + 15), width: WIDE_WIDTH, left: -0.5*WIDE_WIDTH, textAlign: 'center', whiteSpace: 'nowrap'}}>{label}</label>
        <canvas ref={canvas => { this.canvas = canvas; }} width={canvasWidth} height={canvasHeight} onMouseDown={this.handleMouseDown} style={{position: 'absolute', width: canvasWidth, height: canvasHeight, left: -0.5*canvasWidth, top: -0.5*canvasHeight}} />
        <div style={{position: 'absolute', top: 0.5*canvasHeight - 5, width: WIDE_WIDTH, left: -0.5*WIDE_WIDTH, textAlign: 'center'}}>{this.formatInternalValue(value)}</div>
      </div>
    );
  }
}
