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
// @grant        GM_xmlhttpRequest
// @connect      github.com
// ==/UserScript==

// changelog
// 2.2 支持切换不同 GitHub 源
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
    request,
    isGithubAccessible: inject,
  } = tampermonkeyUtils;
  const isGithubAccessible = inject(GM)

  const { log } = createLoggers(GM_info);

  main()

  const replaceGithub = async (url) => {

    const fast = 'https://hgithub.xyz'

    // if we can detect if github is accessible
    const urlInstance = new URL(url)

    if (urlInstance.hostname !== 'github.com') { return { url, tips: '' } }

    let final = ''
    let icon = ''

    const start = Date.now()
    const accessible = await isGithubAccessible({ timeout: 1000 })

    if (accessible) {
      final = url
      icon = '🐙'
    } else {
      final = url.replace(urlInstance.origin, fast)
      icon = '⏳'
    }

    const end = Date.now()

    const cost = end - start > 50 ? time2Readable(start, end) : ''

    return { url: final, tips: icon + cost }
  }

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

    links.forEach(async (a) => {
      const { url, tips } = await replaceGithub(new URLSearchParams(a.search).get(key));

      a.href = url

      a.insertAdjacentHTML('beforeend', '<em style="font: 0.5em normal"> - 已转为直链' + tips + '</em>');
    });

    const costs = time2Readable(begin, Date.now());

    // log('links'); links.forEach(console.dirxml)

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
