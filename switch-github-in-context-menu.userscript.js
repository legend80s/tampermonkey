// ==UserScript==
// @name         右键切换 GitHub 地址
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  try to take over the world!
// @author       legend80s
// @match        https://git.homegu.com/*
// @match        https://hgithub.xyz/*
// @match        https://github.com/*
// @match        https://kkgithub.com/*
// @match        https://hub.whtrys.space/*


// @homepage     https://github.com/legend80s/tampermonkey/blob/master/switch-github-in-context-menu.userscript.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=homegu.com
// @grant        none
// @run-at       context-menu

// ==/UserScript==

// CHANGELOG
// 1.0 初始化
(async function() {
  'use strict';

  // Your code here...
  const {
    $$,
    ready,
    createLoggers,
    time2Readable,
    onUrlChange,
    toast,
  } = window.tampermonkeyUtils;

  const { log } = createLoggers(GM_info);

  main()

  function main() {
    init()

    // onUrlChange(() => init())
  }

  async function init() {
    const begin = Date.now();

    const ok = `hgithub.xyz` // `kkgithub.com` // git.homegu.com

    const [target, fast] = location.hostname === 'github.com' ? [`https://${ok}`, true] : [`https://github.com`, false]

    toast([fast ? `🚀🔜` : `🐌➡️`, '正在前往', target, !fast && '⏳ ……'].filter(Boolean).join(' '))

    const url = location.href.replace(location.origin, target)

    location.href = url

    log('🎉 耗时', time2Readable(begin, Date.now()))
  }
})();
