// ==UserScript==
// @name         自动跳转掘金签到
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  try to take over the world!
// @author       孟陬
// @match        https://www.kimi.com/*
// @match        https://chat.deepseek.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=kimi.com
// @grant        GM_info
// @grant        GM_openInTab
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

// CHANGELOG
// 1.0 初始化
// @ts-check
(async function () {
  'use strict';

  // Your code here...
  const {
    $$,
    ready,
    time2Readable,
    onUrlChange,
    generateLabel,
    sleep,
    // @ts-expect-error
    // eslint-disable-next-line no-undef
  } = tampermonkeyUtils;

  // @ts-expect-error
  const label = generateLabel(GM_info);
  const debugging = true;
  const log = (...args) => debugging && console.log(label, ...args);
  const error = (...args) => debugging && console.error(label, ...args);

  const key = '__juejin_jumper_tampermoney__'

  main();

  function main() {
    init();
  }

  function get(key) {
    return GM_getValue(key, {})

    const strItem = localStorage.getItem(key)
    if (!strItem) { return {} }

    let json

    try {
      json = JSON.parse(strItem)
    } catch (err) {
      error('存储格式非 JSON', { strItem, json } ,'，应该有 bug 或被其他应用占用了', err)

      return {}
    }

    console.assert(json, { strItem }, '此时 json 不可能为空')

    if (typeof json === 'object') return json

    error('存储格式非 JSON', { strItem, json } ,'，应该有 bug 或被其他应用占用了')

    return {}
  }

  function save(key, json) {
    return GM_setValue(key, json)
    localStorage.setItem(key, JSON.stringify(json))
  }

  function toLocalDate(date) {
    // '2025年9月9日'
    return date.toLocaleDateString('zh', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  function isSameDay(d1, d2) { return toLocalDate(d1) === toLocalDate(d2) }

  async function init() {
    const t0 = performance.now()
    await sleep(200)
    const t1 = performance.now()
    log('took', t1 - t0, 'ms',)
    const json = get(key)
    const isSameDay = json.jumpAt === toLocalDate(new Date())

    if (json.jumpAt && isSameDay) {
      log('掘金已经打开过', json)
      return
    }

    json.jumpAt = toLocalDate(new Date())
    save(key, json)

    GM_openInTab('https://juejin.cn/user/center/signin?from=sign_in_menu_bar')
  }
})();
