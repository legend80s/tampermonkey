// ==UserScript==
// @name         Npm Helper
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  try to take over the world!
// @author       legend80s
// @match        https://www.npmjs.com/package/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=npmjs.com
// @grant        none
// ==/UserScript==

// CHANGELOG
// 2.0 insert cdn links
// 1.0 初始化 add copy code btn
(async function () {
  'use strict';

  // Your code here...
  const {
    $,
    ready,
    createLoggers,
    time2Readable,
    onUrlChange,
    toast,
    sleep,
    // eslint-disable-next-line no-undef
  } = tampermonkeyUtils;
  const { insertScript, createLogger, $$ } = tampermonkeyUtils;

  const { log, error, warn } = createLoggers(GM_info);

  main();

  function main() {
    init();
    insertLinks();

    // onUrlChange(() => init())
  }

  async function init() {
    const begin = Date.now();
    // Code here
    $('#main').addEventListener('click', async (event) => {
      await sleep(10);
      console.log('e.target', event.target);

      const preElement = $('#tabpanel-explore pre');
      let el;
      if (preElement?.contains(event.target)) {
        el = preElement;
      }
      console.log('el', el);
      if (!el) {
        return;
      }

      const lineNumbers = el.querySelectorAll('.linenumber');
      let display;
      lineNumbers.forEach((line) => {
        display ??= line.style.display;
        line.style.display = 'none';
      });
      const code = el.innerText;
      lineNumbers.forEach((line) => (line.style.display = display));

      await navigator.clipboard.writeText(code);
      toast('代码已复制 ✅');
    });

    log('🎉 耗时', time2Readable(begin, Date.now()));
  }


  async function insertLinks() {
    // '/package/console-next'
    const matches = location.pathname.match(/^\/package\/([^/]+)$/);

    if (!matches) {
      return error(
        'cannot found package name in location.pathname',
        location.pathname
      );
    }

    const name = matches[1];
    const hostSelector = '#main h2';

    await ready(hostSelector);

    const host = $(hostSelector);

    if (!host) {
      return error(`no element (${hostSelector}) found`);
    }

    insertCdnLink(host, name);

    installNpmByUnpkg(host, name);
  }

  function insertCdnLink(host, name) {
    const href = `https://cdn.jsdelivr.net/npm/${name}/`;

    host.insertAdjacentHTML(
      'beforeend',
      `<a class="f4 fw6 fl db pv1 ma1 red-500 link hover-black animate" href="${href}" style="color:#cb3837;margin: 0 1rem;" target="_blank">jsDelivr</a>`
    );
  }

  async function installNpmByUnpkg(host, name) {
    const id = `npm-helper-mz`;
    host.insertAdjacentHTML(
      'beforeend',
      `<button class="f4" id="${id}" style="/* border: 1px solid #cccccc; */">安装 ⚙</button>`
    );

    await ready(`#${id}`);
    const version = $$('h3')
      .filter((h) => h.textContent === 'Version')[0]
      .nextSibling.textContent.trim();
    let installed = false;

    $(`#${id}`).addEventListener('click', () => {
      if (installed) {
        return warn(`${name}@${version} has already installed.`);
      }

      insertScript('https://unpkg.com/' + name + `@${version}`, GM_addElement);

      log(`${name}@${version} installed in your console.`);

      installed = true;
    });
  }
})();
