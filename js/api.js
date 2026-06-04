// URL หลังบ้านเว็บแอปที่ได้จากการกดยืนยันการ Deploy ใน Google Apps Script ของคุณ
const GAS_BACKEND_API_URL = 'https://script.google.com/macros/s/AKfycbyY2NO9cB8Jpjr4vV-icp2fAy8fk_tEwMmTYdSRADbYU67EVx9Dk5tVpp-QHx2O37GP/exec';

const AppDataLayer = {
    // ==========================================================================
    // 1. VERIFY PASSCODE ENDPOINT
    // ==========================================================================
    async verifyPasscodeWithBackend(inputPasscode) {
        try {
            const response = await fetch(GAS_BACKEND_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' }, // ป้องกันการชนกับ pre-flight CORS
                body: JSON.stringify({
                    action: 'verify_passcode',
                    passcode: inputPasscode
                })
            });
            const data = await response.json();
            return data.authenticated === true;
        } catch (error) {
            console.error("API Error (Passcode Validation Failed):", error);
            return false;
        }
    },

    // ==========================================================================
    // 2. FETCH PREMIUM SPORTS DATA (BSD API MOCK INTERFACE)
    // ==========================================================================
    async fetchLiveBsdData() {
        try {
            // จำลองโครงสร้างข้อมูลเกรดพรีเมียมจาก BSD (ML Predicts, Odds, Lineups, Injuries)
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve([
                        { id: 2001, time: '18:30', home: 'เชลซี', away: 'นิวคาสเซิล', league: 'ENG PR', home_form: 85, ml_predict: { home_win_pct: 78 }, odds_flow: 'dropping', injuries: { home_key_out: 0, away_key_out: 2 }, lineups: { home_form: '4-2-3-1', away_form: '4-3-3' } },
                        { id: 2002, time: '19:00', home: 'ดอร์ทมุนด์', away: 'ไลป์ซิก', league: 'GER BL', home_form: 72, ml_predict: { home_win_pct: 70 }, odds_flow: 'stable', injuries: { home_key_out: 1, away_key_out: 1 }, lineups: { home_form: '4-3-3', away_form: '4-4-2' } },
                        { id: 2003, time: '20:00', home: 'บาร์เซโลน่า', away: 'เรอัล โซเซียดาด', league: 'SPA LA', home_form: 68, ml_predict: { home_win_pct: 65 }, odds_flow: 'dropping', injuries: { home_key_out: 0, away_key_out: 0 }, lineups: { home_form: '4-3-3', away_form: '4-2-3-1' } },
                        { id: 2004, time: '20:30', home: 'เอซี มิลาน', away: 'อตาลันต้า', league: 'ITA SA', home_form: 55, ml_predict: { home_win_pct: 50 }, odds_flow: 'rising', injuries: { home_key_out: 3, away_key_out: 0 }, lineups: { home_form: '4-2-3-1', away_form: '3-4-2-1' } }
                    ]);
                }, 1000); // หน่วงเวลา 1 วินาทีเพื่อให้ Skeleton Loader แสดงผลลัพธ์ได้อย่างนุ่มนวล
            });
        } catch (err) {
            console.error("API Error (BSD Data Retrieval Failed):", err);
            return [];
        }
    },

    // ==========================================================================
    // 3. LOG ASYNC DATA TO GOOGLE SHEETS
    // ==========================================================================
    async sendToGasDatabase(matchData) {
        try {
            await fetch(GAS_BACKEND_API_URL, {
                method: 'POST',
                mode: 'no-cors', // สั่งรันงานเบื้องหลังข้ามเครือข่ายแบบประหยัดพลังงาน
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ ...matchData, action: 'log_match' })
            });
            return { status: 'logged_async' };
        } catch (err) {
            console.error("API Error (GAS Sheets Logging Failed):", err);
            return null;
        }
    }
};