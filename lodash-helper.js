// ==UserScript==
// @name         Lodash Helper
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  try to take over the world!
// @author       You
// @match        https://lodash.com/docs/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lodash.com
// @grant        GM_info
// @grant        GM_addElement
// ==/UserScript==

// 0.1 Ad Clearer For Lodash
// 1.0 merge lodash into window for lazy input for lodash method. instead of `_.omit`, you can input `omit`

(async function() {
  'use strict';
  const { $, ready, createLogger, generateLabel, makeItHappenGlobally } = tampermonkeyUtils;

  const log = createLogger('log', GM_info)
  const error = createLogger('error', GM_info)
  const label = generateLabel(GM_info);

  // Your code here...
  // console.log(`$('#carbonads') before`, $('#carbonads'))
  const ad = (await ready('#carbonads'))[1];
  // console.log(`$('#carbonads') after ready`, $('#carbonads'))
  ad?.remove()
  // console.log(`$('#carbonads') after`, $('#carbonads'))

  const scriptContent = `
  function merge(target, src, { prefix = 'lodash__', postfix = '' } = {}) {
    const keys = Object.keys(src);
    const total = keys.length;
    const result = { total, conflicted: 0, merged: 0 }

    keys.forEach((key) => {
      const newKey = \`\${prefix}\${key}\${postfix}\`;
      // console.log('newKey', newKey)

      if (target[newKey] !== undefined) {
        result.conflicted += 1;
        console.error('Merge Conflicts: key exists in target object. key=', newKey, 'value=', target[key]);
      } else {
        target[newKey] = src[key];
      }
    });

    result.merged = total - result.conflicted;

    return result;
  }

  const result = merge(window, _);

  console.log('${label}', result, 'Try input "omit" in the console instead of "_.omit" 🎉')
  `;

  makeItHappenGlobally(scriptContent, GM_addElement)
})();
