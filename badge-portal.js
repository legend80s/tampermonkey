// ==UserScript==
// @name         GitHubHelper
// @namespace    http://tampermonkey.net/
// @version      5.0.0
// @description  Add npm and vscode extension marketplace version badge and link for github repo automatically.
// @author       You
// @match        https://github.com/*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        GM_info
// @grant        GM_xmlhttpRequest
// @grant        GM_addElement
// @grant        GM_setClipboard
// ==/UserScript==

// 4.4.4 BadgePortal
// 5.0.0 compile TS - copy to TS

(async function() {
  'use strict';

  const { $$, $, insertScript, ready } = tampermonkeyUtils;

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
    if (isSourceCodePage('ts')) {
      return await compile()
    }

    await badge();
  }

  function isSourceCodePage(type) {
    return location.pathname.endsWith('.' + type);
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

    $('.Box-header remote-clipboard-copy.btn-octicon').insertAdjacentHTML('beforebegin', html);

    return await ready('#'+id);
  }

  // https://github.com/sveltejs/kit/blob/master/packages/kit/package.json =>
  // https://raw.githubusercontent.com/sveltejs/kit/master/packages/kit/package.json
  //
  // https://github.com/gcanti/newtype-ts/blob/master/package.json =>
  // https://raw.githubusercontent.com/gcanti/newtype-ts/master/package.json
  function toRawPath(url) {
    return url.replace('github.com', 'raw.githubusercontent.com')
      .replace(/\/blob\/(master|main)\//, '/$1/')
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

  async function badge() {
    // Refused to execute inline event handler because it violates the following Content Security Policy directive: "script-src 'unsafe-eval' github.githubassets.com"
    // document.head.insertAdjacentHTML('beforeend', `<meta http-equiv="Content-Security-Policy" content="script-src 'unsafe-eval' *">`)

    if (window.location.pathname.endsWith('package.json')) {
      return injectIntoPackageJSON();
    }

    // Your code here...
    const path = await findPackageJSONRawPath();
    const [err1, packageJSON] = await box(fetch(path).then(resp => resp.json()));

    const [hostNode, over1Children] = await getEnsuredHostNode();
    const style = over1Children ? `margin-right: 1rem;` : '';

    // log('hostNode', hostNode)

    if (!hostNode) { return }

    const { name: pname } = packageJSON;

    if (err1 || !pname) {
      err1 && error(`fetch package.json failed: path = "${path}"`, err1);
      !pname && error(`no "name" field in package.json`, { path, packageJSON });

      // const hostNode = await findClosestHeader(container)
      // if (!hostNode) { error(`no h element find in "${container}"`); return; }

      await insertUnpublishedBadge(hostNode, { style });

      return;
    }

    const { name, description, version, publisher } = packageJSON;

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

    insertBadge(hostNode, badgeLinkHTML);
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

    return composeNpmLinkHTML(name, { version, description, style });
  }

  async function composeVSCodeMarketplaceLinkHTML(name, publisher, { version = '', description = '', style = '' } = {}) {
    if (isVersionBadgeExisting('/visual-studio-marketplace/v/')) { return [true, ''] }

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

  /** @params {'/visual-studio-marketplace/v/' | '/npm/v/'} badgeTrace */
  function isVersionBadgeExisting(badgeTrace) {
    if (queryChild('#readme img', img => img.dataset.canonicalSrc?.includes(badgeTrace))) {
      // data-canonical-src="https://img.shields.io/npm/v/verb-corpus.svg"

      return true;
    }

    return false
  }

  async function composeNpmLinkHTML(name, { version = '', description = '', style = '' } = {}) {
    if (isVersionBadgeExisting('/npm/v/')) { return [true, ''] }

    const link = `https://www.npmjs.com/package/${name}`;
    const imgURL = `https://img.shields.io/npm/v/${name}?logo=npm`;

    return [false, await composeBadgeLinkHTMLCore(link, imgURL, { name, version, description, style })];
  }

  function isVSCodeExtensionRepo({ name, publisher }) {
    return !!(name && publisher)
  }

  async function composeBadgeLinkHTMLCore(href, badgeSrc, { name, version = '', description = '', style = '' } = {}) {
    const alt = name + (version ? `@${version}` : '') + (description ? `: ${description}` : '');

    const [err, badgeHTML] = await box(generateSafeImageHTML(badgeSrc, alt));

    if (err) {
      // error('[composeBadgeLinkHTMLCore] failed', err)
      return '';
    }

    const badgeLinkHTML = `<a href="${href}" rel="nofollow" target="_blank" alt="${alt}" style="${style}">
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

  async function insertUnpublishedBadge(hostNode, { style }) {
    const unpublished = `https://img.shields.io/badge/npm-unpublished-yellow?logo=npm`;
    const img = await generateSafeImageHTML(unpublished, 'not published yet');

    const name = $('.markdown-body h1').textContent.trim()

    let html = img;

    if (name) {
      const link = `https://www.npmjs.com/package/${name}`;
      const styleWrapper = style ? `style="${style}"` : ''

      html = `<a href="${link}" rel="nofollow" target="_blank" alt="${name}" ${styleWrapper}>
        ${img}
      </a>`;
    }

    insertBadge(hostNode, html);
  }

  function insertBadge(hostNode, html) {
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
