// @ts-check
const readline = require('readline');
const dns = require('dns');
const { promisify } = require('util');

// 将 DNS 方法转换为 Promise 版本
const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  // terminal: false
});

// 判断是否为有效的 IPv4 地址
function isValidIPv4(ip) {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;

  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

// 判断是否为有效的 IPv6 地址（简化版）
function isValidIPv6(ip) {
  // 简单的 IPv6 检测，支持完整的 IPv6 地址和压缩格式
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$/;
  return ipv6Regex.test(ip);
}

// 判断是否为域名（不是 IP 地址）
function isDomain(input) {
  const trimmed = input.trim();
  if (isValidIPv4(trimmed) || isValidIPv6(trimmed)) {
    return false;
  }
  // 简单的域名检测
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
  return domainRegex.test(trimmed) && trimmed.includes('.');
}

// 处理单个输入
async function processInput(input) {
  const trimmed = input.trim();

  // 跳过空行
  if (!trimmed) return [];

  // 如果是 IP 地址，直接返回
  if (isValidIPv4(trimmed)) {
    return [`IP ${trimmed}/32`];
  }

  // 如果是 IPv6 地址，直接返回
  if (isValidIPv6(trimmed)) {
    return [`IP ${trimmed}/128`];
  }

  // 如果是域名，解析为 IP
  if (isDomain(trimmed)) {
    try {
      // 尝试解析 A 记录（IPv4）
      try {
        const ipv4Results = await resolve4(trimmed);
        if (ipv4Results && ipv4Results.length > 0) {
          // 有 IPv4 地址，直接返回，不再查询 IPv6
          return ipv4Results.map(ip => `IP ${ip}/32`);
        }
      } catch (err) {
        // 忽略 IPv4 解析错误
      }

      // 尝试解析 AAAA 记录（IPv6）
      try {
        const ipv6Results = await resolve6(trimmed);
        if (ipv6Results && ipv6Results.length > 0) {
          return ipv6Results.map(ip => `IP ${ip}/128`);
        }
      } catch (err) {
        // 忽略 IPv6 解析错误
      }

      console.error(`警告: 无法解析域名 "${trimmed}"`);
      return [];
    } catch (error) {
      console.error(`解析域名 "${trimmed}" 时出错:`, error.message);
      return [];
    }
  }

  // 既不是有效 IP 也不是有效域名
  console.error(`警告: 跳过无效输入 "${trimmed}"`);
  return [];
}

// 主程序
async function main() {
  const inputs: string[] = [];
  console.log('input IP line by line, press Enter to finish');
  console.log();

  // 收集所有输入行
  rl.on('line', (line) => {
    // console.log('line:', line);
    line.trim() && inputs.push(line.trim());

    // if enter is pressed
    if (line === '' && inputs.length > 0) {
      console.log('Enter is pressed, start processing...');
      console.log();
      rl.close();
      start();
    }
  });

  async function start() {
    // console.log('close:', close);
    const results = [];
    console.log('inputs:', inputs);

    for (const input of inputs) {
      const processed = await processInput(input);
      console.log(input, '→', processed);
      results.push(...processed);
    }

    // 输出结果
    if (results.length > 0) {
      console.log();
      console.log(results.join('\n'));
    }
  }
}

// 运行主程序
main().catch(error => {
  console.error('程序执行出错:', error);
  process.exit(1);
});
