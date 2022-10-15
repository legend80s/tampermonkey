// ==UserScript==
// @name         插件通用 utils
// @namespace    http://tampermonkey.net/
// @version      1.18
// @description  try to take over the world!
// @author       孟陬
// @match        http://*/*
// @match        https://*/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @run-at document-start
// @grant GM_addElement
// @grant GM_info

// ==/UserScript==

// CHANGELOG
// 1.15 add withTime
// 1.14 add toKebabCase createStyle
// 1.13 add `time2Readable` `seconds`
// 1.12.0 add utils `createLoggers`
// 1.11.0 发布 url 变化事件
// 1.10.0 find what javascript variables are leaking into the global scope
// 1.9.0 install package in your console

(async function () {
  'use strict';
  const { name: appName, version } = GM_info.script;

  const label = `${appName}@${version} >`;

  // console.log(label, 'working', Date.now());

  const scriptContent = `
  const appName = '${appName}';
  const label = '${label}';
  const error = (...args) => console.error(label, now(), ...args);
  const log = (...args) => console.log(label, now(), ...args);
  const $ = (selector) => document.querySelector(selector);
  const $$ = selectors => [...document.querySelectorAll(selectors)];
  const tampermonkeyUtils = {
    ___error: error,
    ___log: log,

    $,
    $$,
    sleep,
    wait: sleep,
    delay: sleep,
    toast,
    fire,
    alert,
    confirm,
    ready,
    request,
    assertUniqueness,
    extractVersion,
    createLogger,
    createLoggers,
    generateLabel,
    generateAppName,
    makeItHappenGlobally,
    insertScript,
    isValidURL,
    diff,

    time2Readable,
    seconds,

    createStyle,
    toKebabCase,
    withTime,

    requestPackageJson: ${requestPackageJson.toString()},
    findVariablesLeakingIntoGlobalScope: ${findVariablesLeakingIntoGlobalScope.toString()},

    ___npmInstallInBrowser: ${___npmInstallInBrowser.toString()},
    ___npmDownload: ${___npmDownload.toString()},
    install: ${install.toString()},

    merge: ${merge.toString()},
    findElementsByText: ${findElementsByText.toString()},
    getElementsByText: ${findElementsByText.toString()},
    toLink: ${toLink.toString()},

    onUrlChange: ${onUrlChange.toString()},
  };

  if (!window.tampermonkeyUtils) {
      window.tampermonkeyUtils = tampermonkeyUtils;
      log('已注入 window.tampermonkeyUtils', window.tampermonkeyUtils)
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
  function wrapInIIFE(text) {
    return \`(() => { \${text} })()\`
  }
  function makeItHappenGlobally(scriptText, GM_addElement) {
    GM_addElement('script', {
      textContent: wrapInIIFE(scriptText),
    });
  }

  function generateLabel(GM_info) {
    const { name, version } = GM_info.script;
    const label = name + '@' + version + '>';
    return label;
  }

  function generateAppName(GM_info, { withVersion = true } = {}) {
    const { name, version } = GM_info.script;

    if (withVersion) {
      return name + '@' + version;
    }

    return name
  }

  function withTime(func) {
    return async (...args) => {
      const start = Date.now();

      try {
        await func(...args);
      } finally {
        log('🎉 耗时', time2Readable(start, Date.now))
      }
    }
  }

  /**
   * @public
   * @param {import("react").CSSProperties} params
   */
  function createStyle(params) {
    return Object.keys(params)
      .map((key) => {
      const rule = params[key];

      return toKebabCase(key) + ': ' + rule
    }, '')
      .join('; ')
  }

  /**
   * @public
   * @param {string} key
   * @returns {string}
   */
  function toKebabCase(key) {
    return key
      .replace(/([A-Z])/g, (_, m1) => \`-\$\{m1.toLowerCase()}\`)
      .replace(/^-/, '')
  }

  function time2Readable(begin, end) {
    const duration = end - begin;

    const seconds = duration / 1000
    const min = seconds / 60;

    const text = min >= 1 ? minutes2Readable(min) : \`\${seconds} 秒\`;

    return text;
  }

  /**
   *
   * @param {number} min
   * @returns {string}
   */
  function minutes2Readable(minutes) {
    const integer = Math.floor(minutes);
    const fractional = minutes - integer;
    const minText = integer + '分' + (fractional * 60).toFixed(0) + '秒';

    return minText;
  }

  function seconds(n) { return n * 1000 }

  function createLoggers(GM_info) {
    const label = generateLabel(GM_info);

    const levels = ['log', 'info', 'warn', 'error']

    return levels.reduce((acc, level) => {
      return {
        ...acc,

        [level]: (...args) => {
          const time = now()

          return console[level](label, time, ...args)
        }
      }
    }, {})
  }

  function now() {
    const date = new Date();
    const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map(n => String(n).padStart(2, '0')).join(':')

    return \`[\${time}]\`;
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
    function diff(arr1, arr2) {
      return arr1.filter(item => !arr2.includes(item));
    }
    function isValidURL(str) { return /^(?:https?:)?\\/\\/.+/.test(str) }
    function insertScript(src, GM_addElement) {
      if (!isValidURL(src)) {
        return error('[insertScript] \`src\` required and expected to be a valid url, but got', src);
      }
      return GM_addElement('script', {
        src,
        type: 'text/javascript'
      });
    }

  /**
   * @param {string|() => boolean} readySentry
   * @returns {Promise<[boolean, HTMLElement]>}
   */
  async function ready(readySentry, options = {}) {
    const { verbose = false } = options;

    if (!verbose) { return await readyCore(readySentry, options) }

    const label = \`插件通用 utils> readySentry "\${readySentry}" ready costs:\`

    console.time(label);

    try {
      return await readyCore(readySentry, options)
    } finally {
      console.timeEnd(label);
    }
  }

  /**
   * @param {string|() => boolean} readySentry
   * @returns {Promise<[boolean, HTMLElement]>}
   */
  async function readyCore(readySentry, { timeout = 5 * 1000, interval = 500 } = {}) {
    const iterations = timeout / interval;
    await sleep(20);

    for (let index = 0; index < iterations; index++) {
      const readySentryElement = typeof readySentry === 'function' ? readySentry() : $(readySentry);
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

  function fire(...args) {
    return window.Swal.fire(...args)
  }

  function toast(msg, { title = '', level = 'success', timeout = 3 * 1000 } = {}) {
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


  async function confirm(title, options = {}) {
    const defaultOptions = { confirmButtonText: '确定', cancelButtonText: '取消' };

    if (typeof title !== 'string') {
      options = { ...defaultOptions, ...title };
      title = '';
    } else {
      options = { ...defaultOptions, ...options };
    }

    const { message, msg, confirmButtonText, cancelButtonText } = options;

    // https://sweetalert2.github.io/
    return window.Swal.fire({
      title,
      text: message || msg,
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
   * extractVersion('https://cdn.com/a/1.0.84/umi.js')
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
  }

  (${emitUrlChangeEventWhenLinkClicked.toString()})(window.history)

  `;

  /**
   * @param {string} text
   * @returns {string}
   */
  function wrapInIIFE(text) {
    return `(() => {
      ${text}
    })()`
  }

  GM_addElement('script', {
    src: 'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  });

  // console.log('scriptContent', scriptContent)

  GM_addElement('script', {
    textContent: wrapInIIFE(scriptContent),
  });

  // --- function declarations ---

  /** 点击连接导致的url change */
  function emitUrlChangeEventWhenLinkClicked(history) {
    const pushState = history.pushState;
    const eventName = 'tampermonkey-utils:pushState';

    // console.log('event: intercept pushState');

    history.pushState = function (state, _, targetPath) {
      // console.log("pushState targetPath:", targetPath);

      const urlChangedDelay = 300;

      setTimeout(() => {
        // console.log('event: send');
        document.body.dispatchEvent(new CustomEvent(eventName, { bubbles: true, detail: { targetPath } }));
      }, urlChangedDelay);

      const result = pushState.apply(history, arguments);

      return result;
    }
  }

  function onUrlChange(cb) {
    const eventName = 'tampermonkey-utils:pushState';

    const listener = (e) => {
      // console.log('event: rx', e);

      cb(e.detail.targetPath)
    };

    document.body.addEventListener(eventName, listener);

    return () => {
      document.body.removeEventListener(eventName, listener);
    }
  }

  function findElementsByText(text, selector, { directParent = false } = {}) {
    const { ___error: error, $$ } = window.tampermonkeyUtils;

    if (!text || !selector) { error(`[invalid params] text and selector required`); return [] }

    function isDirectParentOfText(e) {

      return e.childNodes.length === 1 && e.firstChild.nodeName === '#text'
    }

    const textMather = text instanceof RegExp ? content => text.test(content) : content => text === content;

    const predicate = (e) => {
      if (directParent) {
        return isDirectParentOfText(e) && textMather(e.textContent.trim())
      }

      return textMather(e.textContent.trim())
    }

    return $$(selector).filter(predicate);
  }

  function toLink(url, text = url) { return `<a target="_blank" href="${url}">${text}</a>` }

  function merge(target, src, { prefix = 'lodash__', postfix = '' } = {}) {
    const { ___error: error } = tampermonkeyUtils;

    const keys = Object.keys(src);
    const total = keys.length;
    const result = { total, conflicted: 0, merged: 0 }

    keys.forEach((key) => {
      const newKey = `${prefix}${key}${postfix}`;
      // console.log('newKey', newKey)

      if (target[newKey] !== undefined) {
        result.conflicted += 1;
        error('Merge Conflicts: key exists in target object. key=', newKey, 'value=', target[key]);
      } else {
        target[newKey] = src[key];
      }
    });

    result.merged = total - result.conflicted;

    return result;
  }

  async function requestPackageJson(hostname) {
    const { request } = tampermonkeyUtils;

    const repoId = location.pathname.match(/\/([\w\-]+\/[\w\-]+).*/)[1]

    const url = `https://${hostname}/${repoId}/raw/master/package.json`

    // log('url', url)

    return await request(url)
  }

  // https://mmazzarolo.com/blog/2022-02-14-find-what-javascript-variables-are-leaking-into-the-global-scope/
  function findVariablesLeakingIntoGlobalScope() {
    // Grab browser's default global variables.
    const iframe = window.document.createElement("iframe");

    iframe.src = "about:blank";

    window.document.body.appendChild(iframe);

    const browserGlobals = Object.keys(iframe.contentWindow);

    window.document.body.removeChild(iframe);

    // Get the global variables added at runtime by filtering out the browser's
    // default global variables from the current window object.
    const runtimeGlobals = Object.keys(window).filter((key) => {
      const isFromBrowser = browserGlobals.includes(key);

      return !isFromBrowser;
    });

    console.log("Runtime globals: count", runtimeGlobals.length, runtimeGlobals.map(key => {
      return { key, value: window[key] }
    }));
  };

  function ___npmDownload(src, originName, info, successCallback, errorCallback) {
    const { ___log: log } = tampermonkeyUtils;
    log(`'${originName}' installing...`);

    const successTimerLabel = `📂 '${originName}' installed success costs`
    const failedTimerLabel = `🔒 '${originName}' installed failed`

    console.time(successTimerLabel);
    console.time(failedTimerLabel);

    const npmInstallScript = document.createElement('script');

    info?.type === 'module' && npmInstallScript.setAttribute('type', 'module');

    npmInstallScript.src = src;

    npmInstallScript.onload = (resp) => {
      console.timeEnd(successTimerLabel)
      successCallback(resp);
    };

    npmInstallScript.onerror = (error) => {
      console.timeEnd(failedTimerLabel)
      errorCallback(error);
    };

    document.body.appendChild(npmInstallScript);
    document.body.removeChild(npmInstallScript);
  }

  function ___npmInstallInBrowser(name, info, successCallback, errorCallback) {
    const { ___npmDownload: npmDownload } = tampermonkeyUtils;

    const originName = name.trim();
    // console.log(originName);

    if (/^https?:\/\//.test(originName)) {
      npmDownload(originName, originName, info, successCallback, errorCallback);
    } else {
      npmDownload(`https://unpkg.com/${originName}`, originName, info, successCallback, errorCallback);
    }
  }

  /**
   * Install js package in your console.
   * @param {string} name npm package name or github url
   * @param {{type?: 'module'}} info
   * @returns {Promise<boolean>}
   */
  async function install(name, info) {
    const { ___log: log, ___error: error, ___npmInstallInBrowser: npmInstallInBrowser } = tampermonkeyUtils;

    if (name === 'lodash') {
      const _ = window._;

      // console.log(typeof _ === 'function' , typeof _.flowRight === 'function', typeof _.VERSION === 'string')

      if (typeof _ === 'function' && typeof _.flowRight === 'function' && typeof _.VERSION === 'string') {
        log(`lodash@${_.VERSION} has been installed already`);
        return true;
      }
    }

    if (!name) {
      error('invalid params: missing package name or url');
      return false;
    }

    if (info?.type !== 'module' && info?.type !== undefined) {
      error("invalid params: type must be 'module'");
      return false;
    }

    try {
      await new Promise((resolve, reject) => {
        npmInstallInBrowser(name, info, resolve, reject);
      });

      return true
    } catch (err) {
      error(err)
      return false
    }
  }
})();
