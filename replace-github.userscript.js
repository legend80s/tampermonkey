// ==UserScript==
// @name         替换网页 GitHub 地址
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  try to take over the world!
// @author       legend80s
// @match        https://npmmirror.com/package/*
// @match        https://4x-ant-design.antgroup.com/*
// @match        https://ant-design.antgroup.com/*
// @match        https://cn.bing.com/search?q=*
// @match        https://www.npmjs.com/package/*
// @match        https://www.ruanyifeng.com/blog/*.html
// @match        https://ant-design.antgroup.com/components/*

// @homepage     https://github.com/legend80s/tampermonkey/blob/master/replace-github.userscript.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=npmmirror.com
// @grant        GM.xmlHttpRequest
// ==/UserScript==

// CHANGELOG
// 1.1 支持从多个github替换地址中选择一个速度最快的
// 1.0 初始化
(async function() {
  'use strict';

  // Your code here...
  const {
    $$,
    ready,
    createLoggers,
    time2Readable,
    sleep,
    onUrlChange,
    $Async,
    isGithubAccessible,
    isSiteAccessible,
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
    await replace()
    sleep(1000)
    await replace()

    log('🎉 耗时', time2Readable(begin, Date.now()))
  }

  async function replace() {
    const github = `https://github.com`
    const s = `a[href^="${github}"]`
    await $Async(s)

    log('list1:', document.querySelectorAll(s).length)
    const list = [...document.querySelectorAll(s)].filter(x => {
      return !x.__replaced // && !!x.textContent
    })
    log('list:', list.length)

    for (const item of list) {
      const { url, tips } = await replaceGithub(item.href)

      item.href = url
      item.__replaced = true
      // log('mark', item.textContent, item, item.__replaced)
      item.title = (item.title || '') + url + ' ' + tips
      item.insertAdjacentHTML('beforeEnd', `<span style="font-size: 68%;">${tips}</span>`)
    }
  }

  const isAccessible = isGithubAccessible(GM)
  let latency = 0

  const is200 = isSiteAccessible(GM)

  function getFastestReplacement(candidates) {
/*     tampermonkeyUtils.gm = GM */
    // console.log(tampermonkeyUtils.gm)
    const { resolve, reject, promise } = Promise.withResolvers()
    const rejectedUrls = []

    candidates.forEach(url => {
      is200(url)
        .then((yes) => yes ? resolve(url) : rejectedUrls.push(url))
        .then(() => { rejectedUrls.length === candidates.length && reject({ rejectedUrls, msg: 'all urls tried but none is 200' }) })
    })

    setTimeout(() => { reject({ rejectedUrls, msg: 'timeout' }) }, 3000)

    return promise
  }

  async function replaceGithub(url) {
    // if we can detect if github is accessible
    // log(url)
    const urlInstance = new URL(url)

    if (urlInstance.hostname !== 'github.com') { return { url, tips: '' } }

    let final = ''
    let icon = ''

    const start = Date.now()
    //console.time('isGithubAccessible')
    const accessible = await isAccessible({ timeout: 80 })
    //console.timeEnd('isGithubAccessible')

    if (accessible) {
      final = url
      icon = '🐙'
    } else {
      //console.time('getFastestReplacement')
      const fast = await getFastestReplacement([
        'https://git.homegu.com',
        'https://kkgithub.com',
        'https://hgithub.xyz',
        'https://hub.whtrys.space'
      ])
      //console.timeEnd('getFastestReplacement')
      //log({ fast })

      final = url.replace(urlInstance.origin, fast)
      icon = '♻️'
    }

    if (!latency) { latency = Date.now() - start }
    //log('end - start', end - start)

    const cost = latency > 50 ? time2Readable(latency) : ''

    return { url: final, tips: icon + cost }
  }
})();
