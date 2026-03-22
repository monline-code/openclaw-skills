---
invocations:
  - words:
      - 添加飞书机器人
      - 配置飞书机器人
      - 新增飞书账户
      - 添加机器人账户
      - feishu bot
      - 飞书多账户
      - 创建飞书Agent
      - 飞书机器人绑定Agent
    description: 一步到位创建飞书机器人并绑定Agent，支持新建Agent或绑定已有Agent
---

# feishu-bot-manager

飞书机器人配置助手 —— 一步到位完成「创建 Agent + 配置飞书机器人 + 路由绑定」。

## 概述

本 Skill 采用**多机器人方案**：每个飞书机器人对应一个独立 Agent，实现专人专事、各司其职。

相比群聊方案（一个机器人 + 多群聊），多机器人方案的优势：
- 每个机器人有独立名称和头像，辨识度高
- 支持流式输出（群聊模式不支持）
- 支持快捷指令配置
- 可在同一群聊中邀请多个机器人协作

## 前置准备

### 1. 创建飞书机器人
使用飞书官方一键创建链接，会自动配置好权限和回调：
https://open.feishu.cn/page/openclaw?form=multiAgent

创建后记录 **App ID**（cli_xxx）和 **App Secret**。

### 2. 确认要绑定的 Agent
- **已有 Agent**：准备好 Agent ID（可通过 `openclaw agents list` 查看）
- **新建 Agent**：准备好 Agent 的名称、职责描述、使用的模型等信息

## 路由绑定方案

### 方案 1：账户级绑定（推荐）
该飞书机器人的**所有消息** → 指定 Agent

**适用场景**：一个机器人专门服务一个 Agent。例如创建一个"运维机器人"，它的所有消息都由"运维 Agent"处理。

**生成的绑定**：
```json
{ "agentId": "ops", "match": { "channel": "feishu", "accountId": "ops-bot" } }
```

### 方案 2：群聊级绑定
特定群聊的消息 → 指定 Agent

**适用场景**：需要在特定群聊中路由消息到指定 Agent。

**生成的绑定**：
```json
{ "agentId": "ops", "match": { "channel": "feishu", "peer": { "kind": "group", "id": "oc_xxx" } } }
```

**注意**：群聊级绑定优先级更高，会覆盖账户级绑定。

## 使用方式

### 交互模式（推荐）

直接说："添加飞书机器人" 或 "创建飞书Agent"

助手会询问：
1. 选择「绑定已有 Agent」还是「新建 Agent」
2. 如果新建：Agent ID、名称、职责、模型选择
3. 飞书机器人的 App ID 和 App Secret
4. 账户 ID 和机器人显示名称
5. 选择路由绑定方案（账户级/群聊级）
6. 预览完整配置后确认执行

### 命令行调用

```bash
# 绑定已有 Agent（账户级绑定，推荐）
openclaw skills run feishu-bot-manager -- \
  --app-id cli_xxx \
  --app-secret yyy \
  --account-id ops-bot \
  --bot-name "运维机器人" \
  --agent-id ops \
  --routing-mode account

# 新建 Agent 同时绑定（账户级绑定）
openclaw skills run feishu-bot-manager -- \
  --app-id cli_xxx \
  --app-secret yyy \
  --account-id ops-bot \
  --bot-name "运维机器人" \
  --agent-id ops \
  --agent-name "运维专员" \
  --agent-workspace ~/.openclaw/workspace-ops \
  --agent-model "ark/doubao" \
  --create-agent \
  --routing-mode account

# 群聊级绑定
openclaw skills run feishu-bot-manager -- \
  --app-id cli_xxx \
  --app-secret yyy \
  --account-id ops-bot \
  --agent-id ops \
  --chat-id oc_xxx \
  --routing-mode group
```

## 参数说明

| 参数 | 必填 | 说明 |
|------|------|------|
| --app-id | 是 | 飞书 App ID (cli_xxx) |
| --app-secret | 是 | 飞书 App Secret |
| --account-id | 否 | 账户标识，默认使用 agent-id |
| --bot-name | 否 | 机器人显示名称，默认 "Feishu Bot" |
| --dm-policy | 否 | DM 策略: open/pairing/allowlist，默认 open |
| --agent-id | 否 | 要绑定的 Agent ID |
| --create-agent | 否 | 是否新建 Agent，默认 false |
| --agent-name | 否 | 新 Agent 显示名称 |
| --agent-workspace | 否 | 新 Agent 工作区路径，默认 ~/.openclaw/workspace-{agent-id} |
| --agent-model | 否 | 新 Agent 使用的模型，默认 ark/doubao |
| --chat-id | 否 | 群聊 ID (oc_xxx)，群聊绑定时需要 |
| --routing-mode | 否 | 路由模式: account/group，默认 account |

## 完整执行流程

```
1. [可选] 创建新 Agent
   ├── 注册 Agent（openclaw agents add）
   ├── 创建工作区目录
   └── 生成 IDENTITY.md / SOUL.md
        │
2. 备份现有配置 (openclaw.json.backup.时间戳)
        │
3. 添加 Agent 到 agents.list（如新建）
        │
4. 添加飞书账户到 channels.feishu.accounts
        │
5. 添加路由绑定到 bindings
        │
6. 设置 session.dmScope = per-account-channel-peer
        │
7. 重启 Gateway (约 10-30 秒恢复)
        │
8. 验证状态 (openclaw channels status)
```

## 配置结构示例

执行后 openclaw.json 的关键配置：

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "name": "主助手",
        "default": true,
        "workspace": "~/.openclaw/workspace-main",
        "model": { "primary": "ark/doubao" }
      },
      {
        "id": "ops",
        "name": "运维专员",
        "workspace": "~/.openclaw/workspace-ops",
        "model": { "primary": "ark/doubao" }
      }
    ]
  },
  "session": {
    "dmScope": "per-account-channel-peer"
  },
  "channels": {
    "feishu": {
      "enabled": true,
      "appId": "cli_主机器人",
      "appSecret": "主Secret",
      "accounts": {
        "default": {},
        "ops-bot": {
          "appId": "cli_xxx",
          "appSecret": "yyy",
          "botName": "运维机器人",
          "dmPolicy": "open",
          "allowFrom": ["*"],
          "enabled": true
        }
      }
    }
  },
  "bindings": [
    { "agentId": "main", "match": { "channel": "feishu", "accountId": "default" } },
    { "agentId": "ops", "match": { "channel": "feishu", "accountId": "ops-bot" } }
  ]
}
```

## dmPolicy 参考

| 值 | 行为 |
|----|------|
| pairing | 默认。未知用户收到配对码，需要管理员批准 |
| allowlist | 只有 allowFrom 中的用户可以聊天 |
| open | 允许所有用户（需要在 allowFrom 中添加 "*"） |
| disabled | 禁用私聊 |

## 路由优先级

1. 精确匹配：peer.kind + peer.id（特定用户/群组）
2. 父级匹配：线程继承
3. 账户匹配：accountId
4. 渠道匹配：channel + accountId: "*"
5. 默认 Agent：agents.list[].default 或第一个 agent

## 常用命令

| 任务 | 命令 |
|------|------|
| 查看所有 Agent | openclaw agents list |
| 查看路由绑定 | openclaw agents bindings |
| 查看渠道状态 | openclaw channels list |
| 查看日志 | openclaw logs --follow |
| 重启网关 | openclaw gateway restart |
| 故障排查 | openclaw doctor --fix |

## ID 格式参考

| 类型 | 格式 | 示例 |
|------|------|------|
| App ID | cli_xxx | cli_a1b2c3d4e5f6g7h8 |
| 用户 Open ID | ou_xxx | ou_5b990e213988b9bcf396f955a50b2a22 |
| 群组 Chat ID | oc_xxx | oc_83e1c0d069b94efc09ad22e05bc06365 |

## 获取 ID 的方法

- **群组 ID**：启动 Gateway → 在群里 @机器人 → `openclaw logs --follow` 查看 chat_id
- **用户 ID**：启动 Gateway → 私聊机器人 → `openclaw logs --follow` 查看 open_id

## 注意事项

- **保留现有配置**：现有 appId/appSecret 完全不动
- **自动备份**：修改前自动备份 openclaw.json
- **dmScope 设置**：自动设置会话绑定颗粒度为 per-account-channel-peer
- **重启 Gateway**：重启后约 10-30 秒恢复服务
- **恢复方法**：如出问题可用备份文件手动恢复
- **飞书版本**：获取群聊 ID 需要飞书客户端更新到最新版本
