// ==UserScript==
// @name         LinkHelper
// @namespace    http://tampermonkey.net/
// @version      2.3
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
// 2.3 网络空闲即页面完成加载再替换，确保用户点击后生成的异步 DOM 也能替换！
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

  const { log } = createLoggers(GM_info, { debug: false });

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

    onNetworkIdle((gap) => {
      log('onNetworkIdle init', gap)
      init()
    })

    onUrlChange(() => init())
  }

  async function init() {
    if (location.hostname === 'mp.weixin.qq.com') {
      helpWeixin()
      return;
    }

    const begin = Date.now();

    const key = 'target';

    // await sleep(50);

    await ready(`a[href*=${key}]`, { timeout: seconds(1.9) });

    const links = $$(`a[href*=${key}]`);

    // const linksText = '[' + links.map(link => '"' + link.textContent + '"').join(', ') + ']';

    links.forEach(async (a) => {
      const { url, tips } = await replaceGithub(new URLSearchParams(a.search).get(key));

      if (a.textContent.includes('已转为直链')) { return }

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

    links.forEach((p) => {
      if (p.__lh_replaced__) { return }

      p.__lh_replaced__ = true

      // span to a link
      p.innerHTML = p.innerHTML.replace(/(http[^<]+)/, (m, p1) => { return toLink(p1) } )

      p.querySelector('a').style.cursor = 'pointer'
      p.querySelector('a').style.textDecoration = 'underline'
    });

    log('links', links.length)
  }

  function onNetworkIdle(cb) {
    let activeRequests = 0;
    const start = Date.now()

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntriesByType("resource");
      activeRequests = entries.filter(
        (entry) => !entry.responseEnd // 未完成的请求
      );

      // console.log(entries.map(x => ({ name: x.name, initiatorType: x.initiatorType  })))

      if (activeRequests.length === 0) {
        // console.log("所有请求已完成，网络空闲");
        // console.log(Date.now() - start)
        cb(Date.now() - start)
      }
    });

    observer.observe({ type: "resource", buffered: true });
  }
})();