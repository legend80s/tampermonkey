// ==UserScript==
// @name         GithubAssetsDwnloader
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  try to take over the world!
// @author       You
// @match        https://bgithub.xyz/*/*/releases*
// @match        https://dgithub.xyz/*/*/releases*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bgithub.xyz
// @grant        none
// ==/UserScript==

(function() {
  'use strict';
  const { $$ } = tampermonkeyUtils;

  const fastProxy = `https://gh.webspeedx.eu.org/`
  const github = `https://gh.webspeedx.eu.org/`

  function getDownloadLinks() {
    const links = $$(`a[href*=download],a[href*=archive]`)
    return links.filter(x => !x.href.startsWith(fastProxy))
  }

  function prefixFastProxy(links) {
    console.log('links', links)
    links.forEach(a => {
      a.target = '_blank'
      a.href = `https://gh.webspeedx.eu.org/` + a.href.replace(a.hostname, 'github.com')
    })
  }

  let activeRequests = 0;
  const start = Date.now()

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntriesByType("resource");
    activeRequests = entries.filter(
      (entry) => !entry.responseEnd // 未完成的请求
    );

    // console.log(entries.map(x => ({ name: x.name, initiatorType: x.initiatorType  })))

    if (activeRequests.length === 0) {
      console.log("所有请求已完成，网络空闲");
      console.log(Date.now() - start)
      prefixFastProxy(getDownloadLinks())
    }
  });

  observer.observe({ type: "resource", buffered: true });

  // Your code here...
})();