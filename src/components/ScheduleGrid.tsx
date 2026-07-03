import React, { useState, useEffect, useRef } from 'react';
import { DepartmentSchedule, Staff, ScheduleCode, DaySchedule, Department, Role, DeleteRequest } from '../types';
import { getMarch2026Days } from '../initialData';
import { Plus, Trash, CheckCircle2, AlertTriangle, XCircle, Search, HelpCircle, Save, Check, FileDown, FileUp, ArrowRightLeft, Clock, Sliders, Edit3, CheckSquare, XSquare, Users, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportToExcel, exportExcelTemplate, exportWeeklyToExcel } from './ExcelExporter';
import MonthSelector from './MonthSelector';

interface ScheduleGridProps {
  currentRole: Role;
  selectedDepartment: Department;
  departmentSchedules: DepartmentSchedule[];
  staffList: Record<string, Staff[]>;
  onUpdateSchedule: (dept: Department, staffId: string, date: string, code: ScheduleCode, targetMonth?: string) => void;
  onAddStaff: (dept: Department, name: string, gender: 'Nam' | 'Nữ', major: string, isChief: boolean) => void;
  onRemoveStaff: (dept: Department, staffId: string) => void;
  onUpdateStatus: (dept: Department, status: DepartmentSchedule['status'], feedback?: string) => void;
  selectedMonth: string;
  onChangeMonth: (month: string) => void;
  deleteRequests?: DeleteRequest[];
  onRequestDeleteStaff?: (dept: Department, staffId: string, staffName: string) => void;
  onApproveDeleteStaff?: (requestId: string) => void;
  onRejectDeleteStaff?: (requestId: string) => void;
  onUpdateStaff?: (dept: Department, staffId: string, updatedFields: Partial<Staff>, newDept?: Department) => void;
  enableCellDropdown?: boolean;
  enableBottomKeypad?: boolean;
  onBulkUpdateSchedules?: (updated: DepartmentSchedule[]) => void;
  onAddDepartment?: (deptName: string) => void;
}

// Helper to get the ISO week number for any Date object
export const getISOWeekForDate = (date: Date): number => {
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

export const getDefaultWeekForMonth = (selectedMonth: string): number => {
  const [year, month] = selectedMonth.split('-').map(Number);
  
  // Get all days of the month and their week numbers
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeksInMonth: number[] = [];
  
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month - 1, i);
    const w = getISOWeekForDate(d);
    if (!weeksInMonth.includes(w)) {
      weeksInMonth.push(w);
    }
  }
  
  weeksInMonth.sort((a, b) => a - b);
  
  // Check if today belongs to this selected month
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  
  if (year === todayYear && month === todayMonth) {
    const todayWeek = getISOWeekForDate(today);
    if (weeksInMonth.includes(todayWeek)) {
      return todayWeek;
    }
  }
  
  // Default to the first week of the month
  return weeksInMonth[0] || 1;
};

export default function ScheduleGrid({
  currentRole,
  selectedDepartment,
  departmentSchedules,
  staffList,
  onUpdateSchedule,
  onAddStaff,
  onRemoveStaff,
  onUpdateStatus,
  selectedMonth,
  onChangeMonth,
  deleteRequests = [],
  onRequestDeleteStaff,
  onApproveDeleteStaff,
  onRejectDeleteStaff,
  onUpdateStaff,
  enableCellDropdown = true,
  enableBottomKeypad = true,
  onBulkUpdateSchedules,
  onAddDepartment
}: ScheduleGridProps) {
  const days = React.useMemo(() => {
    const [yearStr, monthStrPart] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStrPart, 10); // 1-12
    const length = new Date(year, month, 0).getDate(); // gets length of month
    
    const displayDays = [];
    const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    for (let i = 1; i <= length; i++) {
      const dateStr = i < 10 ? `0${i}` : `${i}`;
      const dateObj = new Date(year, month - 1, i);
      const dayIndex = dateObj.getDay();
      displayDays.push({
        dateStr,
        dayIndex,
        dayName: dayNames[dayIndex],
        isSunday: dayIndex === 0,
      });
    }
    return displayDays;
  }, [selectedMonth]);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCell, setActiveCell] = useState<{ staffId: string; date: string } | null>(null);
  const [isEditingCell, setIsEditingCell] = useState<boolean>(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showStaffManagementModal, setShowStaffManagementModal] = useState(false);
  const [manageDept, setManageDept] = useState<Department>(selectedDepartment);
  const [manageSearch, setManageSearch] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffGender, setNewStaffGender] = useState<'Nam' | 'Nữ'>('Nữ');
  const [newStaffMajor, setNewStaffMajor] = useState('CNĐĐ');
  const [newStaffIsChief, setNewStaffIsChief] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedDeptForApproval, setSelectedDeptForApproval] = useState<Department>('Nội - Nhi');
  const [selectedWeek, setSelectedWeek] = useState<number | 'ALL'>(() => getDefaultWeekForMonth(selectedMonth));

  // Staff editing states
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editStaffName, setEditStaffName] = useState('');
  const [editStaffGender, setEditStaffGender] = useState<'Nam' | 'Nữ'>('Nữ');
  const [editStaffMajor, setEditStaffMajor] = useState('');
  const [editStaffIsChief, setEditStaffIsChief] = useState(false);
  const [editStaffDept, setEditStaffDept] = useState<Department>('Nội - Nhi');
  const [originalStaffDept, setOriginalStaffDept] = useState<Department>('Nội - Nhi');
  const [addFormDept, setAddFormDept] = useState<Department>(selectedDepartment);
  const [showChiefNurseGuide, setShowChiefNurseGuide] = useState(false);

  // Custom major titles persistence
  const [savedCustomMajors, setSavedCustomMajors] = useState<{ code: string; label: string }[]>(() => {
    try {
      const saved = localStorage.getItem('app_custom_majors_list');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isAddingCustomMajorEdit, setIsAddingCustomMajorEdit] = useState(false);
  const [isAddingCustomMajorNew, setIsAddingCustomMajorNew] = useState(false);
  const [customMajorInputEdit, setCustomMajorInputEdit] = useState('');
  const [customMajorInputNew, setCustomMajorInputNew] = useState('');

  const allMajors = React.useMemo(() => {
    const defaultList = [
      { code: 'CNĐĐ', label: 'CN Điều dưỡng (CNĐĐ)' },
      { code: 'CĐĐĐ', label: 'CĐ Điều dưỡng (CĐĐĐ)' },
      { code: 'ĐDTC', label: 'ĐD Trung cấp (ĐDTC)' },
      { code: 'YSĐK', label: 'Y sĩ Đa khoa (YSĐK)' },
      { code: 'TSCT', label: 'TC Hộ sinh (TSCT)' },
      { code: 'CĐPHCN', label: 'CĐ Phục hồi CN (CĐPHCN)' },
    ];
    const map = new Map<string, string>();
    defaultList.forEach((m) => map.set(m.code, m.label));
    if (Array.isArray(savedCustomMajors)) {
      savedCustomMajors.forEach((m) => map.set(m.code, m.label));
    }

    if (staffList && typeof staffList === 'object') {
      Object.values(staffList).forEach((list) => {
        if (Array.isArray(list)) {
          list.forEach((staff) => {
            if (staff && staff.major && !map.has(staff.major)) {
              map.set(staff.major, staff.major);
            }
          });
        }
      });
    }

    return Array.from(map.entries()).map(([code, label]) => ({ code, label }));
  }, [savedCustomMajors, staffList]);

  const handleAddCustomMajorSubmit = (target: 'edit' | 'new') => {
    const val = (target === 'edit' ? customMajorInputEdit : customMajorInputNew).trim();
    if (!val) return;

    if (!allMajors.some((m) => m.code.toLowerCase() === val.toLowerCase())) {
      const newList = [...savedCustomMajors, { code: val, label: val }];
      setSavedCustomMajors(newList);
      try {
        localStorage.setItem('app_custom_majors_list', JSON.stringify(newList));
      } catch (e) {
        console.error('Failed to save custom majors list', e);
      }
    }

    if (target === 'edit') {
      setEditStaffMajor(val);
      setCustomMajorInputEdit('');
      setIsAddingCustomMajorEdit(false);
    } else {
      setNewStaffMajor(val);
      setCustomMajorInputNew('');
      setIsAddingCustomMajorNew(false);
    }
  };

  const handleRemoveCustomMajor = (codeToRemove: string) => {
    const newList = savedCustomMajors.filter((m) => m.code !== codeToRemove);
    setSavedCustomMajors(newList);
    try {
      localStorage.setItem('app_custom_majors_list', JSON.stringify(newList));
    } catch {}
  };

  useEffect(() => {
    setAddFormDept(selectedDepartment);
    setManageDept(selectedDepartment);
    setSelectedDeptForApproval(selectedDepartment);
    setEditStaffDept(selectedDepartment);
  }, [selectedDepartment]);

  // Reset selected week when selectedMonth changes
  useEffect(() => {
    setSelectedWeek(getDefaultWeekForMonth(selectedMonth));
  }, [selectedMonth]);

  // Scroll active cell into view when selected
  useEffect(() => {
    if (activeCell) {
      const { staffId, date } = activeCell;
      const tdEl = document.getElementById(`td-${staffId}-${date}`);
      if (tdEl) {
        tdEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }
  }, [activeCell]);



  const containerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  // Close active cell input helper when clicking outside the table and outside the input helper area
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (!activeCell) return;

      // Check if target is inside the table container
      if (containerRef.current && containerRef.current.contains(e.target as Node)) {
        return;
      }

      // Check if target is inside the floating footer / input helper panel
      if (footerRef.current && footerRef.current.contains(e.target as Node)) {
        return;
      }

      // If they clicked on a modal or overlay with high z-index, don't dismiss the active cell
      const target = e.target as HTMLElement;
      if (target) {
        try {
          if (target.closest('.z-100') || target.closest('.z-50') || target.closest('.z-\\[110\\]')) {
            return;
          }
        } catch (err) {
          // Safe fallback
        }
      }

      setActiveCell(null);
      setIsEditingCell(false);
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [activeCell]);

  // Helper to get week number of the year for a given day string using ISO 8601
  const getWeekNoOfYear = (dateStr: string): number => {
    const dayNum = parseInt(dateStr);
    const [year, month] = selectedMonth.split('-').map(Number);
    const dateObj = new Date(year, month - 1, dayNum);
    
    const tempDate = new Date(dateObj.valueOf());
    tempDate.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
    // January 4 is always in week 1.
    const week1 = new Date(tempDate.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and calculate number of weeks from date of week 1.
    return 1 + Math.round(((tempDate.valueOf() - week1.valueOf()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const getMondayOfISOWeek = (week: number, year: number): Date => {
    const simple = new Date(year, 0, 4);
    const dayOfWeek = simple.getDay();
    const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    const mondayOfWeek1 = new Date(simple.getTime() - (isoDay - 1) * 24 * 60 * 60 * 1000);
    return new Date(mondayOfWeek1.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  };

  interface DisplayDay {
    dateStr: string;
    label: string;
    dayIndex: number;
    dayName: string;
    isSunday: boolean;
    isCurrentMonth: boolean;
    targetMonth: string;
    targetDayKey: string;
  }

  const getISOWeekDates = (weekNum: number, year: number, selectedMonthStr: string): DisplayDay[] => {
    const monday = getMondayOfISOWeek(weekNum, year);
    const displayDays: DisplayDay[] = [];
    const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const [monYear, monMonth] = selectedMonthStr.split('-').map(Number);

    for (let i = 0; i < 7; i++) {
       const d = new Date(monday.getTime() + i * 24 * 60 * 60 * 1000);
       const dayYear = d.getFullYear();
       const dayMonth = d.getMonth() + 1;
       const dayDate = d.getDate();
       const dayIndex = d.getDay();

       const isCurrentMonth = (dayYear === monYear && dayMonth === monMonth);
       
       const mmStr = dayMonth < 10 ? `0${dayMonth}` : `${dayMonth}`;
       const ddStr = dayDate < 10 ? `0${dayDate}` : `${dayDate}`;
       
       const targetMonth = `${dayYear}-${mmStr}`;
       const targetDayKey = ddStr;
       
       let dateStr = '';
       let label = '';
       
       if (isCurrentMonth) {
         dateStr = ddStr;
         label = ddStr;
       } else {
         dateStr = `${dayYear}-${mmStr}-${ddStr}`;
         label = `${ddStr}/${mmStr}`;
       }

       displayDays.push({
         dateStr,
         label,
         dayIndex,
         dayName: dayNames[dayIndex],
         isSunday: dayIndex === 0,
         isCurrentMonth,
         targetMonth,
         targetDayKey
       });
    }
    
    return displayDays;
  };

  const [yearNum] = selectedMonth.split('-').map(Number);

  const filteredDays: DisplayDay[] = React.useMemo(() => {
    return selectedWeek === 'ALL' 
      ? days.map(d => ({
          dateStr: d.dateStr,
          label: d.dateStr,
          dayIndex: d.dayIndex,
          dayName: d.dayName,
          isSunday: d.isSunday,
          isCurrentMonth: true,
          targetMonth: selectedMonth,
          targetDayKey: d.dateStr
        }))
      : getISOWeekDates(selectedWeek, yearNum, selectedMonth);
  }, [selectedWeek, days, yearNum, selectedMonth]);

  // Find understaffed warning days for any given department
  const getDeptWarningDays = React.useCallback((dept: Department) => {
    const deptSchedule = departmentSchedules.find(s => s.department === dept && s.month === selectedMonth);
    const warningDays = new Set<string>();
    if (!deptSchedule) return warningDays;
    
    const limit = dept === 'YHCT - PHCN' || dept === 'LCK' ? 3 : 1;
    filteredDays.forEach(d => {
      let deptActive = 0;
      deptSchedule.schedules.forEach(s => {
        const code = s.schedule[d.dateStr];
        if (code === 'X') deptActive += 1.0;
        else if (code === 'X/2' || code === 'S' || code === 'C') deptActive += 0.5;
      });
      
      if (deptActive < limit) {
        warningDays.add(d.dateStr);
      }
    });
    return warningDays;
  }, [departmentSchedules, filteredDays, selectedMonth]);

  // Active department warning days set based on current role and selection
  const activeDeptWarnings = React.useMemo(() => {
    if (currentRole !== 'HEAD_OF_NURSING' && currentRole !== 'ADMIN') {
      return new Set<string>();
    }
    const targetDept = selectedDeptForApproval;
    return getDeptWarningDays(targetDept);
  }, [currentRole, selectedDeptForApproval, getDeptWarningDays]);

  const lastScrolledDeptRef = useRef<string>('');

  // Reset scroll tracker on context change
  useEffect(() => {
    lastScrolledDeptRef.current = '';
  }, [currentRole, selectedMonth, selectedWeek]);

  // Handle auto-focus, scroll to department and warning day column when selectedDeptForApproval changes
  useEffect(() => {
    if (currentRole === 'CHIEF_NURSE') return;
    if (!selectedDeptForApproval) return;

    // Only scroll if selected dept actually changed, protecting editing interactions from being scrolled-shifted
    if (lastScrolledDeptRef.current === selectedDeptForApproval) {
      return;
    }
    lastScrolledDeptRef.current = selectedDeptForApproval;

    // 1. Scroll vertically to the selected department header
    const deptId = `dept-row-divider-${selectedDeptForApproval}`;
    const deptEl = document.getElementById(deptId);
    if (deptEl) {
      deptEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 2. Find target warning day or default to today/first day
    let targetDateStr = '';
    const warningsSet = getDeptWarningDays(selectedDeptForApproval);
    
    if (warningsSet.size > 0) {
      // Find first warning day in order
      const firstWarnDay = filteredDays.find(d => warningsSet.has(d.dateStr));
      if (firstWarnDay) {
        targetDateStr = firstWarnDay.dateStr;
      }
    }

    if (!targetDateStr && filteredDays.length > 0) {
      // Standard fallback to today if today is in the active days
      const today = new Date();
      const todayDateNum = today.getDate();
      const todayDayLabel = todayDateNum < 10 ? `0${todayDateNum}` : String(todayDateNum);
      const todayMatch = filteredDays.find(d => {
        if (d.dateStr.includes('-')) {
          const parts = d.dateStr.split('-');
          return parseInt(parts[2], 10) === todayDateNum;
        }
        return d.dateStr === todayDayLabel;
      });
      if (todayMatch) {
        targetDateStr = todayMatch.dateStr;
      } else {
        targetDateStr = filteredDays[0].dateStr;
      }
    }

    if (targetDateStr) {
      // Scroll horizontally to target column
      const timer = setTimeout(() => {
        const colEl = document.getElementById(`th-day-${targetDateStr}`);
        if (colEl && containerRef.current) {
          const container = containerRef.current;
          const rect = colEl.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const elementLeft = rect.left - containerRect.left + container.scrollLeft;
          container.scrollTo({
            left: elementLeft - containerRect.width / 2 + rect.width / 2,
            behavior: 'smooth'
          });
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [selectedDeptForApproval, currentRole, filteredDays, getDeptWarningDays]);

  // Get all unique weeks of the year present in this month
  const uniqueWeeksWithRange = React.useMemo(() => {
    const weekMap: Record<number, string[]> = {};
    days.forEach(d => {
      const wNum = getWeekNoOfYear(d.dateStr);
      if (!weekMap[wNum]) {
        weekMap[wNum] = [];
      }
      weekMap[wNum].push(d.dateStr);
    });

    return Object.keys(weekMap).map(Number).sort((a, b) => a - b).map(wNum => {
      const monday = getMondayOfISOWeek(wNum, yearNum);
      const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
      
      const formatDayMonth = (dateObj: Date) => {
        const dd = dateObj.getDate() < 10 ? `0${dateObj.getDate()}` : `${dateObj.getDate()}`;
        const mm = (dateObj.getMonth() + 1) < 10 ? `0${(dateObj.getMonth() + 1)}` : `${(dateObj.getMonth() + 1)}`;
        return `${dd}/${mm}`;
      };

      const rangeStr = `${formatDayMonth(monday)} - ${formatDayMonth(sunday)}`;
      return {
        weekNum: wNum,
        rangeStr
      };
    });
  }, [days, selectedMonth, yearNum]);
  const isTodayColumn = (dateStr: string) => {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;
    const todayDate = today.getDate();
    
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      return y === todayYear && m === todayMonth && d === todayDate;
    } else {
      const [selYearStr, selMonthStr] = selectedMonth.split('-');
      const sy = parseInt(selYearStr, 10);
      const sm = parseInt(selMonthStr, 10);
      
      const dayNum = parseInt(dateStr, 10);
      return sy === todayYear && sm === todayMonth && dayNum === todayDate;
    }
  };

  const handleGoToToday = () => {
    const today = new Date();
    const todayMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    onChangeMonth(todayMonthStr);
    
    setSelectedWeek('ALL');
    
    const todayDateNum = today.getDate();
    const formattedDate = todayDateNum < 10 ? `0${todayDateNum}` : String(todayDateNum);
    
    const activeDeptSchedules = departmentSchedules.filter(s => currentRole === 'ADMIN' || s.department === selectedDepartment);
    const firstDept = activeDeptSchedules[0]?.department;
    if (firstDept) {
      const deptStaff = staffList[firstDept] || [];
      if (deptStaff.length > 0) {
        setActiveCell({
          staffId: deptStaff[0].id,
          date: formattedDate
        });
      }
    }
  };

  // Filter schedules based on role and active tab
  const activeSchedules = currentRole === 'CHIEF_NURSE'
    ? departmentSchedules.filter(s => s.department === selectedDepartment && s.month === selectedMonth)
    : departmentSchedules.filter(s => s.month === selectedMonth);

  // Compute ordered list of all visible staff members in the grid
  const orderedStaffs = React.useMemo(() => {
    const list: Staff[] = [];
    activeSchedules.forEach(deptSchedule => {
      const deptStaffList = staffList[deptSchedule.department] || [];
      const filteredStaffList = deptStaffList.filter(staff => 
        staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.major.toLowerCase().includes(searchTerm.toLowerCase())
      );
      list.push(...filteredStaffList);
    });
    return list;
  }, [activeSchedules, staffList, searchTerm]);

  const currentDeptSchedule = departmentSchedules.find(s => s.department === selectedDepartment && s.month === selectedMonth);

  // Symbols list for popup selections with state local persistence
  const [symbols, setSymbols] = useState<{ code: ScheduleCode; label: string; desc: string; color: string }[]>(() => {
    const cached = localStorage.getItem('song_thuong_convention_symbols_v1');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Failed to parse cached symbols', e);
      }
    }
    return [
      { code: 'X', label: 'X', desc: 'Làm cả ngày (1.0)', color: 'bg-emerald-100 text-emerald-800 font-bold border-emerald-300' },
      { code: 'X/2', label: 'X/2', desc: 'Làm nửa ngày (0.5)', color: 'bg-emerald-50 text-emerald-700 font-bold border-emerald-200' },
      { code: 'S', label: 'S', desc: 'Làm sáng (0.5)', color: 'bg-teal-50 text-teal-700 font-bold border-teal-200' },
      { code: 'C', label: 'C', desc: 'Làm chiều (0.5)', color: 'bg-cyan-50 text-cyan-700 font-bold border-cyan-200' },
      { code: '0', label: '0', desc: 'Nghỉ cả ngày', color: 'bg-rose-100 text-rose-800 font-bold border-rose-300' },
      { code: 'H', label: 'H', desc: 'Đi học chuyên nghiệp', color: 'bg-amber-100 text-amber-800 font-bold border-amber-300' },
      { code: 'KL', label: 'KL', desc: 'Nghỉ không lương', color: 'bg-gray-100 text-gray-700 font-semibold border-gray-300' },
      { code: 'TS', label: 'TS', desc: 'Nghỉ thai sản', color: 'bg-purple-100 text-purple-800 font-bold border-purple-300' },
      { code: 'P', label: 'P', desc: 'Nghỉ phép năm (cộng phép)', color: 'bg-pink-100 text-pink-800 font-bold border-pink-300' },
      { code: '', label: 'Xóa', desc: 'Chưa xếp lịch', color: 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50' }
    ];
  });

  const [showSymbolsConfig, setShowSymbolsConfig] = useState(false);
  const [editingSymbols, setEditingSymbols] = useState<typeof symbols>([]);

  // Excel Import States
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelParsedData, setExcelParsedData] = useState<{
    staff: Staff;
    department: Department;
    newSchedule: DaySchedule;
    changesCount: number;
    rowsParsed: { dateStr: string; oldCode: string; newCode: string }[];
  }[] | null>(null);
  const [excelImportError, setExcelImportError] = useState<string | null>(null);
  const [excelIsProcessing, setExcelIsProcessing] = useState(false);

  // State for a custom elegant confirmation modal to bypass iframe window.confirm blocks
  const [customConfirm, setCustomConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setCustomConfirm({
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setCustomConfirm(null);
      }
    });
  };

  // Map keyboard events to schedule actions (Arrow navigation and direct input typing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeCell) return;
      
      const { staffId, date } = activeCell;
      const dept = getStaffDepartment(staffId);
      if (!dept) return;

      // Check if we are active in a typing input/textarea
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return; 
      }

      // If active element is a select dropdown inside our cell, let it handle the keys
      if (document.activeElement?.tagName === 'SELECT' && isEditingCell) {
        if (e.key === 'Escape') {
          setIsEditingCell(false);
          // Restore focus to td
          const tdEl = document.getElementById(`td-${staffId}-${date}`);
          tdEl?.focus();
        }
        return;
      }

      const key = e.key;
      const lowerKey = key.toLowerCase();

      // 1. Arrow keys navigation support (Excel style: Up, Down, Left, Right)
      if (key === 'ArrowRight' || key === 'ArrowLeft' || key === 'ArrowUp' || key === 'ArrowDown') {
        e.preventDefault();
        
        const currentDayIndex = filteredDays.findIndex(d => d.dateStr === date);
        const currentStaffIndex = orderedStaffs.findIndex(s => s.id === staffId);
        
        let nextDayIndex = currentDayIndex;
        let nextStaffIndex = currentStaffIndex;

        if (key === 'ArrowRight') {
          if (currentDayIndex + 1 < filteredDays.length) {
            nextDayIndex = currentDayIndex + 1;
          }
        } else if (key === 'ArrowLeft') {
          if (currentDayIndex > 0) {
            nextDayIndex = currentDayIndex - 1;
          }
        } else if (key === 'ArrowDown') {
          if (currentStaffIndex + 1 < orderedStaffs.length) {
            nextStaffIndex = currentStaffIndex + 1;
          }
        } else if (key === 'ArrowUp') {
          if (currentStaffIndex > 0) {
            nextStaffIndex = currentStaffIndex - 1;
          }
        }

        if (nextDayIndex !== currentDayIndex || nextStaffIndex !== currentStaffIndex) {
          setActiveCell({
            staffId: orderedStaffs[nextStaffIndex].id,
            date: filteredDays[nextDayIndex].dateStr
          });
          setIsEditingCell(false);
        }
        return;
      }

      // 2. Escape key to clear selection
      if (key === 'Escape') {
        e.preventDefault();
        setActiveCell(null);
        setIsEditingCell(false);
        return;
      }

      // 3. Enter or Space bar to open dropdown select
      if (key === 'Enter') {
        e.preventDefault();
        setIsEditingCell(true);
        return;
      }

      let codeToApply: ScheduleCode | null = null;

      // 4. Backspace/Delete key or space (if not Enter triggering) -> Clear schedule day and auto-advance
      if (lowerKey === 'backspace' || lowerKey === 'delete') {
        e.preventDefault();
        codeToApply = '';
      }
      // 5. Typing code characters directly on cell
      else if (key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Find best matching symbol in the grid symbols list
        const matchedSym = symbols.find(sym => {
          const sCode = sym.code.toLowerCase();
          const sLabel = sym.label.toLowerCase();
          
          if (sCode === lowerKey || sLabel === lowerKey) return true;
          
          // Custom helpers for Vietnamese accents & codes
          if (sym.code === 'Đ' && (lowerKey === 'd' || lowerKey === 'đ')) return true;
          if (sym.label === 'Đ' && (lowerKey === 'd' || lowerKey === 'đ')) return true;
          if (sCode === 'kl' && lowerKey === 'k') return true;
          if (sCode === 'ts' && lowerKey === 't') return true;
          if (sCode === 'x/2' && (lowerKey === '2' || lowerKey === '/')) return true;

          return false;
        });

        if (matchedSym) {
          e.preventDefault();
          codeToApply = matchedSym.code;
        } else {
          // Fallback first character prefix match
          const partMatch = symbols.find(sym => sym.code.toLowerCase().startsWith(lowerKey));
          if (partMatch) {
            e.preventDefault();
            codeToApply = partMatch.code;
          }
        }
      }

      if (codeToApply !== null) {
        const targetDay = filteredDays.find(fd => fd.dateStr === date);
        if (targetDay) {
          onUpdateSchedule(dept, staffId, targetDay.targetDayKey, codeToApply, targetDay.targetMonth);
        } else {
          onUpdateSchedule(dept, staffId, date, codeToApply);
        }
        // Automatically jump to the next cell (next day in filteredDays) on the same staff row
        const currentDayIndex = filteredDays.findIndex(d => d.dateStr === date);
        if (currentDayIndex + 1 < filteredDays.length) {
          setActiveCell({
            staffId: staffId,
            date: filteredDays[currentDayIndex + 1].dateStr
          });
        } else {
          // Keep on current cell but select it
          setActiveCell({
            staffId: staffId,
            date: date
          });
        }
        setIsEditingCell(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCell, isEditingCell, filteredDays, orderedStaffs, symbols, onUpdateSchedule]);

  const getStaffDepartment = (staffId: string): Department | null => {
    for (const [dept, staffs] of Object.entries(staffList)) {
      if (staffs.some(s => s.id === staffId)) {
        return dept as Department;
      }
    }
    return null;
  };

  const getStaffDetails = (staffId: string): Staff | undefined => {
    for (const staffs of Object.values(staffList)) {
      const match = staffs.find(s => s.id === staffId);
      if (match) return match;
    }
    return undefined;
  };

  // Safe numerical summaries of schedule
  const getStaffSummary = (schedule: DaySchedule) => {
    let totalWorkdays = 0;
    let personalLeaves = 0;
    let unpaidLeaves = 0;
    let maternityLeaves = 0;
    let studyDays = 0;

    Object.entries(schedule).forEach(([dateKey, code]) => {
      // Only count days belonging to the primary month (represented by 2-digit keys like "01", "25", etc.)
      if (dateKey.length === 2) {
        if (code === 'X') totalWorkdays += 1.0;
        else if (code === 'X/2' || code === 'S' || code === 'C') totalWorkdays += 0.5;
        else if (code === 'P') personalLeaves += 1;
        else if (code === 'KL') unpaidLeaves += 1;
        else if (code === 'TS') maternityLeaves += 1;
        else if (code === 'H') studyDays += 1;
      }
    });

    return { totalWorkdays, personalLeaves, unpaidLeaves, maternityLeaves, studyDays };
  };

  const handleApplyCode = (code: ScheduleCode) => {
    if (!activeCell) return;
    const { staffId, date } = activeCell;
    const dept = getStaffDepartment(staffId);
    if (dept) {
      const targetDay = filteredDays.find(fd => fd.dateStr === date);
      if (targetDay) {
        onUpdateSchedule(dept, staffId, targetDay.targetDayKey, code, targetDay.targetMonth);
      } else {
        onUpdateSchedule(dept, staffId, date, code);
      }
      
      // Automatically jump to the next cell on the same staff row
      const currentDayIndex = filteredDays.findIndex(d => d.dateStr === date);
      if (currentDayIndex + 1 < filteredDays.length) {
        setActiveCell({
          staffId: staffId,
          date: filteredDays[currentDayIndex + 1].dateStr
        });
      } else {
        // Keep on current cell but select it
        setActiveCell({
          staffId: staffId,
          date: date
        });
      }
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    onAddStaff(addFormDept, newStaffName, newStaffGender, newStaffMajor, newStaffIsChief);
    setNewStaffName('');
    setNewStaffIsChief(false);
    setShowAddForm(false);
  };

  const handleProcessExcel = (file: File) => {
    setExcelIsProcessing(true);
    setExcelImportError(null);
    setExcelParsedData(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Không thể đọc dữ liệu file.");
        
        let workbook;
        if (file.name.endsWith('.xls')) {
          workbook = XLSX.read(data, { type: 'binary' });
        } else {
          workbook = XLSX.read(data, { type: 'array' });
        }
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) throw new Error("File Excel không có sheet nào.");
        
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (rawRows.length === 0) throw new Error("File Excel rỗng.");
        
        const [yearStr, monthStrPart] = selectedMonth.split('-');
        const year = parseInt(yearStr, 10);
        const monthNum = parseInt(monthStrPart, 10);
        const length = new Date(year, monthNum, 0).getDate();
        
        const allStaffs: { staff: Staff; department: Department }[] = [];
        Object.entries(staffList).forEach(([dept, list]) => {
          list.forEach(s => {
            allStaffs.push({ staff: s, department: dept as Department });
          });
        });
        
        const results: {
          staff: Staff;
          department: Department;
          newSchedule: DaySchedule;
          changesCount: number;
          rowsParsed: { dateStr: string; oldCode: string; newCode: string }[];
        }[] = [];
        
        const cleanName = (val: any) => {
          if (!val || typeof val !== 'string') return '';
          return val.trim().toLowerCase().replace(/\s+/g, ' ');
        };
        
        const cleanValue = (val: any): ScheduleCode => {
          if (val === undefined || val === null) return '';
          const str = String(val).trim().toUpperCase();
          if (str === '—' || str === '-' || str === '') return '';
          if (str === 'X' || str === '1' || str === '1.0' || str === 'X (LÀM CẢ NGÀY (1.0))') return 'X';
          if (str === '0' || str === 'O' || str === 'REST' || str === '0 (NGHỈ)') return '0';
          const matched = symbols.find(s => s.code.toUpperCase() === str);
          if (matched) return matched.code as ScheduleCode;
          return str as ScheduleCode;
        };
        
        rawRows.forEach((row) => {
          if (!row || row.length < 3) return;
          
          const potentialName1 = row[2];
          const potentialName2 = row[1];
          
          const cleanedName1 = cleanName(potentialName1);
          const cleanedName2 = cleanName(potentialName2);
          
          const match = allStaffs.find(item => {
            const sysCleanedN = cleanName(item.staff.name);
            return (cleanedName1 && sysCleanedN === cleanedName1) || (cleanedName2 && sysCleanedN === cleanedName2);
          });
          
          if (match) {
            let startColIdx = 5;
            if (cleanedName2 && cleanName(match.staff.name) === cleanedName2) {
              startColIdx = 4;
            }
            
            const deptSche = departmentSchedules.find(s => s.department === match.department && s.month === selectedMonth);
            const staffSche = deptSche?.schedules.find(sc => sc.staffId === match.staff.id);
            const extSchedule = staffSche?.schedule || {};
            
            const newSchedule: DaySchedule = { ...extSchedule };
            const rowsParsed: { dateStr: string; oldCode: string; newCode: string }[] = [];
            let changesCount = 0;
            
            for (let i = 1; i <= length; i++) {
              const dateStr = i < 10 ? `0${i}` : `${i}`;
              const cellVal = row[startColIdx + i - 1];
              const parsedCode = cleanValue(cellVal);
              const oldCode = extSchedule[dateStr] || '';
              
              if (parsedCode !== oldCode) {
                newSchedule[dateStr] = parsedCode;
                changesCount++;
                rowsParsed.push({
                  dateStr,
                  oldCode: oldCode || '—',
                  newCode: parsedCode || '—'
                });
              }
            }
            
            results.push({
              staff: match.staff,
              department: match.department,
              newSchedule,
              changesCount,
              rowsParsed
            });
          }
        });
        
        if (results.length === 0) {
          throw new Error("Không tìm thấy nhân sự nào trùng khớp tên với danh sách của bệnh viện trong file Excel này. Vui lòng kiểm tra lại cột Họ và Tên.");
        }
        
        setExcelParsedData(results);
      } catch (err: any) {
        console.error(err);
        setExcelImportError(err.message || "Đã xảy ra lỗi khi xử lý file Excel.");
      } finally {
        setExcelIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setExcelImportError("Không thể đọc file.");
      setExcelIsProcessing(false);
    };

    if (file.name.endsWith('.xls')) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleSaveImport = () => {
    if (!excelParsedData || !onBulkUpdateSchedules) return;
    
    let updatedSchedules = [...departmentSchedules];
    let totalImportedStaffs = 0;
    let totalImportedCells = 0;
    
    excelParsedData.forEach(item => {
      if (item.changesCount === 0) return;
      
      const dept = item.department;
      let deptSche = updatedSchedules.find(s => s.department === dept && s.month === selectedMonth);
      
      if (!deptSche) {
        const staffs = staffList[dept] || [];
        const staffSchedules = staffs.map(staff => ({
          staffId: staff.id,
          schedule: {}
        }));
        
        deptSche = {
          department: dept,
          month: selectedMonth,
          schedules: staffSchedules,
          status: 'DRAFT',
          updatedAt: new Date().toISOString()
        };
        updatedSchedules.push(deptSche);
      }
      
      const updatedSchedulesInDept = deptSche.schedules.map(sc => {
        if (sc.staffId === item.staff.id) {
          totalImportedStaffs++;
          totalImportedCells += item.changesCount;
          return {
            ...sc,
            schedule: item.newSchedule
          };
        }
        return sc;
      });
      
      updatedSchedules = updatedSchedules.map(s => {
        if (s.department === dept && s.month === selectedMonth) {
          return {
            ...s,
            schedules: updatedSchedulesInDept,
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      });
    });
    
    onBulkUpdateSchedules(updatedSchedules);
    setShowExcelImport(false);
    setExcelFile(null);
    setExcelParsedData(null);
    
    confirmAction(
      "Nhập Excel thành công",
      `Đã cập nhật lịch làm việc thành công cho ${totalImportedStaffs} nhân viên, ghi nhận ${totalImportedCells} sự thay đổi so với lịch cũ.`,
      () => {}
    );
  };

  const statusColors = {
    DRAFT: 'bg-gray-100 text-gray-800 border-gray-300',
    SUBMITTED: 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse',
    APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    REJECTED: 'bg-rose-100 text-rose-800 border-rose-300'
  };

  const statusLabels = {
    DRAFT: 'Bản Nháp (Chưa Gửi)',
    SUBMITTED: 'Chờ Phê Duyệt',
    APPROVED: 'Đã Duyệt',
    REJECTED: 'Từ Chối - Chờ Sửa'
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
      
      {/* Unified Search, Time Selector & Table Action Header */}
      <div className="p-3 bg-gray-50 border-b border-gray-200 flex flex-col gap-3">
        
        {/* Row 1: Left: selectors (Month/Week). Right: Search input */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          
          {/* Time & Filter Scopes */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month Selector */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider hidden sm:inline font-sans">Tháng:</span>
              <MonthSelector selectedMonth={selectedMonth} onChangeMonth={onChangeMonth} />
            </div>

            {/* Week Tab Selectors */}
            <div className="flex flex-wrap gap-0.5 p-0.5 bg-gray-200/50 border border-gray-200/70 rounded-lg max-w-full">
              <button
                id="week-btn-all"
                type="button"
                onClick={() => setSelectedWeek('ALL')}
                className={`px-2.5 py-1 text-xs font-bold rounded transition-all cursor-pointer shrink-0 ${
                  selectedWeek === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-300 hover:text-slate-800'
                }`}
              >
                Cả tháng ({days.length} ngày)
              </button>
              {uniqueWeeksWithRange.map(({ weekNum, rangeStr }) => (
                <button
                  key={weekNum}
                  id={`week-btn-${weekNum}`}
                  type="button"
                  onClick={() => setSelectedWeek(weekNum)}
                  className={`px-2.5 py-1 text-xs font-bold rounded transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    selectedWeek === weekNum
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-300 hover:text-slate-800'
                  }`}
                >
                  <span>Tuần {weekNum}</span>
                  <span className="text-[9px] opacity-75 font-mono font-medium">({rangeStr})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full xl:w-64 shrink-0">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm họ tên, chuyên ngành..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>

        </div>

        {/* Row 2: Left: Active Status/Workflow of current department/selection. Right: Auxiliary Table operations */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-t border-gray-200/50 pt-2 md:pt-2.5">
          
          {/* Status & Approvals */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Chief Nurse status info & Submit btn */}
            {currentRole === 'CHIEF_NURSE' && currentDeptSchedule && (
              <div className="flex flex-wrap items-center gap-2 bg-white/80 p-1 border border-dashed border-slate-200 rounded-lg">
                <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider pl-1 font-sans">Khoa:</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold border rounded-full ${statusColors[currentDeptSchedule.status]}`}>
                  {statusLabels[currentDeptSchedule.status]}
                </span>
                
                {(currentDeptSchedule.status === 'DRAFT' || currentDeptSchedule.status === 'REJECTED') && (
                  <button
                    id="btn-submit-dept-schedule"
                    onClick={() => onUpdateStatus(selectedDepartment, 'SUBMITTED')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10.5px] px-2.5 py-0.5 rounded transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3 h-3 shrink-0" />
                    <span>Nộp lịch</span>
                  </button>
                )}

                {currentDeptSchedule.feedback && (
                  <div className="flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded text-[10px]/snug">
                    <AlertTriangle className="w-3 h-3 shrink-0 text-rose-600" />
                    <span className="max-w-[150px] truncate animate-pulse" title={currentDeptSchedule.feedback}>
                      <strong>Sửa:</strong> {currentDeptSchedule.feedback}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Admin / Head of Nursing Approvals dropdown */}
            {(currentRole === 'HEAD_OF_NURSING' || currentRole === 'ADMIN') && (
              <div className="flex flex-wrap items-center gap-1.5 bg-blue-50/70 p-1 rounded-lg border border-blue-100/80">
                <label htmlFor="dept-approve" className="text-[10.5px] font-bold text-blue-800 shrink-0">Duyệt khoa:</label>
                <select
                  id="dept-approve"
                  value={selectedDeptForApproval}
                  onChange={(e) => setSelectedDeptForApproval(e.target.value as Department)}
                  className="text-[10.5px] font-bold text-gray-800 bg-white border border-gray-200 p-0.5 focus:outline-hidden rounded cursor-pointer max-w-[140px] truncate"
                >
                  {departmentSchedules.filter(s => s.month === selectedMonth).map(s => (
                    <option key={s.department} value={s.department}>Khoa {s.department} ({statusLabels[s.status]})</option>
                  ))}
                </select>

                {(() => {
                  const numWarningDays = activeDeptWarnings.size;
                  return numWarningDays > 0 ? (
                    <span className="flex items-center gap-1 text-[9px] bg-red-50 text-red-800 border border-red-200 px-2 py-0.5 rounded-full font-bold animate-pulse shrink-0" title={`Có ${numWarningDays} ngày chưa đạt quân số tối thiểu!`}>
                      <AlertTriangle className="w-3 h-3 text-red-650 shrink-0" />
                      <span>Cần sửa: {numWarningDays} ngày</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] bg-emerald-50 text-emerald-850 border border-emerald-250 px-2 py-0.5 rounded-full font-bold shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Hợp lệ</span>
                    </span>
                  );
                })()}

                <div className="flex gap-1">
                  <button
                    id="btn-head-approve"
                    onClick={() => onUpdateStatus(selectedDeptForApproval, 'APPROVED')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-0.5 rounded flex items-center gap-0.5 cursor-pointer transition-colors"
                    title="Phê duyệt lịch làm việc khoa đang chọn"
                  >
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>Duyệt</span>
                  </button>

                  <button
                    id="btn-head-reject"
                    onClick={() => {
                      setShowRejectModal(true);
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-2 py-0.5 rounded flex items-center gap-0.5 cursor-pointer transition-colors"
                    title="Bác bỏ hoặc yêu cầu khoa sửa lại lịch đăng ký"
                  >
                    <XCircle className="w-3 h-3 shrink-0" />
                    <span>Ý kiến</span>
                  </button>
                </div>
              </div>
            )}
            
            <div className="text-[10.5px] text-slate-500 font-medium italic hidden xl:block">
              {selectedWeek === 'ALL' 
                ? "• Mẹo: Chọn xem từng tuần để tối ưu tỉ lệ hiển thị."
                : `• Đang xem độc lập Tuần ${selectedWeek}. Nhập phím tắt tự nhảy ô trong tuần.`
              }
            </div>

          </div>

          {/* Action buttons list */}
          <div className="flex flex-wrap items-center gap-1 w-full lg:w-auto mt-1 lg:mt-0 justify-end">
            
            {/* Export current view to Excel */}
            <button
              id="btn-export-excel"
              onClick={() => {
                if (selectedWeek === 'ALL') {
                  exportToExcel(departmentSchedules, staffList, selectedMonth);
                } else {
                  exportWeeklyToExcel(departmentSchedules, staffList, selectedMonth, selectedWeek, filteredDays);
                }
              }}
              className="flex items-center justify-center gap-1 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-3xs"
              title="Tải về lịch làm việc hiện tại của khoa dưới dạng file Excel đầy đủ"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Xuất Excel</span>
            </button>

            {/* Staff directory */}
            <button
              id="btn-manage-staff-directory"
              onClick={() => {
                setManageDept(selectedDepartment);
                setShowStaffManagementModal(true);
              }}
              className="flex items-center justify-center gap-1 border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-[11px] px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-3xs"
              title="Quản lý danh sách nhân sự - thêm mới, đổi thông tin nhân viên"
            >
              <Users className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Nhân sự ({orderedStaffs.length})</span>
            </button>

            {/* Guide manual */}
            <button
              id="btn-chief-nurse-manual"
              onClick={() => setShowChiefNurseGuide(true)}
              className="flex items-center justify-center gap-1 border border-amber-200 bg-amber-50 hover:bg-amber-100/90 text-amber-900 font-bold text-[11px] px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-3xs"
              title="Đọc cẩm nang toàn bộ thao tác lập lịch, phân quyền"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Hướng dẫn</span>
            </button>

            {/* CONFIG AND IMPORT (ADMIN ONLY) */}
            {currentRole === 'ADMIN' && (
              <>
                <button
                  id="btn-admin-config-symbols"
                  onClick={() => {
                    setEditingSymbols(JSON.parse(JSON.stringify(symbols)));
                    setShowSymbolsConfig(true);
                  }}
                  className="flex items-center justify-center gap-1 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-[11px] px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-3xs"
                  title="Quản lý cấu hình & ký hiệu quy ước ca làm việc"
                >
                  <Sliders className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Ký hiệu</span>
                </button>

                <button
                  id="btn-admin-import-excel"
                  onClick={() => {
                    setExcelFile(null);
                    setExcelParsedData(null);
                    setExcelImportError(null);
                    setShowExcelImport(true);
                  }}
                  className="flex items-center justify-center gap-1 border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-955 font-bold text-[11px] px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-3xs"
                  title="Nhập dữ liệu phân ca làm việc từ file Excel"
                >
                  <FileUp className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>Nhập Excel</span>
                </button>
              </>
            )}

          </div>

        </div>

      </div>

      {/* Admin Deletion Approvals Panel */}
      {currentRole === 'ADMIN' && deleteRequests.filter(r => r.status === 'PENDING').length > 0 && (
        <div className="mx-4 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-xs animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 animate-bounce" />
            <span className="text-sm font-bold text-amber-900 uppercase">
              Yêu cầu xóa nhân sự chờ Admin phê duyệt ({deleteRequests.filter(r => r.status === 'PENDING').length})
            </span>
          </div>
          <p className="text-xs text-amber-700 mb-3 font-medium">
            Các chuyên viên, Điều dưỡng trưởng khoa đã đề xuất xóa danh nghĩa của các nhân sự sau đây. Vui lòng ấn "Duyệt Xóa" để gỡ bỏ vĩnh viễn hoặc "Từ chối" để bỏ qua đề xuất.
          </p>
          <div className="overflow-x-auto border border-amber-200/60 rounded-lg overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-amber-100/40 text-[11px] font-bold text-amber-800 uppercase tracking-wider border-b border-amber-200">
                  <th className="p-2.5 pl-4">Nhân sự đề xuất xóa</th>
                  <th className="p-2.5">Khoa phòng</th>
                  <th className="p-2.5">Người đề xuất</th>
                  <th className="p-2.5">Thời gian</th>
                  <th className="p-2.5 pr-4 text-right col-span-2">Thao tác phê duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {deleteRequests.filter(r => r.status === 'PENDING').map(req => (
                  <tr key={req.id} className="text-xs text-slate-700 hover:bg-amber-50/20 transition-all">
                    <td className="p-2.5 pl-4 font-semibold text-slate-900">{req.staffName}</td>
                    <td className="p-2.5 font-medium">{req.department}</td>
                    <td className="p-2.5 text-slate-500 font-medium">{req.requestedBy}</td>
                    <td className="p-2.5 text-[10.5px] font-mono text-slate-400">
                      {new Date(req.timestamp).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-2.5 pr-4 text-right">
                      <div className="inline-flex gap-2 justify-end">
                        <button
                          id={`reject-delete-req-${req.id}`}
                          type="button"
                          onClick={() => onRejectDeleteStaff?.(req.id)}
                          className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold px-2.5 py-1 text-[11px] rounded-md transition-colors cursor-pointer border border-slate-300 shadow-3xs"
                        >
                          <XCircle className="w-3.5 h-3.5 text-slate-500" />
                          <span>Từ chối</span>
                        </button>
                        <button
                          id={`approve-delete-req-${req.id}`}
                          type="button"
                          onClick={() => {
                            confirmAction(
                              "Phê duyệt yêu cầu xóa",
                              `Xác nhận đồng ý phê duyệt xóa nhân viên ${req.staffName} khỏi khoa ${req.department}? Thao tác này sẽ gỡ bỏ dữ liệu và lịch trực của họ.`,
                              () => {
                                onApproveDeleteStaff?.(req.id);
                              }
                            );
                          }}
                          className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold px-2.5 py-1 text-[11px] rounded-md transition-colors cursor-pointer shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Duyệt Xóa</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid Canvas Wrapper with Horizontal & Vertical Scroll for Sticky Headers */}
      <div className="overflow-auto relative max-h-[calc(100vh-210px)] min-h-[450px]" ref={containerRef}>
        <table className="w-full text-xs text-center border-separate border-spacing-0 min-w-[1000px]">
          
          {/* Table Table Headers */}
          <thead className="bg-[#1e293b] text-white sticky top-0 z-20 select-none shadow-md">
            
            {/* Headers Level 1 */}
            <tr>
              <th rowSpan={2} className="p-1 border-b border-r border-slate-700 text-[11.5px] sm:text-[12px] uppercase font-extrabold tracking-wider bg-[#0f172a] text-slate-200 sticky left-0 top-0 z-30 shadow-[1px_0_0_0_rgba(51,65,85,0.5)]" style={{ minWidth: '32px', maxWidth: '32px', width: '32px' }}>STT</th>
              <th rowSpan={2} className="p-1 border-b border-r border-slate-700 text-[11.5px] sm:text-[12px] uppercase font-extrabold tracking-wider bg-[#0f172a] text-slate-200 sticky left-[32px] top-0 z-30 shadow-[1px_0_0_0_rgba(51,65,85,0.5)]" style={{ minWidth: '80px', maxWidth: '80px', width: '80px' }}>Khoa / phòng</th>
              <th rowSpan={2} className="p-1 border-b border-r border-slate-700 text-[11.5px] sm:text-[12px] uppercase font-extrabold tracking-wider bg-[#0f172a] text-slate-200 text-left pl-2 sticky left-[112px] top-0 z-30 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.15)]" style={{ minWidth: '144px', maxWidth: '144px', width: '144px' }}>Họ và Tên</th>
              <th rowSpan={2} className="p-1 border-b border-r border-slate-700 text-[11.5px] sm:text-[12px] uppercase font-extrabold tracking-wider w-12 bg-[#0f172a] text-slate-200 sticky top-0 z-20">Giới tính</th>
              <th rowSpan={2} className="p-1 border-b border-r border-slate-700 text-[11.5px] sm:text-[12px] uppercase font-extrabold tracking-wider w-20 bg-[#0f172a] text-slate-200 sticky top-0 z-20">Chuyên ngành</th>
              
              <th colSpan={filteredDays.length} className="p-1 border-b border-r border-slate-700 text-[12px] sm:text-[12.5px] font-extrabold text-blue-200 bg-[#1e293b] uppercase tracking-wider sticky top-0 z-20">
                Ngày trong tháng (Tháng {selectedMonth.split('-')[1]} năm {selectedMonth.split('-')[0]})
              </th>
              
              <th rowSpan={2} className="p-1 border-b border-r border-slate-700 text-[11.5px] sm:text-[12px] uppercase font-extrabold tracking-wider w-14 bg-[#0f172a] text-slate-200 sticky top-0 z-20" title="Tổng ngày công làm việc">Tổng công.</th>
              <th rowSpan={2} className="p-1 border-b border-r border-slate-700 text-[11.5px] sm:text-[12px] uppercase font-extrabold tracking-wider w-12 bg-[#0f172a] text-slate-200 sticky top-0 z-20" title="Cộng phép phép nghỉ P">Cộng phép</th>
              <th rowSpan={2} className="p-1 border-b border-slate-700 text-[11.5px] sm:text-[12px] uppercase font-extrabold tracking-wider w-14 bg-[#0f172a] text-slate-200 sticky top-0 z-20">TÙY CHỌN</th>
            </tr>
 
            {/* Headers Level 2 (Individual days columns) */}
            <tr>
              {filteredDays.map((d) => {
                const isToday = isTodayColumn(d.dateStr);
                const isWarningDay = (currentRole === 'ADMIN' || currentRole === 'HEAD_OF_NURSING') ? false : activeDeptWarnings.has(d.dateStr);
                return (
                  <th
                    key={d.dateStr}
                    id={`th-day-${d.dateStr}`}
                    className={`p-0.5 border-b border-r border-slate-700 align-middle transition-all relative ${
                      isToday ? 'bg-amber-400 text-slate-900 font-black ring-2 ring-amber-300 ring-inset' :
                      isWarningDay ? 'bg-rose-900 text-rose-100 font-extrabold border-x-2 border-rose-500 animate-pulse' :
                      !d.isCurrentMonth ? 'bg-[#151c2c] text-slate-500' :
                      d.isSunday ? 'bg-rose-950 text-rose-300 font-extrabold' : 'bg-[#1e293b] text-slate-300'
                    }`}
                    style={{ width: selectedWeek === 'ALL' ? '28px' : '36px', minWidth: selectedWeek === 'ALL' ? '28px' : '36px' }}
                    title={
                      isWarningDay 
                        ? `Thiếu quân số tối thiểu khoa phòng ngày này (${currentRole === 'CHIEF_NURSE' ? selectedDepartment : selectedDeptForApproval})!` 
                        : isToday 
                          ? "Ngày hiện tại (Hôm nay)" 
                          : undefined
                    }
                  >
                    <div className={`text-[12px] sm:text-[12.5px] font-black leading-none ${isToday ? 'text-slate-950 font-black' : isWarningDay ? 'text-rose-100 font-black' : !d.isCurrentMonth ? 'opacity-65 text-slate-400' : ''}`}>{d.label}</div>
                    <div className={`text-[8.5px] sm:text-[9px] leading-tight font-extrabold mt-0.5 ${isToday ? 'text-amber-950' : isWarningDay ? 'text-rose-200' : !d.isCurrentMonth ? 'text-slate-500' : d.isSunday ? 'text-rose-450' : 'text-slate-400'}`}>
                      {d.dayIndex === 0 ? 'CN' : 'T' + (d.dayIndex + 1)}
                    </div>
                  </th>
                );
              })}
            </tr>
 
          </thead>

          {/* Table Body */}
          <tbody className="bg-white">
            
            {activeSchedules.map((deptSchedule, sectionIdx) => {
              const deptStaffList = staffList[deptSchedule.department] || [];
              const filteredStaffList = deptStaffList.filter(staff => 
                staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                staff.major.toLowerCase().includes(searchTerm.toLowerCase())
              );

              if (filteredStaffList.length === 0) return null;

              return (
                <React.Fragment key={deptSchedule.department}>
                  
                  {/* Department Divider Header (shown on combined views) */}
                  {currentRole !== 'CHIEF_NURSE' && (
                    <tr 
                      id={`dept-row-divider-${deptSchedule.department}`} 
                      className={`text-left font-bold transition-all ${
                        selectedDeptForApproval === deptSchedule.department 
                          ? 'bg-blue-100 ring-2 ring-blue-500/50 text-blue-950 font-black scale-[0.99] shadow-inner' 
                          : 'bg-blue-50/70'
                      }`}
                    >
                      <td colSpan={8 + filteredDays.length} className="p-2 text-[11px] font-bold text-blue-900 tracking-wide pl-3 border-t border-b border-blue-200">
                        Khoa {deptSchedule.department} — Trực thuộc Bộ phận Điều dưỡng Phân cấp ({filteredStaffList.length} nhân sự)
                        <span className={`ml-3 px-2 py-0.5 text-[9.5px] border rounded-full font-bold bg-white ${statusColors[deptSchedule.status]}`}>
                          Status: {statusLabels[deptSchedule.status]}
                        </span>
                        {selectedDeptForApproval === deptSchedule.department && (
                          <span className="ml-3 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-black animate-pulse">
                            Đang Kiểm Duyệt
                          </span>
                        )}
                      </td>
                    </tr>
                  )}

                  {/* Employees Rows */}
                  {filteredStaffList.map((staff, staffIdx) => {
                    const staffSchedule = deptSchedule.schedules.find(s => s.staffId === staff.id);
                    const schedule = staffSchedule?.schedule || {};
                    const { totalWorkdays, personalLeaves, unpaidLeaves, maternityLeaves, studyDays } = getStaffSummary(schedule);

                    const canEdit = currentRole === 'ADMIN' || 
                      (currentRole === 'HEAD_OF_NURSING' && deptSchedule.status !== 'APPROVED') || 
                      (currentRole === 'CHIEF_NURSE' && (deptSchedule.status === 'DRAFT' || deptSchedule.status === 'REJECTED'));

                    const isNearBottom = filteredStaffList.length > 2 && staffIdx >= filteredStaffList.length - 2;

                    return (
                      <tr 
                        key={staff.id} 
                        className={`hover:bg-gray-50/50 transition-colors group ${
                          staff.isChief ? 'bg-[#fff5f6] font-medium' : ''
                        }`}
                      >
                        {/* STT Column */}
                        <td 
                          className={`p-1.5 border-b border-r border-gray-100 font-mono text-gray-500 font-medium text-[11.5px] sm:text-[12px] sticky left-0 z-10 shadow-[1px_0_0_0_rgba(226,232,240,0.8)] ${
                            staff.isChief ? 'bg-[#fff5f6]' : 'bg-white'
                          } group-hover:bg-gray-50`}
                          style={{ minWidth: '32px', maxWidth: '32px', width: '32px' }}
                        >
                          {sectionIdx * 10 + staffIdx + 1}
                        </td>

                        {/* Department Column */}
                        <td 
                          className={`p-1.5 border-b border-r border-gray-100 text-gray-600 font-bold text-[11.5px] sm:text-[12px] sticky left-[32px] z-10 shadow-[1px_0_0_0_rgba(226,232,240,0.8)] ${
                            staff.isChief ? 'bg-[#fff5f6]' : 'bg-white'
                          } group-hover:bg-gray-50`}
                          style={{ minWidth: '80px', maxWidth: '80px', width: '80px' }}
                        >
                          {staffIdx === 0 && currentRole === 'CHIEF_NURSE' ? deptSchedule.department : ''}
                        </td>

                        {/* Name Column */}
                        <td 
                          className={`p-1.5 border-b border-r border-gray-100 text-left pl-2.5 font-bold text-[12px] sm:text-[13px] sticky left-[112px] z-10 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)] ${
                            staff.isChief ? 'text-pink-700 bg-[#fff5f6]' : 'text-gray-900 bg-white'
                          } group-hover:bg-gray-50`}
                          style={{ minWidth: '144px', maxWidth: '144px', width: '144px' }}
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{staff.name}</span>
                            {staff.isChief && (
                              <span className="text-[9px] bg-pink-100 text-pink-850 px-1.5 py-0.2 rounded font-black uppercase tracking-wide">
                                Trưởng
                              </span>
                            )}
                            {deleteRequests?.find(r => r.staffId === staff.id && r.status === 'PENDING') && (
                              <span className="text-[8.5px] bg-amber-100 text-amber-805 border border-amber-200 px-1 py-0 rounded font-bold whitespace-nowrap animate-pulse" title="Đang chờ Admin phê duyệt yêu cầu xóa">
                                Chờ Admin duyệt xóa
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Gender Column */}
                        <td className="p-1.5 border-b border-r border-gray-100 text-gray-500 text-center text-[11.5px] sm:text-[12px]">
                          {staff.gender}
                        </td>

                        {/* Qualification Major Column */}
                        <td className="p-1.5 border-b border-r border-gray-100 font-bold text-gray-600 text-[11px] sm:text-[11.5px] text-center">
                          {staff.major}
                        </td>

                        {/* Scheduling 31 Days Columns */}
                        {filteredDays.map((d) => {
                          const targetDeptSchedule = departmentSchedules.find(s => s.department === deptSchedule.department && s.month === d.targetMonth);
                          const targetStaffSchedule = targetDeptSchedule?.schedules.find(s => s.staffId === staff.id);
                          const code = targetStaffSchedule?.schedule[d.targetDayKey] || '';
                          const isSelected = activeCell?.staffId === staff.id && activeCell?.date === d.dateStr;

                           // Dynamic styles based on symbols
                          let symbolColor = 'text-gray-400';
                          let cellBg = '';

                          if (!d.isCurrentMonth) {
                            cellBg = 'bg-slate-100/50';
                          } else if (d.isSunday) {
                            cellBg = 'bg-rose-50/20';
                          }

                          const isWarningDay = (currentRole === 'ADMIN' || currentRole === 'HEAD_OF_NURSING') ? false : activeDeptWarnings.has(d.dateStr);
                          const isApprovalTargetDept = deptSchedule.department === (currentRole === 'CHIEF_NURSE' ? selectedDepartment : selectedDeptForApproval);
                          const warningCellStyles = isWarningDay && isApprovalTargetDept
                            ? (isSelected ? 'ring-2 ring-rose-500 bg-rose-50/85 font-black text-rose-955' : 'bg-red-50/65 border-x border-red-150 text-red-950 font-black')
                            : '';

                          if (code === 'X') {
                            symbolColor = d.isCurrentMonth 
                              ? 'text-green-800 bg-emerald-100/70 font-bold border-emerald-100' 
                              : 'text-green-700 bg-emerald-100/30 font-semibold border-emerald-50';
                          } else if (code === 'X/2' || code === 'S' || code === 'C') {
                            symbolColor = d.isCurrentMonth
                              ? 'text-emerald-700 bg-emerald-50/40 font-medium'
                              : 'text-emerald-600 bg-emerald-50/20 font-normal';
                          } else if (code === '0' || code === 'O') {
                            symbolColor = d.isSunday 
                              ? 'text-red-605 font-bold bg-rose-50' 
                              : (d.isCurrentMonth ? 'text-rose-600 font-bold bg-rose-50/30' : 'text-rose-400 font-normal bg-rose-50/10');
                          } else if (code === 'P') {
                            symbolColor = d.isCurrentMonth ? 'text-pink-800 bg-pink-50 font-bold' : 'text-pink-600 bg-pink-50/50 font-normal';
                          } else if (code === 'KL') {
                            symbolColor = d.isCurrentMonth ? 'text-gray-500 bg-gray-100/80 font-semibold' : 'text-gray-400 bg-gray-100/40 font-normal';
                          } else if (code === 'TS') {
                            symbolColor = d.isCurrentMonth ? 'text-purple-700 bg-purple-50 font-bold' : 'text-purple-500 bg-purple-50/40 font-semibold';
                          } else if (code === 'H') {
                            symbolColor = d.isCurrentMonth ? 'text-amber-700 bg-amber-50 font-bold' : 'text-amber-600 bg-amber-50/40 font-medium';
                          }

                          return (
                            <td
                              key={d.dateStr}
                              id={`td-${staff.id}-${d.dateStr}`}
                              tabIndex={canEdit ? 0 : undefined}
                              onClick={() => {
                                if (canEdit) {
                                  setActiveCell({ staffId: staff.id, date: d.dateStr });
                                  setIsEditingCell(enableCellDropdown);
                                }
                              }}
                              onDoubleClick={() => {
                                if (canEdit) {
                                  setIsEditingCell(enableCellDropdown);
                                }
                              }}
                              onContextMenu={(e) => {
                                if (canEdit) {
                                  e.preventDefault();
                                  setActiveCell({ staffId: staff.id, date: d.dateStr });
                                  setIsEditingCell(enableCellDropdown);
                                }
                              }}
                              className={`p-0.5 border-b border-r border-gray-100 relative group cursor-pointer transition-all select-none align-middle text-center focus:outline-hidden ${
                                isTodayColumn(d.dateStr) ? 'bg-amber-50/25 border-x border-amber-200/50' : cellBg
                              } ${warningCellStyles} ${
                                isSelected && !warningCellStyles ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/60 z-10' : ''
                              }`}
                              style={{ height: '32px' }}
                            >
                              <div className={`w-full h-full flex items-center justify-center text-[12.5px] sm:text-[13px] font-black rounded transition-transform relative ${symbolColor}`}>
                                {code === '' ? '—' : ((symbols.find(s => s.code === code)?.label) || code)}
                                
                                {/* Small visual dropdown trigger for mouse selection without key blocks */}
                                {canEdit && isSelected && (
                                  <button 
                                    type="button"
                                    className="absolute right-0.5 bottom-0.5 w-3.5 h-3.5 flex items-center justify-center bg-white shadow-xs border border-blue-200 rounded text-[8px] font-bold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer z-20"
                                    title="Chọn từ danh sách"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditingCell(true);
                                    }}
                                  >
                                    ▼
                                  </button>
                                )}
                              </div>

                              {canEdit && isSelected && isEditingCell && enableCellDropdown && (
                                <>
                                  {/* Transparent backdrop spanning viewport to close custom dropdown on clicking outside */}
                                  <div 
                                    className="fixed inset-0 z-40 bg-transparent cursor-default"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setIsEditingCell(false);
                                    }}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setIsEditingCell(false);
                                    }}
                                  />
                                  {/* Custom dropdown overlay list exactly matching the user request & screenshot */}
                                  <div 
                                    className={`absolute left-1/2 -translate-x-1/2 z-50 py-0 min-w-[215px] max-h-[160px] overflow-y-auto whitespace-nowrap animate-scale-up bg-blue-50 border border-blue-200 rounded-md shadow-lg ${
                                      isNearBottom ? 'bottom-full mb-1' : 'top-full mt-1'
                                    }`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {symbols.map(sym => (
                                      <button
                                        key={sym.code || 'clear'}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onUpdateSchedule(getStaffDepartment(staff.id) || 'Nội - Nhi', staff.id, d.targetDayKey, sym.code as ScheduleCode, d.targetMonth);
                                          
                                          // Automatically jump to the next cell (next day in filteredDays) on the same staff row
                                          const currentDayIndex = filteredDays.findIndex(day => day.dateStr === d.dateStr);
                                          if (currentDayIndex + 1 < filteredDays.length) {
                                            setActiveCell({
                                              staffId: staff.id,
                                              date: filteredDays[currentDayIndex + 1].dateStr
                                            });
                                            setIsEditingCell(true);
                                          } else {
                                            setActiveCell(null);
                                            setIsEditingCell(false);
                                          }
                                        }}
                                        className="w-full text-center px-4 py-1.5 hover:bg-blue-600 hover:text-white text-[11px] font-bold text-blue-900 border-b border-blue-100 last:border-b-0 cursor-pointer block transition-colors"
                                      >
                                        {sym.code ? `${sym.label} (${sym.desc})` : `Xóa (${sym.desc})`}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </td>
                          );
                        })}

                        {/* Aggregate Workdays Column (Màu công) */}
                        <td className="p-1.5 border-b border-r border-gray-100 font-black text-gray-950 bg-[#f8fafc] text-[12.5px] sm:text-[13.5px] text-center">
                          {totalWorkdays}
                        </td>

                        {/* Aggregate Leaves Column */}
                        <td className="p-1.5 border-b border-r border-gray-100 font-black text-red-700 bg-[#f8fafc] text-[12.5px] sm:text-[13.5px] text-center">
                          {personalLeaves}
                        </td>

                        {/* Actions or Notes Column */}
                        <td className="p-1 border-b border-gray-100 align-middle text-center bg-[#f8fafc] text-[12px] sm:text-[12.5px] text-gray-600">
                          {canEdit ? (
                            <div className="flex items-center justify-center gap-1.5 min-w-[50px]">
                              {/* Edit Employee Info button */}
                              <button
                                id={`edit-btn-${staff.id}`}
                                onClick={() => {
                                  setEditingStaff(staff);
                                  setEditStaffName(staff.name);
                                  setEditStaffGender(staff.gender);
                                  setEditStaffMajor(staff.major);
                                  setEditStaffIsChief(!!staff.isChief);
                                  setEditStaffDept(deptSchedule.department);
                                  setOriginalStaffDept(deptSchedule.department);
                                }}
                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1 rounded-full cursor-pointer transition-colors"
                                title="Chỉnh sửa thông tin thành viên"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Employee button */}
                              {currentRole === 'ADMIN' || currentRole === 'HEAD_OF_NURSING' ? (
                                <button
                                  id={`delete-btn-${staff.id}`}
                                  onClick={() => {
                                    confirmAction(
                                      "Xác nhận xóa nhân sự",
                                      `Bạn có chắc chắn muốn xóa nhân sự ${staff.name} khỏi danh sách khoa?`,
                                      () => {
                                        onRemoveStaff(deptSchedule.department, staff.id);
                                      }
                                    );
                                  }}
                                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-full cursor-pointer transition-colors"
                                  title="Xóa nhân viên"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="text-gray-300 p-1 rounded-full cursor-not-allowed opacity-40"
                                  title="Chỉ Admin hoặc Phòng điều dưỡng mới được quyền xóa"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[9px] text-gray-400 font-medium">Bản khóa</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Popover Floating Selector for Selected Cell - Sticky Viewport Footer */}
      {activeCell && enableBottomKeypad && (
        <div ref={footerRef} className="fixed bottom-0 left-0 right-0 z-[60] bg-slate-950 border-t border-slate-800 text-white shadow-[0_-12px_40px_rgba(0,0,0,0.65)] p-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">
              Đang phân lịch ngày {activeCell.date.includes('-') ? activeCell.date.split('-').reverse().join('/') : `${activeCell.date}/${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`} cho nhân viên:
              <span className="text-sky-450 font-black text-sm ml-1 select-all bg-sky-950/40 px-2 py-1 rounded border border-sky-850/50">
                {getStaffDetails(activeCell.staffId)?.name}
              </span>
            </span>
            <span className="text-[10px] text-slate-400 tracking-wide uppercase font-semibold bg-slate-800 px-2 py-0.5 rounded">({getStaffDetails(activeCell.staffId)?.major})</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 w-full md:w-auto">
            {symbols.map((sym) => (
              <button
                key={sym.code}
                id={`sym-select-${sym.code || 'clear'}`}
                onClick={() => handleApplyCode(sym.code)}
                className={`px-3 py-1.5 text-xs font-bold border rounded-md cursor-pointer transition-all hover:scale-110 active:scale-95 flex flex-col items-center min-w-[52px] ${sym.color}`}
                title={sym.desc}
              >
                <span>{sym.label || 'Trống'}</span>
                <span className="text-[7.5px] font-normal opacity-85 block mt-0.5">{sym.desc.slice(0, 10)}</span>
              </button>
            ))}
            <button
              id="btn-close-cell-edit"
              onClick={() => setActiveCell(null)}
              className="px-3.5 py-1.5 text-xs border border-slate-700 bg-slate-900 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors font-medium cursor-pointer"
            >
              Hủy / Đóng
            </button>
          </div>
        </div>
      )}



      {/* Rejection Feedback Prompt Dialog Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full overflow-hidden animate-scale-up">
            <div className="p-6">
              <h3 id="reject-modal-title" className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 uppercase tracking-wide flex items-center gap-2">
                <AlertTriangle className="text-rose-500 w-5 h-5 animate-pulse" />
                Yêu Cầu Chỉnh Sửa Lịch Trực
              </h3>
              <p className="text-xs text-gray-500 mt-2">
                Hãy cung cấp phản hồi chi tiết để Điều dưỡng trưởng khoa <strong>{selectedDeptForApproval}</strong> nắm được lý do và tiến hành điều chỉnh.
              </p>

              <textarea
                id="reject-feedback-textarea"
                required
                rows={4}
                placeholder="Nhập lý do bác bỏ... ví dụ: Lịch ngày chủ nhật 15/03 bị thiếu hụt điều dưỡng đi làm, cần bổ sung thêm nhân lực..."
                value={rejectionFeedback}
                onChange={(e) => setRejectionFeedback(e.target.value)}
                className="w-full mt-4 p-3 border border-gray-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-rose-500 focus:outline-hidden"
              />

              <div className="flex items-center justify-end gap-2 mt-5">
                <button
                  id="btn-cancel-reject"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionFeedback('');
                  }}
                  className="px-4 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold cursor-pointer text-gray-600"
                >
                  Hủy bỏ
                </button>
                <button
                  id="btn-confirm-reject"
                  onClick={() => {
                    if (rejectionFeedback.trim()) {
                      onUpdateStatus(selectedDeptForApproval, 'REJECTED', rejectionFeedback);
                      setShowRejectModal(false);
                      setRejectionFeedback('');
                    } else {
                      alert('Vui lòng điền phản hồi đầy đủ trước khi gửi!');
                    }
                  }}
                  className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold border border-rose-700 cursor-pointer shadow-xs"
                >
                  Gửi yêu cầu chỉnh sửa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom elegant confirmation overlay modal to replace browser window.confirm */}
      {customConfirm && (
        <div className="fixed inset-0 z-100 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-sm w-full overflow-hidden animate-scale-up text-left">
            <div className="p-5">
              <h3 className="text-sm font-bold text-gray-900 border-b border-gray-150 pb-2.5 uppercase tracking-wide flex items-center gap-2">
                <AlertTriangle className="text-amber-500 w-4 h-4 shrink-0 animate-pulse" />
                {customConfirm.title}
              </h3>
              <p className="text-xs text-gray-600 mt-3 font-medium leading-relaxed">
                {customConfirm.message}
              </p>
              
              <div className="flex items-center justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setCustomConfirm(null)}
                  className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 font-bold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    customConfirm.onConfirm();
                  }}
                  className="px-3.5 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-md font-black cursor-pointer shadow-xs border border-rose-700"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration of symbols and legends Modal */}
      {showSymbolsConfig && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up text-left">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 to-indigo-800 text-white flex items-center justify-between sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-2 text-left">
                <Sliders className="w-5 h-5 text-indigo-200" />
                <h3 className="font-sans font-black text-sm uppercase tracking-wider">
                  CẤU HÌNH KÝ HIỆU QUY ƯỚC LẬP LỊCH TRỰC
                </h3>
              </div>
              <button
                onClick={() => setShowSymbolsConfig(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 px-2 py-1 rounded-md text-sm font-bold cursor-pointer transition-colors"
                type="button"
              >
                Đóng ×
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-slate-705 text-xs">
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3.5 text-[11px] text-indigo-900 leading-relaxed text-left">
                📢 <strong>Hướng dẫn dành cho Quản trị viên:</strong> Bạn có thể thay đổi ký tự hiển thị (Ký hiệu viết tắt) hoặc chỉnh sửa Mô tả giải thích tương ứng với mỗi mã ca trực trong hệ thống. Lưới hiển thị, cẩm nang giới thiệu và tính năng gõ nhanh siêu tốc sẽ tự động cập nhật theo cấu hình mới này.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {editingSymbols.map((sym, idx) => (
                  <div key={sym.code || 'clear'} className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 flex flex-col gap-2 shadow-xs">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5 justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-extrabold shadow-3xs ${sym.color}`}>
                          {sym.label || '—'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Mã gốc: <span className="font-mono bg-slate-200/85 px-1 py-0.5 rounded text-neutral-800">{sym.code || 'Trống/Xóa'}</span>
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 italic">Thứ tự {idx + 1}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Ký hiệu
                        </label>
                        <input
                          type="text"
                          maxLength={5}
                          value={sym.label}
                          onChange={(e) => {
                            const newEditing = [...editingSymbols];
                            newEditing[idx] = { ...sym, label: e.target.value };
                            setEditingSymbols(newEditing);
                          }}
                          className="w-full text-xs font-black text-center p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                          placeholder="Mã..."
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Giải thích mô tả
                        </label>
                        <input
                          type="text"
                          value={sym.desc}
                          onChange={(e) => {
                            const newEditing = [...editingSymbols];
                            newEditing[idx] = { ...sym, desc: e.target.value };
                            setEditingSymbols(newEditing);
                          }}
                          className="w-full text-xs font-semibold p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                          placeholder="Mô tả..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between sticky bottom-0 z-10 shrink-0">
              <button
                type="button"
                onClick={() => {
                  confirmAction(
                    "Xác nhận khôi phục mặc định",
                    "Bạn có chắc chắn muốn khôi phục toàn bộ ký hiệu về giá trị ban đầu?",
                    () => {
                      const defaultSymbols = [
                        { code: 'X', label: 'X', desc: 'Làm cả ngày (1.0)', color: 'bg-emerald-100 text-emerald-800 font-bold border-emerald-300' },
                        { code: 'X/2', label: 'X/2', desc: 'Làm nửa ngày (0.5)', color: 'bg-emerald-50 text-emerald-700 font-bold border-emerald-200' },
                        { code: 'S', label: 'S', desc: 'Làm sáng (0.5)', color: 'bg-teal-50 text-teal-700 font-bold border-teal-200' },
                        { code: 'C', label: 'C', desc: 'Làm chiều (0.5)', color: 'bg-cyan-50 text-cyan-700 font-bold border-cyan-200' },
                        { code: '0', label: '0', desc: 'Nghỉ cả ngày', color: 'bg-rose-100 text-rose-800 font-bold border-rose-300' },
                        { code: 'H', label: 'H', desc: 'Đi học chuyên nghiệp', color: 'bg-amber-100 text-amber-800 font-bold border-amber-300' },
                        { code: 'KL', label: 'KL', desc: 'Nghỉ không lương', color: 'bg-gray-100 text-gray-700 font-semibold border-gray-300' },
                        { code: 'TS', label: 'TS', desc: 'Nghỉ thai sản', color: 'bg-purple-100 text-purple-800 font-bold border-purple-300' },
                        { code: 'P', label: 'P', desc: 'Nghỉ phép năm (cộng phép)', color: 'bg-pink-100 text-pink-800 font-bold border-pink-300' },
                        { code: '', label: 'Xóa', desc: 'Chưa xếp lịch', color: 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50' }
                      ];
                      localStorage.setItem('song_thuong_convention_symbols_v1', JSON.stringify(defaultSymbols));
                      setSymbols(defaultSymbols);
                      setShowSymbolsConfig(false);
                    }
                  );
                }}
                className="px-3 py-1 border border-rose-300 hover:bg-rose-50 text-rose-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
              >
                Khôi phục mặc định
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSymbolsConfig(false)}
                  className="px-4 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const invalid = editingSymbols.some(s => s.code && !s.label.trim());
                    if (invalid) {
                      alert('Vui lòng không để trống bất kỳ ký tự viết tắt nào!');
                      return;
                    }
                    localStorage.setItem('song_thuong_convention_symbols_v1', JSON.stringify(editingSymbols));
                    setSymbols(editingSymbols);
                    setShowSymbolsConfig(false);
                  }}
                  className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black tracking-wide shadow-md transition-all cursor-pointer border border-indigo-700"
                >
                  Lưu cấu hình
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Comprehensive Chief Nurse Operations Guide Modal */}
      {showChiefNurseGuide && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-blue-800 text-white flex items-center justify-between sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-300 animate-pulse" />
                <h3 className="font-sans font-black text-sm uppercase tracking-wider">
                  CẨM NANG THAO TÁC TOÀN DIỆN CHO ĐIỀU DƯỠNG TRƯỞNG KHOA
                </h3>
              </div>
              <button
                onClick={() => setShowChiefNurseGuide(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 px-2 py-1 rounded-md text-sm font-bold cursor-pointer transition-colors"
                type="button"
              >
                Đóng ×
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5.5 text-slate-700 text-xs leading-relaxed">
              
              {/* Introduction */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3.5 flex gap-3 text-[11px] text-blue-900">
                <div className="text-xl shrink-0">👩‍⚕️</div>
                <div>
                  Chào mừng <strong>Điều dưỡng Trưởng khoa</strong>! Đây là tài liệu hướng dẫn nhanh giúp bạn làm chủ 100% công cụ sắp xếp lịch làm việc, đăng ký nhân lực, cân đối ngày công, quản lý hồ sơ nhân viên và nộp duyệt lịch chính xác tại viện.
                </div>
              </div>

              {/* Step 1 */}
              <div>
                <h4 className="font-bold text-slate-900 border-l-3 border-blue-600 pl-2 mb-2 uppercase tracking-wide">
                  1. NHẬP LIỆU SIÊU TỐC BẰNG BÀN PHÍM (SPEED-TYPING)
                </h4>
                <p className="mb-2 text-[11px]">
                  Thay vì click chuột từng ô mất thời gian, bạn hãy click vào ô ngày đầu tiên của một nhân viên, sau đó gõ một trong các ký tự viết tắt bên dưới. Hệ thống sẽ áp dụng mã ca và <strong>tự động chuyển sang ngày tiếp theo bên phải</strong>:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {symbols.filter(sym => sym.code).map(sym => (
                    <div key={sym.code} className="flex items-center gap-2 p-1.5 border border-slate-100 rounded bg-slate-50">
                      <span className={`w-6 h-6 rounded font-extrabold flex items-center justify-center text-[10px] shadow-xs shrink-0 ${
                        sym.code === 'X' ? 'bg-blue-600 text-white' :
                        sym.code === 'X/2' ? 'bg-orange-400 text-white' :
                        sym.code === 'S' ? 'bg-amber-500 text-white' :
                        sym.code === 'C' ? 'bg-indigo-500 text-white' :
                        sym.code === '0' ? 'bg-red-500 text-white' :
                        sym.code === 'H' ? 'bg-purple-500 text-white' :
                        sym.code === 'KL' ? 'bg-gray-500 text-white' :
                        sym.code === 'TS' ? 'bg-pink-500 text-white' :
                        'bg-emerald-600 text-white'
                      }`}>{sym.label}</span>
                      <span className="text-[10px] font-bold text-slate-700 truncate" title={sym.desc}>{sym.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <h4 className="font-bold text-slate-900 border-l-3 border-blue-600 pl-2 mb-2 uppercase tracking-wide">
                  2. QUẢN LÝ THÀNH VIÊN VÀ CHUYÊN NGÀNH KHÓA
                </h4>
                <div className="space-y-2">
                  <div className="flex gap-2.5">
                    <span className="w-4 h-4 bg-blue-105 text-blue-700 rounded-full flex items-center justify-center font-bold text-[10px] mt-0.5 shrink-0">1</span>
                    <p>
                      <strong>Thêm nhân sự:</strong> Nhấp vào nút <strong>"+ Thêm nhân viên mới"</strong> ở thanh hành động bên trên. Nhập Họ và tên, chọn Giới tính, ghi nhận Chuyên ngành phụ chuyên biệt (ví dụ: CNĐD, CĐĐD,...), và tùy chọn bật "Là Trưởng Tu/Trưởng Khoa" để đưa nhân viên vào hệ thống dữ liệu phòng.
                    </p>
                  </div>
                  <div className="flex gap-2.5">
                    <span className="w-4 h-4 bg-blue-105 text-blue-700 rounded-full flex items-center justify-center font-bold text-[10px] mt-0.5 shrink-0">2</span>
                    <p>
                      <strong>Xóa nhân sự khỏi khoa:</strong> Đưa chuột lướt vào khu vực <strong>"STT / Học và tên"</strong> của nhân viên cần gỡ trên lưới. Biểu tượng <strong>Thùng rác màu đỏ 🗑️</strong> sẽ hiển thị nhanh ở góc trái cùng. Khi nhấp chọn, hệ thống sẽ xác nhận rồi tiến hành loại trừ nhân sự đó.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div>
                <h4 className="font-bold text-slate-900 border-l-3 border-blue-600 pl-2 mb-2 uppercase tracking-wide">
                  3. NỘP CHUẨN DUYỆT LỊCH KHOA HÀNG THÁNG
                </h4>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 relative overflow-hidden mb-2">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-[10px]">
                    <div className="p-1.5 bg-white rounded border border-slate-200">
                      <span className="text-[8px] text-slate-400 font-bold block uppercase leading-none">B1</span>
                      <strong className="text-slate-800 leading-tight">LẬP BẢN NHÁP</strong>
                      <p className="text-[9px] text-slate-550 mt-1">Sổ trạng thái "Nháp". Sửa đổi tự do, chưa gửi báo cáo.</p>
                    </div>
                    <div className="p-1.5 bg-white rounded border border-slate-200">
                      <span className="text-[8px] text-slate-400 font-bold block uppercase leading-none">B2</span>
                      <strong className="text-blue-600 leading-tight">NỘP LÊN VIỆN</strong>
                      <p className="text-[9px] text-slate-550 mt-1">Bấm nút "Nộp lịch gửi Phòng Điều dưỡng" để báo hoàn tất.</p>
                    </div>
                    <div className="p-1.5 bg-white rounded border border-slate-200">
                      <span className="text-[8px] text-slate-400 font-bold block uppercase leading-none">B3</span>
                      <strong className="text-amber-600 leading-tight">CHỜ PHÊ DUYỆT</strong>
                      <p className="text-[9px] text-slate-550 mt-1">Lãnh đạo hoặc Trưởng phòng ĐD vào xem xét & thẩm định.</p>
                    </div>
                    <div className="p-1.5 bg-white rounded border border-slate-200">
                      <span className="text-[8px] text-slate-400 font-bold block uppercase leading-none">B4</span>
                      <strong className="text-emerald-600 leading-tight">ĐÃ PHÊ DUYỆT</strong>
                      <p className="text-[9px] text-slate-550 mt-1">Hệ thống chuyển trạng thái "Đã duyệt" và khóa sửa đổi.</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-[10px] text-rose-700 bg-rose-50/70 p-2 border border-rose-100 rounded">
                  <AlertTriangle className="w-3.5 h-3.5 flex-none mt-0.5" />
                  <div>
                    <strong>Xử lý khi bị từ chối phê duyệt:</strong> Nếu lịch không hợp lý, Trưởng phòng Điều dưỡng sẽ chuyển trạng thái về <strong>"Từ Chối - Chờ Sửa"</strong> kèm dòng phản hồi lý do ở phần thông báo đỏ. Bạn hãy tiến hành điều chỉnh đúng yêu cầu rồi bấm lại nút cập nhật nộp lại lịch làm việc.
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div>
                <h4 className="font-bold text-slate-900 border-l-3 border-blue-600 pl-2 mb-2 uppercase tracking-wide">
                  4. ĐỐI SOÁT CHỈ TIÊU & NHẬP XUẤT PHÁP LÝ
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 text-[11px]">📊 Chỉ số tự động tính toán:</p>
                    <p className="text-[10px] text-slate-600">
                      Để mắt đến cột <strong>"TỔNG CÔNG"</strong> và <strong>"CỘNG PHÉP"</strong> nằm sát bên phải của dòng. Hệ thống tự động đếm tổng số ngày làm việc tương ứng của từng ca làm việc cụ thể theo thời gian thực để hỗ trợ đối chiếu công lương.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 text-[11px]">📥 Tải về Excel Mẫu ban hành:</p>
                    <p className="text-[10px] text-slate-600">
                      Nhấp nút xuất bảng <strong>"Tải về Excel Mẫu"</strong> để nhận ngay bản ghi phân công làm việc chuẩn mẫu Excel chính xác nhất, phục vụ việc in ấn lưu file cứng tại phòng khoa nhanh chóng.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex items-center justify-between sticky bottom-0 z-10 shrink-0">
              <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                Y Tế Sông Thương • Lịch Giao Trực Khoa v2.5
              </span>
              <button
                id="btn-close-chief-nurse-guide"
                onClick={() => setShowChiefNurseGuide(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm text-xs cursor-pointer transition-colors"
                type="button"
              >
                Đã hiểu, Bắt đầu làm việc!
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Dynamic Excel Importer Modal */}
      {showExcelImport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-up text-left">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 to-emerald-800 text-white flex items-center justify-between sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-emerald-200" />
                <h3 className="font-sans font-black text-sm uppercase tracking-wider">
                  NHẬP LỊCH LÀM VIỆC HÀNG LOẠT TỪ EXCEL
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowExcelImport(false);
                  setExcelFile(null);
                  setExcelParsedData(null);
                  setExcelImportError(null);
                }}
                className="text-white/80 hover:text-white hover:bg-white/10 px-2 py-1 rounded-md text-sm font-bold cursor-pointer transition-colors"
                type="button"
              >
                Đóng ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs text-slate-700">
              {/* Export template option */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="text-left w-full sm:w-auto">
                  <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                    TẢI FILE EXCEL MẪU ĐỊNH DẠNG CHUẨN
                  </p>
                  <p className="text-[10.5px] text-slate-500 mt-0.5 leading-normal">
                    Hệ thống tự động biên soạn danh sách nhân sự & số ngày trong <b>Tháng {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}</b> thành file Excel mẫu đồng bộ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => exportExcelTemplate(departmentSchedules, staffList, selectedMonth)}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-850 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <FileDown className="w-4 h-4 text-emerald-100 shrink-0" />
                  <span>Tải file Excel mẫu</span>
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-[11px] text-emerald-950 leading-relaxed">
                <p className="font-bold mb-1">Cấu trúc file mẫu được khuyến nghị:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Lịch làm việc sẽ được nạp trực tiếp vào <b>Tháng {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}</b>.</li>
                  <li>Cột <b>C (Họ và Tên)</b> chứa họ và tên nhân viên chính xác như trên hệ thống.</li>
                  <li>Cột bắt đầu từ cột <b>F (Ngày 01)</b> đến ngày cuối cùng của tháng (01, 02, 03...).</li>
                  <li>Các ký tự quy ước: <b>X</b> (làm cả ngày), <b>0</b> (nghỉ), <b>P</b> (phép), <b>S</b> (sáng), <b>C</b> (chiều), <b>TS</b> (thai sản), <b>KL</b> (không lương)...</li>
                  <li>Hệ thống sẽ đối chiếu tên nhân viên và cập nhật toàn bộ ô ca làm việc tương ứng.</li>
                </ul>
              </div>

              {/* Upload drag-n-drop */}
              <div className="border-2 border-dashed border-emerald-200 rounded-xl p-6 bg-emerald-50/20 text-center relative hover:bg-emerald-50/40 transition-all">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setExcelFile(file);
                      setExcelImportError(null);
                      setExcelParsedData(null);
                      handleProcessExcel(file);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <FileUp className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <p className="font-semibold text-emerald-950 text-[13px]">
                  Kéo thả file Excel (.xlsx hoặc .xls) vào đây hoặc click để chọn file
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Dung lượng tối đa 10MB
                </p>
              </div>

              {/* Error messages */}
              {excelImportError && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl flex items-start gap-2 text-[11px]">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Đã xảy ra lỗi khi đọc file:</p>
                    <p className="mt-1">{excelImportError}</p>
                  </div>
                </div>
              )}

              {/* Processing Spinner */}
              {excelIsProcessing && (
                <div className="py-8 text-center text-slate-500">
                  <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="font-semibold">Đang đọc dữ liệu bảng ca Excel...</p>
                </div>
              )}

              {/* File details */}
              {excelFile && !excelIsProcessing && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800 text-[11px] truncate max-w-[300px]">{excelFile.name}</p>
                      <p className="text-[10px] text-slate-500">{(excelFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setExcelFile(null);
                      setExcelParsedData(null);
                      setExcelImportError(null);
                    }}
                    className="text-slate-400 hover:text-rose-600 text-[10px] font-bold py-1 px-2 hover:bg-rose-50 rounded-lg cursor-pointer animate-scale-up"
                    type="button"
                  >
                    Gỡ bỏ
                  </button>
                </div>
              )}

              {/* Parsed results review */}
              {excelParsedData && !excelIsProcessing && (
                <div className="space-y-3">
                  <p className="font-bold text-slate-800 text-[12px] flex items-center gap-1">
                    <span>Kết quả tìm kiếm và đối chiếu:</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                      {excelParsedData.length} nhân sự phù hợp
                    </span>
                  </p>
                  
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[220px] overflow-y-auto bg-white">
                    {excelParsedData.map((item, idx) => (
                      <div key={idx} className="p-3 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-900 text-[11.5px]">{item.staff.name}</p>
                          <p className="text-[10px] text-slate-500">
                            Khoa: <span className="font-semibold text-slate-700">{item.department}</span> • Trình độ: {item.staff.major}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9.5px] ${
                            item.changesCount > 0 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                              : 'bg-slate-150 text-slate-500 border border-slate-200'
                          }`}>
                            {item.changesCount > 0 ? `Có ${item.changesCount} ngày đổi ca` : 'Trùng khớp / Không thay đổi'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between sticky bottom-0 z-10 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowExcelImport(false);
                  setExcelFile(null);
                  setExcelParsedData(null);
                  setExcelImportError(null);
                }}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              
              <button
                type="button"
                disabled={!excelParsedData || excelParsedData.length === 0}
                onClick={handleSaveImport}
                className={`px-5 py-2 text-white rounded-xl text-xs font-black tracking-wide shadow-md transition-all cursor-pointer border flex items-center gap-1.5 ${
                  excelParsedData && excelParsedData.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700'
                    : 'bg-slate-300 border-slate-300 cursor-not-allowed opacity-50'
                }`}
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>Nạp lịch vào hệ thống</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Info Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-100 max-w-md w-full shadow-2xl p-6 relative">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 uppercase tracking-wide flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-blue-600" />
              <span>Chỉnh sửa thông tin nhân viên</span>
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editStaffName.trim()) {
                  alert('Vui lòng nhập tên nhân viên');
                  return;
                }
                onUpdateStaff?.(originalStaffDept, editingStaff.id, {
                  name: editStaffName.trim(),
                  gender: editStaffGender,
                  major: editStaffMajor,
                  isChief: editStaffIsChief
                }, editStaffDept);
                setEditingStaff(null);
              }}
              className="mt-4 flex flex-col gap-4"
            >
              {/* Name field */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Họ và tên</label>
                <input
                  id="edit-staff-name-input"
                  type="text"
                  value={editStaffName}
                  onChange={(e) => setEditStaffName(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800"
                  placeholder="Nhập tên nhân viên"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Gender select */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Giới tính</label>
                  <select
                    id="edit-staff-gender-select"
                    value={editStaffGender}
                    onChange={(e) => setEditStaffGender(e.target.value as 'Nam' | 'Nữ')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>

                {/* Major select */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Trình độ chuyên môn</label>
                  {isAddingCustomMajorEdit ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={customMajorInputEdit}
                        onChange={(e) => setCustomMajorInputEdit(e.target.value)}
                        placeholder="Nhập chuyên môn mới..."
                        className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-slate-800 flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomMajorSubmit('edit');
                          }
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCustomMajorSubmit('edit')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2.5 py-2 rounded-lg cursor-pointer transition-colors"
                      >
                        Lưu
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCustomMajorEdit(false);
                          setCustomMajorInputEdit('');
                        }}
                        className="bg-gray-400 hover:bg-gray-500 text-white font-bold text-[10px] px-2.5 py-2 rounded-lg cursor-pointer transition-colors"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <select
                      id="edit-staff-major-select"
                      value={editStaffMajor}
                      onChange={(e) => {
                        if (e.target.value === 'ADD_NEW') {
                          setIsAddingCustomMajorEdit(true);
                          setCustomMajorInputEdit('');
                        } else {
                          setEditStaffMajor(e.target.value);
                        }
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
                    >
                      {allMajors.map((m) => (
                        <option key={m.code} value={m.code}>{m.label}</option>
                      ))}
                      <option value="ADD_NEW">+ Thêm chuyên môn mới...</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Department transfer option for Admin */}
              {currentRole === 'ADMIN' && (
                <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg flex flex-col gap-1.5">
                  <label htmlFor="edit-staff-dept-transfer-select" className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                    Điều chuyển Khoa / Phòng Công tác
                  </label>
                  <select
                    id="edit-staff-dept-transfer-select"
                    value={editStaffDept}
                    onChange={(e) => setEditStaffDept(e.target.value as Department)}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white text-slate-800 cursor-pointer"
                  >
                    {Object.keys(staffList).map((dept) => (
                      <option key={dept} value={dept}>Khoa {dept}</option>
                    ))}
                  </select>
                  <p className="text-[9.5px] text-blue-600 leading-tight">
                    * Quyền Admin: Chọn khoa/phòng khác để điều chuyển nhân viên này. Toàn bộ lịch làm việc đã đăng ký của họ cũng sẽ tự động được bàn giao đầy đủ.
                  </p>
                </div>
              )}

              {/* Chief Status block */}
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg flex items-center justify-between">
                <div className="flex flex-col flex-1 pr-2">
                  <span className="text-xs font-bold text-slate-800">Cương vị lãnh đạo (ĐD Trưởng)</span>
                  <span className="text-[10px] text-slate-500">
                    {currentRole === 'ADMIN' || currentRole === 'HEAD_OF_NURSING'
                      ? "Bôi hồng & phân bổ ở đầu bảng của khoa"
                      : "Chỉ Phòng Điều dưỡng hoặc Admin mới được thay đổi"
                    }
                  </span>
                </div>
                <input
                  id="edit-staff-chief-checkbox"
                  type="checkbox"
                  checked={editStaffIsChief}
                  disabled={currentRole !== 'ADMIN' && currentRole !== 'HEAD_OF_NURSING'}
                  onChange={(e) => setEditStaffIsChief(e.target.checked)}
                  className={`w-4 h-4 text-pink-600 rounded-md border-gray-300 focus:ring-pink-500 ${
                    currentRole !== 'ADMIN' && currentRole !== 'HEAD_OF_NURSING' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5 mt-2">
                <button
                  id="btn-edit-staff-cancel"
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="flex-1 border border-gray-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer text-center"
                >
                  Bỏ qua
                </button>
                <button
                  id="btn-edit-staff-submit"
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer text-center shadow-xs"
                >
                  Cập nhật thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Management and Directory Modal */}
      {showStaffManagementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-150 max-w-4xl w-full shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-600" />
                <span>Trang Quản Lý Nhân Viên Khoa Phòng</span>
              </h3>
              <button
                onClick={() => setShowStaffManagementModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1 hover:bg-slate-100 rounded-full cursor-pointer text-sm transition-colors w-7 h-7 flex items-center justify-center border border-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Department Filter & Search Bar */}
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 mb-4 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Đang quản lý khoa:</span>
                  {currentRole === 'ADMIN' || currentRole === 'HEAD_OF_NURSING' ? (
                    <select
                      id="manage-staff-dept-select"
                      value={manageDept}
                      onChange={(e) => setManageDept(e.target.value as Department)}
                      className="px-3 py-1 text-xs border border-gray-300 rounded-lg font-bold text-slate-800 bg-white cursor-pointer"
                    >
                      {Object.keys(staffList).map((dept) => (
                        <option key={dept} value={dept}>Khoa {dept}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs bg-slate-200 text-slate-800 border border-slate-300 rounded-md py-1 px-3 font-extrabold">
                      Khoa {manageDept}
                    </span>
                  )}
                </div>

                {/* Add new department tool for Admin / Head of Nursing */}
                {(currentRole === 'ADMIN' || currentRole === 'HEAD_OF_NURSING') && (
                  <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3 md:pl-4">
                    <input
                      type="text"
                      placeholder="Nhập tên khoa, phòng mới..."
                      id="new-dept-input"
                      className="px-2 py-1 text-xs border border-gray-300 rounded-lg font-semibold text-slate-800 bg-white max-w-[170px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val && onAddDepartment) {
                            onAddDepartment(val);
                            setManageDept(val);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('new-dept-input') as HTMLInputElement;
                        const val = input?.value.trim();
                        if (!val) {
                          alert('Vui lòng nhập tên khoa, phòng mới');
                          return;
                        }
                        if (onAddDepartment) {
                          onAddDepartment(val);
                          setManageDept(val);
                          if (input) input.value = '';
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-2.5 py-1 rounded-lg cursor-pointer transition-colors shadow-3xs"
                    >
                      + Thêm khoa
                    </button>
                  </div>
                )}
              </div>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  id="manage-staff-search"
                  type="text"
                  placeholder="Tìm nhân viên trong khoa..."
                  value={manageSearch}
                  onChange={(e) => setManageSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-sky-500 text-slate-900"
                />
              </div>
            </div>

            {/* Main Grid: Left Side (Add Staff Form) - Right Side (Current List) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden flex-1 min-h-0">
              
              {/* Left Column (Add Staff Form): Takes 5 cols */}
              <div className="md:col-span-5 bg-slate-50 border border-dashed border-gray-200 p-4 flex flex-col justify-between overflow-y-auto rounded-xl">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3 pb-1 border-b border-gray-200 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 bg-emerald-100 text-emerald-600 rounded-full p-0.5" />
                    <span>Thêm nhân viên mới</span>
                  </h4>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newStaffName.trim()) {
                        alert('Vui lòng nhập họ tên nhân viên mới');
                        return;
                      }
                      onAddStaff(manageDept, newStaffName.trim(), newStaffGender, newStaffMajor, newStaffIsChief);
                      setNewStaffName('');
                      setNewStaffIsChief(false);
                      alert(`Đã thêm nhân viên ${newStaffName.trim()} vào khoa ${manageDept} thành công!`);
                    }}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Họ và Tên</label>
                      <input
                        id="new-staff-modal-name"
                        type="text"
                        required
                        placeholder="Nhập họ và tên cần thêm..."
                        value={newStaffName}
                        onChange={(e) => setNewStaffName(e.target.value)}
                        className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-sky-500 text-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Giới tính</label>
                        <select
                          id="new-staff-modal-gender"
                          value={newStaffGender}
                          onChange={(e) => setNewStaffGender(e.target.value as 'Nam' | 'Nữ')}
                          className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold bg-white text-slate-800"
                        >
                          <option value="Nữ">Nữ</option>
                          <option value="Nam">Nam</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Chuyên môn</label>
                        {isAddingCustomMajorNew ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={customMajorInputNew}
                              onChange={(e) => setCustomMajorInputNew(e.target.value)}
                              placeholder="Nhập chuyên môn mới..."
                              className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-slate-800 bg-white flex-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddCustomMajorSubmit('new');
                                }
                              }}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleAddCustomMajorSubmit('new')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                            >
                              Lưu
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingCustomMajorNew(false);
                                setCustomMajorInputNew('');
                              }}
                              className="bg-gray-400 hover:bg-gray-500 text-white font-bold text-[10px] px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <select
                            id="new-staff-modal-major"
                            value={newStaffMajor}
                            onChange={(e) => {
                              if (e.target.value === 'ADD_NEW') {
                                setIsAddingCustomMajorNew(true);
                                setCustomMajorInputNew('');
                              } else {
                                setNewStaffMajor(e.target.value);
                              }
                            }}
                            className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold bg-white text-slate-800"
                          >
                            {allMajors.map((m) => (
                              <option key={m.code} value={m.code}>{m.label}</option>
                            ))}
                            <option value="ADD_NEW">+ Thêm chuyên môn mới...</option>
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Chief Coach Row */}
                    <div className="bg-slate-100 border border-slate-200/60 p-3 rounded-lg flex items-center justify-between mt-1">
                      <div className="flex flex-col flex-1 pr-2">
                        <span className="text-[11px] font-bold text-slate-800">Là điều dưỡng trưởng khoa</span>
                        <span className="text-[9.5px] text-slate-500 leading-tight">
                          {currentRole === 'ADMIN' || currentRole === 'HEAD_OF_NURSING'
                            ? "Bôi hồng & phân bổ ở đầu bảng của khoa"
                            : "Chỉ Phòng Điều dưỡng hoặc Admin mới được phân chức danh này"
                          }
                        </span>
                      </div>
                      <input
                        id="new-staff-modal-chief"
                        type="checkbox"
                        checked={newStaffIsChief}
                        disabled={currentRole !== 'ADMIN' && currentRole !== 'HEAD_OF_NURSING'}
                        onChange={(e) => setNewStaffIsChief(e.target.checked)}
                        className={`w-4 h-4 text-pink-600 rounded-md border-gray-300 ${
                          currentRole !== 'ADMIN' && currentRole !== 'HEAD_OF_NURSING' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg transition-all cursor-pointer shadow-sm text-center"
                    >
                      + Thêm nhân sự vào khoa
                    </button>
                  </form>
                </div>

                {/* Info Tip block */}
                <div className="mt-4 p-3 bg-blue-55 border border-blue-100 rounded-lg text-[10.5px] text-blue-800 leading-relaxed font-medium">
                  <strong>Chú ý phân quyền:</strong> Chỉ tài khoản của <span className="font-bold underline text-blue-900">Phòng điều dưỡng</span> hoặc <span className="font-bold underline text-blue-900">Admin tối cao</span> mới có đặc quyền gỡ bỏ nhân viên hoặc bổ nhiệm <strong>Điều dưỡng trưởng khoa</strong>.
                </div>
              </div>

              {/* Right Column (Staff list of manageDept): Takes 7 cols */}
              <div className="md:col-span-7 flex flex-col min-h-0 overflow-y-auto">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-sky-600" />
                  <span>Danh sách nhân sự Khoa ({staffList[manageDept]?.length || 0} người)</span>
                </h4>

                <div className="border border-gray-150 rounded-xl overflow-hidden bg-white flex-1 min-h-[300px] flex flex-col">
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-gray-200">
                          <th className="p-2.5 pl-4">Họ và Tên</th>
                          <th className="p-2.5">Giới tính</th>
                          <th className="p-2.5">Trình độ</th>
                          <th className="p-2.5 pr-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(() => {
                          const list = staffList[manageDept] || [];
                          const filtered = list.filter(s =>
                            s.name.toLowerCase().includes(manageSearch.toLowerCase()) ||
                            s.major.toLowerCase().includes(manageSearch.toLowerCase())
                          );
                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan={4} className="p-8 text-center text-xs text-gray-400 font-medium">
                                  Không tìm thấy nhân viên nào khớp yêu cầu.
                                </td>
                              </tr>
                            );
                          }
                          return filtered.map(s => (
                            <tr key={s.id} className={`text-xs hover:bg-slate-50 transition-all ${s.isChief ? 'bg-pink-50/30' : ''}`}>
                              <td className="p-2.5 pl-4 font-semibold text-slate-900">
                                <div className="flex items-center gap-1.5">
                                  <span>{s.name}</span>
                                  {s.isChief && (
                                    <span className="text-[8px] bg-pink-100 text-pink-850 px-1 py-0.5 rounded font-extrabold uppercase">
                                      ĐD Trưởng
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2.5 text-gray-500 font-medium">{s.gender}</td>
                              <td className="p-2.5 text-slate-600 font-mono text-[10.5px]">{s.major}</td>
                              <td className="p-2.5 pr-4 text-right">
                                <div className="inline-flex gap-2">
                                  {/* Edit Button */}
                                  <button
                                    id={`modal-edit-${s.id}`}
                                    onClick={() => {
                                      setEditingStaff(s);
                                      setEditStaffName(s.name);
                                      setEditStaffGender(s.gender);
                                      setEditStaffMajor(s.major);
                                      setEditStaffIsChief(!!s.isChief);
                                      setEditStaffDept(manageDept);
                                      setOriginalStaffDept(manageDept);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded border border-blue-200 transition-all font-bold text-[10px]"
                                    title="Sửa thông tin"
                                  >
                                    Cập nhật
                                  </button>

                                  {/* Delete Button */}
                                  {currentRole === 'ADMIN' || currentRole === 'HEAD_OF_NURSING' ? (
                                    <button
                                      id={`modal-delete-${s.id}`}
                                      onClick={() => {
                                        confirmAction(
                                          "Xác nhận xóa nhân sự",
                                          `Bạn có chắc chắn muốn xóa nhân sự ${s.name} khỏi danh sách khoa? Mọi lịch công tác của họ sẽ bị thu hồi!`,
                                          () => {
                                            onRemoveStaff(manageDept, s.id);
                                          }
                                        );
                                      }}
                                      className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded border border-rose-200 transition-all font-bold text-[10px]"
                                      title="Xóa nhân sự trực tiếp"
                                    >
                                      Xóa
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled
                                      className="text-gray-300 border border-gray-200 px-2 py-1 rounded cursor-not-allowed opacity-50 font-bold text-[10px]"
                                      title="Chỉ Admin hoặc Phòng điều dưỡng mới được xóa"
                                    >
                                      Khóa xóa
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>

            {/* Footer buttons */}
            <div className="border-t border-gray-100 pt-3 mt-4 text-right">
              <button
                onClick={() => setShowStaffManagementModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-5 py-2 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Hoàn tất quản lý
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
