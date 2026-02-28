import asyncio
from playwright.async_api import async_playwright
import json
import datetime
import os

async def scrape_historical_bingo(target_date=None):
    if not target_date:
        target_date = datetime.date.today().strftime("%Y-%m-%d")

    print(f"導向台灣彩券並準備爬取 {target_date} 歷史數據...")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # 1. 前往網站取得 Cookies 與連線授權
        await page.goto("https://www.taiwanlottery.com/lotto/result/bingo_bingo", wait_until="networkidle")
        await asyncio.sleep(2)
        
        # 2. 透過 page.evaluate 執行 JavaScript Fetch 抓取資料
        print("開始在背景頁面透過 API 輪詢抓取所有分頁...")
        
        script = """
        async (dateStr) => {
            let results = [];
            let pageNum = 1;
            let totalSize = -1;
            const pageSize = 50; // Try 50 per page to speed up
            
            while (true) {
                const url = `https://api.taiwanlottery.com/TLCAPIWeB/Lottery/BingoResult?openDate=${dateStr}&pageNum=${pageNum}&pageSize=${pageSize}`;
                
                try {
                    const res = await fetch(url, {
                        headers: {
                            "accept": "application/json, text/plain, */*"
                        }
                    });
                    
                    if (!res.ok) {
                        break;
                    }
                    
                    const data = await res.json();
                    if (!data || !data.content) break;
                    
                    const list = data.content.bingoQueryResult || data.content.lotteryResult || [];
                    if (list.length === 0) break;
                    
                    results = results.concat(list);
                    if (totalSize === -1) totalSize = data.content.totalSize || 0;
                    
                    // console.log(`Fetched page ${pageNum}, total so far: ${results.length}/${totalSize}`);
                    
                    if (results.length >= totalSize || list.length < pageSize) {
                        break;
                    }
                    
                    pageNum++;
                    // sleep 1s
                    await new Promise(r => setTimeout(r, 1000));
                } catch (e) {
                    break;
                }
            }
            
            return {
                all_results: results,
                total_size: totalSize
            };
        }
        """

        try:
            data = await page.evaluate(script, target_date)
            all_results = data.get('all_results', [])
            total_size = data.get('total_size', -1)
            
            if all_results:
                # 依期數由大到小排序
                all_results.sort(key=lambda x: str(x.get('drawTerm', '')), reverse=True)
                
                # 抽取需要的乾淨欄位
                clean_results = []
                for res in all_results:
                    num_list = res.get('bigShowOrder', [])
                    
                    clean_results.append({
                        "期別": res.get('drawTerm', 'N/A'),
                        "獎號 (大小排序)": ", ".join(num_list) if isinstance(num_list, list) else "N/A",
                        "超級獎號": res.get('bullEyeTop', 'N/A'),
                        "猜大小": res.get('highLowTop', 'N/A'),
                        "猜單雙": res.get('oddEvenTop', 'N/A')
                    })
                
                filename = f"bingo_history_{target_date}.json"
                with open(filename, "w", encoding="utf-8") as f:
                    # 使用 ensure_ascii=False 以顯示中文，indent=4 使 JSON 格式排版整齊
                    json.dump(clean_results, f, ensure_ascii=False, indent=4)
                    
                print(f"\\n✅ 總共取得 {len(clean_results)} 筆開獎紀錄 (API回報總共 {total_size} 筆)，已排版並存檔為 {filename}")
                
                # Print top 3 for preview
                print("\\n📌 最近 3 筆開獎預覽：")
                for res in all_results[:3]:
                    term = res.get('drawTerm', 'N/A')
                    num_list = res.get('bigShowOrder', [])
                    nums = ', '.join(num_list) if isinstance(num_list, list) else 'N/A'
                    super_num = res.get('bullEyeTop', 'N/A')
                    print(f"期別: {term} | 獎號: {nums} | 超級獎號: {super_num}")
            else:
                print("❌ 找不到任何資料。")
                
        except Exception as e:
            print(f"爬取過程中發生錯誤：{e}")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_historical_bingo())
