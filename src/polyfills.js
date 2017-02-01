export default function() {
  (function (global) {
    // AnalyserNode methods
    if (global.AnalyserNode) {
      // getFloatTimeDomainData
      if (!global.AnalyserNode.prototype.getFloatTimeDomainData) {
        (function() {
          const iarr = new Uint8Array(32768);
          global.AnalyserNode.prototype.getFloatTimeDomainData = function(array) {
            const len = Math.min(this.fftSize, array.length);
            this.getByteTimeDomainData(iarr);
            for (let i = 0; i < len; i++) {
              array[i] = 0.0078125*iarr[i] - 1;
            }
          };
        })();
      }
    }
  })(window);
};
