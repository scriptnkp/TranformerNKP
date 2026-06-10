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

function renderStock() {
  const slocs = ['all', '0021', '0022', '8002'];
  const lbl = { all: 'ทั้งหมด', '0021': 'SLoc 0021', '0022': 'SLoc 0022', '8002': 'SLoc 8002' };
  document.getElementById('sf').innerHTML = slocs.map(s => `<div class="pill ${slocF === s ? 'on' : ''}" onclick="setSloc('${s}')">${lbl[s]}</div>`).join('');
  
  const items = RAW.filter(i => (slocF === 'all' || i.sloc === slocF) && !i.is_issued);
  
  const groupedItems = {};
  items.forEach(i => {
    const match = i.description.match(/(TR.*?KVA)/i);
    const size = match ? match[1].trim() : i.description.split(',')[0].trim();
    if(!groupedItems[size]) groupedItems[size] = [];
    groupedItems[size].push(i);
  });

  let html = '';
  if (items.length === 0) {
     html = `<div style="text-align:center;padding:32px;color:var(--color-text-tertiary);font-size:13px;grid-column:1/-1;">ไม่มีรายการในคลัง</div>`;
  } else {
     for (const [size, sizeItems] of Object.entries(groupedItems)) {
        html += `
        <div style="grid-column: 1 / -1; margin-top: 16px; margin-bottom: 4px; padding-bottom: 8px; border-bottom: 2px solid var(--color-primary-light); color: var(--color-primary); font-weight: 700; font-size: 15px; display: flex; justify-content: space-between; align-items: center;">
          <span style="display:flex; align-items:center; gap:6px;"><i class="ti ti-bolt" style="font-size:18px;"></i> ${size}</span>
          <span style="background: var(--color-primary-light); color: var(--color-primary); padding: 4px 10px; border-radius: 20px; font-size: 12px;">${sizeItems.length} เครื่อง</span>
        </div>`;
        
        html += sizeItems.map(i => `
          <div class="item">
            <div class="item-top">
              <span class="item-serial">${i.serial} ${i.asset_no ? ' / ' + i.asset_no : ''}</span>
              <span class="badge bg-ok">พร้อมเบิก</span>
            </div>
            <div class="item-desc">${i.description}</div>
            <div class="item-meta">
              <span class="badge bg-sloc">มีผลจาก ${i.import_date || '-'}</span>
              <span style="font-size:10px;color:var(--color-text-tertiary)">${i.mfr || '-'}</span>
            </div>
          </div>`).join('');
     }
  }
  document.getElementById('stock-list').innerHTML = html;
}

function setSloc(s) { slocF = s; renderStock(); }

function renderLog() {
  const monthInput = document.getElementById('log-month-input');
  const searchInput = document.getElementById('log-search-input');
  const sizeInput = document.getElementById('log-size-input');
  
  if (!monthInput.value) monthInput.value = new Date().toISOString().slice(0, 7);
  
  const currentMonth = monthInput.value;
  const searchTerm = searchInput.value.toLowerCase();
  const selectedSize = sizeInput.value;

  const logsInMonth = logs.filter(l => {
    const logDate = new Date(l.created_at);
    const logYYYYMM = logDate.getFullYear() + '-' + String(logDate.getMonth() + 1).padStart(2, '0');
    return logYYYYMM === currentMonth;
  });

  const allSizes = [...new Set(logsInMonth.map(l => {
    const trInfo = RAW.find(r => r.serial === l.serial) || {};
    const match = (trInfo.description || '').match(/(TR.*?KVA)/i);
    return match ? match[1].trim() : ((trInfo.description || '').split(',')[0].trim() || 'ไม่ระบุขนาด');
  }))].filter(Boolean);

  sizeInput.innerHTML = '<option value="">ทุกขนาด</option>' + allSizes.map(sz => `<option value="${sz}">${sz}</option>`).join('');
  if (allSizes.includes(selectedSize)) { sizeInput.value = selectedSize; }

  const filteredLogs = logsInMonth.filter(l => {
    const trInfo = RAW.find(r => r.serial === l.serial) || {};
    const matchSizeStr = (trInfo.description || '').match(/(TR.*?KVA)/i);
    const size = matchSizeStr ? matchSizeStr[1].trim() : ((trInfo.description || '').split(',')[0].trim() || 'ไม่ระบุขนาด');

    // 👇 เพิ่มการค้นหาจากเลขประจำ (Asset No) ตรงบรรทัดที่ 2 ในนี้ครับ
    const matchSearch = l.serial.toLowerCase().includes(searchTerm) || 
                        (trInfo.asset_no || '').toLowerCase().includes(searchTerm) || 
                        l.req_name.toLowerCase().includes(searchTerm) || 
                        (l.location || '').toLowerCase().includes(searchTerm) ||
                        (l.team || '').toLowerCase().includes(searchTerm) ||
                        (l.wbs || '').toLowerCase().includes(searchTerm);
                        
    const matchSize = !sizeInput.value || size === sizeInput.value;

    return (!searchTerm || matchSearch) && matchSize;
  });
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

  const jobMap = {};
  filteredLogs.forEach(l => {
     const date = new Date(l.created_at);
     const timeKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
     const groupKey = `${timeKey}_${l.req_name}_${l.location}`;

     if(!jobMap[groupKey]) {
        jobMap[groupKey] = {
           id: groupKey,
           logIds: [],
           created_at: l.created_at,
           formattedTime: date.toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' }),
           req_name: l.req_name,
           team: l.team, // นำข้อมูลทีมงานมาใช้งาน
           location: l.location,
           gps: l.gps,
           wbs: l.wbs,   // นำข้อมูล WBS มาใช้งาน
           items: []
        };
     }
     jobMap[groupKey].logIds.push(l.id);

     const trInfo = RAW.find(r => r.serial === l.serial) || {};
     jobMap[groupKey].items.push({
        serial: l.serial,
        asset_no: trInfo.asset_no,
        desc: trInfo.description,
        import_date: trInfo.import_date
     });
  });

  const jobGroups = Object.values(jobMap).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  window.currentJobGroups = jobGroups; 

  const totalPages = Math.ceil(jobGroups.length / logsPerPage) || 1;
  if (currentLogPage > totalPages) currentLogPage = totalPages;

  const startIndex = (currentLogPage - 1) * logsPerPage;
  const paginatedJobs = jobGroups.slice(startIndex, startIndex + logsPerPage);

  document.getElementById('log-count').textContent = `ประวัติทั้งหมด ${jobGroups.length} งาน (${filteredLogs.length} เครื่อง)`;
  
  document.getElementById('log-list').innerHTML = paginatedJobs.length ? paginatedJobs.map((job) => {
    const cleanGPS = (job.gps || '').replace(/\s+/g, '');
    const gpsLink = job.gps ? `<a href="https://www.google.com/maps/search/?api=1&query=${cleanGPS}" target="_blank" style="color:var(--color-primary); text-decoration:none; font-weight:500;"><i class="ti ti-map-pin" style="font-size:12px" aria-hidden="true"></i> ${job.gps} <span style="font-size:10px; background:var(--color-bg-secondary); padding:2px 6px; border-radius:10px; border:1px solid var(--color-border);">นำทาง</span></a>` : '';

    return `
    <div class="log-item" style="padding: 16px; border-radius: var(--radius-lg); margin-bottom: 16px; grid-column: 1 / -1;">
      <div class="log-top" style="border-bottom: 1px dashed var(--color-border); padding-bottom: 12px; margin-bottom: 12px;">
        <div style="display:flex; flex-direction:column; gap:4px;">
          <span class="log-time" style="align-self:flex-start; margin:0;">${job.formattedTime}</span>
          <span style="font-weight:700; color:var(--color-text-primary); font-size:15px; margin-top:4px;"><i class="ti ti-user" style="color:var(--color-primary);"></i> ${job.req_name}</span>
        </div>
        <i class="ti ti-edit" style="font-size:20px; color:var(--color-text-tertiary); cursor:pointer; align-self:flex-start;" onclick="editJobModal('${job.id}')" title="แก้ไขข้อมูลงานนี้" aria-hidden="true"></i>
      </div>
      
      ${job.team ? `<div class="log-row" style="margin-bottom:6px;"><i class="ti ti-users"></i> <span style="color:var(--color-text-primary); font-weight:500;">ทีมงาน:</span> ${job.team}</div>` : ''}
      ${job.location ? `<div class="log-row" style="margin-bottom:6px;"><i class="ti ti-map"></i> <span style="color:var(--color-text-primary); font-weight:500;">สถานที่:</span> ${job.location}</div>` : ''}
      ${job.gps ? `<div class="log-row" style="margin-bottom:6px;">${gpsLink}</div>` : ''}
      ${job.wbs ? `<div class="log-row" style="margin-bottom:6px;"><i class="ti ti-briefcase"></i> <span style="color:var(--color-text-primary); font-weight:500;">WBS:</span> ${job.wbs}</div>` : ''}
      
      <div style="margin-top:14px; background:var(--color-bg-secondary); border-radius:var(--radius-md); padding:12px; border:1px solid var(--color-border);">
        <div style="font-size:12px; font-weight:700; color:var(--color-primary); margin-bottom:8px;">📦 รายการหม้อแปลง (${job.items.length} เครื่อง):</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${job.items.map(i => {
            const match = (i.desc || '').match(/(TR.*?KVA)/i);
            const sizeLabel = match ? match[1] : (i.desc || '').split(',').slice(0, 2).join(',');

            return `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; border-bottom:1px solid #e2e8f0; padding-bottom:6px;">
              <div>
                <span style="font-weight:600; color:var(--color-text-primary);">${i.serial}</span> ${i.asset_no ? ' <span style="color:var(--color-text-tertiary);">/ '+i.asset_no+'</span>' : ''} <br> 
                <span style="color:var(--color-text-secondary); font-size:11px; display:inline-block; margin-top:2px;">${sizeLabel}</span>
              </div>
              <span class="badge bg-sloc" style="font-size:10px; background:var(--color-bg-card);">มีผลจาก ${i.import_date || '-'}</span>
            </div>
            `
          }).join('')}
        </div>
      </div>
    </div>`;
  }).join('') : `<div style="text-align:center;padding:32px;color:var(--color-text-tertiary);font-size:13px;grid-column:1/-1;">ไม่พบข้อมูลที่ค้นหา</div>`;

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

function editJobModal(jobId) {
  const job = window.currentJobGroups.find(g => g.id === jobId);
  if(!job) return;
  
  window.currentEditJobIds = job.logIds; 

  document.getElementById('modal-ttl').textContent = `แก้ไขประวัติเบิก (${job.items.length} เครื่อง)`;
  document.getElementById('modal-body').innerHTML = `
    <div class="fl"><div class="fl-lbl">3. ชื่อผู้เบิก</div><input type="text" id="edit-req" value="${job.req_name}"></div>
    <div class="fl"><div class="fl-lbl">4. ทีมงาน</div><input type="text" id="edit-team" value="${job.team || ''}"></div>
    <div class="fl"><div class="fl-lbl">สถานที่ติดตั้ง</div><input type="text" id="edit-loc" value="${job.location || ''}"></div>
    <div class="fl"><div class="fl-lbl">พิกัด GPS (lat,lng)</div><input type="text" id="edit-gps" value="${job.gps || ''}"></div>
    <div class="fl"><div class="fl-lbl">WBS</div><input type="text" id="edit-wbs" value="${job.wbs || ''}"></div>
    <button class="btn-primary" onclick="saveEditJob()">บันทึกการแก้ไขทั้งงาน</button>
  `;
  document.getElementById('modal-ov').classList.add('on');
}

async function saveEditJob() {
  const req = document.getElementById('edit-req').value.trim();
  const team = document.getElementById('edit-team').value.trim();
  const loc = document.getElementById('edit-loc').value.trim();
  const gps = document.getElementById('edit-gps').value.trim();
  const wbs = document.getElementById('edit-wbs').value.trim();
  const logIds = window.currentEditJobIds;

  if(!req) { showToast('กรุณาระบุชื่อผู้เบิก'); return; }

  updateHdrStatus('กำลังบันทึก...');
  const { error } = await _supabase.from('logs').update({
    req_name: req, team: team, location: loc, gps: gps, wbs: wbs
  }).in('id', logIds);

  if (error) { showToast('แก้ไขล้มเหลว'); updateHdr(); } 
  else {
    showToast('บันทึกการแก้ไขเรียบร้อย');
    closeModal(null);
    await initApp(); 
  }
}

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
  // อัปเดตโครงสร้าง CSV ให้มีครบทุกคอลัมน์
  const hdr = 'Serial No.,คำอธิบาย,ผู้เบิก,ทีมงาน,สถานที่,GPS,WBS,วันที่บันทึก\n';
  const rows = logs.map(l => {
    const trInfo = RAW.find(r => r.serial === l.serial) || {};
    const desc = (trInfo.description || '').replace(/"/g, '""'); // ป้องกัน Error ถ้าในคำอธิบายมีฟันหนู
    return [
      l.serial, 
      '"' + desc + '"', 
      l.req_name, 
      l.team || '', 
      l.location || '', 
      l.gps || '', 
      l.wbs || '', 
      l.created_at
    ].join(',');
  }).join('\n');
  
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