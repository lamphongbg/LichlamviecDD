import { DepartmentSchedule, Staff, ScheduleCode, DaySchedule } from '../types';
import { getMarch2026Days } from '../initialData';
import * as XLSX from 'xlsx';

// Generates and downloads a beautiful, fully-styled HTML-based Excel spreadsheet
// that opens natively in MS Excel with perfect spacing, merged cells, and colors.
export function exportToExcel(
  departmentSchedules: DepartmentSchedule[],
  staffList: Record<string, Staff[]>,
  selectedMonth: string
) {
  // Get dynamic head of nursing name from localStorage
  let headOfNursingName = 'Nguyễn Thanh Hương';
  try {
    const cachedNames = localStorage.getItem('song_thuong_account_names_v3');
    if (cachedNames) {
      const parsed = JSON.parse(cachedNames);
      if (parsed.phongdieuduong) {
        headOfNursingName = parsed.phongdieuduong;
      }
    }
  } catch (e) {
    console.error(e);
  }

  const monthParts = selectedMonth.split('-');
  const monthLabel = monthParts[1] || '03';
  const yearLabel = monthParts[0] || '2026';
  
  const yearNum = parseInt(yearLabel, 10);
  const monthNum = parseInt(monthLabel, 10);
  const length = new Date(yearNum, monthNum, 0).getDate();
  
  const days: { dateStr: string; dayIndex: number; isSunday: boolean }[] = [];
  for (let i = 1; i <= length; i++) {
    const dateStr = i < 10 ? `0${i}` : `${i}`;
    const dateObj = new Date(yearNum, monthNum - 1, i);
    const dayIndex = dateObj.getDay();
    days.push({
      dateStr,
      dayIndex,
      isSunday: dayIndex === 0,
    });
  }

  const totalCols = 8 + days.length;
  const colPart1 = Math.floor(totalCols / 3);
  const colPart3 = Math.floor(totalCols / 3);
  const colPart2 = totalCols - colPart1 - colPart3;
  
  // Custom helper to compute summaries
  const calculateSummary = (schedule: DaySchedule) => {
    let workdays = 0;
    let leaves = 0;
    
    Object.entries(schedule).forEach(([key, code]) => {
      if (key.length === 2) {
        if (code === 'X') workdays += 1.0;
        else if (code === 'X/2' || code === 'S' || code === 'C') workdays += 0.5;
        else if (code === 'P') leaves += 1.0; // counts towards Cộng Phép
      }
    });
    
    return { workdays, leaves };
  };

  // Build the XML content with CSS styles in the <head> segment
  let xmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-type" content="text/html;charset=utf-8" />
      <style>
        table {
          border-collapse: collapse;
          font-family: "Segoe UI", Arial, sans-serif;
          font-size: 11pt;
          width: 100%;
        }
        td, th {
          border: 0.5pt solid #000000;
          padding: 4px;
          text-align: center;
          vertical-align: middle;
        }
        .header-hospital {
          font-weight: bold;
          font-size: 11pt;
          text-align: left;
          border: none;
        }
        .header-title {
          font-size: 16pt;
          font-weight: bold;
          text-align: center;
          color: #0d1b2a;
          border: none;
        }
        .header-subtitle {
          font-size: 12pt;
          font-style: italic;
          text-align: center;
          border: none;
          padding-bottom: 10px;
        }
        .header-dept {
          font-size: 11pt;
          font-weight: bold;
          text-align: left;
          border: none;
        }
        .th-main {
          background-color: #f2f2f2;
          font-weight: bold;
          font-size: 10pt;
        }
        .sunday-col {
          background-color: #DCE5F1; /* Soft blue Sunday */
        }
        .sunday-text {
          color: #FF0000; /* Sunday text highlighted red */
          font-weight: bold;
        }
        .dept-row {
          background-color: #e6f2ff;
          font-weight: bold;
          text-align: left;
          padding-left: 20px;
        }
        .chief-nurse {
          color: #cc0066; /* Magenta-pink for chief nurse */
          font-weight: bold;
        }
        .symbol-x {
          font-weight: bold;
          color: #1b4332;
        }
        .symbol-p {
          background-color: #ffe5ec;
          color: #d90429;
          font-weight: bold;
        }
        .symbol-kl {
          color: #6c757d;
          background-color: #f1f3f5;
        }
        .symbol-ts {
          color: #8338ec;
          background-color: #f3e8ff;
          font-weight: bold;
        }
        .symbol-off {
          color: #d90429;
          font-weight: bold;
        }
        .meta-text {
          text-align: right;
          font-weight: bold;
          background-color: #f8f9fa;
        }
        .sign-table {
          margin-top: 30px;
          border: none;
        }
        .sign-cell {
          border: none;
          font-size: 11pt;
          font-weight: bold;
          text-align: center;
          width: 33%;
        }
        .sign-sub {
          border: none;
          font-size: 9pt;
          font-style: italic;
          text-align: center;
          font-weight: normal;
        }
      </style>
    </head>
    <body>
      <table>
        <!-- Header Section -->
        <tr>
          <td colspan="5" class="header-hospital">BỆNH VIỆN ĐA KHOA SÔNG THƯƠNG BẮC GIANG</td>
          <td colspan="${days.length}" style="border:none;"></td>
          <td colspan="3" style="border:none;"></td>
        </tr>
        <tr>
          <td colspan="${8 + days.length}" class="header-title">BẢNG THEO DÕI NHÂN LỰC ĐD, KTY, HS</td>
        </tr>
        <tr>
          <td colspan="${8 + days.length}" class="header-subtitle">Tháng ${monthLabel} năm ${yearLabel}</td>
        </tr>
        <tr>
          <td colspan="5" class="header-dept">BỘ PHẬN: Phòng Điều dưỡng</td>
          <td colspan="${days.length}" style="border:none;"></td>
          <td colspan="3" style="border:none;"></td>
        </tr>
        
        <!-- Main Table Headers -->
        <tr>
          <th rowspan="2" class="th-main" style="width: 30px;">STT</th>
          <th rowspan="2" class="th-main" style="width: 100px;">Khoa / phòng</th>
          <th rowspan="2" class="th-main" style="width: 150px;">Họ và Tên</th>
          <th rowspan="2" class="th-main" style="width: 50px;">Giới tính</th>
          <th rowspan="2" class="th-main" style="width: 80px;">Chuyên ngành</th>
          <th colspan="${days.length}" class="th-main">Ngày trong tháng</th>
          <th rowspan="2" class="th-main" style="width: 60px;">Tổng ngày công</th>
          <th rowspan="2" class="th-main" style="width: 60px;">Cộng phép</th>
          <th rowspan="2" class="th-main" style="width: 120px;">Tùy chọn</th>
        </tr>
        <tr>
          <!-- Column Dates and Days -->
          ${days.map(d => `
            <th class="th-main ${d.isSunday ? 'sunday-col' : ''}">
              <div style="font-size: 9px; font-weight: bold;">${d.dateStr}</div>
              <div style="font-size: 8px; font-weight: normal; ${d.isSunday ? 'color: red;' : ''}">${d.dayIndex === 0 ? 'CN' : 'T' + (d.dayIndex + 1)}</div>
            </th>
          `).join('')}
        </tr>

        <!-- Table Body, looping through departments -->
        ${departmentSchedules.filter(s => s.month === selectedMonth).map((deptSche, index) => {
          const staffs = staffList[deptSche.department] || [];
          
          return staffs.map((staff, staffIdx) => {
            const staffSche = deptSche.schedules.find(s => s.staffId === staff.id);
            const { workdays, leaves } = staffSche ? calculateSummary(staffSche.schedule) : { workdays: 0, leaves: 0 };
            
            return `
              <tr>
                <td>${index * 10 + staffIdx + 1}</td>
                <td style="text-align: left; font-weight: ${staffIdx === 0 ? 'bold' : 'normal'};">
                  ${staffIdx === 0 ? deptSche.department : ''}
                </td>
                <td class="${staff.isChief ? 'chief-nurse' : ''}" style="text-align: left;">
                  ${staff.name}
                </td>
                <td>${staff.gender}</td>
                <td>${staff.major}</td>
                
                <!-- Day details -->
                ${days.map(d => {
                  const code = staffSche?.schedule[d.dateStr] || '';
                  let cellStyle = d.isSunday ? 'class="sunday-col"' : '';
                  let fontStyle = '';
                  
                  if (code === 'X') fontStyle = 'class="symbol-x"';
                  else if (code === '0' || code === 'O') fontStyle = d.isSunday ? 'class="sunday-text"' : 'style="color:#d90429; font-weight:bold;"';
                  else if (code === 'P') fontStyle = 'class="symbol-p"';
                  else if (code === 'KL') fontStyle = 'class="symbol-kl"';
                  else if (code === 'TS') fontStyle = 'class="symbol-ts"';
                  
                  return `<td ${cellStyle} ${fontStyle}>${code}</td>`;
                }).join('')}
                
                <td style="font-weight: bold; background-color: #fdfdfd;">${workdays}</td>
                <td style="font-weight: bold; background-color: #fdfdfd;">${leaves}</td>
                <td style="text-align: left; font-size: 9pt;">${staff.isChief ? 'Điều dưỡng trưởng' : ''}</td>
              </tr>
            `;
          }).join('');
        }).join('')}
        
        <!-- Space Row -->
        <tr style="height: 20px; border:none;">
          <td colspan="${totalCols}" style="border:none;"></td>
        </tr>
        
        <!-- Signature Fields -->
        <tr>
          <td colspan="${colPart1}" class="sign-cell">Người lập bảng</td>
          <td colspan="${colPart2}" class="sign-cell">Trưởng phòng Điều dưỡng</td>
          <td colspan="${colPart3}" class="sign-cell">Giám đốc Bệnh viện</td>
        </tr>
        <tr>
          <td colspan="${colPart1}" class="sign-sub">(Ký và ghi rõ họ tên)</td>
          <td colspan="${colPart2}" class="sign-sub">(Ký và ghi rõ họ tên)</td>
          <td colspan="${colPart3}" class="sign-sub">(Ký, đóng dấu)</td>
        </tr>
        <tr style="height: 50px; border:none;">
          <td colspan="${totalCols}" style="border:none;"></td>
        </tr>
        <tr>
          <td colspan="${colPart1}" style="text-align: center; border: none; font-weight: bold; font-family: 'Times New Roman', Times, serif;">Phòng Điều dưỡng</td>
          <td colspan="${colPart2}" style="text-align: center; border: none; font-weight: bold; font-family: 'Times New Roman', Times, serif;">${headOfNursingName}</td>
          <td colspan="${colPart3}" style="text-align: center; border: none; font-weight: bold; font-family: 'Times New Roman', Times, serif;">Ban Giám Đốc</td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Create downloadable file link
  const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `Bang_Theo_Doi_Nhan_Luc_DD_Thang_${monthLabel}_${yearLabel}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Generates and downloads a beautiful, fully-styled HTML-based Weekly Excel spreadsheet
// that exactly matches the layout, fonts, colors, stats box and signatures from the hospital image.
export function exportWeeklyToExcel(
  departmentSchedules: DepartmentSchedule[],
  staffList: Record<string, Staff[]>,
  selectedMonth: string,
  selectedWeek: number,
  filteredDays: any[]
) {
  // Get dynamic head of nursing name from localStorage
  let headOfNursingName = 'Nguyễn Thanh Hương';
  try {
    const cachedNames = localStorage.getItem('song_thuong_account_names_v3');
    if (cachedNames) {
      const parsed = JSON.parse(cachedNames);
      if (parsed.phongdieuduong) {
        headOfNursingName = parsed.phongdieuduong;
      }
    }
  } catch (e) {
    console.error(e);
  }

  // 1. Title dates calculations
  const getDayMonthYear = (day: any) => {
    if (day.targetMonth && day.targetDayKey) {
      const [y, m] = day.targetMonth.split('-').map(Number);
      const d = parseInt(day.targetDayKey, 10);
      return { d, m, y };
    }
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = parseInt(day.dateStr, 10);
    return { d, m, y };
  };

  const start = getDayMonthYear(filteredDays[0]);
  const end = getDayMonthYear(filteredDays[filteredDays.length - 1]);
  const subtitleLabel = `Tuần ${selectedWeek} (Từ ngày ${start.d}/${start.m} đến ngày ${end.d}/${end.m} năm ${end.y})`;

  // 2. Gather and classify staff for statistics box
  const allStaff: Staff[] = [];
  const seenStaffIds = new Set<string>();
  Object.values(staffList).forEach(list => {
    if (Array.isArray(list)) {
      list.forEach(staff => {
        if (staff && staff.id && !seenStaffIds.has(staff.id)) {
          seenStaffIds.add(staff.id);
          allStaff.push(staff);
        }
      });
    }
  });

  const totalStaffs = allStaff.length;

  let totalNurses = 0;
  let nurseUni = 0;
  let nurseCol = 0;
  let nurseTC = 0;

  let totalTechs = 0;
  let techCKI = 0;
  let techUni = 0;
  let techCol = 0;
  let techTC = 0;

  let totalOthers = 0;
  let ysdkCount = 0;
  let ysyhctCount = 0;
  let ysrteCount = 0;
  let cdDuocCount = 0;
  let cdNHSCount = 0;
  let holyCount = 0;
  let khacCount = 0;

  allStaff.forEach(s => {
    const m = (s.major || '').trim().toUpperCase();
    
    // 1. Check if the staff is a Nurse (Điều dưỡng)
    const isNurse = m.includes('ĐĐ') || m.includes('ĐD') || m.includes('DD') || m.includes('DĐ') || m.includes('ĐIỀU DƯỠNG') || m.includes('DIEU DUONG');
    
    // 2. Check if the staff is a Technician (Kỹ thuật viên)
    const isTech = m.includes('KTV') || m.includes('KỸ THUẬT') || m.includes('KY THUAT') || m.includes('XN') || m.includes('HA') || m.includes('CHẨN ĐOÁN') || m.includes('CHAN DOAN') || m.includes('PHCN') || m.includes('PHỤC HỒI') || m.includes('PHUC HOI');

    if (isNurse) {
      totalNurses++;
      const isUni = m.includes('CN') || m.includes('ĐH') || m.includes('ĐẠI HỌC') || m.includes('DAI HOC') || m.includes('CỬ NHÂN') || m.includes('CU NHAN');
      const isCol = m.includes('CĐ') || m.includes('CAO ĐẲNG') || m.includes('CAO DANG');

      if (isUni) {
        nurseUni++;
      } else if (isCol) {
        nurseCol++;
      } else {
        nurseTC++;
      }
    } else if (isTech) {
      totalTechs++;
      const isCKI = m.includes('CKI') || m.includes('CK1') || m.includes('CHUYÊN KHOA I') || m.includes('CHUYEN KHOA I');
      const isTechUni = m.includes('CN') || m.includes('ĐH') || m.includes('ĐẠI HỌC') || m.includes('DAI HOC') || m.includes('CỬ NHÂN') || m.includes('CU NHAN');
      const isTechCol = m.includes('CĐ') || m.includes('CAO ĐẲNG') || m.includes('CAO DANG');

      if (isCKI) {
        techCKI++;
      } else if (isTechUni) {
        techUni++;
      } else if (isTechCol) {
        techCol++;
      } else {
        techTC++;
      }
    } else {
      totalOthers++;
      const isYsdk = m.includes('YSĐK') || m.includes('YS ĐK') || m.includes('ĐA KHOA') || m.includes('DA KHOA') || m.includes('Y SỸ ĐA KHOA') || m.includes('Y SY DA KHOA') || (m.startsWith('YS') && !m.includes('YHCT'));
      const isYsyhct = m.includes('YHCT') || m.includes('CỔ TRUYỀN') || m.includes('CO TRUYEN');
      const isYsrte = m.includes('RĂNG') || m.includes('RANG') || m.includes('TE');
      const isCdDuoc = m.includes('DƯỢC') || m.includes('DUOC');
      const isCdNhs = m.includes('HỘ SINH') || m.includes('HO SINH') || m.includes('NHS') || m === 'TSCT' || m.includes('NỮ HỘ SINH') || m.includes('NU HO SINH');
      const isHoly = m.includes('HỘ LÝ') || m.includes('HO LY') || m.includes('HL');

      if (isYsdk) {
        ysdkCount++;
      } else if (isYsyhct) {
        ysyhctCount++;
      } else if (isYsrte) {
        ysrteCount++;
      } else if (isCdDuoc) {
        cdDuocCount++;
      } else if (isCdNhs) {
        cdNHSCount++;
      } else if (isHoly) {
        holyCount++;
      } else {
        khacCount++;
      }
    }
  });

  // 3. Build HTML/XML spreadsheet
  let xmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-type" content="text/html;charset=utf-8" />
      <style>
        table {
          border-collapse: collapse;
          font-family: "Times New Roman", Times, serif;
          font-size: 11pt;
          width: 100%;
        }
        td, th {
          border: 0.5pt solid #000000;
          padding: 4px;
          text-align: center;
          vertical-align: middle;
        }
        .text-left {
          text-align: left;
        }
        .text-right {
          text-align: right;
        }
        .header-hospital {
          font-weight: bold;
          font-size: 11pt;
          text-align: left;
          border: none;
          font-family: "Times New Roman", Times, serif;
        }
        .header-title {
          font-size: 15pt;
          font-weight: bold;
          text-align: center;
          color: #000000;
          border: none;
          font-family: "Times New Roman", Times, serif;
        }
        .header-subtitle {
          font-size: 11pt;
          font-style: italic;
          text-align: center;
          border: none;
          padding-bottom: 12px;
          font-family: "Times New Roman", Times, serif;
        }
        .th-main {
          background-color: #ffffff;
          font-weight: bold;
          font-size: 10pt;
          color: #000000;
          border: 0.5pt solid #000000;
          font-family: "Times New Roman", Times, serif;
        }
        .th-day {
          font-size: 9pt;
          font-weight: bold;
          background-color: #ffffff;
          border: 0.5pt solid #000000;
          width: 45px;
        }
        .dept-col {
          color: #ef4444;
          font-weight: bold;
          text-align: center;
          vertical-align: middle;
          border: 0.5pt solid #000000;
        }
        .chief-nurse {
          color: #cc0066;
          font-weight: bold;
          text-decoration: underline;
          text-align: left;
        }
        .major-cndd {
          color: #ef4444;
          font-weight: bold;
        }
        .cell-yellow-bg {
          background-color: #fff2cc;
        }
        .cell-x {
          font-weight: normal;
        }
        .total-text {
          font-weight: bold;
          color: #15803d;
          font-size: 11pt;
        }
      </style>
    </head>
    <body>
      <table>
        <!-- Header Section -->
        <tr>
          <td colspan="5" class="header-hospital">BỆNH VIỆN ĐA KHOA SÔNG THƯƠNG</td>
          <td colspan="${filteredDays.length}" style="border:none;"></td>
        </tr>
        <tr>
          <td colspan="5" class="header-hospital">PHÒNG ĐIỀU DƯỠNG</td>
          <td colspan="${filteredDays.length}" style="border:none;"></td>
        </tr>
        <tr style="height: 15px; border:none;">
          <td colspan="${5 + filteredDays.length}" style="border:none;"></td>
        </tr>
        <tr>
          <td colspan="${5 + filteredDays.length}" class="header-title">LỊCH LÀM VIỆC TUẦN CỦA ĐIỀU DƯỠNG CÁC KHOA/ PHÒNG TRONG BỆNH VIỆN</td>
        </tr>
        <tr>
          <td colspan="${5 + filteredDays.length}" class="header-subtitle">${subtitleLabel}</td>
        </tr>

        <!-- Statistics Block (Hộp thống kê chuyên môn) -->
        <tr>
          <td colspan="${5 + filteredDays.length}" style="text-align: left; padding: 6px; border: 0.5pt solid #000000; font-size: 9.5pt; line-height: 1.4; background-color: #ffffff;">
            <div style="color: #c026d3; font-weight: bold; font-family: 'Times New Roman', Times, serif;">
              <span>Điều dưỡng: <span style="color:#d90429;">${totalNurses} người</span></span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <span>ĐĐ: Đại học: ${nurseUni}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <span>Cao đẳng: ${nurseCol}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <span>Trung cấp: ${nurseTC}</span>
            </div>
            <div style="color: #c026d3; font-weight: bold; font-family: 'Times New Roman', Times, serif; margin-top: 2px;">
              <span>Kỹ thuật viên: <span style="color:#d90429;">${totalTechs} người</span></span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <span>KTV: CK1: ${techCKI}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <span>Đại học: ${techUni}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <span>Cao đẳng: ${techCol}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <span>Trung cấp: ${techTC}</span>
            </div>
            <div style="color: #c026d3; font-weight: bold; font-family: 'Times New Roman', Times, serif; margin-top: 2px;">
              <span>Y sỹ + khác: <span style="color:#d90429;">${totalOthers} người</span></span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <span>YS: Y sỹ đa khoa: ${ysdkCount}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <span>Y sỹ YHCT: ${ysyhctCount}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <span>Y sỹ Răng TE: ${ysrteCount} &nbsp;&nbsp; CĐ Dược: ${cdDuocCount} - CĐ Nữ hộ sinh: ${cdNHSCount} - Hộ lý: ${holyCount} - Khác: ${khacCount}</span>
            </div>
          </td>
        </tr>

        <!-- Total staffs green row -->
        <tr>
          <td colspan="${5 + filteredDays.length}" style="text-align: left; border: none; font-weight: bold; color: #15803d; font-size: 11pt; padding-top: 6px; padding-bottom: 6px;">
            Tổng: ${totalStaffs} người
          </td>
        </tr>

        <!-- Main Table Headers -->
        <tr>
          <th rowspan="2" class="th-main" style="width: 35px;">TT</th>
          <th rowspan="2" class="th-main" style="width: 120px;">Khoa/Phòng/Bộ phận</th>
          <th rowspan="2" class="th-main" style="width: 160px;">Họ và tên</th>
          <th rowspan="2" class="th-main" style="width: 45px;">Giới</th>
          <th rowspan="2" class="th-main" style="width: 100px;">Chuyên ngành</th>
          <th colspan="${filteredDays.length}" class="th-main">Ngày trong tuần</th>
        </tr>
        <tr>
          ${filteredDays.map(d => `
            <th class="th-day">
              <div>${d.dayName === 'Chủ Nhật' ? 'CN' : d.dayName}</div>
              <div style="font-weight: normal; font-size: 8pt; margin-top: 1px;">${d.label}</div>
            </th>
          `).join('')}
        </tr>

        <!-- Table Rows, grouped by department -->
        ${(() => {
          let globalCounter = 1;
          const targetSchedules = departmentSchedules.filter(s => s.month === selectedMonth);

          return targetSchedules.map((deptSche) => {
            const staffs = staffList[deptSche.department] || [];
            
            return staffs.map((staff, staffIdx) => {
              const staffSche = deptSche.schedules.find(s => s.staffId === staff.id);
              const isCN = (staff.major || '').trim().toUpperCase() === 'CNĐĐ';
              const nameClass = staff.isChief ? 'class="chief-nurse"' : '';
              const majorClass = isCN ? 'class="major-cndd"' : '';
              const rowNum = globalCounter++;

              return `
                <tr>
                  <td>${rowNum}</td>
                  ${staffIdx === 0 
                    ? `<td rowspan="${staffs.length}" class="dept-col">${deptSche.department}</td>` 
                    : ''
                  }
                  <td ${nameClass} style="text-align: left; padding-left: 5px;">${staff.name}</td>
                  <td>${staff.gender}</td>
                  <td ${majorClass}>${staff.major}</td>
                  
                  <!-- Week days cells with color backgrounds for off periods -->
                  ${filteredDays.map(d => {
                    const targetDeptSchedule = departmentSchedules.find(s => s.department === deptSche.department && s.month === d.targetMonth);
                    const targetStaffSchedule = targetDeptSchedule?.schedules.find(s => s.staffId === staff.id);
                    const code = targetStaffSchedule?.schedule[d.targetDayKey] || '';
                    const isX = code === 'X';
                    const isEmpty = code === '';
                    const bgStyle = (!isX && !isEmpty) ? 'class="cell-yellow-bg"' : 'class="cell-x"';
                    return `<td ${bgStyle}>${code}</td>`;
                  }).join('')}
                </tr>
              `;
            }).join('');
          }).join('');
        })()}

        <!-- Bottom Total Row -->
        <tr>
          <td colspan="3" style="font-weight: bold; text-align: left; border: 0.5pt solid #000000; padding-left: 5px;">Tổng số : ${totalStaffs} ĐĐ, KTY</td>
          <td colspan="2" style="font-weight: bold; text-align: right; border: 0.5pt solid #000000; padding-right: 5px;">TS nghỉ/ngày:</td>
          
          <!-- Days off count columns -->
          ${filteredDays.map(d => {
            let dailyOffCount = 0;
            departmentSchedules.forEach(deptSche => {
              if (deptSche.month === d.targetMonth) {
                deptSche.schedules.forEach(staffSche => {
                  const code = staffSche.schedule[d.targetDayKey] || '';
                  if (code && code !== 'X') {
                    dailyOffCount++;
                  }
                });
              }
            });
            const formattedCount = dailyOffCount < 10 ? `0${dailyOffCount}` : `${dailyOffCount}`;
            return `<td style="font-weight: bold; text-align: center; border: 0.5pt solid #000000;">${formattedCount}</td>`;
          }).join('')}
        </tr>

        <!-- Signatures spacing -->
        <tr style="height: 25px; border:none;">
          <td colspan="${5 + filteredDays.length}" style="border:none;"></td>
        </tr>

        <!-- Right Aligned Signature block -->
        <tr>
          <td colspan="5" style="border:none;"></td>
          <td colspan="${filteredDays.length}" style="text-align: center; border: none; font-weight: bold; font-size: 11pt;">PHỤ TRÁCH PHÒNG ĐD/KSNK</td>
        </tr>
        <tr style="height: 50px; border:none;">
          <td colspan="${5 + filteredDays.length}" style="border:none;"></td>
        </tr>
        <tr>
          <td colspan="5" style="border:none;"></td>
          <td colspan="${filteredDays.length}" style="text-align: center; border: none; font-weight: bold; font-size: 11pt;">${headOfNursingName}</td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Create downloadable Excel binary block
  const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `Lich_Lam_Viec_Tuan_${selectedWeek}_Phòng_Điều_Dưỡng.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Generates and downloads a clean Excel template pre-filled with the current month's staff list
export function exportExcelTemplate(
  departmentSchedules: DepartmentSchedule[],
  staffList: Record<string, Staff[]>,
  selectedMonth: string
) {
  const [yearStr, monthStr] = selectedMonth.split('-');
  const monthNum = parseInt(monthStr, 10);
  const yearNum = parseInt(yearStr, 10);
  const length = new Date(yearNum, monthNum, 0).getDate();

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Prepare header rows
  const data: any[][] = [
    ["BỆNH VIỆN ĐA KHOA SÔNG THƯƠNG BẮC GIANG", "", "", "", ""],
    ["BẢNG ĐĂNG KÝ PHÂN CA / LỊCH LÀM VIỆC NHÂN SỰ", "", "", "", ""],
    [`Tháng ${monthStr} năm ${yearStr}`, "", "", "", ""],
    [], // empty row for spacing
  ];

  // Header row for columns
  const headerRow = ["STT", "Khoa / phòng", "Họ và Tên", "Giới tính", "Chuyên ngành"];
  for (let i = 1; i <= length; i++) {
    const dateStr = i < 10 ? `0${i}` : `${i}`;
    headerRow.push(dateStr);
  }
  data.push(headerRow);

  // Rows for staff
  let globalIndex = 1;
  Object.entries(staffList).forEach(([dept, staffs]) => {
    const deptSche = departmentSchedules.find(s => s.department === dept && s.month === selectedMonth);
    
    staffs.forEach((staff) => {
      const staffSche = deptSche?.schedules.find((s: any) => s.staffId === staff.id);
      const schedule = staffSche?.schedule || {};

      const row = [
        globalIndex++,
        dept,
        staff.name,
        staff.gender,
        staff.major
      ];

      for (let i = 1; i <= length; i++) {
        const dateStr = i < 10 ? `0${i}` : `${i}`;
        const code = schedule[dateStr] || ""; // current schedule or blank
        row.push(code);
      }

      data.push(row);
    });
  });

  // Convert array of arrays to sheet
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths for nice appearance
  const wscols = [
    { wch: 6 },  // STT
    { wch: 18 }, // Department
    { wch: 22 }, // Name
    { wch: 10 }, // Gender
    { wch: 15 }, // Major
  ];
  for (let i = 1; i <= length; i++) {
    wscols.push({ wch: 6 }); // Day columns
  }
  ws['!cols'] = wscols;

  // Append sheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Lịch Làm Việc");

  // Save/download the workbook
  XLSX.writeFile(wb, `Mau_Lich_Lam_Viec_Thang_${monthStr}_${yearStr}.xlsx`);
}
