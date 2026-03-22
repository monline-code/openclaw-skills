# stock-realtime-fetcher

A 股实时行情数据获取工具，支持 5 个数据源自动故障转移。

## 快速使用

```bash
# 单只股票
python3 stock_fetcher.py 600519

# 多只股票
python3 stock_fetcher.py 600519 000001 300750

# JSON 格式
python3 stock_fetcher.py 600519 --json

# 指定数据源
python3 stock_fetcher.py 600519 --prefer tencent
```

## 数据源优先级

1. **腾讯财经** ⭐ - 稳定快速，默认首选
2. **东方财富** - 数据全面，备选方案
3. **AkShare** - 历史 K 线，有延迟
4. **Baostock** - 免费免注册
5. **Tavily** - 搜索获取，需 API 密钥

## Python 调用

```python
from stock_fetcher import get_stock_data, get_multiple_stocks_data

# 单只股票
data = get_stock_data("600519")
print(f"贵州茅台：¥{data['price']} ({data['change_pct']:+.2f}%)")

# 批量获取
stocks = get_multiple_stocks_data(["600519", "000001", "300750"])
```

## 返回数据格式

```python
{
    'code': '600519',
    'name': '贵州茅台',
    'price': 1453.97,
    'change_pct': 0.08,
    'change': 1.10,
    'volume': 110,
    'amount': 160105,
    'high': 1462.50,
    'low': 1441.41,
    'open': 1452.96,
    'prev_close': 1452.87,
    'source': 'tencent',
    'update_time': '2026-03-20 10:52:21'
}
```
