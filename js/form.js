// ==========================================
// Module: Issue Form
// ==========================================

function renderIssue() {
  const av = avail();
  const sSize = document.getElementById('s-size');
  
  // จำค่าขนาดเดิมที่เลือกไว้ก่อนหน้า
  const currentSize = sSize.value;
  
  // หยอดขนาดหม้อแปลงแบบไม่ซ้ำลง Dropdown
  const uniqueSizes = [...new Set(av.map(i => {
    const match = i.description.match(/(TR.*?KVA)/i);
    return match ? match[1].trim() : i.description.split(',')[0].trim();
  }))].filter(Boolean);

  sSize.innerHTML = '<option value="">-- เลือกขนาดหม้อแปลง --</option>' + 
    uniqueSizes.map(sz => `<option value="${sz}" ${sz === currentSize ? 'selected' : ''}>${sz}</option>`).join('');
    
  // อัปเดตรายการ Serial ให้สัมพันธ์กับขนาดที่ถูกจำไว้
  filterSerialBySize();
}

function filterSerialBySize() {
  const selectedSize = document.getElementById('s-size').value;
  const sel = document.getElementById('s-serial');
  
  // จำค่า Serial ที่อาจจะเลือกค้างไว้
  const currentSerial = sel.value;
  
  if(!selectedSize) {
     sel.innerHTML = '<option value="">-- เลือก TR/SN --</option>';
     return;
  }
  
  const avFiltered = avail().filter(i => {
     const match = i.description.match(/(TR.*?KVA)/i);
     const sz = match ? match[1].trim() : i.description.split(',')[0].trim();
     return sz === selectedSize;
  });
  
  sel.innerHTML = '<option value="">-- เลือก TR/SN --</option>' +
    avFiltered.map(i => `<option value="${i.serial}" ${i.serial === currentSerial ? 'selected' : ''}>${i.serial} / ${i.asset_no || '-'}</option>`).join('');
}

async function doIssue() {
  const serial = document.getElementById('s-serial').value;
  const req = document.getElementById('s-req').value.trim();
  
  if (!serial) { showToast('กรุณาเลือก TR/SN'); return; }
  if (!req) { showToast('กรุณาระบุชื่อผู้เบิก'); return; }
  
  const gps = document.getElementById('s-gps').value.trim();
  const loc = document.getElementById('s-loc').value.trim();
  const note = document.getElementById('s-note').value.trim();
  
  updateHdrStatus('กำลังบันทึกข้อมูล...');

  try {
    // บันทึกประวัติลงฐานข้อมูล Logs[cite: 1]
    const { error: logErr } = await _supabase.from('logs').insert([{
      serial: serial,
      req_name: req,
      location: loc,
      gps: gps,
      note: note
    }]);
    if (logErr) throw logErr;

    // อัปเดตสถานะหม้อแปลง[cite: 1]
    const { error: trErr } = await _supabase.from('transformers').update({ is_issued: true }).eq('serial', serial);
    if (trErr) throw trErr;

    // -----------------------------------------------------
    // เคลียร์เฉพาะช่อง TR/SN เพื่อให้เลือกชิ้นต่อไปได้ทันที
    // -----------------------------------------------------
    document.getElementById('s-serial').value = '';
    
    showToast('เบิก ' + serial + ' สำเร็จ! เลือกชิ้นต่อไปได้เลย');
    
    // โหลดข้อมูลใหม่ (เมื่อโหลดเสร็จ renderIssue จะทำงานและรักษาค่าฟอร์มอื่นๆ ไว้ให้)
    await initApp(); 
  } catch (error) {
    console.error(error);
    showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    updateHdr();
  }
}

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