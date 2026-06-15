// ==========================================
// Module: Dashboard (Dynamic SLoc & Warranty Calculation)
// ==========================================

function renderDash() {
  const totalRaw = RAW.length;
  const writtenOff = RAW.filter(r => r.is_written_off).length; 
  
  const tot = totalRaw - writtenOff; 
  const iss = RAW.filter(r => r.is_issued && !r.is_written_off).length; 
  const av = tot - iss; 
  
  document.getElementById('kpi').innerHTML = `
    <div class="kpi"><div class="kpi-lbl">สต็อกทั้งหมด</div><div class="kpi-val">${tot}</div><div class="kpi-sub">รายการ</div></div>
    <div class="kpi"><div class="kpi-lbl">คงเหลือ</div><div class="kpi-val" style="color:var(--color-success)">${av}</div><div class="kpi-sub">พร้อมเบิก</div></div>
    <div class="kpi" onclick="showPg('pending')" style="cursor:pointer; border:1px solid #fef08a; background:var(--color-bg-card); transition:transform 0.2s;"><div class="kpi-lbl">รอตัดจ่าย</div><div class="kpi-val" style="color:var(--color-warning)">${iss}</div><div class="kpi-sub" style="color:var(--color-warning); font-weight:500;">แตะเพื่อตัดจ่าย <i class="ti ti-arrow-right"></i></div></div>
    <div class="kpi"><div class="kpi-lbl">ตัดจ่ายแล้ว</div><div class="kpi-val" style="color:var(--color-danger)">${writtenOff}</div><div class="kpi-sub">รายการ</div></div>`;

  const availableItemsForTable = RAW.filter(i => !i.is_written_off);
  const slocs = [...new Set(availableItemsForTable.map(i => i.sloc).filter(Boolean))].sort();
  const mats = [...new Set(availableItemsForTable.map(i => i.mat))];
  
  let thead = `<thead><tr><th style="text-align:left">วัสดุ / คำอธิบาย</th>`;
  slocs.forEach(s => { thead += `<th>${s}</th>`; });
  thead += `<th>รวม</th></tr></thead>`;

  let tbody = '<tbody>';
  let colTot = {}; slocs.forEach(s => { colTot[s] = 0; }); let grandTot = 0;
  
  mats.forEach(m => {
    const mItems = availableItemsForTable.filter(i => i.mat === m);
    if(mItems.length === 0) return;
    const shortDesc = mItems[0].description.replace('TR. ', '').replace('TR.,', '').split(',').slice(0, 2).join(',');
    
    tbody += `<tr>`;
    tbody += `<td><div style="font-weight:500;font-size:12px;color:var(--color-text-primary)">${shortDesc.trim()}</div><div class="mat-code">${m}</div></td>`;
    
    let rowTot = 0;
    slocs.forEach(s => {
      const cnt = mItems.filter(i => i.sloc === s && !i.is_issued).length; 
      colTot[s] = (colTot[s] || 0) + cnt; 
      rowTot += cnt;
      
      tbody += `<td class="sloc-row-clickable" onclick="showSlocModal('${m}','${shortDesc}', '${s}')">${cnt > 0 ? `<span style="font-weight:600; color:var(--color-primary)">${cnt}</span>` : '<span style="color:var(--color-text-tertiary)">0</span>'}</td>`;
    });
    grandTot += rowTot;
    
    tbody += `<td class="sloc-row-clickable" onclick="showSlocModal('${m}','${shortDesc}', 'all')" style="font-weight:600; background:var(--color-bg-secondary)">${rowTot}</td></tr>`;
  });
  
  tbody += `<tr class="total-row"><td style="font-weight:500">รวมทั้งหมด</td>`;
  slocs.forEach(s => { tbody += `<td style="font-weight:500">${colTot[s] || 0}</td>`; });
  tbody += `<td style="font-weight:500">${grandTot}</td></tr></tbody>`;
  
  document.getElementById('sloc-tbl').innerHTML = thead + tbody;
}

function showSlocModal(mat, title, sloc) {
  const items = RAW.filter(i => i.mat === mat && !i.is_issued && !i.is_written_off && (sloc === 'all' || i.sloc === sloc));
  const slocLabel = sloc === 'all' ? 'ทุก SLoc' : `SLoc ${sloc}`;
  document.getElementById('modal-ttl').textContent = `${title.trim()} (${slocLabel} - ${items.length} รายการ)`;
  
  document.getElementById('modal-body').innerHTML = items.length ? items.map(i => {
    
    // ✨ ระบบคำนวณวันหมดประกัน 5 ปี
    let expText = '';
    if (i.import_date) {
       const parts = i.import_date.split('.');
       if (parts.length === 3) {
          const expYear = parseInt(parts[2], 10) + 5; // บวกเพิ่ม 5 ปีจากปีเดิม
          expText = `<span style="color:var(--color-danger); margin-left:6px; font-weight:600;"><i class="ti ti-shield-check" style="font-size:12px;"></i> หมดประกัน: ${parts[0]}.${parts[1]}.${expYear}</span>`;
       }
    }

    return `
    <div class="modal-item">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--color-text-primary)">
          ${i.serial} ${i.asset_no ? ' / ' + i.asset_no : ''}
        </div>
        <div style="font-size:11px;color:var(--color-text-secondary);margin-top:4px;">${i.mfr || 'ไม่ระบุผู้ผลิต'}</div>
        <div style="font-size:11px;color:var(--color-primary);margin-top:2px;font-weight:500;display:flex;align-items:center;flex-wrap:wrap;">
          <span><i class="ti ti-calendar"></i> มีผลจาก ${i.import_date || '-'}</span>
          ${expText}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="badge bg-ok">พร้อมเบิก</span>
      </div>
    </div>`;
  }).join('') : '<div style="text-align:center;padding:20px;font-size:12px;color:var(--color-text-tertiary)">ไม่มีรายการคงเหลือ</div>';
    
  document.getElementById('modal-ov').classList.add('on');
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('modal-ov'))
    document.getElementById('modal-ov').classList.remove('on');
}
