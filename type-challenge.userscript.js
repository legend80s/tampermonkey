// ==UserScript==
// @name         Type Challenges
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  try to take over the world!
// @author       孟陬
// @match        https://github.com/type-challenges/*
// @match        https://hub.nuaa.cf/type-challenges/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
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
    init().then(init)
  }

  async function init() {
    const begin = Date.now();
    const pattern = 'a[href*="questions/"]'

    await ready(pattern);

    const qs = [...$$(pattern)]

    qs.forEach(a => {
      a.href = a.href.replace(/.+\bquestions\/(\d+)-.+/, (m, p1) => `https://tsch.js.org/${Number(p1)}/play`)
      a.target = '_blank'

      const span = document.createElement('span')
      span.style.fontSize = '0.7em'
      span.textContent = a.firstChild.alt
      a.firstChild.replaceWith(span)

      // a.style.textDecoration = 'none'
    })


    log('🎉 替换', qs.length, '个链接。耗时', time2Readable(begin, Date.now()))
  }
})();

