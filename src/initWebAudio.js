export default (window) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  const ua = window.navigator.userAgent;
  const iOS = !!ua.match(/i(Pad|Phone)/i);
  const webkit = !!ua.match(/WebKit/i);
  const iOSSafari = iOS && webkit && !ua.match(/CriOS/i) && !ua.match(/OPiOS/i);

  if (iOSSafari) {
    const document = window.document;

    const handleInteraction = () => {
      const oscNode = audioContext.createOscillator();
      oscNode.frequency.value = 1;
      oscNode.start ? oscNode.start() : oscNode.noteOn();
      oscNode.stop ? oscNode.stop() : oscNode.noteOff();

      document.body.removeChild(overlayElem);
    }

    const messageElem = document.createElement('div');
    messageElem.style.cssText = 'position:absolute;bottom:0;left:0;top:0;right:0;width:5em;height:1.2em;margin:auto;padding:0.5em;background:#91d780;font-size:48px;text-align:center;border-radius:0.5em;border:4px solid white;font-weight:bold';
    messageElem.textContent = 'Launch';

    const overlayElem = document.createElement('div');
    overlayElem.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1000;background:rgba(0,0,0,0.9)';
    overlayElem.appendChild(messageElem);

    overlayElem.addEventListener('mousedown', handleInteraction);

    document.body.appendChild(overlayElem);
  }

  return audioContext;
}
