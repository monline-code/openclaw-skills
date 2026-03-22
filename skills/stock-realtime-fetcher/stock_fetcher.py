#!/usr/bin/env python3
"""
A 股实时行情数据获取工具
支持 5 个数据源自动故障转移：腾讯财经 → 东方财富 → AkShare → Baostock → Tavily
"""

import json
import time
import requests
import re
from datetime import datetime
from typing import Optional, Dict, Any, List

# 数据源优先级（可调整）
DATA_SOURCES = ["tencent", "eastmoney", "akshare", "baostock", "tavily"]
TIMEOUT = 5  # 秒

# Tavily API 配置
TAVILY_API_KEY = ""


def get_tencent_data(symbol: str) -> Optional[Dict[str, Any]]:
    """腾讯财经数据源 - 稳定快速"""
    try:
        # 判断交易所
        if symbol.startswith('6'):
            market = 'sh'
        else:
            market = 'sz'
        
        url = f"http://qt.gtimg.cn/q={market}{symbol}"
        headers = {
            'Referer': 'http://stock.gtimg.cn/',
            'User-Agent': 'Mozilla/5.0'
        }
        
        resp = requests.get(url, headers=headers, timeout=TIMEOUT)
        resp.encoding = 'gbk'
        
        if resp.status_code != 200:
            return None
        
        # 解析数据：v_sh600519="51~贵州茅台~600519~1453.97~..."
        content = resp.text.strip()
        if not content or '=' not in content:
            return None
        
        data_str = content.split('=')[1].strip('"')
        fields = data_str.split('~')
        
        if len(fields) < 32:
            return None
        
        price = float(fields[3]) if fields[3] else 0
        prev_close = float(fields[2]) if fields[2] else price
        change = price - prev_close
        change_pct = (change / prev_close * 100) if prev_close else 0
        
        return {
            'code': symbol,
            'name': fields[1],
            'price': price,
            'change_pct': round(change_pct, 2),
            'change': round(change, 2),
            'volume': int(fields[6]) if fields[6] else 0,
            'amount': float(fields[37]) if len(fields) > 37 and fields[37] else 0,
            'high': float(fields[33]) if len(fields) > 33 and fields[33] else price,
            'low': float(fields[34]) if len(fields) > 34 and fields[34] else price,
            'open': float(fields[5]) if fields[5] else price,
            'prev_close': prev_close,
            'source': 'tencent',
            'update_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
    except Exception as e:
        print(f"腾讯财经获取失败：{e}")
        return None


def get_eastmoney_data(symbol: str) -> Optional[Dict[str, Any]]:
    """东方财富数据源 - 数据全面"""
    try:
        if symbol.startswith('6'):
            market = '1'  # 沪市
        else:
            market = '0'  # 深市
        
        url = f"http://push2.eastmoney.com/api/qt/stock/get?secid={market}.{symbol}&fields=f43,f44,f45,f46,f47,f48,f49,f50,f51,f52,f57,f58,f169,f170"
        headers = {'User-Agent': 'Mozilla/5.0'}
        
        resp = requests.get(url, headers=headers, timeout=TIMEOUT)
        if resp.status_code != 200:
            return None
        
        data = resp.json()
        if not data.get('data'):
            return None
        
        d = data['data']
        price = d.get('f43', 0) / 100  # 价格单位转换
        
        return {
            'code': symbol,
            'name': d.get('f58', ''),
            'price': price,
            'change_pct': d.get('f170', 0),
            'change': d.get('f169', 0) / 100,
            'volume': d.get('f47', 0),
            'amount': d.get('f48', 0),
            'high': d.get('f44', 0) / 100,
            'low': d.get('f45', 0) / 100,
            'open': d.get('f46', 0) / 100,
            'prev_close': d.get('f60', 0) / 100 if d.get('f60') else price,
            'source': 'eastmoney',
            'update_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
    except Exception as e:
        print(f"东方财富获取失败：{e}")
        return None


def get_akshare_data(symbol: str) -> Optional[Dict[str, Any]]:
    """AkShare 数据源 - 有延迟"""
    try:
        import akshare as ak
        
        # 获取实时行情
        df = ak.stock_zh_a_spot_em()
        if df is None or df.empty:
            return None
        
        stock_data = df[df['代码'] == symbol]
        if stock_data.empty:
            return None
        
        row = stock_data.iloc[0]
        return {
            'code': symbol,
            'name': row.get('名称', ''),
            'price': float(row.get('最新价', 0)),
            'change_pct': float(row.get('涨跌幅', 0)),
            'change': float(row.get('涨跌额', 0)),
            'volume': int(row.get('成交量', 0)),
            'amount': float(row.get('成交额', 0)),
            'high': float(row.get('最高', 0)),
            'low': float(row.get('最低', 0)),
            'open': float(row.get('今开', 0)),
            'prev_close': float(row.get('昨收', 0)),
            'source': 'akshare',
            'update_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
    except Exception as e:
        print(f"AkShare 获取失败：{e}")
        return None


def get_baostock_data(symbol: str) -> Optional[Dict[str, Any]]:
    """Baostock 数据源 - 免费免注册"""
    try:
        import baostock as bs
        
        # 登录
        lg = bs.login()
        if lg.error_code != '0':
            return None
        
        # 判断交易所前缀
        if symbol.startswith('6'):
            bs_symbol = f"sh.{symbol}"
        else:
            bs_symbol = f"sz.{symbol}"
        
        # 获取实时行情
        rs = bs.query_realtime_data(code=bs_symbol)
        if rs.error_code != '0' or rs.data.empty:
            bs.logout()
            return None
        
        row = rs.data.iloc[0]
        price = float(row.get('lastPrice', 0))
        prev_close = float(row.get('preClosePrice', 0))
        change = price - prev_close
        change_pct = (change / prev_close * 100) if prev_close else 0
        
        bs.logout()
        
        return {
            'code': symbol,
            'name': row.get('stockName', ''),
            'price': price,
            'change_pct': round(change_pct, 2),
            'change': round(change, 2),
            'volume': int(float(row.get('volume', 0))),
            'amount': float(row.get('amount', 0)),
            'high': float(row.get('highPrice', 0)),
            'low': float(row.get('lowPrice', 0)),
            'open': float(row.get('openPrice', 0)),
            'prev_close': prev_close,
            'source': 'baostock',
            'update_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
    except Exception as e:
        print(f"Baostock 获取失败：{e}")
        return None


def get_tavily_data(symbol: str) -> Optional[Dict[str, Any]]:
    """Tavily 搜索数据源 - 需 API 密钥"""
    try:
        api_key = TAVILY_API_KEY or ""
        if not api_key:
            return None
        
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": api_key,
            "query": f"A 股 {symbol} 股票价格 实时行情",
            "search_depth": "basic",
            "max_results": 3
        }
        
        resp = requests.post(url, json=payload, timeout=TIMEOUT)
        if resp.status_code != 200:
            return None
        
        results = resp.json().get('results', [])
        if not results:
            return None
        
        # 从搜索结果中提取价格信息（简化处理）
        for result in results:
            content = result.get('content', '')
            # 尝试匹配价格
            price_match = re.search(r'(\d+\.\d+)', content)
            if price_match:
                price = float(price_match.group(1))
                return {
                    'code': symbol,
                    'name': f'股票{symbol}',
                    'price': price,
                    'change_pct': 0,
                    'change': 0,
                    'volume': 0,
                    'amount': 0,
                    'high': price,
                    'low': price,
                    'open': price,
                    'prev_close': price,
                    'source': 'tavily',
                    'update_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }
        
        return None
    except Exception as e:
        print(f"Tavily 获取失败：{e}")
        return None


# 数据源函数映射
SOURCE_FUNCTIONS = {
    'tencent': get_tencent_data,
    'eastmoney': get_eastmoney_data,
    'akshare': get_akshare_data,
    'baostock': get_baostock_data,
    'tavily': get_tavily_data
}


def get_stock_data(symbol: str, prefer: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    获取单只股票实时数据（自动故障转移）
    
    Args:
        symbol: 股票代码（如 '600519'）
        prefer: 优先使用的数据源（可选）
    
    Returns:
        股票数据字典，失败返回 None
    """
    # 构建数据源顺序
    sources = DATA_SOURCES.copy()
    if prefer and prefer in sources:
        sources.remove(prefer)
        sources.insert(0, prefer)
    
    print(f"获取 {symbol} 数据，数据源顺序：{' → '.join(sources)}")
    
    # 依次尝试各数据源
    for source in sources:
        func = SOURCE_FUNCTIONS.get(source)
        if not func:
            continue
        
        print(f"  尝试 {source}...", end=" ", flush=True)
        data = func(symbol)
        
        if data and data.get('price', 0) > 0:
            print(f"✅ 成功")
            return data
        else:
            print(f"❌ 失败")
    
    print(f"⚠️ 所有数据源均失败")
    return None


def get_multiple_stocks_data(symbols: List[str], prefer: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
    """
    批量获取多只股票数据
    
    Args:
        symbols: 股票代码列表
        prefer: 优先使用的数据源（可选）
    
    Returns:
        {股票代码：数据字典}
    """
    results = {}
    
    for symbol in symbols:
        data = get_stock_data(symbol, prefer)
        if data:
            results[symbol] = data
        time.sleep(0.2)  # 避免请求过快
    
    return results


def main():
    """命令行入口"""
    import argparse
    
    parser = argparse.ArgumentParser(description='A 股实时行情数据获取工具')
    parser.add_argument('symbols', nargs='+', help='股票代码（如 600519）')
    parser.add_argument('--json', action='store_true', help='JSON 格式输出')
    parser.add_argument('--prefer', choices=DATA_SOURCES, help='优先使用的数据源')
    
    args = parser.parse_args()
    
    if len(args.symbols) == 1:
        data = get_stock_data(args.symbols[0], args.prefer)
        if data:
            if args.json:
                print(json.dumps(data, ensure_ascii=False, indent=2))
            else:
                print(f"\n{data['code']} {data['name']}")
                print(f"  价格：¥{data['price']:.2f}")
                print(f"  涨跌：{data['change_pct']:+.2f}% ({data['change']:+.2f})")
                print(f"  来源：{data['source']}")
                print(f"  时间：{data['update_time']}")
        else:
            print("获取失败")
            exit(1)
    else:
        results = get_multiple_stocks_data(args.symbols, args.prefer)
        if args.json:
            # 简化输出
            output = {}
            for code, data in results.items():
                output[code] = {
                    'name': data['name'],
                    'price': data['price'],
                    'change_pct': data['change_pct'],
                    'source': data['source']
                }
            print(json.dumps(output, ensure_ascii=False, indent=2))
        else:
            print(f"\n成功获取 {len(results)}/{len(args.symbols)} 只股票数据")
            for code, data in results.items():
                print(f"  {code} {data['name']}: ¥{data['price']:.2f} ({data['change_pct']:+.2f}%) [{data['source']}]")


if __name__ == "__main__":
    main()
