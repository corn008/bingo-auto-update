document.addEventListener('DOMContentLoaded', () => {
    const datePicker = document.getElementById('datePicker');
    const loadBtn = document.getElementById('loadBtn');
    const resultsContainer = document.getElementById('resultsContainer');
    const statsPanel = document.getElementById('statsPanel');
    const totalDrawsEl = document.getElementById('totalDraws');
    const currentDateDisplay = document.getElementById('currentDateDisplay');

    // Default to local today YYYY-MM-DD
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
});
