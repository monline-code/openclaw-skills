#!/usr/bin/env node
/**
 * feishu-bot-manager
 * 飞书机器人配置助手 —— 一步到位完成「创建 Agent + 配置飞书机器人 + 路由绑定」
 *
 * 支持的操作：
 * 1. 新建 Agent 并绑定飞书机器人
 * 2. 将已有 Agent 绑定到新的飞书机器人
 *
 * 支持的路由绑定方案：
 * 1. 账户级绑定（推荐）- 该飞书机器人的所有消息路由到指定 Agent
 * 2. 群聊级绑定 - 特定群聊的消息路由到指定 Agent
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置路径
const CONFIG_PATH = path.join(process.env.HOME, '.openclaw', 'openclaw.json');
const BACKUP_DIR = path.join(process.env.HOME, '.openclaw', 'backups');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[OK]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERR]${colors.reset} ${msg}`),
  step: (num, total, msg) => console.log(`\n${colors.cyan}[${num}/${total}]${colors.reset} ${msg}`),
  preview: (msg) => console.log(`${colors.gray}${msg}${colors.reset}`),
  bold: (msg) => console.log(`${colors.bold}${msg}${colors.reset}`)
};

// ==================== 配置读写 ====================

function loadConfig() {
  try {
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    log.error(`读取配置失败: ${err.message}`);
    process.exit(1);
  }
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (err) {
    log.error(`保存配置失败: ${err.message}`);
    return false;
  }
}

function createBackup() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `openclaw.json.${timestamp}`);
    fs.copyFileSync(CONFIG_PATH, backupPath);
    return backupPath;
  } catch (err) {
    log.error(`创建备份失败: ${err.message}`);
    return null;
  }
}

// ==================== Agent 创建 ====================

function createAgent(options) {
  const { agentid, agentname, agentworkspace, agentmodel } = options;
  const workspace = agentworkspace || path.join(process.env.HOME, '.openclaw', `workspace-${agentid}`);

  log.info(`创建 Agent: ${agentid} (${agentname || agentid})`);

  // 创建工作区目录
  if (!fs.existsSync(workspace)) {
    fs.mkdirSync(workspace, { recursive: true });
    log.success(`工作区已创建: ${workspace}`);
  }

  // 创建 IDENTITY.md
  const identityContent = `# IDENTITY.md - ${agentname || agentid}

- **Name**: ${agentname || agentid}
- **ID**: ${agentid}

## 我的职责

根据用户需求提供专业服务。

## 我的风格

专业、高效、友好。
`;
  const identityPath = path.join(workspace, 'IDENTITY.md');
  if (!fs.existsSync(identityPath)) {
    fs.writeFileSync(identityPath, identityContent, 'utf8');
    log.success('IDENTITY.md 已创建');
  }

  // 创建 SOUL.md
  const soulContent = `# SOUL.md - ${agentname || agentid}

## 核心信条

专业高效，用户至上。

## 我是谁

我是 ${agentname || agentid}，专注于为用户提供高质量的服务。

## 沟通风格

- 回复清晰、有条理
- 主动确认需求
- 遇到问题及时反馈

## 工作原则

1. 先理解需求，再执行
2. 结果导向，注重质量
3. 遇到不确定的情况，主动询问
`;
  const soulPath = path.join(workspace, 'SOUL.md');
  if (!fs.existsSync(soulPath)) {
    fs.writeFileSync(soulPath, soulContent, 'utf8');
    log.success('SOUL.md 已创建');
  }

  // 使用 openclaw 命令注册 Agent
  try {
    execSync(`openclaw agents add ${agentid} --workspace "${workspace}" --non-interactive`, { stdio: 'pipe' });
    log.success(`Agent ${agentid} 已通过 openclaw 注册`);
  } catch (err) {
    // Agent 可能已存在，尝试继续
    if (err.message.includes('already exists')) {
      log.warning(`Agent ${agentid} 已存在，跳过注册`);
    } else {
      log.warning(`openclaw agents add 失败: ${err.message}`);
      log.info('将直接在配置文件中添加 Agent');
    }
  }

  return { workspace, model: agentmodel || 'ark/doubao' };
}

// ==================== 配置更新 ====================

function addAgentToConfig(config, options, agentInfo) {
  const { agentid, agentname } = options;

  // 确保 agents.list 存在
  if (!config.agents) config.agents = {};
  if (!config.agents.list) config.agents.list = [];

  // 检查是否已存在
  const existing = config.agents.list.find(a => a.id === agentid);
  if (existing) {
    log.warning(`Agent ${agentid} 已在 agents.list 中，跳过添加`);
    return;
  }

  const agentEntry = {
    id: agentid,
    name: agentname || agentid,
    workspace: agentInfo.workspace,
    model: { primary: agentInfo.model }
  };

  config.agents.list.push(agentEntry);
  log.success(`Agent ${agentid} 已添加到 agents.list`);
}

function addFeishuAccount(config, options) {
  const { appid, appsecret, accountid, agentid, botname, dmpolicy } = options;
  const accId = accountid || agentid || `bot-${Date.now()}`;

  // 确保 channels.feishu 存在
  if (!config.channels) config.channels = {};
  if (!config.channels.feishu) config.channels.feishu = { enabled: true };
  if (!config.channels.feishu.accounts) config.channels.feishu.accounts = {};

  // 确保 default 账户存在
  if (!config.channels.feishu.accounts.default) {
    config.channels.feishu.accounts.default = {};
    log.info('已添加 default 账户映射');
  }

  // 添加新账户
  config.channels.feishu.accounts[accId] = {
    appId: appid,
    appSecret: appsecret,
    botName: botname || 'Feishu Bot',
    dmPolicy: dmpolicy || 'open',
    allowFrom: ['*'],
    enabled: true
  };

  log.success(`飞书账户 ${accId} 已添加`);
  return accId;
}

function addBinding(config, options, accountId) {
  const { agentid, chatid, routingmode } = options;
  const mode = routingmode || 'account';

  if (!config.bindings) config.bindings = [];
  if (!agentid) {
    log.warning('未指定 agent-id，跳过路由绑定');
    return;
  }

  if (mode === 'account') {
    // 检查是否已存在相同的账户级绑定
    const exists = config.bindings.some(b =>
      b.agentId === agentid && b.match?.channel === 'feishu' && b.match?.accountId === accountId
    );
    if (exists) {
      log.warning(`账户级绑定已存在: ${agentid} <- ${accountId}`);
      return;
    }
    config.bindings.push({
      agentId: agentid,
      match: { channel: 'feishu', accountId: accountId }
    });
    log.success(`已添加账户级绑定: ${agentid} <- ${accountId}`);
  } else if (mode === 'group') {
    if (!chatid) {
      log.error('群聊级绑定需要提供 --chat-id');
      return;
    }
    const exists = config.bindings.some(b =>
      b.agentId === agentid && b.match?.peer?.id === chatid
    );
    if (exists) {
      log.warning(`群聊级绑定已存在: ${agentid} <- ${chatid}`);
      return;
    }
    config.bindings.push({
      agentId: agentid,
      match: { channel: 'feishu', peer: { kind: 'group', id: chatid } }
    });
    log.success(`已添加群聊级绑定: ${agentid} <- ${chatid}`);
  }
}

function setDmScope() {
  log.info('设置会话隔离: per-account-channel-peer');
  try {
    execSync('openclaw config set session.dmScope "per-account-channel-peer"', { stdio: 'pipe' });
    log.success('会话隔离已设置');
  } catch (err) {
    log.warning('设置 dmScope 失败，请手动执行:');
    console.log('  openclaw config set session.dmScope "per-account-channel-peer"');
  }
}

function restartGateway() {
  log.warning('正在重启 Gateway（约 10-30 秒恢复）...');
  try {
    execSync('openclaw gateway restart', { stdio: 'inherit' });
    log.success('Gateway 重启完成');
  } catch (err) {
    log.error(`重启失败: ${err.message}`);
    log.info('请手动执行: openclaw gateway restart');
  }
}

// ==================== 主流程 ====================

function run(options) {
  console.log(`\n${colors.bold}飞书机器人配置助手${colors.reset}\n`);

  const {
    appid, appsecret, agentid,
    createagent, routingmode
  } = options;

  if (!appid || !appsecret) {
    log.error('请提供 --app-id 和 --app-secret');
    process.exit(1);
  }

  const isCreateAgent = createagent === 'true' || createagent === true;
  const totalSteps = isCreateAgent ? 7 : 5;
  let step = 1;

  // Step 1: 备份
  log.step(step++, totalSteps, '备份现有配置');
  const backupPath = createBackup();
  if (backupPath) {
    log.success(`配置已备份: ${path.basename(backupPath)}`);
  }

  // Step 2: [可选] 创建 Agent
  let agentInfo = null;
  if (isCreateAgent) {
    log.step(step++, totalSteps, '创建 Agent');
    if (!agentid) {
      log.error('新建 Agent 需要提供 --agent-id');
      process.exit(1);
    }
    agentInfo = createAgent(options);

    log.step(step++, totalSteps, '添加 Agent 到配置');
    const config = loadConfig();
    addAgentToConfig(config, options, agentInfo);
    saveConfig(config);
  }

  // Step N: 添加飞书账户
  log.step(step++, totalSteps, '添加飞书机器人账户');
  const config = loadConfig();
  const accountId = addFeishuAccount(config, options);

  // Step N+1: 添加路由绑定
  log.step(step++, totalSteps, '配置路由绑定');
  addBinding(config, options, accountId);
  saveConfig(config);

  // Step N+2: 设置 dmScope
  log.step(step++, totalSteps, '设置会话隔离');
  setDmScope();

  // Step N+3: 重启 Gateway
  log.step(step++, totalSteps, '重启 Gateway');
  restartGateway();

  // 完成摘要
  const mode = routingmode || 'account';
  console.log('\n' + '='.repeat(50));
  log.success('配置完成！');
  console.log(`
配置摘要:
  Agent ID:    ${agentid || '(未指定)'}
  账户 ID:     ${accountId}
  机器人名称:  ${options.botname || 'Feishu Bot'}
  路由模式:    ${mode === 'account' ? '账户级绑定' : '群聊级绑定'}${options.chatid ? `\n  群聊 ID:     ${options.chatid}` : ''}
  新建 Agent:  ${isCreateAgent ? '是' : '否'}${agentInfo ? `\n  工作区:      ${agentInfo.workspace}\n  模型:        ${agentInfo.model}` : ''}

如配置有误，可从备份恢复:
  cp ${backupPath} ${CONFIG_PATH}
`);
  console.log('='.repeat(50) + '\n');
}

// ==================== 命令行解析 ====================

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-/g, '');
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
      options[key] = value;
      if (value !== 'true') i++;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
${colors.bold}飞书机器人配置助手${colors.reset}
一步到位完成「创建 Agent + 配置飞书机器人 + 路由绑定」

${colors.bold}用法:${colors.reset}
  node index.js [选项]

${colors.bold}必填参数:${colors.reset}
  --app-id <id>              飞书 App ID (cli_xxx)
  --app-secret <secret>      飞书 App Secret

${colors.bold}Agent 参数:${colors.reset}
  --agent-id <id>            Agent ID（绑定已有 / 新建均需要）
  --create-agent             新建 Agent（否则绑定已有 Agent）
  --agent-name <name>        新 Agent 显示名称
  --agent-workspace <path>   新 Agent 工作区路径
  --agent-model <model>      新 Agent 模型（默认 ark/doubao）

${colors.bold}飞书账户参数:${colors.reset}
  --account-id <id>          账户标识（默认使用 agent-id）
  --bot-name <name>          机器人显示名称
  --dm-policy <policy>       DM 策略: open/pairing/allowlist（默认 open）

${colors.bold}路由参数:${colors.reset}
  --routing-mode <mode>      路由模式: account/group（默认 account）
  --chat-id <id>             群聊 ID oc_xxx（群聊绑定时需要）

${colors.bold}示例:${colors.reset}

  ${colors.cyan}# 绑定已有 Agent（推荐：账户级绑定）${colors.reset}
  node index.js --app-id cli_xxx --app-secret yyy --agent-id ops --bot-name "运维机器人"

  ${colors.cyan}# 新建 Agent 同时绑定${colors.reset}
  node index.js --app-id cli_xxx --app-secret yyy --agent-id ops --agent-name "运维专员" --create-agent

  ${colors.cyan}# 群聊级绑定${colors.reset}
  node index.js --app-id cli_xxx --app-secret yyy --agent-id ops --chat-id oc_xxx --routing-mode group
`);
}

// ==================== 入口 ====================

const options = parseArgs();

if (options.help || options.h) {
  showHelp();
  process.exit(0);
}

if (options.appid) {
  run(options);
} else {
  log.error('请提供 --app-id 和 --app-secret');
  log.info('使用 --help 查看完整用法');
  process.exit(1);
}
