import asyncio
from playwright.async_api import async_playwright
import json

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        all_responses = {}
        
        async def handle_response(response):
            try:
                if "api.taiwanlottery.com" in response.url:
                    json_data = await response.json()
                    all_responses[response.url] = json_data
            except Exception as e:
                pass

        page.on("response", handle_response)
        
        print("Navigating...")
        await page.goto("https://www.taiwanlottery.com/lotto/result/bingo_bingo", wait_until="networkidle")
        await asyncio.sleep(5)
        
        with open("all_api.json", "w", encoding="utf-8") as f:
            json.dump(all_responses, f, ensure_ascii=False, indent=2)
            
        print(f"Saved {len(all_responses)} responses.")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
