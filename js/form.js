// ==========================================
// Module: Issue Form (Cart System)
// ==========================================

let issueCart = []; // ตัวแปรเก็บรายการ TR ที่รอเบิก

function renderIssue() {
  const av = avail();
  const sSize = document.getElementById('s-size');
  
  // สกัดขนาดหม้อแปลง
  const uniqueSizes = [...new Set(av.map(i => {
    const match = i.description.match(/(TR.*?KVA)/i);
    return match ? match[1].trim() : i.description.split(',')[0].trim();
  }))];

  const currentSize = sSize.value;
  sSize.innerHTML = '<option value="">-- ทุกขนาด --</option>' + 
    uniqueSizes.map(sz => `<option value="${sz}">${sz}</option>`).join('');
    
  if (uniqueSizes.includes(currentSize)) {
    sSize.value = currentSize;
  }
  
  filterSerialBySize(); // อัปเดตรายการ TR
  renderCartUI();       // วาดตะกร้าใหม่
}

function filterSerialBySize() {
  const selectedSize = document.getElementById('s-size').value;
  const sel = document.getElementById('s-serial');
  
  // ตัดของที่ "ถูกเลือกไปแล้วในตะกร้า" ออกจาก Dropdown
  let avFiltered = avail().filter(i => !issueCart.some(cartItem => cartItem.serial === i.serial));
  
  // กรองตามขนาด
  if (selectedSize) {
     avFiltered = avFiltered.filter(i => {
       const match = i.description.match(/(TR.*?KVA)/i);
       const sz = match ? match[1].trim() : i.description.split(',')[0].trim();
       return sz === selectedSize;
     });
  }
  
  sel.innerHTML = '<option value="">-- เลือก TR/SN --</option>' +
    avFiltered.map(i => `<option value="${i.serial}">${i.serial} / ${i.asset_no || '-'}</option>`).join('');
}

// 🛒 ฟังก์ชันเพิ่มเครื่องลงตะกร้า
function addToCart() {
  const sel = document.getElementById('s-serial');
  const serial = sel.value;
  
  if(!serial) { 
    showToast('กรุณาเลือก TR/SN ก่อนกดเพิ่ม'); 
    return; 
  }
  
  const itemInfo = avail().find(i => i.serial === serial);
  if(itemInfo) {
    issueCart.push(itemInfo);
    showToast(`เพิ่ม ${serial} ลงรายการแล้ว`);
    filterSerialBySize(); // ตัดออกจาก Dropdown
    renderCartUI();       // แสดงในตะกร้า
  }
}

// 🗑️ ฟังก์ชันลบเครื่องออกจากตะกร้า
function removeFromCart(serial) {
  issueCart = issueCart.filter(i => i.serial !== serial);
  filterSerialBySize(); // เอาของที่ลบกลับมาใส่ใน Dropdown ให้เลือกใหม่ได้
  renderCartUI();
}

// 🎨 วาด UI ของตะกร้า
function renderCartUI() {
  const container = document.getElementById('cart-container');
  const list = document.getElementById('cart-list');
  const count = document.getElementById('cart-count');
  
  if(issueCart.length === 0) {
    container.style.display = 'none';
  } else {
    container.style.display = 'block';
    count.textContent = issueCart.length;
    list.innerHTML = issueCart.map(i => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--color-bg-card); padding:8px 12px; border-radius:var(--radius-md); border:1px solid var(--color-border); font-size:12px; box-shadow:var(--shadow-sm);">
        <div>
          <div style="font-weight:600; color:var(--color-text-primary);">${i.serial} ${i.asset_no ? ' / ' + i.asset_no : ''}</div>
          <div style="color:var(--color-text-secondary); font-size:11px; margin-top:2px;">SLoc ${i.sloc} · ${i.description.split(',')[0].replace('TR. ','')}</div>
        </div>
        <i class="ti ti-trash" style="color:var(--color-danger); cursor:pointer; font-size:18px;" onclick="removeFromCart('${i.serial}')" aria-label="ลบ"></i>
      </div>
    `).join('');
  }
}

// 🚀 ยืนยันการเบิกจ่ายพร้อมกันหลายเครื่อง (Bulk Insert/Update)
async function doIssueCart() {
  if (issueCart.length === 0) { showToast('ยังไม่มีเครื่องในรายการ กรุณาเลือกแล้วกด "เพิ่ม" ก่อน'); return; }
  
  const req = document.getElementById('s-req').value.trim();
  if (!req) { showToast('กรุณาระบุชื่อผู้เบิก'); return; }
  
  const gps = document.getElementById('s-gps').value.trim();
  const loc = document.getElementById('s-loc').value.trim();
  const note = document.getElementById('s-note').value.trim();
  
  updateHdrStatus('กำลังบันทึกข้อมูลเข้าระบบ...');

  try {
    // 1. เตรียมข้อมูล Log เป็น Array ก้อนเดียว
    const logsPayload = issueCart.map(item => ({
      serial: item.serial,
      req_name: req,
      location: loc,
      gps: gps,
      note: note
    }));

    // ส่งเข้า Supabase ทีเดียว (Bulk Insert)
    const { error: logErr } = await _supabase.from('logs').insert(logsPayload);
    if (logErr) throw logErr;

    // 2. ดึงเฉพาะ Serial ออกมาเป็น Array เพื่อไป Update สถานะสต็อก
    const serialsToUpdate = issueCart.map(item => item.serial);
    
    // อัปเดต Supabase แบบใช้ .in() เปลี่ยนสถานะทีเดียวหลายๆ แถว
    const { error: trErr } = await _supabase.from('transformers').update({ is_issued: true }).in('serial', serialsToUpdate);
    if (trErr) throw trErr;

    // เคลียร์ตะกร้าและฟอร์มต่างๆ หลังเบิกเสร็จ
    issueCart = [];
    renderCartUI();
    ['s-size', 's-serial', 's-req', 's-loc', 's-note'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('s-gps').value = '';
    document.getElementById('gps-btn').className = 'btn-gps';
    document.getElementById('gps-btn').innerHTML = '<i class="ti ti-current-location" aria-hidden="true"></i>ดึง GPS';
    
    showToast(`✅ เบิกจ่ายสำเร็จ ${serialsToUpdate.length} รายการ!`);
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