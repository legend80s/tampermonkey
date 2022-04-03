// ==UserScript==
// @name         NPM Badge
// @namespace    http://tampermonkey.net/
// @version      1.0
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
  const $ = (s) => document.querySelector(s);

  const { name: scriptName, version: scriptVersion } = GM_info.script;

  const appInfo = `${scriptName}@${scriptVersion}`;
  const label = `${appInfo}>`;
  const log = console.log.bind(console, label);
  const error = console.error.bind(console, label);

  console.time(label + ' costs')
  await main()
  console.timeEnd(label + ' costs')

  async function main() {
    // Refused to execute inline event handler because it violates the following Content Security Policy directive: "script-src 'unsafe-eval' github.githubassets.com"
    // document.head.insertAdjacentHTML('beforeend', `<meta http-equiv="Content-Security-Policy" content="script-src 'unsafe-eval' *">`)

    const host = '.markdown-body h1';

    // Your code here...
    const [err1, packageJSON] = await box(fetch(`https://raw.githubusercontent.com/${location.pathname}/master/package.json`).then(resp => resp.json()));
    if (err1) {
      error('fetch package.json failed', err1);

      await ready(host)

      await insertUnpublishedBadge(host);

      return;
    }

    const { name, description, version } = packageJSON;
    const imgURL = `https://img.shields.io/npm/v/${name}.svg`;
    const link = `https://www.npmjs.com/package/${name}`;
    const alt = `${name}@${version}: ${description}`;

    const [err2, imgHTML] = await box(generateSafeImageHTML(imgURL, alt));

    if (err2) {
      return;
    }

    const npmBadgeHtml = `<a href="${link}" rel="nofollow" target="_blank" alt="${alt}">
      ${imgHTML}
    </a>`;

    // $$('.markdown-body h1')[0].insertAdjacentHTML('afterend', `<img src="https://img.shields.io/npm/v/react.svg" alt="npm version" />`);
    const hostNode = (await ready(host))[1];

    if (queryChild($('.markdown-body'), 'img', (img) => { return img.dataset.canonicalSrc.includes('/npm/v/'); })) {
      // data-canonical-src="https://img.shields.io/npm/v/verb-corpus.svg"

      return;
    }

    hostNode.insertAdjacentHTML('afterend', npmBadgeHtml);
  }

  function queryChild(parent, selector, predicate) {
    return [...parent.querySelectorAll(selector)].find(e => predicate(e))
  }

  async function generateSafeImageHTML(imgURL, alt) {
    const [err, dataURL] = await box(fetchDataURL(imgURL));

    if (err) {
      error('fetchObjectURL failed', err);

      return '';
    }

    return `<img data-canonical-src="${imgURL}" src=${dataURL} alt="${alt}">`;
  }

  async function insertUnpublishedBadge(host) {
    const unpublished = `https://img.shields.io/badge/npm-unpublished-yellow`;
    const img = await generateSafeImageHTML(unpublished, 'not published yet');

    const name = $('.markdown-body h1').textContent.trim()

    let html = img;

    if (name) {
      const link = `https://www.npmjs.com/package/${name}`;
      html = `<a href="${link}" rel="nofollow" target="_blank" alt="${name}">
        ${img}
      <a>`;
    }

    $(host).insertAdjacentHTML('afterend', html);
  }

  async function box(promise) {
    try {
      return [null, await promise]
    } catch (error) {
      return [error]
    }
  }

  async function ready(sentry) {
    await sleep(10)
    const timeout = 10 * 1000;
    const interval = 200;
    for (let i = 0; i < timeout / interval; i++) {
      if ($(sentry)) { return [true, $(sentry)] }

      await sleep(interval);
    }

    return [false, $(sentry)]
  }

  async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

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
    });
  }
})();
