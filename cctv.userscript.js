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
    sleep,
    ready,
    createLoggers,
    time2Readable,
    getElementByText,
    bindShortcutsx,
    debounce,
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
    nodes.forEach((f) => f?.remove());

    $('.page_body').style.paddingTop = '2rem';

    log(
      '🎉 移除',
      nodes.length,
      '个目标节点。耗时',
      time2Readable(begin, Date.now())
    );

    const full = async () => {
      await sleep(500)
      document.querySelector(`#player_fullscreen_no_mouseover_player`).click()
    }

    const params = new URLSearchParams(location.search);

    // params.get('full') === 'yes' && full();

    function insertSearch(search, key, value) {
      const params = new URLSearchParams(search);

      // 更新
      params.set(key, value);

      // 返回更新后参数（可选）
      return params.toString();
    }

    const cctvNumberSwitches = Array.from({ length: 17 }, (_value, index) => {
      const channel = String(index + 1);
      const anchor = getElementByText(new RegExp(`CCTV\-${channel}`), 'a')
      return {
        key: channel,
        desc: 'Play ' + anchor.textContent.trim(),
        cb: () => {
          const full = document.fullscreen
          // Add full to url next time render the page will go to fullscreen automatically.
          full && (anchor.search = insertSearch(anchor.search, 'full', 'yes'))
          anchor.click()
        },
      };
    });

    const prev = '#jiemudan dl:has(+ dl.active) a'
    const next = '#jiemudan dl.active + dl a'
    const tvIcon = `<svg style="vertical-align: -5px;" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tv-minimal-play-icon lucide-tv-minimal-play"><path d="M10 7.75a.75.75 0 0 1 1.142-.638l3.664 2.249a.75.75 0 0 1 0 1.278l-3.664 2.25a.75.75 0 0 1-1.142-.64z"/><path d="M7 21h10"/><rect width="20" height="14" x="2" y="3" rx="2"/></svg>`

    bindShortcuts([
      {
        key: 'f',
        desc: 'Full Screen',
        cb: full,
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

//   function debounce(func, time) {
//     let timer;
//     return () => {
//       timer && clearTimeout(timer);

//       timer = setTimeout(() => {
//         func();
//       }, time);
//     };
//   }

  function toast(msg, { duration = 500, onClose } = {}) {
    const el = $(`#pressed-keys`);
    el.style.display = 'inline-block';
    el.querySelector('span').textContent = msg;

    setTimeout(() => {
      el.style.display = 'none';
      onClose?.();
    }, duration);
  }

  function showPressedKeys(keys) {
    const keying = `<code id="pressed-keys" style="
  background: rgb(42 39 39 / 80%);
  position: absolute;
  top: 45vh;
  left: 50%;
  transform: translate(-50%);
  z-index: 1000;
  padding: 0.8rem 1.2rem;
  border-radius: 0.5rem;
  font-size: 140%;
  color: white;
  font-family: inherit;

"><kbd style=" font-size: 120%; color: blue; margin-inline-end: 0.25em;">🖱️</kbd><span></span></code>`;

    let el = $(`#pressed-keys`);

    if (!el) {
      $('body').insertAdjacentHTML('afterbegin', keying);
      el = $(`#pressed-keys`);
    }

    if (!keys.length) {
      el.style.display = 'none';
    } else {
      el.style.display = 'flex';
      const text = keys
        .map((k) => (k.length === 1 ? k.toUpperCase() : k))
        .join(' ');
      el.querySelector('span').textContent = text;
    }
  }

  function bindShortcuts(shortcuts) {
    console.log(shortcuts);
    let pressedKeys = [];

    const callComboKey = debounce(() => {
      // console.log('pressedKeys', pressedKeys)
      const comboKey = pressedKeys.join('');
      pressedKeys = [];
      showPressedKeys(pressedKeys);

      shortcuts.some((item) => {
        const { key, cb, desc } = item;

        if (key === comboKey) {
          toast(desc, { onClose: cb });

          return true;
        }
      });
    }, 1000 * 1);

    document.addEventListener('keydown', (event) => {
      pressedKeys.push(event.key === ' ' ? '␣' : event.key);
      showPressedKeys(pressedKeys);
      // console.log('keydown', event, event.key, pressedKeys)
      callComboKey();
    });
  }
})();
