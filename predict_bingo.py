import json
from collections import Counter
import pprint
import random
import datetime

def analyze_and_predict():
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    filename = f"bingo_history_{today_str}.json"
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"找不到今天的資料檔: {filename}")
        return

    all_nums = []
    super_nums = []
    
    for draw in data:
        nums_str = draw.get("獎號 (大小排序)", "")
        if nums_str and nums_str != "N/A":
            nums = [n.strip() for n in nums_str.split(',')]
            all_nums.extend(nums)
        
        super_num = draw.get("超級獎號", "")
        if super_num and super_num != "N/A" and super_num != "－":
            super_nums.append(super_num.strip())

    total_draws = len(data)
    print(f"\\n📊 今日總共分析期數: {total_draws} 期 ({today_str})")
    print("-" * 40)
    
    # 計算每個號碼出現的次數
    num_counts = Counter(all_nums)
    super_counts = Counter(super_nums)
    
    # 排序：最常出現 (Hot)
    hot_nums = [item[0] for item in num_counts.most_common(10)]
    
    # 排序：最冷門 (Cold) - 在這 80 個號碼中挑最少出現的
    all_possible_nums = [str(i).zfill(2) for i in range(1, 81)]
    cold_nums = []
    for num in all_possible_nums:
        if num not in num_counts:
            cold_nums.append(num)
            
    # 如果冷門號碼不到 10 個，補上出現次數最少的
    least_common = num_counts.most_common()[:-11:-1]
    for item in least_common:
        if len(cold_nums) < 10 and item[0] not in cold_nums:
            cold_nums.append(item[0])

    hot_supers = [item[0] for item in super_counts.most_common(5)]
    
    print("🔥 今日最熱門 (常出) 獎號 TOP 10:")
    print("   " + ", ".join(hot_nums))
    
    print("\\n❄️ 今日最冷門 (罕見) 獎號 TOP 10:")
    print("   " + ", ".join(cold_nums[:10]))
    
    print("\\n⭐️ 今日最常出【超級獎號】 TOP 5:")
    print("   " + ", ".join(hot_supers))
    
    print("-" * 40)
    print("🤖 根據剛才的今日趨勢大數據，AI 為您推演下一期的選號策略：\\n")
    
    # 策略 1: 追熱門
    strategy_hot = random.sample(hot_nums, 5)
    print(f"👉 策略一（絕對跟風/追熱號 5星）： {', '.join(sorted(strategy_hot))}")
    
    # 策略 2: 抓冷門反彈
    strategy_cold = random.sample(cold_nums[:10], 5)
    print(f"👉 策略二（冷門大反彈/博冷 5星）： {', '.join(sorted(strategy_cold))}")
    
    # 策略 3: 溫和混搭 (3熱+2冷)
    strategy_mix = random.sample(hot_nums, 3) + random.sample(cold_nums[:10], 2)
    print(f"👉 策略三（穩健混搭/3熱2冷 5星）： {', '.join(sorted(strategy_mix))}")
    
    # 預測超級獎號
    if hot_supers:
        predicted_super = random.choice(hot_supers[:3])
        print(f"👉 推薦超級獎號押注： {predicted_super} 或 {hot_supers[0]}")
    
    print("\\n(⚠️ 提醒：彩券為隨機機率遊戲，此為基於今日已開出的數據頻率做出的統計推薦，請理性投注！)")

if __name__ == "__main__":
    analyze_and_predict()
