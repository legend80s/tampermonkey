// ==UserScript==
// @name         左右箭头翻页
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  try to take over the world!
// @author       孟陬
// @match        http://github.yanhaixiang.com/jest-tutorial*
// @match        https://sideproject.guide/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=yanhaixiang.com
// @grant        none
// ==/UserScript==

// CHANGELOG
// 3.0 支持 wrap
// 2.0 支持 https://sideproject.guide/idea
// 1.0 左右箭头翻页
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
  } = tampermonkeyUtils;

  const { log, error } = createLoggers(GM_info);

  main()

  async function main() {
    init()

    // onUrlChange(() => init())
  }

  function resolvePager(selectors) {
    for (const selector of selectors) {
      if (typeof selector === 'string') {
        const pagers = $$(selector);

        if (pagers.length === 2) {
          return pagers;
        }

        if (pagers.length === 1) {
          return pagers;
        }
      } else {
        const [prevSelector, nextSelector] = selector;

        if ($(prevSelector) || $(nextSelector)) { return [$(prevSelector), $(nextSelector)] }
      }
    }

    return [];
  }

  async function init() {
    const selectors = [['.prev > a', '.next > a'], 'footer a:not([href^="http"])']
    // $$('footer a:not([href^="http"])')

    await ready('a');

    let timer;

    document.addEventListener('keydown', ({ key }) => {
      if (!['ArrowRight', 'ArrowLeft'].includes(key)) { return; }

      clearTimeout(timer);

      const [prev, next] = resolvePager(selectors);
      log('prev', [prev, next])

      timer = setTimeout(() => {
        if (key === 'ArrowRight') {
          next ? next.click() : prev.click()
        } else if (key === 'ArrowLeft') {
          prev ? prev.click() : next.click()
        }
      }, 100)
    });
  }
})();
