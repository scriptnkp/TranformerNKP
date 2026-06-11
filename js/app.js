// ==========================================
// Module: Core Application & Supabase Init
// ==========================================

const supabaseUrl = 'https://foplvudtvujxyxsibuck.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvcGx2dWR0dnVqeHl4c2lidWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODgzMzYsImV4cCI6MjA5NjU2NDMzNn0.h-BNhShuEarCUA0ozpYm6g9rUKET6ddJSYrCLmCQavc';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let RAW = [];
let logs = [];
let currentPg = 'dash';

let currentLogPage = 1;
let currentPendPage = 1; 
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
  const writtenOff = RAW.filter(r => r.is_written_off).length;
  const tot = RAW.length - writtenOff; 
  const iss = RAW.filter(r => r.is_issued && !r.is_written_off).length; 
  const av = tot - iss; 

  document.getElementById('hdr-sub').textContent = `${tot} รายการ · คงเหลือ ${av} · รอตัดจ่าย ${iss} · ตัดจ่ายแล้ว ${writtenOff}`;
}

function avail() { return RAW.filter(x => !x.is_issued && !x.is_written_off); }

function showPg(p) {
  document.querySelectorAll('.pg').forEach(x => x.classList.remove('on'));
  document.querySelectorAll('.nav-tab').forEach(x => x.classList.remove('on'));
  
  document.getElementById('pg-' + p).classList.add('on');
  const nm = ['dash', 'issue', 'pending', 'log'];
  const idx = nm.indexOf(p);
  if (idx >= 0) document.querySelectorAll('.nav-tab')[idx].classList.add('on');
  
  currentPg = p;
  const fn = { dash: renderDash, issue: renderIssue, pending: renderPending, log: renderLog, settings: () => {} };
  if (fn[p]) fn[p]();
  updateHdr();
}

function renderPending() {
  const searchInput = document.getElementById('pend-search-input');
  const sizeInput = document.getElementById('pend-size-input');

  const searchTerm = searchInput.value.toLowerCase();
  const selectedSize = sizeInput.value;

  const pendingLogsAll = logs.filter(l => !l.write_off_no);

  const allSizes = [...new Set(pendingLogsAll.map(l => {
    const trInfo = RAW.find(r => r.serial === l.serial) || {};
    const match = (trInfo.description || '').match(/(TR.*?KVA)/i);
    return match ? match[1].trim() : ((trInfo.description || '').split(',')[0].trim() || 'ไม่ระบุขนาด');
  }))].filter(Boolean);

  sizeInput.innerHTML = '<option value="">ทุกขนาด</option>' + allSizes.map(sz => `<option value="${sz}">${sz}</option>`).join('');
  if (allSizes.includes(selectedSize)) { sizeInput.value = selectedSize; }

  const filteredLogs = pendingLogsAll.filter(l => {
    const trInfo = RAW.find(r => r.serial === l.serial) || {};
    const matchSizeStr = (trInfo.description || '').match(/(TR.*?KVA)/i);
    const size = matchSizeStr ? matchSizeStr[1].trim() : ((trInfo.description || '').split(',')[0].trim() || 'ไม่ระบุขนาด');

    const matchSearch = l.serial.toLowerCase().includes(searchTerm) || 
                        (trInfo.asset_no || '').toLowerCase().includes(searchTerm) ||
                        l.req_name.toLowerCase().includes(searchTerm) || 
                        (l.location || '').toLowerCase().includes(searchTerm) ||
                        (l.team || '').toLowerCase().includes(searchTerm) ||
                        (l.wbs || '').toLowerCase().includes(searchTerm);
                        
    const matchSize = !sizeInput.value || size === sizeInput.value;

    return (!searchTerm || matchSearch) && matchSize;
  });

  const jobMap = {};
  filteredLogs.forEach(l => {
     const date = new Date(l.created_at);
     const timeKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
     const groupKey = `${timeKey}_${l.req_name}_${l.location}`;

     if(!jobMap[groupKey]) {
        jobMap[groupKey] = {
           id: groupKey, logIds: [], created_at: l.created_at,
           formattedTime: date.toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' }),
           req_name: l.req_name, team: l.team, location: l.location, gps: l.gps, wbs: l.wbs, write_off_no: l.write_off_no, items: []
        };
     }
     jobMap[groupKey].logIds.push(l.id);

     const trInfo = RAW.find(r => r.serial === l.serial) || {};
     jobMap[groupKey].items.push({
        serial: l.serial, asset_no: trInfo.asset_no, desc: trInfo.description, import_date: trInfo.import_date,
        issue_photo_url: l.issue_photo_url, install_photo_url: l.install_photo_url
     });
  });

  const jobGroups = Object.values(jobMap).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  window.currentJobGroups = jobGroups; 

  const totalPages = Math.ceil(jobGroups.length / logsPerPage) || 1;
  if (currentPendPage > totalPages) currentPendPage = totalPages;

  const startIndex = (currentPendPage - 1) * logsPerPage;
  const paginatedJobs = jobGroups.slice(startIndex, startIndex + logsPerPage);

  document.getElementById('pend-count').textContent = `รอตัดจ่ายทั้งหมด ${jobGroups.length} งาน (${filteredLogs.length} เครื่อง)`;
  
  document.getElementById('pend-list').innerHTML = paginatedJobs.length ? paginatedJobs.map((job) => {
    // 🚀 แก้ไขลิงก์ GPS ให้ถูกต้องที่นี่
    const cleanGPS = (job.gps || '').replace(/\s+/g, '');
    const gpsLink = job.gps ? `<a href="https://maps.google.com/maps?q=${cleanGPS}" target="_blank" style="color:var(--color-primary); text-decoration:none; font-weight:500;"><i class="ti ti-map-pin" style="font-size:12px" aria-hidden="true"></i> ${job.gps} <span style="font-size:10px; background:var(--color-bg-secondary); padding:2px 6px; border-radius:10px; border:1px solid var(--color-border);">นำทาง</span></a>` : '';

    return `
    <div class="log-item" style="padding: 16px; border-radius: var(--radius-lg); margin-bottom: 16px; grid-column: 1 / -1; border-left: 4px solid var(--color-warning);">
      <div class="log-top" style="border-bottom: 1px dashed var(--color-border); padding-bottom: 12px; margin-bottom: 12px; align-items:flex-start;">
        <div style="display:flex; flex-direction:column; gap:4px;">
          <span class="log-time" style="align-self:flex-start; margin:0;">${job.formattedTime}</span>
          <span style="font-weight:700; color:var(--color-text-primary); font-size:15px; margin-top:4px;"><i class="ti ti-user" style="color:var(--color-primary);"></i> ${job.req_name}</span>
        </div>
        
        <div style="display:flex; gap:10px; align-items:center;">
           <button style="background:var(--color-warning-light); color:var(--color-warning); border:1px solid #fef08a; padding:5px 12px; border-radius:16px; font-size:11px; font-weight:600; cursor:pointer;" onclick="writeOffJobModal('${job.id}')">
             <i class="ti ti-file-export"></i> บันทึกตัดจ่าย
           </button>
           <i class="ti ti-edit" style="font-size:22px; color:var(--color-text-tertiary); cursor:pointer;" onclick="editJobModal('${job.id}')" title="แก้ไขข้อมูลงานนี้" aria-hidden="true"></i>
        </div>
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

            const issueUrls = (i.issue_photo_url || '').split(',').filter(Boolean);
            const installUrls = (i.install_photo_url || '').split(',').filter(Boolean);

            let img1Html = issueUrls.map((url, idx) => `<a href="${url}" target="_blank" style="font-size:10px; color:var(--color-primary); background:var(--color-primary-light); padding:3px 8px; border-radius:12px; text-decoration:none; display:inline-flex; align-items:center; gap:4px; border:1px solid #bfdbfe;"><i class="ti ti-photo" style="font-size:12px;"></i> เบิก ${idx+1}</a>`).join(' ');
            let img2Html = installUrls.map((url, idx) => `<a href="${url}" target="_blank" style="font-size:10px; color:var(--color-success); background:var(--color-bg-success); padding:3px 8px; border-radius:12px; text-decoration:none; display:inline-flex; align-items:center; gap:4px; border:1px solid #bbf7d0;"><i class="ti ti-camera" style="font-size:12px;"></i> ติดตั้ง ${idx+1}</a>`).join(' ');

            return `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; font-size:12px; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin-bottom:4px;">
              <div>
                <span style="font-weight:600; color:var(--color-text-primary);">${i.serial}</span> ${i.asset_no ? ' <span style="color:var(--color-text-tertiary);">/ '+i.asset_no+'</span>' : ''} <br> 
                <span style="color:var(--color-text-secondary); font-size:11px; display:inline-block; margin-top:2px;">${sizeLabel}</span>
                ${(img1Html || img2Html) ? `<div style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap;">${img1Html} ${img2Html}</div>` : ''}
              </div>
              <span class="badge bg-sloc" style="font-size:10px; background:var(--color-bg-card); white-space:nowrap;">มีผลจาก ${i.import_date || '-'}</span>
            </div>
            `
          }).join('')}
        </div>
      </div>
    </div>`;
  }).join('') : `<div style="text-align:center;padding:32px;color:var(--color-text-tertiary);font-size:13px;grid-column:1/-1;">🎉 ยอดเยี่ยม! ไม่มีงานรอตัดจ่ายเลย</div>`;

  document.getElementById('pend-page-info').textContent = `หน้า ${currentPendPage} / ${totalPages}`;
  document.getElementById('btn-prev-pend').disabled = currentPendPage === 1;
  document.getElementById('btn-next-pend').disabled = currentPendPage === totalPages;
  document.getElementById('btn-prev-pend').style.opacity = currentPendPage === 1 ? '0.5' : '1';
  document.getElementById('btn-next-pend').style.opacity = currentPendPage === totalPages ? '0.5' : '1';
}

function changePendPage(dir) {
  currentPendPage += dir;
  renderPending();
}

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

    const matchSearch = l.serial.toLowerCase().includes(searchTerm) || 
                        (trInfo.asset_no || '').toLowerCase().includes(searchTerm) ||
                        l.req_name.toLowerCase().includes(searchTerm) || 
                        (l.location || '').toLowerCase().includes(searchTerm) ||
                        (l.team || '').toLowerCase().includes(searchTerm) ||
                        (l.wbs || '').toLowerCase().includes(searchTerm) ||
                        (l.write_off_no || '').toLowerCase().includes(searchTerm);
                        
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
           id: groupKey, logIds: [], created_at: l.created_at,
           formattedTime: date.toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' }),
           req_name: l.req_name, team: l.team, location: l.location, gps: l.gps, wbs: l.wbs, write_off_no: l.write_off_no, items: []
        };
     }
     jobMap[groupKey].logIds.push(l.id);

     const trInfo = RAW.find(r => r.serial === l.serial) || {};
     jobMap[groupKey].items.push({
        serial: l.serial, asset_no: trInfo.asset_no, desc: trInfo.description, import_date: trInfo.import_date,
        issue_photo_url: l.issue_photo_url, install_photo_url: l.install_photo_url
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
    // 🚀 แก้ไขลิงก์ GPS ให้ถูกต้องที่นี่
    const cleanGPS = (job.gps || '').replace(/\s+/g, '');
    const gpsLink = job.gps ? `<a href="https://maps.google.com/maps?q=${cleanGPS}" target="_blank" style="color:var(--color-primary); text-decoration:none; font-weight:500;"><i class="ti ti-map-pin" style="font-size:12px" aria-hidden="true"></i> ${job.gps} <span style="font-size:10px; background:var(--color-bg-secondary); padding:2px 6px; border-radius:10px; border:1px solid var(--color-border);">นำทาง</span></a>` : '';

    return `
    <div class="log-item" style="padding: 16px; border-radius: var(--radius-lg); margin-bottom: 16px; grid-column: 1 / -1;">
      <div class="log-top" style="border-bottom: 1px dashed var(--color-border); padding-bottom: 12px; margin-bottom: 12px; align-items:flex-start;">
        <div style="display:flex; flex-direction:column; gap:4px;">
          <span class="log-time" style="align-self:flex-start; margin:0;">${job.formattedTime}</span>
          <span style="font-weight:700; color:var(--color-text-primary); font-size:15px; margin-top:4px;"><i class="ti ti-user" style="color:var(--color-primary);"></i> ${job.req_name}</span>
        </div>
        
        <div style="display:flex; gap:10px; align-items:center;">
           <button style="background:${job.write_off_no ? 'var(--color-bg-success)' : 'var(--color-warning-light)'}; color:${job.write_off_no ? 'var(--color-success)' : 'var(--color-warning)'}; border:1px solid ${job.write_off_no ? '#bbf7d0' : '#fef08a'}; padding:5px 12px; border-radius:16px; font-size:11px; font-weight:600; cursor:pointer;" onclick="writeOffJobModal('${job.id}')">
             <i class="ti ${job.write_off_no ? 'ti-check' : 'ti-file-export'}"></i> ${job.write_off_no ? 'ตัดจ่ายแล้ว' : 'ตัดจ่าย'}
           </button>
           <i class="ti ti-edit" style="font-size:22px; color:var(--color-text-tertiary); cursor:pointer;" onclick="editJobModal('${job.id}')" title="แก้ไขข้อมูลงานนี้" aria-hidden="true"></i>
        </div>
      </div>
      
      ${job.team ? `<div class="log-row" style="margin-bottom:6px;"><i class="ti ti-users"></i> <span style="color:var(--color-text-primary); font-weight:500;">ทีมงาน:</span> ${job.team}</div>` : ''}
      ${job.location ? `<div class="log-row" style="margin-bottom:6px;"><i class="ti ti-map"></i> <span style="color:var(--color-text-primary); font-weight:500;">สถานที่:</span> ${job.location}</div>` : ''}
      ${job.gps ? `<div class="log-row" style="margin-bottom:6px;">${gpsLink}</div>` : ''}
      ${job.wbs ? `<div class="log-row" style="margin-bottom:6px;"><i class="ti ti-briefcase"></i> <span style="color:var(--color-text-primary); font-weight:500;">WBS:</span> ${job.wbs}</div>` : ''}
      ${job.write_off_no ? `<div class="log-row" style="margin-bottom:6px;"><i class="ti ti-file-export" style="color:var(--color-danger)"></i> <span style="color:var(--color-text-primary); font-weight:500;">เลขตัดจ่าย:</span> <span style="color:var(--color-danger); font-weight:600;">${job.write_off_no}</span></div>` : ''}
      
      <div style="margin-top:14px; background:var(--color-bg-secondary); border-radius:var(--radius-md); padding:12px; border:1px solid var(--color-border);">
        <div style="font-size:12px; font-weight:700; color:var(--color-primary); margin-bottom:8px;">📦 รายการหม้อแปลง (${job.items.length} เครื่อง):</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${job.items.map(i => {
            const match = (i.desc || '').match(/(TR.*?KVA)/i);
            const sizeLabel = match ? match[1] : (i.desc || '').split(',').slice(0, 2).join(',');

            const issueUrls = (i.issue_photo_url || '').split(',').filter(Boolean);
            const installUrls = (i.install_photo_url || '').split(',').filter(Boolean);

            let img1Html = issueUrls.map((url, idx) => `<a href="${url}" target="_blank" style="font-size:10px; color:var(--color-primary); background:var(--color-primary-light); padding:3px 8px; border-radius:12px; text-decoration:none; display:inline-flex; align-items:center; gap:4px; border:1px solid #bfdbfe;"><i class="ti ti-photo" style="font-size:12px;"></i> เบิก ${idx+1}</a>`).join(' ');
            let img2Html = installUrls.map((url, idx) => `<a href="${url}" target="_blank" style="font-size:10px; color:var(--color-success); background:var(--color-bg-success); padding:3px 8px; border-radius:12px; text-decoration:none; display:inline-flex; align-items:center; gap:4px; border:1px solid #bbf7d0;"><i class="ti ti-camera" style="font-size:12px;"></i> ติดตั้ง ${idx+1}</a>`).join(' ');

            return `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; font-size:12px; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin-bottom:4px;">
              <div>
                <span style="font-weight:600; color:var(--color-text-primary);">${i.serial}</span> ${i.asset_no ? ' <span style="color:var(--color-text-tertiary);">/ '+i.asset_no+'</span>' : ''} <br> 
                <span style="color:var(--color-text-secondary); font-size:11px; display:inline-block; margin-top:2px;">${sizeLabel}</span>
                ${(img1Html || img2Html) ? `<div style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap;">${img1Html} ${img2Html}</div>` : ''}
              </div>
              <span class="badge bg-sloc" style="font-size:10px; background:var(--color-bg-card); white-space:nowrap;">มีผลจาก ${i.import_date || '-'}</span>
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

function getEditGPS() {
  const btn = document.getElementById('edit-gps-btn');
  const inp = document.getElementById('edit-gps');
  if (!navigator.geolocation) { showToast('เบราว์เซอร์ไม่รองรับ GPS'); return; }
  
  btn.innerHTML = '<i class="ti ti-loader ti-spin" aria-hidden="true"></i>กำลังดึง...';
  navigator.geolocation.getCurrentPosition(p => {
    const lat = p.coords.latitude.toFixed(6);
    const lng = p.coords.longitude.toFixed(6);
    inp.value = `${lat}, ${lng}`;
    btn.className = 'btn-gps got';
    btn.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i>ได้แล้ว';
    showToast('ดึง GPS สำเร็จ');
  }, () => {
    btn.innerHTML = '<i class="ti ti-current-location" aria-hidden="true"></i> ดึง GPS';
    showToast('ไม่สามารถดึง GPS ได้');
  }, { timeout: 10000 });
}

async function compressImageForEdit(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max_dim = 1200; 
        if(width > max_dim || height > max_dim) {
          if(width > height) { height *= max_dim / width; width = max_dim; }
          else { width *= max_dim / height; height = max_dim; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const base64Str = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]; 
        resolve(base64Str);
      }
    }
  });
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
    
    <div class="fl">
      <div class="fl-lbl">พิกัด GPS (lat,lng)</div>
      <div class="gps-row">
        <input type="text" id="edit-gps" value="${job.gps || ''}">
        <button class="btn-gps" id="edit-gps-btn" onclick="getEditGPS()"><i class="ti ti-current-location" aria-hidden="true"></i> ดึง GPS</button>
      </div>
    </div>
    
    <div class="fl"><div class="fl-lbl">WBS</div><input type="text" id="edit-wbs" value="${job.wbs || ''}"></div>
    
    <div class="fl">
      <div class="fl-lbl">แนบรูปถ่ายหลังติดตั้ง (อัปโหลดเพิ่มเติม)</div>
      <input type="file" id="edit-install-photo" accept="image/*" multiple style="font-size:12px; padding:8px; width:100%; border:1px solid var(--color-border); border-radius:var(--radius-md); background:var(--color-bg-secondary);" />
    </div>

    <button class="btn-primary" id="btn-save-edit" onclick="saveEditJob()">บันทึกการแก้ไขทั้งงาน</button>
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
  
  const photoInput = document.getElementById('edit-install-photo');
  const files = photoInput ? photoInput.files : [];

  if(!req) { showToast('กรุณาระบุชื่อผู้เบิก'); return; }

  const saveBtn = document.getElementById('btn-save-edit');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="ti ti-loader ti-spin" aria-hidden="true"></i> กำลังบันทึก...';
  updateHdrStatus('กำลังบันทึกข้อมูล...');

  try {
    let newInstallUrls = [];

    if (files.length > 0) {
        const gasUrl = 'https://script.google.com/macros/s/AKfycbw3B1w5_1-AOqemLUxPf4Nxbh2lqgH_7t1-csK1jSTQJNHjboeWBmZTnXfU8JGXUadGFA/exec';
        const job = window.currentJobGroups.find(g => g.logIds.includes(logIds[0]));
        const firstItem = job.items[0];
        const match = (firstItem.desc || '').match(/(TR.*?KVA)/i);
        const sizeFolderName = match ? match[1].trim().replace(/[\/\\?%*:|"<>]/g, '-') : 'ไม่ระบุขนาด';
        const d = new Date();
        const dStr = String(d.getDate()).padStart(2,'0') + String(d.getMonth()+1).padStart(2,'0') + (d.getFullYear());

        for (let i = 0; i < files.length; i++) {
            updateHdrStatus(`กำลังอัปโหลดรูปภาพติดตั้งเพิ่มเติม (${i+1}/${files.length})...`);
            let b64 = await compressImageForEdit(files[i]);
            const response = await fetch(gasUrl, {
                method: 'POST',
                body: JSON.stringify({
                    size: sizeFolderName,
                    installFileName: `02_${firstItem.serial}_${dStr}_edit_${i+1}.jpg`,
                    installPhotoBase64: b64
                })
            });
            const resData = await response.json();
            if (resData.status === 'success') {
                resData.data.forEach(d => { if(d.type === 'install') newInstallUrls.push(d.url); });
            }
        }
    }

    let updatePayload = {
        req_name: req, team: team, location: loc, gps: gps, wbs: wbs
    };

    if (newInstallUrls.length > 0) {
        const job = window.currentJobGroups.find(g => g.logIds.includes(logIds[0]));
        const existingUrls = job.items[0].install_photo_url ? job.items[0].install_photo_url.split(',').filter(Boolean) : [];
        const finalUrls = [...existingUrls, ...newInstallUrls].join(',');
        updatePayload.install_photo_url = finalUrls;
    }

    updateHdrStatus('กำลังอัปเดตฐานข้อมูล...');
    const { error } = await _supabase.from('logs').update(updatePayload).in('id', logIds);

    if (error) { 
      showToast('แก้ไขล้มเหลว'); 
      updateHdr(); 
    } else {
      showToast('บันทึกการแก้ไขเรียบร้อย');
      closeModal(null);
      await initApp(); 
    }
  } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการบันทึกรูปภาพ');
      updateHdr();
  } finally {
      if(saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = 'บันทึกการแก้ไขทั้งงาน';
      }
  }
}

function writeOffJobModal(jobId) {
  const job = window.currentJobGroups.find(g => g.id === jobId);
  if(!job) return;

  window.currentEditJobIds = job.logIds;
  window.currentEditSerials = job.items.map(i => i.serial); 

  document.getElementById('modal-ttl').textContent = `บันทึกเลขตัดจ่าย (${job.items.length} เครื่อง)`;
  document.getElementById('modal-body').innerHTML = `
    <div class="fl">
      <div class="fl-lbl" style="color:var(--color-danger); font-weight:600;"><i class="ti ti-file-export"></i> เลขตัดจ่าย SAP</div>
      <input type="text" id="edit-writeoff" value="${job.write_off_no || ''}" placeholder="ระบุเลขตัดจ่าย (เว้นว่างเพื่อยกเลิกตัดจ่าย)..." style="border-color:var(--color-danger); font-weight:600;">
      <div style="font-size:11px; color:var(--color-text-tertiary); margin-top:6px;">* เมื่อบันทึกเลขแล้ว หม้อแปลงชุดนี้จะถูกหักออกจาก "สต็อกทั้งหมด" ในหน้าแดชบอร์ดทันที</div>
    </div>
    <button class="btn-primary" id="btn-save-writeoff" onclick="saveWriteOffJob()" style="background:var(--color-danger); border-color:var(--color-danger); margin-top:8px;">บันทึกการตัดจ่าย</button>
  `;
  document.getElementById('modal-ov').classList.add('on');
}

async function saveWriteOffJob() {
  const writeOffNo = document.getElementById('edit-writeoff').value.trim();
  const logIds = window.currentEditJobIds;
  const serials = window.currentEditSerials;

  const saveBtn = document.getElementById('btn-save-writeoff');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="ti ti-loader ti-spin" aria-hidden="true"></i> กำลังบันทึก...';
  updateHdrStatus('กำลังบันทึก...');

  const isWrittenOff = writeOffNo !== ''; 

  try {
    const { error: logErr } = await _supabase.from('logs').update({
      write_off_no: writeOffNo
    }).in('id', logIds);
    if (logErr) throw logErr;

    const { error: trErr } = await _supabase.from('transformers').update({
      is_written_off: isWrittenOff
    }).in('serial', serials);
    if (trErr) throw trErr;

    showToast('บันทึกเลขตัดจ่ายเรียบร้อย');
    closeModal(null);
    await initApp();
  } catch (err) {
    console.error(err);
    showToast('บันทึกตัดจ่ายล้มเหลว');
    updateHdr();
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'บันทึกการตัดจ่าย';
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
  const hdr = 'Serial No.,คำอธิบาย,ผู้เบิก,ทีมงาน,สถานที่,GPS,WBS,เลขตัดจ่าย,วันที่บันทึก,ลิงก์รูปเบิก,ลิงก์รูปติดตั้ง\n';
  const rows = logs.map(l => {
    const trInfo = RAW.find(r => r.serial === l.serial) || {};
    const desc = (trInfo.description || '').replace(/"/g, '""'); 
    return [
      l.serial, 
      '"' + desc + '"', 
      l.req_name, 
      l.team || '', 
      l.location || '', 
      l.gps || '', 
      l.wbs || '',
      l.write_off_no || '', 
      l.created_at,
      l.issue_photo_url || '',
      l.install_photo_url || ''
    ].join(',');
  }).join('\n');
  
  const blob = new Blob(['\ufeff' + hdr + rows], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'issue_log.csv'; a.click();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), 2500);
}

initApp();