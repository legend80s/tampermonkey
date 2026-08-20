// ==UserScript==
// @name         MonaLisa🧕
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  try to take over the world!
// @author       legend80s
// @match        https://programmercarl.com/*
// @match        https://juejin.cn
// @match        https://juejin.cn/post/*
// @match        https://juejin.cn/spost/*
// @match        https://mp.weixin.qq.com/cgi-bin/home*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=programmercarl.com
// @grant        GM_info
// ==/UserScript==

// CHANGELOG
// 2.1 支持微信公众号后台、不同长度元素应用不同 blur 程度
// 2.0 支持网站定制化需要遮盖的内容
// 1.0 初始化
// @ts-check
;(async function () {
  'use strict'

  // Your code here...
  const {
    $,
    $$,
    ready,
    time2Readable,
    onUrlChange,
    onChildChanged,
    generateLabel,
    // @ts-expect-error
    // eslint-disable-next-line no-undef
  } = tampermonkeyUtils

  // @ts-expect-error
  const label = generateLabel(GM_info)
  const debugging = true
  const log = (...args) => debugging && console.log(label, ...args)
  const warn = (...args) => debugging && console.warn(label, ...args)
  const error = (...args) => debugging && console.error(label, ...args)

  const selectorize = arr => arr.map(s => `,${s}`).join('')

  const config = {
    readySelector: 'header',
    get selectors() {
      return ['header', 'aside', 'nav'].join(',')
    },
    site: {
      'juejin.cn': {
        get selectors() {
          return (
            config.selectors + ', .article-suspended-panel, #sidebar-container, .suspension-panel'
          )
        },
      },
      'mp.weixin.qq.com': {
        readySelector: 'h2',
        get selectors() {
          return (
            config.selectors +
            selectorize([
              '#js_mp_sidemenu',
              '.weui-desktop-grid.data_container',
              '.weui-desktop-list.weui-desktop-home-msg',
            ])
          )
        },
      },
    },
  }

  const config1 = {
    selectors: 'header,aside,nav',
    site: {
      'juejin.cn': {
        selectors:
          config.selectors + ', .article-suspended-panel, #sidebar-container, .suspension-panel',
      },
    },
  }

  const { selectors = config.selectors, readySelector = config.readySelector } =
    config.site[location.hostname] || config

  const namespace = `__tm_` // tm for tampermonkey
  function genKey(rawKey) {
    return `${namespace}${rawKey}`
  }
  const keyFocusMode = genKey('focuseMode')
  const focusModeInStorage = localStorage.getItem(keyFocusMode)

  // 默认开启
  let focuseModeOn = !focusModeInStorage || focusModeInStorage === 'on'

  const { boot, toast } = await import('https://esm.sh/sourdough-toast@0.3.0')

  const frosty = {
    opacity: '0.35',
    filter(el) {
      const w = el.getBoundingClientRect().width
      const blurness = w >= 1600 ? 8 : w >= 1000 ? 6 : 4
      log('blurness:', blurness)
      return `blur(${blurness}px)`
    },
    transition: `opacity .35s ease, filter .35s ease`,
  }

  main()

  function main() {
    bootSonner()
    addFocusModeToggler()
    let start = Date.now()
    log('init triggered by main', start)
    init()

    onChildChanged(document.body, {
      cb: () => {
        const end = Date.now()
        log('init triggered by onChildChanged', end, 'gap:', end - start, 'ms')
        start = end
        init()
      },
      debounceTime: 200,
    })
  }

  function whichTheme() {
    const documentElement = document.documentElement
    const isDark =
      documentElement.dataset.theme === 'dark' ||
      documentElement.style['color-scheme'] === 'dark' ||
      documentElement.className.includes('dark')

    return isDark ? 'dark' : 'light'
  }

  function bootSonner() {
    document.head.insertAdjacentHTML(
      'beforeend',
      `<link
      rel="stylesheet"
      href="https://esm.sh/sourdough-toast@0.3.0/sourdough-toast.css"
    />`,
    )
    const opts = {
      theme: whichTheme(),
      viewportOffset: 12,
      // theme: theme === "light" ? "dark" : "light",
      xPosition: 'center',
      yPosition: 'top',
      maxToasts: 10,

      expandedByDefault: false,
      // gap: -12,
      // closeButton: true,
      richColors: true,
      duration: 1000,
    }
    boot(opts)

    const toastElement = /** @type {HTMLDivElement} */ (
      document.querySelector('ol[data-sourdough-toaster]')
    )
    toastElement.style.setProperty('--width', 'max-content')
  }

  function modeStatusToText(on) {
    return '专注模式：' + (on ? '🟢 已开启' : '🔴 已关闭')
  }

  function addFocusModeToggler() {
    const id = genKey('focus_model_toggle')
    const title = !focusModeInStorage ? '点击进入专注模式' : modeStatusToText(focuseModeOn)

    const tooglerHtml = `<div id="${id}" class="🐵 focus-mode-toggle">
      <button class="" title="${title}">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-focus w-5 h-5 text-primary" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path><path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
        </svg>
      </button>
    </div>`

    document.body.insertAdjacentHTML(`afterbegin`, tooglerHtml)
    const box = $('#' + id)
    const style1 = {
      position: `fixed`,
      right: 0,
      'z-index': 1000,
    }
    Object.assign(box.style, style1)

    const btn = box.querySelector('button')
    const style2 = {
      'background-color': `#1b1b1fad`,
      color: `ghostwhite`,
      'backdrop-filter': `blur(1px)`,
      border: `none`,
      padding: `3px 4px 0 4px`,
      'border-radius': `8px`,
      cursor: `pointer`,
    }
    Object.assign(btn.style, style2)
    const elements = $$(selectors)

    box.onclick = () => {
      focuseModeOn = !focuseModeOn
      localStorage.setItem(keyFocusMode, focuseModeOn ? 'on' : 'off')
      console.log('focuseModeOn', focuseModeOn)

      if (focuseModeOn) {
        elements.forEach(wearVeil)
      } else {
        elements.forEach(unveil)
      }

      const feedback = modeStatusToText(focuseModeOn)
      btn.title = feedback

      setTimeout(() => {
        // console.log(1, feedback, toast, toast.info, toast.success)
        // toast.info(feedback)
        ;(focuseModeOn ? log : warn)(feedback)
        toast[focuseModeOn ? 'success' : 'warning'](feedback)
        //console.log(2, feedback)
      })
    }
  }

  function unveil(el) {
    el.style.opacity = `revert`
    el.style.filter = `revert`
  }

  function wearVeil(el) {
    if (el.style.opacity === frosty.opacity) {
      return
    }
    el.style.opacity = frosty.opacity
    el.style.filter = frosty.filter(el)
  }

  async function init() {
    log('readySelector', readySelector)
    await ready(readySelector) // header

    const elements = $$(selectors)
    log('elements', elements)

    elements.forEach(el => {
      el.style.transition = frosty.transition
      focuseModeOn && wearVeil(el)

      el.addEventListener('mouseleave', () => {
        if (!focuseModeOn) {
          return
        }
        wearVeil(el)
      })
      el.addEventListener('mouseenter', () => {
        if (!focuseModeOn) {
          return
        }
        unveil(el)
      })
    })

    //     log(
    //       '🎉 移除',
    //       elements.length,
    //       '个 iframe。耗时',
    //       time2Readable(begin, Date.now())
    //     );
  }
})()
