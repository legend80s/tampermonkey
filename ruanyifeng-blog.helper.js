// ==UserScript==
// @name         阮一峰的网络日志
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  try to take over the world!
// @author       You
// @match        https://ruanyifeng.com/blog/
// @match        http://www.ruanyifeng.com/blog/
// @match        https://www.ruanyifeng.com/blog/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ruanyifeng.com
// @grant        none
// ==/UserScript==

// CHANGELOG
// 4.0 2022-05-29 12:52:11 不选择则4s后自动跳转

(async function () {
  'use strict';

  const { $, alert, confirm, seconds, sleep } = tampermonkeyUtils;

  await ready()

  /** @type {HTMLAnchorElement} */
  const latestBlogLink = $('.asset-more-link a');

  if (!latestBlogLink) { return }

  let yes;
  const autojumpTime = 4;

  const cancel = doAfter(goto, seconds(autojumpTime), latestBlogLink.href)

  yes = await confirm({ msg: `将自动跳转到『${$('.entry-title').textContent}』\n若不选择则自动在 **${autojumpTime} 秒** 后跳转` });
  // yes = confirm(`将自动跳转到『${$('.entry-title').textContent}』\n若不选择则自动在3s后跳`);

  // console.log('yes:', yes);

  cancel();

  if (!yes) {
    return;
  }

  // 直接点击没法通过浏览器的返回按钮返回
  // $('.asset-more-link a')?.click();

  goto(latestBlogLink.href);

  function doAfter(operate, ms, ...args) {
    const timer = setTimeout(operate, ms, ...args);

    return function cancel() {
      clearTimeout(timer)
    }
  }

  function goto(url) {
    // window.alert('goto' + url)
    window.location.assign(url);
  }

  // Your code here...
  function ready() {
    return sleep(500);
  }
})();
