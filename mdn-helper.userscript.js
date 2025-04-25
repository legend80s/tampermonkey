// ==UserScript==
// @name         MDN Helper
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  try to take over the world!
// @author       孟陬
// @match        https://developer.mozilla.org/*/*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mozilla.org
// @grant        GM_info
// ==/UserScript==

// CHANGELOG
// 1.0 初始化
// @ts-check
(async function () {
  'use strict';

  // Your code here...
  const {
    $,
    $$,
    $Async,
    ready,
    time2Readable,
    onUrlChange,
    generateLabel,
    // @ts-expect-error
    // eslint-disable-next-line no-undef
  } = tampermonkeyUtils;

  // @ts-expect-error
  const label = generateLabel(GM_info);
  const debugging = true;
  const log = (...args) => debugging && console.log(label, ...args);
  const error = (...args) => debugging && console.error(label, ...args);

  main();

  function main() {
    init();

    onUrlChange(() => init());
  }

  async function init() {
    setTimeout(() => insertCanIUse(), 100)
    setTimeout(() => insertCanIUse(), 200)
  }
  async function insertCanIUse() {
    if ($('#__mdn-helper-caniuse')) { return }

    const begin = Date.now();

    const host = await $Async('#browser_compatibility');
    const keyword = location.pathname.split('/').at(-1)
    const href = `https://caniuse.com/?search=${keyword}`

    const link = ` <a
      id="__mdn-helper-caniuse"
      href="${href}"
      target="_blank"
      style="font-size: 60%; text-decoration: 0.05em underline; color: #C75000; font-size: 60%; font-family: &quot;Open Sans&quot;"
    >
      <code>${keyword}</code> in caniuse
    </a>`
    host.insertAdjacentHTML('beforeEnd', link)
  }
})();
