export default function createConstantNode(audioContext, value) {
  const constantBuffer = audioContext.createBuffer(1, 2, audioContext.sampleRate);
  const constantData = constantBuffer.getChannelData(0);
  constantData[0] = value;
  constantData[1] = value;
  const constantNode = audioContext.createBufferSource();
  constantNode.buffer = constantBuffer;
  constantNode.loop = true;
  constantNode.start();
  return constantNode;
}
