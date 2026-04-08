---
name: feishu-bot-manager
description: |
统一管理和排查 OpenClaw 中的飞书机器人配置、账号绑定、路由冲突、权限问题与发布检查。

 当以下情况时使用此 Skill：
 (1) 用户要求新增、梳理、统一、清理、对齐多个飞书机器人配置
 (2)需要检查 channels.feishu.accounts、bindings、agentId/accountId 映射是否一致
 (3)需要排查“飞书机器人没回复/串号/消息发错 agent/多个机器人冲突”
 (4)需要检查 openclaw-lark 与 legacy feishu 插件的残留配置是否冲突
 (5)需要输出飞书开放平台侧核对清单（权限、事件订阅、版本发布、白名单）
---

# Feishu Bot Manager

用于把 OpenClaw里的飞书机器人配置整理成一套稳定、可维护的结构，并定位常见故障源。

##适用范围

优先处理以下4 类问题：

1. **账号 / agent绑定不一致**
 - `channels.feishu.accounts.<accountId>` 已存在，但 `bindings` 指向错误 `agentId`
 - `agentId` 大小写错误
 - 存在指向已禁用账号的陈旧绑定

2. **多机器人路由冲突**
 - 多个机器人使用同一 `appId`
 - `defaultAccount` / `default` 残留导致消息被错误路由
 - 一个账号启用，另一个账号绑定却仍存在

3. **插件代际混用**
 - 当前实际使用 `openclaw-lark`
 - 同时保留 legacy `plugins.entries.feishu.enabled=false/true`造成 doctor 告警或认知混乱

4. **飞书开放平台侧问题**
 - 权限未开齐
 - 长链接 /事件订阅未正确配置
 - 没有发布最新版本
 - 卡片交互未开 `card.action.trigger`
 - 白名单 / allowlist 限制导致不可用

## 工作流程

###1.先看 schema，不猜字段

在改配置前先用：
- `gateway.config.schema.lookup path=channels.feishu`
- `gateway.config.schema.lookup path=bindings`

如果要回答某个具体字段，也先查该字段路径。

###2. 获取现状

用：
- `gateway.config.get`
- `session_status`（仅当需要确认当前时间/会话态）
- `exec: openclaw doctor --non-interactive`（若允许）

重点核对：
- `channels.feishu.enabled`
- `channels.feishu.accounts`
- `bindings`
- `agents.list`
- `plugins.entries.openclaw-lark`
- `plugins.entries.feishu`

###3. 判断是否存在配置级硬伤

优先找这些问题：
- `bindings[].match.channel == "feishu"`但 `agentId` 不存在
- `bindings[].match.accountId` 指向 disabled account
- 多个 enabled account 使用同一 `appId`
- `accounts.default.enabled=false`但仍有绑定指向默认账号
- 用户描述的 bot 名称与 accountId / botName / agent 名不一致

###4. 修复原则

用 `gateway.config.patch`，不要整份覆盖。

修复时遵守：
- **少改**：只改能确定的问题
- **保守**：不擅自改密钥
- **显式**：保留一账号一绑定，避免隐式默认路由
- **先清冲突再加新项**

常见修复：
- 修正 `bindings` 中错误的 `agentId`
- 删除指向 disabled account 的陈旧绑定
- 给每个启用账号保留唯一绑定
- 如确认在使用 `openclaw-lark`，可把 legacy `feishu` 插件视为残留项；是否清理要先告知用户

###5. 再区分“本机正常”还是“平台侧异常”

如果出现以下特征，通常说明本机基本正常：
- `doctor` 显示 `Feishu: ok`
- 插件无加载错误
- gateway 正常
-账号结构和 bindings 已一致

此时剩余问题大概率在飞书开放平台侧，应给用户核对清单：
- 应用权限是否开齐
-订阅方式是否为长链接
- 是否已添加需要的事件
- 是否发布最新版本
- DM / 群聊白名单是否拦截

## 输出格式建议

回答用户时建议分成：

1. **已修复项**
2. **当前状态判断**
3. **仍可能存在的问题**
4. **下一步建议**

示例结构：

- 已修复：修正 `WA -> wa`绑定，删除旧 default绑定
- 当前状态：OpenClaw / gateway / Feishu channel运行正常
- 待核查：飞书开放平台权限、事件订阅、版本发布
- 下一步：给出平台侧核对清单，或继续清理 legacy 配置

## 谨慎项

不要在未确认前：
- 替换 `appId/appSecret`
- 批量删除全部飞书配置
- 同时启停多个插件并宣称“肯定不会影响线上”
- 把 doctor 的 legacy 告警直接等同于线上故障

## 推荐收尾动作

完成一次整理后，建议：
-记录每个飞书账号 → `accountId / botName / appId / agentId` 对照表
- 删除确认无用的陈旧绑定
- 若用户希望长期维护，补一个团队内可复用的配置管理/排查 skill
