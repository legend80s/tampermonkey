// ==UserScript==
// @name         FakeMe🎭
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  try to take over the world!
// @author       legend80s
// @match        https://programmercarl.com/algo/*
// @match        https://www.bilibili.com/*
// @match        https://chat.deepseek.com/a/chat/s/*
// @match        https://juejin.cn/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=programmercarl.com
// @grant        GM_info
// @grant        GM_registerMenuCommand
// @run-at       context-menu
// ==/UserScript==

// CHANGELOG
// 2.1 fix mock和原文接连出现多个标点符号。
// 2.0 替换 placeholder、图片同尺寸但是不同src需要不同fake、fix mock 后的文字不连续。尚未解决mock和原文同一处出现多个标点符号。
// 1.0 初始化
// @ts-check
;(async function () {
  'use strict'
  const {
    $$,
    ready,
    time2Readable,
    onUrlChange,
    generateLabel,
    sleep,
    // @ts-expect-error
    // eslint-disable-next-line no-undef
  } = tampermonkeyUtils

  // @ts-expect-error
  const label = generateLabel(GM_info)
  const debugging = true
  const log = (...args) => debugging && console.log(label, ...args)
  const error = (...args) => debugging && console.error(label, ...args)

  const config = {
    fakeWithChinese: true,

    shouldReplaceText: true,
    shouldReplaceImage: true,
    contentReadySelector: 'main.page h2',
    targetContainerSelector: 'body',

    preserveList: [
      // 代码文本不替换
      // 检查当前节点是否在 <pre> 元素内
      parent => ['PRE', 'CODE'].includes(parent.tagName),
      // toast 内不替换
      parent => parent.matches('ol[data-sourdough-toaster]'),
    ],
  }

  const debug = false

  console.time('import fakerjs')
  const begin = Date.now()

  const { fakerZH_CN, faker: englishFaker } = await import('https://esm.sh/@faker-js/faker@v10.6.0')
  console.timeEnd('import fakerjs')

  const faker = config.fakeWithChinese ? fakerZH_CN : englishFaker

  const fake = (...args) => {
    // return faker.hacker.phrase(...args)
    return faker.food.description(...args)
  }

  class Toast {
    constructor() {
      const { resolve, promise } = Promise.withResolvers()
      this.toast = promise
      this.resolve = resolve
      this.init()
    }
    async init() {
      const { boot, toast } = await import('https://esm.sh/sourdough-toast@0.3.0')

      bootSonner(boot)
      this.resolve(toast)
    }
    async show(level, msg, opts) {
      // console.log({ level, msg }, opts)
      const toast = await this.toast
      return toast[level](msg, opts)
    }

    success = (msg, opts) => this.show('success', msg, opts)
    info = (msg, opts) => this.show('info', msg, opts)
    error = (msg, opts) => this.show('error', msg, opts)
    message = (msg, opts) => this.show('message', msg, opts)

    async dismiss(id) {
      const toast = await this.toast

      toast.dismiss(id)
    }
  }

  const toast = new Toast()

  main()

  async function main() {
    init()

    onUrlChange(() => init())
  }

  async function init() {
    const id = await toast.info('正在收集需要替换的节点…', { persist: true, duration: 10e3 })
    try {
      await ready(config.contentReadySelector)

      let textNodes = []
      let imgs = []
      if (config.shouldReplaceText) {
        textNodes = replaceTexts()
      }
      if (config.shouldReplaceImage) {
        imgs = replaceImages()
      }

      const msg = [
        '🎉 替换',
        textNodes.length,
        `个文本节点 & ${imgs.length} 个图片。耗时`,
        time2Readable(begin, Date.now()),
      ].join(' ')

      log(msg)

      success(msg)
    } catch (error) {
      feedbackError(error)
    }

    async function feedbackError(err) {
      console.error(err)
      await toast.dismiss(id)
      toast.error((err.message || 'Unknown Error') + '. open console to debug', { duration: 2e3 })
    }

    async function success(msg) {
      await toast.dismiss(id)

      // await sleep(500)

      await toast.success(msg)
    }
  }

  function bootSonner(boot) {
    document.head.insertAdjacentHTML(
      'beforeEnd',
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
      duration: 1.5e3,
    }
    const ret = boot(opts)
    // console.log(boot, opts)

    const toastElement = /** @type {HTMLDivElement} */ (
      document.querySelector('ol[data-sourdough-toaster]')
    )
    toastElement.style.setProperty('--width', 'max-content')
  }
  function whichTheme() {
    const documentElement = document.documentElement
    const isDark =
      documentElement.dataset.theme === 'dark' ||
      documentElement.style['color-scheme'] === 'dark' ||
      documentElement.className.includes('dark')

    return isDark ? 'dark' : 'light'
  }

  function replaceImages() {
    const pics = document.querySelectorAll('img')
    const svgs = [...document.querySelectorAll('svg')].filter(x => x.width.baseVal.value > 60)
    const imgs = [...pics, ...svgs]

    pics.forEach(x => {
      x.dataset.__src = x.src
      const src = `https://picsum.photos/${x.width}/${x.height}?src=${x.src}`
      x.src = src
    })
    svgs.forEach(x => {
      const width = x.width.baseVal.value
      const height = x.height.baseVal.value

      const src = `https://picsum.photos/${width}/${height}`

      x.insertAdjacentHTML('beforebegin', `<img src="${src}" />`)

      x.style.display = 'none'
    })
    return imgs
  }
  function replaceTexts() {
    // 获取页面主容器
    const mainElement = document.querySelector(config.targetContainerSelector)
    // if (mainElement.dataset.__tm_fake_text_replaced === 'true') { return }

    const textNodes = collectTextNodes(mainElement)

    replaceTextWithFaker(textNodes, fake)
    mainElement.dataset.__tm_fake_text_replaced = 'true'

    // replace placeholder
    $$('[placeholder]').forEach(x => {
      x.placeholder = fake().slice(0, x.placeholder)
    })

    return textNodes
  }

  function collectTextNodes(mainElement) {
    // 获取所有文本节点（包括子元素中的文本）
    const textNodes = []
    const walker = document.createTreeWalker(mainElement, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        // 过滤掉空文本节点和只包含空白字符的节点
        if (node.textContent.trim() === '') return NodeFilter.FILTER_REJECT

        // preserveList 内的不替换
        if (config.preserveList?.length) {
          let parent = node.parentElement
          while (parent && parent !== mainElement) {
            if (config.preserveList.some(match => match(parent))) {
              return NodeFilter.FILTER_REJECT // 跳过 pre 内的所有文本
            }
            parent = parent.parentElement
          }
        }

        return NodeFilter.FILTER_ACCEPT
      },
    })

    let currentNode = walker.nextNode()
    while (currentNode) {
      textNodes.push(currentNode)
      currentNode = walker.nextNode()
    }

    debug && console.log(textNodes.map(n => n.textContent))

    return textNodes
  }

  /**
   * 使用 Fakerjs 替换页面中用户可见的文本内容
   * 仅替换 innerText 中的文本节点，保持每个文本节点的字数不变
   */
  function replaceTextWithFaker(textNodes, fake) {
    // 对每个文本节点进行替换
    textNodes.forEach(node => {
      const originalText = node.textContent
        .trim()
        .replace(/[\uFE0F\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '')
      // 跳过空文本或纯数字/符号（如示例中的数字和标点）
      if (!originalText || /^[\d\s\.,;:!?()\[\]{}'"-]+$/.test(originalText)) {
        return
      }

      const originalLength = originalText.length
      // let newText = '';
      const PUNC = /[，。：、！；‘’“”？]$/

      // 尝试生成与原文长度相近的 Faker 句子
      let attempts = 0
      let spliced = []
      function nextFakeText() {
        const text = fake().replace(PUNC, '')
        return Array.from(text)
      }
      let fakerText = nextFakeText()

      /** @example '烘烤过的西兰花填入鹌鹑肉中，撒上桂皮与醇厚的香草，配以烤制的油菜拼盘。' */

      let newText = originalText.replace(
        /[^\p{Emoji}\^#\s\w\.,;:!?()\[\]{}'"，。、！？；：""''（）【】《》……——\+\-\*\/=<>≤≥≠≈±×÷]+/gu,
        (match, offset) => {
          debug && console.log('match', { match })
          spliced = fakerText.splice(0, match.length)
          let attempt = 0
          while (spliced.length < match.length && attempt < 5) {
            // console.log('length not enough new fake text: fakerText must be empty and temp is remaining', fakerText.length);
            console.assert(fakerText.length === 0, 'fakerText.length should be zero')
            // fakerText = spliced.concat(fakerText, nextFakeText()); // remaining + next
            fakerText = spliced.concat(nextFakeText()) // remaining + next
            spliced = fakerText.splice(0, match.length)
            attempt++
            // start2 += match.length
          }
          // multiple punctuations
          const isEnd = char => char === undefined
          if (
            isPunc(spliced.at(-1)) &&
            (isPunc(originalText[offset + match.length]) ||
              isEnd(originalText[offset + match.length]))
          ) {
            // console.warn('multiple punctuations', spliced, originalText[offset + match.length])
            // spliced.pop()
            // replace with invisible zero width joiner 1 to keep the length 2 not show to user
            spliced[spliced.length - 1] = '\u200D' // &zwj;
          }

          // start += match.length
          return spliced.join('') + (debug ? '|' : '')
        },
      )

      function isPunc(char) {
        return PUNC.test(char)
      }

      // throw new Error('Bug: length not equal')
      const diff = newText.length - originalLength
      const matched = !debug ? diff === 0 : newText.replaceAll('|', '').length === originalLength
      if (!matched) {
        console.warn({ newText, debug, originalLength })
        throw new Error('Bug: length not equal')
      }

      !debug &&
        originalLength - newText.length !== 0 &&
        console.log('final', {
          diff: originalLength - newText.length,
          attempts,
          originalText,
          originalLength,
          newText,
          newTextLen: newText.length,
        })

      // 替换文本节点内容
      node.textContent = newText
    })
    return textNodes
  }
})()
