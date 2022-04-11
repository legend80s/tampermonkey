// ==UserScript==
// @name         插件通用 utils
// @namespace    http://tampermonkey.net/
// @version      1.6.1
// @description  try to take over the world!
// @author       孟陬
// @match        http://*/*
// @match        https://*/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @run-at document-start
// @grant GM_addElement
// @grant GM_info

// ==/UserScript==

(async function () {
  'use strict';
  const { name: appName, version } = GM_info.script;

  const label = `${appName}@${version} >`;

  // console.log(label, 'working', Date.now());

  const scriptContent = `
  const appName = '${appName}';
  const label = '${label}';

  const error = console.error.bind(console, label);
  const log = console.log.bind(console, label);

  const $ = (selector) => document.querySelector(selector);
  const $$ = selectors => [...document.querySelectorAll(selectors)];

  const tampermonkeyUtils = {
    $,
    $$,
    sleep,
    wait: sleep,
    delay: sleep,
    toast,
    alert,
    confirm,

    ready,
    request,
    assertUniqueness,
    extractVersion,
    createLogger,
    generateLabel,
  };

  if (!window.tampermonkeyUtils) {
      window.tampermonkeyUtils = tampermonkeyUtils;
      log('已注入 window.tampermonkeyUtils', window.tampermonkeyUtils, Date.now())
  } else {
      Object.assign(window.tampermonkeyUtils, tampermonkeyUtils)
      error('window.tampermonkeyUtils 已存在，仍然会注入', window.tampermonkeyUtils)
  }

  function request(url, options = { credentials: 'include' }) {
    // log('GET', url);
    return window.fetch(url, options).then(resp => resp.json());
  }

  let prev;
  function calculateDiff() {
    const cur = Date.now();

    if (!prev) { prev = cur; }

    const diff = cur - prev;

    prev = cur;

    return diff;
  }

  function generateLabel(GM_info) {
    const { name, version } = GM_info.script;
    const label = name + '@' + version + '>';

    return label;
  }

  function createLogger(level = 'log', GM_info) {
        // console.log('in createLogger', GM_info)
        const label = generateLabel(GM_info);

        if (!console[level]) {
            console.error(label, '[createLogger] invalid argument \`level\`, log/info/error expected but', level, 'got');

            level = 'log';
        }

        return console[level].bind(console, label);
    }

  /**
 * @param {string} readySentry
 * @returns {Promise<[boolean, HTMLElement]>}
 */
  async function ready(readySentry) {
    const timeout = 10 * 1000;
    const interval = 500;
    const iterations = timeout / interval;

      await sleep(20);

    for (let index = 0; index < iterations; index++) {
      const readySentryElement = $(readySentry);

      if (readySentryElement) {
        return [true, readySentryElement];
      }

      await sleep(interval);
    }

    return [false, null];
  }

  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(ms);
      }, ms);
    })
  }
  function toast(msg, { title = '', level = 'success', timeout = 2 * 1000 } = {}) {
    // https://sweetalert2.github.io/
    window.Swal.fire({
      timer: timeout,
      timerProgressBar: true,
      background: '#000000c7',
      // background: 'black',
      color: '#ffffffcf',

      position: 'top',
      // allowEscapeKey: true,
      toast: true,
      title,
      text: msg,
      width: '50vw',
      showConfirmButton: false,
      // margin: '0',
      // padding: '0',
      icon: level,
    })
  }

  function alert(message, { title, level = 'error' } = {}) {
    window.Swal.fire({
      icon: level,
      title: title,
      text: message,
    });
  }

  async function confirm(title, { message, confirmButtonText = '确定', cancelButtonText = '取消' } = {}) {
    // https://sweetalert2.github.io/
    return window.Swal.fire({
      title,
      text: message,
      width: '40vw',
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
    }).then((result) => {
      return result.isConfirmed;
    });
  }
  /**
   *
   * @param {URLString} url
   * @returns {string}
   * @example
   * extractVersion('https://gw-pre.alipayobjects.com/a/g/memberprod/digital-bank-oc/1.0.84/umi.js')
   * // => '1.0.84'
   */
  function extractVersion(url) {
    return url.match(/\\/(\\d+\\.\\d+\\.\\d+)\\//)?.[1] || '';
  }

  function assertUniqueness(elements, msg = '') {
      if (elements.length !== 1) {
          error(msg || '元素不唯一，无法准确定位', elements);
          return false;
      }

      return true;
  }`;

  /**
   * @param {string} text
   * @returns {string}
   */
  function wrapInIIFE(text) {
    return `(() => { ${text} })()`
  }

  GM_addElement('script', {
    src: 'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  });

  GM_addElement('script', {
    textContent: wrapInIIFE(scriptContent),
  });
})();
