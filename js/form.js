// ==========================================
// Module: Issue Form (Cart & Image Upload System)
// ==========================================

// ⚠️ นำ URL ของ Web App ที่ได้จาก Google Apps Script มาใส่ตรงนี้ครับ
const GAS_URL = 'https://script.google.com/macros/s/AKfycbw3B1w5_1-AOqemLUxPf4Nxbh2lqgH_7t1-csK1jSTQJNHjboeWBmZTnXfU8JGXUadGFA/exec';

let issueCart = []; 

function renderIssue() {
  const av = avail();
  const sSize = document.getElementById('s-size');
  
  const uniqueSizes = [...new Set(av.map(i => {
    const match = i.description.match(/(TR.*?KVA)/i);
    return match ? match[1].trim() : i.description.split(',')[0].trim();
  }))];

  const currentSize = sSize.value;
  sSize.innerHTML = '<option value="">-- ทุกขนาด --</option>' + 
    uniqueSizes.map(sz => `<option value="${sz}">${sz}</option>`).join('');
    
  if (uniqueSizes.includes(currentSize)) { sSize.value = currentSize; }
  filterSerialBySize(); 
  renderCartUI();       
}

function filterSerialBySize() {
  const selectedSize = document.getElementById('s-size').value;
  const sel = document.getElementById('s-serial');
  
  let avFiltered = avail().filter(i => !issueCart.some(cartItem => cartItem.serial === i.serial));
  if (selectedSize) {
     avFiltered = avFiltered.filter(i => {
       const match = i.description.match(/(TR.*?KVA)/i);
       const sz = match ? match[1].trim() : i.description.split(',')[0].trim();
       return sz === selectedSize;
     });
  }
  sel.innerHTML = '<option value="">-- เลือก TR/SN --</option>' + avFiltered.map(i => `<option value="${i.serial}">${i.serial} / ${i.asset_no || '-'}</option>`).join('');
}

// 📦 ฟังก์ชันบีบอัดรูปภาพ (ให้อยู่ในระดับหลัก KB แทนที่จะเป็น 10MB)
async function compressImage(file) {
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
        const max_dim = 1200; // บีบอัดให้ความกว้าง/ยาวสูงสุดไม่เกิน 1200px (คมชัดพอและไฟล์เล็กมาก)
        if(width > max_dim || height > max_dim) {
          if(width > height) { height *= max_dim / width; width = max_dim; }
          else { width *= max_dim / height; height = max_dim; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // ถอด Header ออก เอาเฉพาะส่วน Base64
        const base64Str = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]; 
        resolve(base64Str);
      }
    }
  });
}

async function addToCart() {
  const sel = document.getElementById('s-serial');
  const serial = sel.value;
  
  if(!serial) { showToast('กรุณาเลือก TR/SN ก่อนกดเพิ่ม'); return; }
  
  updateHdrStatus('กำลังประมวลผลรูปภาพ...');
  const itemInfo = avail().find(i => i.serial === serial);
  
  if(itemInfo) {
    // ดึงไฟล์ที่อัปโหลดมาบีบอัด
    const issueFile = document.getElementById('f-issue-photo').files[0];
    const installFile = document.getElementById('f-install-photo').files[0];
    
    let issueB64 = null, installB64 = null;
    if(issueFile) issueB64 = await compressImage(issueFile);
    if(installFile) installB64 = await compressImage(installFile);

    // นำรูปเก็บลงตะกร้าพร้อมกับข้อมูลหม้อแปลง
    issueCart.push({ ...itemInfo, issuePhotoBase64: issueB64, installPhotoBase64: installB64 });
    
    // เคลียร์ช่องให้พร้อมอัปโหลดเครื่องถัดไป
    document.getElementById('f-issue-photo').value = '';
    document.getElementById('f-install-photo').value = '';
    
    updateHdrStatus('');
    showToast(`เพิ่ม ${serial} ลงรายการแล้ว`);
    filterSerialBySize(); 
    renderCartUI();       
  }
}

function removeFromCart(serial) {
  issueCart = issueCart.filter(i => i.serial !== serial);
  filterSerialBySize(); 
  renderCartUI();
}

function renderCartUI() {
  const container = document.getElementById('cart-container');
  const list = document.getElementById('cart-list');
  const count = document.getElementById('cart-count');
  
  if(issueCart.length === 0) {
    container.style.display = 'none';
  } else {
    container.style.display = 'block';
    count.textContent = issueCart.length;
    list.innerHTML = issueCart.map(i => {
      const match = (i.description || '').match(/(TR.*?KVA)/i);
      const sizeLabel = match ? match[1] : (i.description || '').split(',').slice(0, 2).join(',');
      
      const hasImg1 = i.issuePhotoBase64 ? '<i class="ti ti-photo" style="color:var(--color-success)"></i>' : '';
      const hasImg2 = i.installPhotoBase64 ? '<i class="ti ti-tool" style="color:var(--color-success)"></i>' : '';

      return `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--color-bg-card); padding:10px 12px; border-radius:var(--radius-md); border:1px solid var(--color-border); font-size:12px; box-shadow:var(--shadow-sm);">
        <div>
          <div style="font-weight:600; color:var(--color-text-primary);">${i.serial} ${i.asset_no ? ' / ' + i.asset_no : ''}</div>
          <div style="color:var(--color-text-secondary); font-size:11px; margin-top:4px;">
            <span style="color:var(--color-primary); font-weight:500;">มีผลจาก ${i.import_date || '-'}</span> · ${sizeLabel}
            ${hasImg1 || hasImg2 ? `<div style="margin-top:4px;">รูป: ${hasImg1} ${hasImg2}</div>` : ''}
          </div>
        </div>
        <i class="ti ti-trash" style="color:var(--color-danger); cursor:pointer; font-size:18px;" onclick="removeFromCart('${i.serial}')" aria-label="ลบ"></i>
      </div>`
    }).join('');
  }
}

async function doIssueCart() {
  if (issueCart.length === 0) { showToast('ยังไม่มีเครื่องในรายการ'); return; }
  const req = document.getElementById('s-req').value.trim();
  const team = document.getElementById('s-team').value.trim();
  const loc = document.getElementById('s-loc').value.trim();
  const gps = document.getElementById('s-gps').value.trim();
  const wbs = document.getElementById('s-wbs').value.trim();
  if (!req) { showToast('กรุณาระบุชื่อผู้เบิก'); return; }
  
  updateHdrStatus('กำลังอัปโหลดรูปภาพและบันทึกข้อมูล (อาจใช้เวลาสักครู่)...');

  try {
    const logsPayload = [];
    
    // 1. Loop อัปโหลดรูปทีละเครื่อง
    for (let item of issueCart) {
      let issueUrl = null;
      let installUrl = null;

      if (item.issuePhotoBase64 || item.installPhotoBase64) {
        const match = (item.description || '').match(/(TR.*?KVA)/i);
        const sizeFolderName = match ? match[1].trim().replace(/[\/\\?%*:|"<>]/g, '-') : 'ไม่ระบุขนาด';
        
        const d = new Date();
        const dStr = String(d.getDate()).padStart(2,'0') + String(d.getMonth()+1).padStart(2,'0') + (d.getFullYear());

        const response = await fetch(GAS_URL, {
          method: 'POST',
          body: JSON.stringify({
            size: sizeFolderName, // ให้ GAS สร้างโฟลเดอร์ตามขนาดนี้
            issueFileName: item.issuePhotoBase64 ? `01_${item.serial}_${dStr}.jpg` : null, // ชื่อไฟล์ 01_TR..._วดป
            issuePhotoBase64: item.issuePhotoBase64,
            installFileName: item.installPhotoBase64 ? `02_${item.serial}_${dStr}.jpg` : null,
            installPhotoBase64: item.installPhotoBase64
          })
        });

        const gDriveData = await response.json();
        if (gDriveData.status === 'success') {
          gDriveData.data.forEach(d => {
            if(d.type === 'issue') issueUrl = d.url;
            if(d.type === 'install') installUrl = d.url;
          });
        }
      }

      // เตรียมข้อมูลยิงเข้า Supabase (รวมลิงก์รูปด้วย)
      logsPayload.push({
        serial: item.serial,
        req_name: req,
        team: team,
        location: loc,
        gps: gps,
        wbs: wbs,
        issue_photo_url: issueUrl,
        install_photo_url: installUrl
      });
    }

    // 2. บันทึกข้อมูลเข้า Supabase
    const { error: logErr } = await _supabase.from('logs').insert(logsPayload);
    if (logErr) throw logErr;

    const serialsToUpdate = issueCart.map(item => item.serial);
    const { error: trErr } = await _supabase.from('transformers').update({ is_issued: true }).in('serial', serialsToUpdate);
    if (trErr) throw trErr;

    // เคลียร์ฟอร์ม
    issueCart = [];
    renderCartUI();
    ['s-size', 's-serial', 's-req', 's-team', 's-loc', 's-wbs', 'f-issue-photo', 'f-install-photo'].forEach(id => { 
       if(document.getElementById(id)) document.getElementById(id).value = ''; 
    });
    document.getElementById('s-gps').value = '';
    document.getElementById('gps-btn').className = 'btn-gps';
    document.getElementById('gps-btn').innerHTML = '<i class="ti ti-current-location" aria-hidden="true"></i>ดึง GPS';
    
    showToast(`✅ อัปโหลดและเบิกจ่ายสำเร็จ ${serialsToUpdate.length} รายการ!`);
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