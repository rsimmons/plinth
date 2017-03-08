import Rusha from 'rusha';
import {encode as b64encode, decode as b64decode} from 'base64-arraybuffer';

function isArray(v) {
  return Array.isArray(v);
}

function isPlainObject(v) {
  return ((typeof(v) === 'object') && (v !== null) && (v.constructor === Object));
}

function isPrimitive(v) {
  const t = typeof(v);
  return ((v === null) || (t === 'undefined') || (t === 'number') || (t === 'string') || (t === 'boolean'));
}

// Values are passed to visit function, and return value is replacement. Only "leaves" get replaced.
function traverse(v, visit) {
  if (isArray(v)) {
    return v.map(x => traverse(x, visit));
  } else if (isPlainObject(v)) {
    const newObj = {};
    for (const k in v) {
      if (v.hasOwnProperty(k)) {
        newObj[k] = traverse(v[k], visit);
      }
    }
    return newObj;
  } else {
    return visit(v);
  }
}

const uid32 = () => Math.random().toString(16).substring(2, 10);
const uid64 = () => uid32() + uid32();

function hashFunc(ab) {
  return (new Rusha()).digestFromArrayBuffer(ab);
}

export function presetSaveToJSON(blockClassId, settings) {
  const presetObj = {
    plinthPresetVersion: 0,
    b: blockClassId,
  };

  const uidToBlobInfo = {};
  const hashToArrayBuffer = {};

  presetObj.s = traverse(settings, (v) => {
    if (v instanceof ArrayBuffer) {
      const hash = hashFunc(v);
      hashToArrayBuffer[hash] = v;

      const uid = uid64();
      uidToBlobInfo[uid] = {
        t: 'ArrayBuffer',
        h: hash,
      };

      return uid;
    } else {
      if (!isPrimitive(v)) {
        throw new Error('settings contain unserializable value');
      }
      return v;
    }
  });

  if (Object.keys(uidToBlobInfo).length > 0) {
    const hashToBase64 = {};
    for (const k in hashToArrayBuffer) {
      hashToBase64[k] = b64encode(hashToArrayBuffer[k]);
    }

    presetObj.d = uidToBlobInfo;
    presetObj.h = hashToBase64;
  }

  return JSON.stringify(presetObj);
}

export function presetLoadFromJSON(s) {
  const presetObj = JSON.parse(s);

  if (presetObj.plinthPresetVersion !== 0) {
    throw new Error('Can\'t load preset');
  }

  if ('d' in presetObj) {
    const hashToArrayBuffer = {};
    for (const k in presetObj.h) {
      hashToArrayBuffer[k] = b64decode(presetObj.h[k]);
    }

    presetObj.s = traverse(presetObj.s, (v) => {
      if (v in presetObj.d) {
        switch (presetObj.d[v].t) {
          case 'ArrayBuffer':
            return hashToArrayBuffer[presetObj.d[v].h];

          default:
            throw new Error('unrecognized type');
        }
      } else {
        return v;
      }
    });
  }

  return {
    blockClassId: presetObj.b,
    settings: presetObj.s,
  };
}
