// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  try to take over the world!
// @author       孟陬
// @match        <$URL$>
// @icon         <$ICON$>
// @grant        GM_info
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

  const label = generateLabel(GM_info)
  const log = (...args) => debugging && console.log(label, ...args)
  const error = (...args) => debugging && console.error(label, ...args)

  main()

  function main() {
    init()

    onUrlChange(() => init())
  }

  async function init() {
    const begin = Date.now();

    await ready('iframe');

    const ifs = $$('iframe[src^=http]');

    ifs.forEach(f => f.remove());

    log('🎉 移除', ifs.length, '个 iframe。耗时', time2Readable(begin, Date.now()))
  }
})();
