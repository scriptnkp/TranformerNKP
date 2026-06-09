// ตั้งค่า Supabase (เปลี่ยน URL และ ANON_KEY เป็นของคุณ)
const supabaseUrl = 'https://foplvudtvujxyxsibuck.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvcGx2dWR0dnVqeHl4c2lidWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODgzMzYsImV4cCI6MjA5NjU2NDMzNn0.h-BNhShuEarCUA0ozpYm6g9rUKET6ddJSYrCLmCQavc';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// State Variables
let RAW = [];
let logs = [];
let slocF = 'all';
let currentPg = 'dash';

// 1. ดึงข้อมูลตอนเปิดแอป
async function initApp() {
  document.getElementById('hdr-sub').textContent = 'กำลังเชื่อมต่อฐานข้อมูล...';
  
  // โหลด Transformers
  const { data: trData, error: trErr } = await _supabase.from('transformers').select('*');
  if (trErr) console.error(trErr);
  else RAW = trData || [];

  // โหลด Logs
  const { data: logData, error: logErr } = await _supabase.from('logs').select('*').order('created_at', { ascending: false });
  if (logErr) console.error(logErr);
  else logs = logData || [];

  renderDash();
  updateHdr();
}

// 2. ปรับปรุงฟังก์ชัน updateHdr (นับจาก State)
function updateHdr() {
  const tot = RAW.length;
  const iss = RAW.filter(r => r.is_issued).length;
  document.getElementById('hdr-sub').textContent = `${tot} รายการ · คงเหลือ ${tot-iss} · เบิกแล้ว ${iss}`;
}

// Helper: ดึงของที่พร้อมเบิก
function avail() { return RAW.filter(x => !x.is_issued); }

// 3. ปรับปรุงฟังก์ชันเบิกจ่าย (บันทึกลง Database)
async function doIssue() {
  const serial = document.getElementById('s-serial').value;
  const req = document.getElementById('s-req').value.trim();
  if(!serial || !req) { showToast('กรุณากรอกข้อมูลให้ครบ'); return; }
  
  const gps = document.getElementById('s-gps').value.trim();
  const loc = document.getElementById('s-loc').value.trim();
  const note = document.getElementById('s-note').value.trim();
  
  // อัปเดต UI ชั่วคราวให้ดูตอบสนองเร็ว (Optimistic UI)
  const itemIndex = RAW.findIndex(r => r.serial === serial);
  RAW[itemIndex].is_issued = true;
  
  const newLog = { serial, req_name: req, location: loc, gps, note };
  
  // 1. Insert Log ลง DB
  await _supabase.from('logs').insert([newLog]);
  
  // 2. Update สถานะ Transformer ใน DB
  await _supabase.from('transformers').update({ is_issued: true }).eq('serial', serial);

  // โหลดข้อมูลใหม่เพื่อให้ชัวร์
  await initApp();
  
  // เคลียร์ฟอร์ม
  ['s-serial','s-req','s-loc','s-note', 's-gps'].forEach(id => document.getElementById(id).value = '');
  showToast('เบิกจ่าย ' + serial + ' สำเร็จ');
}

// 4. ปรับปรุงฟังก์ชันนำเข้าไฟล์ (Upsert ลง Database)
async function importFile(input) {
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const parsed = parseIQ09(e.target.result); // ใช้ฟังก์ชัน parseIQ09 เดิมของคุณ
    if(parsed.length === 0) return;
    
    document.getElementById('hdr-sub').textContent = 'กำลังอัปเดตฐานข้อมูล...';
    
    // แปลง Format ให้ตรงกับตาราง SQL
    const upsertData = parsed.map(p => ({
      serial: p.serial,
      mat: p.mat,
      description: p.desc,
      sloc: p.sloc,
      asset_no: p.assetNo,
      mfr: p.mfr,
      import_date: p.date,
      // ไม่ยุ่งกับ is_issued ถ้ามีของเดิมอยู่แล้ว (Supabase upsert)
    }));

    const { error } = await _supabase.from('transformers').upsert(upsertData, { onConflict: 'serial' });
    
    if(error) {
      showToast('เกิดข้อผิดพลาดในการนำเข้า');
    } else {
      showToast(`นำเข้าข้อมูล ${parsed.length} รายการสำเร็จ`);
      await initApp(); // โหลดใหม่
    }
  };
  reader.readAsText(file, 'utf-8');
  input.value = '';
}

// (คงฟังก์ชัน renderDash, renderStock, renderIssue, renderLog, showPg ไว้เหมือนเดิม โดยแก้การอ้างอิง object key เช่น item.is_issued แทน item.issued)

// เริ่มแอป
initApp();