// ==UserScript==
// @name         Gitlab Helper
// @namespace    http://tampermonkey.net/
// @version      1.16.0
// @description  tag 自动化助手
// @author       legend80s

// @match        https://git.corp.com/*/-/tags*
// @match        https://git.corp.com/*/-/tags/new*
// @match        https://git.corp.com/*/tree/*
// @match        https://git.corp.com/*/pipelines*
// @match        https://git.corp.com/*/*/-/blob/main/*
// @match        https://git.corp.com/*

// @icon         https://www.google.com/s2/favicons?sz=64&domain=corp.com
// @grant        GM_setClipboard
// @grant        GM_notification

// ==/UserScript==

// CHANGELOG
// 1.16.0 显示最新提交信息
// 1.15.0 标签使用最频繁的放到最前面
// 1.14.2 支持英文版本
// 1.14.1 过滤掉非三位的版本号
// 1.14.0 MR页面新增复制分支按钮
// 1.13.2 展示上次部署 commit 信息
// 1.13.1 loading 使用 gitlab 自带的
// 1.13.0 展示loading当 tags 未获取到
// 1.12.0 merge request 页面自动高亮作者提的 MR
// 1.11.0 自动刷新tag页面和流水线页面
// 1.10.0 tag 助手增加最新提交信息，以及展示是否已经部署了最新代码
// 1.9.0 tag 助手爬取 4 页（耗时 0.9s）
// 1.8.0 使用更安全的 template：无需 display none 性能和 DX 更好
// 1.7.0 tag 助手多翻2页。目前会结合前三页来结算下一个 tag
// 1.6.4 增加源文件编辑按钮；注释掉轮询检查流水线是否完成；凡是插入的都增加猴子🙉icon防止用户疑惑
// 1.6.3 修复填入tag无效仍然是main以及无法更改分支，修改成复制后让用户主动填入
// 1.6.2 修复其他repo 没有填入分支
// 1.6.0 根据前一个tag-commmit-branch预填上一次分支
// 1.5.2 如果创建tag按钮置灰则在输入tag后将其 enable
// 1.5.1 获取第二页如果 status 不为 200 也需要认为是获取失败
// 1.5.0 获取相对更全面的 tag list，综合前两页获取最大版本号的tag 且只有首页才展示 tag
// 1.4.2 兼容中文 Create Tag
// 1.4.1 增加 compareVersion 修复版本递增问题
// 1.4 部署完毕自动提醒
// 1.3 高亮部署到环境的流水线
// 1.2 localeCompare 修复下一个版本计算错误问题
// 1.1 自动输入tag oninput（必须手动才能让新增按钮从置灰变成可点击状态） 自动唤起分支选择
// 1.0 tag 助手

// TODO diff
(async function() {
  'use strict';

  // 按照个人个性化开启关闭功能 - TODO
  // 其实可以通过页面配置面板存储在本地存储即可
  const features = {
    'username': [
      'neuro_lab/cloud-group/[\w\-]+/[\w\-]+/[\w\-]+'
    ]
  }

  // Your code here...
  const {
    $,
    $$,
    ready,
    sleep,
    createLoggers,
    getElementByText,
    time2Readable,
    onUrlChange,
    $Async,
    $Text,
    alert,
    toast,
    compareVersion,
    // eslint-disable-next-line no-undef
  } = tampermonkeyUtils;

  const debug = false
  const { log: lg, error } = createLoggers(GM_info);
  let pureNumberedTagExists = false
  const log = (...args) => { if (debug) { lg(...args) } }

  let pipelineRefreshTimer
  let firstPageRunningPipelines
  let turn = 0
  const icon = {
    success: `https://s1.4sai.com/src/img/png/b1/b14dce71aaec4fb89baf3e5b0a8679b3.png?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=1735488000&token=1srnZGLKZ0Aqlz6dk7yF4SkiYf4eP-YrEOdM1sob:DHiqSSyXkG-WDb79gwwEiIHCZ5o=`,
    failed: 'https://s1.4sai.com/src/img/png/74/74169989823c400fbce8492944b202d8.png?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=1735488000&token=1srnZGLKZ0Aqlz6dk7yF4SkiYf4eP-YrEOdM1sob:25o49I2wuGcHBBF1_KrEqvLktnw=',
    info: 'https://s1.aigei.com/src/img/png/5d/5d2d131a23c14d4da8c1f995a48444f9.png?imageMogr2/auto-orient/thumbnail/!282x282r/gravity/Center/crop/282x282/quality/85/%7CimageView2/2/w/282&e=1735488000&token=P7S2Xpzfz11vAkASLTkfHN7Fw-oOZBecqeJaxypL:2z4Iuc6tP7Xh-TtHJeln7-NxdEk=',
  }
  const usernames = ['legend80s']
  const interval = 8_000
  const crawlTagPageIdPrefix = 'gh-hidden-page'
  /** () => void */
  let checkTagHealth;
  const tagPagesToCraw = [2, 3, 4]
  const mark = "来自 tampermonkey gitlab helper 脚本。综合1," + tagPagesToCraw + '页数据'
  const tagClickRecordStorageKey = 'gh-tag-click-freq-map'

  main()

  function main() {
    const start = Date.now()
    init().finally(() => {
      log('耗时', time2Readable(start, Date.now()))
    })

    onUrlChange(() => {
      log('url changed re-init')
      init()
    })
  }

  function autoRefreshOnAppear() {
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') {
        console.log('document is visible. reload');
        location.reload()
      }
    }, { once: false });
  }

  async function helpPipelinesPage() {
    await $Async('.ci-table')
    autoRefreshOnAppear()
    const pipelinesHasDeployStage = $$('tr:has([aria-label*="deploy"])');

    // eslint-disable-next-line no-return-assign
    pipelinesHasDeployStage.forEach(x => {
      x.style.outline = '2px dotted #ff00fa'
      x.style.borderRadius = '0.35em'
    })

    const idxStyle = `color: #ff00fa; font-weight: bold; font-size: 1.1em;`

    $$('tr:has([aria-label*="deploy"]) > :first-child').forEach((x, i, arr) => x.insertAdjacentHTML('afterbegin', `<span style="${idxStyle}">#${i+1} / ${arr.length}</span>`))

    //     log('pipelinesHasDeployStage', pipelinesHasDeployStage.length)

    //     console.assert(!firstPageRunningPipelines, 'should not has firstPageRunningPipelines initially')

    //     // alert on deployed finished
    //     firstPageRunningPipelines = getPipelines('Running').filtered
    //     log('initial save firstPageRunningPipelines. count', firstPageRunningPipelines.length)
    //     const noRunningLog = `No running pipelines right now, watch on next turn after ${interval / 1000}s`

    //     if (firstPageRunningPipelines.length === 0) { log(noRunningLog) }

    //     pipelineRefreshTimer = setInterval(() => {
    //       turn++
    //       // console.log('\n')

    //       console.groupCollapsed(`[watch #${turn}]`)
    //       if (firstPageRunningPipelines.length === 0) { log(`[watch #${turn}]`, noRunningLog) }

    //       const { all, filtered: lastestRunningPipelines } = getPipelines('Running')

    //       const k1 = new Set(firstPageRunningPipelines.map(p => p.tag))
    //       const k2 = new Set(lastestRunningPipelines.map(p => p.tag))

    //       const finshedPs = [...k1.difference(k2)].map(k => {
    //         return all.find(p => p.tag === k);
    //       }).filter(p => {
    //         return usernames.includes(p.username)
    //       })

    //       log(`[watch #${turn}]`, 'first:', k1, 'lastest:', k2, 'finshed:', finshedPs, 'newly added:', k2.difference(k1))

    //       if (finshedPs.length) {
    //         const hasMupltiple = firstPageRunningPipelines.length > 1
    //         let successCount = 0

    //         const msg = [...finshedPs].map((p, i) => {
    //           const { username, tag, commitTitle, status, timeElapsed } = p;
    //           // const statusText = status === 'Passed' ? '成功' : '失败'
    //           status === 'Passed' && successCount++
    //           const idx = hasMupltiple ? '#' + (i + 1) : ''

    //           return (idx ? `#${idx} ` : '') + `${username} 的 tag “${tag}” 已部署 ${status}，本次部署内容 “${commitTitle}”。耗时 ${timeElapsed.replace(/^[0:]+/g, '')} 秒。`
    //         }).join('\n')
    //         console.log('%c%s', 'color:red;font-weight:bold;', msg)

    //         const allSuccess = successCount === firstPageRunningPipelines.length
    //         const [statusText, level] = (() => {
    //           // 有多个，需要显示部分成功或失败
    //           if (hasMupltiple) {
    //             if (allSuccess) return ['全部成功', 'success']
    //             if (successCount === 0) return ['全部失败', 'failed']
    //             return [`成功 ${successCount} / ${firstPageRunningPipelines.length}`, 'info']
    //           }

    //           if (successCount === 0) return ['失败', 'failed']
    //           return ['成功', 'success']
    //         })()

    //         alert(msg, { title: statusText, level })

    //         const short = msg.split('，')[0]

    //         GM_notification({
    //           // text: '你的 tag“1.xx.yy-foo”已部署成功，本次部署 commit “feat: xxx”。耗时：xs',
    //           text: short,
    //           title: location.pathname.split('/').at(-3) + " " + statusText,
    //           highlight: true,
    //           image: icon[level]
    //         });

    //         window.alert(short)
    //       }

    //       firstPageRunningPipelines = lastestRunningPipelines
    //       log(`[watch #${turn}]`, 'update running pipelines to', lastestRunningPipelines)
    //       console.groupEnd()
    //     }, interval)
  }

  function getPipelines(status) {
    const trs = $$('tr:has([aria-label*="deploy"])');

    const pipelines = trs.map(tr => ({
      username: tr.querySelector('[data-testid="pipeline-triggerer"] > a').pathname.replace(/^\//, ''),
      tag: (tr.querySelector('[data-testid="commit-ref-name"]') ?? tr.querySelector('[data-testid="merge-request-ref"]')).innerText ?? 'NO TAG',
      commitTitle: tr.querySelector('[data-testid="commit-title"]').innerText,
      status: tr.querySelector('[data-testid="ci-badge-text"]').innerText, // Passed Failed Running
      timeElapsed: tr.querySelector('p:has([data-testid="timer-icon"])')?.innerText, // 00:03:58
    }))

    return { all: pipelines, filtered: pipelines.filter(p => p.status === status) }
  }

  async function insertHTML(url, id) {
    if ($(`#${id}`)) { $(`#${id}`).remove() }

    $('body').insertAdjacentHTML('beforeEnd', `<template id="${id}" data-url="${url}"></template>`)

    const html = await fetch(url).then(resp => resp.text())
    $(`#${id}`).insertAdjacentHTML('afterBegin', html)

    return $(`#${id}`)
  }

  async function fetchCommitDetails(commitId) {
    const url = location.pathname.split('/-/').at(0) + `/-/commit/${commitId}`;
    const id = 'gh-commit-details-template'
    const container = await insertHTML(url, id)

    const message = container.querySelector('.commit-box').innerText.trimStart();
    const timeRaw = (await $Async('.js-timeago', { visible: false })).getAttribute('datetime');
    const time = new Date(timeRaw).toLocaleString('zh-CN');

    // log({ message, time, timeRaw })

    return { message, time }
  }

  async function helpNewTagPage() {
    const params = new URLSearchParams(location.search)
    const tag = params.get('tag')
    const commit = params.get('commit')

    if (tag && commit) {
      // 1. 填入 tag
      $('#tag_name').focus()
      $('#tag_name').value = tag;

      // 2. 选择分支
      // console.time('[Gitlab Helper] fetchTagBranchByCommitId commit ' + commit)

      const [branch, idStr] = await fetchTagBranchByCommitId(commit)
      // console.timeEnd('[Gitlab Helper] fetchTagBranchByCommitId commit ' + commit)

      if (branch) {
        // $(`[data-testid="selected-ref-form-field"`).value = branch;
        // $('#content-body [data-testid="base-dropdown-toggle"] .gl-new-dropdown-button-text').textContent = branch
        const branchUrl = location.href.replace(/\/tags\/.+/, `/tree/${branch}?ref_type=heads`)
        const msg = `上次部署分支 <b style="font-size: 110%;"><a href="${branchUrl}">${branch}</a></b> 已复制到剪贴板。脚本🙉根据上次部署的 commit 查询到该分支，请谨慎确认`
        const fetchLatestCommit = async () => {
          // gid://gitlab/Project/86
          const projectId = idStr.split('/').at(-1)
          const resp = await fetch(`https://git.corp.com/api/v4/projects/${projectId}/repository/branches?search=${branch}&per_page=20&sort=updated_desc`)
          const json = await resp.json()
          if (!json || !json[0]) {
            error(`fetchLatestCommit failed json:`, json)
            return {}
          }
          return json[0]?.commit || {}
        }

        const { message, created_at, short_id } = await fetchLatestCommit()
        const latestCommitInfo = !message ? [] : [
          `💬 ${message.trim()}\n`,
          `🗓️ ${new Date(created_at).toLocaleString('zh-CN')}`,
          `🌿 ${branch}`,
        ]

        const tips = `<strong title="${latestCommitInfo.join('\n')}" style="margin-left: 0.5em; font-style: italic; font-weight: normal; color: red;">${msg}</strong>`;
        const ref = $('label[for="ref"]')
        ref.insertAdjacentHTML('afterend', tips);

        const lastCommit = await fetchCommitDetails(commit)
        const lastCommitDetails = [
          '💬 ' + lastCommit.message.trim(),
          '🗓️ ' + lastCommit.time,
        ].join('\n\n')

        const eq = short_id === commit
        const style = !eq ? `font-size: 115%; color: red;` : `color: green;`

        const latestElement = `<code style="${style}" title="${latestCommitInfo.join('\n')}">${short_id}</code>`
        const lastDeployElement = `<code style="color: ${'green'}" title="${lastCommitDetails}">${commit}</code>`
        const latestMsg = eq ? '' : ` (<span style="${style}">${message.trim()}</span>)`;
        const deployMsg = (
          eq ? '<b class="gl-text-green-700">最新代码已部署</b>' : '<b class="gl-text-red-700" style=" font-size: 115%; font-style: normal; ">最新代码未部署</b>'
        ) + `。最新提交 ${latestElement}${latestMsg}；上次部署 ${lastDeployElement}`
        const deployElement = `| <span style="font-style: italic;">${deployMsg}</span>`
        ref.parentElement.querySelector('.form-text.text-muted').insertAdjacentHTML('beforeEnd', deployElement)

        $(`#content-body [data-testid="base-dropdown-toggle"]`).click()
        // $('#message').placeholder = latestCommitInfo.join('\n')

        // alert(msg, { level: 'success' })
        GM_setClipboard(branch)
      }

      // 3. 将创建按钮点亮
      const creatBtn = getElementByText(/(Create tag)|(创建标签)/, 'button')

      if (creatBtn.disabled) {
        creatBtn.removeAttribute('disabled');
        creatBtn.classList.remove('disabled');
      }

      // $('#tag_name').addEventListener('blur', async () => {
      //   (await $Async('#dropdown-toggle-btn-36')).click()
      // })
    }
  }

  function endsWith(subpath) {
    return location.pathname.endsWith(subpath)
  }

  /** 因为有些 tag 是跨页面的，第一页并不全但是有没有一个接口可以获取所有的 tag，所以需要多翻几页 */
  async function insertNextPageTags(pageNumber) {
    const id = crawlTagPageIdPrefix + '-' + pageNumber

    if ($(`#${id}`)) { $(`#${id}`).remove() }

    const nextPage = `${location.href}?page=${pageNumber}`

    $('body').insertAdjacentHTML('beforeEnd', `<template id="${id}" data-url="${nextPage}"></template>`)

    const html = await fetch(nextPage)
    .then(resp => {
      if (resp.status !== 200) {
        throw { message: 'HTTP Error', status: resp.status }
      }
      return resp
    })
    .then(resp => resp.text())
    .catch(err => { error(err) })

    if (html) {
      $(`#${id}`).insertAdjacentHTML('afterBegin', html)
    } else {
      error('无法获取上一页或下一页 HTML，将使用当前页面的 tag', nextPage)
    }
  }

  async function fetchTagBranchByCommitId(commitId) {
    const csrfToken = $('meta[name="csrf-token"]').content
    const fullPath = location.pathname.replace(/^\//, '').replace(/\/\-\/tags\/new$/, '')

    const branch = await fetch("https://git.corp.com/api/graphql", {
      "headers": {
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
      },
      "body": "{\"operationName\":\"CommitReferences\",\"variables\":{\"fullPath\":\""+ fullPath + "\",\"commitSha\":\"" + commitId + "\"},\"query\":\"query CommitReferences($fullPath: ID!, $commitSha: String!) {\\n  project(fullPath: $fullPath) {\\n    id\\n    commitReferences(commitSha: $commitSha) {\\n      containingBranches(excludeTipped: true, limit: 1) {\\n        names\\n        __typename\\n      }\\n      containingTags(excludeTipped: true, limit: 1) {\\n        names\\n        __typename\\n      }\\n      tippingBranches {\\n        names\\n        __typename\\n      }\\n      tippingTags {\\n        names\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\"}",
      "method": "POST",
    }).then(resp => resp.json()).then(json => {
      log('graphql', json)
      const { id, commitReferences } = json.data.project;

      const { containingBranches, tippingBranches } = commitReferences

      // id "gid://gitlab/Project/86"
      return [containingBranches.names[0] ?? tippingBranches.names[0], id];
    }).catch(err => error(err));

    return branch
  }


 const ghIncrementTagClick = (key, subKey) => {
    const tagClickRecords = JSON.parse(localStorage.getItem(key) || '{}')

    tagClickRecords[subKey] = (tagClickRecords[subKey] || 0) + 1
    localStorage.setItem(key, JSON.stringify(tagClickRecords))
  }
  function sortByClickFreq(tags, records, sortKeyGen, order = 'desc') {
    return tags
    return tags.sort(([tag1], [tag2]) => {
      const key1 = sortKeyGen(tag1);
      const key2 = sortKeyGen(tag2);
      const v1 = records[key1] ?? -1
      const v2 = records[key2] ?? -1

      return 'asc' === order ? v1 - v2 : v2 - v1
    });
  }

  async function helpTagsPage() {
    autoRefreshOnAppear()

    const tagClickRecords = JSON.parse(localStorage.getItem(tagClickRecordStorageKey) || '{}')
    //     {
    //       'modeldev': 10
    //     }

    const begin = Date.now();
    const tags1 = findLatestTags()

    log('Tags before load next pages:', $$('a.ref-name').length, ', latest tags:', tags1)

    // add loading
    // <b style="color:#24663b; padding: 5px;">🔄 LOADING...</b>
    $('.tags').insertAdjacentHTML('beforebegin', `<div id="gh-btns-wrapper" class="top-area" style="flex-wrap: wrap; padding: 16px 0; justify-content: center; align-items: center; gap: 0.3em;">
      <span aria-label="Loading" class="gl-vertical-align-text-bottom! gl-spinner gl-spinner-dark gl-spinner-lg"></span>
    </div>`)

    await Promise.all(tagPagesToCraw.map((page) =>
                                         insertNextPageTags(page)
                                        ));

    const tags = findLatestTags()

    log('Tags after load next pages:', $$('a.ref-name').length, ', latest tags:', tags)
    log('  > tags not in page 1:', new Set(tags.keys()).difference(tags1.keys()))

    let nextTags = getNextTags(tags)
    nextTags = sortByClickFreq(nextTags, tagClickRecords, (tag) => tag.split('-')[1])

    const snippet = nextTags.map(([tag, commit]) =>{
      const text = `${tag}`
      const href = `${location.pathname}/new?tag=${tag}&commit=${commit}`
      const [num, env] = tag.split('-')
      const inner = num + (env ? `-<b style="color: yellow;">${env}</b>` : '')

      return `<button
        title="tag=${tag}&commit=${commit}" data-newtag="new_tag_button"
        data-tag=${tag}
        data-env=${env}
        data-href=${href}
        class="gl-button btn btn-md btn-confirm"
      >
        ${inner}
      </button>`
    }).join('')

    const cost = time2Readable(begin, Date.now())

    $('#gh-btns-wrapper').style.justifyContent = `flex-end`;
    $('#gh-btns-wrapper').innerHTML = `${snippet} <span title="${mark + '。耗时 ⏳ ' + cost}">🙉</span>`;

    $$('button[data-newtag="new_tag_button"]').forEach(el => {
      el.addEventListener('click', async () => {
        ghIncrementTagClick(tagClickRecordStorageKey, el.dataset.env);
        window.open(el.dataset.href, '_blank')
      })
    })

    log('🎉 新增', nextTags.length, 'tag button 个耗时', cost)
  }

  async function helpSourceFilePage() {
    log('helpSourceFilePage')
    // add edit shortcut
    // https://git.corp.com/legend80s/work-helper-tampermonkey/-/blob/main/GitlabHelper.userscript.js
    // https://git.corp.com/legend80s/work-helper-tampermonkey/-/edit/main/GitlabHelper.userscript.js
    const editBtn = `<a title="${mark}" href="${location.pathname.replace('/blob/', '/edit/')}" type="button" class="btn btn-confirm btn-md btn-block gl-button" style="
    width: fit-content;
">编辑该文件 🙉</a>`
    const container = await $Async('#content-body .file-actions');
    container.insertAdjacentHTML('afterbegin', editBtn)
  }

  async function init() {
    // 只有第一页才展示 tag 否则没有意义
    if (location.href.endsWith('/tags')) {
      return helpTagsPage()
    }

    if (endsWith('pipelines')) {
      helpPipelinesPage()
      return
    }

    if (endsWith('/tags/new')) {
      return helpNewTagPage()
    }

    if (endsWith('/merge_requests')) {
      return helpMergeRequestsPage()
    }

    if (/merge_requests\/\d+\/diffs/.test(location.pathname)) {
      return helpMRDetailsPage()
    }

    if (['/blob/'].some(part => location.pathname.includes(part))) {
      return helpSourceFilePage()
    }

    // /tree/feat/dev-model-reasoning?ref_type=heads
    const branch = document.querySelector('.ref-selector .gl-new-dropdown-button-text')?.innerText

    if (branch && !$('#gitlab-helper-branch-cp-btn')) {
      $('.tree-controls > div').insertAdjacentHTML('afterbegin', `<button id="gitlab-helper-branch-cp-btn" data-branch=${branch} class="gl-button btn btn-md btn-primary">复制分支名 🙉</button>`)
      $('#gitlab-helper-branch-cp-btn').onclick = () => {

        GM_setClipboard(branch)
        const msg = `分支名已复制 "${branch}" 🎉`
        log(msg)
        toast(msg, { position: 'middle', level: 'success' })
      }

      const history = $Text('历史', 'a');
      history.classList.remove('btn-default'); history.classList.add('btn-primary')

      return
    }
  }

  function helpMRDetailsPage() {
    const coypBtnHTML = (text) => `
<button class="gl-button btn btn-icon btn-sm btn-default btn-default-tertiary gl-display-none! gl-md-display-inline-block! js-source-branch-copy" title="复制分支名称" aria-label="复制分支名称" aria-live="polite" data-toggle="tooltip" data-placement="bottom" data-container="body" data-clipboard-text="${text}" type="button">
  <svg class="s16 gl-icon gl-button-icon " data-testid="copy-to-clipboard-icon"><use href="/assets/icons-3591e1b0dc5b9091969f4b703f7bdaffa0ca7b2c7953b0f3a7e7dc1e71c3e43d.svg#copy-to-clipboard"></use></svg>
</button>`;

    $$('.merge-request-details .is-merge-request a[title]:not(:has(~ button[data-clipboard-text]))').forEach(a => a.insertAdjacentHTML('afterend', coypBtnHTML(a.title)))
  }

  function helpMergeRequestsPage() {
    const userId = document.querySelector('[data-testid="user_avatar_content"]').src.match(/\/avatar\/\d+/)[0].split('/').at(-1)

    $$(`[data-user-id="${userId}"]`).forEach(e => (e.style.backgroundColor = '#ffff00'))
  }

  function isPureNumberTag(tag) { return !tag.includes('-') }

  function findLatestTags() {
    const query = (parent, selector) => parent.querySelector(selector)
    const text = (parent, selector) => query(parent, selector).textContent

    // 版本号从大到小
    // [['3.0.16-clouddev', '7e375475']]
    function isValidVersion(version) {
      return /^\d+\.\d+\.\d+/.test(version)
    }

    const tagAndCommitTuples = $$('.row-main-content:has(.ref-name)')
    .map(p => isValidVersion(text(p, '.ref-name')) && [text(p, '.ref-name'), text(p, '.commit-sha'), new Date(query(p, '.js-timeago').getAttribute('datetime'))])
    .filter(Boolean)
    .sort(([a], [b]) => compareVersion(b, a));

    // log(tagAndCommitTuples)
    // log(tagAndCommitTuples.map(([tag]) => tag))

    console.assert(compareVersion(tagAndCommitTuples[0][0], tagAndCommitTuples[1][0]) === 1, '版本号必须从大到小', tagAndCommitTuples)
    // log(tags)
    // tag 可能没有 `-` 比如 `1.0.72`
    const removeVersion = (tag) => tag.split('-')[1]
    const box = new Map()

    for (let [tag, commit] of tagAndCommitTuples) {
      const key = removeVersion(tag) || '__PURE_NUMBER_TAG'

      if (!box.has(key)) {
        box.set(key, [tag, commit])
      }
    }

    // log('[findLatestTags] existing tags', box)

    return box
  }

  function getNextTags(lastestTags) {
    return [...lastestTags.values()].map(([tag, commit]) => {
      // 规则：最后一个版本号 + 1
      // 1.0.72 => 1.0.73
      // 1.0.72-foo => 1.0.73-foo
      return [tag.replace(/\.(\d+)(\-|$)/, (m, p1, p2) => `.${Number(p1)+1}${p2}`), commit]
    })
  }
})();
