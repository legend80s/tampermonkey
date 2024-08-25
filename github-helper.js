// ==UserScript==
// @name         GitHubHelper
// @namespace    http://tampermonkey.net/
// @version      5.4.2
// @description  Add npm and vscode extension marketplace version badge and link for github repo automatically.
// @author       You
// @match        https://github.com/*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addElement
// @grant        GM_setClipboard
// ==/UserScript==


// CHANGELOG
// 5.4.2 fix initial commit btn not inline by insert it after code btn
// 5.4 add main js after package.json
// 5.3.0 Distinct issue autor
// 5.2.0 add runkit
// 5.1.0 提示同名 npm 包
// 5.0.0 compile TS - copy to TS
// 4.4.4 BadgePortal

(async function() {
  'use strict';

  const {
    $$,
    $,
    insertScript,
    sleep,
    ready,
    toLink,
    isString,
    getElementAsync,
    getElementByText,
    findElementsByText,
    getElementByTextAsync,
    onUrlChange,
    getFirstCommitUrl,
  // eslint-disable-next-line no-undef
  } = tampermonkeyUtils;

  const { name: scriptName, version: scriptVersion } = GM_info.script;

  const appInfo = `${scriptName}@${scriptVersion}`;
  const label = `${appInfo}>`;
  const log = console.log.bind(console, label);
  const error = console.error.bind(console, label);

  async function findClosestHeader(container) {
    await ready(container, { timeout: 3000 })

    return findClosestHeaderCore(container);
  }

  function findClosestHeaderCore(container) {
    return Array.from($(container).children).find(c => c.nodeName.startsWith('H'))
  }

  const container = '.markdown-body'
  // const host = '.markdown-body h1';
  const host = '#readme > .flex-justify-between';
  const position = 'beforeend';

  console.time(label + ' costs')
  await main()
  console.timeEnd(label + ' costs')

  async function main() {
    onUrlChange(() => init())

    return init();
  }

  async function init() {
    if (isPage(/\.ts$/)) {
      return await compile()
    }

    if (isPage('issues')) {
      return await helpIssue()
    }

    return Promise.all([
//       addFirstCommitBtn().then(async () => {
//         await sleep(500);
//         addFirstCommitBtn()
//       }),
      addFirstCommitBtn().then(async () => {
        await sleep(500);
        addFirstCommitBtn()
      }),
      badge(),
      showMainEntry(),
    ])
  }

  async function addFirstCommitBtn() {
    // console.log(`$('#initial-commit-github-helper')`, $('#initial-commit-github-helper'))
    if ($('#initial-commit-github-helper')) { return }

    const gotoFileBtn = await getElementByTextAsync(/Add file/, 'button');

    if (!gotoFileBtn) { return }

    const btn = document.createElement('button');
    btn.id = 'initial-commit-github-helper'

    gotoFileBtn.className.split(' ').forEach((cls) => btn.classList.add(cls));
    const txt = 'Initial Commit 🐒'
    btn.textContent = txt;

    btn.onclick = async () => {
      btn.classList.add('disabled');
      btn.textContent += ' Searching... 3s'

      const t = setInterval(() => { btn.textContent = btn.textContent.replace(/\d+/, (p) => Number(p) - 1) }, 1000)

      try {
        const url = await getFirstCommitUrl();
        log('url', url)
        btn.textContent = txt;

        location.href = url;
      } catch (err) {
        error(err);
        btn.textContent = [btn.textContent, err.message.slice(0, 100)].join(' ');

        error('[getFirstCommitUrl]', err);

        location.href = `https://github.com/egoist/dum/network`;
      } finally {
        clearInterval(t);
        btn.classList.remove('disabled');
      }

    }

    getElementByText(/Code/, 'button').insertAdjacentElement('afterend', btn)

    // gotoFileBtn.insertAdjacentElement('beforebegin', btn)

    addFirstCommitBtn.added = true;
  }

  function isPage(pattern) {
    if (isString(pattern)) {
      return location.pathname.includes(pattern);
    }

    return pattern.test(location.pathname)
  }

  async function showMainEntry() {
    // console.time('ms')
    var pkgNode = await getElementAsync('[title="package.json"]');
    // log('pkgNode', pkgNode)
    // console.timeEnd('ms')
    if (!pkgNode) { return }

    const { json } = await readPkgJSON();
    // log('main', json.main);
    setTimeout(() => {
      pkgNode.insertAdjacentHTML('beforeend', `<span style="opacity: 0.5;"> ${json.main || 'index.js'}</span>`)
    }, 400)
  }

  async function helpIssue() {
    // and index
    const nodes = $$('.timeline-comment-header .author.Link--primary');

    var names = nodes.map(el => el.textContent)
    const freq = {};

    names.map((n, idx) => {
      if (!freq[n]) { freq[n] = 1 }
      else { freq[n] += 1 }

      const index = freq[n];

      setTimeout(() => {
        nodes[idx].insertAdjacentHTML('afterend', `<span style="color: purple;">${' #' + index}</span>`)
      })
    });

    // highlight
    [$('.timeline-comment-header'), ...findElementsByText(/Author/, '.timeline-comment-header')].forEach((el) => {
      el.style.backgroundColor = 'yellowgreen';
      // el.querySelector('.author').insertAdjacentHTML('afterend', `<span style="color: purple;">${' #' + (idx + 1)}</span>`)
    });

    [/Owner/, /Contributor/, /Member/].forEach(pattern => {
      findElementsByText(pattern, '.timeline-comment-header').forEach(el => {
        el.querySelector('.author').insertAdjacentHTML('afterend', `<span style="color: purple;">${' => ' + pattern}</span>`)
      })
    });
  }

  async function compile() {
    const id = 'cp-2-ts';

    // console.time('insertCopy2TSBtn')
    await insertCopy2TSBtn(id);
    // console.timeEnd('insertCopy2TSBtn')

    $('#'+id).addEventListener('click', async () => {
      // console.time('installTSCompiler')
      const ts = await installTSCompiler(id);
      // console.timeEnd('installTSCompiler')

      const sourceCode = $('.Box-body.type-typescript').innerText;
      const { outputText: js } = ts.transpileModule(sourceCode, { compilerOptions: { target: 'esnext' } });

      // log('sourceCode', sourceCode)
      // log('js', js)

      GM_setClipboard(js);
    })
  }

  installTSCompiler.tsPromise = null;

  async function installTSCompiler() {
    if (installTSCompiler.tsPromise) {
      console.log('hit')
      return installTSCompiler.tsPromise;
    }

    console.log('not hit')

    return installTSCompiler.tsPromise = (async () => {
      insertScript(`https://cdn.jsdelivr.net/npm/typescript@4.6.3/lib/typescriptServices.js`, GM_addElement);

      await ready(() => typeof ts !== 'undefined', { timeout: 10 * 1000 });

      log(`ts@${ts.version} installed in your console.`)

      return ts;
    })();
  }

  async function insertCopy2TSBtn(id) {
    const html = `
    <div id="${id}" class="d-inline-block btn-octicon cursor-pointer" style="height: 26px">
    <span class="tooltipped tooltipped-nw" aria-label="Copy TS as JS">
      <span>
        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" class="octicon octicon-copy">
          <path fill-rule="evenodd"
            d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z">
          </path>
          <path fill-rule="evenodd"
            d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z">
          </path>
        </svg>
      </span>
      JS
    </span>
  </div>
    `

    const element = $('.Box-header remote-clipboard-copy.btn-octicon');

    element.insertAdjacentHTML('beforebegin', html);

    return await ready('#'+id);
  }

  // https://github.com/sveltejs/kit/blob/master/packages/kit/package.json =>
  // https://raw.githubusercontent.com/sveltejs/kit/master/packages/kit/package.json
  //
  // https://github.com/gcanti/newtype-ts/blob/master/package.json =>
  // https://raw.githubusercontent.com/gcanti/newtype-ts/master/package.json
  function toRawPath(url) {
    return url.replace('github.com', 'raw.githubusercontent.com')
      .replace(/\/blob\/([^/]+?)\//, '/$1/')
  }

  async function findPackageJSONURL() {
    await ready('.Box-row');
    const node = queryChild('.Box-row a', a => a.textContent === 'package.json');
    // log('queryChild node', node)

    return node?.href || '';
  }

  async function findPackageJSONRawPath() {
    return toRawPath(await findPackageJSONURL());
  }

  function getRepoId() {
    return location.pathname.split('/').slice(1, 3).join('/');
  }

  async function readPkgJSON() {
    if (readPkgJSON.promise) { return readPkgJSON.promise }

    const p = findPackageJSONRawPath().then(path => {
      return fetch(path).then(resp => resp.json()).then(json => ({ path, json }));
    });

    readPkgJSON.promise = p

    return p;
  }

  async function badge() {
    // Refused to execute inline event handler because it violates the following Content Security Policy directive: "script-src 'unsafe-eval' github.githubassets.com"
    // document.head.insertAdjacentHTML('beforeend', `<meta http-equiv="Content-Security-Policy" content="script-src 'unsafe-eval' *">`)

    if (window.location.pathname.endsWith('package.json')) {
      return injectIntoPackageJSON();
    }

    // Your code here...
    const [err1, { path, json: packageJSON }] = await box(readPkgJSON());
    // const [err1, packageJSON = {}] = await box(fetch(path).then(resp => resp.json()));

    log('packageJSON', packageJSON);

    const [hostNode, over1Children] = await getEnsuredHostNode();
    const style = over1Children ? `margin-right: 1rem;` : '';

    // log('hostNode', hostNode)

    if (!hostNode) { return }

    const { name: pname, publisher, private: prvt } = packageJSON;
    // log('prvt', prvt)

    if (prvt) {
      return await insertUnpublishedBadge(hostNode, { name: pname, style, text: 'private' });
    }

    const registryResp = await requestJson(`https://registry.npmjs.org/${pname}`, { debugging: false });

    const { name: npmName } = registryResp;

    if (err1 || !pname || (!publisher && !npmName)) {
      let text;

      if (err1) {
        text = 'no package.json';
        error(`fetch package.json failed: path = "${path}"`, err1);
      }
      else if (!pname) error(`no "name" field in package.json`, { path, packageJSON });
      else {
        error(`no package named "${pname}" published to npm`, registryResp);
      }

      // const hostNode = await findClosestHeader(container)
      // if (!hostNode) { error(`no h element find in "${container}"`); return; }

      await insertUnpublishedBadge(hostNode, { name: pname, style, text });

      return;
    }

    const { repository = {} } = registryResp

    // log('registry.repository', repository || registryResp)

    const { url = '' } = repository;

    const repoUrl = gitScheme2Url(url);

    const registryRepoId = repoUrl.split('/').slice(-2).join('/')

    if (registryRepoId && registryRepoId !== getRepoId()) {
      error(`名字已被注册`, repoUrl);
      const text = '名字已被注册'

      return await insertUnpublishedBadge(hostNode, { name: pname, style, text });
    }

    const { name, description, version } = packageJSON;
    // add runkit
    insertHtml(hostNode, toLink(`https://npm.runkit.com/${name}`, 'Runkit', { cls: 'btn ml-2 d-none d-md-block' }))

    const [existing, badgeLinkHTML] = await composeBadgeLinkHTML(name, { publisher, version, description, style });

    if (existing) {
      log(`version badge already exists`);
      return;
    }

    if (!badgeLinkHTML) {
      error('[composeBadgeLinkHTML] return empty badgeLinkHTML', badgeLinkHTML)
      return;
    }

    // const hostNode = await findClosestHeader(container)
    // if (!hostNode) { error(`no h element find in "${container}"`); return; }

    if (!hostNode) { return; }

    // hostNode.insertAdjacentHTML('afterend', );

    insertHtml(hostNode, badgeLinkHTML);
  }

  function hasMoreThanOneChildren(hostNode) {
    return hostNode?.childElementCount > 1
  }

  async function getEnsuredHostNode() {
    const [_, hostNode] = await ready(host, { timeout: 3000 });

    if (hasMoreThanOneChildren(hostNode)) {
      return [hostNode.lastElementChild, true]
    }

    return [hostNode, false];
  }

  async function composeBadgeLinkHTML(name, { publisher = '', version = '', description = '', style = '' } = {}) {
    if (isVSCodeExtensionRepo({ name, publisher })) {
      return composeVSCodeMarketplaceLinkHTML(name, publisher, { version, description, style })
    }

    const npm = await composeNpmLinkHTML(name, { version, description, style });

    return npm;
  }

  async function composeVSCodeMarketplaceLinkHTML(name, publisher, { version = '', description = '', style = '' } = {}) {
    if (isVersionBadgeExisting(name)) { return [true, ''] }

    const itemName = publisher + '.' + name
    const link = `https://marketplace.visualstudio.com/items?itemName=${itemName}`;

    // https://shields.io/ too large
    // const logoUrl = 'https://marketplace.visualstudio.com/favicon.ico'
    // const logoSlug = await url2base64(logoUrl);

    // const logo = 'windows';
    // const imgURL = `https://img.shields.io/badge/${publisher}-${name.replace(/-/g, '.')}-blue?logo=${logo}`;

    const imgURL = `https://img.shields.io/visual-studio-marketplace/v/${itemName}.svg?color=blue&label=VS%20Code%20Marketplace&logo=visual-studio-code`

    return [false, await composeBadgeLinkHTMLCore(link, imgURL, { name, version, description, style })];
  }

  async function url2base64(imgSrc) {
    const [err, dataURL] = await box(fetchDataURL(imgSrc));

    if (err) {
      error(`[url2base64] fetchObjectURL failed for "${imgSrc}"`, err);

      return '';
    }

    return dataURL;
  }

  function isVersionBadgeExisting(name) {
    if ($(`#${genId({ name })}`)) {
      // data-canonical-src="https://img.shields.io/npm/v/verb-corpus.svg"

      return true;
    }

    return false
  }

  async function composeNpmLinkHTML(name, { version = '', description = '', style = '' } = {}) {
    if (isVersionBadgeExisting(name)) { return [true, ''] }

    const link = `https://www.npmjs.com/package/${name}`;
    const imgURL = `https://img.shields.io/npm/v/${name}?logo=npm`;

    return [false, await composeBadgeLinkHTMLCore(link, imgURL, { name, version, description, style })];
  }

  function isVSCodeExtensionRepo({ name, publisher }) {
    return !!(name && publisher)
  }

  function genId({ name }) { return `github-helper-${name}` }

  async function composeBadgeLinkHTMLCore(href, badgeSrc, { name, version = '', description = '', style = '' } = {}) {
    const alt = name + (version ? `@${version}` : '') + (description ? `: ${description}` : '');

    const [err, badgeHTML] = await box(generateSafeImageHTML(badgeSrc, alt));

    if (err) {
      // error('[composeBadgeLinkHTMLCore] failed', err)
      return '';
    }

    const badgeLinkHTML = `<a href="${href}" id="${genId({ name })}" rel="nofollow" target="_blank" alt="${alt}" style="${style}">
      ${badgeHTML}
    </a>`;

    return badgeLinkHTML;
  }

  function getPairNodesByKeyName(name) {
    const keyNode = $$('.js-blob-code-container .pl-ent').find(x => x.textContent === `"${name}"`);
    const valueNode = keyNode?.nextElementSibling;

    return { keyNode, valueNode };
  }

  function getValueInPackageJSONByKey(key) {
    const { valueNode } = getPairNodesByKeyName(key);

    return valueNode?.textContent.replace(/^"/, '').replace(/"$/, '');
  }

  async function injectIntoPackageJSON() {
    const name = getValueInPackageJSONByKey('name');
    const publisher = getValueInPackageJSONByKey('publisher');

    // const { valueNode: versionNode } = getPairNodesByKeyName('version');
    // const a = document.createElement('a');
    // a.setAttribute('href', `https://www.npmjs.com/package/$ versionNode.textContent}`);
    // a.textContent = versionNode.textContent;

    const [_, badgeLinkHTML] = await composeBadgeLinkHTML(name, { publisher, style: 'left: 10.4em; display: inline-block; position: absolute; height: 100%; top: -20px;' });

    const badgeLinkElement = domStringToElement(badgeLinkHTML);
    const { keyNode: versionKeyNode } = getPairNodesByKeyName('version');

    versionKeyNode.parentElement.appendChild(badgeLinkElement)
    // versionNode.replaceWith(tpl.content)
  }

  function domStringToElement(str) {
    const tpl = document.createElement('template');

    tpl.innerHTML = str;

    return tpl.content;
  }

  function queryChild(selector, predicate) {
    return $$(selector).find(e => predicate(e))
  }

  async function generateSafeImageHTML(imgURL, alt) {
    const dataURL = await url2base64(imgURL)

    if (!dataURL) {
      return '';
    }

    return `<img data-canonical-src="${imgURL}" src=${dataURL} alt="${alt}">`;
  }

  async function insertUnpublishedBadge(hostNode, { name, style, text = 'unpublished' }) {
    const unpublished = `https://img.shields.io/badge/npm-${text}-yellow?logo=npm`;
    const img = await generateSafeImageHTML(unpublished, 'not published yet');

    // const name = $('.markdown-body h1').textContent.trim()

    let html = img;

    if (name) {
      const link = `https://www.npmjs.com/package/${name}`;
      const styleWrapper = style ? `style="${style}"` : ''

      html = `<a href="${link}" rel="nofollow" target="_blank" alt="${name}" ${styleWrapper}>
        ${img}
      </a>`;
    }

    insertHtml(hostNode, html);
  }

  function insertHtml(hostNode, html) {
    hostNode.insertAdjacentHTML(position, html);
  }

  async function box(promise) {
    try {
      return [null, await promise]
    } catch (error) {
      return [error]
    }
  }

  async function fetchDataURL(url) {
    const reader = new FileReader()

    const blob = await requestBlob(url);

    reader.readAsDataURL(blob)

    return new Promise((resolve, reject) => {
      reader.addEventListener('load', () => {
        resolve(reader.result)
      });

      reader.addEventListener('error', event => {
        reject(event)
      });
    })
  }

  function requestJson(url, { debugging = false } = {}) {
    debugging && log('url', url)
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        onload: (result) => {
          debugging && log('result', result);
          debugging && log('responseText', result.responseText);

          try {
            resolve(JSON.parse(result.responseText))
          } catch(err) {
            debugging && error('JSON.parse', error)

            reject(err)
          }
        },
        onerror: (error) => {
          debugging && error('onerror', error)

          reject(error)
        }
      });
    });
  }

  // git+https://github.com/OptimalBits/dolphin.git => https://github.com/OptimalBits/dolphin
  function gitScheme2Url(scheme) {
    return remove(
      remove(scheme, /^git\+/),
      /\.git$/
    )
  }

  function remove(text, regexp) {
    return text.replace(regexp, '')
  }

  function requestBlob(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        responseType: 'blob',
        onload: (result) => {
          resolve(result.response)
        },
        onerror: (error) => {
          reject(error)
        }
      });
    });
  }
})();
