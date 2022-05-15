// ==UserScript==
// @name         新窗口打开 - google、github/trending
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  try to take over the world!
// @author       You
// @match        https://www.google.com/search?q=*
// @match        https://www.google.com.hk/search?q=*
// @match        https://github.com/trending
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @grant        none
// ==/UserScript==

//CHANGELOG
// 3.0 支持自定义样式、指定在某个父容器内修改
// 2.0 github/trending
// 1.0 google

(function() {
  const { ready, $$, time2Readable, createLoggers, createStyle } = tampermonkeyUtils;
  const { log } = createLoggers(GM_info);

  const config = new Map([
    // `fontSize: 0.7rem; font-style: normal; color: brown;`
    ['style', createStyle({
      fontSize: '0.7rem',
      fontStyle: 'normal',
      color: 'brown',
    })],

    ['containerSelector', new Map([
      ['github.com/trending', '.Box > div:not([class]) h1.h3'],
      [/google.com(\.\w+)*\/search/, 'div[data-header-feature="0"]'],
    ])]
  ]);

  main()

  function main() {
    init()
  }

  async function init() {
    const begin = Date.now()
    const s = generateLinkSelectorOpenInSelf();

    await ready(s)

    const links = $$(s);

    links.forEach(a => {
      a.setAttribute('target', '_blank')

      a.insertAdjacentHTML('beforeend', `<em style="${config.get('style')}"> - 新窗口打开</em>`);
    })

    log(
      '🎉 已将',
      links.length,

      `个链接修改成外跳。耗时 ${time2Readable(begin, Date.now())}`,
    )
  }

  function resolveContainerSelector() {
    for (const [key, value] of config.get('containerSelector')) {
      // log('key', key, value)
      const siteId = genSiteId();

      if (siteId === key) { return value }

      if (key instanceof RegExp && key.test(siteId)) { return value }
    }

    return ''
  }

  function generateLinkSelectorOpenInSelf() {
    const containerSelector = resolveContainerSelector()

    // log('containerSelector', containerSelector)

    return containerSelector + ' a:not([target="_blank"])'
  }

  /** @example `https://github.com/trending` => `github.com/trending` */
  function genSiteId() {
    return location.host + location.pathname
  }

  genSiteId()
})();
