// ==UserScript==
// @name         清爽的 CCTV
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  try to take over the world!
// @author       孟陬
// @match        https://tv.cctv.com/live/cctv*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cctv.com
// @grant        none
// ==/UserScript==

// CHANGELOG
// 1.5 Prev ArrowDown to tune to next channel
// 1.4 show toast before action
// 1.3 use ␣ to represent space. uppercase single key.
// 1.2 Show pressing keys in center of screen.
// 1.1 Add shortcuts F to fullscreen.
// 1.0 初始化
(async function () {
  'use strict';

  // Your code here...
  const {
    $,
    ready,
    createLoggers,
    time2Readable,
    getElementByText,
    bindShortcuts,
    // eslint-disable-next-line no-undef
  } = tampermonkeyUtils;

  const { log } = createLoggers(GM_info, { debug: true });

  main();

  async function main() {
    init();

    // onUrlChange(() => init())
  }

  async function init() {
    const begin = Date.now();

    await ready('.nav_wrapper_bg');

    const nodes = [
      '.nav_wrapper_bg.newtopbz',
      '.header_nav.newtopbzTV',
      '.video_btnBar',
      '.floatNav.ispcbox',
      '.page_body > .column_wrapper',
    ].map((selector) => {
      // log(selector);
      return $(selector);
    });

    //     log('nodes', nodes)
    nodes.forEach((f) => f.remove());

    $('.page_body').style.paddingTop = '2rem';

    log(
      '🎉 移除',
      nodes.length,
      '个目标节点。耗时',
      time2Readable(begin, Date.now())
    );

    const cctvNumberSwitches = Array.from({ length: 17 }, (_value, index) => {
      const channel = String(index + 1);
      return {
        key: channel,
        desc: 'Play CCTV ' + channel,
        cb: () => getElementByText(new RegExp(`CCTV\-${channel}`), 'a').click(),
      };
    });

    const prev = '#jiemudan dl:has(+ dl.active) a'
    const next = '#jiemudan dl.active + dl a'
    const tvIcon = `<svg style="vertical-align: -5px;" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tv-minimal-play-icon lucide-tv-minimal-play"><path d="M10 7.75a.75.75 0 0 1 1.142-.638l3.664 2.249a.75.75 0 0 1 0 1.278l-3.664 2.25a.75.75 0 0 1-1.142-.64z"/><path d="M7 21h10"/><rect width="20" height="14" x="2" y="3" rx="2"/></svg>`

    bindShortcuts([
      {
        key: 'f',
        desc: 'Full Screen',
        cb: () =>
          document
            .querySelector(`#player_fullscreen_no_mouseover_player`)
            .click(),
      },
      {
        key: '5p',
        desc: 'Play CCTV 5+',
        cb: () => getElementByText(/CCTV-5\+/, 'a').click(),
      },
      {
        key: 'ArrowDown',
        desc: () => {
          return {
            content: `Next Channel ${tvIcon} ` + $(next).textContent,
            // duration: 1000e3,
          }
        },
        cb({ event }) { event.preventDefault(); $(next).click() },
      },
      {
        key: 'ArrowUp',
        desc: () => `Previous Channel ${tvIcon} ` + $(prev).textContent,
        cb({ event }) { event.preventDefault(); $(prev).click() },
      },
      // $0.currentTime
      {
        key: 'ArrowRight',
        desc: ({ nHits }) => `+${nHits * 5}s`,
        cb({ nHits }) { $('video').currentTime += (5 * nHits) },
      },
      {
        key: 'ArrowLeft',
        desc: ({ nHits }) => `-${nHits * 5}s`,
        cb({ nHits }) { $('video').currentTime -= (5 * nHits) },
      },
      {
        key: 'm',
        desc: () => (h5player_player.muted ? '🗣️ 取消' : '🤫 ') + '静音',
        cb() { h5player_player.muted = !h5player_player.muted },
      },
      ...cctvNumberSwitches,
    ]);
  }
})();
