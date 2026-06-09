// ==========================================
// Module: Dashboard
// ==========================================

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
      const cnt = mItems.filter(i => i.sloc === s && !i.is_issued).length; // จำนวนที่ยังไม่เบิก
      const all = mItems.filter(i => i.sloc === s).length; // จำนวนทั้งหมดที่มีในประวัติ
      
      // เปลี่ยนมาบวกยอดรวมจาก cnt (ยอดคงเหลือ) แทน all
      colTot[s] = (colTot[s] || 0) + cnt; 
      rowTot += cnt;
      
      tbody += `<td>${all > 0 ? `<span style="font-weight:500">${cnt}</span>` : '<span style="color:var(--color-text-tertiary)">-</span>'}</td>`;
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
        <div style="font-size:12px;font-weight:600;color:var(--color-text-primary)">
          ${i.serial} ${i.asset_no ? ' / ' + i.asset_no : ''}
        </div>
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