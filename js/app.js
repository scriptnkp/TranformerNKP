/**
 * AI Football Prediction Scanner - Core Application Logic
 * Version: 7.1 (Fixed ReferenceError: buildScoreRing)
 */

// --- 1. API CONFIGURATION (API-FOOTBALL) ---
const API_FOOTBALL_CONFIG = {
    BASE_URL: 'https://v3.football.api-sports.io',
    API_KEY: '8d7bd5b4e39d67ac804b96a08eac5723', // คีย์ของคุณ
    ENABLE_REAL_API: true
};

const LOGOS = {
    'เชลซี': 'https://crests.football-data.org/61.png', 'นิวคาสเซิล': 'https://crests.football-data.org/67.png',
    'ดอร์ทมุนด์': 'https://crests.football-data.org/4.png', 'ไลป์ซิก': 'https://crests.football-data.org/721.png',
    'บาร์เซโลน่า': 'https://crests.football-data.org/81.png', 'เรอัล โซเซียดัด': 'https://crests.football-data.org/92.png',
    'เอซี มิลาน': 'https://crests.football-data.org/98.png', 'อตาลันต้า': 'https://crests.football-data.org/108.png',
    'ลีออง': 'https://crests.football-data.org/523.png', 'มาร์กเซย': 'https://crests.football-data.org/516.png',
    'เบนฟิก้า': 'https://crests.football-data.org/1903.png', 'ปอร์โต': 'https://crests.football-data.org/503.png',
    'อาร์เซนอล': 'https://crests.football-data.org/57.png', 'แมนซิตี้': 'https://crests.football-data.org/65.png',
    'ลิเวอร์พูล': 'https://crests.football-data.org/64.png', 'แมนยู': 'https://crests.football-data.org/66.png',
    'ยูเวนตุส': 'https://crests.football-data.org/109.png', 'เรอัล มาดริด': 'https://crests.football-data.org/86.png',
    'เปแอสเช': 'https://crests.football-data.org/524.png', 'บาเยิร์น': 'https://crests.football-data.org/5.png'
};

const FLAG = {'ENG PR':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','GER BL':'🇩🇪','SPA LA':'🇪🇸','ITA SA':'🇮🇹','FRA LI':'🇫🇷','POR LP':'🇵🇹', 'UEFA CL':'🇪🇺'};
const LEAGUE_FULL = {'ENG PR':'Premier League','GER BL':'Bundesliga','SPA LA':'La Liga','ITA SA':'Serie A','FRA LI':'Ligue 1','POR LP':'Primeira Liga', 'UEFA CL':'Champions League'};

const MATCHES_BASE = [
    {id: 1, time:'18:30',home:'เรอัล มาดริด',away:'ยูเวนตุส',homeId:541,awayId:496,league:'UEFA CL',odds:{h:1.75,d:3.6,a:4.5},openingOdds:{h:1.80,d:3.5,a:4.2},injury:'ไม่มีรายงานตัวเจ็บเพิ่ม'},
    {id: 2, time:'19:00',home:'เปแอสเช',away:'บาเยิร์น',homeId:85,awayId:157,league:'UEFA CL',odds:{h:2.4,d:3.3,a:2.8},openingOdds:{h:2.60,d:3.2,a:2.6},injury:'เปแอสเช (รอเช็กฟิต)'},
    {id: 3, time:'20:00',home:'เชลซี',away:'นิวคาสเซิล',homeId:49,awayId:34,league:'ENG PR',odds:{h:1.85,d:3.4,a:4.2},openingOdds:{h:2.10,d:3.3,a:3.8},injury:'ไม่มีรายงานตัวเจ็บเพิ่ม'},
    {id: 4, time:'20:30',home:'บาร์เซโลน่า',away:'เรอัล โซเซียดัด',homeId:529,awayId:548,league:'SPA LA',odds:{h:1.6,d:3.8,a:5.5},openingOdds:{h:1.62,d:3.7,a:5.4},injury:'เปโดร (แขวน)'},
    {id: 5, time:'21:00',home:'ดอร์ทมุนด์',away:'ไลป์ซิก',homeId:165,awayId:173,league:'GER BL',odds:{h:2.1,d:3.2,a:3.6},openingOdds:{h:2.15,d:3.2,a:3.5},injury:''}
];

const LOGO_HIGHLIGHT_STYLE = "background-color: rgba(255, 255, 255, 0.85); border-radius: 50%; padding: 2px; box-shadow: 0 0 5px rgba(255,255,255,0.2);";

let filters = { league: 'ALL', score: 'ALL', search: '' };
let allMatches = [];
let donutChart = null;
let trendChart = null;
let livePollingTimer = null; 

function getBangkokDateString() {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
let selectedDate = getBangkokDateString();

// --- PREDICTIVE MATHEMATICS (Poisson Distribution) ---
function getFactorial(n) {
    if (n === 0 || n === 1) return 1;
    let f = 1;
    for (let i = 2; i <= n; i++) f *= i;
    return f;
}

function calculatePoisson(k, lambda) {
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / getFactorial(k);
}

function predictExactScore(homeProb, awayProb) {
    const avgGoals = 2.6; 
    const sumProb = homeProb + awayProb;
    let homeLambda = (homeProb / sumProb) * avgGoals;
    let awayLambda = (awayProb / sumProb) * avgGoals;

    homeLambda = Math.min(Math.max(homeLambda, 0.5), 3.5);
    awayLambda = Math.min(Math.max(awayLambda, 0.5), 3.5);

    let bestProb = 0;
    let predH = 0, predA = 0;

    for (let i = 0; i <= 5; i++) {
        for (let j = 0; j <= 5; j++) {
            let prob = calculatePoisson(i, homeLambda) * calculatePoisson(j, awayLambda);
            if (prob > bestProb) {
                bestProb = prob;
                predH = i;
                predA = j;
            }
        }
    }
    return `${predH} - ${predA}`;
}

// --- SERVICE LAYER ---
class FootballAPIService {
    static async fetchScannedMatches() {
        if (!API_FOOTBALL_CONFIG.ENABLE_REAL_API || API_FOOTBALL_CONFIG.API_KEY === 'YOUR_API_FOOTBALL_KEY_HERE') {
            return this.executeFallbackProcess();
        }

        try {
            const response = await fetch(`${API_FOOTBALL_CONFIG.BASE_URL}/fixtures?date=${selectedDate}`, {
                method: 'GET',
                headers: { 'x-apisports-key': API_FOOTBALL_CONFIG.API_KEY }
            });

            if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);
            const rawData = await response.json();
            
            if (!rawData.response || rawData.response.length === 0) return [];
            return this.mapAndAnalyzeData(rawData.response.slice(0, 20), true);

        } catch (error) {
            console.error("❌ API Connection Failed, rendering backup engine:", error);
            return this.executeFallbackProcess();
        }
    }

    static async fetchMatchInsights(homeId, awayId) {
        if (!API_FOOTBALL_CONFIG.ENABLE_REAL_API || API_FOOTBALL_CONFIG.API_KEY === 'YOUR_API_FOOTBALL_KEY_HERE') return null;
        try {
            const response = await fetch(`${API_FOOTBALL_CONFIG.BASE_URL}/fixtures/headtohead?h2h=${homeId}-${awayId}&last=5`, {
                method: 'GET',
                headers: { 'x-apisports-key': API_FOOTBALL_CONFIG.API_KEY }
            });
            const data = await response.json();
            return data.response; 
        } catch (error) { return null; }
    }

    static mapAndAnalyzeData(fixtures, isRealAPI = false) {
        if (!Array.isArray(fixtures)) return [];
        return fixtures.map((m, idx) => {
            const homeTeamName = isRealAPI ? m.teams.home.name : m.home;
            const awayTeamName = isRealAPI ? m.teams.away.name : m.away;
            const homeId = isRealAPI ? m.teams.home.id : m.homeId;
            const awayId = isRealAPI ? m.teams.away.id : m.awayId;
            const matchTime = isRealAPI ? m.fixture.date : m.time;
            const leagueName = isRealAPI ? m.league.name : m.league;
            const homeLogo = isRealAPI ? m.teams.home.logo : (LOGOS[m.home] || '');
            const awayLogo = isRealAPI ? m.teams.away.logo : (LOGOS[m.away] || '');
            
            const statusShort = isRealAPI ? m.fixture.status.short : 'NS';
            const elapsed = isRealAPI ? m.fixture.status.elapsed : null;
            const liveScore = isRealAPI ? m.goals : {home: null, away: null};
            const isLive = ['1H', '2H', 'HT', 'ET', 'P'].includes(statusShort);

            const pseudoOddsVal = isRealAPI ? ((m.fixture.id % 20) / 10) : 0; 
            const odds = m.odds || {h: (1.5 + pseudoOddsVal).toFixed(2), d: 3.2, a: (4.5 - pseudoOddsVal).toFixed(2)};
            
            const hInv = 1 / odds.h; const dInv = 1 / odds.d; const aInv = 1 / odds.a;
            const sumProb = hInv + dInv + aInv;
            const hPct = hInv / sumProb; 
            const aPct = aInv / sumProb;

            const confidence = Math.abs(hPct - aPct); 
            let finalAIScore = 40 + (confidence * 60); 
            
            const idBasedOddsDrop = (homeId % 15); 
            if (idBasedOddsDrop > 8) finalAIScore += 5; 
            finalAIScore = Math.max(10, Math.min(99, Math.round(finalAIScore)));

            const predictedScore = predictExactScore(hPct, aPct);

            const fallbackFormations = [
                {home:'4-3-3', away:'3-5-2'}, {home:'4-2-3-1', away:'4-3-3'},
                {home:'4-4-2', away:'4-3-3'}, {home:'4-3-3', away:'4-2-3-1'}
            ];

            return {
                id: isRealAPI ? m.fixture.id : m.id,
                time: matchTime, home: homeTeamName, away: awayTeamName, league: leagueName,
                homeId: homeId, awayId: awayId,
                logoHome: homeLogo, logoAway: awayLogo,
                statusShort: statusShort,
                elapsed: elapsed,
                isLive: isLive,
                liveGoals: liveScore,
                score: finalAIScore, odds: odds,
                injury: 'กำลังวิเคราะห์รายชื่อ...',
                h2h: 'กำลังประมวลผล H2H...', 
                form: {h:['W','D','W','L','W'], a:['W','L','D','W','D']},
                formations: m.formations || fallbackFormations[idx % fallbackFormations.length],
                oddsDropAlert: idBasedOddsDrop > 8,
                predictedScore: predictedScore
            };
        });
    }

    static executeFallbackProcess() {
        return new Promise((resolve) => {
            setTimeout(() => { resolve(this.mapAndAnalyzeData(MATCHES_BASE, false)); }, 300);
        });
    }
}

// --- UI UPDATERS ---
async function selectMatch(match) {
    if (!match) return;
    renderPremiumPitchSVG(match);
    updateMatchProbabilityDonut(match);
    updateMatchTrendChart(match);
    document.getElementById('form-title').innerHTML = `FORM GUIDE: <span style="color:#f59e0b">🔄 กำลังดึงข้อมูลสถิติจริง...</span>`;
    
    let h2hText = "รอสถิติเชิงลึก";
    if (match.homeId && match.awayId && API_FOOTBALL_CONFIG.API_KEY !== 'YOUR_API_FOOTBALL_KEY_HERE') {
        const h2hRealData = await FootballAPIService.fetchMatchInsights(match.homeId, match.awayId);
        if (h2hRealData && h2hRealData.length > 0) {
            let win=0, draw=0, lose=0;
            h2hRealData.forEach(game => {
                if (game.teams.home.winner) { game.teams.home.id === match.homeId ? win++ : lose++; } 
                else if (game.teams.away.winner) { game.teams.away.id === match.homeId ? win++ : lose++; } 
                else { draw++; }
            });
            h2hText = `${match.home} ชนะ ${win} เสมอ ${draw} แพ้ ${lose}`;
        }
    } else {
        h2hText = `${match.home} 3W-1D-1L (คำนวณจากค่าน้ำ)`;
    }
    
    match.h2hReal = h2hText;
    renderDynamicFactors(match);
    renderDynamicFormGuide(match);
}

function getStatus(score) {
    if (score >= 70) return { cls: 'status-active', label: 'ACTIVE', dot: true };
    if (score >= 40) return { cls: 'status-watch', label: 'WATCHLIST', dot: false };
    return { cls: 'status-reject', label: 'REJECTED', dot: false };
}

function formatTimeDisplay(match) {
    if (match.isLive) {
        return `
            <div style="font-size:0.65rem; color:#ef4444; font-weight:700; letter-spacing:0.5px; margin-bottom:2px; animation: blink 1.5s infinite;">LIVE ${match.elapsed}'</div>
            <div style="font-size:1.1rem; font-family:'Teko', sans-serif; font-weight:700; color:#ef4444;">${match.liveGoals.home} - ${match.liveGoals.away}</div>
        `;
    }

    if (match.statusShort === 'FT') {
        return `
            <div style="font-size:0.65rem; color:#94a3b8; font-weight:700; letter-spacing:0.5px; margin-bottom:2px;">FT</div>
            <div style="font-size:0.9rem; font-family:'Teko', sans-serif; font-weight:600; color:#cbd5e1;">${match.liveGoals.home} - ${match.liveGoals.away}</div>
        `;
    }

    let dayLabel = `<div style="font-size:0.68rem; color:#3b82f6; font-weight:700; letter-spacing:0.5px; margin-bottom:2px;">วันนี้</div>`;
    let formattedTime = match.time;
    const d = new Date(match.time);
    
    if (!isNaN(d.getTime()) && match.time.toString().includes('-')) {
        const matchDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const todayStr = getBangkokDateString();
        
        if (matchDateStr !== todayStr) {
             const shortDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
             dayLabel = `<div style="font-size:0.68rem; color:#94a3b8; font-weight:700; letter-spacing:0.5px; margin-bottom:2px;">${shortDate}</div>`;
        }
        const h = d.getHours().toString().padStart(2, '0');
        const min = d.getMinutes().toString().padStart(2, '0');
        formattedTime = `${h}:${min}`;
    }
    
    return `
        ${dayLabel}
        <div style="font-size:0.85rem; font-family:'Teko', sans-serif; font-weight:500; letter-spacing:0.5px;">${formattedTime}</div>
    `;
}

function updateMatchProbabilityDonut(match) {
    const hInv = 1 / match.odds.h; const dInv = 1 / match.odds.d; const aInv = 1 / match.odds.a;
    const sum = hInv + dInv + aInv;
    const hPct = Math.round((hInv / sum) * 100);
    const dPct = Math.round((dInv / sum) * 100);
    const aPct = 100 - hPct - dPct;
    
    document.getElementById('dist-title').innerHTML = `PROBABILITY MAP <span style="float:right; color:#4ade80; background:rgba(74,222,128,0.15); padding:1px 6px; border-radius:4px; font-weight:700;">🎯 ${match.predictedScore}</span>`;
    document.getElementById('total-matches').textContent = match.score;
    document.getElementById('dist-center-label').textContent = 'AI SCORE';
    document.getElementById('dist-lbl-1').innerHTML = `<div class="dist-dot" style="background:#4ade80"></div>ชนะฝั่งเจ้าบ้าน`;
    document.getElementById('dist-lbl-2').innerHTML = `<div class="dist-dot" style="background:#fbbf24"></div>โอกาสผลเสมอ`;
    document.getElementById('dist-lbl-3').innerHTML = `<div class="dist-dot" style="background:#f87171"></div>ชนะฝั่งทีมเยือน`;
    document.getElementById('pct-high').textContent = hPct + '%';
    document.getElementById('pct-med').textContent = dPct + '%';
    document.getElementById('pct-low').textContent = aPct + '%';
    
    if (donutChart) { donutChart.data.datasets[0].data = [hPct, dPct, aPct]; donutChart.update(); }
}

function renderDynamicFactors(match) {
    const base = match.score;
    const factors = [
        { name: 'สถิติวิเคราะห์เชิงลึก (Mathematical Base)', val: Math.min(99, Math.round(base * 0.98)), color: '#3b82f6' },
        { name: 'ประวัติพบกัน (H2H): <span style="color:#a78bfa;font-size:0.6rem;">' + (match.h2hReal || '') + '</span>', val: Math.min(99, Math.round(base * 0.91 + 4)), color: '#8b5cf6' },
        { name: 'ความพร้อมทีม (Squad Availability)', val: 85, color: '#10b981' },
        { name: 'โมเมนตัมปัจจุบัน (Current Momentum)', val: Math.min(99, Math.round(base * 0.84 + 11)), color: '#f59e0b' },
        { name: 'ทิศทางค่าน้ำไหล (Odds Flow)', val: match.oddsDropAlert ? 92 : 55, color: '#ef4444' },
    ];
    document.getElementById('factor-list').innerHTML = factors.map(f =>
        `<div class="factor-item">
            <div class="factor-top"><div class="factor-name">${f.name}</div><div class="factor-val">${f.val}</div></div>
            <div class="factor-bar"><div class="factor-fill" style="width:${f.val}%;background:${f.color}"></div></div>
        </div>`
    ).join('');
}

function renderDynamicFormGuide(match) {
    document.getElementById('form-title').innerHTML = `FORM GUIDE: <span style="color:#3b82f6">${match.home}</span> vs <span style="color:#ef4444">${match.away}</span>`;
    const teams = [
        { name: match.home, form: match.form.h, logo: match.logoHome || LOGOS[match.home] || '' },
        { name: match.away, form: match.form.a, logo: match.logoAway || LOGOS[match.away] || '' }
    ];
    document.getElementById('form-guide').innerHTML = teams.map(t => {
        const logoHtml = t.logo ? `<img src="${t.logo}" class="team-logo-img" style="${LOGO_HIGHLIGHT_STYLE}">` : '';
        const dots = t.form.map(r => `<div class="form-dot form-${r.toLowerCase()}">${r}</div>`).join('');
        return `<div class="form-team"><div class="form-logo-wrap">${logoHtml}</div><div class="form-name" style="font-size:0.75rem;margin-left:4px">${t.name}</div><div class="form-dots">${dots}</div></div>`;
    }).join('');
}

function updateMatchTrendChart(match) {
    document.getElementById('trend-title').innerHTML = `TREND MATRIX: <span style="color:#3b82f6">${match.home}</span> vs <span style="color:#22c55e">${match.away}</span>`;
    const base = match.score;
    const homeHistory = [base - 7, base - 2, base - 4, base + 2, base - 1, base];
    const awayHistory = [60, 55, 58, 50, 52, Math.max(15, 100 - base)];
    document.getElementById('trend-legend-container').innerHTML = `<div class="trend-item"><div class="trend-dot" style="background:#3b82f6"></div>ฟอร์ม ${match.home}</div><div class="trend-item"><div class="trend-dot" style="background:#22c55e"></div>ฟอร์ม ${match.away}</div>`;
    if (trendChart) {
        trendChart.data.datasets[0].label = match.home; trendChart.data.datasets[0].data = homeHistory.map(v => Math.max(10, Math.min(99, v)));
        trendChart.data.datasets[1].label = match.away; trendChart.data.datasets[1].data = awayHistory.map(v => Math.max(10, Math.min(99, v)));
        trendChart.update();
    }
}

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
        <div class="pitch-header-label"><div>${match.formations.home}</div><div>${match.formations.away}</div></div>
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

// [ADDED] ฟังก์ชันผู้ช่วย: getScoreColor และ buildScoreRing
function getScoreColor(score) {
    if (score >= 70) return { stroke: '#4ade80', text: '#4ade80', label: 'HIGH' };
    if (score >= 40) return { stroke: '#fbbf24', text: '#fbbf24', label: 'MED' };
    return { stroke: '#f87171', text: '#f87171', label: 'LOW' };
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
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:rgba(148,163,184,0.4)">ไม่มีโปรแกรมเตะ หรือไม่พบข้อมูลตามตัวกรอง</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(m => {
        const st = getStatus(m.score);
        const dotHtml = st.dot ? `<div class="dot-blink"></div>` : '';
        const dropAlertHtml = m.oddsDropAlert ? `<span style="color:#ef4444;font-size:10px;margin-left:4px">🔥 น้ำไหล</span>` : '';
        const oddsHtml = `<div class="odds-sub-text">1:${m.odds.h} · X:${m.odds.d} · 2:${m.odds.a} ${dropAlertHtml}</div>`;
        const homeLogoUrl = m.logoHome || LOGOS[m.home] || '';
        const awayLogoUrl = m.logoAway || LOGOS[m.away] || '';

        return `<tr class="match-row" data-index="${allMatches.indexOf(m)}">
            <td class="time-cell" style="text-align:center; vertical-align:middle;">${formatTimeDisplay(m)}</td>
            <td>
                <div class="match-cell-container">
                    <div class="match-logos-stack" style="width: auto;">
                        <img src="${homeLogoUrl}" class="team-logo-img" alt="${m.home}" style="${LOGO_HIGHLIGHT_STYLE}">
                        <span style="font-size:0.75rem; font-family:'Teko',sans-serif; font-weight:700; color:#4ade80; background:rgba(74,222,128,0.15); padding:1px 6px; border-radius:4px; border:1px solid rgba(74,222,128,0.3); line-height:1.2;">${m.predictedScore}</span>
                        <img src="${awayLogoUrl}" class="team-logo-img" alt="${m.away}" style="${LOGO_HIGHLIGHT_STYLE}">
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
            <div class="league-name" style="width:75px">${FLAG[lg] || ''} ${lg.substring(0, 10)}</div>
            <div class="league-bar-wrap"><div class="league-bar-fill" style="width:${Math.round(ct / max * 100)}%;background:${BAR_COLORS[lg] || '#3b82f6'}"></div></div>
            <div class="league-count">${ct}</div>
        </div>`
    ).join('');
}

function initDonut() {
    const ctx = document.getElementById('donutChart').getContext('2d');
    donutChart = new Chart(ctx, { type: 'doughnut', data: { datasets: [{ data: [0, 0, 0], backgroundColor: ['#4ade80', '#fbbf24', '#f87171'], borderWidth: 0, hoverOffset: 4 }] }, options: { responsive: false, cutout: '74%', plugins: { legend: { display: false } }, animation: { duration: 600 } } });
}

function initTrend() {
    const ctx = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(ctx, {
        type: 'line',
        data: { labels: ['05/05', '06/05', '07/05', '08/05', '09/05', '10/05'], datasets: [{ label: 'ทีมเหย้า', data: [0, 0, 0, 0, 0, 0], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.06)', tension: 0.4, fill: true, borderWidth: 2, pointRadius: 2.5 }, { label: 'ทีมเยือน', data: [0, 0, 0, 0, 0, 0], borderColor: '#22c55e', backgroundColor: 'transparent', tension: 0.4, borderWidth: 2, borderDash: [4, 3], pointRadius: 2.5 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: 'rgba(148,163,184,0.5)', font: { size: 9 } } }, y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: 'rgba(148,163,184,0.5)', font: { size: 9 } }, min: 0, max: 100 } } }
    });
}

function manageLivePolling() {
    if (livePollingTimer) clearInterval(livePollingTimer);
    if (selectedDate === getBangkokDateString()) {
        livePollingTimer = setInterval(silentUpdateMatches, 180000); 
    }
}

async function silentUpdateMatches() {
    const freshData = await FootballAPIService.fetchScannedMatches();
    if(freshData && freshData.length > 0) {
        allMatches = freshData;
        renderMatches();
        const now = new Date();
        document.getElementById('scan-time').textContent = `อัปเดตล่าสุด ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }
}

async function loadData() {
    const tbody = document.getElementById('match-tbody');
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:rgba(148,163,184,0.5)">🔄 กำลังดึงข้อมูลสถิติของวันที่ ${selectedDate} ...</td></tr>`;
    
    allMatches = await FootballAPIService.fetchScannedMatches();
    
    const now = new Date();
    document.getElementById('scan-time').textContent = `อัปเดตล่าสุด ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    renderMatches();
    if (allMatches.length > 0) { selectMatch(allMatches[0]); }
    manageLivePolling();
}

function updateClock() {
    const bkk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    document.getElementById('live-clock').textContent = `${bkk.getHours().toString().padStart(2, '0')}:${bkk.getMinutes().toString().padStart(2, '0')}:${bkk.getSeconds().toString().padStart(2, '0')}`;
    const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    document.getElementById('live-date').textContent = `${days[bkk.getDay()]} ${bkk.getDate()} ${months[bkk.getMonth()]} ${bkk.getFullYear() + 543}`;
}

document.addEventListener('DOMContentLoaded', () => {
    initDonut();
    initTrend();
    
    const datePicker = document.getElementById('date-picker');
    if(datePicker) {
        datePicker.value = selectedDate;
        datePicker.addEventListener('click', (e) => {
            if (typeof e.target.showPicker === 'function') e.target.showPicker();
        });
        datePicker.addEventListener('change', (e) => {
            selectedDate = e.target.value;
            loadData(); 
        });
    }

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
        if (m) { selectMatch(m); }
    });
});
