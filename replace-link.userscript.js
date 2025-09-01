// ==UserScript==
// @name         替换 GitHub/Medium
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  replace github / medium links
// @author       legend80s
// @match        https://vite.dev
// @match        https://umijs.org/*
// @match        https://d.umijs.org/*
// @match        https://2ality.com/*
// @match        https://npmmirror.com/package/*
// @match        https://4x-ant-design.antgroup.com/*
// @match        https://ant-design.antgroup.com/*
// @match        https://cn.bing.com/search?*
// @match        https://www.npmjs.com/package/*
// @match        https://www.ruanyifeng.com/blog/*.html
// @match        https://ant-design.antgroup.com/components/*
// @match        https://www.typescriptlang.org/docs/*
// @match        https://reactrouter.com/*
// @match        https://marketplace.visualstudio.com/*

// @homepage     https://github.com/legend80s/tampermonkey/blob/master/replace-link.userscript.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=npmmirror.com
// @grant        GM.xmlHttpRequest
// ==/UserScript==

// CHANGELOG
// 2.2 支持替换 marketplace.visualstudio.com 内的 img 比如 https://marketplace.visualstudio.com/items?itemName=meganrogge.template-string-converter
// 2.1 支持 foo.medium.com
// 2.0 支持 Medium
// 1.2 add https://2ality.com/2025/02/typescript-esm-packages.html
// 1.1 支持从多个github替换地址中选择一个速度最快的
// 1.0 初始化
(async function () {
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

  const { log, warn, error } = createLoggers(GM_info);

  const isAccessible = isGithubAccessible(GM);
  let latency = 0;
  const is200 = isSiteAccessible(GM);

  const githubs = ['https://github.com', 'https://raw.githubusercontent.com'];
  const targets = ['a.href', 'img.src'];

  main();

  function main() {
    init();

    // onUrlChange(() => init())
  }

  async function init() {
    const begin = Date.now();
    const getNow = (d = new Date()) =>
      d.toLocaleTimeString() + d.toLocaleDateString();

    log('Start at', getNow());
    // Code here
    replaceMedium();

    await replaceGithub();
    await replaceGithub();
    sleep(1000);
    await replaceGithub();
    //await replaceMedium()

    log('End at', getNow(), '🎉 耗时', time2Readable(begin, Date.now()));
  }

  async function replaceMedium() {
    const github = `https://medium.com`; // or https://itsfuad.medium.com/understanding-server-sent-events-sse-with-node-js-3e881c533081
    // 避免 fakemedium.com
    const s = `a[href*=".medium.com/"],a[href*="//medium.com/"]`;
    await $Async(s);

    const matched = [...document.querySelectorAll(s)];
    log('find', matched.length, 'medium links');

    const list = matched.filter((x) => {
      return !x.__replaced; // && !!x.textContent
    });
    // log('medium list 2:', list.length);

    for (const item of list) {
      const { url, tips } = await genMedium(item.href);

      item.href = url;
      item.__replaced = true;
      // log('mark', item.textContent, item, item.__replaced)
      item.title = (item.title || '') + url + ' ' + tips;
      item.insertAdjacentHTML(
        'beforeEnd',
        `<span style="font-size: 68%;">${tips}</span>`
      );
    }
  }

  // https://raw.githubusercontent.com/meganrogge/template-string-converter/master/images/demo.gif
  // 转成
  // https://bgithub.xyz/meganrogge/template-string-converter/blob/master/images/demo.gif?raw=true
  function convertGitHubUrlURL(url) {
    const urlObj = new URL(url);
    urlObj.hostname = 'bgithub.xyz';
    urlObj.searchParams.set('raw', 'true');
    return urlObj.toString();
  }

  async function replaceGithub() {
    // normalize for bing.com English search results 这里有个问题 只能挑战到 repo 根目录，无法进入 issue
    // 因为 bing 页面并未提供 issue number
    $$(`a[aria-label="Github"] .tpmeta`).forEach((meta) => {
      const rawUrl = meta.textContent.replaceAll(' › ', '/');
      meta.closest('a[aria-label="Github"]').setAttribute('href', rawUrl);
    });

    const result = targets
      .map((str) => {
        const [tag, attr] = str.split('.');
        const s = githubs
          .map((github) => `${tag}[${attr}^="${github}"]`)
          .join(',');
        log(s, document.querySelectorAll(s));

        return [{ tag, attr }, [...document.querySelectorAll(s)]];
      })
      .filter((item) => item[1].length);

    // log(s)
    // await $Async(s);

    const all = result.flatMap((x) => x[1]);

    (all.length === 0 ? warn : log)(`find ${all.length} github links or imgs`);

    for (const [{ tag, attr }, matched] of result) {
      log(attr, 'mached:', matched.length);

      const list = matched.filter((x) => {
        return !x.__replaced; // && !!x.textContent
      });

      for (const item of list) {
        // const attr = item.href ? 'href' : 'src'
        const { url, tips } = await findGithub(item[attr]);

        item[tag === 'a' ? 'href' : attr] = url;
        item.__replaced = true;
        tag === 'a ' && (item.target = `_blank`);
        // log('mark', item.textContent, item, item.__replaced)
        item.title = (item.title || '') + url + ' ' + tips;
        item.insertAdjacentHTML(
          'beforeEnd',
          `<span style="font-size: 68%;">${tips}</span>`
        );
      }
    }
  }

  function getFastestReplacement(candidates) {
    /*     tampermonkeyUtils.gm = GM */
    // console.log(tampermonkeyUtils.gm)
    const { resolve, reject, promise } = Promise.withResolvers();
    const rejectedUrls = [];

    candidates.forEach((url) => {
      is200(url)
        .then((yes) => (yes ? resolve(url) : rejectedUrls.push(url)))
        .then(() => {
          rejectedUrls.length === candidates.length &&
            reject({ rejectedUrls, msg: 'all urls tried but none is 200' });
        });
    });

    setTimeout(() => {
      reject({ rejectedUrls, msg: 'timeout' });
    }, 3000);

    return promise;
  }

  async function genMedium(url) {
    // if we can detect if github is accessible
    // log(url)
    const urlInstance = new URL(url);

    // if (urlInstance.hostname !== 'medium.com') { return { url, tips: '' } }

    let final = '';
    let icon = '';

    //console.time('getFastestReplacement')
    const fast = 'https://readmedium.com';

    final = url.replace(urlInstance.origin, fast);
    icon = 'Ⓜ️';

    return { url: final, tips: icon };
  }

  async function findGithub(rawUrl) {
    let url = rawUrl;
    // if we can detect if github is accessible
    // log(url)
    let urlInstance;
    try {
      urlInstance = new URL(url);
    } catch (err) {
      console.error('[findGithub] Bad url:', url);
      console.error(err);
      return { url, tips: '' };
    }

    if (!githubs.includes(urlInstance.origin)) {
      warn('not match github', url);
      return { url, tips: '' };
    }

    let final = '';
    let icon = '';

    const start = Date.now();
    //console.time('isGithubAccessible')
    const accessible = await isAccessible({ timeout: 80 });
    //console.timeEnd('isGithubAccessible')

    if (accessible) {
      final = url;
      icon = '🐙';
    } else {
      //console.time('getFastestReplacement')
      const fast = await getFastestReplacement([
        'https://bgithub.xyz',
        // 'https://dgithub.xyz',
        'https://git.homegu.com',
        'https://kkgithub.com',
        'https://hgithub.xyz',
        'https://hub.whtrys.space',
      ]);
      //console.timeEnd('getFastestReplacement')
      //log({ fast })

      final = url.replace(urlInstance.origin, fast);
      icon = '♻️';
    }

    if (!latency) {
      latency = Date.now() - start;
    }
    //log('end - start', end - start)

    const cost = latency > 50 ? time2Readable(latency) : '';

    if (rawUrl.startsWith(`https://raw.githubusercontent.com`)) {
      // log('add raw') 注意这里只处理了 master 分支
      const master = '/master/';
      if (final.includes(master)) {
        final = final.replace(master, '/blob/master/');
      } else {
        error('无法展示其他分支的 raw content');
      }

      final += (final.includes('?') ? '&' : '?') + 'raw=true';
    }

    return { url: final, tips: icon + cost };
  }
})();
