#!/bin/bash
# skill-feishu-bot-manager.sh - OpenClaw技能入口

# 检查参数
if [ $# -eq 0 ]; then
    echo "飞书机器人管理技能"
    echo "用法: $0 [status|show-routing|add-account|enable-account|disable-account|restart-connection]"
    exit 0
fi

# 调用主要脚本
exec /root/.openclaw/workspace/skills/feishu-bot-manager/scripts/feishu-bot-manager.sh "$@"