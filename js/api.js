const GAS_BACKEND_API_URL = 'https://script.google.com/macros/s/AKfycbyY2NO9cB8Jpjr4vV-icp2fAy8fk_tEwMmTYdSRADbYU67EVx9Dk5tVpp-QHx2O37GP/exec';

const AppDataLayer = {
    // ==========================================================================
    // 1. ตรวจรหัสผ่านผ่าน GET Request (แก้ปัญหา CORS ชะงัดนัก!)
    // ==========================================================================
    async verifyPasscodeWithBackend(inputPasscode) {
        try {
            // เอาพารามิเตอร์ต่อท้าย URL แบบ GET
            const urlWithParams = `${GAS_BACKEND_API_URL}?action=verify_passcode&passcode=${inputPasscode}`;
            const response = await fetch(urlWithParams, {
                method: 'GET'
            });
            const data = await response.json();
            return data.authenticated === true;
        } catch (error) {
            console.error("API Error (Passcode):", error);
            return false;
        }
    },

    // ==========================================================================
    // 2. ดึงข้อมูลบอล (จำลอง) เหมือนเดิม
    // ==========================================================================
    async fetchLiveBsdData() {
        try {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve([
                        { id: 2001, time: '18:30', home: 'เชลซี', away: 'นิวคาสเซิล', league: 'ENG PR', home_form: 85, ml_predict: { home_win_pct: 78 }, odds_flow: 'dropping', injuries: { home_key_out: 0, away_key_out: 2 }, lineups: { home_form: '4-2-3-1', away_form: '4-3-3' }, home_away_edge: 15, motivation_level: 80 },
                        { id: 2002, time: '19:00', home: 'ดอร์ทมุนด์', away: 'ไลป์ซิก', league: 'GER BL', home_form: 72, ml_predict: { home_win_pct: 70 }, odds_flow: 'stable', injuries: { home_key_out: 1, away_key_out: 1 }, lineups: { home_form: '4-3-3', away_form: '4-4-2' }, home_away_edge: 5, motivation_level: 60 },
                        { id: 2003, time: '20:00', home: 'บาร์เซโลน่า', away: 'เรอัล โซเซียดาด', league: 'SPA LA', home_form: 68, ml_predict: { home_win_pct: 65 }, odds_flow: 'dropping', injuries: { home_key_out: 0, away_key_out: 0 }, lineups: { home_form: '4-3-3', away_form: '4-2-3-1' }, home_away_edge: 10, motivation_level: 75 },
                        { id: 2004, time: '20:30', home: 'เอซี มิลาน', away: 'อตาลันต้า', league: 'ITA SA', home_form: 55, ml_predict: { home_win_pct: 50 }, odds_flow: 'rising', injuries: { home_key_out: 3, away_key_out: 0 }, lineups: { home_form: '4-2-3-1', away_form: '3-4-2-1' }, home_away_edge: -10, motivation_level: 40 }
                    ]);
                }, 800);
            });
        } catch (err) { return []; }
    },

    // ==========================================================================
    // 3. บันทึกข้อมูลลงชีต (ใช้ no-cors ป้องกันหน้าเว็บค้างถ้ามีปัญหาเน็ตเวิร์ก)
    // ==========================================================================
    async sendToGasDatabase(matchData) {
        try {
            await fetch(GAS_BACKEND_API_URL, {
                method: 'POST',
                mode: 'no-cors', // บังคับให้ส่งอย่างเดียว ไม่สนใจว่าจะโดนบล็อกขากลับหรือไม่
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ ...matchData, action: 'log_match' })
            });
            return { status: 'logged_async' };
        } catch (err) { return null; }
    }
};