// ==========================================================================
// CONFIGURATION: ใส่ข้อมูลสิทธิ์การเข้าถึง Supabase ของคุณตรงนี้
// ==========================================================================
const supabaseUrl = 'https://foplvudtvujxyxsibuck.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvcGx2dWR0dnVqeHl4c2lidWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODgzMzYsImV4cCI6MjA5NjU2NDMzNn0.h-BNhShuEarCUA0ozpYm6g9rUKET6ddJSYrCLmCQavc';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Global App State
let RAW = [];
let logs = [];
let slocF = 'all';
let currentPg = 'dash';

// 1. ฟังก์ชันเริ่มต้นแอปพลิเคชัน (ดึงข้อมูลจาก Cloud)
async function initApp() {
  updateHdrStatus('กำลังโหลดข้อมูล...');
  try {
    // โหลดสต็อกหม้อแปลงทั้งหมด
    const { data: trData, error: trErr } = await _supabase.from('transformers').select('*');
    if (trErr) throw trErr;
    RAW = trData || [];

    // โหลดประวัติการเบิกจ่ายทั้งหมด (เรียงตามล่าสุด)
    const { data: logData, error: logErr } = await _supabase.from('logs').select('*').order('created_at', { ascending: false });
    if (logErr) throw logErr;
    logs = logData || [];

    // เรนเดอร์หน้าปัจจุบันใหม่
    showPg(currentPg);
  } catch (err) {
    console.error('Error fetching data:', err);
    showToast('การเชื่อมต่อ Database ล้มเหลว');
  }
}

function updateHdrStatus(text) {
  document.getElementById('hdr-sub').textContent = text;
}

function updateHdr() {
  const tot = RAW.length;
  const iss = RAW.filter(r => r.is_issued).length;
  document.getElementById('hdr-sub').textContent = `${tot} รายการ · คงเหลือ ${tot - iss} · เบิกแล้ว ${iss}`;
}

function avail() {
  return RAW.filter(x => !x.is_issued);
}

// 2. ฟังก์ชันควบคุมการเปลี่ยนหน้า (Routing Tab)
function showPg(p) {
  document.querySelectorAll('.pg').forEach(x => x.classList.remove('on'));
  document.querySelectorAll('.nav-tab').forEach(x => x.classList.remove('on'));
  
  document.getElementById('pg-' + p).classList.add('on');
  const nm = ['dash', 'stock', 'issue', 'log'];
  const idx = nm.indexOf(p);
  if (idx >= 0) document.querySelectorAll('.nav-tab')[idx].classList.add('on');
  
  currentPg = p;
  const fn = { dash: renderDash, stock: renderStock, issue: renderIssue, log: renderLog, settings: () => {} };
  if (fn[p]) fn[p]();
  updateHdr();
}

// 3. ฟังก์ชันหน้าหลัก (Dashboard)
function renderDash() {
  const tot = RAW.length;
  const iss = RAW.filter(r => r.is_issued).length;
  const av = tot - iss;
  
  document.getElementById('kpi').innerHTML = `
    <div class="kpi"><div class="kpi-lbl">สต็อกทั้งหมด</div><div class="kpi-val">${tot}</div><div class="kpi-sub">รายการ</div></div>
    <div class="kpi"><div class="kpi-lbl">คงเหลือ</div><div class="kpi-val" style="color:var(--color-success)">${av}</div><div class="kpi-sub">พร้อมเบิก</div></div>
    <div class="kpi"><div class="kpi-lbl">เบิกแล้ว</div><div class="kpi-val" style="color:var(--color-danger)">${iss}</div><div class="kpi-sub">รายการ</div></div>
    <div class="kpi"><div class="kpi-lbl">ประวัติคลัง</div><div class="kpi-val">${logs.length}</div><div class="kpi-sub">ครั้ง</div></div>`;

  const slocs = ['0021', '0022', '8002'];
  const mats = [...new Set(RAW.map(i => i.mat))];
  
  let thead = `<thead><tr><th style="text-align:left">วัสดุ / คำอธิบาย</th>`;
  slocs.forEach(s => { thead += `<th>${s}</th>`; });
  thead += `<th>รวม</th></tr></thead>`;

  let tbody = '<tbody>';
  let colTot = {}; slocs.forEach(s => { colTot[s] = 0; }); let grandTot = 0;
  
  mats.forEach(m => {
    const mItems = RAW.filter(i => i.mat === m);
    if(mItems.length === 0) return;
    const shortDesc = mItems[0].description.replace('TR. ', '').replace('TR.,', '').split(',').slice(0, 2).join(',');
    
    tbody += `<tr class="sloc-row-clickable" onclick="showSlocModal('${m}','${shortDesc}')">`;
    tbody += `<td><div style="font-weight:500;font-size:12px;color:var(--color-text-primary)">${shortDesc.trim()}</div><div class="mat-code">${m}</div></td>`;
    
    let rowTot = 0;
    slocs.forEach(s => {
      const cnt = mItems.filter(i => i.sloc === s && !i.is_issued).length;
      const all = mItems.filter(i => i.sloc === s).length;
      colTot[s] = (colTot[s] || 0) + all;
      rowTot += all;
      tbody += `<td>${all > 0 ? `<span style="font-weight:500">${cnt}</span><span style="color:var(--color-text-tertiary);font-size:10px"> /${all}</span>` : '<span style="color:var(--color-text-tertiary)">-</span>'}</td>`;
    });
    grandTot += rowTot;
    tbody += `<td style="font-weight:500">${rowTot}</td></tr>`;
  });
  
  tbody += `<tr class="total-row"><td style="font-weight:500">รวมทั้งหมด</td>`;
  slocs.forEach(s => { tbody += `<td style="font-weight:500">${colTot[s] || 0}</td>`; });
  tbody += `<td style="font-weight:500">${grandTot}</td></tr></tbody>`;
  
  document.getElementById('sloc-tbl').innerHTML = thead + tbody;
}

function showSlocModal(mat, title) {
  const items = RAW.filter(i => i.mat === mat);
  document.getElementById('modal-ttl').textContent = title.trim();
  document.getElementById('modal-body').innerHTML = items.map(i => `
    <div class="modal-item">
      <div>
        <div style="font-size:12px;font-weight:500;color:var(--color-text-primary)">${i.serial}</div>
        <div style="font-size:10px;color:var(--color-text-tertiary);margin-top:2px">${i.mfr || 'ไม่ระบุผู้ผลิต'} · ${i.import_date || ''}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="badge bg-sloc">${i.sloc}</span>
        <span class="badge ${i.is_issued ? 'bg-out' : 'bg-ok'}">${i.is_issued ? 'เบิกแล้ว' : 'พร้อมเบิก'}</span>
      </div>
    </div>`).join('');
  document.getElementById('modal-ov').classList.add('on');
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('modal-ov'))
    document.getElementById('modal-ov').classList.remove('on');
}

// 4. ฟังก์ชันแสดงรายการสต็อก (Stock)
function renderStock() {
  const slocs = ['all', '0021', '0022', '8002'];
  const lbl = { all: 'ทั้งหมด', '0021': 'SLoc 0021', '0022': 'SLoc 0022', '8002': 'SLoc 8002' };
  document.getElementById('sf').innerHTML = slocs.map(s => `<div class="pill ${slocF === s ? 'on' : ''}" onclick="setSloc('${s}')">${lbl[s]}</div>`).join('');
  
  const items = RAW.filter(i => slocF === 'all' || i.sloc === slocF);
  document.getElementById('stock-list').innerHTML = items.length ? items.map(i => `
    <div class="item ${i.is_issued ? 'issued' : ''}">
      <div class="item-top">
        <span class="item-serial">${i.serial}</span>
        <span class="badge ${i.is_issued ? 'bg-out' : 'bg-ok'}">${i.is_issued ? 'เบิกแล้ว' : 'พร้อมเบิก'}</span>
      </div>
      <div class="item-desc">${i.description}</div>
      <div class="item-meta">
        <span class="badge bg-sloc">${i.sloc}</span>
        <span style="font-size:10px;color:var(--color-text-tertiary)">${i.asset_no || '-'}</span>
        <span style="font-size:10px;color:var(--color-text-tertiary)">${i.mfr || '-'}</span>
      </div>
    </div>`).join('') : `<div style="text-align:center;padding:32px;color:var(--color-text-tertiary);font-size:13px">ไม่มีรายการ</div>`;
}

function setSloc(s) { slocF = s; renderStock(); }

// 5. ฟังก์ชันฟอร์มเบิกจ่าย (Issue)
function renderIssue() {
  const av = avail();
  const sel = document.getElementById('s-serial');
  sel.innerHTML = '<option value="">-- เลือก Serial No. --</option>' +
    av.map(i => `<option value="${i.serial}">${i.serial} · SLoc${i.sloc} · ${i.description.split(',')[0].replace('TR. ', '')}</option>`).join('');
    
  document.getElementById('ready-list').innerHTML = av.length ? av.slice(0, 6).map(i => `
    <div class="item" onclick="pickS('${i.serial}')">
      <div class="item-top"><span class="item-serial">${i.serial}</span><span class="badge bg-sloc">${i.sloc}</span></div>
      <div class="item-desc">${i.description}</div>
      <div class="item-meta"><span style="font-size:10px;color:var(--color-text-tertiary)">${i.mfr} · ${i.import_date}</span></div>
    </div>`).join('') + (av.length > 6 ? `<div style="text-align:center;padding:8px;font-size:11px;color:var(--color-text-tertiary)">และอีก ${av.length - 6} รายการ</div>` : '') :
    `<div style="text-align:center;padding:32px;color:var(--color-text-tertiary);font-size:13px"><i class="ti ti-check" style="font-size:24px;display:block;margin-bottom:8px" aria-hidden="true"></i>เบิกจ่ายครบแล้ว</div>`;
}

function pickS(s) { document.getElementById('s-serial').value = s; document.getElementById('s-req').focus(); }

function getGPS() {
  const btn = document.getElementById('gps-btn');
  const inp = document.getElementById('s-gps');
  if (!navigator.geolocation) { showToast('เบราว์เซอร์ไม่รองรับ GPS'); return; }
  btn.innerHTML = '<i class="ti ti-loader" aria-hidden="true"></i>กำลังดึง...';
  navigator.geolocation.getCurrentPosition(p => {
    const lat = p.coords.latitude.toFixed(6);
    const lng = p.coords.longitude.toFixed(6);
    inp.value = `${lat}, ${lng}`;
    inp.removeAttribute('readonly');
    btn.className = 'btn-gps got';
    btn.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i>ได้แล้ว';
    showToast('ดึง GPS สำเร็จ');
  }, () => {
    btn.innerHTML = '<i class="ti ti-current-location" aria-hidden="true"></i>ดึง GPS';
    showToast('ไม่สามารถดึง GPS ได้');
  }, { timeout: 10000 });
}

// ยืนยันการเบิกจ่ายจริง และบันทึกไปยัง Supabase [cite: 1, 2]
async function doIssue() {
  const serial = document.getElementById('s-serial').value;
  const req = document.getElementById('s-req').value.trim();
  if (!serial) { showToast('กรุณาเลือก Serial No.'); return; }
  if (!req) { showToast('กรุณาระบุชื่อผู้เบิก'); return; }
  
  const gps = document.getElementById('s-gps').value.trim();
  const loc = document.getElementById('s-loc').value.trim();
  const note = document.getElementById('s-note').value.trim();
  
  updateHdrStatus('กำลังบันทึกข้อมูล...');

  try {
    // 1. ส่งข้อมูลขึ้นตาราง Logs
    const { error: logErr } = await _supabase.from('logs').insert([{
      serial: serial,
      req_name: req,
      location: loc,
      gps: gps,
      note: note
    }]);
    if (logErr) throw logErr;

    // 2. อัปเดตสถานะในตาราง Transformers
    const { error: trErr } = await _supabase.from('transformers').update({ is_issued: true }).eq('serial', serial);
    if (trErr) throw trErr;

    // เคลียร์ฟอร์มหน้าเว็บ
    ['s-serial', 's-req', 's-loc', 's-note'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('s-gps').value = '';
    document.getElementById('gps-btn').className = 'btn-gps';
    document.getElementById('gps-btn').innerHTML = '<i class="ti ti-current-location" aria-hidden="true"></i>ดึง GPS';
    
    showToast('เบิกจ่าย ' + serial + ' สำเร็จ');
    await initApp(); // ดึงข้อมูลใหม่มาแสดงผลทันที
  } catch (error) {
    console.error(error);
    showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    updateHdr();
  }
}

// 6. ฟังก์ชันหน้าประวัติ (Log)
function renderLog() {
  document.getElementById('log-count').textContent = `ทั้งหมด ${logs.length} รายการ`;
  document.getElementById('log-list').innerHTML = logs.length ? logs.map((l, i) => {
    const formattedTime = new Date(l.created_at).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' });
    // ค้นหาคำอธิบายจากสเตทหลักเพื่อความแม่นยำ
    const trInfo = RAW.find(r => r.serial === l.serial) || {};
    return `
    <div class="log-item">
      <div class="log-top"><span class="log-serial">${l.serial}</span><span class="log-time">${formattedTime}</span></div>
      <div class="log-row"><i class="ti ti-package" style="font-size:12px" aria-hidden="true"></i>${(trInfo.description || '').split(',')[0].replace('TR. ', '')} · SLoc ${trInfo.sloc || '-'}</div>
      <div class="log-row"><i class="ti ti-user" style="font-size:12px" aria-hidden="true"></i>${l.req_name}${l.location ? ' · ' + l.location : ''}</div>
      ${l.gps ? `<div class="log-row" style="cursor:pointer" onclick="editGPS(${l.id}, '${l.gps}')"><i class="ti ti-map-pin" style="font-size:12px" aria-hidden="true"></i><span style="color:var(--color-info)">${l.gps}</span> <i class="ti ti-edit" style="font-size:11px;color:var(--color-text-tertiary)" aria-hidden="true"></i></div>` : ''}
      ${l.note ? `<div class="log-row"><i class="ti ti-note" style="font-size:12px" aria-hidden="true"></i>${l.note}</div>` : ''}
    </div>`;
  }).join('') : `<div style="text-align:center;padding:32px;color:var(--color-text-tertiary);font-size:13px">ยังไม่มีประวัติ</div>`;
}

async function editGPS(id, curGps) {
  const val = prompt('แก้ไขพิกัด GPS (lat, lng):', curGps);
  if (val !== null) {
    updateHdrStatus('กำลังอัปเดต GPS...');
    const { error } = await _supabase.from('logs').update({ gps: val }).eq('id', id);
    if (error) showToast('แก้ไขล้มเหลว');
    else { showToast('อัปเดต GPS แล้ว'); await initApp(); }
  }
}

// 7. ฟังก์ชันฝั่ง Settings (Import / Export / Reset)
async function importFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    const text = e.target.result;
    const parsed = parseIQ09(text);
    if (parsed.length === 0) {
      document.getElementById('import-result').innerHTML = '<span style="color:var(--color-danger)">ไม่พบข้อมูลที่อ่านได้ กรุณาตรวจสอบรูปแบบไฟล์</span>';
      return;
    }
    
    updateHdrStatus('กำลัง Upsert ลงฐานข้อมูล...');
    
    // แปลงโมเดลให้ตรงตาราง Database
    const dbPayload = parsed.map(p => ({
      serial: p.serial,
      mat: p.mat,
      description: p.desc,
      sloc: p.sloc,
      asset_no: p.assetNo,
      mfr: p.mfr,
      import_date: p.date
    }));

    // ส่งชุดข้อมูลขึ้นแบบ Upsert (หากเจอ Serial ซ้ำ จะแก้ไขข้อมูลตัวเดิมให้ล่าสุด) [cite: 1, 2]
    const { error } = await _supabase.from('transformers').upsert(dbPayload, { onConflict: 'serial' });
    
    if (error) {
      console.error(error);
      document.getElementById('import-result').innerHTML = '<span style="color:var(--color-danger)">เกิดข้อผิดพลาดในการบันทึก</span>';
    } else {
      document.getElementById('import-result').innerHTML = `<span style="color:var(--color-success)"><i class="ti ti-check" aria-hidden="true"></i> นำเข้าสำเร็จ ${parsed.length} รายการ</span>`;
      showToast(`นำเข้า ${parsed.length} รายการสำเร็จ`);
      await initApp();
    }
  };
  reader.readAsText(file, 'utf-8');
  input.value = '';
}

function parseIQ09(text) {
  const lines = text.split('\n');
  const result = [];
  const dataRe = /^\|\s*([\d\-]+)\s*\|(.*?)\|([A-Z0-9]+)\|([YN])\s*\|(\d+)\|([\w\-]+)\s*\|([\w\s]+?)\s*\|([\w\s\-\/]+?)\s*\|\d+\|[\d\.]+\s*\|/;
  lines.forEach(l => {
    const m = l.match(dataRe);
    if (m) {
      result.push({ mat: m[1].trim(), desc: m[2].trim(), sloc: m[5].trim(), serial: m[6].trim(), assetNo: '', mfr: m[8].trim(), date: '' });
    }
  });
  if (result.length === 0) {
    const re2 = /\|\s*(1-\d{2}-\d{3}-\d{4})\|(.*?)\|[A-Z0-9]+\|[YN]\s*\|(\d+)\|([\w\-]+)\s*\|([\w\d]+)\s*\|([\w\s\-]+?)\s*\|/g;
    let m2;
    while ((m2 = re2.exec(text)) !== null) {
      result.push({ mat: m2[1].trim(), desc: m2[2].trim(), sloc: m2[3].trim(), serial: m2[4].trim(), assetNo: m2[5].trim(), mfr: m2[6].trim(), date: '' });
    }
  }
  return result;
}

function exportCSV() {
  if (logs.length === 0) { showToast('ไม่มีประวัติการเบิก'); return; }
  const hdr = 'Serial No.,คำอธิบาย,ผู้เบิก,สถานที่,GPS,หมายเหตุ,วันที่บันทึก\n';
  const rows = logs.map(l => [l.serial, '"' + (l.note || '') + '"', l.req_name, l.location || '', l.gps || '', l.note || '', l.created_at].join(',')).join('\n');
  const blob = new Blob(['\ufeff' + hdr + rows], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'issue_log_supabase.csv';
  a.click();
}

async function resetAll() {
  if (!confirm('คุณมั่นใจใช่ไหมที่จะล้างประวัติการเบิกจ่ายทั้งหมดบน Cloud?')) return;
  updateHdrStatus('กำลังล้างข้อมูล...');
  try {
    // 1. ลบประวัติเบิกทั้งหมด
    const { error: delErr } = await _supabase.from('logs').delete().neq('id', 0);
    if (delErr) throw delErr;

    // 2. ปรับสถานะสต็อกทุกชิ้นกลับเป็นพร้อมเบิก
    const { error: upErr } = await _supabase.from('transformers').update({ is_issued: false }).neq('serial', 'dummy');
    if (upErr) throw upErr;

    showToast('รีเซ็ตฐานข้อมูล Cloud เรียบร้อยแล้ว');
    await initApp();
  } catch (error) {
    console.error(error);
    showToast('การรีเซ็ตล้มเหลว');
    updateHdr();
  }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), 2500);
}

// จุดเริ่มต้นทำงานร่วมกับ Supabase
initApp();