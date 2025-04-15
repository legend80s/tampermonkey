// ==UserScript==
// @name         清除广告
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  try to take over the world!
// @author       孟陬
// @match        https://onlinetextcompare.com
// @icon         🧹
// @grant        none
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
  // eslint-disable-next-line no-undef
  } = tampermonkeyUtils;

  const { log } = createLoggers(GM_info);

  main()

  function main() {
    init()

    onUrlChange(() => init())
  }

  async function init() {
    const begin = Date.now();

    await ready('iframe');

    const ifs = $$('iframe,.adsbygoogle');

    ifs.forEach(f => f.remove());

    log('🎉 移除', ifs.length, '个广告。耗时', time2Readable(begin, Date.now()))
  }
})();
