// ==UserScript==
// @name         掘金自动签到
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  try to take over the world!
// @author       You
// @match        https://juejin.cn/*
// @icon         https://www.google.com/s2/favicons?domain=juejin.cn
// @grant        GM_info
// ==/UserScript==

(async function() {
    'use strict';
    // Your code here...

    const appName = '掘金自动签到脚本';
    const label = `${appName}>`;
    const todayStatusApi = 'https://api.juejin.cn/growth_api/v1/get_today_status';
    const signPageURL = 'https://juejin.cn/user/center/signin?from=avatar_menu';
    const $ = document.querySelector.bind(document);
    const { ready: readyByNode, createLogger } = tampermonkeyUtils;

    const log = createLogger('log', GM_info)

    console.time(`${appName}耗时`);
    console.log(label, '开始');
    await main();
    console.log(label, '结束');
    console.timeEnd(`${appName}耗时`);

    async function main() {
        // 比如直接进入主页
        if (!isSignPage()) {
            const result = await isTodaySigned();

            console.log(label, result)

            const { signed, resp } = result;

            if (signed === true) {
                // do nothing on sined
                console.log(label, '已签到无需打卡签到页面 😄')
                return;
            }

            if (!resp || resp.err_msg === "must login") {
                const loginBtn = $('.login-button');

                if (!loginBtn) { console.error(label, `非法状态：未登录但是找不到登录按钮 $('.login-button')`); return; }

                loginBtn.click();
                // 等待登录弹窗出现
                await sleep(100)
                $('.prompt-box .clickable').click();

                return;
            }


            window.open(signPageURL)
            return;
        }

        // 等待页面签约按钮文案渲染完毕，因为其要等待签到的接口返回
        await ready();

        const signBtn = $('.signin.btn');
        if (signBtn) {
            console.log(label, `未签约自动点击『${signBtn.textContent.trim()}』`);
            signBtn.click();
        }

        const signedBtn = $('.signedin.btn');

        if (signedBtn) {
            console.log(label, `已签约自动点击『${signedBtn.textContent.trim()}』`);
            signedBtn.click();
        }

       const toDrawLotteryBtn = $('.success-modal.byte-modal .btn');

       console.log(label, `点击按钮『${toDrawLotteryBtn?.textContent.trim()}』`);

       toDrawLotteryBtn?.click();

       // 等待抽奖页面跳转和渲染完毕
       await readyByNode('#turntable-item-0');
       drawFree();
    }

    async function drawFree() {
        const freeDrawBtn = $('#turntable-item-0');

        if (!freeDrawBtn) {
            console.error(label, `抽奖页面还未渲染完毕 $('#turntable-item-0') ==`, freeDrawBtn);

            return;
        }
        await sleep(500);
        log('onTextChange draw 1')

        draw(freeDrawBtn)

        const unsubscribe = onTextChange(freeDrawBtn, () => {
          log('onTextChange draw 2')
          draw(freeDrawBtn)
          log('unsubscribe')
          unsubscribe()
        });
    }

  async function draw(freeDrawBtn) {
    const text = freeDrawBtn.textContent.trim().replace(/\s{2,}/g, ' ');
    log('in draw text', text)

    if (text.includes('免费')) {
      await sleep(1000);
      freeDrawBtn.click();
    } else {
      console.log(label, '已免费抽奖。按钮状态为', `『${text}』`, window.location.href);
    }
  }

    function onTextChange(element, cb) {
      // Options for the observer (which mutations to observe)
      const config = { characterData: true, childList: true, subtree: true };

      // Callback function to execute when mutations are observed
      const callback = function(mutationsList, observer) {
        // Use traditional 'for loops' for IE 11
        for(const mutation of mutationsList) {
          console.log('mutation', mutation.type, mutation);
          cb(mutation)
        }
      }
    }

    function isSignPage() {
        return location.pathname === '/user/center/signin'
    }

    async function isTodaySigned() {
        // { "err_no": 0, "err_msg": "success", "data": true }
        let resp;

        try {
            resp = await requestJSON(todayStatusApi);
        } catch (error) {
            console.error(label, `登陆态未知：获取登陆态接口失败`, error);

            return { signed: 'UNKNOWN', error }
        }

        const { err_msg, data } = resp || {};

        if (err_msg !== 'success') {
            console.error(label, `登陆态未知：登陆态接口成功但是 resp 为空或 err_msg 不等于 "success"`, resp);

            return { signed: 'UNKNOWN', resp }
        }

        return { signed: data, resp }
    }

    async function requestJSON(url) {
        return window.fetch(url, { credentials: 'include' }).then(resp => resp.json());
    }

    function ready() {
        return sleep(600);
    }

    function sleep(ms) {
        return new Promise((resolve) => { setTimeout(resolve, ms); });
    }
})();
