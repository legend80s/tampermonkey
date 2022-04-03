// ==UserScript==
// @name         NPM Badge
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://github.com/*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        GM_info
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(async function() {
    'use strict';
    const $$ = (s) => Array.from(document.querySelectorAll(s));

    const { name: scriptName, version: scriptVersion } = GM_info.script;

    const appInfo = `${scriptName}@${scriptVersion}`
    const label = `${appInfo}>`
    const log = console.log.bind(console, label);
    const error = console.error.bind(console, label);

    console.time(label + ' costs')
    await main()
    console.timeEnd(label + ' costs')

    async function main() {
        // Refused to execute inline event handler because it violates the following Content Security Policy directive: "script-src 'unsafe-eval' github.githubassets.com"
        // document.head.insertAdjacentHTML('beforeend', `<meta http-equiv="Content-Security-Policy" content="script-src 'unsafe-eval' *">`)

        // Your code here...
        const [err1, packageJSON] = await box(fetch(`https://raw.githubusercontent.com/${location.pathname}/master/package.json`).then(resp => resp.json()));
        if (err1) {
            error('fetch package.json failed', err1);

            return;
        }

        const { name, description, version } = packageJSON;
        const imgURL = `https://img.shields.io/npm/v/${name}.svg`;
        const link = `https://www.npmjs.com/package/${name}`;

        const [err2, dataURL] = await box(fetchDataURL(imgURL));
        if (err2) {
            error('fetchObjectURL failed', err2);

            return;
        };

        const alt = `${name}@${version}: ${description}`

        const npmBadgeHtml = `<a href="${link}" rel="nofollow" target="_blank" alt="${alt}">
      <img data-canonical-src="${imgURL}" src=${dataURL} alt="${alt}">
    </a>`;

        // $$('.markdown-body h1')[0].insertAdjacentHTML('afterend', `<img src="https://img.shields.io/npm/v/react.svg" alt="npm version" />`);

        $$('.markdown-body h1')[0].insertAdjacentHTML('afterend', npmBadgeHtml);
    }

    async function box(promise) {
      try {
        return [null, await promise]
      } catch (error) {
        return [error]
      }
    }

    async function fetchDataURL(url) {
      const reader = new FileReader()

      const blob = await requestBlob(url);

      reader.readAsDataURL(blob)

      return new Promise((resolve, reject) => {
        reader.addEventListener('load', () => {
          resolve(reader.result)
        });

        reader.addEventListener('error', event => {
          reject(event)
        });
      })
    }

    function requestBlob(url) {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'GET',
          url,
          responseType: 'blob',
          onload: (result) => {
            resolve(result.response)
          },
          onerror: (error) => {
            reject(error)
          }
        });
      })
    }
})();
