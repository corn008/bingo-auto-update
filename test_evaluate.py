import asyncio
from playwright.async_api import async_playwright
import json

async def fetch_page_data():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        # Navigate to the page to get cookies and context
        await page.goto("https://www.taiwanlottery.com/lotto/result/bingo_bingo", wait_until="networkidle")
        await asyncio.sleep(2)

        # Do a fetch from page for pageNum 2
        result = await page.evaluate('''async () => {
            const url = "https://api.taiwanlottery.com/TLCAPIWeB/Lottery/BingoResult?openDate=2026-02-28&pageNum=2&pageSize=10";
            const response = await fetch(url, {
                headers: {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                    "sec-ch-ua": "\\"Not_A Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"120\\", \\"Google Chrome\\";v=\\"120\\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-site"
                },
                method: "GET"
            });
            return await response.json();
        }''')
        
        print("Page 2 fetch result keys:", result.keys())
        if "content" in result:
            items = result["content"].get("bingoQueryResult", [])
            print("Found items on page 2:", len(items))
            if items:
                print("First item term:", items[0].get("drawTerm"))
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(fetch_page_data())
