// ==UserScript==
// @name         插件通用 utils
// @namespace    http://tampermonkey.net/
// @version      1.24.1
// @description  A tools like jQuery or lodash but for Tampermonkey.
// @author       legend80s
// @match        http://*/*
// @match        https://*/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @updateURL    https://git.cnaeit.com/liuchuanzong/work-helper-tampermonkey/-/raw/main/utils.userscript.js
// @downloadURL  https://git.cnaeit.com/liuchuanzong/work-helper-tampermonkey/-/raw/main/utils.userscript.js
// @run-at       document-start
// @grant        GM_addElement
// @grant        GM_info
// @grant        GM_setClipboard

// @noxxxframesx    有些网站运行在inframe 里面故不能增加该 annotation

// ==/UserScript==

// CHANGELOG
// 1.24.1 fix cdn url
// 1.24.0 add debounce/isSiteAccessible/fetchHttpStatus
// 1.23.0 add `powerfulQuerySelectorAll`
// 1.22.3 replace jsdelivr.net to jsdmirror.com
// 1.22.2 fix textOrRegexp const re-assignment error
// 1.22.1 fix ready error as $ always return true when jQuery exists
// 1.22 add querySelector to allow `selector[attr=文本]`
// 1.21 add @noframes running on the main pages, but not at iframes.
// 1.20 get initial commit of github
// 1.19 add getElementByText
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
  const warn = (...args) => console.warn(label, now(), ...args);
  const log = (...args) => console.log(label, now(), ...args);
  // const $ = (selector) => document.querySelector(selector);
  // const $$ = selectors => [...document.querySelectorAll(selectors)];
  const tampermonkeyUtils = {
    ___error: error,
    ___log: log,
    ___warn: warn,

    $: ${powerfulQuerySelector.toString()},
    $$: ${powerfulQuerySelectorAll.toString()},
    sleep,
    wait: sleep,
    delay: sleep,

    isFunction,
    isFunc: ${isFunction.toString()},
    isString: ${isString.toString()},
    isArray: ${isArray.toString()},
    countWordDescend: ${countWordDescend.toString()},
    compareVersion: ${compareVersion.toString()},
    debounce: ${debounce.toString()},

    copy,
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
    timeToReadable: time2Readable,
    seconds,

    createStyle,
    toKebabCase,
    withTime,

    // --- github utils begin ---
    getFirstCommitUrl: ${getFirstCommitUrl.toString()},
    getRepoId: ${getRepoId.toString()},
    getFirstCommit: ${getFirstCommit.toString()},
    requestPackageJson: ${requestPackageJson.toString()},
    isGithubAccessible: ${isGithubAccessible.toString()},
    isSiteAccessible: ${isSiteAccessible.toString()},
    fetchHttpStatus: ${fetchHttpStatus.toString()},
    // --- github utils end ---

    findVariablesLeakingIntoGlobalScope: ${findVariablesLeakingIntoGlobalScope.toString()},

    ___npmInstallInBrowser: ${___npmInstallInBrowser.toString()},
    ___npmDownload: ${___npmDownload.toString()},
    ___fetchUnpkgCdn: ${___fetchUnpkgCdn.toString()},

    install: ${install.toString()},

    merge: ${merge.toString()},

    findElementsByText: ${findElementsByText.toString()},
    getElementsByText: ${findElementsByText.toString()},
    getElementByText: ${getElementByText.toString()},
    $Text: ${getElementByText.toString()},
    getElementByTextAsync: ${getElementByTextAsync.toString()},
    getElementAsync: ${getElementAsync.toString()},
    $Async: ${getElementAsync.toString()},
    listElementsByTextAsync: ${listElementsByTextAsync.toString()},
    findElementsByTextAsync: ${findElementsByTextAsync.toString()},
    getElementsByTextAsync: ${findElementsByTextAsync.toString()},
    onChildChanged: ${onChildChanged.toString()},

    loop: ${loop.toString()},

    findNearestOperationBtn: ${findNearestOperationBtn.toString()},

    toLink: ${toLink.toString()},

    onUrlChange: ${onUrlChange.toString()},
    sum: ${sum.toString()},
    mean: ${mean.toString()},
  };

  if (!window.tampermonkeyUtils) {
      window.tampermonkeyUtils = tampermonkeyUtils;
      // log('已注入 window.tampermonkeyUtils', window.tampermonkeyUtils)
  } else {
      Object.assign(window.tampermonkeyUtils, tampermonkeyUtils)
      warn('window.tampermonkeyUtils 已存在，仍然会注入', window.tampermonkeyUtils)
  }
  function request(url, { method = 'GET', timeout = 0, type = 'json', credentials = 'include' } = {}) {
    // log('GET', url);
    const { promise, resolve, reject } = Promise.withResolvers()

    window.fetch(url, { method, credentials }).then(resp => type === 'json' ? resp.json() : resp.text()).then(resolve).catch(reject);

    timeout && setTimeout(() => { reject(new RangeError('timeout')) }, timeout)

    return promise
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
    if (!GM_info.script) {
      console.error(\`expect GM_info be an Object with script object inside, but found type: "\${typeof GM_info}",\`, 'value:', GM_info)
    }
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
    const duration = end !== undefined ? end - begin : begin;

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
    const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map(n => String(n).padStart(2, '0')).join(':') + '.' + date.getMilliseconds()

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
    const { $ } = tampermonkeyUtils;
    const readySentryElement = typeof readySentry === 'function' ? readySentry() : $(readySentry);

    if (readySentryElement) {
      return [true, readySentryElement];
    }

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
    const time = typeof ms === 'number' ? ms : strToMilliseconds(ms)

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(ms);
      }, time);
    })

    function strToMilliseconds(str) {
      const reg = /(\\d+)(s|min|h)/
      const m = str.match(reg)

      if (!m) { throw new TypeError('should be of pattern ' + reg + ' but find "' + str + '"') }

      const [_, num, unit] = m

      if (unit === 's') { return num * 1000 }
      if (unit === 'min') { return num * 1000 * 60 }
      if (unit === 'h') { return num * 1000 * 60 * 60 }
    }
  }

  function isFunction(val) {
    return typeof val === 'function'
  }

  function copy(text) {
    GM_setClipboard(text)
  }

  function fire(...args) {
    return window.Swal.fire(...args)
  }

  function toast(msg, { position = 'center', title = '', level = 'success', timeout = 3 * 1000 } = {}) {
    // https://sweetalert2.github.io/
    window.Swal.fire({
      timer: timeout,
      timerProgressBar: false,
      background: '#000000c7',
      // background: 'black',
      color: '#ffffffcf',
      position,
      // allowEscapeKey: true,
      toast: true,
      title,
      text: msg,
      width: 'fit-content',
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

  ;(${emitUrlChangeEventWhenLinkClicked.toString()})(window.history);
  ;(${emitUrlChangeEventWhenForwardOrBackBtnClicked.toString()})(window);
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
    src: 'https://cdn.jsdmirror.com/npm/sweetalert2@11.14.3',
    // src: 'https://cdn.jsdelivr.net/npm/sweetalert2@11',
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

  function emitUrlChangeEventWhenForwardOrBackBtnClicked(window) {
    window.addEventListener('popstate', function(event) {
      //console.log('浏览器的返回或前进按钮被点击了', event);

      const urlChangedDelay = 300;
      const eventName = 'tampermonkey-utils:pushState';

      setTimeout(() => {
        const targetPath = location.href;
        //console.log('event: send', targetPath);
        document.body.dispatchEvent(new CustomEvent(eventName, { bubbles: true, detail: { targetPath } }));
      }, urlChangedDelay);

      // 在这里执行需要的逻辑，比如页面内容的更新等
    });
  }

  function sum(...args) {
    return args.reduce((acc, count) => acc + count, 0);
  }
  function mean(...args) {
    const { sum } = window.tampermonkeyUtils;

    return sum(...args) / args.length
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

  async function getElementAsync(selector, { visible = true } = {}) {
    const { $$, loop } = window.tampermonkeyUtils;

    return loop(() => {
      const elements = $$(selector)

      const isValid = (el) => visible ? el && el.getBoundingClientRect().width > 0 : el

      return elements.find(el => isValid(el))
    })
  }

  async function loop(getter, { interval = 500, times = 10 } = {}) {
    const { $, sleep, ___error: error, ___warn: warn, time2Readable } = window.tampermonkeyUtils;

    let i;
    for (i = 0; i < times; i++) {
      const el = getter(i);
      // console.log('i =', i)

      if (el) { return el }
      await sleep(500);
    }

    warn('No valid result resolved after', i, `retries in ${time2Readable(i * 500)}`);
    return undefined;
  }

  async function getElementByTextAsync(text, selector, opts = {}) {
    const { ___error: error, ___warn: warn, ready, getElementByText, sleep } = window.tampermonkeyUtils;
    const { timeout = 0, silent = false, interval = 500, ...rest } = opts
    const start = Date.now()

    await ready(selector);

    let i = 0;
    for (i = 0; i < 10; i++) {
      const el = getElementByText(text, selector, rest);
      // console.log('i =', i)
      if (timeout && Date.now() - start >= timeout) {
        !silent && warn('No element', { text, selector }, 'find after', i, 'tries in', timeout, 'ms');
        return undefined
      }

      if (el) { return el }
      await sleep(interval);
    }

    !silent && warn('No element', { text, selector }, 'find after', i, 'tries in 5s');
    return undefined;
  }

  async function listElementsByTextAsync(texts, selector, ...args) {
    const { ___error: error, getElementByTextAsync } = window.tampermonkeyUtils;

    const elements = (await Promise.all(texts.map((text) => getElementByTextAsync(text, selector, ...args)))).filter(Boolean)
    if (elements.length) { return elements }

    error('No elements', { texts, selector }, 'find');
    return [];
  }

  function debounce(func, delay) {
    let timer;
    return (...args) => {
      if (timer) clearTimeout(timer)

      timer = setTimeout(() => {
        func(...args)
      }, delay)
    }
  }

  function getElementByText(...args) {
    return tampermonkeyUtils.findElementsByText(...args)[0];
  }
  function findElementsByTextAsync(text, selector) {
    return tampermonkeyUtils.findElementsByText(text, selector, { async: true });
  }
  function findElementsByText(text, selector, { directParent = false, parent = document, visible = true, async = false } = {}) {
    const { ___error: error, ready } = window.tampermonkeyUtils;

    if (!text || !selector) { error(`[invalid params] text and selector required`); return [] }

    function isDirectParentOfText(e) {
      return e.childNodes.length === 1 && e.firstChild.nodeName === '#text'
    }

    /** @type {(content: string) => boolean} */
    const isTextMathed = text instanceof RegExp ? content => text.test(content) : content => text === content;

    const predicate = (el) => {
      // btn not visible when e.getBoundingClientRect().width === 0
      const visibleByUser = visible ? !!el.getBoundingClientRect().width : true
      const common = visibleByUser && isTextMathed(el.textContent.trim())

      if (directParent) {
        return isDirectParentOfText(el) && common
      }

      return common
    }

    const query = () => {
      const candidates = [...parent.querySelectorAll(selector)];

      return candidates.filter(predicate);
    }

    if (async) {
      return ready(selector).then(query);
    }

    return query();
  }

  /** Find the nearest active button in the current operation area. */
  function findNearestOperationBtn(textOrRegexp, selector) {
    const { ___error: error, getElementByText } = window.tampermonkeyUtils;

    let parent = document.activeElement.parentElement;
    let i = 1;

    const activeBtnSelector = selector.includes(':not([disabled])') ? selector : `${selector}:not([disabled])`;
    let target;

    while (parent && !(target = getElementByText(textOrRegexp, activeBtnSelector, { parent }))) {
      i++;
      parent = parent.parentElement
    }

    i >= 15 && error('try find activeBtn in document.activeElement\'s parentElement', i, 'times, but not found');

    return target;
  }

  function powerfulQuerySelector(selector) {
    // a[text=历史] a[text=/历史/] a[text=/\\d历史/]
    const matches = selector.match(/(.+)?\[text=(.+)+\]/)

    if (!matches) {
      return document.querySelector(selector);
    }

    let [_, tag, textOrRegexp] = matches;
    // console.log({ tag, textOrRegexp })

    const regMatches = textOrRegexp.match(new RegExp(String.raw`/(.+)?/(\w*)`))

    if (regMatches) {
      const [_, pattern, flags] = regMatches;
      // console.log({ pattern, flags })
      textOrRegexp = new RegExp(pattern, flags)
    }

    return tampermonkeyUtils.getElementByText(textOrRegexp, tag)
  }

  function powerfulQuerySelectorAll(selector) {
    // a[text=历史] a[text=/历史/] a[text=/\\d历史/]
    const matches = selector.match(/(.+)?\[text=(.+)+\]/)

    if (!matches) {
      return [...document.querySelectorAll(selector)]
    }

    let [_, tag, textOrRegexp] = matches;
    // console.log({ tag, textOrRegexp })

    const regMatches = textOrRegexp.match(new RegExp(String.raw`/(.+)?/(\w*)`))

    if (regMatches) {
      const [_, pattern, flags] = regMatches;
      // console.log({ pattern, flags })
      textOrRegexp = new RegExp(pattern, flags)
    }

    return tampermonkeyUtils.findElementsByText(textOrRegexp, tag)
  }

  function isFunction(val) { return typeof val === 'function' }
  function isString(val) { return typeof val === 'string' }
  function isArray(val) { return Array.isArray(val); }

  function countWordDescend(text, { lang = 'zh-hans' } = {}) {
    const segmenter = new Intl.Segmenter(lang, { granularity: 'word' })

    return Object.entries(
      [...segmenter.segment(text)]
      .filter(x => x.isWordLike)
      .map(x => x.segment)
      .reduce((acc, w) => {
        acc[w] = (acc[w] || 0) + 1;
        return acc
      }, Object.create(null))
    ).sort((a, b) => b[1] - a[1])
  }

  /** 版本号对比 */
  function compareVersion(v1, v2) {
    const v1Arr = v1.split('.');
    const v2Arr = v2.split('.');
    const len = Math.max(v1Arr.length, v2Arr.length);

    for (let i = 0; i < len; i++) {
      const num1 = parseInt(v1Arr[i] || '0', 10);
      const num2 = parseInt(v2Arr[i] || '0', 10);

      if (num1 > num2) {
        return 1;
      } else if (num1 < num2) {
        return -1;
      }
    }
    return 0;
  };

  function toLink(url, text = url, { style = '', cls='' } = {}) {
    return `<a target="_blank" ${cls && 'class="' + cls + '"'} href="${url}"${ style ? 'style="'+style+'"' : '' }>${text} 🔥🐒</a>`
  }

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

  /*   const log = console.log;*/
  function onChildChanged(root = '#app', { predicate = () => true, cb, config, debounceTime }) {
    const { debounce } = tampermonkeyUtils;
    const defaultConfig = {
      childList: true, // observe direct children
      subtree: true, // and lower descendants too
      // characterDataOldValue: true // pass old data to callback
    }

    config ??= defaultConfig

    const deCb = debounceTime ? debounce(cb, debounceTime) : cb

    const observer = new MutationObserver(mutationRecords => {
      // console.log('observe mutationRecords:', mutationRecords);
      const mutation = mutationRecords.find(({ target }) => {
        return predicate(target);
      });

      if (mutation) { deCb(mutation.target) }
    });
    // log(`observe $('${root}')`, $(root));
    // observe everything except attributes
    observer.observe(tampermonkeyUtils.$(root), config);
  }

  function getFirstCommitUrl() {
    // get the last commit and extract the url
    return tampermonkeyUtils.getFirstCommit()
      .then(commits => { console.log('[getFirstCommitUrl] commits', commits); return commits; })
      .then(commits => commits.pop().html_url)
  }

  function getRepoId() {
    const repoId = location.pathname.match(/\/([\w\-]+\/[\w\-]+).*/)[1]

    return repoId;
  }

  function isGithubAccessible(GM) {
    const detect = tampermonkeyUtils.isSiteAccessible(GM);

    return (opts) => detect(`https://github.com`, opts)
  }

  function isSiteAccessible(GM) {
    const fetchHttpStatus = tampermonkeyUtils.fetchHttpStatus(GM);

    return async (url, opts) => {
      const res = await fetchHttpStatus(url, opts)

      return res.status === 200
    }
  }

  function fetchHttpStatus(GM) {
    let promise = {}
    let count = 0
    return async (url, { timeout = 3000 } = {}) => {
      // console.log('promise', promise)

      if (promise[url] !== undefined) {
        // console.log('cache hit', url);
        return promise[url]
      }
      // console.log('request', ++count)

      promise[url] = GM.xmlHttpRequest({ timeout, url, method: 'HEAD' })
        .then(resp => {
          //console.log(resp);
          return { status: resp.status }
        })
        .catch((err) => {
          // console.error('Oops!', err)
          return { error: err }
        });

      return promise[url]
    }
  }

  // Use the github public api to navigate to the
  // last commit of a GitHub repository
  function getFirstCommit(repoId = tampermonkeyUtils.getRepoId()) {
    // args[1] is the `orgname/repo` url fragment
    // args[2] is the optional branch or hash
    // will respond all the commits `https://api.github.com/repos/egoist/dum/commits?sha=`
    const sha = '';

    return fetch('https://api.github.com/repos/' + repoId + '/commits?sha=' + sha)
    // the link header has additional urls for paging
    // parse the original JSON for the case where no other pages exist
      .then(res => Promise.all([res.headers.get('link'), res.json()]))

    // get last page of commits
      .then(results => {
      // results[0] is the link
      // results[1] is the first page of commits

      if (results[0]) {
        // the link contains two urls in the form
        // <https://github.com/...>; rel=blah, <https://github.com/...>; rel=thelastpage
        // split the url out of the string
        var pageurl = results[0].split(',')[1].split(';')[0].slice(2, -1);
        // fetch the last page
        return fetch(pageurl).then(res => res.json());
      }

      // if no link, we know we're on the only page
      return results[1];
    })
  }

  async function requestPackageJson() {
    const hostname = location.hostname;
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

  /** use tampermonkeyUtils.install instead */
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

    // npmInstallScript.setAttribute('crossorigin', '');

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

  /** use tampermonkeyUtils.install instead */
  async function ___npmInstallInBrowser(name, info, successCallback, errorCallback) {
    const { ___npmDownload: npmDownload, ___fetchUnpkgCdn: fetchUnpkgCdn, ___log: log } = tampermonkeyUtils;

    const originName = name.trim();
    // console.log(originName);

    if (/^https?:\/\//.test(originName)) {
      npmDownload(originName, originName, info, successCallback, errorCallback);
    } else {
      const endpoint = await fetchUnpkgCdn(originName);
      log('install script', endpoint)

      npmDownload(endpoint, originName, info, successCallback, errorCallback);
    }
  }

  async function ___fetchUnpkgCdn(name) {
    const url = `https://unpkg.com/${name}`;

    const resp = await fetch(url);

    return resp.url;
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
