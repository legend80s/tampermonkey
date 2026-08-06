// ==UserScript==
// @name         KimiHelper
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  try to take over the world!
// @author       legend80s
// @match        https://www.kimi.com/chat/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=kimi.com
// @grant        GM_info
// ==/UserScript==

// CHANGELOG
// 1.0 初始化
// @ts-check
;(async () => {
  // Your code here...
  const {
    $$,
    ready,
    getElementsByText,
    onUrlChange,
    generateLabel,
    onChildChanged,
    // @ts-expect-error
    // eslint-disable-next-line no-undef
  } = tampermonkeyUtils

  // @ts-expect-error
  const label = generateLabel(GM_info)
  const debugging = true
  const log = (...args) => debugging && console.log(label, ...args)
  const error = (...args) => debugging && console.error(label, ...args)

  main()

  function main() {
    init()

    onChildChanged(document.body, {
      predicate: (...args) => true,
      cb: (...arg) => {
        console.warn('[kimi-helper] init triggered on onChildChanged', Date.now())
        return init()
      },
      config: undefined,
      debounceTime: 200,
    })
  }

  async function init() {
    await ready('div.user-content')

    const divsHasTextStartsWithHttp = getElementsByText(
      /^https?:\/\//,
      'div.user-content:not(.__transformed)',
    )
    console.log('  [kimi-helper] divsHasTextStartsWithHttp', divsHasTextStartsWithHttp.length)

    divsHasTextStartsWithHttp.forEach(div => {
      div.classList.add('__transformed')
      div.innerHTML = div.innerHTML.replace(
        /(https?:\/\/\S+)/,
        '<a href="$1" target="_blank">$1</a>',
      )
    })
  }
})()
