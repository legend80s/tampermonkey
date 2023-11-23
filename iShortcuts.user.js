// ==UserScript==
// @name         iShortcuts
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  try to take over the world! iShortcuts.user.js
// @author       孟陬
// @match        https://yuyan.antfin-inc.com/*
// @match        https://code.alipay.com/*
// @match        https://baiyan.antfin.com/task/*
// @match        https://r.alipay.com/index.htm
// @match        https://anteye.alipay.com/workOrder/feedback/workOrderDetails*
// @match        https://juejin.cn/post/*
// @match        https://jiang.antgroup-inc.cn/nominationDetail?*
// @match        https://ide.alipay.com/antcode/repo?repoId*
// @match        https://connect-ant.antgroup-inc.cn/detail*
// @match        https://aone.alipay.com/issue/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_setClipboard
// ==/UserScript==

// CHANGELOG
// 1.2 add isSingleKeyStroke to avoid mis-keystoke
// 1.0 初始化
(async function() {
  'use strict';

  // Your code here...
  const {
    $,
    $$,
    alert,
    ready,
    sleep,
    isString,
    isFunction,
    createLoggers,
    time2Readable,
    onUrlChange,
    getElementByText,
    findNearestOperationBtn,
  // eslint-disable-next-line no-undef
  } = tampermonkeyUtils;

  const { log, error } = createLoggers(GM_info);
  const info = log;

  // ❌ 注意需要开启
  const debugging = false;

  const debug = (...args) => {
    debugging && log(...args)
  }

  let added = false;
  main()

  async function main() {
    info('launched')

    init()

    onUrlChange(() => init())
  }

  async function init() {
    addShortcuts();
  }

  // e => edit
  // cmd + enter => sumbit edit
  // i => open in web ide
  // esc => cancel
  async function addShortcuts() {
    debug('addShortcuts added yet?', added)

    const operations = {
      // e => edit
      editBtn: {
        el: undefined,
        selectors: () => $('a[href*="/edit/"]') || getElementByText('编辑', 'span'),
        key: 'e',
      },
      // cmd + enter => submit
      submitBtn: {
        el: undefined,
        selectors: () => {
          const btns = [
            [/.{2,6}/, '.ant-btn-primary'],
            [/提交评论/, '.next-btn-primary'],
            [/提交/, '.calm-box'],
          ];
          for (const [ textRegexp, selector ] of btns) {
            const el = findNearestOperationBtn(textRegexp, selector);

            if (el) {
              return el;
            }
          }

          return null;
        },
        // selectors: [/.{2,}/, '.ant-btn-primary:not([disabled])'],
        key: ({ ctrlKey, metaKey, key }) => (ctrlKey || metaKey) && key === 'Enter',
        keyId: 'CMD+Enter',
      },
      // i => open in web ide
      webIdeBtn: {
        el: undefined,
        selectors: [/web\s*ide/i, '.ant-btn'],
        key: 'i',
      },
      copyBranchBtn: {
        el: undefined,
        selectors: [/复制分支名/, 'div[role="button"]'],
        key: 'b',
      },
      openDiffBtn: {
        el: undefined,
        selectors: [/查看 diff/i, '.ant-btn'],
        key: 'd',
      },
      deployBtn: {
        el: undefined,
        selectors: ['部 署', '.ant-btn'],
        key: 'p',
      },
      // no need because cmd + enter has covered it
//       newSprintBtn: {
//         el: undefined,
//         selectors: ['新建迭代', '.ant-btn'],
//         key: 'n',
//       },
      // m => 合并
      mergeBtn: {
        el: undefined,
        selectors: [/合\s*并/, 'button'],
        key: 'm',
      },
      // esc => cancel
//       escBtn: {
//         el: undefined,
//         selectors: [/取\s*消/i, '.ant-btn'],
//         key: 'esc',
//       },
    }
    const names = Object.keys(operations);

    // detect key conflicts begin
    const keys = Object.values(operations).map(x => x.key);
    if (new Set(keys).size !== keys.length) { error('key 存在冲突！', keys.sort()) }
    // detect key conflicts end

    if (added) { return }

    added = true;

    isSingleKeyStroke.lastTime = 0;
    function isSingleKeyStroke(event) {
      if (event.metaKey) { return true }

      const curTime = Date.now();
      const lastTime = isSingleKeyStroke.lastTime;

      isSingleKeyStroke.lastTime = curTime;

      if (!lastTime || curTime - lastTime > 1000) {
        return true;
      }

      return false;
    }

    document.addEventListener('keydown', (event) => {
      const { key } = event;
      debug('event', event)
      if (!isSingleKeyStroke(event)) { return; }
      // log({ key });

      for (const name of names) {
        const op = operations[name];
        const { key: targetKey, selectors, keyId } = op;
        const hit = typeof targetKey === 'function' ? targetKey(event) : key === targetKey;

        debug('hit', { key, targetKey, name, hit })

        if (!hit) continue;

        const btn = isFunction(selectors) ? selectors() : getElementByText(...selectors);

        debug('btn', { btn, keyId })

        if (!btn) {
          const isCmdEnter = keyId === 'CMD+Enter';

          if(isCmdEnter) {
            const msg = '请检查页面是否存在选择器对应的文件 selectors =' + selectors
            alert(msg);
            error(msg);
          }
          return;
        }

        highlight(btn, op);

        sleep(100).then(() => {
          const clickable = btn.firstElementChild || btn;
          clickable.click();

          log('click', name)
          debug(btn, btn !== clickable ? clickable : '')
        }).then(() => {
          const lgtmInput = $('.ant-mentions > textarea');
          // log('lgtmInput', lgtmInput)
          if (lgtmInput) {
            // lgtmInput.value = 'LGTM';
            lgtmInput.setAttribute('value', 'LGTM')
            // GM_setClipboard('LGTM')
            log('lgtmInput.value:', lgtmInput.value)
          }
        })
      }
    });

    await isMainContentInteractive();
    await sleep(100);

    // set element
    names.forEach(name => {
      const op = operations[name];
      const { selectors } = op;
      const el = typeof selectors === 'function' ? selectors() : getElementByText(...selectors);

      if (el) {
        op.el = el;
        highlight(el, op)
      }
    });
  }

  function highlight(el, { key, keyId }) {
    if (el.__highlighted) { return }

    debug('highlight', el, key, keyId);

    el.style.outline = `2px dashed red`;
    el.__highlighted = true;

    el.insertAdjacentHTML('beforeend', `<sub style="margin-left: 0.2em; font-size: 0.8em;"><var>${ isString(key) ? key.toUpperCase() : keyId }</var></sub>`);
  }

  async function isMainContentInteractive() {
    const config = {
      'yuyan.antfin-inc.com': '.panel-body .ant-steps',
      'code.alipay.com': '.line-numbers',
      default: '.ant-btn',
    }

    const sentry = config[location.hostname] || config.default;
    // panel-body
    const deviation = 375;
    await ready(sentry, { timeout: 8_000 - deviation, verbose: true })
  }
})();
