// ==UserScript==
// @name         AI Emoji Search
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  try to take over the world!
// @author       legend80s
// @match        https://emojisearch.fun/*
// @match        https://juejin.cn/editor/drafts/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=cnaeit.com
// @require      https://unpkg.com/tinykeys
// @grant        none
// ==/UserScript==

// CHANGELOG
// 1.0 初始化 支持juejin编辑器
(async function() {
  'use strict';

  // Your code here...
  const {
    $,
    ready,
    sleep,
    createLoggers,
    time2Readable,
    onUrlChange,
    createStyle,
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

  function injectSearchApp() {
    let style = createStyle({
      width: `100%`,
      height: `100%`,
      border: `none`,
      'border-radius': `1rem`,
    });
    const iframe = `<iframe src="https://emojisearch.fun?input-only=yes" style="${style}" scrolling="no" ></iframe>`

    const containerStyle = {
      display: 'none',
      position: 'fixed',
      right: '0.5rem',
      'z-index': 300,
      // width: `336px`,
      // height: `176px`,
      width: '17.5vw', // `21rem`,
      height: `11rem`,
    }
    const container = `<aside style="${createStyle(containerStyle)}" id="aes-container">${iframe}<aside>`

    document.body.insertAdjacentHTML('afterBegin', container)

    const show = () => {
        log('show search app')
        $('#aes-container').style.display = 'block'
        // window.jQuery('#aes-container').toggle('fast')
      }

    addShortcuts({
      '$mod+Alt+e': show,
      'e m o': show,
      'Escape': () => {
        log('hide search app')
        $('#aes-container').style.display = 'none'
        // window.jQuery('#aes-container').hide('fast')
      }
    })
  }

  async function init() {
    // Code here
    if (location.hostname === 'emojisearch.fun') {
      if (new URLSearchParams(location.search).get('input-only') === 'yes') {
        log('scrollIntoView')
        await helpSearchFun()
      }

      return;
    }

    await injectSearchApp()
  }

  async function addShortcuts(mapping) {
    // eslint-disable-next-line no-undef
    const off = tinykeys.tinykeys(window, mapping)
    // off = tinykeys.tinykeys(window, {
    //   "c c": copyId,
    //   "c i": copyId,
    // })

    // document.body.click()
    await sleep(600)
    $('button')?.focus()
    $('button')?.blur()
  }

  async function helpSearchFun() {
    await sleep(80)
    $('form input').scrollIntoView();

    $('h1').style.display = 'none';

    [
      ['main', '_class', { padding: `1.5rem 1rem` }],
      ['h1 ~ div', '_class'],
      ['form ~ div', 'mt-6', { marginTop: '1rem' }],
    ]
      .forEach(([selector, cls, styles]) => {
        const el = $(selector)

        cls === '_class' ? el.removeAttribute('class') : el.classList.remove(cls)

        styles && Object.keys(styles).forEach(prop => { el.style[prop] = styles[prop] })
      })
  }
})();
