import asyncio
from playwright.async_api import async_playwright

async def get_latest_bingo():
    async with async_playwright() as p:
        # Launch browser in headless mode
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        bingo_result = None
        
        # Intercept network responses to find the Bingo API
        async def handle_response(response):
            nonlocal bingo_result
            try:
                if "Lottery/LatestBingoResult" in response.url:
                    data = await response.json()
                    bingo_result = data.get('content', {}).get('lotteryBingoLatestPost')
            except Exception as e:
                pass

        page.on("response", handle_response)
        
        print("正在取得最新台灣彩券賓果賓果 (Bingo Bingo) 開獎數據...")
        # Navigate to the bingo result page
        await page.goto("https://www.taiwanlottery.com/lotto/result/bingo_bingo", wait_until="networkidle")
        
        # Wait a moment to ensure API finishes
        await asyncio.sleep(2)
        await browser.close()
        
        if bingo_result:
            print("\n" + "="*40)
            print("🎉 賓果賓果最新開獎結果 🎉")
            print("="*40)
            print(f"期別 (Draw Term): {bingo_result.get('drawTerm')}")
            print(f"開獎時間 (Time): {bingo_result.get('dDate')}")
            
            numbers = bingo_result.get('bigShowOrder', [])
            print(f"\n獎號 (依大小排序): \n{', '.join(numbers)}")
            
            prize = bingo_result.get('prizeNum', {})
            print(f"\n超級獎號 (Super Number): {prize.get('bullEye')}")
            print(f"猜大小 (High/Low): {prize.get('highLow')}")
            print(f"猜單雙 (Odd/Even): {prize.get('oddEven')}")
            print("="*40)
        else:
            print("無法取得開獎資料，請稍後再試。")

if __name__ == "__main__":
    asyncio.run(get_latest_bingo())
