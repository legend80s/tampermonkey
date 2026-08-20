// ==UserScript==
// @name         FakeMe🎭
// @namespace    http://tampermonkey.net/
// @version      1.0
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
    fakeWithChinese: true,
  }

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

    success()

    async function success() {
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
      const src = `https://picsum.photos/${x.width}/${x.height}`
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

    console.log(textNodes.map(n => n.textContent))

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

      // 尝试生成与原文长度相近的 Faker 句子
      let attempts = 0
      // while (newText.length < originalLength && attempts < 50) {
      // 随机生成一段文本，然后截取
      // console.log({ attempts, 'newText.length': newText.length, originalLength })

      /** @example '烘烤过的西兰花填入鹌鹑肉中，撒上桂皮与醇厚的香草，配以烤制的油菜拼盘。' */

      let newText = originalText.replace(
        /[^\p{Emoji}\^#\s\w\.,;:!?()\[\]{}'"，。、！？；：""''（）【】《》……——\+\-\*\/=<>≤≥≠≈±×÷]+/gu,
        match => {
          // console.log('match', match)
          const fakerText = fake()

          return fakerText.slice(0, match.length).replace(/[，。.]$/, '')
        },
      ) //

      if (newText.length < originalLength) {
        newText += fake().slice(0, originalLength - newText.length)
      }

      //         // 清理多余标点，确保以句号或问号结尾
      //         let cleanText = fakerText.replace(/[.!?]+$/, '');
      //         if (cleanText.length > 0) {
      //           cleanText += '。';
      //         }

      //         // 如果生成的文本比目标短，尝试合并多个句子
      //         if (cleanText.length < originalLength) {
      //           const extra = faker.food.description(2);
      //           cleanText += ' ' + extra;
      //         }

      //         // 直接截取到目标长度
      //         newText = cleanText.substring(0, originalLength);

      //         // 如果截取后以空格结尾，替换为句号
      //         if (newText.endsWith(' ')) {
      //           newText = newText.substring(0, newText.length - 1) + '。';
      //         }

      //attempts++;
      //}

      // 如果仍然没有生成合适的文本，使用备用方案
      //       if (newText.length < 5) {
      //         const words = faker.food.description(Math.ceil(originalLength / 5));
      //         newText = words.substring(0, originalLength);
      //         if (newText.length < originalLength) {
      //           newText += '.';
      //         }
      //       }

      //       // 确保长度完全一致（通过填充或截取）
      //       if (newText.length > originalLength) {
      //         newText = newText.substring(0, originalLength);
      //       } else if (newText.length < originalLength) {
      //         const padding = ' '.repeat(originalLength - newText.length);
      //         newText = newText + padding;
      //       }
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
