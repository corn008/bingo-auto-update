import asyncio
from playwright.async_api import async_playwright
import json
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        responses = []
        page.on("response", lambda response: responses.append(response))
        
        await page.goto("https://www.taiwanlottery.com/lotto/result/bingo_bingo", wait_until="networkidle")
        
        for r in responses:
            if "api.taiwanlottery.com" in r.url or "taiwanlottery" in r.url:
                if "api" in r.url and r.request.resource_type in ["fetch", "xhr"]:
                    print("API URL:", r.url)
                    try:
                        data = await r.json()
                        with open("api_response.json", "w", encoding="utf-8") as f:
                            json.dump(data, f, ensure_ascii=False)
                        print("Saved to api_response.json")
                    except Exception as e:
                        print("Failed to parse JSON for", r.url, e)
                        
        content = await page.content()
        with open("page_content.html", "w", encoding="utf-8") as f:
            f.write(content)
        
        await browser.close()

asyncio.run(main())
