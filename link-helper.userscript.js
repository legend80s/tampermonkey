// ==UserScript==
// @name         LinkHelper
// @namespace    http://tampermonkey.net/
// @version      2.1.0
// @description  还原二跳链接为原始链接、微信外链可点
// @author       You
// @match        https://juejin.cn/*
// @match        https://zhuanlan.zhihu.com/p/*
// @match        https://www.zhihu.com/question/*
// @match        https://mp.weixin.qq.com/s*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=juejin.cn
// @grant        none
// ==/UserScript==

// changelog
// 1.0 掘金、知乎
// 2.0 微信、Google

(function() {
  'use strict';
  const {
    $$,
    createLoggers,
    onUrlChange,
    ready,
    time2Readable,
    seconds,
    findElementsByText,
    toLink,
    sleep,
  } = tampermonkeyUtils;

  const { log } = createLoggers(GM_info);

  main()

  // Your code here...
  function main() {
    init();

    onUrlChange(() => init())
  }

  async function init() {
    if (location.hostname === 'mp.weixin.qq.com') {
      helpWeixin()
      return;
    }

    const begin = Date.now();

    const key = 'target';

    await sleep(50);

    await ready(`a[href*=${key}]`, { timeout: seconds(5) });

    const links = $$(`a[href*=${key}]`);
    const linksText = '[' + links.map(link => '"' + link.textContent + '"').join(', ') + ']';

    links.forEach((a) => {
      a.href = new URLSearchParams(a.search).get(key);

      a.insertAdjacentHTML('beforeend', '<em style="font: 0.5em normal"> - 已转为直链</em>');
    });

    const costs = time2Readable(begin, Date.now());

    log('links'); links.forEach(console.dirxml)

    log(
      '🎉 发现',
      links.length,

      '个二跳链接' + (
        links.length === 0 ? '' : `，已修改为原始链接`
      ) + `。耗时 ${costs}`
    )

    // links.length && log(linksText)
  }

  function helpWeixin() {
    const links = findElementsByText(/^http/, 'p');

    links.forEach((e) => {
      e.innerHTML = e.innerHTML.replace(/(http[^<]+)/, (m, p1) => { return toLink(p1) } )
    });

    log('links', links.length)
  }
})();
