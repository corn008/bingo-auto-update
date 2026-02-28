import asyncio
from playwright.async_api import async_playwright
import json

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        async def handle_response(response):
            try:
                if "api.taiwanlottery.com" in response.url:
                    text = await response.text()
                    print(f"URL: {response.url}")
                    print(f"Data: {text[:200]}")
            except:
                pass

        page.on("response", handle_response)
        
        await page.goto("https://www.taiwanlottery.com/lotto/result/bingo_bingo", wait_until="networkidle")
        await asyncio.sleep(3) # Wait for extra requests
        await browser.close()

asyncio.run(main())
