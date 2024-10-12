// ==UserScript==
// @name         替换网页 GitHub 地址
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  try to take over the world!
// @author       legend80s
// @match        https://npmmirror.com/package/*
// @match        https://4x-ant-design.antgroup.com/components/*
// @match        https://cn.bing.com/search?q=*
// @match        https://www.npmjs.com/package/*
// @match        https://www.ruanyifeng.com/blog/*.html

// @homepage     https://github.com/legend80s/tampermonkey/blob/master/replace-github.userscript.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=npmmirror.com
// @grant        GM.xmlHttpRequest
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
    $Async,
    isGithubAccessible,
    // eslint-disable-next-line no-undef
  } = tampermonkeyUtils;

  const { log } = createLoggers(GM_info);

  main()

  function main() {
    init()

    // onUrlChange(() => init())
  }

  async function init() {
    const begin = Date.now();
    // Code here

    await replace()

    log('🎉 耗时', time2Readable(begin, Date.now()))
  }

  async function replace() {
    const github = `https://github.com`
    const s = `a[href^="${github}"]`
    await $Async(s)
    const list = [...document.querySelectorAll(s)].filter(x => !!x.textContent)

    log('list:', list)

    for (const item of list) {
      const { url, tips } = await replaceGithub(item.href)

      item.href = url
      item.title = url + ' ' + tips
      item.insertAdjacentHTML('beforeEnd', `<span style="font-size: 68%;">${tips}</span>`)
    }
  }

  const isAccessible = isGithubAccessible(GM)
  let latency = 0

  async function replaceGithub(url) {
    const fast = 'https://git.homegu.com'

    // if we can detect if github is accessible
    // log(url)
    const urlInstance = new URL(url)

    if (urlInstance.hostname !== 'github.com') { return { url, tips: '' } }

    let final = ''
    let icon = ''

    const start = Date.now()
    const accessible = await isAccessible({ timeout: 880 })

    if (accessible) {
      final = url
      icon = '🐙'
    } else {
      final = url.replace(urlInstance.origin, fast)
      icon = '♻️'
    }

    if (!latency) { latency = Date.now() - start }
    //log('end - start', end - start)

    const cost = latency > 50 ? time2Readable(latency) : ''

    return { url: final, tips: icon + cost }
  }
})();
