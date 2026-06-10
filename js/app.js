// ==========================================
// Module: Core Application & Supabase Init
// ==========================================

// CONFIGURATION (ใส่ API ของคุณเรียบร้อยแล้ว)
const supabaseUrl = 'https://foplvudtvujxyxsibuck.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvcGx2dWR0dnVqeHl4c2lidWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODgzMzYsImV4cCI6MjA5NjU2NDMzNn0.h-BNhShuEarCUA0ozpYm6g9rUKET6ddJSYrCLmCQavc';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Global App State
let RAW = [];
let logs = [];
let slocF = 'all';
let currentPg = 'dash';

// Pagination Variables
let currentLogPage = 1;
const logsPerPage = 10;

async function initApp() {
  updateHdrStatus('กำลังโหลดข้อมูล...');
  try {
    const { data: trData, error: trErr } = await _supabase.from('transformers').select('*');
    if (trErr) throw trErr;
    RAW = trData || [];

    const { data: logData, error: logErr } = await _supabase.from('logs').select('*').order('created_at', { ascending: false });
    if (logErr) throw logErr;
    logs = logData || [];

    showPg(currentPg);
  } catch (err) {
    console.error('Error fetching data:', err);
    showToast('การเชื่อมต่อ Database ล้มเหลว');
  }
}

function updateHdrStatus(text) { document.getElementById('hdr-sub').textContent = text; }
function updateHdr() {
  const tot = RAW.length;
  const iss = RAW.filter(r => r.is_issued).length;
  document.getElementById('hdr-sub').textContent = `${tot} รายการ · คงเหลือ ${tot - iss} · เบิกแล้ว ${iss}`;
}

function avail() { return RAW.filter(x => !x.is_issued); }

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

// หน้า Stock
function renderStock() {
  const slocs = ['all', '0021', '0022', '8002'];
  const lbl = { all: 'ทั้งหมด', '0021': 'SLoc 0021', '0022': 'SLoc 0022', '8002': 'SLoc 8002' };
  document.getElementById('sf').innerHTML = slocs.map(s => `<div class="pill ${slocF === s ? 'on' : ''}" onclick="setSloc('${s}')">${lbl[s]}</div>`).join('');
  
  const items = RAW.filter(i => (slocF === 'all' || i.sloc === slocF) && !i.is_issued);
  
  document.getElementById('stock-list').innerHTML = items.length ? items.map(i => `
    <div class="item">
      <div class="item-top">
        <span class="item-serial">${i.serial} ${i.asset_no ? ' / ' + i.asset_no : ''}</span>
        <span class="badge bg-ok">พร้อมเบิก</span>
      </div>
      <div class="item-desc">${i.description}</div>
      <div class="item-meta">
        <span class="badge bg-sloc">${i.sloc}</span>
        <span style="font-size:10px;color:var(--color-text-tertiary)">${i.mfr || '-'}</span>
      </div>
    </div>`).join('') : `<div style="text-align:center;padding:32px;color:var(--color-text-tertiary);font-size:13px">ไม่มีรายการในคลัง</div>`;
}

function setSloc(s) { slocF = s; renderStock(); }

// หน้า Log (ประวัติ - พร้อมระบบ Pagination และ Filter ขนาด)
function renderLog() {
  const monthInput = document.getElementById('log-month-input');
  const searchInput = document.getElementById('log-search-input');
  const sizeInput = document.getElementById('log-size-input');
  
  if (!monthInput.value) monthInput.value = new Date().toISOString().slice(0, 7);
  
  const currentMonth = monthInput.value;
  const searchTerm = searchInput.value.toLowerCase();
  const selectedSize = sizeInput.value;

  // 1. ดึงขนาดหม้อแปลงทั้งหมดใส่ Dropdown
  const allSizes = [...new Set(logs.map(l => {
    const trInfo = RAW.find(r => r.serial === l.serial) || {};
    const match = (trInfo.description || '').match(/(TR.*?KVA)/i);
    return match ? match[1].trim() : ((trInfo.description || '').split(',')[0].trim() || 'ไม่ระบุขนาด');
  }))].filter(Boolean);

  if (sizeInput.options.length <= 1 && allSizes.length > 0) {
    sizeInput.innerHTML = '<option value="">ทุกขนาด</option>' + allSizes.map(sz => `<option value="${sz}">${sz}</option>`).join('');
    sizeInput.value = selectedSize;
  }

  // 2. กรองข้อมูล
  const filteredLogs = logs.filter(l => {
    const logDate = new Date(l.created_at);
    const logYYYYMM = logDate.getFullYear() + '-' + String(logDate.getMonth() + 1).padStart(2, '0');
    
    const trInfo = RAW.find(r => r.serial === l.serial) || {};
    const matchSizeStr = (trInfo.description || '').match(/(TR.*?KVA)/i);
    const size = matchSizeStr ? matchSizeStr[1].trim() : ((trInfo.description || '').split(',')[0].trim() || 'ไม่ระบุขนาด');

    const matchMonth = logYYYYMM === currentMonth;
    const matchSearch = l.serial.toLowerCase().includes(searchTerm) || 
                        l.req_name.toLowerCase().includes(searchTerm) || 
                        (l.location || '').toLowerCase().includes(searchTerm);
    const matchSize = !selectedSize || size === selectedSize;

    return matchMonth && (!searchTerm || matchSearch) && matchSize;
  });

  // 3. สรุปยอด
  const sizeSummary = {};
  filteredLogs.forEach(l => {
    const trInfo = RAW.find(r => r.serial === l.serial) || {};
    const match = (trInfo.description || '').match(/(TR.*?KVA)/i);
    const size = match ? match[1].trim() : ((trInfo.description || '').split(',')[0].trim() || 'ไม่ระบุขนาด');
    sizeSummary[size] = (sizeSummary[size] || 0) + 1;
  });

  let summaryHTML = '<div style="font-weight:600; margin-bottom:8px; color:var(--color-text-primary)">📊 สรุปยอดเบิกเดือนนี้:</div>';
  if (Object.keys(sizeSummary).length) {
    for (const [sz, count] of Object.entries(sizeSummary)) {
      summaryHTML += `<div style="display:flex; justify-content:space-between; margin-bottom:4px; border-bottom:1px dashed var(--color-border); padding-bottom:4px;"><span style="color:var(--color-text-secondary)">${sz}</span><span style="font-weight:600; color:var(--color-primary)">${count} เครื่อง</span></div>`;
    }
  } else {
    summaryHTML += '<div style="color:var(--color-text-tertiary)">ไม่มีรายการเบิกจ่าย</div>';
  }
  document.getElementById('log-summary').innerHTML = summaryHTML;

  // 4. Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage) || 1;
  if (currentLogPage > totalPages) currentLogPage = totalPages;

  const startIndex = (currentLogPage - 1) * logsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + logsPerPage);

  // 5. วาดรายการ
  document.getElementById('log-count').textContent = `รายการเบิก (ทั้งหมด ${filteredLogs.length} รายการ)`;
  document.getElementById('log-list').innerHTML = paginatedLogs.length ? paginatedLogs.map((l) => {
    const formattedTime = new Date(l.created_at).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' });
    const trInfo = RAW.find(r => r.serial === l.serial) || {};
    
    // สร้างลิงก์นำทางให้สมบูรณ์
    const cleanGPS = (l.gps || '').replace(/\s+/g, '');
    const gpsLink = l.gps ? `<a href="https://www.google.com/maps/search/?api=1&query=${cleanGPS}" target="_blank" style="color:var(--color-primary); text-decoration:none; font-weight:500;"><i class="ti ti-map-pin" style="font-size:12px" aria-hidden="true"></i> ${l.gps} <span style="font-size:10px; background:var(--color-bg-secondary); padding:2px 6px; border-radius:10px; border:1px solid var(--color-border);">นำทาง</span></a>` : '';

    return `
    <div class="log-item">
      <div class="log-top">
        <span class="log-serial">${l.serial} ${trInfo.asset_no ? ' / ' + trInfo.asset_no : ''}</span>
        <div>
          <span class="log-time" style="margin-right:8px;">${formattedTime}</span>
          <i class="ti ti-edit" style="font-size:16px; color:var(--color-text-tertiary); cursor:pointer;" onclick="editLogModal(${l.id})" aria-hidden="true"></i>
        </div>
      </div>
      <div class="log-row"><i class="ti ti-package" style="font-size:12px" aria-hidden="true"></i>${(trInfo.description || '').split(',')[0].replace('TR. ', '')} · SLoc ${trInfo.sloc || '-'}</div>
      <div class="log-row"><i class="ti ti-user" style="font-size:12px" aria-hidden="true"></i>${l.req_name}${l.location ? ' · ' + l.location : ''}</div>
      ${l.gps ? `<div class="log-row">${gpsLink}</div>` : ''}
      ${l.note ? `<div class="log-row"><i class="ti ti-note" style="font-size:12px" aria-hidden="true"></i>${l.note}</div>` : ''}
    </div>`;
  }).join('') : `<div style="text-align:center;padding:32px;color:var(--color-text-tertiary);font-size:13px">ไม่พบข้อมูลที่ค้นหา</div>`;

  // อัปเดตสถานะปุ่มเปลี่ยนหน้า
  document.getElementById('log-page-info').textContent = `หน้า ${currentLogPage} / ${totalPages}`;
  document.getElementById('btn-prev-page').disabled = currentLogPage === 1;
  document.getElementById('btn-next-page').disabled = currentLogPage === totalPages;
  document.getElementById('btn-prev-page').style.opacity = currentLogPage === 1 ? '0.5' : '1';
  document.getElementById('btn-next-page').style.opacity = currentLogPage === totalPages ? '0.5' : '1';
}

function changeLogPage(dir) {
  currentLogPage += dir;
  renderLog();
}

function editLogModal(logId) {
  const log = logs.find(l => l.id === logId);
  if(!log) return;
  document.getElementById('modal-ttl').textContent = 'แก้ไขประวัติเบิกจ่าย';
  document.getElementById('modal-body').innerHTML = `
    <div class="fl"><div class="fl-lbl">ชื่อผู้เบิก</div><input type="text" id="edit-req" value="${log.req_name}"></div>
    <div class="fl"><div class="fl-lbl">สถานที่ติดตั้ง</div><input type="text" id="edit-loc" value="${log.location || ''}"></div>
    <div class="fl"><div class="fl-lbl">พิกัด GPS (lat,lng)</div><input type="text" id="edit-gps" value="${log.gps || ''}"></div>
    <div class="fl"><div class="fl-lbl">หมายเหตุ</div><textarea id="edit-note">${log.note || ''}</textarea></div>
    <button class="btn-primary" onclick="saveEditLog(${log.id})">บันทึกการแก้ไข</button>
  `;
  document.getElementById('modal-ov').classList.add('on');
}

async function saveEditLog(logId) {
  const req = document.getElementById('edit-req').value.trim();
  const loc = document.getElementById('edit-loc').value.trim();
  const gps = document.getElementById('edit-gps').value.trim();
  const note = document.getElementById('edit-note').value.trim();

  if(!req) { showToast('กรุณาระบุชื่อผู้เบิก'); return; }

  updateHdrStatus('กำลังบันทึก...');
  const { error } = await _supabase.from('logs').update({
    req_name: req, location: loc, gps: gps, note: note
  }).eq('id', logId);

  if (error) { showToast('แก้ไขล้มเหลว'); updateHdr(); } 
  else {
    showToast('บันทึกการแก้ไขเรียบร้อย');
    closeModal(null);
    await initApp(); 
  }
}

// Settings
async function importFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    const text = e.target.result;
    const parsed = parseIQ09(text);
    if (parsed.length === 0) {
      document.getElementById('import-result').innerHTML = '<span style="color:var(--color-danger)">ไม่พบข้อมูลที่อ่านได้</span>'; return;
    }
    updateHdrStatus('กำลัง Upsert...');
    const dbPayload = parsed.map(p => ({
      serial: p.serial, mat: p.mat, description: p.desc, sloc: p.sloc, asset_no: p.assetNo, mfr: p.mfr, import_date: p.date
    }));
    const { error } = await _supabase.from('transformers').upsert(dbPayload, { onConflict: 'serial' });
    if (error) { document.getElementById('import-result').innerHTML = '<span style="color:var(--color-danger)">เกิดข้อผิดพลาดในการบันทึก</span>'; } 
    else {
      document.getElementById('import-result').innerHTML = `<span style="color:var(--color-success)"><i class="ti ti-check" aria-hidden="true"></i> นำเข้าสำเร็จ ${parsed.length} รายการ</span>`;
      showToast(`นำเข้าสำเร็จ`); await initApp();
    }
  };
  reader.readAsText(file, 'utf-8'); input.value = '';
}

function parseIQ09(text) {
  const lines = text.split('\n');
  const result = [];
  lines.forEach(line => {
    if (!line.includes('|')) return;
    const cols = line.split('|').map(c => c.trim());
    if (cols[1] && cols[1].match(/^1-\d{2}/)) {
      result.push({ mat: cols[1], desc: cols[2], sloc: cols[5], serial: cols[6], assetNo: cols[7], mfr: cols[8], date: cols[10] });
    }
  });
  return result;
}

function exportCSV() {
  if (logs.length === 0) { showToast('ไม่มีประวัติ'); return; }
  const hdr = 'Serial No.,คำอธิบาย,ผู้เบิก,สถานที่,GPS,หมายเหตุ,วันที่บันทึก\n';
  const rows = logs.map(l => [l.serial, '"' + (l.note || '') + '"', l.req_name, l.location || '', l.gps || '', l.note || '', l.created_at].join(',')).join('\n');
  const blob = new Blob(['\ufeff' + hdr + rows], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'issue_log.csv'; a.click();
}

async function resetAll() {
  if (!confirm('ยืนยันการล้างประวัติการเบิกจ่ายทั้งหมดบน Cloud?')) return;
  updateHdrStatus('กำลังล้างข้อมูล...');
  try {
    await _supabase.from('logs').delete().neq('id', 0);
    await _supabase.from('transformers').update({ is_issued: false }).neq('serial', 'dummy');
    showToast('รีเซ็ตฐานข้อมูลเรียบร้อยแล้ว'); await initApp();
  } catch (error) { showToast('การรีเซ็ตล้มเหลว'); updateHdr(); }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), 2500);
}

initApp();