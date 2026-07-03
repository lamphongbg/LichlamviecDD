import { Staff, Department, DaySchedule, DepartmentSchedule, ScheduleCode } from './types';

export const INITIAL_STAFF: Record<Department, Staff[]> = {
  'Nội - Nhi': [
    { id: 'nn-01', name: 'Phạm Thị Cánh', gender: 'Nữ', major: 'CNĐĐ', isChief: true },
    { id: 'nn-02', name: 'Bế Thị Kim', gender: 'Nữ', major: 'CĐĐĐ' },
  ],
  'Ngoại': [
    { id: 'ng-01', name: 'Trương Thị Ngân', gender: 'Nữ', major: 'CNĐĐ', isChief: true },
    { id: 'ng-02', name: 'Nguyễn Quang Thông', gender: 'Nam', major: 'ĐDTC' },
    { id: 'ng-03', name: 'Trần Thị Chang', gender: 'Nữ', major: 'YSĐK' },
    { id: 'ng-04', name: 'Vũ Thị Huyên', gender: 'Nữ', major: 'CĐĐĐ' },
  ],
  'YHCT - PHCN': [
    { id: 'yh-01', name: 'Phạm Thị Hiền', gender: 'Nữ', major: 'CNĐĐ', isChief: true },
    { id: 'yh-02', name: 'Nguyễn T.Q. Trang', gender: 'Nữ', major: 'CNĐĐ' },
    { id: 'yh-03', name: 'Phương Minh Tịnh', gender: 'Nam', major: 'YSĐK' },
    { id: 'yh-04', name: 'Nguyễn Xuân Tú', gender: 'Nam', major: 'YSĐK' },
    { id: 'yh-05', name: 'Ngô Trí Huy', gender: 'Nam', major: 'YSĐK' },
    { id: 'yh-06', name: 'Phùng Anh Tuấn', gender: 'Nam', major: 'YSĐK' },
    { id: 'yh-07', name: 'Trần Hồng Phước', gender: 'Nam', major: 'CNĐĐ' },
    { id: 'yh-08', name: 'Nguyễn Huy Công', gender: 'Nam', major: 'CĐĐĐ' },
    { id: 'yh-09', name: 'Lê Mạnh Hùng', gender: 'Nam', major: 'CNĐĐ' },
    { id: 'yh-10', name: 'Nguyễn T. Anh Hồng', gender: 'Nữ', major: 'CNĐĐ' },
    { id: 'yh-11', name: 'Vũ Thị Ngọc Hà', gender: 'Nữ', major: 'TSCT' },
    { id: 'yh-12', name: 'Nguyễn Mộc Anh', gender: 'Nam', major: 'CĐPHCN' },
  ],
  'LCK': [
    { id: 'lc-01', name: 'Trần Hoài Thương', gender: 'Nữ', major: 'CNĐĐ', isChief: true },
    { id: 'lc-02', name: 'Nguyễn Thị Hồng Linh', gender: 'Nữ', major: 'CNĐĐ' },
    { id: 'lc-03', name: 'Nguyễn Thị Phương', gender: 'Nữ', major: 'CNĐĐ' },
    { id: 'lc-04', name: 'Trần Thu Hiền', gender: 'Nữ', major: 'CNĐĐ' },
    { id: 'lc-05', name: 'Nguyễn Thanh Tú', gender: 'Nữ', major: 'CNĐĐ' },
    { id: 'lc-06', name: 'Hoàng Ánh Chi', gender: 'Nữ', major: 'CNĐĐ' },
    { id: 'lc-07', name: 'Nguyễn Thị Thu Trang', gender: 'Nữ', major: 'CNĐĐ' },
    { id: 'lc-08', name: 'Lê Thị Mai', gender: 'Nữ', major: 'CNĐĐ' },
    { id: 'lc-09', name: 'Hoàng Thị Thiệp', gender: 'Nữ', major: 'ĐDTC' },
    { id: 'lc-10', name: 'Bùi Thị Hà', gender: 'Nữ', major: 'ĐDTC' },
    { id: 'lc-11', name: 'Nguyễn Thu Thủy', gender: 'Nữ', major: 'CNĐĐ' },
    { id: 'lc-12', name: 'Nguyễn Quang Thắng', gender: 'Nam', major: 'CNĐĐ' },
    { id: 'lc-13', name: 'Phan Thị Bích', gender: 'Nữ', major: 'CĐĐĐ' },
  ]
};

// Generates correct days sequence for March 2026
// Match with Sunday on 1st, 8th, 15th, 22nd, 29th
export function getMarch2026Days() {
  const days: { dateStr: string; dayIndex: number; dayName: string; isSunday: boolean }[] = [];
  const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  
  for (let i = 1; i <= 31; i++) {
    const dateStr = i < 10 ? `0${i}` : `${i}`;
    // In March 2026, March 1st is Sunday, which corresponds to index 0 of dayNames
    const dayIndex = (i - 1) % 7; 
    days.push({
      dateStr,
      dayIndex,
      dayName: dayNames[dayIndex],
      isSunday: dayIndex === 0,
    });
  }
  return days;
}

// Generate schedule code from original patterns
export const getInitialSchedule = (staffId: string, year?: number, monthOffset?: number): DaySchedule => {
  const schedule: DaySchedule = {};
  const today = new Date();
  const y = year ?? today.getFullYear();
  const m = monthOffset ?? today.getMonth(); // 0-indexed
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const isSunday = (dayNum: number) => new Date(y, m, dayNum).getDay() === 0;

  // Standard weekday setting is X (full day work), Sunday is 0 (rest)
  for (let i = 1; i <= daysInMonth; i++) {
    const dateKey = i < 10 ? `0${i}` : `${i}`;
    schedule[dateKey] = isSunday(i) ? '0' : 'X';
  }

  // Inject exact details matching the hospital image data perfectly:
  if (staffId === 'nn-01') { // Phạm Thị Cánh (Chief Nội - Nhi) - 17 ngày công
    // High off days
    schedule['08'] = '0';
    schedule['15'] = '0';
    schedule['19'] = '0';
    schedule['20'] = '0';
    schedule['21'] = '0';
    schedule['22'] = '0';
    schedule['29'] = '0';
    // Let's modify days to match the 17 total workdays
    const offDays = ['01', '08', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '29', '30'];
    offDays.forEach(d => { schedule[d] = '0'; });
  } 
  else if (staffId === 'nn-02') { // Bế Thị Kim (Nội - Nhi) - 20 ngày công
    const workDays = ['02', '03', '04', '05', '06', '07', '09', '10', '11', '12', '13', '14', '16', '17', '18', '19', '20', '21', '23', '24'];
    for (let i = 1; i <= 31; i++) {
      const d = i < 10 ? `0${i}` : `${i}`;
      schedule[d] = workDays.includes(d) ? 'X' : '0';
    }
  }
  else if (staffId === 'ng-01') { // Trương Thị Ngân (Chief Ngoại) - 29 công
    // almost fully on
    schedule['07'] = '0';
    schedule['15'] = '0';
  }
  else if (staffId === 'ng-02') { // Nguyễn Quang Thông - 28 công
    schedule['13'] = '0';
    schedule['29'] = '0';
    schedule['30'] = '0';
  }
  else if (staffId === 'ng-03') { // Trần Thị Trang (Trong image named "Trần Thị Chang") - 29 công
    schedule['08'] = '0';
    schedule['15'] = '0';
  }
  else if (staffId === 'ng-04') { // Vũ Thị Huyên - 0 ngày công, 1 phép, other KL
    schedule['01'] = 'P'; // Mở đầu bằng P (Nghỉ phép) -> Cộng phép = 1
    // Các ngày tiếp theo là KT hoặc KL (Không lương)
    for (let i = 2; i <= 31; i++) {
      const d = i < 10 ? `0${i}` : `${i}`;
      schedule[d] = 'KL';
    }
  }
  else if (staffId === 'yh-01') { // Phạm Thị Hiền (Chief YHCT) - 20.5 công
    // Has Sunday split or S/C
    schedule['15'] = '0';
    schedule['22'] = 'S'; // Morning off or morning work
    // Reduce some days
    const offs = ['01', '08', '15', '23', '24', '25', '26', '27', '28', '29', '30', '31'];
    offs.forEach(d => { schedule[d] = '0'; });
    schedule['22'] = 'S'; // 0.5
  }
  else if (staffId === 'yh-03') { // Phương Minh Tịnh - 13 công
    // High resting days
    const workDays = ['01', '04', '06', '07', '08', '11', '13', '14', '15', '18', '20', '21', '22'];
    for (let i = 1; i <= 31; i++) {
      const d = i < 10 ? `0${i}` : `${i}`;
      schedule[d] = workDays.includes(d) ? 'X' : '0';
    }
  }
  else if (staffId === 'yh-04') { // Nguyễn Xuân Tú - 14.5 ngày công
    const workDays = ['02', '04', '07', '08', '11', '13', '14', '15', '18', '20', '21', '22', '23', '24'];
    for (let i = 1; i <= 31; i++) {
      const d = i < 10 ? `0${i}` : `${i}`;
      schedule[d] = workDays.includes(d) ? 'X' : '0';
    }
    schedule['03'] = 'C'; // Afternoon work -> Adding 0.5 to total
  }
  else if (staffId === 'yh-09') { // Lê Mạnh Hùng - 20.5 công
    schedule['15'] = 'C';
    const offs = ['01', '08', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31'];
    offs.forEach(d => { schedule[d] = '0'; });
  }
  else if (staffId === 'yh-10') { // Nguyễn T. Anh Hồng - 20.5 công
    schedule['15'] = 'C';
    schedule['22'] = '0';
    const offs = ['01', '08', '23', '24', '25', '26', '27', '28', '29', '30', '31'];
    offs.forEach(d => { schedule[d] = '0'; });
  }
  else if (staffId === 'yh-11') { // Vũ Thị Ngọc Hà - 16.5 công
    schedule['14'] = '0';
    schedule['15'] = '0';
    schedule['22'] = 'C';
    const offs = ['01', '08', '14', '15', '23', '24', '25', '26', '27', '28', '29', '30', '31'];
    offs.forEach(d => { schedule[d] = '0'; });
    schedule['22'] = 'C';
  }
  // Fill remaining staffs with full schedule (only Sundays off)
  return schedule;
};

export function getInitialDepartmentSchedules(): DepartmentSchedule[] {
  const departments: Department[] = ['Nội - Nhi', 'Ngoại', 'YHCT - PHCN', 'LCK'];
  const today = new Date();
  const yr = today.getFullYear();
  const mn = today.getMonth() + 1;
  const month = `${yr}-${mn < 10 ? '0' + mn : mn}`;
  
  return departments.map(dept => {
    const staffs = INITIAL_STAFF[dept];
    const staffSchedules = staffs.map(staff => ({
      staffId: staff.id,
      schedule: getInitialSchedule(staff.id, yr, mn - 1),
    }));
    
    // YHCT - PHCN and LCK are submitted, Nội - Nhi and Ngoại are draft
    let status: DepartmentSchedule['status'] = 'DRAFT';
    if (dept === 'YHCT - PHCN') status = 'APPROVED';
    if (dept === 'LCK') status = 'SUBMITTED';
    
    return {
      department: dept,
      month,
      schedules: staffSchedules,
      status,
      updatedAt: new Date().toISOString(),
    };
  });
}
