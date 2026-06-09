// ==========================================
// Module: Core Application & Supabase Init
// ==========================================
const supabaseUrl = 'https://foplvudtvujxyxsibuck.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvcGx2dWR0dnVqeHl4c2lidWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODgzMzYsImV4cCI6MjA5NjU2NDMzNn0.h-BNhShuEarCUA0ozpYm6g9rUKET6ddJSYrCLmCQavc';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let RAW = [];
let logs = [];
let slocF = 'all';
let currentPg = 'dash';

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
  
  const items = RAW.filter(i => slocF === 'all' || i.sloc === slocF);
  document.getElementById('stock-list').innerHTML = items.length ? items.map(i => `
    <div class="item ${i.is_issued ? 'issued' : ''}">
      <div class="item-top">
        <span class="item-serial">${i.serial} ${i.asset_no ? ' / ' + i.asset_no : ''}</span>
        <span class="badge ${i.is_issued ? 'bg-out' : 'bg-ok'}">${i.is_issued ? 'เบิกแล้ว' : 'พร้อมเบิก'}</span>
      </div>
      <div class="item-desc">${i.description}</div>
      <div class="item-meta">
        <span class="badge bg-sloc">${i.sloc}</span>
        <span style="font-size:10px;color:var(--color-text-tertiary)">${i.mfr || '-'}</span>
      </div>
    </div>`).join('') : `<div style="text-align:center;padding:32px;color:var(--color-text-tertiary);font-size:13px">ไม่มีรายการ</div>`;
}

function setSloc(s) { slocF = s; renderStock(); }

// หน้า Log (ประวัติ)
function renderLog() {
  document.getElementById('log-count').textContent = `ทั้งหมด ${logs.length} รายการ`;
  document.getElementById('log-list').innerHTML = logs.length ? logs.map((l, i) => {
    const formattedTime = new Date(l.created_at).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' });
    const trInfo = RAW.find(r => r.serial === l.serial) || {};
    return `
    <div class="log-item">
      <div class="log-top">
        <span class="log-serial">${l.serial} ${trInfo.asset_no ? ' / ' + trInfo.asset_no : ''}</span>
        <span class="log-time">${formattedTime}</span>
      </div>
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

// ระบบ Settings 
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
  reader.readAsText(file, 'utf-8');
  input.value = '';
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