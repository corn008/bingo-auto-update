import os
import sys
import json
import datetime
import requests
from bs4 import BeautifulSoup

def scrape_historical_bingo(target_date=None):
    if target_date is None:
        if len(sys.argv) > 1:
            target_date = sys.argv[1]
        else:
            target_date = datetime.date.today().strftime("%Y-%m-%d")
            
    # Format date for AUZO url: YYYYMMDD
    date_formatted = target_date.replace("-", "")
    
    # Using auzonet data
    url = f"https://lotto.auzonet.com/bingobingo/list_{date_formatted}.html"
    print(f"🔄 正在從奧索樂透網抓取 {target_date} ({date_formatted}) 的資料...")
    print(f"🌐 來源網址: {url}")
    
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        res = requests.get(url, headers=headers, timeout=15)
        
        if res.status_code != 200:
            print(f"❌ 抓取失敗，伺服器回傳狀態碼: {res.status_code}")
            return
            
        # 由於網頁是 UTF-8, requests 可能會誤判
        res.encoding = 'utf-8'
        html_content = res.text
        
        soup = BeautifulSoup(html_content, 'html.parser')
        
        rows = soup.find_all('tr', class_='bingo_row')
        
        clean_results = []
        for row in rows:
            tds = row.find_all('td')
            if len(tds) < 5:
                continue
                
            # 1. 抓取期別
            period_el = tds[0].find('b')
            if not period_el:
                continue
            period = period_el.text.strip()
            
            # 2. 抓取號碼與超級獎號
            number_divs = tds[1].find_all('div')
            nums = []
            super_num = "－"
            for div in number_divs:
                num = div.text.strip()
                if not num: 
                    continue
                nums.append(num)
                
                # 奧索樂透網的「超級獎號」CSS class 結尾通常帶有 's' (例如 bbrps, bbns 等)
                cls_list = div.get('class', [])
                if cls_list and any(c.endswith('s') for c in cls_list):
                    super_num = num
            
            # 安全防呆：如果沒滿 20 個號碼可能當期有問題或還沒全開，但還是照抓
            nums.sort(key=lambda x: int(x))
            
            # 3. 抓取大小單雙
            high_low = tds[3].text.strip()
            odd_even = tds[4].text.strip()
            
            if not high_low: high_low = "－"
            if not odd_even: odd_even = "－"
            
            clean_results.append({
                "期別": period,
                "獎號 (大小排序)": ", ".join(nums) if nums else "N/A",
                "超級獎號": super_num,
                "猜大小": high_low,
                "猜單雙": odd_even
            })
            
        if clean_results:
            filename = f"bingo_history_{target_date}.json"
            # 以期別大到小排序 (越新的在前面)
            clean_results.sort(key=lambda x: int(x['期別']), reverse=True)
            
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(clean_results, f, ensure_ascii=False, indent=4)
                
            print(f"\\n✅ 總共取得 {len(clean_results)} 筆開獎紀錄。已採用奧索樂透網資料源更新！存檔為 {filename}")
            
            # Print top 3 for preview
            print("\\n📌 最近 3 筆開獎預覽：")
            for res in clean_results[:3]:
                term = res.get('期別', 'N/A')
                nums = res.get('獎號 (大小排序)', 'N/A')
                super_num = res.get('超級獎號', 'N/A')
                print(f"期別: {term} | 獎號: {nums} | 超級獎號: {super_num}")
                
        else:
            print(f"❌ 找不到 {target_date} 的任何開獎紀錄，當天可能未開獎或來源網頁更改了格式。")

    except Exception as e:
        print(f"爬取過程中發生錯誤：{e}")

if __name__ == "__main__":
    scrape_historical_bingo()
