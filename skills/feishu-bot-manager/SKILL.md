# Feishu Bot Manager

飞书机器人管理技能，用于管理多个飞书机器人账户，实现基于 app_id 的精确路由和统一管理。

## 功能特性

### 1. 账户管理
- 添加/删除/启用/禁用飞书机器人账户
- 配置账户的 app_id、appSecret 等凭证
- 查看账户状态和连接信息

### 2. 路由管理
- 基于 app_id 的精确消息路由
- 路由映射状态查看
- 路由异常检测和修复

### 3. 状态监控
- 实时查看各账户连接状态
- 消息处理统计
- 错误日志监控

## 使用方法

### 查看账户状态
```
feishu-bot-manager status
```

### 添加新账户
```
feishu-bot-manager add-account --name "NewBot" --app-id "cli_xxx" --app-secret "xxx" --bot-name "New Bot"
```

### 启用/禁用账户
```
feishu-bot-manager enable-account --name "AccountName"
feishu-bot-manager disable-account --name "AccountName"
```

### 查看路由映射
```
feishu-bot-manager show-routing
```

### 重启连接
```
feishu-bot-manager restart-connection --account "AccountName"
```

## 实现细节

### 路由机制
- 利用 OpenClaw 内置的 app_id 路由功能
- 维护 appIdToAccountMap 映射表
- 自动将消息路由到正确的账户处理器

### 配置管理
- 动态更新 openclaw.json 中的飞书账户配置
- 自动重启相关服务以应用更改
- 验证配置的有效性

## 优势

1. **统一管理**：集中管理多个飞书机器人账户
2. **精确路由**：基于 app_id 确保消息正确路由
3. **高可用性**：自动处理连接异常
4. **易于扩展**：轻松添加新账户