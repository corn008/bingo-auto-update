import asyncio
from playwright.async_api import async_playwright

async def check():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("https://www.taiwanlottery.com/lotto/result/bingo_bingo", wait_until="networkidle")
        await asyncio.sleep(2)
        
        # click search first
        buttons = await page.locator("button").all()
        for b in buttons:
            try:
                if "查詢" in await b.text_content():
                    await b.click()
                    break
            except:
                pass
                
        await asyncio.sleep(2)
        
        await asyncio.sleep(2)
        html = await page.content()
        with open("bingo_page.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("Done")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(check())
