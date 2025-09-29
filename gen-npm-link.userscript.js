// ==UserScript==
// @name         NpmOpener
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Match and turn npm package into links.
// @author       孟陬
// @match        https://github.com/*
// @match        https://bgithub.xyz/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        GM_info
// ==/UserScript==

// CHANGELOG
// 2.2 增加防抖，避免频繁调用
// 2.1 支持动态异步生成内容内替换
// 2.0 支持更多包管理器
// 1.0 初始化
// @ts-check
;(async () => {
  // Your code here...
  const {
    toLink,
    time2Readable,
    generateLabel,
    findElementsByTextAsync,
    debounce,
    // @ts-expect-error
    // eslint-disable-next-line no-undef
  } = tampermonkeyUtils

  // @ts-expect-error
  const label = generateLabel(GM_info)
  const debugging = true
  const now = () => new Date().toLocaleString()
  const log = (...args) => debugging && console.log(now(), label, ...args)

  const pkgManagerInstallCommands = [
    ["npm", "install", "i"],
    ["yarn", "add"],
    ["pnpm", "add", "i", "install"],
    ["bun", "add"],
  ]

  main()

  function main() {
    init()
    const debouncedInit = debounce(init, 200)

    onNetworkIdle(() => {
      // log('re-init on network idle');
      debouncedInit()
    })
  }
  async function init() {
    const begin = Date.now()
    for (const [pkgManagerName, ...installAlias] of pkgManagerInstallCommands) {
      toNpmLink(pkgManagerName, installAlias)
    }
    log("🎉 将 npm 包转成链接。耗时", time2Readable(begin, Date.now()))
  }

  async function toNpmLink(pkgManagerName = "", installAlias = []) {
    const reg = new RegExp(String.raw`${pkgManagerName}\s+(${installAlias.join("|")})\s+\S+`)
    // log(reg);
    const installElements = await findElementsByTextAsync(reg, "pre")
    log("find npm packages:", installElements.length)

    installElements.forEach(x => {
      // [^<] 说明还未被链接包裹 则需要处理
      const pattern = new RegExp(
        String.raw`${pkgManagerName}\s+(?:${installAlias.join("|")})\s+([^<]+)`,
        "g",
      )
      log("pattern:", { pattern, match: x.innerHTML.match(pattern) })
      // x.innerHTML = x.innerHTML.replaceAll(/npm\s+install\s+(.+)/g, (m, p1) => {
      x.innerHTML = x.innerHTML.replaceAll(pattern, (m, p1) => {
        const names = p1.split(/\s+/).filter(t => t && !t.startsWith("-"))
        // console.assert(names.length >= 1, '至少得有一个包名', m, p1)
        // names 可以为空当已经处理过之后
        log("transform", pkgManagerName, installAlias, { m, p1, names })

        for (const name of names) {
          const url = toLink(`https://www.npmjs.com/package/${name}`, name, {
            "data-npm-opener-processed": "true",
          })
          m = m.replace(name, url)
        }
        return m
      })
    })
  }

  function onNetworkIdle(cb) {
    let activeRequests = 0
    const start = Date.now()

    const observer = new PerformanceObserver(list => {
      const entries = list.getEntriesByType("resource")
      activeRequests = entries.filter(
        entry => !entry.responseEnd, // 未完成的请求
      )

      // console.log(entries.map(x => ({ name: x.name, initiatorType: x.initiatorType  })))

      if (activeRequests.length === 0) {
        // console.log("所有请求已完成，网络空闲");
        // console.log(Date.now() - start)
        cb(Date.now() - start)
      }
    })

    observer.observe({ type: "resource", buffered: true })
  }
})()
