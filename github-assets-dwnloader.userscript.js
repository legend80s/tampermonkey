// ==UserScript==
// @name         GithubAssetsDwnloader
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  try to take over the world!
// @author       You
// @match        https://bgithub.xyz/*/*/releases*
// @match        https://dgithub.xyz/*/*/releases*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bgithub.xyz
// @grant        none
// ==/UserScript==

// 2.0 引入新的可用的 proxy
;(async () => {
  const { $$ } = tampermonkeyUtils

  const fastProxies = [`https://gh-proxy.com/`, `https://gh.webspeedx.eu.org/`]
  fastProxies.every(url => console.assert(url.endsWith('/')))

  const fastProxy = await getFastestSuccessfulRequest(fastProxies)
  // console.log(1, 'fastProxy', { fastProxy })

  function getDownloadLinks() {
    // console.log(3, { fastProxy })
    const links = $$(`a[href*=download],a[href*=archive]`)
    return links.filter(x => !x.href.startsWith(fastProxy))
  }

  function prefixFastProxy(links) {
    // console.log('links', links)
    links.forEach(a => {
      a.target = '_blank'
      a.href = fastProxy + a.href.replace(a.hostname, 'github.com')
      a.textContent += ' 🚀'
    })
  }

  let activeRequests = 0
  const start = Date.now()

  const observer = new PerformanceObserver(list => {
    const entries = list.getEntriesByType('resource')
    activeRequests = entries.filter(
      entry => !entry.responseEnd, // 未完成的请求
    )

    // console.log(entries.map(x => ({ name: x.name, initiatorType: x.initiatorType  })))

    if (activeRequests.length === 0) {
      // console.log("2 所有请求已完成，网络空闲", { fastProxy });
      // console.log(Date.now() - start)
      prefixFastProxy(getDownloadLinks())
    }
  })

  observer.observe({ type: 'resource', buffered: true })

  // Your code here...

  async function getFastestSuccessfulRequest(urls) {
    console.time('getFastestSuccessfulRequest costs')
    const fast = await Promise.any(
      urls.map(url =>
        fetch(url, { method: 'head' }).then(resp => {
          if (resp.status !== 200) {
            throw resp
          }

          return { url, status: resp.status }
        }),
      ),
    )
    console.timeEnd('getFastestSuccessfulRequest costs')
    // console.log(fast)

    return fast.url
  }
})()
