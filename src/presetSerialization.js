import {extractBlobs, injectBlobs} from './blobExtraction';
import UTF8 from 'utf-8';

const CURRENT_VERSION_STRING = 'plinthPresetVersion:1';

export function presetSaveToBlob(blockClassId, settings) {
  const fileBlobParts = [];

  fileBlobParts.push(CURRENT_VERSION_STRING + '\n');

  const {newObj: deblobbedSettings, hashMap} = extractBlobs(settings);

  // Derive some info about hashed blobs
  const orderedHashes = Object.keys(hashMap).sort();
  const hashInfo = {};
  let lastHashBlobOffset = 0;
  for (const hash of orderedHashes) {
    const len = hashMap[hash].byteLength;
    hashInfo[hash] = {
      l: len,
      o: lastHashBlobOffset,
    };
    lastHashBlobOffset += len;
  }

  const presetInfo = {
    b: blockClassId,
    s: deblobbedSettings,
    h: hashInfo,
  };

  fileBlobParts.push(JSON.stringify(presetInfo));
  fileBlobParts.push('\n');

  // Append any blob data at end, in order of hash
  orderedHashes.forEach(hash => {
    fileBlobParts.push(hashMap[hash]);
  });

  return new Blob(fileBlobParts, {type: 'application/prs.plinth-preset'}); // 'application/prs.plinth-preset' or 'application/octet-stream'?
}

export function presetLoadFromArrayBuffer(ab) {
  const byteView = new Uint8Array(ab);
  const newlineCode = '\n'.charCodeAt(0);

  const firstNewlineOffset = byteView.indexOf(newlineCode);
  if (firstNewlineOffset < 0) {
    throw new Error('Missing first newline');
  }
  const versionStr = UTF8.getStringFromBytes(byteView.subarray(0, firstNewlineOffset));

  // TODO: parse this instead of simple comparison
  if (versionStr !== CURRENT_VERSION_STRING) {
    throw new Error('Invalid preset');
  }

  const secondNewlineOffset = byteView.indexOf(newlineCode, firstNewlineOffset+1);
  if (secondNewlineOffset < 0) {
    throw new Error('Missing second newline');
  }
  const presetJSONStr = UTF8.getStringFromBytes(byteView.subarray(firstNewlineOffset, secondNewlineOffset));

  const presetInfo = JSON.parse(presetJSONStr);

  // Recreate hashMap (hash -> ArrayBuffer)
  const hashMap = {};
  for (const k in presetInfo.h) {
    const {o: off, l: len} = presetInfo.h[k];
    const start = secondNewlineOffset+1+off;
    hashMap[k] = ab.slice(start, start+len); // note that we slice original ArrayBuffer
  }

  const reblobbedSettings = injectBlobs(presetInfo.s, hashMap);

  return {
    blockClassId: presetInfo.b,
    settings: reblobbedSettings,
  };
}
