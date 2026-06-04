/**
 * AI Football Prediction Scanner - Core Application Logic
 * Architecture: Service-Driven Design
 */

// --- 1. CONFIGURATION & CONSTANTS ---
const COLORS = {
    'เชลซี':'#1e40af','นิวคาสเซิล':'#1f2937','ดอร์ทมุนด์':'#d97706','ไลป์ซิก':'#dc2626',
    'บาร์เซโลน่า':'#1d4ed8','เรอัล โซเซียดัด':'#1e3a5f','เอซี มิลาน':'#dc2626','อตาลันต้า':'#1e40af',
    'ลีออง':'#1e3a8a','มาร์กเซย':'#60a5fa','เบนฟิก้า':'#991b1b','ปอร์โต':'#b45309',
    'อาร์เซนอล':'#dc2626','แมนซิตี้':'#60a5fa','ลิเวอร์พูล':'#ef4444','แมนยู':'#dc2626'
};
const FLAG = {'ENG PR':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','GER BL':'🇩🇪','SPA LA':'🇪🇸','ITA SA':'🇮🇹','FRA LI':'🇫🇷','POR LP':'🇵🇹'};
const LEAGUE_FULL = {'ENG PR':'Premier League','GER BL':'Bundesliga','SPA LA':'La Liga','ITA SA':'Serie A','FRA LI':'Ligue 1','POR LP':'Primeira Liga'};

// Base fallback data structure mirroring the dashboard contract
const MATCHES_BASE = [
    {time:'18:30',home:'เชลซี',away:'นิวคาสเซิล',league:'ENG PR',score:78,odds:{h:1.85,d:3.4,a:4.2},injury:'อาบาดา (บาดเจ็บ)',h2h:'เชลซี 3W-1D-1L',form:{h:['W','W','D','W','W'],a:['W','L','D','W','W']}},
    {time:'19:00',home:'ดอร์ทมุนด์',away:'ไลป์ซิก',league:'GER BL',score:72,odds:{h:2.1,d:3.2,a:3.6},injury:'',h2h:'ดอร์ทมุนด์ 2W-2D-1L',form:{h:['W','D','W','L','W'],a:['W','W','L','D','W']}},
    {time:'20:00',home:'บาร์เซโลน่า',away:'เรอัล โซเซียดัด',league:'SPA LA',score:65,odds:{h:1.6,d:3.8,a:5.5},injury:'เปโดร (แขวน)',h2h:'บาร์ซา 4W-0D-1L',form:{h:['W','W','W','D','W'],a:['D','W','L','W','D']}},
    {time:'20:30',home:'เอซี มิลาน',away:'อตาลันต้า',league:'ITA SA',score:58,odds:{h:2.3,d:3.1,a:3.2},injury:'ลีโอ (พัก)',h2h:'มิลาน 2W-1D-2L',form:{h:['W','L','D','W','L'],a:['W','W','D','W','L']}},
    {time:'21:00',home:'ลีออง',away:'มาร์กเซย',league:'FRA LI',score:45,odds:{h:2.8,d:3.0,a:2.6},injury:'',h2h:'เสมอกัน 2W-3D-2L',form:{h:['D','W','L','D','W'],a:['L','W','D','L','W']}},
    {time:'22:00',home:'เบนฟิก้า',away:'ปอร์โต',league:'POR LP',score:61,odds:{h:2.0,d:3.3,a:3.8},injury:'',h2h:'เบนฟิก้า 3W-1D-2L',form:{h:['W','D','W','W','D'],a:['W','L','W','D','W']}},
    {time:'14:00',home:'อาร์เซนอล',away:'แมนซิตี้',league:'ENG PR',score:82,odds:{h:2.4,d:3.3,a:2.9},injury:'ฮาลันด์ เล่นได้',h2h:'สลับกัน 3W-2D-3L',form:{h:['W','W','W','D','W'],a:['W','W','W','L','W']}},
    {time:'16:30',home:'ลิเวอร์พูล',away:'แมนยู',league:'ENG PR',score:74,odds:{h:1.75,d:3.6,a:5.0},injury:'จาเรล กลับมา',h2h:'ลิเวอร์พูล 4W-1D-1L',form:{h:['W','W','W','W','D'],a:['L','D','W','L','D']}},
];

// --- 2. SERVICE LAYER (API HANDLING) ---
class FootballAPIService {
    /**
     * ดึงข้อมูล Match และค่าการวิเคราะห์จาก API
     */
    static async fetchScannedMatches() {
        try {
            // [NOTE] เมื่อได้รายละเอียด Endpoint/API Key ของ BSD (Bzzoiro Sports Data) ที่แน่นอนแล้ว ให้ใส่ URL ตรงนี้
            // const response = await fetch('https://api.bzzoiro.com/v1/scan?predictions=true');
            // if (!response.ok) throw new Error('API request failed');
            // const apiData = await response.json();
            // return this.mapToAppSchema(apiData);

            // จำลองการดึงแบบ Asynchronous เสมือนการยิง API จริง
            return new Promise((resolve) => {
                setTimeout(() => {
                    const dynamicMatches = MATCHES_BASE.map(m => ({
                        ...m,
                        score: Math.max(10, Math.min(99, m.score + Math.floor(Math.random() * 6) - 3))
                    }));
                    resolve(dynamicMatches);
                }, 400);
            });
        } catch (error) {
            console.error("APIService Error:", error);
            return MATCHES_BASE;
        }
    }

    static mapToAppSchema(apiData) {
        return apiData;
    }
}

// --- 3. APPLICATION STATE ---
let filters = { league: 'ALL', score: 'ALL', search: '' };
let allMatches = [];
let donutChart = null;
let trendChart = null;

// --- 4. UI RENDERERS & HELPERS ---
function getStatus(score) {
    if (score >= 70) return { cls: 'status-active', label: 'ACTIVE', dot: true };
    if (score >= 40) return { cls: 'status-watch', label: 'WATCHLIST', dot: false };
    return { cls: 'status-reject', label: 'REJECTED', dot: false };
}

function getScoreColor(score) {
    if (score >= 70) return { stroke: '#4ade80', text: '#4ade80', label: 'HIGH' };
    if (score >= 40) return { stroke: '#fbbf24', text: '#fbbf24', label: 'MEDIUM' };
    return { stroke: '#f87171', text: '#f87171', label: 'LOW' };
}

function buildScoreRing(score) {
    const c = getScoreColor(score);
    const pct = score / 100;
    const r = 17; 
    const circ = 2 * Math.PI * r;
    const dash = pct * circ;
    return `<div class="score-ring">
        <svg width="42" height="42" viewBox="0 0 42 42">
            <circle cx="21" cy="21" r="${r}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="3"/>
            <circle cx="21" cy="21" r="${r}" fill="none" stroke="${c.stroke}" stroke-width="3" stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}" stroke-linecap="round"/>
        </svg>
        <div style="text-align:center">
            <span class="score-num" style="color:${c.text}">${score}</span>
            <span class="score-label" style="color:${c.text};opacity:0.7">${c.label}</span>
        </div>
    </div>`;
}

function teamLogo(name) {
    const col = COLORS[name] || '#475569';
    const init = name.slice(0, 2).toUpperCase();
    return `<div class="team-logo" style="background:${col}22;color:${col};border:0.5px solid ${col}44">${init}</div>`;
}

function renderMatches() {
    let data = allMatches.filter(m => {
        if (filters.league !== 'ALL' && m.league !== filters.league) return false;
        if (filters.score === 'HIGH' && m.score < 70) return false;
        if (filters.score === 'MED' && (m.score < 40 || m.score >= 70)) return false;
        if (filters.search) {
            const s = filters.search.toLowerCase();
            if (!m.home.toLowerCase().includes(s) && !m.away.toLowerCase().includes(s)) return false;
        }
        return true;
    });

    const tbody = document.getElementById('match-tbody');
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:rgba(148,163,184,0.4);font-size:0.78rem">ไม่พบคู่แข่งขันที่ตรงกับเงื่อนไข</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(m => {
        const st = getStatus(m.score);
        const dotHtml = st.dot ? `<div class="dot-blink"></div>` : '';
        const oddsHtml = `<div style="font-size:0.62rem;color:rgba(148,163,184,0.45);margin-top:2px">1:${m.odds.h} · X:${m.odds.d} · 2:${m.odds.a}</div>`;
        return `<tr class="match-row" data-index="${allMatches.indexOf(m)}">
            <td class="time-cell">${m.time}</td>
            <td>
                <div class="match-teams">
                    <div class="team-name">${teamLogo(m.home)}<span>${m.home}</span></div>
                    <div class="vs-badge">vs</div>
                    <div class="team-name">${teamLogo(m.away)}<span>${m.away}</span></div>
                </div>
                ${oddsHtml}
            </td>
            <td><span class="league-badge">${FLAG[m.league] || ''} ${m.league}</span></td>
            <td class="ai-score-cell">${buildScoreRing(m.score)}</td>
            <td style="text-align:center"><span class="status-badge ${st.cls}">${dotHtml}${st.label}</span></td>
        </tr>`;
    }).join('');
    
    updateStats(allMatches);
}

function updateStats(data) {
    const total = data.length;
    const hi = data.filter(m => m.score >= 70).length;
    const me = data.filter(m => m.score >= 40 && m.score < 70).length;
    const lo = data.filter(m => m.score < 40).length;
    
    document.getElementById('total-matches').textContent = total;
    document.getElementById('pct-high').textContent = total ? Math.round(hi / total * 100) + '%' : '0%';
    document.getElementById('pct-med').textContent = total ? Math.round(me / total * 100) + '%' : '0%';
    document.getElementById('pct-low').textContent = total ? Math.round(lo / total * 100) + '%' : '0%';
    
    if (donutChart) {
        donutChart.data.datasets[0].data = [hi, me, lo];
        donutChart.update();
    }
    renderLeague(data);
}

function renderLeague(data) {
    const counts = {};
    data.forEach(m => { counts[m.league] = (counts[m.league] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = sorted[0]?.[1] || 1;
    const BAR_COLORS = { 'ENG PR': '#3b82f6', 'GER BL': '#f59e0b', 'SPA LA': '#ef4444', 'ITA SA': '#10b981', 'FRA LI': '#8b5cf6', 'POR LP': '#ec4899' };
    
    document.getElementById('league-list').innerHTML = sorted.map(([lg, ct]) =>
        `<div class="league-item">
            <div class="league-name">${FLAG[lg] || ''} ${lg}</div>
            <div class="league-bar-wrap"><div class="league-bar-fill" style="width:${Math.round(ct / max * 100)}%;background:${BAR_COLORS[lg] || '#3b82f6'}"></div></div>
            <div class="league-count">${ct}</div>
        </div>`
    ).join('');
}

function renderFormGuide() {
    const teams = [allMatches[0], allMatches[6], allMatches[7], allMatches[1]].filter(Boolean);
    document.getElementById('form-guide').innerHTML = teams.map(m => {
        const dots = m.form.h.map(r => `<div class="form-dot form-${r.toLowerCase()}">${r}</div>`).join('');
        return `<div class="form-team">
            <div class="form-name">${m.home}</div>
            <div class="form-dots">${dots}</div>
        </div>`;
    }).join('');
}

function renderFactors() {
    const factors = [
        { name: 'ฟอร์มทีม (Team Form)', icon: 'ti-trending-up', val: 78, color: '#3b82f6' },
        { name: 'สถิติพบกัน (H2H Metrics)', icon: 'ti-sword', val: 71, color: '#8b5cf6' },
        { name: 'สภาพความพร้อมทีม (Squad Availability)', icon: 'ti-users', val: 65, color: '#10b981' },
        { name: 'แทคติกที่คาด (Tactical Matchup)', icon: 'ti-chess-knight', val: 60, color: '#f59e0b' },
        { name: 'ราคาค่าน้ำผิดปกติ (Odds Discrepancy)', icon: 'ti-bolt', val: 55, color: '#ef4444' },
    ];
    document.getElementById('factor-list').innerHTML = factors.map(f =>
        `<div class="factor-item">
            <div class="factor-top">
                <div class="factor-name"><i class="ti ${f.icon}" aria-hidden="true"></i>${f.name}</div>
                <div class="factor-val">${f.val}</div>
            </div>
            <div class="factor-bar"><div class="factor-fill" style="width:${f.val}%;background:${f.color}"></div></div>
        </div>`
    ).join('');
}

// --- 5. INITIALIZERS & EVENT HANDLERS ---
function initDonut() {
    const ctx = document.getElementById('donutChart').getContext('2d');
    donutChart = new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: [0, 0, 0], backgroundColor: ['#4ade80', '#fbbf24', '#f87171'], borderWidth: 0, hoverOffset: 4 }] },
        options: { responsive: false, cutout: '72%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: d => `${d.raw} คู่` } } }, animation: { duration: 800 } }
    });
}

function initTrend() {
    const ctx = document.getElementById('trendChart').getContext('2d');
    const labels = ['05/05', '06/05', '07/05', '08/05', '09/05', '10/05'];
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'ค่าเฉลี่ย', data: [52, 58, 55, 62, 68, 72], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)', tension: 0.4, pointRadius: 3, pointBackgroundColor: '#3b82f6', fill: true, borderWidth: 2 },
                { label: 'คู่ผ่าน', data: [28, 32, 30, 36, 40, 45], borderColor: '#22c55e', backgroundColor: 'transparent', tension: 0.4, pointRadius: 3, pointBackgroundColor: '#22c55e', borderWidth: 2, borderDash: [4, 3] }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(148,163,184,0.6)', font: { size: 10 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(148,163,184,0.6)', font: { size: 10 } }, min: 0, max: 100 } } }
    });
}

async function loadData() {
    const tbody = document.getElementById('match-tbody');
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:rgba(148,163,184,0.5)"><i class="ti ti-loader" aria-hidden="true" style="animation: blink 1s infinite"></i> กำลังอัปเดตข้อมูลจาก API...</td></tr>`;
    
    allMatches = await FootballAPIService.fetchScannedMatches();
    
    const now = new Date();
    document.getElementById('scan-time').textContent = `อัปเดตล่าสุด ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    renderMatches();
    renderFormGuide();
}

function updateClock() {
    const bkk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    document.getElementById('live-clock').textContent = `${bkk.getHours().toString().padStart(2, '0')}:${bkk.getMinutes().toString().padStart(2, '0')}:${bkk.getSeconds().toString().padStart(2, '0')}`;
    const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    document.getElementById('live-date').textContent = `${days[bkk.getDay()]} ${bkk.getDate()} ${months[bkk.getMonth()]} ${bkk.getFullYear() + 543}`;
}

// --- 6. EVENT LISTENERS INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initDonut();
    initTrend();
    renderFactors();
    loadData();
    setInterval(updateClock, 1000);
    updateClock();

    // Event Delegation ฟังก์ชันคลิกปุ่มกรอง
    document.querySelector('.filter-row').addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        
        const type = btn.getAttribute('data-filter-type');
        const value = btn.getAttribute('data-value');
        
        filters[type] = value;
        
        btn.parentElement.querySelectorAll(`[data-filter-type="${type}"]`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderMatches();
    });

    // ค้นหาทีมแบบ Real-time
    document.getElementById('search-input').addEventListener('input', (e) => {
        filters.search = e.target.value;
        renderMatches();
    });

    // ปุ่มรีเฟรชข้อมูล
    document.getElementById('btn-refresh').addEventListener('click', loadData);

    // ฟังก์ชันส่ง Prompt วิเคราะห์คู่บอลเมื่อผู้ใช้คลิกแถวตาราง
    document.getElementById('match-tbody').addEventListener('click', (e) => {
        const row = e.target.closest('.match-row');
        if (!row) return;
        const idx = row.getAttribute('data-index');
        const m = allMatches[idx];
        if (m && typeof sendPrompt === 'function') {
            sendPrompt(`วิเคราะห์คู่ ${m.home} vs ${m.away} (${LEAGUE_FULL[m.league] || m.league}) เวลา ${m.time} | AI Score: ${m.score} | ราคา: 1(${m.odds.h}) X(${m.odds.d}) 2(${m.odds.a}) | H2H: ${m.h2h} | อาการบาดเจ็บ: ${m.injury || 'ไม่มี'}`);
        }
    });
});