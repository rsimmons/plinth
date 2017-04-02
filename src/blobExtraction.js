import Rusha from 'rusha';

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

// Values are passed to replacer function, which may choose to replace them.
//  If replaced, values are not traversed into.
function traverseReplace(v, replacer) {
  const {replace, replacementValue} = replacer(v);
  if (replace) {
    return replacementValue;
  }

  if (isArray(v)) {
    return v.map(x => traverseReplace(x, replacer));
  } else if (isPlainObject(v)) {
    const newObj = {};
    for (const k in v) {
      if (v.hasOwnProperty(k)) {
        newObj[k] = traverseReplace(v[k], replacer);
      }
    }
    return newObj;
  } else {
    if (!isPrimitive(v)) {
      throw new Error('unserializable value found during traversal');
    }
    return v;
  }
}

function sha1ArrayBuffer(ab) {
  return (new Rusha()).digestFromArrayBuffer(ab);
}

const MAGIC_KEY = '@*$^#%'; // SO MAGIC

export function extractBlobs(obj) {
  const hashMap = {}; // maps hash digest string to array buffer

  const newObj = traverseReplace(obj, (v) => {
    if (v instanceof ArrayBuffer) {
      const hash = sha1ArrayBuffer(v);

      hashMap[hash] = v;

      return {
        replace: true,
        replacementValue: {
          [MAGIC_KEY]: null,
          t: 'ArrayBuffer',
          h: hash,
        },
      };
    } else {
      if (isPlainObject(v) && v.hasOwnProperty(MAGIC_KEY)) {
        // TODO: we could handle this by "escaping", conceptually. but so unlikely let's just assert for now
        throw new Error('Found magic key, need escaping');
      }
      return {
        replace: false,
      };
    }
  });

  return {
    newObj,
    hashMap,
  };
}

export function injectBlobs(obj, hashMap) {
  return traverseReplace(obj, (v) => {
    if (isPlainObject(v) && v.hasOwnProperty(MAGIC_KEY)) {
      let replacementValue;

      switch (v.t) {
        case 'ArrayBuffer':
          replacementValue = hashMap[v.h];
          break;

        default:
          throw new Error('unrecognized blob type');
      }

      return {
        replace: true,
        replacementValue,
      };
    } else {
      return {
        replace: false,
      };
    }
  });
}
