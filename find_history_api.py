import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        async def handle_request(request):
            if "taiwanlottery.com/TLCAPIWeB" in request.url:
                print(f"\n[{request.method}] {request.url}")
                if request.post_data:
                    print(f"Payload: {request.post_data}")

        page.on("request", handle_request)
        print("Navigating to Taiwan Lottery...")
        await page.goto("https://www.taiwanlottery.com/lotto/result/bingo_bingo", wait_until="networkidle")
        await asyncio.sleep(2)
        
        print("\nButtons available on page:")
        buttons = await page.locator("button").all()
        for b in buttons:
            try:
                text = await b.text_content()
                print(f"- {text.strip()}")
                if text and "查詢" in text:
                    print(f"--> Clicking '{text.strip()}'...")
                    await b.click()
                    await asyncio.sleep(2)
            except:
                pass
                
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
