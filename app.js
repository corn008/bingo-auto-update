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
    let currentTrendNums = []; // Numbers appearing multiple times recently
    let currentDueNums = [];   // Numbers that are hot today but have a small gap
    let currentLatestDraw = null;
    let currentLoadedData = [];

    // Load data on start
    loadData(defaultDate);

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
        list.innerHTML = `<div style="font-size: 0.95rem; color: #aaa; margin-bottom: 15px;">🎯 目標對獎期數：<span style="color:#00f2fe; font-weight:bold;">${saved3StarData.targetPeriod}</span> 期</div>`;

        // Check if the target period exists in currentLoadedData
        const targetDraw = currentLoadedData.find(d => d["期別"] === saved3StarData.targetPeriod);

        const multiplier = saved3StarData.multiplier || 1;
        let totalSpent = saved3StarData.sets.length * 25 * multiplier;
        let totalWon = 0;

        for (let i = 0; i < saved3StarData.sets.length; i++) {
            const nums = saved3StarData.sets[i];
            let matchCount = 0;
            let ballsHtml = '';

            nums.forEach(n => {
                let isMatch = false;
                if (targetDraw) {
                    const drawNums = targetDraw["獎號 (大小排序)"] !== "N/A" ? targetDraw["獎號 (大小排序)"].split(',').map(s => s.trim()) : [];
                    if (drawNums.includes(n)) {
                        isMatch = true;
                        matchCount++;
                    }
                }

                if (isMatch) {
                    ballsHtml += `<div class="ball" style="background: #00ff00; color: #000; box-shadow: 0 0 10px #00ff00; border-color: #00ff00;">${n}</div>`;
                } else {
                    ballsHtml += `<div class="ball">${n}</div>`;
                }
            });

            let resultText = '<span style="color: #aaa; font-weight: bold;">⏳ 等待開獎</span>';
            if (targetDraw) {
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

            list.innerHTML += `
                <div style="display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px; width: 100%; max-width: 100%; overflow-x: auto; padding: 0 10px;">
                    <span style="color: #fff; font-weight: bold; width: 65px; text-align: right; white-space: nowrap; flex-shrink: 0;">第 ${i + 1} 組:</span>
                    <div class="balls-container small" style="margin: 0; min-width: auto; justify-content: center; flex-wrap: nowrap; flex-shrink: 0;">${ballsHtml}</div>
                    <div style="width: 75px; text-align: left; white-space: nowrap; flex-shrink: 0; font-size: 0.95rem;">${resultText}</div>
                </div>
            `;
        }

        if (targetDraw) {
            let profit = totalWon - totalSpent;
            let profitHtml = profit > 0 ? `<span style="color: #00ff00; font-weight: bold;">+${profit}</span>` :
                profit === 0 ? `<span style="color: #aaa; font-weight: bold;">0</span>` :
                    `<span style="color: #ff4b4b; font-weight: bold;">${profit}</span>`;
            list.innerHTML += `
                <div style="margin-top: 20px; padding: 15px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(0, 0, 0, 0.3); width: 100%; max-width: 350px;">
                    <h4 style="color: #00f0ff; margin-bottom: 10px; font-size: 1.1rem; border-bottom: 1px solid rgba(0,240,255,0.2); padding-bottom: 5px;">💰 對獎結算</h4>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.95rem;">
                        <span style="color: #aaa;">總下注 (每注25元, ${multiplier}倍):</span><span style="color: #fff;">${totalSpent} 元</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.95rem;">
                        <span style="color: #aaa;">總中獎金額:</span><span style="color: #ffc832; font-weight: bold;">${totalWon} 元</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 1.05rem; margin-top: 10px; border-top: 1px dashed rgba(255,255,255,0.2); padding-top: 10px;">
                        <span style="color: #aaa;">淨利潤:</span><span>${profitHtml} 元</span>
                    </div>
                </div>
            `;
        }
    }

    const btnGen3Star = document.getElementById('btnGen3Star');
    if (btnGen3Star) {
        btnGen3Star.addEventListener('click', () => {
            if (!currentLatestDraw || !currentLatestDraw.period) {
                alert('請先等待資料載入完成！');
                return;
            }

            const targetPeriod = (parseInt(currentLatestDraw.period) + 1).toString();

            const getRandom = (arr, n) => {
                let result = new Array(n), len = arr.length, taken = new Array(len);
                if (n > len) return arr;
                while (n--) {
                    let x = Math.floor(Math.random() * len);
                    result[n] = arr[x in taken ? taken[x] : x];
                    taken[x] = --len in taken ? taken[len] : len;
                }
                return result.sort((a, b) => parseInt(a) - parseInt(b));
            };

            const sets = [];
            for (let i = 0; i < 10; i++) {
                // Advanced Selection Logic:
                // Mix Trend (Recent Hit), Hot (Today Freq), and Due (Statistical Gap)
                let pool = [];
                const r = Math.random();

                if (r > 0.7) {
                    // Strategy A: Trend Following (2 Trend + 1 Hot)
                    pool = [...getRandom(currentTrendNums, 2), ...getRandom(currentHotNums, 1)];
                } else if (r > 0.3) {
                    // Strategy B: Balanced (1 Trend + 1 Hot + 1 Due)
                    pool = [...getRandom(currentTrendNums, 1), ...getRandom(currentHotNums, 1), ...getRandom(currentDueNums, 1)];
                } else {
                    // Strategy C: Surprise (1 Hot + 2 Due/Cold)
                    pool = [...getRandom(currentHotNums, 1), ...getRandom(currentDueNums, 1), ...getRandom(currentColdNums, 1)];
                }

                // Ensure uniqueness and valid length
                let finalNums = Array.from(new Set(pool));
                while (finalNums.length < 3) {
                    let extra = getRandom(currentHotNums, 1)[0];
                    if (!finalNums.includes(extra)) finalNums.push(extra);
                }

                finalNums.sort((a, b) => parseInt(a) - parseInt(b));
                sets.push(finalNums);
            }

            const betMultiplierEl = document.getElementById('betMultiplier');
            const multiplier = betMultiplierEl ? parseInt(betMultiplierEl.value || 1) : 1;

            saved3StarData = {
                targetPeriod,
                sets,
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

    async function loadData(dateStr) {
        resultsContainer.innerHTML = '<div class="loading-spinner">📡 正在透過雲端網路抓取最即時的開獎資料...</div>';
        statsPanel.classList.add('hidden');
        document.getElementById('aiPanel').classList.add('hidden');

        try {
            const dateFormatted = dateStr.replace(/-/g, "");
            const targetUrl = `https://lotto.auzonet.com/bingobingo/list_${dateFormatted}.html`;

            // 使用 allorigins 作為免費 CORS 代理服務
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

            const response = await fetch(proxyUrl);
            if (!response.ok) {
                throw new Error('無法連線至代理伺服器或來源網站。');
            }

            const proxyData = await response.json();
            const htmlContent = proxyData.contents;

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
        resultsContainer.innerHTML = '';

        if (!data || data.length === 0) {
            resultsContainer.innerHTML = '<div class="error-msg">此日期無開獎紀錄。</div>';
            return;
        }

        // Update stats
        currentDateDisplay.innerText = dateStr;
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

        // --- Advanced Statistical Inference ---
        // 1. Trend Analysis (Last 5 draws)
        const last5 = data.slice(0, 5);
        const last5Freq = {};
        last5.forEach(d => {
            const arr = d["獎號 (大小排序)"].split(',').map(n => n.trim());
            arr.forEach(n => last5Freq[n] = (last5Freq[n] || 0) + 1);
        });
        const trendNums = Object.keys(last5Freq).filter(n => last5Freq[n] >= 2);

        // 2. Gap Analysis (When was the last time it appeared?)
        const dueNums = [];
        hotNums.forEach(n => {
            // If it's a hot num but NOT in the last 3 draws, it's "due"
            let inLast3 = false;
            for (let i = 0; i < 3 && i < data.length; i++) {
                if (data[i]["獎號 (大小排序)"].includes(n)) { inLast3 = true; break; }
            }
            if (!inLast3) dueNums.push(n);
        });

        currentHotNums = hotNums;
        currentColdNums = coldNums;
        currentTrendNums = trendNums.length >= 3 ? trendNums : hotNums.slice(0, 5);
        currentDueNums = dueNums.length >= 3 ? dueNums : sortedNums.slice(10, 20);

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
    }
});
