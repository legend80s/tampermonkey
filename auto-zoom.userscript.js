// ==UserScript==
// @name         AutoZoom
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  让页面字体大小随着屏幕变大而变大。
// @author       孟陬
// @match        https://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mozilla.org
// @grant        GM_info
// @run-at       document-body
// ==/UserScript==

// CHANGELOG
// 1.0 初始化
// @ts-check
;(async () => {
  // Your code here...
  const {
    $$,
    ready,
    time2Readable,
    onUrlChange,
    generateLabel,
    // @ts-expect-error
    // eslint-disable-next-line no-undef
  } = tampermonkeyUtils

  // @ts-expect-error
  const label = generateLabel(GM_info)
  const debugging = true
  // @ts-expect-error
  const log = (...args) => debugging && console.log(label, ...args)
  // @ts-expect-error
  const error = (...args) => debugging && console.error(label, ...args)

  const config = [
    ['lodash', { fontSize: '0.6vw' }],
    ['nodejs.org', { fontSize: '0.9vw' }],
  ]

  main()

  function main() {
    init()

    document.addEventListener('DOMContentLoaded', event => {
      init()
    })

    onUrlChange(() => init())
  }

  async function init() {
    // @ts-expect-error
    log('init', document.documentElement.__fs_injected, Date.now())
    // @ts-expect-error
    if (document.documentElement.__fs_injected) {
      return
    }
    // @ts-expect-error
    document.documentElement.__fs_injected = true

    // 用户缩放过则不操作
    const hasZoomedIn = window.devicePixelRatio !== 1
    if (hasZoomedIn) {
      return
    }

    const children = document.body.children
    const isCdnSourceFile = children.length === 1 && children[0].tagName === 'PRE'

    if (isCdnSourceFile) {
      return
    }

    const fs = resolveBestFontSize(location.hostname)

    document.documentElement.style.fontSize = fs
  }

  // @ts-expect-error
  function resolveBestFontSize(hostname) {
    const fallback = `clamp(16px, 100vw / 2560 * 28.6, 36px)`

    // @ts-expect-error
    const byHost = config.find(item => hostname.includes(item[0]))?.[1].fontSize

    return byHost || fallback
  }
})()
