document.addEventListener('DOMContentLoaded', () => {
    const datePicker = document.getElementById('datePicker');
    const loadBtn = document.getElementById('loadBtn');
    const resultsContainer = document.getElementById('resultsContainer');
    const statsPanel = document.getElementById('statsPanel');
    const totalDrawsEl = document.getElementById('totalDraws');
    const currentDateDisplay = document.getElementById('currentDateDisplay');

    // Default to local today YYYY-MM-DD
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const defaultDate = `${year}-${month}-${day}`;
    datePicker.value = defaultDate;

    let currentHotNums = [];
    let currentColdNums = [];
    let currentTrendNums = [];
    let currentDueNums = [];
    let currentCorrelatedPairs = {}; // Analysis of numbers appearing together
    let currentPatternBias = { big: 0.5, odd: 0.5 }; // General bias of the day
    let currentLatestDraw = null;
    let currentLoadedData = [];
    let lastFetchedPeriod = "";
    let isWaitingForNewDraw = false;

    // Load data on start
    loadData(defaultDate);

    let lastAutoLoad = 0;
    function updateCountdown() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMin = now.getMinutes();
        const currentSec = now.getSeconds();

        let targetMin = Math.ceil((currentMin + 1) / 5) * 5;
        let targetHour = currentHour;

        if (targetMin >= 60) {
            targetMin = 0;
            targetHour++;
        }

        // 營業時間：07:05 ~ 23:55 (每 5 分鐘一期)
        const isClosed = (currentHour < 7 && currentMin < 5) || (currentHour >= 23 && currentMin >= 56);
        const countdownEl = document.getElementById('nextDrawCountdown');

        if (isClosed) {
            countdownEl.innerText = "明日 07:05 開獎";
            countdownEl.style.fontSize = "0.9rem";
            return;
        }

        const targetDate = new Date(now);
        targetDate.setHours(targetHour, targetMin, 0, 0);

        const diff = targetDate - now;
        const m = Math.floor(diff / 1000 / 60);
        const s = Math.floor((diff / 1000) % 60);

        countdownEl.innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        countdownEl.style.fontSize = "1.2rem";

        // 更新下期預計期數
        const periodEl = document.getElementById('nextDrawPeriod');
        if (periodEl && currentLatestDraw && currentLatestDraw.period) {
            periodEl.innerText = (parseInt(currentLatestDraw.period) + 1).toString();
        }

        const isToday = (datePicker.value === defaultDate);
        if (!isToday) return;

        const secondsIntoInterval = (currentMin % 5) * 60 + currentSec;

        // 當倒數歸零時，開啟等待標記
        if (m === 0 && s === 0) {
            isWaitingForNewDraw = true;
        }

        // 只有在「等待新獎號」狀態下才刷新
        // 開獎後 40秒~180秒 是最有可能出資料的時間，每 30 秒抓一次就好，減少對使用者的干擾
        if (isWaitingForNewDraw && secondsIntoInterval >= 40 && secondsIntoInterval <= 180) {
            if (currentSec % 30 === 0 && (Date.now() - lastAutoLoad > 5000)) {
                lastAutoLoad = Date.now();
                console.log("偵測到新期數時間，啟動智慧追蹤...");
                loadData(datePicker.value, true);
            }
        } else if (secondsIntoInterval > 180) {
            // 超過 3 分鐘沒出就算了，停止頻繁重新整理
            isWaitingForNewDraw = false;
        }
    }

    setInterval(updateCountdown, 1000);
    updateCountdown();

    loadBtn.addEventListener('click', () => {
        loadData(datePicker.value);
    });

    let saved3StarData = JSON.parse(localStorage.getItem('bingo3StarData') || "null");

    function render3StarPredictions() {
        const container = document.getElementById('threeStarContainer');
        const list = document.getElementById('threeStarList');
        if (!saved3StarData) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        const multiplier = saved3StarData.multiplier || 1;
        const chaseCount = (saved3StarData.targetPeriods || []).length;
        let totalSpent = 25 * multiplier * chaseCount;
        let totalWon = 0;
        let drawsFinished = 0;

        const mySet = saved3StarData.set || [];
        const setHtml = mySet.map(n => `<div class="ball">${n}</div>`).join('');

        list.innerHTML = `
            <div style="margin-bottom: 20px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); display: inline-block; width: 100%; max-width: 400px;">
                <div style="color: #00f0ff; font-size: 0.9rem; margin-bottom: 10px;">💎 守株待兔號碼 (連追 ${chaseCount} 期)</div>
                <div class="balls-container" style="justify-content: center; margin-bottom: 5px;">${setHtml}</div>
            </div>
            <div style="width: 100%; max-width: 450px; display: flex; flex-direction: column; gap: 8px;">
        `;

        (saved3StarData.targetPeriods || []).forEach((period, idx) => {
            const targetDraw = currentLoadedData.find(d => d["期別"] === period);
            let matchCount = 0;
            let resultText = '<span style="color: #aaa; font-weight: bold;">⏳ 等待開獎</span>';
            let ballsMatchHtml = '';

            if (targetDraw) {
                drawsFinished++;
                const drawNums = targetDraw["獎號 (大小排序)"] !== "N/A" ? targetDraw["獎號 (大小排序)"].split(',').map(s => s.trim()) : [];
                mySet.forEach(n => {
                    if (drawNums.includes(n)) {
                        matchCount++;
                    }
                });

                if (matchCount === 3) {
                    resultText = '<span style="color: #ff00ff; font-weight: bold;">🎉 三星全中</span>';
                    totalWon += 500 * multiplier;
                } else if (matchCount === 2) {
                    resultText = '<span style="color: #ffaa00; font-weight: bold;">🎯 中 2 球</span>';
                    totalWon += 50 * multiplier;
                } else if (matchCount === 1) {
                    resultText = '<span style="color: #00ff00; font-weight: bold;">✅ 中 1 球</span>';
                } else {
                    resultText = '<span style="color: #888; font-weight: bold;">沒中</span>';
                }
            }

            // Small indicator for each period
            list.innerHTML += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 15px; background: rgba(0,0,0,0.2); border-radius: 8px; font-size: 0.9rem;">
                    <span style="color: #eee; font-weight: bold;">第 ${idx + 1} 期 <span style="color: #888; font-size: 0.8rem; margin-left:5px;">(${period})</span></span>
                    <div>${resultText}</div>
                </div>
            `;
        });

        list.innerHTML += '</div>';

        let profit = totalWon - totalSpent;
        let profitHtml = profit > 0 ? `<span style="color: #00ff00; font-weight: bold;">+${profit}</span>` :
            profit === 0 ? `<span style="color: #aaa; font-weight: bold;">0</span>` :
                `<span style="color: #ff4b4b; font-weight: bold;">${profit}</span>`;

        list.innerHTML += `
            <div style="margin-top: 20px; padding: 15px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(0, 0, 0, 0.3); width: 100%; max-width: 400px;">
                <h4 style="color: #00f0ff; margin-bottom: 10px; font-size: 1.1rem; border-bottom: 1px solid rgba(0,240,255,0.2); padding-bottom: 5px;">💰 對獎結算 (進度: ${drawsFinished}/${chaseCount})</h4>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.95rem;">
                    <span style="color: #aaa;">總下注 (每注25元 x ${chaseCount}期 x ${multiplier}倍):</span><span style="color: #fff;">${totalSpent} 元</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.95rem;">
                    <span style="color: #aaa;">累積中獎金額:</span><span style="color: #ffc832; font-weight: bold;">${totalWon} 元</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 1.05rem; margin-top: 10px; border-top: 1px dashed rgba(255,255,255,0.2); padding-top: 10px;">
                    <span style="color: #aaa;">今日淨利潤:</span><span>${profitHtml} 元</span>
                </div>
            </div>
        `;
    }

    const btnGen3Star = document.getElementById('btnGen3Star');
    if (btnGen3Star) {
        btnGen3Star.addEventListener('click', () => {
            if (!currentLatestDraw || !currentLatestDraw.period) {
                alert('請先等待資料載入完成！');
                return;
            }

            const targetPeriod = (parseInt(currentLatestDraw.period) + 1).toString();

            // --- Ultra-Advanced AI V3 Strategy ---
            const getAISet = () => {
                const getRandom = (arr, n) => {
                    let res = new Array(n), l = arr.length, t = new Array(l);
                    if (n > l) return arr;
                    while (n--) {
                        let x = Math.floor(Math.random() * l);
                        res[n] = arr[x in t ? t[x] : x];
                        t[x] = --l in t ? t[l] : l;
                    }
                    return res;
                };

                let mySet = [];
                const r = Math.random();

                // 1. Start with a "Seed" number (Trend or Hot)
                const seedArr = r > 0.5 ? currentTrendNums : currentHotNums;
                const seed = getRandom(seedArr, 1)[0];
                mySet.push(seed);

                // 2. Look for Correlation (What usually comes with the seed?)
                const correlations = currentCorrelatedPairs[seed] || [];
                if (correlations.length > 0 && Math.random() > 0.3) {
                    // Pick the best correlation
                    mySet.push(correlations[Math.floor(Math.random() * Math.min(3, correlations.length))]);
                } else {
                    // Pick a "Due" number or another Trend
                    mySet.push(getRandom(Math.random() > 0.5 ? currentDueNums : currentTrendNums, 1)[0]);
                }

                // 3. Fill the last one while checking Pattern Bias (Odd/Even/Big/Small)
                while (mySet.length < 3) {
                    let candidate = getRandom([...currentHotNums, ...currentDueNums, ...currentTrendNums], 1)[0];
                    if (mySet.includes(candidate)) continue;

                    // Filter based on Pattern Bias
                    const val = parseInt(candidate);
                    const isBig = val > 40;
                    const isOdd = val % 2 !== 0;

                    let pass = true;
                    // If the day is heavily "Big", try to match it 70% of the time
                    if (currentPatternBias.big > 0.6 && !isBig && Math.random() > 0.4) pass = false;
                    if (currentPatternBias.odd > 0.6 && !isOdd && Math.random() > 0.4) pass = false;

                    if (pass) mySet.push(candidate);
                }

                return mySet.sort((a, b) => parseInt(a) - parseInt(b));
            };

            const targetBase = parseInt(currentLatestDraw.period);
            const targetPeriods = [];
            for (let i = 1; i <= 10; i++) {
                targetPeriods.push((targetBase + i).toString());
            }

            const betMultiplierEl = document.getElementById('betMultiplier');
            const multiplier = betMultiplierEl ? parseInt(betMultiplierEl.value || 1) : 1;

            saved3StarData = {
                set: getAISet(),
                targetPeriods,
                multiplier
            };
            localStorage.setItem('bingo3StarData', JSON.stringify(saved3StarData));
            render3StarPredictions();

            // Scroll to the predictions
            document.getElementById('threeStarContainer').scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
    }

    const btnClear3Star = document.getElementById('btnClear3Star');
    if (btnClear3Star) {
        btnClear3Star.addEventListener('click', () => {
            saved3StarData = null;
            localStorage.removeItem('bingo3StarData');
            render3StarPredictions();
        });
    }

    function renderHeatmap(numFreq, totalDraws) {
        const panel = document.getElementById('heatmapPanel');
        const grid = document.getElementById('heatmapGrid');
        if (!grid) return;
        panel.classList.remove('hidden');
        grid.innerHTML = '';

        const counts = Object.values(numFreq);
        const max = Math.max(...counts, 1);
        const min = Math.min(...counts);

        for (let i = 1; i <= 80; i++) {
            const num = i.toString().padStart(2, '0');
            const count = numFreq[num] || 0;

            // Calculate color interpolation: 0 (cold blue) to 1 (hot red)
            const ratio = (count - min) / (max - min || 1);

            // RGB Interpolation: #64c8ff (blue) to #ff6464 (red)
            const r = Math.floor(100 + (255 - 100) * ratio);
            const g = Math.floor(200 - (200 - 100) * ratio);
            const b = Math.floor(255 - (255 - 100) * ratio);

            const ballShadow = count > 0 ? `0 0 ${Math.floor(ratio * 10)}px rgba(${r},${g},${b},0.6)` : 'none';

            grid.innerHTML += `
                <div class="heatmap-cell" style="
                    aspect-ratio: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: rgba(${r},${g},${b}, ${0.1 + ratio * 0.4});
                    border: 1px solid rgba(${r},${g},${b}, 0.3);
                    border-radius: 4px;
                    box-shadow: ${ballShadow};
                ">
                    <span style="font-size: 0.8rem; font-weight: bold; color: #fff;">${num}</span>
                    <span style="font-size: 0.6rem; color: rgba(255,255,255,0.7);">${count}次</span>
                </div>
            `;
        }
    }

    const btnBacktest = document.getElementById('btnBacktest');
    if (btnBacktest) {
        btnBacktest.addEventListener('click', () => {
            if (!currentLoadedData || currentLoadedData.length === 0) return;

            const resultBox = document.getElementById('backtestResult');
            resultBox.style.display = 'block';
            resultBox.innerHTML = '<div style="color: #00f0ff;">🚀 正在精算歷史回測報告...</div>';

            // Helper to get random stats-based 3-star Set (Using current AI logic)
            const getAISet = () => {
                const getRandom = (arr, n) => {
                    let res = new Array(n), l = arr.length, t = new Array(l);
                    if (n > l) return arr;
                    while (n--) {
                        let x = Math.floor(Math.random() * l);
                        res[n] = arr[x in t ? t[x] : x];
                        t[x] = --l in t ? t[l] : l;
                    }
                    return res;
                };

                let mySet = [];
                const r = Math.random();

                // 1. Start with a "Seed" number (Trend or Hot)
                const seedArr = r > 0.5 ? currentTrendNums : currentHotNums;
                const seed = getRandom(seedArr, 1)[0];
                mySet.push(seed);

                // 2. Look for Correlation (What usually comes with the seed?)
                const correlations = currentCorrelatedPairs[seed] || [];
                if (correlations.length > 0 && Math.random() > 0.3) {
                    // Pick the best correlation
                    mySet.push(correlations[Math.floor(Math.random() * Math.min(3, correlations.length))]);
                } else {
                    // Pick a "Due" number or another Trend
                    mySet.push(getRandom(Math.random() > 0.5 ? currentDueNums : currentTrendNums, 1)[0]);
                }

                // 3. Fill the last one while checking Pattern Bias (Odd/Even/Big/Small)
                while (mySet.length < 3) {
                    let candidate = getRandom([...currentHotNums, ...currentDueNums, ...currentTrendNums], 1)[0];
                    if (mySet.includes(candidate)) continue;

                    // Filter based on Pattern Bias
                    const val = parseInt(candidate);
                    const isBig = val > 40;
                    const isOdd = val % 2 !== 0;

                    let pass = true;
                    // If the day is heavily "Big", try to match it 70% of the time
                    if (currentPatternBias.big > 0.6 && !isBig && Math.random() > 0.4) pass = false;
                    if (currentPatternBias.odd > 0.6 && !isOdd && Math.random() > 0.4) pass = false;

                    if (pass) mySet.push(candidate);
                }

                return mySet.sort((a, b) => parseInt(a) - parseInt(b));
            };

            const betMultiplierEl = document.getElementById('betMultiplier');
            const mult = betMultiplierEl ? parseInt(betMultiplierEl.value || 1) : 1;

            let totalCost = 0;
            let totalWin = 0;
            let win3Count = 0;
            let win2Count = 0;

            // Simulate 10 sets for EACH draw in the day
            currentLoadedData.forEach(draw => {
                const drawNums = draw["獎號 (大小排序)"] !== "N/A" ? draw["獎號 (大小排序)"].split(',').map(s => s.trim()) : [];
                if (drawNums.length === 0) return;

                // For each draw, we pretend we bought 10 AI sets
                for (let i = 0; i < 10; i++) {
                    const mySet = getAISet();
                    totalCost += 25 * mult;
                    let matches = mySet.filter(n => drawNums.includes(n)).length;
                    if (matches === 3) { totalWin += 500 * mult; win3Count++; }
                    else if (matches === 2) { totalWin += 50 * mult; win2Count++; }
                }
            });

            const net = totalWin - totalCost;
            const netColor = net >= 0 ? '#00ff00' : '#ff4b4b';

            resultBox.innerHTML = `
                <h4 style="color: #00f0ff; margin-bottom: 12px; font-size: 1rem; border-bottom: 1px solid rgba(0,240,255,0.2); padding-bottom: 5px;">📊 今日回測報告 (${currentLoadedData.length} 期全追)</h4>
                <div style="font-size: 0.9rem; line-height: 1.6;">
                    今日總投入： <span style="color: #fff;">${totalCost} 元</span> (每期 10 組 x ${mult}倍)<br>
                    今日總回籠： <span style="color: #ffc832;">${totalWin} 元</span><br>
                    累積三星次數： <span style="color: #ff00ff; font-weight: bold;">${win3Count}</span> 次<br>
                    累積二星次數： <span style="color: #ffaa00;">${win2Count}</span> 次<br>
                    ---<br>
                    <div style="font-size: 1.1rem; margin-top: 5px;">今日模擬淨損益： <span style="color: ${netColor}; font-weight: bold;">${net > 0 ? '+' : ''}${net} 元</span></div>
                </div>
            `;

            localStorage.setItem('bingoBacktestData', JSON.stringify({
                date: currentDateDisplay.innerText,
                html: resultBox.innerHTML
            }));

            resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    async function loadData(dateStr, isSilent = false) {
        if (!isSilent) {
            resultsContainer.innerHTML = '<div class="loading-spinner">📡 正在透過多重雲端通道抓取最即時開獎 (同步加速中)...</div>';
            statsPanel.classList.add('hidden');
            document.getElementById('aiPanel').classList.add('hidden');
        }

        const dateFormatted = dateStr.replace(/-/g, "");
        const targetUrl = `https://lotto.auzonet.com/bingobingo/list_${dateFormatted}.html?t=${Date.now()}`;

        // --- 多重代理並行競速 (Race) 以提升載入速度 ---
        const proxies = [
            `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
        ];

        async function fetchWithProxy(url) {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error("Failed to fetch from proxy: " + url);
            const data = await resp.json();
            // AllOrigins returns {contents: "..."}, others might return raw HTML string
            return data.contents || data;
        }

        async function fetchRawWithProxy(url) {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error("Failed to fetch raw from proxy: " + url);
            return await resp.text();
        }

        try {
            // 嘗試最快的代理通道
            const htmlContent = await Promise.any([
                fetchWithProxy(proxies[0]),
                fetchRawWithProxy(proxies[1]),
                fetchRawWithProxy(proxies[2])
            ]);

            if (!htmlContent || typeof htmlContent !== 'string') throw new Error("Invalid content received from proxy.");

            // 將抓回來的 HTML 轉化為 DOM
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, "text/html");

            // 尋找開獎紀錄的表格列
            const rows = doc.querySelectorAll('tr.bingo_row');

            if (!rows || rows.length === 0) {
                // 有可能當天還沒開獎，或是日期太久遠
                throw new Error('找不到歷史紀錄或尚未開獎。');
            }

            const scrapedData = [];

            rows.forEach(row => {
                const tds = row.querySelectorAll('td');
                if (tds.length < 5) return;

                const bTag = tds[0].querySelector('b');
                if (!bTag) return;
                const period = bTag.innerText.trim();

                const divTags = tds[1].querySelectorAll('div');
                const nums = [];
                let superNum = "N/A";

                divTags.forEach(div => {
                    const txt = div.innerText.trim();
                    if (!txt) return;
                    nums.push(txt);

                    // 若 className 包含結尾是 's' (如 bbns, bbrps 等，奧索用這個標記超級號)
                    const cls = div.className || "";
                    if (cls.match(/s$/)) {
                        superNum = txt;
                    }
                });

                nums.sort((a, b) => parseInt(a) - parseInt(b));

                let highLow = tds[3].innerText.trim();
                let oddEven = tds[4].innerText.trim();

                if (!highLow) highLow = "－";
                if (!oddEven) oddEven = "－";

                scrapedData.push({
                    "期別": period,
                    "獎號 (大小排序)": nums.length > 0 ? nums.join(", ") : "N/A",
                    "超級獎號": superNum,
                    "猜大小": highLow,
                    "猜單雙": oddEven
                });
            });

            // 由於原始網頁是由上到下 (新到舊)，所以已經是我們想要的順序
            renderData(scrapedData, dateStr);

        } catch (error) {
            console.warn("連線代理抓取失敗，嘗試載入靜態歷史 JSON", error);

            // 只要透過代理爬網站失敗（例如被 CORS 阻擋），馬上無縫切換為讀取 JSON 靜態包
            try {
                const jsonResponse = await fetch(`bingo_history_${dateStr}.json?t=${new Date().getTime()}`);
                if (!jsonResponse.ok) {
                    throw new Error(`找不到 ${dateStr} 的開獎紀錄。代理伺服器阻擋，且當日 JSON 未上傳。`);
                }

                const text = await jsonResponse.text();
                // Cloudflare 404 falls back to HTML
                if (text.trim().startsWith('<')) {
                    throw new Error(`找不到 ${dateStr} 的 JSON 檔案。代理伺服器阻擋，且當日 JSON 未上傳。`);
                }

                const dataJSON = JSON.parse(text);
                renderData(dataJSON, dateStr);

            } catch (fallbackError) {
                resultsContainer.innerHTML = `<div class="error-msg">⚠️ 錯誤: ${fallbackError.message}</div>`;
            }
        }
    }

    function renderData(data, dateStr) {
        currentLoadedData = data || [];

        // 檢查是否拿到了更新的期數
        if (data && data.length > 0) {
            const latest = data[0]["期別"];
            if (latest !== lastFetchedPeriod) {
                lastFetchedPeriod = latest;
                isWaitingForNewDraw = false; // 拿到新資料了，停止追蹤
                console.log("成功取得新期數:", latest);
            }
        }

        resultsContainer.innerHTML = '';

        if (!data || data.length === 0) {
            resultsContainer.innerHTML = '<div class="error-msg">此日期無開獎紀錄。</div>';
            return;
        }

        // Update stats
        currentDateDisplay.innerText = `${dateStr} (於 ${new Date().toLocaleTimeString()} 完成更新)`;
        totalDrawsEl.innerText = data.length;
        statsPanel.classList.remove('hidden');

        // Render AI Panel
        renderAIPredictions(data);
        render3StarPredictions();

        data.forEach((draw, index) => {
            const card = document.createElement('div');
            card.className = 'draw-card';
            card.style.animationDelay = `${index * 0.05}s`; // staggered animation

            // Parse numbers from comma separated string
            const numsStr = draw["獎號 (大小排序)"];
            let ballsHtml = '';

            if (numsStr && numsStr !== "N/A") {
                const numArr = numsStr.split(',').map(n => n.trim());
                numArr.forEach(n => {
                    ballsHtml += `<div class="ball">${n}</div>`;
                });
            } else {
                ballsHtml += `<div style="color: grey">尚未開出獎號</div>`;
            }

            // Super ball
            const superNum = draw["超級獎號"];
            if (superNum && superNum !== "N/A" && superNum !== "－") {
                ballsHtml += `<div class="ball super">${superNum}</div>`;
            }

            const highLow = draw["猜大小"] !== "－" ? draw["猜大小"] : "-";
            const oddEven = draw["猜單雙"] !== "－" ? draw["猜單雙"] : "-";

            card.innerHTML = `
                <div class="card-header">
                    <div class="term-number">${draw["期別"]}</div>
                    <div class="extra-info">
                        <div class="badge">大小: <span>${highLow}</span></div>
                        <div class="badge">單雙: <span>${oddEven}</span></div>
                    </div>
                </div>
                <div class="balls-container">
                    ${ballsHtml}
                </div>
            `;

            resultsContainer.appendChild(card);
        });
    }

    function renderAIPredictions(data) {
        const aiPanel = document.getElementById('aiPanel');
        if (!data || data.length === 0) {
            aiPanel.classList.add('hidden');
            return;
        }

        // Save latest draw for 3-star matching
        let numsStr = data[0]["獎號 (大小排序)"];
        let drawnNums = [];
        if (numsStr && numsStr !== "N/A") {
            drawnNums = numsStr.split(',').map(n => n.trim());
        }
        currentLatestDraw = {
            period: data[0]["期別"],
            nums: drawnNums
        };

        let allNums = [];
        let superNums = [];

        data.forEach(draw => {
            let numsStr = draw["獎號 (大小排序)"];
            if (numsStr && numsStr !== "N/A") {
                allNums.push(...numsStr.split(',').map(n => n.trim()));
            }
            let sNum = draw["超級獎號"];
            if (sNum && sNum !== "N/A" && sNum !== "－") {
                superNums.push(sNum.trim());
            }
        });

        const numFreq = {};
        allNums.forEach(n => numFreq[n] = (numFreq[n] || 0) + 1);

        const superFreq = {};
        superNums.forEach(n => superFreq[n] = (superFreq[n] || 0) + 1);

        // Sort
        const sortedNums = Object.keys(numFreq).sort((a, b) => numFreq[b] - numFreq[a]);
        const sortedSupers = Object.keys(superFreq).sort((a, b) => superFreq[b] - superFreq[a]);

        const hotNums = sortedNums.slice(0, 10);

        // Find cold nums
        const coldNums = [];
        for (let i = 1; i <= 80; i++) {
            let s = i.toString().padStart(2, '0');
            if (!numFreq[s]) coldNums.push(s);
        }
        // Fill up to 10 if necessary
        const leastCommon = [Math.max(...sortedNums.slice(-10))];
        let idx = sortedNums.length - 1;
        while (coldNums.length < 10 && idx >= 0) {
            if (!coldNums.includes(sortedNums[idx])) coldNums.push(sortedNums[idx]);
            idx--;
        }

        const hotSupers = sortedSupers.slice(0, 5);

        const createBallsStr = (arr, isSuper = false) => {
            return arr.map(n => `<div class="ball ${isSuper ? 'super' : ''}">${n}</div>`).join('');
        };

        // --- Advanced Statistical Inference V3 ---
        // 1. Correlation Analysis (Which numbers appear together?)
        const pairFreq = {}; // e.g., { "01": { "05": 3, "22": 1 } }
        data.forEach(d => {
            const arr = d["獎號 (大小排序)"].split(',').map(n => n.trim());
            for (let i = 0; i < arr.length; i++) {
                for (let j = i + 1; j < arr.length; j++) {
                    const a = arr[i], b = arr[j];
                    if (!pairFreq[a]) pairFreq[a] = {};
                    if (!pairFreq[b]) pairFreq[b] = {};
                    pairFreq[a][b] = (pairFreq[a][b] || 0) + 1;
                    pairFreq[b][a] = (pairFreq[b][a] || 0) + 1;
                }
            }
        });

        // Convert to sorted lists
        const correlations = {};
        Object.keys(pairFreq).forEach(n => {
            correlations[n] = Object.keys(pairFreq[n]).sort((a, b) => pairFreq[n][b] - pairFreq[n][a]);
        });

        // 2. Trend Analysis (Last 8 draws)
        const last8 = data.slice(0, 8);
        const last8Freq = {};
        last8.forEach(d => {
            const arr = d["獎號 (大小排序)"].split(',').map(n => n.trim());
            arr.forEach(n => last8Freq[n] = (last8Freq[n] || 0) + 1);
        });
        const trendNums = Object.keys(last8Freq).filter(n => last8Freq[n] >= 2);

        // 3. Pattern Bias (Big/Small, Odd/Even)
        let bigCount = 0, oddCount = 0, totalBallCount = 0;
        data.forEach(d => {
            const arr = d["獎號 (大小排序)"].split(',').map(n => n.trim());
            arr.forEach(n => {
                totalBallCount++;
                if (parseInt(n) > 40) bigCount++;
                if (parseInt(n) % 2 !== 0) oddCount++;
            });
        });

        // 4. Gap Analysis
        const dueNums = [];
        hotNums.forEach(n => {
            let inLast5 = false;
            for (let i = 0; i < 5 && i < data.length; i++) {
                if (data[i]["獎號 (大小排序)"].includes(n)) { inLast5 = true; break; }
            }
            if (!inLast5) dueNums.push(n);
        });

        currentHotNums = hotNums;
        currentColdNums = coldNums;
        currentTrendNums = trendNums.length >= 5 ? trendNums : hotNums.slice(0, 7);
        currentDueNums = dueNums.length >= 3 ? dueNums : sortedNums.slice(10, 20);
        currentCorrelatedPairs = correlations;
        currentPatternBias = {
            big: bigCount / totalBallCount,
            odd: oddCount / totalBallCount
        };

        document.getElementById('aiHotNums').innerHTML = createBallsStr(hotNums);
        document.getElementById('aiColdNums').innerHTML = createBallsStr(coldNums);
        document.getElementById('aiSuperNums').innerHTML = createBallsStr(hotSupers, true);

        // Randomly select 5
        const getRandom = (arr, n) => {
            let result = new Array(n), len = arr.length, taken = new Array(len);
            if (n > len) return arr;
            while (n--) {
                let x = Math.floor(Math.random() * len);
                result[n] = arr[x in taken ? taken[x] : x];
                taken[x] = --len in taken ? taken[len] : len;
            }
            return result.sort();
        };

        document.getElementById('stHot').innerHTML = createBallsStr(getRandom(hotNums, 5));
        document.getElementById('stCold').innerHTML = createBallsStr(getRandom(coldNums, 5));

        const mix = [...getRandom(hotNums, 3), ...getRandom(coldNums, 2)].sort();
        document.getElementById('stMix').innerHTML = createBallsStr(mix);

        document.getElementById('stSuper').innerHTML = createBallsStr(hotSupers.length > 0 ? [hotSupers[0], getRandom(hotSupers, 1)[0]].filter((v, i, a) => a.indexOf(v) === i) : [], true);

        aiPanel.classList.remove('hidden');

        // Render Heatmap
        renderHeatmap(numFreq, data.length);

        // Check for persisted backtest result
        const savedBT = JSON.parse(localStorage.getItem('bingoBacktestData') || "null");
        const resultBox = document.getElementById('backtestResult');
        if (savedBT && savedBT.date === currentDateDisplay.innerText) {
            resultBox.innerHTML = savedBT.html;
            resultBox.style.display = 'block';
        } else {
            resultBox.style.display = 'none';
        }
    }
});
