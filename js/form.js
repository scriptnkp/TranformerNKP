// ==========================================
// Module: Issue Form (Cart & Image Upload System)
// ==========================================

const GAS_URL = 'https://script.google.com/macros/s/AKfycbw3B1w5_1-AOqemLUxPf4Nxbh2lqgH_7t1-csK1jSTQJNHjboeWBmZTnXfU8JGXUadGFA/exec';

const TELEGRAM_BOT_TOKEN = '8500752472:AAEcOqBZDYze4NMctxi1CBAWY7MblrqvUDU';
const TELEGRAM_CHAT_ID = '-5006086656';

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

async function addToCart() {
  const sel = document.getElementById('s-serial');
  const serial = sel.value;
  
  if(!serial) { showToast('กรุณาเลือก TR/SN ก่อนกดเพิ่ม'); return; }
  
  const itemInfo = avail().find(i => i.serial === serial);
  
  if(itemInfo) {
    issueCart.push(itemInfo);
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
      
      return `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--color-bg-card); padding:10px 12px; border-radius:var(--radius-md); border:1px solid var(--color-border); font-size:12px; box-shadow:var(--shadow-sm);">
        <div>
          <div style="font-weight:600; color:var(--color-text-primary);">${i.serial} ${i.asset_no ? ' / ' + i.asset_no : ''}</div>
          <div style="color:var(--color-text-secondary); font-size:11px; margin-top:4px;">
            <span style="color:var(--color-primary); font-weight:500;">มีผลจาก ${i.import_date || '-'}</span> · ${sizeLabel}
          </div>
        </div>
        <i class="ti ti-trash" style="color:var(--color-danger); cursor:pointer; font-size:18px;" onclick="removeFromCart('${i.serial}')" aria-label="ลบ"></i>
      </div>`
    }).join('');
  }
}

// 🚀 แก้ไขลิงก์ GPS สำหรับ Telegram ให้ถูกต้องที่นี่
async function sendTelegramAlert(req, team, loc, gps, wbs, cart) {
  let msg = `🚨 <b>แจ้งเตือนเบิกหม้อแปลงใหม่</b>\n\n`;
  msg += `👤 <b>ผู้เบิก:</b> ${req}\n`;
  msg += `👥 <b>ทีมงาน:</b> ${team || '-'}\n`;
  msg += `📍 <b>สถานที่:</b> ${loc || '-'}\n`;
  msg += `🗺️ <b>GPS:</b> ${gps ? `<a href="https://maps.google.com/maps?q=${gps.replace(/\s/g,'')}">${gps}</a>` : '-'}\n`;
  msg += `💼 <b>WBS:</b> ${wbs || '-'}\n\n`;
  msg += `📦 <b>รายการเบิก (${cart.length} เครื่อง):</b>\n`;
  
  cart.forEach(i => {
      const match = (i.description || '').match(/(TR.*?KVA)/i);
      const sizeLabel = match ? match[1] : (i.description || '').split(',').slice(0, 2).join(',');
      msg += `⚡ ${i.serial} (${sizeLabel})\n`;
  });

  try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'HTML', disable_web_page_preview: true })
      });
  } catch(e) {
      console.error('Telegram error:', e);
  }
}

async function doIssueCart() {
  if (issueCart.length === 0) { showToast('ยังไม่มีเครื่องในรายการ กรุณาเลือกแล้วกด "เพิ่ม" ก่อน'); return; }
  
  const req = document.getElementById('s-req').value.trim();
  const team = document.getElementById('s-team').value.trim();
  const loc = document.getElementById('s-loc').value.trim();
  const gps = document.getElementById('s-gps').value.trim();
  const wbs = document.getElementById('s-wbs').value.trim();
  if (!req) { showToast('กรุณาระบุชื่อผู้เบิก'); return; }
  
  const submitBtn = document.querySelector('#pg-issue .btn-primary');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="ti ti-loader ti-spin" aria-hidden="true"></i> กำลังอัปโหลดรูปภาพทีละไฟล์...';
  
  try {
    const issueFiles = document.getElementById('f-issue-photo').files;
    const installFiles = document.getElementById('f-install-photo').files;
    
    let issueUrls = [];
    let installUrls = [];

    const firstItem = issueCart[0];
    const match = (firstItem.description || '').match(/(TR.*?KVA)/i);
    const sizeFolderName = match ? match[1].trim().replace(/[\/\\?%*:|"<>]/g, '-') : 'ไม่ระบุขนาด';
    const d = new Date();
    const dStr = String(d.getDate()).padStart(2,'0') + String(d.getMonth()+1).padStart(2,'0') + (d.getFullYear());

    for (let i = 0; i < issueFiles.length; i++) {
      updateHdrStatus(`กำลังอัปโหลดรูปเบิก (${i+1}/${issueFiles.length})...`);
      let b64 = await compressImage(issueFiles[i]);
      const response = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({
          size: sizeFolderName,
          issueFileName: `01_${firstItem.serial}_${dStr}_${i+1}.jpg`,
          issuePhotoBase64: b64
        })
      });
      const resData = await response.json();
      if (resData.status === 'success') {
        resData.data.forEach(d => { if(d.type === 'issue') issueUrls.push(d.url); });
      }
    }

    for (let i = 0; i < installFiles.length; i++) {
      updateHdrStatus(`กำลังอัปโหลดรูปติดตั้ง (${i+1}/${installFiles.length})...`);
      let b64 = await compressImage(installFiles[i]);
      const response = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({
          size: sizeFolderName,
          installFileName: `02_${firstItem.serial}_${dStr}_${i+1}.jpg`,
          installPhotoBase64: b64
        })
      });
      const resData = await response.json();
      if (resData.status === 'success') {
        resData.data.forEach(d => { if(d.type === 'install') installUrls.push(d.url); });
      }
    }

    updateHdrStatus('กำลังบันทึกข้อมูลเข้าระบบฐานข้อมูล...');

    const finalIssueUrlStr = issueUrls.join(',');
    const finalInstallUrlStr = installUrls.join(',');

    const logsPayload = issueCart.map(item => ({
      serial: item.serial,
      req_name: req,
      team: team,
      location: loc,
      gps: gps,
      wbs: wbs,
      issue_photo_url: finalIssueUrlStr,     
      install_photo_url: finalInstallUrlStr  
    }));

    const { error: logErr } = await _supabase.from('logs').insert(logsPayload);
    if (logErr) throw logErr;

    const serialsToUpdate = issueCart.map(item => item.serial);
    const { error: trErr } = await _supabase.from('transformers').update({ is_issued: true }).in('serial', serialsToUpdate);
    if (trErr) throw trErr;

    await sendTelegramAlert(req, team, loc, gps, wbs, issueCart);

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
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> ยืนยันเบิกจ่ายทั้งหมด';
  }
}

function getGPS() {
  const btn = document.getElementById('gps-btn');
  const inp = document.getElementById('s-gps');
  if (!navigator.geolocation) { showToast('เบราว์เซอร์ไม่รองรับ GPS'); return; }
  btn.innerHTML = '<i class="ti ti-loader ti-spin" aria-hidden="true"></i>กำลังดึง...';
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