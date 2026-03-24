# feishu-bot-manager 技能

## 概述
飞书机器人管理技能，用于管理和监控多个飞书机器人账户，实现基于 app_id 的精确路由和统一管理。

## 功能特性

### 1. 账户管理
- 查看所有飞书账户的状态（名称、启用状态、app_id、机器人名称）
- 启用/禁用特定账户
- 添加新账户配置

### 2. 路由管理
- 显示 app_id 到账户名的路由映射
- 确保消息根据 app_id 精确路由到正确的机器人

### 3. 连接管理
- 重启特定账户的连接
- 监控 WebSocket 连接状态

## 使用方法

### 查看账户状态
```bash
feishu-bot-manager status
```

### 查看路由映射
```bash
feishu-bot-manager show-routing
```

### 启用账户
```bash
feishu-bot-manager enable-account --name "AccountName"
```

### 禁用账户
```bash
feishu-bot-manager disable-account --name "AccountName"
```

### 重启连接
```bash
feishu-bot-manager restart-connection --account "AccountName"
```

## 技术实现

该技能利用了 OpenClaw 内置的飞书通道功能（gateway/channels/feishu）和 app_id 路由机制，无需额外插件。它通过修改 openclaw.json 配置文件来管理账户状态，并通过重启网关服务使配置生效。

## 优势

1. **集中管理**：统一管理多个飞书机器人账户
2. **精确路由**：基于 app_id 确保消息不会错乱
3. **实时监控**：查看连接状态和路由信息
4. **易于使用**：简单命令行界面