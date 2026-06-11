// ==========================================
// Module: GIS Transformer Map
// ==========================================

let leafletMap = null;
let markerLayer = null;

function renderMap() {
  // 1. ตรวจสอบหากยังไม่มีการสร้างแผนที่ ให้สร้างขึ้นมาครั้งแรก
  if (!leafletMap) {
    // ตั้งค่าเริ่มต้นไปที่พิกัดนครพนมเบื้องต้น ซูมระดับ 9
    leafletMap = L.map('map').setView([17.406, 104.781], 9);
    
    // ดึงเลเยอร์ภาพแผนที่ถนนฟรีจาก OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(leafletMap);
    
    // สร้างกลุ่มเลเยอร์สำหรับเก็บหมุดเพื่อง่ายต่อการล้างค่า
    markerLayer = L.layerGroup().addTo(leafletMap);
  } else {
    // หากแผนที่มีอยู่แล้ว ให้เคลียร์หมุดเก่าออกก่อนเพื่อเตรียมอัปเดตพิกัดล่าสุด
    markerLayer.clearLayers();
  }

  // 💡 แก้ Bug แผนที่โหลดไม่เต็มจอ: เนื่องจาก Leaflet จะเอ๋อเมื่อวาดแผนที่ใน div ที่ซ่อนอยู่ 
  // ต้องสั่งรีเฟรชขนาดกล่องหลังจากแท็บเปิดขึ้นมา 200ms
  setTimeout(() => { 
    leafletMap.invalidateSize(); 
  }, 200);

  const bounds = []; // ตัวแปรเก็บพิกัดทั้งหมดเพื่อเอาไว้ทำ Auto-Zoom

  // 2. ค้นหาประวัติที่มีพิกัด GPS เพื่อนำไปปักหมุด
  logs.forEach(l => {
    if (!l.gps) return;
    
    // แยกค่า lat และ lng ออกจากลูกน้ำ
    const parts = l.gps.split(',');
    if (parts.length !== 2) return;
    
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    
    // ตรวจสอบว่าพิกัดเป็นตัวเลขที่ถูกต้องชัวร์ๆ
    if (isNaN(lat) || isNaN(lng)) return;

    // ค้นหารายละเอียดหม้อแปลงตัวนี้
    const trInfo = RAW.find(r => r.serial === l.serial) || {};
    const match = (trInfo.description || '').match(/(TR.*?KVA)/i);
    const sizeLabel = match ? match[1] : (trInfo.description || '').split(',')[0].replace('TR. ', '');

    // สร้างเนื้อหาภายในกล่องข้อความ Popup เมื่อคนคลิกที่หมุด
    const popupHTML = `
      <div style="font-family: 'Sarabun', sans-serif; font-size: 12px; line-height: 1.6; min-width:180px;">
        <div style="font-weight: 700; color: var(--color-primary); font-size: 14px; margin-bottom: 6px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">⚡ ${l.serial}</div>
        <div><b>ขนาด:</b> ${sizeLabel}</div>
        <div><b>ผู้เบิก:</b> ${l.req_name}</div>
        <div><b>ทีมงาน:</b> ${l.team || '-'}</div>
        <div><b>สถานที่:</b> ${l.location || '-'}</div>
        <div><b>WBS:</b> ${l.wbs || '-'}</div>
        <div style="margin-top:4px;"><b>สถานะ:</b> ${l.write_off_no ? `<span style="color:var(--color-success);font-weight:600;">ตัดจ่ายแล้ว</span>` : `<span style="color:var(--color-warning);font-weight:600;">รอตัดจ่าย</span>`}</div>
        
        <div style="margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 8px; text-align:right;">
          <a href="https://maps.google.com/maps?q=$${l.gps.replace(/\s+/g,'')}" target="_blank" style="background: var(--color-primary); color: white; padding: 4px 10px; border-radius: 12px; text-decoration: none; font-weight: 500; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
            <i class="ti ti-map-pin" style="font-size:13px;"></i> นำทางภารกิจ
          </a>
        </div>
      </div>
    `;

    // ทำการปักหมุดลงแผนที่
    const marker = L.marker([lat, lng]).bindPopup(popupHTML);
    markerLayer.addLayer(marker);
    
    // เก็บพิกัดเข้าคลังเพื่อคำนวณ Auto-Zoom
    bounds.push([lat, lng]);
  });

  // 3. ระบบ Auto-Zoom (ฉลาดมาก): สั่งขยายวงแผนที่ให้พอดีครอบคลุมหม้อแปลงทุกเครื่องในหน้าจอทันที
  if (bounds.length > 0) {
    leafletMap.fitBounds(bounds, { padding: [50, 50] });
  }
}