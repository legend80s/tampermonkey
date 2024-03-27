// ==UserScript==
// @name         Open in NPM
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  try to take over the world!
// @author       孟陬
// @match        https://github.com/*
// @match        https://hub.nuaa.cf/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=npmjs.com
// @grant        GM_openInTab
// @run-at context-menu
// ==/UserScript==

// CHANGELOG
// 1.0 初始化
(async function() {
  'use strict';

  // Your code here...
  const {
    $,
    $$,
    ready,
    createLoggers,
    time2Readable,
    onUrlChange,
    // eslint-disable-next-line no-undef
  } = tampermonkeyUtils;

  const { log } = createLoggers(GM_info);

  main()

  async function main() {
    init()
  }

  async function init() {
    const name = getSelection().toString().trim()
    GM_openInTab(`https://www.npmjs.com/package/${name}`);
  }
})();

