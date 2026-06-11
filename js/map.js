// ==========================================
// Module: GIS Transformer Map (Fix Nav Link)
// ==========================================

let leafletMap = null;
let markerLayer = null;

function renderMap() {
  // หน่วงเวลา 300ms เพื่อให้ Safari บน iOS วาดหน้าต่างแท็บให้เสร็จก่อน ป้องกันแผนที่ขาว
  setTimeout(() => {
    
    if (!leafletMap) {
      leafletMap = L.map('map').setView([17.406, 104.781], 9);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(leafletMap);
      
      markerLayer = L.layerGroup().addTo(leafletMap);
    } else {
      markerLayer.clearLayers();
    }

    const bounds = []; 

    logs.forEach(l => {
      if (!l.gps) return;
      
      const parts = l.gps.split(',');
      if (parts.length !== 2) return;
      
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      
      if (isNaN(lat) || isNaN(lng)) return;

      const trInfo = RAW.find(r => r.serial === l.serial) || {};
      const match = (trInfo.description || '').match(/(TR.*?KVA)/i);
      const sizeLabel = match ? match[1] : (trInfo.description || '').split(',')[0].replace('TR. ', '');

      // ลบช่องว่างทั้งหมดใน GPS ออกเพื่อส่งให้ Google Maps แบบไม่มีปัญหาสตริงรวน
      const cleanGPS = l.gps.replace(/\s+/g, '');

      // ดักแก้ไข: เปลี่ยนรูปแบบการใส่ตัวแปรให้เป็น ${cleanGPS} แบบมาตรฐาน ลบเลข 13 และ $ ที่ทำลิงก์พังออก
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
            <a href="http://googleusercontent.com/maps.google.com/?q=${cleanGPS}" target="_blank" style="background: var(--color-primary); color: white; padding: 4px 10px; border-radius: 12px; text-decoration: none; font-weight: 500; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
              <i class="ti ti-map-pin" style="font-size:13px;"></i> นำทางภารกิจ
            </a>
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng]).bindPopup(popupHTML);
      markerLayer.addLayer(marker);
      
      bounds.push([lat, lng]);
    });

    leafletMap.invalidateSize();

    if (bounds.length > 0) {
      leafletMap.fitBounds(bounds, { padding: [30, 30] });
    }

  }, 300);
}