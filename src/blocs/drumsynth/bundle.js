(function(e){function t(r){if(n[r])return n[r].exports;var u=n[r]={exports:{},id:r,loaded:!1};return e[r].call(u.exports,u,u.exports,t),u.loaded=!0,u.exports}var n={};return t.m=e,t.c=n,t.p="",t(0)})([function(e,t,n){"use strict";function r(e){return e&&e.__esModule?e:{default:e}}var u=n(1),i=r(u);e.exports=i.default},function(e,t,n){"use strict";function r(e){return e&&e.__esModule?e:{default:e}}function u(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}Object.defineProperty(t,"__esModule",{value:!0});var i=n(2),o=r(i),a=function e(t,n){u(this,e);var r=1,i=440,a=.1,s=!1,c=function(e,t){t&&!s&&(l.frequency.setValueAtTime(i,e),l.frequency.exponentialRampToValueAtTime(r,e+a)),s=t},l=n.createOscillator();l.type="sine",l.frequency.value=r,l.start(),this.inputs={gate:{type:"gateEvent",notify:c}},this.outputs={audio:{type:"audio",node:l}},this.panelView=(0,o.default)(t,'<div style="box-sizing: border-box; width: 126px; height: 256px; padding: 5px; background-color: white;">DrumSynth</div>')};t.default=a,a.blocName="DrumSynth"},function(e,t){"use strict";function n(e,t){var n=e.createElement("template");return n.innerHTML=t,n.content.firstChild}Object.defineProperty(t,"__esModule",{value:!0}),t.default=n}]);