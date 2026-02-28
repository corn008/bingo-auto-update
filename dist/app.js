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

    // Load data on start
    loadData(defaultDate);

    loadBtn.addEventListener('click', () => {
        loadData(datePicker.value);
    });

    async function loadData(dateStr) {
        resultsContainer.innerHTML = '<div class="loading-spinner">讀取資料中... (如果失敗請確認 Python 腳本已產出 json 檔案)</div>';
        statsPanel.classList.add('hidden');

        try {
            // Add a cache buster purely for safety if developing
            const response = await fetch(`bingo_history_${dateStr}.json?t=${new Date().getTime()}`);
            if (!response.ok) {
                throw new Error(`找不到 ${dateStr} 的開獎紀錄。請先執行 Python 爬蟲。`);
            }

            const data = await response.json();
            renderData(data, dateStr);
        } catch (error) {
            resultsContainer.innerHTML = `<div class="error-msg">⚠️ 錯誤: ${error.message}</div>`;
        }
    }

    function renderData(data, dateStr) {
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
