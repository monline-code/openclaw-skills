# QUICKSTART - stock-realtime-fetcher

## 30 秒上手

### 1. 测试单只股票

```bash
cd ~/.openclaw/workspace/skills/stock-realtime-fetcher
python3 stock_fetcher.py 600519
```

### 2. 批量获取

```bash
python3 stock_fetcher.py 600519 000001 300750
```

### 3. 集成到 Python 脚本

```python
import sys
sys.path.insert(0, '~/.openclaw/workspace/skills/stock-realtime-fetcher')
from stock_fetcher import get_stock_data

data = get_stock_data("600519")
print(f"价格：¥{data['price']}")
```

## 常见问题

**Q: 所有数据源都失败？**
- 检查网络连接
- 股票代码是否正确
- 是否在交易时间（非交易时间数据可能不更新）

**Q: 如何修改数据源优先级？**
编辑 `stock_fetcher.py` 第 15 行：
```python
DATA_SOURCES = ["tencent", "eastmoney", "akshare", "baostock", "tavily"]
```

**Q: Tavily API 怎么配置？**
编辑 `stock_fetcher.py` 第 19 行，或设置环境变量：
```bash
export TAVILY_API_KEY="tvly-xxx"
```
