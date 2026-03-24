#!/bin/bash
# feishu-bot-manager.sh - 飞书机器人管理技能

set -e

CONFIG_FILE="$HOME/.openclaw/openclaw.json"
TEMP_CONFIG="/tmp/openclaw.json.tmp"
LOG_FILE="/tmp/openclaw/openclaw-$(date +%Y-%m-%d).log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要命令是否存在
check_dependencies() {
    if ! command -v jq &> /dev/null; then
        print_error "jq is required but not installed. Please install jq first."
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        print_error "curl is required but not installed. Please install curl first."
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "飞书机器人管理工具"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  status                        显示所有账户状态"
    echo "  show-routing                  显示 app_id 路由映射"
    echo "  add-account --name NAME --app-id APP_ID --app-secret SECRET --bot-name BOT_NAME"
    echo "                                添加新账户"
    echo "  enable-account --name NAME    启用账户"
    echo "  disable-account --name NAME   禁用账户"
    echo "  restart-connection --account ACCOUNT"
    echo "                                重启账户连接"
    echo "  -h, --help                   显示此帮助信息"
    echo ""
}

# 显示账户状态
show_status() {
    print_info "正在获取飞书账户状态..."
    
    if [ ! -f "$CONFIG_FILE" ]; then
        print_error "配置文件不存在: $CONFIG_FILE"
        return 1
    fi
    
    # 获取所有账户信息
    ACCOUNTS=$(jq -r '.channels.feishu.accounts | to_entries[] | select(.value.appId) | "\(.key):\(.value.enabled):\(.value.appId):\(.value.botName):\(.value.dmPolicy)"' "$CONFIG_FILE" 2>/dev/null || echo "")
    
    if [ -z "$ACCOUNTS" ]; then
        print_warning "未找到飞书账户配置"
        return 0
    fi
    
    echo "账户状态列表:"
    echo "┌─────────────────────────────────────────────────────────────────────┐"
    printf "%-15s %-8s %-25s %-15s\n" "账户名" "状态" "App ID" "机器人名称"
    echo "├─────────────────────────────────────────────────────────────────────┤"
    
    # 用awk格式化输出
    echo "$ACCOUNTS" | awk -F':' '
    BEGIN {
        enabled_color = "\033[0;32m"
        disabled_color = "\033[0;31m"
        nc = "\033[0m"
    }
    {
        status = ($2 == "true" ? enabled_color "启用" nc : disabled_color "禁用" nc)
        printf "%-15s %-8s %-25s %-15s\n", $1, status, $3, $4
    }'
    
    echo "└─────────────────────────────────────────────────────────────────────┘"
    
    # 检查网关连接状态
    if curl -sf http://127.0.0.1:18789/ > /dev/null 2>&1; then
        print_success "网关服务运行正常"
        
        # 检查日志中的连接信息
        if [ -f "$LOG_FILE" ]; then
            echo ""
            echo "最近的 WebSocket 连接状态:"
            grep -i "feishu\[" "$LOG_FILE" 2>/dev/null | grep -i "websocket client started" | tail -5 | while read -r line; do
                TIMESTAMP=$(echo "$line" | grep -oP '"time":"\K[^"]*')
                INFO=$(echo "$line" | grep -oP '"1":"\K[^"]*')
                echo "  $TIMESTAMP - $INFO"
            done
        fi
    else
        print_error "网关服务未运行"
    fi
}

# 显示路由映射
show_routing() {
    print_info "正在获取路由映射信息..."
    
    if [ -f "$LOG_FILE" ]; then
        echo "路由映射信息:"
        ROUTING_LINES=$(grep -i "registered app_id routing" "$LOG_FILE" 2>/dev/null || true)
        
        if [ -n "$ROUTING_LINES" ]; then
            echo "$ROUTING_LINES" | while read -r line; do
                INFO=$(echo "$line" | grep -oP '"1":"\K[^"]*')
                echo "  $INFO"
            done
        else
            print_warning "未找到路由注册信息，可能路由功能尚未激活"
            
            # 尝试从配置中获取信息
            ACCOUNTS=$(jq -r '.channels.feishu.accounts | to_entries[] | select(.value.appId) | "\(.key) -> \(.value.appId)"' "$CONFIG_FILE" 2>/dev/null || echo "")
            if [ -n "$ACCOUNTS" ]; then
                echo "配置中的账户-AppID映射:"
                echo "$ACCOUNTS" | while read -r line; do
                    echo "  $line"
                done
            fi
        fi
    else
        print_warning "日志文件不存在: $LOG_FILE"
    fi
}

# 添加新账户
add_account() {
    local name=""
    local app_id=""
    local app_secret=""
    local bot_name=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --name)
                name="$2"
                shift 2
                ;;
            --app-id)
                app_id="$2"
                shift 2
                ;;
            --app-secret)
                app_secret="$2"
                shift 2
                ;;
            --bot-name)
                bot_name="$2"
                shift 2
                ;;
            *)
                print_error "未知参数: $1"
                return 1
                ;;
        esac
    done
    
    if [ -z "$name" ] || [ -z "$app_id" ] || [ -z "$app_secret" ] || [ -z "$bot_name" ]; then
        print_error "所有参数都是必需的: --name, --app-id, --app-secret, --bot-name"
        return 1
    fi
    
    print_info "正在添加账户: $name"
    
    # 检查账户是否已存在
    if jq -e ".channels.feishu.accounts.\"$name\"" "$CONFIG_FILE" > /dev/null 2>&1; then
        print_error "账户 $name 已存在"
        return 1
    fi
    
    # 创建新的账户配置
    cp "$CONFIG_FILE" "$TEMP_CONFIG"
    
    jq --arg name "$name" --arg app_id "$app_id" --arg app_secret "$app_secret" --arg bot_name "$bot_name" '
        .channels.feishu.accounts[$name] = {
            "appId": $app_id,
            "appSecret": $app_secret,
            "botName": $bot_name,
            "dmPolicy": "open",
            "allowFrom": ["*"],
            "enabled": true
        }
    ' "$TEMP_CONFIG" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
    
    print_success "账户 $name 已添加并启用"
    
    # 重启网关使配置生效
    print_info "正在重启网关以应用新配置..."
    pkill -f openclaw-gateway || true
    sleep 3
    timeout 30s openclaw gateway --port 18789 &
    
    print_success "配置已应用，网关已重启"
}

# 启用账户
enable_account() {
    local name=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --name)
                name="$2"
                shift 2
                ;;
            *)
                print_error "未知参数: $1"
                return 1
                ;;
        esac
    done
    
    if [ -z "$name" ]; then
        print_error "必须指定账户名称: --name NAME"
        return 1
    fi
    
    print_info "正在启用账户: $name"
    
    # 检查账户是否存在
    if ! jq -e ".channels.feishu.accounts.\"$name\"" "$CONFIG_FILE" > /dev/null 2>&1; then
        print_error "账户 $name 不存在"
        return 1
    fi
    
    cp "$CONFIG_FILE" "$TEMP_CONFIG"
    
    jq --arg name "$name" '
        .channels.feishu.accounts[$name].enabled = true
    ' "$TEMP_CONFIG" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
    
    print_success "账户 $name 已启用"
    
    # 重启网关使配置生效
    print_info "正在重启网关以应用新配置..."
    pkill -f openclaw-gateway || true
    sleep 3
    timeout 30s openclaw gateway --port 18789 &
    
    print_success "配置已应用，网关已重启"
}

# 禁用账户
disable_account() {
    local name=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --name)
                name="$2"
                shift 2
                ;;
            *)
                print_error "未知参数: $1"
                return 1
                ;;
        esac
    done
    
    if [ -z "$name" ]; then
        print_error "必须指定账户名称: --name NAME"
        return 1
    fi
    
    print_info "正在禁用账户: $name"
    
    # 检查账户是否存在
    if ! jq -e ".channels.feishu.accounts.\"$name\"" "$CONFIG_FILE" > /dev/null 2>&1; then
        print_error "账户 $name 不存在"
        return 1
    fi
    
    cp "$CONFIG_FILE" "$TEMP_CONFIG"
    
    jq --arg name "$name" '
        .channels.feishu.accounts[$name].enabled = false
    ' "$TEMP_CONFIG" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
    
    print_success "账户 $name 已禁用"
    
    # 重启网关使配置生效
    print_info "正在重启网关以应用新配置..."
    pkill -f openclaw-gateway || true
    sleep 3
    timeout 30s openclaw gateway --port 18789 &
    
    print_success "配置已应用，网关已重启"
}

# 重启账户连接
restart_connection() {
    local account=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --account)
                account="$2"
                shift 2
                ;;
            *)
                print_error "未知参数: $1"
                return 1
                ;;
        esac
    done
    
    if [ -z "$account" ]; then
        print_error "必须指定账户名称: --account ACCOUNT"
        return 1
    fi
    
    print_info "正在重启账户 $account 的连接"
    
    # 通过重启网关来重启连接
    print_info "正在重启网关以重置连接..."
    pkill -f openclaw-gateway || true
    sleep 5
    timeout 30s openclaw gateway --port 18789 &
    
    print_success "连接已重启"
}

# 主函数
main() {
    check_dependencies
    
    if [ $# -eq 0 ]; then
        show_help
        exit 0
    fi
    
    case $1 in
        "status")
            show_status
            ;;
        "show-routing")
            show_routing
            ;;
        "add-account")
            shift
            add_account "$@"
            ;;
        "enable-account")
            shift
            enable_account "$@"
            ;;
        "disable-account")
            shift
            disable_account "$@"
            ;;
        "restart-connection")
            shift
            restart_connection "$@"
            ;;
        "-h"|"--help")
            show_help
            ;;
        *)
            print_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"