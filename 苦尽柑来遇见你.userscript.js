// ==UserScript==
// @name         📺 苦尽柑来遇见你
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  try to take over the world!
// @author       孟陬
// @match        https://www.hjwl.cc/p/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hjwl.cc
// @grant        none
// ==/UserScript==

// CHANGELOG
// 1.0 初始化
(async function() {
  'use strict';

  // Your code here...
  const {
    $,
    $$,
    bindShortcuts,
    findElementsByTextAsync,
    ready,
    createLoggers,
    time2Readable,
    onUrlChange,
    // eslint-disable-next-line no-undef
  } = tampermonkeyUtils;

  const { log } = createLoggers(GM_info);

  main()

  async function main() {
    const begin = Date.now();

    await init()

    log('🎉 耗时', time2Readable(begin, Date.now()))

    // onUrlChange(() => init())
  }

  async function init() {
    return Promise.all([
      clean(),
      bind(),
    ])
  }

  async function bind() {
    const episodes = (await findElementsByTextAsync(/^\d+$/, 'li a')).map(el => {
      const number = el.textContent.trim()
      return {
        key: number,
        desc: `Play Episode ${number}`,
        clickOn: el,
      }
    })

    function getPrevPlayLink() {
      const curLi = $('.cms_xianlu_list_state .cms_xianlu_title_selected').parentElement
      const prevLi = curLi.previousElementSibling
      if (!prevLi) { console.log('已经是第一集'); return }

      return prevLi.querySelector('a')
    }

    function getNextPlayLink() {
      const curLi = $('.cms_xianlu_list_state .cms_xianlu_title_selected').parentElement
      const nextLi = curLi.nextElementSibling
      let nextLink = nextLi.querySelector('a')

      let count = 0

      while (!nextLink) {
        if (++count > 10) { break }

        // 最后一个 `li.matches(':last-child')` 回到第一个
        if (!nextLi.nextElementSibling) {
          return nextLi.parentElement.querySelector('a')
        }

        nextLink = nextLi.nextElementSibling.querySelector('a')
      }

      return nextLink
    }

    bindShortcuts([
      {
        key: 'f',
        desc: 'Full Screen',
        cb() {
          $('#custom_player_box iframe').requestFullscreen()
        }
      },

      {
        key: ['ArrowLeft', 'ArrowUp'],
        desc: () => {
          const link = getPrevPlayLink()
          return `上一集` + (link ? `。即将播放第 ${link.textContent} 集` : '')
        },
        cb() {
          const prev = getPrevPlayLink()
          if (!prev) { alert('已经是第一集'); return }

          prev.click()
        }
      },
      {
        key: ['ArrowRight', 'ArrowDown'],
        desc: () => {
          const link = getNextPlayLink()
          return `下一集` + (link ? `。即将播放第 ${link.textContent} 集` : '')
        },
        cb() {
          const nextLink = getNextPlayLink()
          if (!nextLink) { alert('no play link find'); return }

          nextLink.click()
        }
      },

//       {
//         key: 'Space',
//         desc: 'Play or Pause',
//         cb: (event) => {
//           console.log('space triggered 2')
//           $('#custom_player_box iframe').click()
//           event.preventDefault();
//         },
//       },

      ...episodes,
    ]);
  }

  async function clean() {
    await ready('.stui-pannel-side');

    $(`.stui-player__video`).style.height = '90vh'
    $(`.stui-pannel`).parentElement.style.width = '100%'
    $$(`body,.stui-player,.stui-pannel-box`).forEach(el => (el.style.padding = '0'))

    const elements = $$('#header-top,.stui-pannel-side');

    elements.forEach(element => element.remove());

  }

//   function debounce(func, time) {
//     let timer;
//     return function debouncedFunc(...args) {
//       timer && clearTimeout(timer);

//       timer = setTimeout(() => {
//         func.apply(this, args);
//       }, time);
//     };
//   }

//   function toast(msg, { duration = 800, onClose } = {}) {
//     const el = $(`#pressed-keys`);
//     el.style.display = 'inline-block';
//     el.querySelector('span').textContent = msg;

//     setTimeout(() => {
//       el.style.display = 'none';
//       onClose?.();
//     }, duration);
//   }

//   function showPressedKeys(keys) {
//     const keying = `<code id="pressed-keys" style="
//   background: rgb(42 39 39 / 80%);
//   position: absolute;
//   top: 45vh;
//   left: 50%;
//   transform: translate(-50%);
//   z-index: 1000;
//   padding: 0.8rem 1.2rem;
//   border-radius: 0.5rem;
//   font-size: 140%;
//   color: white;
//   font-family: inherit;
// "><kbd style=" font-size: 120%; color: blue; margin-inline-end: 0.25em;">🖱️</kbd><span></span></code>`;

//     let el = $(`#pressed-keys`);

//     if (!el) {
//       $('body').insertAdjacentHTML('afterbegin', keying);
//       el = $(`#pressed-keys`);
//     }

//     if (!keys.length) {
//       el.style.display = 'none';
//     } else {
//       el.style.display = 'inline-block';
//       const text = keys
//         .map((item) => {
//          const { symbol } = item
//          return symbol.length === 1 ? symbol.toUpperCase() : symbol
//         })
//         .join(' ');
//       el.querySelector('span').textContent = text;
//     }
//   }

//   function bindShortcuts(shortcuts) {
//     // console.log(shortcuts);
//     let pressedKeys = [];

//     const callComboKey = debounce((event) => {
//       // console.log('pressedKeys', pressedKeys)
//       const comboKey = pressedKeys.map(item => item.code).join('');
//       pressedKeys = [];
//       showPressedKeys(pressedKeys);

//       shortcuts.some((item) => {
//         const { key, clickOn, cb, desc } = item;
//         const keys = Array.isArray(key) ? key : [key]
//         const trigger = typeof cb === 'function' ? cb : () => clickOn.click ? clickOn.click() : $(clickOn).click()

//         if (key.includes(comboKey)) {
//           toast(desc, { onClose: () => trigger(event) });

//           return true;
//         }
//       });
//     }, 400 * 1);

//     document.addEventListener('keydown', (event) => {
//       const { key, code } = event
//       const mapping = {
//         ' ': '␣',
//         'ArrowUp': '↑',
//         'ArrowDown': '↓',
//         'ArrowRight': '→',
//         'ArrowLeft': '←',
//       }

//       const presetSymbol = mapping[key]

//       pressedKeys.push(presetSymbol ? { symbol: presetSymbol, code } : { symbol: key, code: key });
//       showPressedKeys(pressedKeys);
//       // console.log('keydown', event, key, pressedKeys)
//       // event.preventDefault()
//       callComboKey(event);
//     });
//   }
})();
