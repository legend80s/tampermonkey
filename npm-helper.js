// ==UserScript==
// @name         NpmHelper
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  try to take over the world!
// @author       You
// @match        https://www.npmjs.com/package/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=npmjs.com
// @grant        GM_info
// @grant        GM_addElement
// ==/UserScript==

// 1.0 add link for UNPKG and jsDelivr
// 0.1 NpmPackageAutoInstaller

(function() {
  'use strict';
  const { insertScript, createLogger, ready, $, $$ } = tampermonkeyUtils

  const error = createLogger('error', GM_info)
  const log = createLogger('log', GM_info)
  const warn = createLogger('warn', GM_info)

  const hostSelector = '#main h2'

  main()

  async function main() {
    // '/package/console-next'
    const matches = location.pathname.match(/^\/package\/([^/]+)$/)

    if (!matches) { return error('cannot found package name in location.pathname', location.pathname) }

    const name = matches[1];

    await ready(hostSelector)

    const host = $(hostSelector)

    if (!host) { return error(`no element (${hostSelector}) found`); }

    insertCdnLink(host, name);

    installNpmByUnpkg(host, name)
  }

  function insertCdnLink(host, name) {
    const href = `https://cdn.jsdelivr.net/npm/${name}/`

   host.insertAdjacentHTML('beforeend', `<a class="f4 fw6 fl db pv1 ma1 red-500 link hover-black animate" href="${href}" style="color:#cb3837;margin: 0 1rem;" target="_blank">jsDelivr</a>`)
  }

  async function installNpmByUnpkg(host, name) {
    const id = `npm-helper-mz`
    host.insertAdjacentHTML('beforeend', `<button class="f4" id="${id}" style="/* border: 1px solid #cccccc; */">安装 ⚙</button>`)

    await ready(`#${id}`);
    const version = $$('h3').filter(h => h.textContent === 'Version')[0].nextSibling.textContent.trim();
    let installed = false;

    $(`#${id}`).addEventListener('click', () => {
      if (installed) { return warn(`${name}@${version} has already installed.`) }

      insertScript('https://unpkg.com/'+name+`@${version}`, GM_addElement);

      log(`${name}@${version} installed in your console.`)

      installed = true;
    })
  }
})();
