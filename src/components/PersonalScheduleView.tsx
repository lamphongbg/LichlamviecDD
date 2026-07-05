import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Clock, Filter, LogOut, CheckCircle2, 
  XCircle, BookOpen, Sparkles, Baby, FileText, 
  LayoutGrid, ListTodo, ChevronLeft, ChevronRight, AlertCircle, Bookmark,
  Download, Smartphone
} from 'lucide-react';
import { AuthUser, DepartmentSchedule, DaySchedule, ScheduleCode, Staff } from '../types';
import { getVietnameseHoliday } from '../initialData';

interface PersonalScheduleViewProps {
  currentUser: AuthUser;
  departmentSchedules: DepartmentSchedule[];
  onLogout: () => void;
  staffList: Record<string, Staff[]>;
}

// Map schedule codes to Vietnamese details, weights, and colors
const SCHEDULE_META: Record<ScheduleCode, { 
  label: string; 
  sub: string;
  weight: number; 
  bg: string; 
  text: string; 
  border: string; 
}> = {
  'X': { label: 'Cả ngày', sub: 'Làm việc cả ngày', weight: 1.0, bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  'X/2': { label: 'Nửa ngày', sub: 'Làm việc 0.5 ngày', weight: 0.5, bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  'S': { label: 'Sáng', sub: 'Làm việc ca Sáng', weight: 0.5, bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
  'C': { label: 'Chiều', sub: 'Làm việc ca Chiều', weight: 0.5, bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  'Đ': { label: 'Trực đêm', sub: 'Trực đêm (12h)', weight: 1.0, bg: 'bg-indigo-950/40 text-indigo-300', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  'T': { label: 'Trực 24h', sub: 'Trực liên tục 24h', weight: 1.0, bg: 'bg-purple-950/40 text-purple-300', text: 'text-purple-400', border: 'border-purple-500/30' },
  '0': { label: 'Nghỉ', sub: 'Nghỉ ca ngày', weight: 0.0, bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/15' },
  'O': { label: 'Nghỉ', sub: 'Nghỉ ca ngày (O)', weight: 0.0, bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/15' },
  'H': { label: 'Đi học', sub: 'Đi học tập huấn', weight: 0.0, bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  'KL': { label: 'Không lương', sub: 'Nghỉ không lương', weight: 0.0, bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  'TS': { label: 'Thai sản', sub: 'Nghỉ thai sản', weight: 0.0, bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  'P': { label: 'Phép năm', sub: 'Nghỉ phép hưởng lương', weight: 0.0, bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  '': { label: 'Chưa đăng ký', sub: 'Chưa có thông tin trực', weight: 0.0, bg: 'bg-gray-500/5', text: 'text-gray-400', border: 'border-gray-500/10' }
};

export default function PersonalScheduleView({ 
  currentUser, 
  departmentSchedules, 
  onLogout,
  staffList
}: PersonalScheduleViewProps) {
  const [selectedMonth, setSelectedMonth] = useState('2026-03');
  const [viewMode, setViewMode] = useState<'TIMELINE' | 'WEEKLY'>('TIMELINE');
  const [showOnlyWorkdays, setShowOnlyWorkdays] = useState(false);

  // Active dates in selectedMonth
  const daysInMonthList = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month, 0);
    const count = date.getDate();
    return Array.from({ length: count }, (_, i) => {
      const dayNum = i + 1;
      return dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
    });
  }, [selectedMonth]);

  // Find department schedule
  const activeDeptSchedule = useMemo(() => {
    return departmentSchedules.find(
      s => s.department === currentUser.department && s.month === selectedMonth
    );
  }, [departmentSchedules, currentUser.department, selectedMonth]);

  // Find this user's personal schedule
  const personalScheduleObj = useMemo(() => {
    if (!activeDeptSchedule) return null;
    return activeDeptSchedule.schedules.find(s => s.staffId === currentUser.username);
  }, [activeDeptSchedule, currentUser.username]);

  // Retrieve user major
  const staffInfo = useMemo(() => {
    const list = staffList[currentUser.department || ''] || [];
    return list.find(s => s.id === currentUser.username);
  }, [staffList, currentUser.department, currentUser.username]);

  const scheduleMap: DaySchedule = useMemo(() => {
    return personalScheduleObj?.schedule || {};
  }, [personalScheduleObj]);

  // Calculate workdays and counts
  const stats = useMemo(() => {
    let totalWorkdays = 0;
    let personalLeaves = 0;
    let unpaidLeaves = 0;
    let maternityLeaves = 0;
    let studyDays = 0;
    let totalShifts = 0;

    daysInMonthList.forEach(day => {
      const code = (scheduleMap[day] || '') as ScheduleCode;
      const meta = SCHEDULE_META[code] || SCHEDULE_META[''];
      totalWorkdays += meta.weight;
      
      if (meta.weight > 0) {
        totalShifts += 1;
      }

      if (code === 'P') personalLeaves++;
      if (code === 'KL') unpaidLeaves++;
      if (code === 'TS') maternityLeaves++;
      if (code === 'H') studyDays++;
    });

    return { totalWorkdays, personalLeaves, unpaidLeaves, maternityLeaves, studyDays, totalShifts };
  }, [scheduleMap, daysInMonthList]);

  // Helper to determine weekday details
  const getDayDetails = (dayStr: string) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, Number(dayStr));
    const dayOfWeek = date.getDay();
    const dayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const holiday = getVietnameseHoliday(year, month, Number(dayStr));
    
    return {
      dayOfWeekName: dayNames[dayOfWeek],
      isSunday: dayOfWeek === 0,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      holiday
    };
  };

  // Group days into weeks for Weekly Cards View
  const weeks = useMemo(() => {
    const list: { weekIndex: number; days: { day: string; code: ScheduleCode }[] }[] = [];
    let currentWeekDays: { day: string; code: ScheduleCode }[] = [];
    let weekIndex = 1;

    daysInMonthList.forEach((day, idx) => {
      const code = (scheduleMap[day] || '') as ScheduleCode;
      currentWeekDays.push({ day, code });

      const details = getDayDetails(day);
      // End week on Sunday or end of month
      if (details.isSunday || idx === daysInMonthList.length - 1) {
        list.push({ weekIndex, days: currentWeekDays });
        currentWeekDays = [];
        weekIndex++;
      }
    });

    return list;
  }, [daysInMonthList, scheduleMap, selectedMonth]);

  // Handle month shifting
  const shiftMonth = (direction: 'PREV' | 'NEXT') => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month;
    if (direction === 'PREV') {
      newMonth--;
      if (newMonth === 0) {
        newMonth = 12;
        newYear--;
      }
    } else {
      newMonth++;
      if (newMonth === 13) {
        newMonth = 1;
        newYear++;
      }
    }
    const monthStr = newMonth < 10 ? `0${newMonth}` : `${newMonth}`;
    setSelectedMonth(`${newYear}-${monthStr}`);
  };

  // Filter out non-work days if filter is toggled
  const filteredTimelineDays = useMemo(() => {
    return daysInMonthList.filter(day => {
      if (!showOnlyWorkdays) return true;
      const code = (scheduleMap[day] || '') as ScheduleCode;
      const meta = SCHEDULE_META[code] || SCHEDULE_META[''];
      return meta.weight > 0;
    });
  }, [daysInMonthList, scheduleMap, showOnlyWorkdays]);

  // Exporter for ICS
  const handleExportICS = () => {
    if (!personalScheduleObj) return;
    
    let icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Song Thuong Hospital//Personal Schedule Sync//VI',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    daysInMonthList.forEach(day => {
      const code = (scheduleMap[day] || '') as ScheduleCode;
      const meta = SCHEDULE_META[code] || SCHEDULE_META[''];
      if (meta.weight === 0 && code !== 'H') return; 

      // Determine shift hours based on code
      let startHour = 8, startMin = 0, endHour = 17, endMin = 0;
      if (code === 'S') {
        startHour = 7; startMin = 30; endHour = 12; endMin = 0;
      } else if (code === 'C') {
        startHour = 13; startMin = 0; endHour = 17; endMin = 30;
      } else if (code === 'Đ') {
        startHour = 19; startMin = 0; endHour = 7; endMin = 0; 
      } else if (code === 'T') {
        startHour = 7; startMin = 30; endHour = 7; endMin = 30; 
      } else if (code === 'X/2') {
        startHour = 8; startMin = 0; endHour = 12; endMin = 0;
      }

      const dayNum = parseInt(day, 10);
      const startDate = new Date(year, month - 1, dayNum, startHour, startMin, 0);
      let endDate = new Date(year, month - 1, dayNum, endHour, endMin, 0);
      if (code === 'Đ' || code === 'T') {
        endDate.setDate(endDate.getDate() + 1); 
      }

      const formatICSDate = (d: Date) => {
        const pad = (num: number) => String(num).padStart(2, '0');
        return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
      };

      const nowStr = formatICSDate(new Date());
      const dtStart = formatICSDate(startDate);
      const dtEnd = formatICSDate(endDate);

      const eventUid = `shift-${day}-${currentUser.username}-${selectedMonth}@songthuong.hospital`;
      const summary = `Ca trực: ${meta.label} [${code}] - Khoa ${currentUser.department}`;
      const description = `Nhân viên: ${currentUser.fullName}\\nChức danh: ${staffInfo?.major || 'Điều dưỡng'}\\nCa trực: ${meta.label} (${meta.sub})\\nKhoa: ${currentUser.department}\\nBệnh viện Đa khoa Sông Thương`;
      const location = `Bệnh viện Đa khoa Sông Thương, Bắc Giang`;

      icsLines.push('BEGIN:VEVENT');
      icsLines.push(`UID:${eventUid}`);
      icsLines.push(`DTSTAMP:${nowStr}`);
      icsLines.push(`DTSTART:${dtStart}`);
      icsLines.push(`DTEND:${dtEnd}`);
      icsLines.push(`SUMMARY:${summary}`);
      icsLines.push(`DESCRIPTION:${description}`);
      icsLines.push(`LOCATION:${location}`);
      icsLines.push('BEGIN:VALARM');
      icsLines.push('TRIGGER:-PT30M'); 
      icsLines.push('ACTION:DISPLAY');
      icsLines.push(`DESCRIPTION:Nhắc nhở: Sắp tới ca trực ${meta.label} [${code}] của bạn!`);
      icsLines.push('END:VALARM');
      icsLines.push('END:VEVENT');
    });

    icsLines.push('END:VCALENDAR');
    const icsContent = icsLines.join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LichTruc_${currentUser.username}_${selectedMonth}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600/30">
      
      {/* Dynamic Ambient Blur */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-blue-900/10 via-indigo-900/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header Container */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-slate-950/85 border-b border-white/[0.06] px-4 py-3.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/10">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[9px] font-black tracking-widest text-blue-400 block uppercase">
                BỆNH VIỆN ĐA KHOA SÔNG THƯƠNG
              </span>
              <h1 className="text-sm font-black tracking-tight text-white">
                CỔNG TRA CỨU CÁ NHÂN
              </h1>
            </div>
          </div>

          <button 
            onClick={onLogout}
            className="p-2 bg-slate-900 hover:bg-red-950/40 border border-white/[0.08] hover:border-red-900/30 rounded-xl text-slate-400 hover:text-red-400 transition-all flex items-center gap-1.5 text-xs font-bold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden xs:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Main Content Scroll Container */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-5 space-y-5 pb-24 z-10">

        {/* User Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-900/90 to-slate-950 border border-white/[0.08] p-5 rounded-2xl shadow-xl flex items-center gap-4 relative overflow-hidden"
        >
          {/* Subtle decoration */}
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />

          <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-extrabold text-lg">
            {currentUser.fullName.split(' ').pop()?.charAt(0) || 'N'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
              {currentUser.department} • {staffInfo?.major || 'Điều dưỡng'}
            </p>
            <h2 className="text-base font-black text-white truncate">
              Chào, {currentUser.fullName} 👋
            </h2>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Lịch trực tháng {selectedMonth.split('-')[1]} năm {selectedMonth.split('-')[0]}
            </p>
          </div>
        </motion.div>

        {/* Month Selector & Controls */}
        <div className="flex items-center justify-between gap-3 bg-slate-900/40 p-1.5 rounded-xl border border-white/[0.06]">
          <button 
            onClick={() => shiftMonth('PREV')}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 text-center font-bold text-sm tracking-wide text-white">
            Tháng {selectedMonth.split('-')[1]} / {selectedMonth.split('-')[0]}
          </div>

          <button 
            onClick={() => shiftMonth('NEXT')}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Schedule Approval Status Alert */}
        {activeDeptSchedule ? (
          <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
            activeDeptSchedule.status === 'APPROVED' 
              ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' 
              : activeDeptSchedule.status === 'SUBMITTED'
              ? 'bg-blue-950/20 border-blue-500/20 text-blue-400'
              : 'bg-amber-950/20 border-amber-500/20 text-amber-400'
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div className="flex-1">
              Lịch trực của khoa:{' '} 
              <span className="font-extrabold underline uppercase">
                {activeDeptSchedule.status === 'APPROVED' ? 'Đã duyệt chính thức' : 
                 activeDeptSchedule.status === 'SUBMITTED' ? 'Đã trình duyệt' : 'Đang dự thảo'}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div className="flex-1">Khoa chưa lập lịch trực cho tháng này.</div>
          </div>
        )}

        {/* Dynamic Ghi Chú Cá Nhân */}
        {personalScheduleObj?.notes && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-xs"
          >
            <Bookmark className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-black text-amber-300 uppercase tracking-wide block">Ghi chú từ Điều dưỡng Trưởng:</span>
              <p className="text-slate-200 font-medium leading-relaxed italic">"{personalScheduleObj.notes}"</p>
            </div>
          </motion.div>
        )}

        {/* Stats Summary Bento Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-950/30 to-slate-900 p-4 rounded-xl border border-white/[0.06] flex flex-col justify-between">
            <span className="text-[10px] text-blue-400 font-black uppercase tracking-wider">Tổng công dự kiến</span>
            <div className="mt-2.5 flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">{stats.totalWorkdays}</span>
              <span className="text-[10px] text-slate-500 font-medium">ngày</span>
            </div>
            <p className="text-[9px] text-slate-500 mt-1">Từ {stats.totalShifts} ca đăng ký đi làm</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-950/20 to-slate-900 p-4 rounded-xl border border-white/[0.06] flex flex-col justify-between">
            <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">Nghỉ phép năm (P)</span>
            <div className="mt-2.5 flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-400">{stats.personalLeaves}</span>
              <span className="text-[10px] text-slate-500 font-medium">ngày</span>
            </div>
            <p className="text-[9px] text-slate-500 mt-1">Được tính lương cơ bản</p>
          </div>

          {stats.unpaidLeaves > 0 && (
            <div className="bg-slate-900 p-3.5 rounded-xl border border-white/[0.06] flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Nghỉ không lương (KL):</span>
              <span className="text-sm font-black text-red-400">{stats.unpaidLeaves} ngày</span>
            </div>
          )}
          {stats.maternityLeaves > 0 && (
            <div className="bg-slate-900 p-3.5 rounded-xl border border-white/[0.06] flex items-center justify-between col-span-2">
              <span className="text-xs text-slate-400 font-semibold">Nghỉ thai sản (TS):</span>
              <span className="text-sm font-black text-pink-400">{stats.maternityLeaves} ngày</span>
            </div>
          )}
          {stats.studyDays > 0 && (
            <div className="bg-slate-900 p-3.5 rounded-xl border border-white/[0.06] flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Đi học tập huấn (H):</span>
              <span className="text-sm font-black text-amber-400">{stats.studyDays} ngày</span>
            </div>
          )}
        </div>

        {/* Calendar Synchronization Card */}
        {personalScheduleObj && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/20 rounded-2xl shadow-xl space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                <Smartphone className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white flex items-center gap-1.5 uppercase tracking-wide">
                  Đồng bộ lịch điện thoại
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                  Tải tệp lịch tiêu chuẩn (.ics) để đồng bộ nhanh toàn bộ lịch trực tháng này vào ứng dụng lịch điện thoại (iPhone, Samsung, Google Calendar...) để nhận chuông báo nhắc lịch đi làm tự động 30 phút trước ca trực.
                </p>
              </div>
            </div>

            <div className="pt-1 flex flex-col gap-2">
              <button
                onClick={handleExportICS}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Xuất lịch trực (.ics)</span>
              </button>
              
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-white/[0.04] text-[10px] text-slate-400 space-y-1 font-medium">
                <span className="font-bold text-indigo-300 block">Hướng dẫn cài đặt:</span>
                <p className="leading-relaxed">
                  • <strong>iOS (iPhone):</strong> Tải tệp về → Mở tệp trong ứng dụng Tệp → Chọn "Thêm tất cả" vào ứng dụng Lịch (Apple Calendar).
                </p>
                <p className="leading-relaxed">
                  • <strong>Android / Google:</strong> Truy cập Google Calendar trên web → Cài đặt → Nhập & xuất → Chọn tệp .ics vừa tải để đồng bộ tự động.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* View Mode Switching Tabs */}
        <div className="flex items-center justify-between border-t border-b border-white/[0.06] py-3 gap-2">
          
          {/* Quick Filters */}
          <button 
            onClick={() => setShowOnlyWorkdays(!showOnlyWorkdays)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              showOnlyWorkdays 
                ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' 
                : 'bg-slate-900/60 border-white/[0.06] text-slate-400 hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Chỉ hiện đi làm</span>
          </button>

          {/* Mode Switcher */}
          <div className="bg-slate-900 p-1 rounded-lg border border-white/[0.06] flex">
            <button
              onClick={() => setViewMode('TIMELINE')}
              className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'TIMELINE' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Dòng thời gian</span>
            </button>
            <button
              onClick={() => setViewMode('WEEKLY')}
              className={`p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'WEEKLY' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Theo Tuần</span>
            </button>
          </div>
        </div>

        {/* Screen Content Render */}
        <AnimatePresence mode="wait">
          {viewMode === 'TIMELINE' ? (
            <motion.div 
              key="timeline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {filteredTimelineDays.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs font-medium">
                  Không tìm thấy ca trực đi làm nào phù hợp.
                </div>
              ) : (
                filteredTimelineDays.map(day => {
                  const code = (scheduleMap[day] || '') as ScheduleCode;
                  const meta = SCHEDULE_META[code] || SCHEDULE_META[''];
                  const details = getDayDetails(day);

                  return (
                    <div 
                      key={day}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        meta.weight > 0 
                          ? 'bg-slate-900/60 border-white/[0.08]' 
                          : 'bg-slate-950/20 border-white/[0.04] opacity-60'
                      }`}
                    >
                      {/* Left Date details */}
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center font-bold shadow-sm ${
                          details.isSunday 
                            ? 'bg-red-500/15 text-red-400' 
                            : details.holiday
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-slate-800/80 text-slate-300'
                        }`}>
                          <span className="text-base font-black leading-none">{day}</span>
                          <span className="text-[9px] font-medium mt-0.5">{details.dayOfWeekName.split(' ')[1] || details.dayOfWeekName}</span>
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            {meta.weight > 0 ? (
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            ) : null}
                            {meta.sub}
                          </h4>
                          {details.holiday ? (
                            <span className="text-[9px] text-amber-400 font-extrabold flex items-center gap-1 mt-0.5">
                              🎉 {details.holiday.name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                              {meta.weight > 0 ? `Tích luỹ ${meta.weight} ngày công` : 'Nghỉ ngơi / không trực'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Shift Code Badge */}
                      <div className={`px-3 py-1.5 rounded-lg border font-black text-xs tracking-wider uppercase flex items-center justify-center min-w-[70px] text-center ${meta.bg} ${meta.text} ${meta.border}`}>
                        {code || 'Trống'}
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="weekly"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {weeks.map(week => {
                const totalWeekWorkdays = week.days.reduce((acc, curr) => {
                  const meta = SCHEDULE_META[curr.code] || SCHEDULE_META[''];
                  return acc + meta.weight;
                }, 0);

                return (
                  <div 
                    key={week.weekIndex}
                    className="p-4 bg-gradient-to-br from-slate-900/60 to-slate-950/80 rounded-2xl border border-white/[0.08] space-y-3 shadow-lg"
                  >
                    <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                      <span className="text-xs font-black text-slate-300 uppercase tracking-wide">
                        Tuần {week.weekIndex}
                      </span>
                      <span className="text-[10px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                        {totalWeekWorkdays} ngày công
                      </span>
                    </div>

                    {/* Compact row of week days */}
                    <div className="grid grid-cols-7 gap-1.5 pt-1">
                      {week.days.map(({ day, code }) => {
                        const meta = SCHEDULE_META[code] || SCHEDULE_META[''];
                        const details = getDayDetails(day);

                        return (
                          <div 
                            key={day}
                            className={`flex flex-col items-center p-1.5 rounded-lg border transition-all ${
                              meta.weight > 0 
                                ? 'bg-blue-600/10 border-blue-500/20' 
                                : 'bg-slate-900/40 border-white/[0.04] opacity-50'
                            }`}
                          >
                            <span className="text-[10px] font-black text-slate-300">{day}</span>
                            <span className="text-[8px] text-slate-500 mt-0.5">
                              {details.dayOfWeekName.split(' ')[1] || 'CN'}
                            </span>
                            
                            <span className={`text-[10px] font-black uppercase mt-1.5 ${meta.text}`}>
                              {code || '-'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Legend Modal info */}
        <div className="bg-slate-900/30 border border-white/[0.04] p-4 rounded-xl space-y-2">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ký hiệu phân lịch</h5>
          <div className="grid grid-cols-3 gap-2 pt-1 text-[10px]">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-500/20 border border-blue-500/40 rounded-sm inline-block"></span><span className="text-slate-300 font-medium">X: 1 công</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-sky-500/20 border border-sky-500/40 rounded-sm inline-block"></span><span className="text-slate-300 font-medium">S: 0.5 công</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-violet-500/20 border border-violet-500/40 rounded-sm inline-block"></span><span className="text-slate-300 font-medium">C: 0.5 công</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-sm inline-block"></span><span className="text-slate-300 font-medium">P: Phép</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-500/20 border border-red-500/40 rounded-sm inline-block"></span><span className="text-slate-300 font-medium">KL: Không lương</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-pink-500/20 border border-pink-500/40 rounded-sm inline-block"></span><span className="text-slate-300 font-medium">TS: Thai sản</span></div>
          </div>
        </div>

      </main>

      {/* Persistent Bottom Bar for personal clock */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-md bg-slate-950/85 border-t border-white/[0.06] py-2 px-4 text-center">
        <div className="max-w-md mx-auto flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>Hệ Thống Phân Công Lịch Trực Sông Thương</span>
          <span className="font-mono text-slate-400">v3.1 • Mobile Mode</span>
        </div>
      </footer>

    </div>
  );
}
