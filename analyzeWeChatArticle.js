// @ts-check
// interface WeChatArticleStats {
//   title: string;
//   publishTime: string;
//   viewCount: number;
//   likeCount: number;
//   shareCount: number;
//   haokanCount: number;
//   commentCount: number;
//   underlineCount: number;
//   rewardCount: number;
//   forwardCount: number;
//   // 动态扩展其他可能的统计字段
//   [key: string]: string | number;
// }

/**
 *
 * @param {HTMLDivElement} articleDom
 * @returns
 */
function analyzeWeChatArticle(articleDom) {
  // 基础结构，初始化为0或空值
  const result = {
    title: '',
    publishTime: '',
    viewCount: 0,
    likeCount: 0,
    shareCount: 0,
    haokanCount: 0,
    commentCount: 0,
    underlineCount: 0,
    rewardCount: 0,
    forwardCount: 0,
  }

  // 1. 提取标题
  const titleElement = articleDom.querySelector('.weui-desktop-mass-appmsg__title span')
  if (titleElement) {
    result.title = titleElement.textContent?.trim() || ''
  }

  // 2. 提取发布时间
  const timeElement = articleDom.querySelector('.weui-desktop-mass__time')
  if (timeElement) {
    result.publishTime = timeElement.textContent?.trim() || ''
  }

  // 3. 动态提取所有appmsg-*统计数据
  const dataItems = articleDom.querySelectorAll('[class*="appmsg-"]')

  dataItems.forEach(item => {
    // 获取包含appmsg-的类名
    const classList = item.className.split(' ')
    const appmsgClass = classList.find(cls => cls.startsWith('appmsg-'))

    if (!appmsgClass) return

    // 提取action部分（去掉appmsg-前缀）
    const action = appmsgClass.replace('appmsg-', '')
    if (!action) return

    // 获取数值
    const valueElement = item.querySelector('.weui-desktop-mass-media__data__inner')
    let valueText = valueElement?.textContent?.trim() || '0'

    // 特殊处理：赞赏金额（包含¥符号）
    if (action === 'reward') {
      // 提取数字部分，保留小数
      const match = valueText.match(/[\d.]+/)
      valueText = match ? match[0] : '0'
    }

    // 清理其他非数字字符（逗号等）
    const cleanedValue = valueText.replace(/[^\d.]/g, '')
    const numericValue = cleanedValue ? parseFloat(cleanedValue) : 0

    // 根据action映射到对应的key
    // Record<string, keyof WeChatArticleStats>
    const keyMap = {
      view: 'viewCount',
      like: 'likeCount',
      share: 'shareCount',
      haokan: 'haokanCount',
      comment: 'commentCount',
      underline: 'underlineCount',
      reward: 'rewardCount',
      forward: 'forwardCount',
    }

    const key = keyMap[action]
    if (key) {
      result[key] = numericValue
    } else {
      // 如果有未映射的action，动态添加到结果中
      result[action] = numericValue
    }
  })

  return result
}

// 使用示例
temp1 = $$('.publish_record_history .weui-desktop-block').map(x => analyzeWeChatArticle(x))

function sortBy(key) {
  return $$('.publish_record_history .weui-desktop-block')
    .map(x => analyzeWeChatArticle(x))
    .sort((x1, x2) => x2[key] - x1[key])
}

// 输出示例：
// {
//   title: "Node.js 自带“加速器” node --run 是否比 Bun 更快？",
//   publishTime: "01月09日",
//   viewCount: 2795,
//   likeCount: 18,
//   shareCount: 20,
//   haokanCount: 2,
//   commentCount: 3,
//   underlineCount: 0,
//   rewardCount: 0,
//   forwardCount: 0
// }
