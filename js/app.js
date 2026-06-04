let rawMatchesCache = [];
let activeFilter = 'all';
let chartDonutInstance = null;
let chartLineInstance = null;

// ==========================================================================
// 1. APP ENTRY POINT
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    initializeEmptyCharts();
    setupPasscodeFlow();
});

function setupPasscodeFlow() {
    const inputs = document.querySelectorAll('.code-input');
    const errorBox = document.getElementById('passcode-error-msg');

    inputs.forEach((input, index) => {
        input.addEventListener('input', async () => {
            input.value = input.value.replace(/[^0-9]/g, ''); // รับตัวเลขเท่านั้น

            if (input.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus(); // ย้ายช่องอัตโนมัติ
            }

            const compiledCode = Array.from(inputs).map(i => i.value).join('');
            if (compiledCode.length === 6) {
                errorBox.style.color = 'var(--neon-cyan)';
                errorBox.innerText = "กำลังตรวจสอบสิทธิ์ความปลอดภัย...";

                const isCorrect = await AppDataLayer.verifyPasscodeWithBackend(compiledCode);

                if (isCorrect) {
                    errorBox.innerText = "";
                    document.getElementById('passcode-overlay').classList.add('access-granted');
                    executeDataScan(); 
                } else {
                    errorBox.style.color = 'var(--neon-red)';
                    errorBox.innerText = "❌ รหัสผ่านไม่ถูกต้อง โปรดลองอีกครั้ง";
                    inputs.forEach(i => i.value = '');
                    inputs[0].focus();
                }
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && input.value.length === 0 && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });
}

function setupEventListeners() {
    document.getElementById('btn-fetch-data').addEventListener('click', executeDataScan);
    
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            activeFilter = e.target.getAttribute('data-filter');
            renderMatchTable();
        });
    });
}

// ==========================================================================
// 2. WEIGHTED ANALYTICAL ENGINE (วิเคราะห์ 5 ปัจจัยหลัก)
// ==========================================================================
function runAnalyticalRules(match) {
    const baseline = match.ml_predict.home_win_pct; 
    const formBonus = match.home_form >= 80 ? 7 : (match.home_form < 60 ? -8 : 0);
    const oddsAdjustment = match.odds_flow === 'dropping' ? 10 : (match.odds_flow === 'rising' ? -10 : 0);
    const injuryImpact = match.injuries.home_key_out * 5; 
    const venueEdge = match.home_away_edge || 0;
    const motivationBonus = (match.motivation_level && match.motivation_level >= 75) ? 5 : 0;

    let computedScore = Math.round(baseline + formBonus + oddsAdjustment + venueEdge + motivationBonus - injuryImpact);
    computedScore = Math.max(0, Math.min(100, computedScore)); 

    let grading = 'REJECTED';
    if (computedScore >= 75) grading = 'ACTIVE';
    else if (computedScore >= 60) grading = 'WATCHLIST';

    return { score: computedScore, status: grading };
}

// ==========================================================================
// 3. UI DATATABLE RENDERING
// ==========================================================================
async function executeDataScan() {
    toggleSkeletonLoader(true);
    document.getElementById('sync-timestamp').innerText = "กำลังประมวลผลโมเดล...";
    
    const data = await AppDataLayer.fetchLiveBsdData();
    rawMatchesCache = data.map(item => {
        const analysis = runAnalyticalRules(item);
        return { ...item, calculatedScore: analysis.score, calculatedStatus: analysis.status };
    });

    toggleSkeletonLoader(false);
    document.getElementById('sync-timestamp').innerText = `อัปเดตสแกนล่าสุด: ${new Date().toLocaleTimeString('th-TH')}`;
    
    renderMatchTable();
    updateDonutDistribution();
}

function toggleSkeletonLoader(show) {
    const tbody = document.getElementById('match-table-body');
    if (show) {
        tbody.innerHTML = '';
        const template = document.getElementById('skeleton-row-template');
        for (let i = 0; i < 4; i++) tbody.appendChild(template.content.cloneNode(true));
    }
}

function renderMatchTable() {
    const tbody = document.getElementById('match-table-body');
    tbody.innerHTML = '';

    const filtered = rawMatchesCache.filter(m => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'dropping') return m.odds_flow === 'dropping';
        return m.calculatedStatus === activeFilter;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:25px;">ไม่พบคู่แข่งขันที่ตรงเงื่อนไข</td></tr>`;
        return;
    }

    filtered.forEach(match => {
        const tr = document.createElement('tr');
        tr.className = 'match-data-row';
        tr.addEventListener('click', () => handleMatchSelection(match));
        
        tr.innerHTML = `
            <td><strong>${match.time}</strong></td>
            <td><strong>${match.home}</strong> vs ${match.away}</td>
            <td><span style="color:var(--text-muted)">${match.league}</span></td>
            <td><span style="font-weight:600;color:${match.calculatedScore >= 75 ? 'var(--neon-green)' : 'var(--neon-cyan)'}">${match.calculatedScore}%</span></td>
            <td><span class="badge ${match.calculatedStatus.toLowerCase()}">${match.calculatedStatus}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================================================
// 4. SMART VISUALS CONFIGS
// ==========================================================================
function handleMatchSelection(match) {
    const insightBox = document.getElementById('ai-commentary-box');
    let commentary = `บทสรุปอัจฉริยะ: แมตช์ระหว่าง **${match.home}** และ **${match.away}** ได้คะแนนดัชนีสุทธิ ${match.calculatedScore}% อยู่ในระดับเกรด **${match.calculatedStatus}** `;
    
    if (match.odds_flow === 'dropping') {
        commentary += `โดยตรวจพบบันทึกเงินทุนไหลเข้าฝั่งเจ้าบ้าน (Dropping Odds) อย่างผิดปกติชัดเจนครับ `;
    }
    if (match.injuries.away_key_out > 0) {
        commentary += `และทีมเยือนยังมีตัวหลักบาดเจ็บส่งผลเสียต่อรูปเกมชัดเจน`;
    }
    insightBox.innerHTML = commentary;

    document.getElementById('txt-home-formation').innerText = `${match.home}\n(${match.lineups.home_form})`;
    document.getElementById('txt-away-formation').innerText = `${match.away}\n(${match.lineups.away_form})`;

    const factorsWrapper = document.getElementById('factor-bars-wrapper');
    factorsWrapper.innerHTML = `
        <div class="factor-bar-container"><span>1. ฟอร์มล่าสุดทีมเหย้า: ${match.home_form}%</span><div class="progress-track"><div class="progress-fill" style="width: ${match.home_form}%"></div></div></div>
        <div class="factor-bar-container"><span>2. BSD ML โมเดลคณิตศาสตร์: ${match.ml_predict.home_win_pct}%</span><div class="progress-track"><div class="progress-fill" style="width: ${match.ml_predict.home_win_pct}%"></div></div></div>
        <div class="factor-bar-container"><span>3. ความได้เปรียบเหย้าเยือน: ${(match.home_away_edge * 5)}%</span><div class="progress-track"><div class="progress-fill" style="width: ${(match.home_away_edge * 5)}%"></div></div></div>
        <div class="factor-bar-container"><span>4. ดัชนีแรงจูงใจทีมแข่ง: ${match.motivation_level}%</span><div class="progress-track"><div class="progress-fill" style="width: ${match.motivation_level}%"></div></div></div>
    `;

    updateTrendLineChart([45, 52, 60, match.calculatedScore - 3, match.calculatedScore]);

    AppDataLayer.sendToGasDatabase({
        matchId: match.id, homeTeam: match.home, awayTeam: match.away, league: match.league, aiScore: match.calculatedScore, status: match.calculatedStatus
    });
}

function initializeEmptyCharts() {
    const ctxDonut = document.getElementById('donutDistributionChart').getContext('2d');
    chartDonutInstance = new Chart(ctxDonut, {
        type: 'doughnut',
        data: { labels: ['ACTIVE', 'WATCHLIST', 'REJECTED'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#00e676', '#00f2fe', '#ff1744'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#64748b', font: { family: 'Prompt', size: 11 } } } } }
    });

    const ctxLine = document.getElementById('lineTrendChart').getContext('2d');
    chartLineInstance = new Chart(ctxLine, {
        type: 'line',
        data: { labels: ['5 นัดก่อน', '4 นัดก่อน', '3 นัดก่อน', '2 นัดก่อน', 'นัดล่าสุด'], datasets: [{ label: 'ทิศทางคะแนน AI', data: [0, 0, 0, 0, 0], borderColor: '#00f2fe', borderWidth: 2, pointBackgroundColor: '#00f2fe', fill: false, tension: 0.25 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: '#64748b' } }, y: { ticks: { color: '#64748b' }, min: 0, max: 100 } } }
    });
}

function updateDonutDistribution() {
    let act = rawMatchesCache.filter(m => m.calculatedStatus === 'ACTIVE').length;
    let wat = rawMatchesCache.filter(m => m.calculatedStatus === 'WATCHLIST').length;
    let rej = rawMatchesCache.filter(m => m.calculatedStatus === 'REJECTED').length;
    chartDonutInstance.data.datasets[0].data = [act, wat, rej];
    chartDonutInstance.update();
}

function updateTrendLineChart(dataPoints) {
    chartLineInstance.data.datasets[0].data = dataPoints;
    chartLineInstance.update();
}