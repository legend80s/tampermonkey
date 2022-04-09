// ==UserScript==
// @name         BadgePortal
// @namespace    http://tampermonkey.net/
// @version      4.4.0
// @description  Add npm and vscode extension marketplace version badge and link for github repo automatically.
// @author       You
// @match        https://github.com/*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        GM_info
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(async function() {
  'use strict';
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const $ = (s) => document.querySelector(s);

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

  async function main() {
    // Refused to execute inline event handler because it violates the following Content Security Policy directive: "script-src 'unsafe-eval' github.githubassets.com"
    // document.head.insertAdjacentHTML('beforeend', `<meta http-equiv="Content-Security-Policy" content="script-src 'unsafe-eval' *">`)

    if (window.location.pathname.endsWith('package.json')) {
      return injectIntoPackageJSON();
    }

    // Your code here...
    const path = await findPackageJSONRawPath();
    const [err1, packageJSON] = await box(fetch(path).then(resp => resp.json()));

    if (err1) {
      error(`fetch package.json failed: path = "${path}"`, err1);

      const hostNode = await findClosestHeader(container)

      if (!hostNode) { error(`no h element find in "${container}"`); return; }

      await insertUnpublishedBadge(hostNode);

      return;
    }

    const { name, description, version, publisher } = packageJSON;

    const style = ''
    const [existing, badgeLinkHTML] = await composeBadgeLinkHTML(name, { publisher, version, description, style });

    if (existing) {
      log(`version badge already exists`);
      return;
    }

    if (!badgeLinkHTML) {
      return;
    }

    // const hostNode = await findClosestHeader(container)
    // if (!hostNode) { error(`no h element find in "${container}"`); return; }

    const [_, hostNode] = await ready(host, { timeout: 3000 });

    if (!hostNode) { return; }

    // hostNode.insertAdjacentHTML('afterend', );

    insertBadge(hostNode, badgeLinkHTML);
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
      return '';
    }

    const badgeLinkHTML = `<a href="${href}" rel="nofollow" target="_blank" alt="${alt}" style="${style}">
      ${badgeHTML}
    </a>`;

    return badgeLinkHTML;
  }

  function getPaireNodesByKeyName(name) {
    const keyNode = $$('.js-blob-code-container .pl-ent').find(x => x.textContent === `"${name}"`);
    const valueNode = keyNode.nextElementSibling;

    return { keyNode, valueNode };
  }

  async function injectIntoPackageJSON() {
    const { valueNode: nameNode } = getPaireNodesByKeyName('name');
    const { keyNode: versionKeyNode } = getPaireNodesByKeyName('version');
    const name = nameNode.textContent.replace(/^"/, '').replace(/"$/, '');

    // const { valueNode: versionNode } = getPaireNodesByKeyName('version');
    // const a = document.createElement('a');
    // a.setAttribute('href', `https://www.npmjs.com/package/$ versionNode.textContent}`);
    // a.textContent = versionNode.textContent;

    const npmLinkHTML = await composeNpmLinkHTML(name, { style: 'left: 10.4em; display: inline-block; position: absolute; height: 100%; top: -20px;' });

    const npmLinkElement = domStringToElement(npmLinkHTML);

    versionKeyNode.parentElement.appendChild(npmLinkElement)
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

  async function insertUnpublishedBadge(hostNode) {
    const unpublished = `https://img.shields.io/badge/npm-unpublished-yellow?logo=npm`;
    const img = await generateSafeImageHTML(unpublished, 'not published yet');

    const name = $('.markdown-body h1').textContent.trim()

    let html = img;

    if (name) {
      const link = `https://www.npmjs.com/package/${name}`;
      html = `<a href="${link}" rel="nofollow" target="_blank" alt="${name}">
        ${img}
      <a>`;
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

  async function ready(sentry, { timeout = 10 * 1000, interval = 200 } = {}) {
    await sleep(10)

    for (let i = 0; i < timeout / interval; i++) {
      if ($(sentry)) { return [true, $(sentry)] }

      await sleep(interval);
    }

    error(`element "${sentry}" not found after ${timeout / 1000}s!`)

    return [false, $(sentry)]
  }

  async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

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
