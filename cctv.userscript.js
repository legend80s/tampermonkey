// ==UserScript==
// @name         清爽的 CCTV
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  try to take over the world!
// @author       孟陬
// @match        https://tv.cctv.com/live/cctv*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cctv.com
// @grant        none
// ==/UserScript==

// CHANGELOG
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

    bindShortcuts([
      {
        key: 'f',
        desc: 'F to fullscreen',
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
      ...cctvNumberSwitches,
    ]);
  }

  // find the item with timestamp - xxx
  function debounce(func, time) {
    let timer;
    return () => {
      timer && clearTimeout(timer);

      timer = setTimeout(() => {
        func();
      }, time);
    };
  }

  function showPressedKeys(keys) {
    const keying = `<code id="pressed-keys" style="
  background: #ffffffa3;
  position: absolute;
  top: 45vh;
  right: 50%;
  z-index: 1000;
  padding: 1rem 2rem;
  border-radius: 0.5rem;
  font-size: 140%;
  color: darkviolet;
  font-weight: bold;
"></code>`;

    let el = $(`#pressed-keys`);

    if (!el) {
      $('body').insertAdjacentHTML('afterbegin', keying);
      el = $(`#pressed-keys`);
    }

    keys.length
      ? ((el.style.display = 'inline-block'), (el.textContent = keys.join(' ')))
      : (el.style.display = 'none');
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
        const { key, cb } = item;

        if (key === comboKey) {
          cb();
          return true;
        }
      });
    }, 400);

    document.addEventListener('keydown', (event) => {
      pressedKeys.push(event.key === ' ' ? 'Space' : event.key);
      showPressedKeys(pressedKeys);
      // console.log('keydown', event, event.key, pressedKeys)
      callComboKey();
    });
  }
})();
