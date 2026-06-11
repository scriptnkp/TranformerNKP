// ==========================================
// Module: GIS Transformer Map (With Filters)
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

    // 1. ดึงข้อความค้นหาและขนาดที่ระบุมาจากกล่อง Input ตัวกรอง
    const searchInput = document.getElementById('map-search-input');
    const sizeInput = document.getElementById('map-size-input');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const selectedSize = sizeInput ? sizeInput.value : '';

    // สกัดขนาดหม้อแปลงทั้งหมดที่มีประวัติปักหมุดเพื่อนำไปเติมลง dropdown ตัวเลือก
    const logsWithGps = logs.filter(l => l.gps);
    const allSizes = [...new Set(logsWithGps.map(l => {
      const trInfo = RAW.find(r => r.serial === l.serial) || {};
      const match = (trInfo.description || '').match(/(TR.*?KVA)/i);
      return match ? match[1].trim() : ((trInfo.description || '').split(',')[0].trim() || 'ไม่ระบุขนาด');
    }))].filter(Boolean);

    if (sizeInput) {
      sizeInput.innerHTML = '<option value="">ทุกขนาด</option>' + allSizes.map(sz => `<option value="${sz}">${sz}</option>`).join('');
      if (allSizes.includes(selectedSize)) { sizeInput.value = selectedSize; }
    }

    const bounds = []; 

    // 2. คัดกรองข้อมูลประวัติเบิกตามเงื่อนไขค้นหาแบบสด ๆ 
    const filteredLogs = logsWithGps.filter(l => {
      const trInfo = RAW.find(r => r.serial === l.serial) || {};
      const matchSizeStr = (trInfo.description || '').match(/(TR.*?KVA)/i);
      const size = matchSizeStr ? matchSizeStr[1].trim() : ((trInfo.description || '').split(',')[0].trim() || 'ไม่ระบุขนาด');

      const matchSearch = l.serial.toLowerCase().includes(searchTerm) || 
                          (trInfo.asset_no || '').toLowerCase().includes(searchTerm) ||
                          l.req_name.toLowerCase().includes(searchTerm) || 
                          (l.location || '').toLowerCase().includes(searchTerm) ||
                          (l.team || '').toLowerCase().includes(searchTerm) ||
                          (l.wbs || '').toLowerCase().includes(searchTerm);
                          
      const matchSize = !selectedSize || size === selectedSize;

      return matchSearch && matchSize;
    });

    // 3. วาดหมุดเฉพาะรายการที่ผ่านการคัดกรองแล้ว
    filteredLogs.forEach(l => {
      const parts = l.gps.split(',');
      if (parts.length !== 2) return;
      
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());
      
      if (isNaN(lat) || isNaN(lng)) return;

      const trInfo = RAW.find(r => r.serial === l.serial) || {};
      const match = (trInfo.description || '').match(/(TR.*?KVA)/i);
      const sizeLabel = match ? match[1] : (trInfo.description || '').split(',')[0].replace('TR. ', '');
      const cleanGPS = l.gps.replace(/\s+/g, '');

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
            <a href="https://www.google.com/maps/search/?api=1&query=${cleanGPS}" target="_blank" style="background: var(--color-primary); color: white; padding: 4px 10px; border-radius: 12px; text-decoration: none; font-weight: 500; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
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

    // 4. สั่ง Auto-zoom รีโฟกัสเฉพาะหมุดที่ปรากฏอยู่บนหน้าจอ
    if (bounds.length > 0) {
      leafletMap.fitBounds(bounds, { padding: [30, 30] });
    }

  }, 300);
}