// ==UserScript==
// @name         Emoji Search
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  try to take over the world!
// @author       You
// @match        https://emojisearch.fun/*
// @match        https://emojisearch.aleks.bar/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=emojisearch.fun
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_info
// ==/UserScript==

// CHANGELOG
// 2.0.0 改写提示词，优化性能，从16s到8s
// 1.0.0 如果请求报错则使用 kimi 兜底

// @ts-check
;(() => {
  // Your code here...
  const {
    $,
    copy,
    $Async,
    $Text,
    alert,
    debounce,
    generateLabel,
    // eslint-disable-next-line no-undef
    // @ts-expect-error
  } = tampermonkeyUtils

  const debugging = true
  // @ts-expect-error
  const label = generateLabel(GM_info)
  const log = (...args) => debugging && console.log(label, ...args)
  const logError = (...args) => debugging && console.error(label, ...args)

  main()

  async function main() {
    observeNetworkError(
      {
        initiatorType: 'fetch',
        name: 'https://emojisearch.fun/api/completion?query=',
      },
      debounce(findEmojiFromKimi, 100),
    )

    $('form').addEventListener('submit', () => {
      // console.log('submit', $('#fallback-from-kimi'))
      $('#fallback-from-kimi')?.remove()
    })

    addChatSettings()
  }

  function observeNetworkError({ initiatorType, name }, cb) {
    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        // console.log('entry', entry)
        // @ts-expect-error
        const entryInitiatorType = entry.initiatorType

        // @ts-expect-error
        if (entry.responseStatus >= 400) {
          // console.error('网络请求错误:', entry.name, '状态码:', entry.responseStatus);
          if (entryInitiatorType === initiatorType && entry.name.includes(name)) {
            cb(entry)
          }
        }
      })
    })

    observer.observe({ type: 'resource', buffered: false })
  }

  function createErrorAndSpinning() {
    const errorMsgElement = $Text(/Something's not right/, 'p')
    const kimiLogo = `<img src="//statics.moonshot.cn/kimi-web-seo/assets/kimi-last-DFL4Por3.png" style=" width: 1em; display: inline-block; margin-inline: 0.25em;" />`

    let timer
    if (errorMsgElement) {
      errorMsgElement.parentElement.style.visibility = 'visible'
      // errorMsgElement.classList.add(`animate-pulse`)
      // Kimi blue
      // errorMsgElement.style.color = '#4da0ff'
      const spin = `<span class="text-xs animate-spin" style="display: inline-block;">⏳</span>`
      errorMsgElement.innerHTML = `🔴 Something's not right. Searching from Kimi ${kimiLogo} ${spin} <code>0s</code>...`

      let count = 0
      timer = setInterval(() => {
        errorMsgElement.querySelector('code').textContent = `${++count}s`
      }, 1e3)
    }

    return { errorMsgElement, timer }
  }

  async function findEmojiFromKimi() {
    // console.log(Date.now())
    const params = new URLSearchParams(location.search)
    const q = params.get('q')
    const label = '⏳ chat ' + q

    console.time(label)

    const { errorMsgElement, timer } = createErrorAndSpinning()

    try {
      await chat(q, { range: [5, 10] })

      errorMsgElement && (errorMsgElement.parentElement.style.visibility = 'hidden') // 否则找不到
    } catch (chatError) {
      logError('Oops!', chatError)

      // {"error_type":"chat.not_found","message":"找不到指定的会话"} chatId null
      // { "error_type": "auth.token.invalid", "message": "您的授权已过期，请重新登录", "detail": "该用户的授权已过期，请重新登录" } authorization null
      const showError = msg => setErrorMessage(errorMsgElement, msg || 'Unknown Error')
      const errorHandlers = {
        'chat.not_found': error => showError(error.message + '。请点击右上角 ⚙️ 设置必须信息'),
        'auth.token.invalid': error => showError(error.message + '。请点击右上角 ⚙️ 设置必须信息'),
        default: error => showError(error.message),
      }
      const handler = errorHandlers[chatError.error_type] || errorHandlers.default

      handler(chatError)
    } finally {
      timer && clearInterval(timer)

      console.timeEnd(label)
    }
  }

  function setErrorMessage(errorMsgElement, msg) {
    const el = errorMsgElement
    if (!el) {
      return
    }
    // el.style.color = null // use-from-class
    el.classList.remove('animate-pulse')
    el.textContent = '🔴 ' + msg
  }

  /** only keep the uniq ones by path */
  function uniqBy(arr, path) {
    var set = new Set()

    return arr.filter(cur => {
      if (!set.has(cur[path])) {
        set.add(cur[path])
        return true
      }

      return false
    })
  }

  function genPrompt(emojiText, [min, max]) {
    const prompt = `give me ${min} to ${max} unique emojis which are most relevant to "${emojiText}" in format \`{emoji}:{desc}|{emoji:desc}\` for example: "🌍:地球，代表受污染的环境|🌫️:雾，代表空气污染". Only give the content and output in one line and in language ${navigator.language}. return ASAP.`

    return prompt
  }

  // @ts-expect-error
  async function chat(emojiText, { range: [min = 3, max = 10] } = {}) {
    // const question = '1+1';
    // const question = `give me ${min} to ${max} unique emojis which are most relevant to "${emojiText}" in json format [{ emoji, desc }]. only give me the json!`;
    const question = genPrompt(emojiText, [min, max])

    const list = await complete(question)

    // console.log('list:', typeof list, list);

    // console.log(toJSON(list.join('')));
    const emojis = uniqBy(toJSON(list.join('')), 'emoji').filter(x => /\p{Emoji}/u.test(x.emoji))

    $('#fallback-from-kimi')?.remove()
    const template = `<div id="fallback-from-kimi" class="mt-6 grid grid-cols-6 sm:grid-cols-10 justify-items-center">
      ${
        !emojis.length
          ? 'No Emojis'
          : emojis
              .map(
                ({ emoji, desc }) => `<div class="relative inline-flex grow-0">
        <div>
          <button title="${desc} - from Kimi" type="button" onclick="tampermonkeyUtils.copy('${emoji}');tampermonkeyUtils.toast('${emoji} copied');" class="focus:outline-none focus-visible:outline-0 disabled:cursor-not-allowed disabled:opacity-75 flex-shrink-0 font-medium rounded-md text-sm gap-x-1.5 p-1.5 text-primary-500 dark:text-primary-400 hover:bg-primary-50 disabled:bg-transparent dark:hover:bg-primary-950 dark:disabled:bg-transparent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400 inline-flex items-center text-xl">
            <!---->${emoji}<!---->
          </button></div><!----></div>`,
              )
              .join('\n')
      }
    </div>`
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
      //       return JSON.parse(
      //         str.replaceAll('""', `"`).match(/```json(.*)```/s)?.[1] || '[]'
      //       );
      return str.split('|').map(pair => {
        const [emoji, desc] = pair.split(':')
        return { emoji, desc }
      })
    } catch (error) {
      console.error('str:', str)
      // console.error('str:', str, ', match', str.match(/```json(.*)```/s));
      // console.error(error)
      throw error
    }
  }

  const requestPromiseCache = {}

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
    // @ts-expect-error
    const chatId = GM_getValue('kimi:chatId', 'null')
    // @ts-expect-error
    const authorization = GM_getValue('kimi:authorization', 'null')

    const resp = await fetch(`https://kimi.moonshot.cn/api/chat/${chatId}/completion/stream`, {
      headers: {
        //           accept: 'application/json, text/plain, */*',
        //           'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        authorization,
        'cache-control': 'no-cache',
        'content-type': 'application/json',
        pragma: 'no-cache',
        //           priority: 'u=1, i',
        //           'r-timezone': 'Asia/Shanghai',
        //           'sec-ch-ua':
        //           '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
        //           'sec-ch-ua-mobile': '?0',
        //           'sec-ch-ua-platform': '"Windows"',
        //           'sec-fetch-dest': 'empty',
        //           'sec-fetch-mode': 'cors',
        //           'sec-fetch-site': 'same-origin',
        // 'x-language': 'zh-CN',
        // 'x-msh-device-id': '7385109661751553547',
        // 'x-msh-platform': 'web',
        // 'x-msh-session-id': '1730303647696008250',
        // 'x-traffic-id': 'cpgib5e768j5a4md3f40',
      },
      // referrer: 'https://kimi.moonshot.cn/chat/cvv094v37oqbghbb8vh0',
      // referrerPolicy: 'strict-origin-when-cross-origin',
      body: JSON.stringify({
        kimiplus_id: 'kimi',
        extend: {
          sidebar: true,
        },
        model: 'kimi',
        stream: false,
        // 是否联网搜索
        use_search: false,
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
      // mode: 'cors',
      // credentials: 'include',
    })

    if (resp.status !== 200) {
      const json = await resp.json()
      throw json
    }

    const reader = resp.body?.getReader()
    if (!reader) return []

    const list = []

    while (true) {
      const { done, value } = await reader?.read()
      // console.log('done:', done);
      if (done) break
      const decoder = new TextDecoder()
      const lines = decoder.decode(value).trim().split('\n\n')
      // chunk is 'data: {"event":"cmpl","idx_s":0,"idx_z":0,"text":"🐎","view":"cmpl"}'
      // console.log('chunk:', line);

      // console.log('lines:', lines);

      for (const line of lines) {
        if (line.startsWith('data: {')) {
          try {
            const json = JSON.parse(line.slice(6))
            if (json.event === 'cmpl') {
              list.push(json.text)
              // console.log('json.text:', json.text);
            }
          } catch (error) {
            logError(line)
            logError(error)
            throw error
          }
        }
      }
    }

    return list
  }

  function addChatSettings() {
    // @ts-expect-error
    const chatId = GM_getValue('kimi:chatId', '')
    // @ts-expect-error
    const authorization = GM_getValue('kimi:authorization', '')
    const overlayClosable = false

    const settings = `<!-- 设置按钮 -->
    <style>
    .p-6 {
    padding: 1.5rem;
}
.bg-gray-800 {
    --tw-bg-opacity: 1;
    background-color: rgb(31 41 55 / var(--tw-bg-opacity, 1));
}

.border-gray-700 {
    --tw-border-opacity: 1;
    border-color: rgb(55 65 81 / var(--tw-border-opacity, 1));
}
.pt-2 {
    padding-top: 0.5rem;
}
.space-y-4 > :not([hidden]) ~ :not([hidden]) {
    --tw-space-y-reverse: 0;
    margin-top: calc(1rem * calc(1 - var(--tw-space-y-reverse)));
    margin-bottom: calc(1rem * var(--tw-space-y-reverse));
}
    </style>

    <button id="settingsBtn" class="fixed top-4 right-4 p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition text-gray-200" style="top:1rem; right:1rem;">
        ⚙️
    </button>

    <!-- Modal 遮罩层 -->
    <div id="modalOverlay" class="fixed inset-0 bg-black bg-opacity-70 hidden flex items-center justify-center" style="z-index: 1;">
        <!-- Modal 内容 -->
        <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700 shadow-xl">
            <h2 class="text-xl font-bold mb-4 text-gray-100">设置</h2>

            <form id="settingsForm" class="space-y-4">
                <div>
                    <label for="chatId" class="block text-sm font-medium text-gray-300">Chat Id</label>
                    <input style="color: fieldtext" value="${chatId}" type="text" id="chatId" name="chatId"
                           class="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400">
                    <div id="chatIdError" class="mt-1 text-sm text-red-400 hidden">请输入 Chat Id</div>
                </div>

                <div>
                    <label for="authorization" class="block text-sm font-medium text-gray-300">Authorization</label>
                    <input style="color: fieldtext" value="${authorization}" type="text" id="authorization" name="authorization"
                           class="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-gray-100 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400">
                    <div id="authError" class="mt-1 text-sm text-red-400 hidden">请输入 Authorization</div>
                </div>

                <div class="flex justify-end space-x-3 pt-2">
                    <button type="button" id="cancelBtn"
                            class="px-4 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700">
                        取消
                    </button>
                    <button type="submit"
                            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500">
                        确认
                    </button>
                </div>
            </form>
        </div>
    </div>`

    document.body.insertAdjacentHTML('beforeend', settings)

    // 获取DOM元素
    const settingsBtn = document.getElementById('settingsBtn')
    /** @type {HTMLElement} */
    // @ts-expect-error
    const modalOverlay = document.getElementById('modalOverlay')
    const cancelBtn = document.getElementById('cancelBtn')
    const settingsForm = document.getElementById('settingsForm')
    /** @type {HTMLElement} */
    // @ts-expect-error
    const chatIdError = document.getElementById('chatIdError')
    /** @type {HTMLElement} */
    // @ts-expect-error
    const authError = document.getElementById('authError')

    // 清除所有错误状态
    function clearErrors() {
      chatIdError.classList.add('hidden')
      // @ts-expect-error
      document.getElementById('chatId').classList.remove('border-red-500')
      authError.classList.add('hidden')
      // @ts-expect-error
      document.getElementById('authorization').classList.remove('border-red-500')
    }

    // 打开Modal
    // @ts-expect-error
    settingsBtn.addEventListener('click', () => {
      modalOverlay.classList.remove('hidden')
      clearErrors() // 每次打开清除错误状态
    })

    // 关闭Modal
    // @ts-expect-error
    cancelBtn.addEventListener('click', () => {
      modalOverlay.classList.add('hidden')
    })

    // 表单提交处理
    // @ts-expect-error
    settingsForm.addEventListener('submit', e => {
      e.preventDefault()
      clearErrors()

      // @ts-expect-error
      const chatId = document.getElementById('chatId').value
      // @ts-expect-error
      const authorization = document.getElementById('authorization').value
      let isValid = true

      if (!chatId) {
        // @ts-expect-error
        document.getElementById('chatId').classList.add('border-red-500')
        chatIdError.classList.remove('hidden')
        isValid = false
      }

      if (!authorization) {
        // @ts-expect-error
        document.getElementById('authorization').classList.add('border-red-500')
        authError.classList.remove('hidden')
        isValid = false
      }

      if (isValid) {
        // alert(`Chat Id: ${chatId}\nAuthorization: ${authorization}`);
        // @ts-expect-error
        GM_setValue('kimi:chatId', chatId)
        // @ts-expect-error
        GM_setValue('kimi:authorization', authorization)
        modalOverlay.classList.add('hidden')
        location.reload()
      }
    })

    // 点击遮罩层关闭Modal
    overlayClosable &&
      modalOverlay.addEventListener('click', e => {
        if (e.target === modalOverlay) {
          modalOverlay.classList.add('hidden')
        }
      })
  }
})()
