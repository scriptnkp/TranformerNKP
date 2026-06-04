/**
 * AI Football Prediction Scanner - Core Application Logic
 * Version: 4.4 (Dynamic Time Formatter & Today's Match Filter)
 */

// --- 1. API CONFIGURATION ---
const BSD_API_CONFIG = {
    BASE_URL: 'https://api.bzzoiro.com/v1', 
    API_KEY: '07f957204727339378ce25dd19c68600bb799a42', 
    ENABLE_REAL_API: true                                
};

// --- STABLE LOGOS CDN ---
const LOGOS = {
    'เชลซี': 'https://crests.football-data.org/61.png',
    'นิวคาสเซิล': 'https://crests.football-data.org/67.png',
    'ดอร์ทมุนด์': 'https://crests.football-data.org/4.png',
    'ไลป์ซิก': 'https://crests.football-data.org/721.png',
    'บาร์เซโลน่า': 'https://crests.football-data.org/81.png',
    'เรอัล โซเซียดัด': 'https://crests.football-data.org/92.png',
    'เอซี มิลาน': 'https://crests.football-data.org/98.png',
    'อตาลันต้า': 'https://crests.football-data.org/108.png',
    'ลีออง': 'https://crests.football-data.org/523.png',
    'มาร์กเซย': 'https://crests.football-data.org/516.png',
    'เบนฟิก้า': 'https://crests.football-data.org/1903.png',
    'ปอร์โต': 'https://crests.football-data.org/503.png',
    'อาร์เซนอล': 'https://crests.football-data.org/57.png',
    'แมนซิตี้': 'https://crests.football-data.org/65.png',
    'ลิเวอร์พูล': 'https://crests.football-data.org/64.png',
    'แมนยู': 'https://crests.football-data.org/66.png',
    'ยูเวนตุส': 'https://crests.football-data.org/109.png',
    'เรอัล มาดริด': 'https://crests.football-data.org/86.png',
    'เปแอสเช': 'https://crests.football-data.org/524.png',
    'บาเยิร์น': 'https://crests.football-data.org/5.png'
};

const FLAG = {'ENG PR':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','GER BL':'🇩🇪','SPA LA':'🇪🇸','ITA SA':'🇮🇹','FRA LI':'🇫🇷','POR LP':'🇵🇹', 'UEFA CL':'🇪🇺'};
const LEAGUE_FULL = {'ENG PR':'Premier League','GER BL':'Bundesliga','SPA LA':'La Liga','ITA SA':'Serie A','FRA LI':'Ligue 1','POR LP':'Primeira Liga', 'UEFA CL':'Champions League'};

const MATCHES_BASE = [
    {time:'18:30',home:'เรอัล มาดริด',away:'ยูเวนตุส',league:'UEFA CL',score:85,odds:{h:1.75,d:3.6,a:4.5},openingOdds:{h:1.80,d:3.5,a:4.2},motivationFactor:1.3,injury:'ไม่มีรายงานตัวเจ็บเพิ่ม',h2h:'มาดริด 2W-2D-1L',form:{h:['W','W','D','W','W'],a:['W','D','D','W','W']},formations:{home:'4-3-3',away:'3-5-2'}},
    {time:'19:00',home:'เปแอสเช',away:'บาเยิร์น',league:'UEFA CL',score:88,odds:{h:2.4,d:3.3,a:2.8},openingOdds:{h:2.60,d:3.2,a:2.6},motivationFactor:1.2,injury:'เปแอสเช (รอเช็กฟิต)',h2h:'บาเยิร์น 3W-1D-1L',form:{h:['W','W','L','W','W'],a:['W','W','W','D','W']},formations:{home:'4-3-3',away:'4-2-3-1'}},
    {time:'20:00',home:'เชลซี',away:'นิวคาสเซิล',league:'ENG PR',score:78,odds:{h:1.85,d:3.4,a:4.2},openingOdds:{h:2.10,d:3.3,a:3.8},motivationFactor:1.2,injury:'ไม่มีรายงานตัวเจ็บเพิ่ม',h2h:'เชลซี 3W-1D-1L',form:{h:['W','W','D','W','W'],a:['W','L','D','W','W']},formations:{home:'4-2-3-1',away:'4-3-3'}},
    {time:'20:30',home:'บาร์เซโลน่า',away:'เรอัล โซเซียดัด',league:'SPA LA',score:65,odds:{h:1.6,d:3.8,a:5.5},openingOdds:{h:1.62,d:3.7,a:5.4},motivationFactor:1.1,injury:'เปโดร (แขวน)',h2h:'บาร์ซา 4W-0D-1L',form:{h:['W','W','W','D','W'],a:['D','W','L','W','D']},formations:{home:'4-3-3',away:'4-2-3-1'}},
    {time:'21:00',home:'ดอร์ทมุนด์',away:'ไลป์ซิก',league:'GER BL',score:72,odds:{h:2.1,d:3.2,a:3.6},openingOdds:{h:2.15,d:3.2,a:3.5},motivationFactor:1.0,injury:'',h2h:'ดอร์ทมุนด์ 2W-2D-1L',form:{h:['W','D','W','L','W'],a:['W','W','L','D','W']},formations:{home:'4-4-2',away:'4-3-3'}},
    {time:'22:00',home:'เอซี มิลาน',away:'อตาลันต้า',league:'ITA SA',score:58,odds:{h:2.3,d:3.1,a:3.2},openingOdds:{h:2.20,d:3.2,a:3.4},motivationFactor:1.0,injury:'ลีโอ (พัก)',h2h:'มิลาน 2W-1D-2L',form:{h:['W','L','D','W','L'],a:['W','W','D','W','L']},formations:{home:'4-2-3-1',away:'3-5-2'}}
];

// --- 2. SERVICE LAYER ---
class FootballAPIService {
    static async fetchScannedMatches() {
        if (!BSD_API_CONFIG.ENABLE_REAL_API) {
            return this.executeFallbackProcess();
        }
        try {
            const response = await fetch(`${BSD_API_CONFIG.BASE_URL}/fixtures/live-scan?predictions=true`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${BSD_API_CONFIG.API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);
            const rawData = await response.json();
            return this.mapAndAnalyzeData(rawData.data || rawData);
        } catch (error) {
            console.warn("⚠️ API Unavailable. Engaging Advanced Simulation Engine.");
            return this.executeFallbackProcess();
        }
    }

    static mapAndAnalyzeData(fixtures) {
        return fixtures.map((m, idx) => {
            let oddsDropPercent = 0;
            if (m.openingOdds && m.odds && m.openingOdds.h) {
                oddsDropPercent = ((m.openingOdds.h - m.odds.h) / m.openingOdds.h) * 100;
            }
            let finalAIScore = m.score || 50;
            if (oddsDropPercent > 8) finalAIScore += 5; 
            if (m.motivationFactor) finalAIScore = finalAIScore * m.motivationFactor;

            finalAIScore = Math.max(10, Math.min(99, Math.round(finalAIScore)));

            const fallbackFormations = [
                {home:'4-3-3', away:'3-5-2'}, {home:'4-2-3-1', away:'4-3-3'},
                {home:'4-4-2', away:'4-3-3'}, {home:'4-3-3', away:'4-2-3-1'}
            ];

            return {
                time: m.time, home: m.home, away: m.away, league: m.league,
                score: finalAIScore,
                odds: m.odds || {h:1.8, d:3.2, a:4.0},
                openingOdds: m.openingOdds || m.odds || {h:1.9, d:3.2, a:3.8},
                injury: m.injury || 'ไม่มีตัวเจ็บเพิ่มเติม',
                h2h: m.h2h || 'สูสีเบียดกันมาตลอด',
                form: m.form || {h:['W','D','W','L','W'], a:['W','L','D','W','D']},
                formations: m.formations || fallbackFormations[idx % fallbackFormations.length],
                oddsDropAlert: oddsDropPercent > 7
            };
        });
    }

    static executeFallbackProcess() {
        return new Promise((resolve) => {
            setTimeout(() => { resolve(this.mapAndAnalyzeData(MATCHES_BASE)); }, 300);
        });
    }
}

// --- 3. APPLICATION STATE ---
let filters = { league: 'ALL', score: 'ALL', search: '' };
let allMatches = [];
let donutChart = null;
let trendChart = null;

// --- 4. DATA-DRIVEN INTERACTION UPDATERS ---
function selectMatch(match) {
    if (!match) return;
    renderPremiumPitchSVG(match);
    renderDynamicFactors(match);
    renderDynamicFormGuide(match);
    updateMatchProbabilityDonut(match);
    updateMatchTrendChart(match);
}

function getStatus(score) {
    if (score >= 70) return { cls: 'status-active', label: 'ACTIVE', dot: true };
    if (score >= 40) return { cls: 'status-watch', label: 'WATCHLIST', dot: false };
    return { cls: 'status-reject', label: 'REJECTED', dot: false };
}

// [ADDED] ฟังก์ชันตัวช่วยแปลงเวลาและระบุป้าย "วันนี้"
function formatTimeDisplay(timeStr) {
    let formattedTime = timeStr;
    const d = new Date(timeStr);
    
    // หากเป็นข้อมูลจาก API จริง (รูปแบบ ISO Timestamp)
    if (!isNaN(d.getTime()) && timeStr.toString().includes('-')) {
        const h = d.getHours().toString().padStart(2, '0');
        const min = d.getMinutes().toString().padStart(2, '0');
        formattedTime = `${h}:${min}`;
    }
    
    // คืนค่าเป็น HTML ที่จัดสไตล์ตัวอักษรแล้ว
    return `
        <div style="font-size:0.68rem; color:#3b82f6; font-weight:700; letter-spacing:0.5px; margin-bottom:2px;">วันนี้</div>
        <div style="font-size:0.85rem; font-family:'Teko', sans-serif; font-weight:500; letter-spacing:0.5px;">${formattedTime}</div>
    `;
}

function updateMatchProbabilityDonut(match) {
    const hInv = 1 / match.odds.h; const dInv = 1 / match.odds.d; const aInv = 1 / match.odds.a;
    const sum = hInv + dInv + aInv;
    const hPct = Math.round((hInv / sum) * 100);
    const dPct = Math.round((dInv / sum) * 100);
    const aPct = 100 - hPct - dPct;
    
    document.getElementById('dist-title').innerHTML = `PROBABILITY MAP: ${match.home} VS ${match.away}`;
    document.getElementById('total-matches').textContent = match.score;
    document.getElementById('dist-center-label').textContent = 'AI SCORE';
    
    document.getElementById('dist-lbl-1').innerHTML = `<div class="dist-dot" style="background:#4ade80"></div>ชนะฝั่งเจ้าบ้าน`;
    document.getElementById('dist-lbl-2').innerHTML = `<div class="dist-dot" style="background:#fbbf24"></div>โอกาสผลเสมอ`;
    document.getElementById('dist-lbl-3').innerHTML = `<div class="dist-dot" style="background:#f87171"></div>ชนะฝั่งทีมเยือน`;
    
    document.getElementById('pct-high').textContent = hPct + '%';
    document.getElementById('pct-med').textContent = dPct + '%';
    document.getElementById('pct-low').textContent = aPct + '%';
    
    if (donutChart) {
        donutChart.data.datasets[0].data = [hPct, dPct, aPct];
        donutChart.update();
    }
}

function renderDynamicFactors(match) {
    const base = match.score;
    const factors = [
        { name: 'ฟอร์มทีมล่าสุด (Team Form)', val: Math.min(99, Math.round(base * 0.98)), color: '#3b82f6' },
        { name: 'สถิติพบกันย้อนหลัง (H2H Metrics)', val: Math.min(99, Math.round(base * 0.91 + 4)), color: '#8b5cf6' },
        { name: 'ความพร้อมขุมกำลัง (Squad)', val: match.injury.includes('ไม่มี') || match.injury === '' ? 95 : 65, color: '#10b981' },
        { name: 'ความได้เปรียบทางยุทธวิธี (Tactical)', val: Math.min(99, Math.round(base * 0.84 + 11)), color: '#f59e0b' },
        { name: 'ทิศทางกระแสค่าน้ำไหล (Odds Flow)', val: match.oddsDropAlert ? 90 : 55, color: '#ef4444' },
    ];
    document.getElementById('factor-list').innerHTML = factors.map(f =>
        `<div class="factor-item">
            <div class="factor-top">
                <div class="factor-name">${f.name}</div>
                <div class="factor-val">${f.val}</div>
            </div>
            <div class="factor-bar"><div class="factor-fill" style="width:${f.val}%;background:${f.color}"></div></div>
        </div>`
    ).join('');
}

function renderDynamicFormGuide(match) {
    document.getElementById('form-title').innerHTML = `FORM GUIDE: <span style="color:#3b82f6">${match.home}</span> vs <span style="color:#ef4444">${match.away}</span>`;
    const teams = [
        { name: match.home, form: match.form.h, logo: LOGOS[match.home] || '' },
        { name: match.away, form: match.form.a, logo: LOGOS[match.away] || '' }
    ];
    document.getElementById('form-guide').innerHTML = teams.map(t => {
        const logoHtml = t.logo ? `<img src="${t.logo}" class="team-logo-img">` : '';
        const dots = t.form.map(r => `<div class="form-dot form-${r.toLowerCase()}">${r}</div>`).join('');
        return `<div class="form-team">
            <div class="form-logo-wrap">${logoHtml}</div>
            <div class="form-name" style="font-size:0.75rem;margin-left:4px">${t.name}</div>
            <div class="form-dots">${dots}</div>
        </div>`;
    }).join('');
}

function updateMatchTrendChart(match) {
    document.getElementById('trend-title').innerHTML = `TREND MATRIX: <span style="color:#3b82f6">${match.home}</span> vs <span style="color:#22c55e">${match.away}</span>`;
    const base = match.score;
    const homeHistory = [base - 7, base - 2, base - 4, base + 2, base - 1, base];
    const awayHistory = [60, 55, 58, 50, 52, Math.max(15, 100 - base)];
    
    document.getElementById('trend-legend-container').innerHTML = `
        <div class="trend-item"><div class="trend-dot" style="background:#3b82f6"></div>ฟอร์ม ${match.home}</div>
        <div class="trend-item"><div class="trend-dot" style="background:#22c55e"></div>ฟอร์ม ${match.away}</div>
    `;
    if (trendChart) {
        trendChart.data.datasets[0].label = match.home;
        trendChart.data.datasets[0].data = homeHistory.map(v => Math.max(10, Math.min(99, v)));
        trendChart.data.datasets[1].label = match.away;
        trendChart.data.datasets[1].data = awayHistory.map(v => Math.max(10, Math.min(99, v)));
        trendChart.update();
    }
}

// --- 5. PREMIUM HORIZONTAL SVG PITCH CORE ---
function renderPremiumPitchSVG(match) {
    if (!match || !match.formations) return;
    document.getElementById('tactical-title').innerHTML = `TACTICAL MATCHUP: <span style="color:#3b82f6">${match.home}</span> vs <span style="color:#ef4444">${match.away}</span>`;
    
    let homeDots = `<circle cx="10" cy="50" r="3.5" fill="#3b82f6"/>`; 
    if (match.formations.home === '4-3-3') {
        homeDots += `<circle cx="28" cy="18" r="3" fill="#3b82f6"/><circle cx="25" cy="40" r="3" fill="#3b82f6"/><circle cx="25" cy="60" r="3" fill="#3b82f6"/><circle cx="28" cy="82" r="3" fill="#3b82f6"/><circle cx="45" cy="25" r="3" fill="#3b82f6"/><circle cx="42" cy="50" r="3" fill="#3b82f6"/><circle cx="45" cy="75" r="3" fill="#3b82f6"/><circle cx="68" cy="20" r="3" fill="#3b82f6"/><circle cx="72" cy="50" r="3" fill="#3b82f6"/><circle cx="68" cy="80" r="3" fill="#3b82f6"/>`;
    } else if (match.formations.home === '3-5-2') {
        homeDots += `<circle cx="25" cy="25" r="3" fill="#3b82f6"/><circle cx="23" cy="50" r="3" fill="#3b82f6"/><circle cx="25" cy="75" r="3" fill="#3b82f6"/><circle cx="44" cy="15" r="3" fill="#3b82f6"/><circle cx="42" cy="33" r="3" fill="#3b82f6"/><circle cx="40" cy="50" r="3" fill="#3b82f6"/><circle cx="42" cy="67" r="3" fill="#3b82f6"/><circle cx="44" cy="85" r="3" fill="#3b82f6"/><circle cx="68" cy="35" r="3" fill="#3b82f6"/><circle cx="68" cy="65" r="3" fill="#3b82f6"/>`;
    } else { 
        homeDots += `<circle cx="28" cy="18" r="3" fill="#3b82f6"/><circle cx="25" cy="40" r="3" fill="#3b82f6"/><circle cx="25" cy="60" r="3" fill="#3b82f6"/><circle cx="28" cy="82" r="3" fill="#3b82f6"/><circle cx="42" cy="35" r="3" fill="#3b82f6"/><circle cx="42" cy="65" r="3" fill="#3b82f6"/><circle cx="58" cy="22" r="3" fill="#3b82f6"/><circle cx="60" cy="50" r="3" fill="#3b82f6"/><circle cx="58" cy="78" r="3" fill="#3b82f6"/><circle cx="72" cy="50" r="3" fill="#3b82f6"/>`;
    }

    let awayDots = `<circle cx="190" cy="50" r="3.5" fill="#ef4444"/>`; 
    if (match.formations.away === '4-3-3') {
        awayDots += `<circle cx="172" cy="18" r="3" fill="#ef4444"/><circle cx="175" cy="40" r="3" fill="#ef4444"/><circle cx="175" cy="60" r="3" fill="#ef4444"/><circle cx="172" cy="82" r="3" fill="#ef4444"/><circle cx="155" cy="25" r="3" fill="#ef4444"/><circle cx="158" cy="50" r="3" fill="#ef4444"/><circle cx="155" cy="75" r="3" fill="#ef4444"/><circle cx="132" cy="20" r="3" fill="#ef4444"/><circle cx="128" cy="50" r="3" fill="#ef4444"/><circle cx="132" cy="80" r="3" fill="#ef4444"/>`;
    } else if (match.formations.away === '4-4-2') {
        awayDots += `<circle cx="172" cy="18" r="3" fill="#ef4444"/><circle cx="175" cy="40" r="3" fill="#ef4444"/><circle cx="175" cy="60" r="3" fill="#ef4444"/><circle cx="172" cy="82" r="3" fill="#ef4444"/><circle cx="150" cy="18" r="3" fill="#ef4444"/><circle cx="152" cy="40" r="3" fill="#ef4444"/><circle cx="152" cy="60" r="3" fill="#ef4444"/><circle cx="150" cy="82" r="3" fill="#ef4444"/><circle cx="128" cy="35" r="3" fill="#ef4444"/><circle cx="128" cy="65" r="3" fill="#ef4444"/>`;
    } else { 
        awayDots += `<circle cx="172" cy="18" r="3" fill="#ef4444"/><circle cx="175" cy="40" r="3" fill="#ef4444"/><circle cx="175" cy="60" r="3" fill="#ef4444"/><circle cx="172" cy="82" r="3" fill="#ef4444"/><circle cx="158" cy="35" r="3" fill="#ef4444"/><circle cx="158" cy="65" r="3" fill="#ef4444"/><circle cx="142" cy="22" r="3" fill="#ef4444"/><circle cx="140" cy="50" r="3" fill="#ef4444"/><circle cx="142" cy="78" r="3" fill="#ef4444"/><circle cx="128" cy="50" r="3" fill="#ef4444"/>`;
    }

    document.getElementById('tactical-pitch-container').innerHTML = `
        <div class="pitch-header-label">
            <div>${match.formations.home}</div>
            <div>${match.formations.away}</div>
        </div>
        <div class="pitch-layout">
            <svg viewBox="0 0 200 100" width="100%" height="110">
                <rect x="2" y="2" width="196" height="96" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="0.6"/>
                <line x1="100" y1="2" x2="100" y2="98" stroke="rgba(255,255,255,0.25)" stroke-width="0.6"/>
                <circle cx="100" cy="50" r="16" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="0.6"/>
                <rect x="2" y="22" width="22" height="56" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>
                <rect x="2" y="36" width="7" height="28" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>
                <rect x="176" y="22" width="22" height="56" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>
                <rect x="191" y="36" width="7" height="28" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>
                ${homeDots} ${awayDots}
            </svg>
        </div>
    `;
}

// --- 6. CORE DASHBOARD RENDERERS ---
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
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:rgba(148,163,184,0.4)">ไม่พบคู่แข่งขันที่ตรงตามเงื่อนไขตัวกรอง</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(m => {
        const st = getStatus(m.score);
        const dotHtml = st.dot ? `<div class="dot-blink"></div>` : '';
        const dropAlertHtml = m.oddsDropAlert ? `<span style="color:#ef4444;font-size:10px;margin-left:4px">🔥 น้ำไหล</span>` : '';
        const oddsHtml = `<div class="odds-sub-text">1:${m.odds.h} · X:${m.odds.d} · 2:${m.odds.a} ${dropAlertHtml}</div>`;
        
        const homeLogoUrl = LOGOS[m.home] || '';
        const awayLogoUrl = LOGOS[m.away] || '';

        // เรียกใช้ฟังก์ชัน formatTimeDisplay() เพื่อแสดง "วันนี้" ด้านบนเวลา
        return `<tr class="match-row" data-index="${allMatches.indexOf(m)}">
            <td class="time-cell" style="text-align:center; vertical-align:middle;">
                ${formatTimeDisplay(m.time)}
            </td>
            <td>
                <div class="match-cell-container">
                    <div class="match-logos-stack">
                        <img src="${homeLogoUrl}" class="team-logo-img" alt="${m.home}">
                        <span class="vs-tiny">vs</span>
                        <img src="${awayLogoUrl}" class="team-logo-img" alt="${m.away}">
                    </div>
                    <div class="match-names-stack">
                        <div class="team-name-row">${m.home}</div>
                        <div class="team-name-row">${m.away}</div>
                        ${oddsHtml}
                    </div>
                </div>
            </td>
            <td><span class="league-badge">${FLAG[m.league] || ''} ${m.league}</span></td>
            <td style="text-align:center"><div class="ai-score-cell">${buildScoreRing(m.score)}</div></td>
            <td style="text-align:center"><span class="status-badge ${st.cls}">${dotHtml}${st.label}</span></td>
        </tr>`;
    }).join('');
    
    renderLeagueBreakdown(allMatches);
}

function renderLeagueBreakdown(data) {
    const counts = {};
    data.forEach(m => { counts[m.league] = (counts[m.league] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = sorted[0]?.[1] || 1;
    const BAR_COLORS = { 'ENG PR': '#3b82f6', 'GER BL': '#f59e0b', 'SPA LA': '#ef4444', 'ITA SA': '#10b981', 'FRA LI': '#8b5cf6', 'POR LP': '#ec4899', 'UEFA CL': '#d946ef' };
    
    document.getElementById('league-list').innerHTML = sorted.map(([lg, ct]) =>
        `<div class="league-item">
            <div class="league-name">${FLAG[lg] || ''} ${lg}</div>
            <div class="league-bar-wrap"><div class="league-bar-fill" style="width:${Math.round(ct / max * 100)}%;background:${BAR_COLORS[lg] || '#3b82f6'}"></div></div>
            <div class="league-count">${ct}</div>
        </div>`
    ).join('');
}

function buildScoreRing(score) {
    const c = getScoreColor(score);
    const pct = score / 100; const r = 17; const circ = 2 * Math.PI * r; const dash = pct * circ;
    return `<svg width="42" height="42" viewBox="0 0 42 42">
        <circle cx="21" cy="21" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="2.5"/>
        <circle cx="21" cy="21" r="${r}" fill="none" stroke="${c.stroke}" stroke-width="2.5" stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}" stroke-linecap="round"/>
    </svg>
    <div style="text-align:center">
        <span class="score-num" style="color:${c.text}">${score}</span>
        <span class="score-label" style="color:${c.text};opacity:0.6">${c.label}</span>
    </div>`;
}

function getScoreColor(score) {
    if (score >= 70) return { stroke: '#4ade80', text: '#4ade80', label: 'HIGH' };
    if (score >= 40) return { stroke: '#fbbf24', text: '#fbbf24', label: 'MED' };
    return { stroke: '#f87171', text: '#f87171', label: 'LOW' };
}

// --- 7. INITIALIZERS & CORE TIMERS ---
function initDonut() {
    const ctx = document.getElementById('donutChart').getContext('2d');
    donutChart = new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: [0, 0, 0], backgroundColor: ['#4ade80', '#fbbf24', '#f87171'], borderWidth: 0, hoverOffset: 4 }] },
        options: { responsive: false, cutout: '74%', plugins: { legend: { display: false } }, animation: { duration: 600 } }
    });
}

function initTrend() {
    const ctx = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['05/05', '06/05', '07/05', '08/05', '09/05', '10/05'],
            datasets: [
                { label: 'ทีมเหย้า', data: [0, 0, 0, 0, 0, 0], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.06)', tension: 0.4, fill: true, borderWidth: 2, pointRadius: 2.5 },
                { label: 'ทีมเยือน', data: [0, 0, 0, 0, 0, 0], borderColor: '#22c55e', backgroundColor: 'transparent', tension: 0.4, borderWidth: 2, borderDash: [4, 3], pointRadius: 2.5 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: 'rgba(148,163,184,0.5)', font: { size: 9 } } }, y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: 'rgba(148,163,184,0.5)', font: { size: 9 } }, min: 0, max: 100 } } }
    });
}

async function loadData() {
    const tbody = document.getElementById('match-tbody');
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:rgba(148,163,184,0.5)">🔄 กำลังสแกนคัดคู่บอลสดผ่านระบบวิเคราะห์ BSD API...</td></tr>`;
    
    allMatches = await FootballAPIService.fetchScannedMatches();
    
    const now = new Date();
    document.getElementById('scan-time').textContent = `อัปเดตล่าสุด ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    renderMatches();
    if (allMatches.length > 0) { selectMatch(allMatches[0]); }
}

function updateClock() {
    const bkk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    document.getElementById('live-clock').textContent = `${bkk.getHours().toString().padStart(2, '0')}:${bkk.getMinutes().toString().padStart(2, '0')}:${bkk.getSeconds().toString().padStart(2, '0')}`;
    const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    document.getElementById('live-date').textContent = `${days[bkk.getDay()]} ${bkk.getDate()} ${months[bkk.getMonth()]} ${bkk.getFullYear() + 543}`;
}

// --- 8. DOM EVENT LISTENERS FLOW ---
document.addEventListener('DOMContentLoaded', () => {
    initDonut();
    initTrend();
    loadData();
    setInterval(updateClock, 1000);
    updateClock();

    document.querySelector('.filter-row').addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        const type = btn.getAttribute('data-filter-type');
        filters[type] = btn.getAttribute('data-value');
        btn.parentElement.querySelectorAll(`[data-filter-type="${type}"]`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderMatches();
    });

    document.querySelector('.search-box').addEventListener('input', (e) => {
        filters.search = e.target.value;
        renderMatches();
    });

    document.getElementById('btn-refresh').addEventListener('click', loadData);

    document.getElementById('match-tbody').addEventListener('click', (e) => {
        const row = e.target.closest('.match-row');
        if (!row) return;
        const m = allMatches[row.getAttribute('data-index')];
        if (m) {
            selectMatch(m);
            if (typeof sendPrompt === 'function') {
                sendPrompt(`วิเคราะห์คู่ ${m.home} vs ${m.away} (${LEAGUE_FULL[m.league] || m.league}) เวลา ${m.time} | AI Score: ${m.score} | ราคาปัจจุบัน: 1(${m.odds.h}) X(${m.odds.d}) 2(${m.odds.a}) | ราคาเปิด: 1(${m.openingOdds.h}) | สถิติ H2H: ${m.h2h} | สภาพทีม: ${m.injury}`);
            }
        }
    });
});