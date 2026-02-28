import requests
import json

url = "https://api.taiwanlottery.com/TLCAPIWeB/Lottery/BingoResult"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://www.taiwanlottery.com/lotto/result/bingo_bingo",
    "Origin": "https://www.taiwanlottery.com"
}

try:
    res = requests.get(url, headers=headers)
    print("Status:", res.status_code)
    try:
        data = res.json()
        print("Success! Data keys:", data.keys())
        if 'content' in data:
            print("Number of results:", len(data['content']['bingoBingoRes']))
            with open("bingo_data.json", "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print("Failed to parse JSON:", str(e))
        print("Content sample:", res.text[:200])
except Exception as e:
    print("Request failed:", e)
