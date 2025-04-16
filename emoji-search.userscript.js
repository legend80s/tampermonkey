// ==UserScript==
// @name         Emoji Search
// @namespace    http://tampermonkey.net/
// @version      2025-04-15
// @description  try to take over the world!
// @author       You
// @match        https://emojisearch.fun/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=emojisearch.fun
// @grant        none
// ==/UserScript==

// CHANGELOG
// 1.0.0 如果请求报错则使用 kimi 兜底
(function() {
  'use strict';


  // Your code here...
  const {
    $,
    copy,
    $Async,
    $Text,
    alert,
    toast,
    debounce,
    // eslint-disable-next-line no-undef
  } = tampermonkeyUtils;

  main();

  function observe({ initiatorType, name }, cb) {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        // console.log('entry', entry)
        if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
          if (entry.responseStatus >= 400) {
            // console.error('网络请求错误:', entry.name, '状态码:', entry.responseStatus);
            if (entry.initiatorType === initiatorType && entry.name.includes(name)) {
              cb(entry)
            }
          }
        }
      });
    });

    observer.observe({ type: 'resource', buffered: true });
  }

  function createErrorAndSpinning() {
    const errorMsgElement = $Text(/Something's not right/, 'p');
    const kimiLogo = `<img src="//statics.moonshot.cn/kimi-web-seo/assets/kimi-last-DFL4Por3.png" style=" width: 1em; display: inline-block; margin-inline: 0.25em;" />`

    let timer
    if (errorMsgElement) {
      errorMsgElement.parentElement.style.visibility = 'visible'
      // Kimi blue
      errorMsgElement.style.color = '#4da0ff'
      const spin = `<span class="text-xs animate-spin" style="display: inline-flex;">⏳</span>`
      errorMsgElement.innerHTML = `🔴 Something's not right. Searching from Kimi ${kimiLogo} ${spin} <code>0s</code>...`

      let count = 0
      timer = setInterval(() => {
        errorMsgElement.querySelector('code').textContent = `${++count}s`
      }, 1e3)
    }

    return { errorMsgElement, timer }
  }

  async function main() {
    const findEmojiFromKimi = debounce(async () => {
      console.log(Date.now())
      const params = new URLSearchParams(location.search)
      const q = params.get('q')
      const label = '⏳ chat ' + q

      console.time(label);

      const { errorMsgElement, timer } = createErrorAndSpinning()

      try {
        await chat(q, { range: [5, 10] });

        errorMsgElement && (errorMsgElement.parentElement.style.visibility = 'hidden') // 否则找不到
      } finally {
        timer && clearInterval(timer)

        console.timeEnd(label);
      }
    }, 100);

    observe({ initiatorType: 'fetch', name: 'https://emojisearch.fun/api/completion?query=' }, findEmojiFromKimi)

    $('form').addEventListener('submit', () => {
      console.log('submit', $('#fallback-from-kimi'))
      $('#fallback-from-kimi')?.remove()
    })
  }

  /** only keep the uniq ones by path */
  function uniqBy(arr, path) {
    var set = new Set()

    return arr.filter((cur) => {
      if (!set.has(cur[path])) {
        set.add(cur[path]);
        return true
      }

      return false
    });
  }

  async function chat(emojiText, { range: [min = 3, max = 10] }) {
    // const question = '1+1';
    const question = `give me ${min} to ${max} unique emojis which are most relevant to "${emojiText}" in json format [{ emoji, desc }]. only give me the json!`;

    const list = await complete(question);

    // console.log('list:', typeof list, list);

    // console.log(toJSON(list.join('')));
    const emojis = uniqBy(toJSON(list.join('')), 'emoji').filter(x => /\p{Emoji}/u.test(x.emoji))

    $('#fallback-from-kimi')?.remove()
    const template = `<div id="fallback-from-kimi" class="mt-6 grid grid-cols-6 sm:grid-cols-10 justify-items-center">
      ${!emojis.length ? 'No Emojis' : emojis.map(({ emoji, desc }) => `<div class="relative inline-flex grow-0">
        <div>
          <button title="${desc} - from Kimi" type="button" onclick="tampermonkeyUtils.copy('${emoji}');tampermonkeyUtils.toast('${emoji} copied');" class="focus:outline-none focus-visible:outline-0 disabled:cursor-not-allowed disabled:opacity-75 flex-shrink-0 font-medium rounded-md text-sm gap-x-1.5 p-1.5 text-primary-500 dark:text-primary-400 hover:bg-primary-50 disabled:bg-transparent dark:hover:bg-primary-950 dark:disabled:bg-transparent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400 inline-flex items-center text-xl">
            <!---->${emoji}<!---->
          </button></div><!----></div>`).join('\n')}
    </div>`;
    // console.log(template)

    $('form').insertAdjacentHTML('afterend', template)

  }

  /**
 *
 * @param {string} str
 * parse content in ```json  {content} ``` to json
 */
  function toJSON(str) {
    try {
      return JSON.parse(str.replaceAll('""', `"`).match(/```json(.*)```/s)?.[1] || '[]');
    } catch(error) {
      console.error('str:', str, ', match', str.match(/```json(.*)```/s))
      // console.error(error)
      throw error
    }
  }

  const requestPromiseCache = {};

  async function complete(question) {
    if (requestPromiseCache[question]) {
      return requestPromiseCache[question]
    }

    requestPromiseCache[question] = request(question)

    return requestPromiseCache[question]
  }

  /**
 *
 * @param {string} question
 * @returns {Promise<string[]>}
 */
  async function request(question) {
    const resp = await fetch(
      'https://kimi.moonshot.cn/api/chat/aa/completion/stream',
      {
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
          authorization:
          'Bearer xx.yy.zz-uu',
          'cache-control': 'no-cache',
          'content-type': 'application/json',
          pragma: 'no-cache',
          priority: 'u=1, i',
          'r-timezone': 'Asia/Shanghai',
          'sec-ch-ua':
          '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'x-language': 'zh-CN',
          'x-msh-device-id': '7385109661751553547',
          'x-msh-platform': 'web',
          'x-msh-session-id': '111',
          'x-traffic-id': 'cc',
        },
        referrer: 'https://kimi.moonshot.cn/chat/aa',
        referrerPolicy: 'strict-origin-when-cross-origin',
        body: JSON.stringify({
          kimiplus_id: 'kimi',
          extend: {
            sidebar: true,
          },
          model: 'kimi',
          use_search: true,
          messages: [
            {
              role: 'user',
              content: question,
            },
          ],
          refs: [],
          history: [],
          scene_labels: [],
        }),
        method: 'POST',
        mode: 'cors',
        // credentials: 'include',
      }
    );

    const reader = resp.body?.getReader();
    if (!reader) return [];

    const list = [];

    while (true) {
      const { done, value } = await reader?.read();
      // console.log('done:', done);
      if (done) break;
      const decoder = new TextDecoder();
      const lines = decoder.decode(value).trim().split('\n\n');
      // chunk is 'data: {"event":"cmpl","idx_s":0,"idx_z":0,"text":"🐎","view":"cmpl"}'
      // console.log('chunk:', line);

      // console.log('lines:', lines);

      for (const line of lines) {
        if (line.startsWith('data: {')) {
          const json = JSON.parse(line.slice(6));
          if (json.event === 'cmpl') {
            list.push(json.text);
            // console.log('json.text:', json.text);
          }
        }
      }
    }

    return list;
  }

})();
