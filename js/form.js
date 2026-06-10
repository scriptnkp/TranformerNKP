// ==========================================
// Module: Issue Form
// ==========================================

function renderIssue() {
  const av = avail();
  const sSize = document.getElementById('s-size');
  
  const uniqueSizes = [...new Set(av.map(i => {
    const match = i.description.match(/(TR.*?KVA)/i);
    return match ? match[1].trim() : i.description.split(',')[0].trim();
  }))];

  // ถ้าผู้ใช้เคยเลือกขนาดไว้ จะได้ไม่รีเซ็ตค่ากลับไปมา
  const currentSize = sSize.value;
  
  sSize.innerHTML = '<option value="">-- เลือกขนาดหม้อแปลง --</option>' + 
    uniqueSizes.map(sz => `<option value="${sz}">${sz}</option>`).join('');
    
  if (uniqueSizes.includes(currentSize)) {
    sSize.value = currentSize;
  } else {
    document.getElementById('s-serial').innerHTML = '<option value="">-- เลือก TR/SN --</option>';
  }
}

function filterSerialBySize() {
  const selectedSize = document.getElementById('s-size').value;
  const sel = document.getElementById('s-serial');
  
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
    avFiltered.map(i => `<option value="${i.serial}">${i.serial} / ${i.asset_no || '-'}</option>`).join('');
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
    const { error: logErr } = await _supabase.from('logs').insert([{
      serial: serial,
      req_name: req,
      location: loc,
      gps: gps,
      note: note
    }]);
    if (logErr) throw logErr;

    const { error: trErr } = await _supabase.from('transformers').update({ is_issued: true }).eq('serial', serial);
    if (trErr) throw trErr;

    // เคลียร์เฉพาะช่อง TR/SN (คงข้อมูล ชื่อ, สถานที่, GPS ไว้ให้เบิกเครื่องต่อไปได้เลย)
    document.getElementById('s-serial').value = '';
    
    showToast('เบิกจ่าย ' + serial + ' สำเร็จ (เลือกเครื่องต่อไปได้เลย)');
    
    // โหลดข้อมูลล่าสุดเพื่อลบเครื่องที่เพิ่งเบิกออกจากระบบ
    await initApp(); 
    
    // อัปเดตรายการใน Dropdown ใหม่
    filterSerialBySize();

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