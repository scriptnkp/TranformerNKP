// ลิงก์ตรงระบุตัวตน Web App จากสิทธิ์ระบบของโครงการที่คุณส่งมา
const GAS_BACKEND_API_URL = 'https://script.google.com/macros/s/AKfycbyY2NO9cB8Jpjr4vV-icp2fAy8fk_tEwMmTYdSRADbYU67EVx9Dk5tVpp-QHx2O37GP/exec';

const AppDataLayer = {
    // ==========================================================================
    // VERIFY PASSCODE: ยิงข้ามโดเมนแบบ Simple Request ปลุกสิทธิ์ CORS หลังบ้าน
    // ==========================================================================
    async verifyPasscodeWithBackend(inputPasscode) {
        try {
            // บังคับเปลี่ยน Content-Type เป็น text/plain เพื่อข้ามกฎ Preflight OPTIONS บล็อก CORS ของเบราว์เซอร์
            const response = await fetch(GAS_BACKEND_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' }, 
                body: JSON.stringify({
                    action: 'verify_passcode',
                    passcode: inputPasscode
                })
            });
            const data = await response.json();
            return data.authenticated === true;
        } catch (error) {
            console.error("ระบบตรวจจับบล็อกเครือข่าย:", error);
            return false;
        }
    },

    // ==========================================================================
    // FETCH BSD SPORT DATA: คลังวิเคราะห์จำลองข้อมูลจริง
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
        } catch (err) {
            console.error("ดึงข้อมูลพรีเมียมล้มเหลว:", err);
            return [];
        }
    },

    // ==========================================================================
    // LOG MATCH DATA: ยิงประวัติแมตช์ลงตารางเบื้องหลัง
    // ==========================================================================
    async sendToGasDatabase(matchData) {
        try {
            await fetch(GAS_BACKEND_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ ...matchData, action: 'log_match' })
            });
            return { status: 'logged' };
        } catch (err) {
            console.error("ส่งฐานข้อมูลชีตไม่สำเร็จ:", err);
            return null;
        }
    }
};