import React, { useState } from 'react';
import { DepartmentSchedule, Staff, DaySchedule, Department, Role } from '../types';
import { getMarch2026Days } from '../initialData';
import { 
  Shield, Users, Calendar, AlertTriangle, TrendingUp, Award, Clock, 
  FileText, Printer, Download, Sparkles, Activity, FileSpreadsheet, 
  Layers, CheckCircle, ChevronRight, RefreshCw, Moon, Search
} from 'lucide-react';
import MonthSelector from './MonthSelector';
import { exportToExcel } from './ExcelExporter';

interface StatsDashboardProps {
  departmentSchedules: DepartmentSchedule[];
  staffList: Record<string, Staff[]>;
  selectedMonth: string;
  onChangeMonth: (month: string) => void;
  aiReport?: string | null;
  aiLoading?: boolean;
  onTriggerAI?: () => void;
  currentRole: Role;
}

// Compact and incredibly reliable client-side Markdown to Styled HTML parser
function parseMarkdownToHtml(markdown: string | null): string {
  if (!markdown) return '';
  
  // Escape HTML characters
  let escaped = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  // Convert Bold
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-slate-950 font-sans">$1</strong>');
  escaped = escaped.replace(/\*(.*?)\*/g, '<em class="italic text-gray-800">$1</em>');
  
  // Convert Code Blocks
  escaped = escaped.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-800 my-2 overflow-x-auto">$1</pre>');
  escaped = escaped.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-rose-600">$1</code>');
  
  // Convert Blockquotes
  escaped = escaped.replace(/^>\s*(.*?)$/gm, '<blockquote class="border-l-4 border-amber-500 pl-4 py-1 italic my-2 text-gray-600">$1</blockquote>');
  
  // Convert Headers (h4, h3, h2)
  escaped = escaped.replace(/^### (.*?)$/gm, '<h4 class="text-xs font-bold text-blue-950 mt-4 mb-2 flex items-center gap-1.5 border-l-2 border-blue-600 pl-2">$1</h4>');
  escaped = escaped.replace(/^## (.*?)$/gm, '<h3 class="text-sm font-extrabold text-blue-900 border-b border-blue-100 pb-2 mt-5 mb-3 uppercase tracking-wide">$1</h3>');
  escaped = escaped.replace(/^# (.*?)$/gm, '<h2 class="text-base font-black text-slate-900 border-b-2 border-gray-200 pb-2 mt-6 mb-4 uppercase tracking-tight">$1</h2>');
  
  // Convert Bullet points
  escaped = escaped.replace(/^\s*[-*]\s*(.*?)$/gm, '<li class="text-xs text-gray-700 leading-relaxed mb-1.5 list-disc ml-5">$1</li>');
  
  // Convert Numbered Lists
  escaped = escaped.replace(/^\s*(\d+)\.\s*(.*?)$/gm, '<li class="text-xs text-gray-700 leading-relaxed mb-1.5 list-decimal ml-5">$2</li>');
  
  // Convert line breaks to paragraphs/spacers
  escaped = escaped.replace(/^\s*$/gm, '<div class="h-2"></div>');
  
  return escaped;
}

export default function StatsDashboard({
  departmentSchedules,
  staffList,
  selectedMonth,
  onChangeMonth,
  aiReport,
  aiLoading = false,
  onTriggerAI,
  currentRole
}: StatsDashboardProps) {
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

  const [selectedDeptFilter, setSelectedDeptFilter] = useState<'All' | Department>('All');
  const [dashboardTab, setDashboardTab] = useState<'VISUAL' | 'ANALYTICS' | 'REPORT'>('VISUAL');

  // Search, filter, sorting states for advanced HR analytics
  const [analyticsSearchQuery, setAnalyticsSearchQuery] = useState('');
  const [analyticsDeptFilter, setAnalyticsDeptFilter] = useState<'All' | Department>('All');
  const [analyticsSortBy, setAnalyticsSortBy] = useState<'night' | 'work' | 'leaves' | 'yearly'>('night');

  // --- ADVANCED HR ANALYTICS COMPUTATIONS ---
  const hrAnalyticsData = React.useMemo(() => {
    // 1. Get all staff across all departments
    const allStaff: (Staff & { department: Department })[] = [];
    Object.entries(staffList).forEach(([dept, list]) => {
      list.forEach(s => {
        allStaff.push({ ...s, department: dept as Department });
      });
    });

    const [currentYear] = selectedMonth.split('-');

    // Find current month's department schedule mapping
    const currentSchedulesMap = new Map<string, DaySchedule>();
    departmentSchedules
      .filter(s => s.month === selectedMonth)
      .forEach(deptSched => {
        deptSched.schedules.forEach(ss => {
          currentSchedulesMap.set(ss.staffId, ss.schedule);
        });
      });

    // Find all schedules in the current year for leave calculations
    const yearlySchedulesList = departmentSchedules.filter(s => s.month.startsWith(currentYear));

    // Calculate metrics for each staff
    const staffMetrics = allStaff.map(staff => {
      // Current Month Stats
      const curSchedule = currentSchedulesMap.get(staff.id) || {};
      let curWorkdays = 0;
      let curNightShifts = 0;
      let cur24hShifts = 0;
      let curLeaves = 0;

      Object.entries(curSchedule).forEach(([dayKey, code]) => {
        if (dayKey.length === 2) {
          if (code === 'X') curWorkdays += 1.0;
          else if (code === 'Đ') {
            curWorkdays += 1.0;
            curNightShifts += 1;
          } else if (code === 'T') {
            curWorkdays += 1.0;
            cur24hShifts += 1;
          } else if (code === 'X/2' || code === 'S' || code === 'C') {
            curWorkdays += 0.5;
          } else if (code === 'P') {
            curLeaves += 1;
          }
        }
      });

      // Yearly Leaves ('P' code)
      let yearlyLeavesUsed = 0;
      yearlySchedulesList.forEach(monthSched => {
        const staffSched = monthSched.schedules.find(ss => ss.staffId === staff.id);
        if (staffSched) {
          Object.entries(staffSched.schedule).forEach(([dayKey, code]) => {
            if (dayKey.length === 2 && code === 'P') {
              yearlyLeavesUsed += 1;
            }
          });
        }
      });

      return {
        id: staff.id,
        name: staff.name,
        gender: staff.gender,
        major: staff.major || 'Chưa rõ',
        department: staff.department,
        isChief: !!staff.isChief,
        curWorkdays,
        curNightShifts,
        cur24hShifts,
        curLeaves,
        yearlyLeavesUsed,
      };
    });

    // 2. Group by Qualification (major)
    const qualificationStatsMap: Record<string, {
      major: string;
      staffCount: number;
      totalWorkdays: number;
      totalNightShifts: number;
      total24hShifts: number;
      totalLeaves: number;
      yearlyLeaves: number;
    }> = {};

    staffMetrics.forEach(sm => {
      const maj = sm.major;
      if (!qualificationStatsMap[maj]) {
        qualificationStatsMap[maj] = {
          major: maj,
          staffCount: 0,
          totalWorkdays: 0,
          totalNightShifts: 0,
          total24hShifts: 0,
          totalLeaves: 0,
          yearlyLeaves: 0,
        };
      }
      const q = qualificationStatsMap[maj];
      q.staffCount += 1;
      q.totalWorkdays += sm.curWorkdays;
      q.totalNightShifts += sm.curNightShifts;
      q.total24hShifts += sm.cur24hShifts;
      q.totalLeaves += sm.curLeaves;
      q.yearlyLeaves += sm.yearlyLeavesUsed;
    });

    const qualificationStats = Object.values(qualificationStatsMap);

    return {
      staffMetrics,
      qualificationStats,
    };
  }, [departmentSchedules, staffList, selectedMonth]);

  // Load custom account name for Head of Nursing
  const headOfNursingName = React.useMemo(() => {
    try {
      const cachedNames = localStorage.getItem('song_thuong_account_names_v3');
      if (cachedNames) {
        const parsed = JSON.parse(cachedNames);
        return parsed.phongdieuduong || 'Nguyễn Thanh Hương';
      }
    } catch (e) {
      console.error(e);
    }
    return 'Nguyễn Thanh Hương';
  }, []);

  // Dynamically filter staffs based on selected filter
  const filteredStaffs = selectedDeptFilter === 'All' 
    ? Object.values(staffList).flat() 
    : (staffList[selectedDeptFilter] || []);
  
  // Calculate total personnel counts
  const totalStaffCount = filteredStaffs.length;
  const chiefNursesCount = filteredStaffs.filter(s => s.isChief).length;

  // Calculate qualification demographics (CNĐĐ, CĐĐĐ, ĐDTC, YSĐK, etc.)
  const qualifications: Record<string, number> = {};
  filteredStaffs.forEach(s => {
    qualifications[s.major] = (qualifications[s.major] || 0) + 1;
  });

  // Calculate average daily attendance (Where schedule code is X, X/2, S, C)
  const dailyAttendance: number[] = Array(days.length).fill(0);
  const dailyTotalPotential: number[] = Array(days.length).fill(0);

  // Leave tallies
  let totalPApplied = 0;
  let totalKLApplied = 0;
  let totalTSApplied = 0;
  let totalHApplied = 0;

  departmentSchedules.forEach(deptSche => {
    // Only process schedules for the selected month!
    if (deptSche.month !== selectedMonth) {
      return;
    }

    // Check if department matches selected filter
    if (selectedDeptFilter !== 'All' && deptSche.department !== selectedDeptFilter) {
      return;
    }

    deptSche.schedules.forEach(staffSche => {
      Object.entries(staffSche.schedule).forEach(([dateStr, code]) => {
        const dayIdx = parseInt(dateStr, 10) - 1;
        
        if (dayIdx >= 0 && dayIdx < days.length) {
          if (code === 'X') {
            dailyAttendance[dayIdx] += 1.0;
          } else if (code === 'X/2' || code === 'S' || code === 'C') {
            dailyAttendance[dayIdx] += 0.5;
          }

          dailyTotalPotential[dayIdx] += 1.0;
        }

        if (code === 'P') totalPApplied++;
        else if (code === 'KL') totalKLApplied++;
        else if (code === 'TS') totalTSApplied++;
        else if (code === 'H') totalHApplied++;
      });
    });
  });

  // Calculate daily active metrics
  const avgAttendance = dailyAttendance.reduce((a, b) => a + b, 0) / (days.length || 1);
  const activeRatio = totalStaffCount > 0 ? (avgAttendance / totalStaffCount) * 100 : 0;

  // Identify Understaffing warnings (Daily active staff < 3 for YHCT / LCK or < 1 for Nội-Nhi / Ngoại)
  const warnings: { date: string; dayName: string; department: Department; count: number; limit: number }[] = [];
  
  days.forEach(d => {
    departmentSchedules.forEach(deptSche => {
      // Only check schedules of selected month
      if (deptSche.month !== selectedMonth) {
        return;
      }

      let deptActive = 0;
      deptSche.schedules.forEach(s => {
        const code = s.schedule[d.dateStr];
        if (code === 'X') deptActive += 1.0;
        else if (code === 'X/2' || code === 'S' || code === 'C') deptActive += 0.5;
      });

      // Strict minimum staffing limits per department on any giving date:
      const limit = deptSche.department === 'YHCT - PHCN' || deptSche.department === 'LCK' ? 3 : 1;
      if (deptActive < limit) {
        warnings.push({
          date: d.dateStr,
          dayName: d.dayName,
          department: deptSche.department,
          count: deptActive,
          limit
        });
      }
    });
  });

  // Calculate department breakdowns for the table report
  const departmentBreakdowns = Object.keys(staffList).map(deptName => {
    const staffs = staffList[deptName] || [];
    const staffCount = staffs.length;
    
    // Get schedule for this department for selectedMonth
    const deptSche = departmentSchedules.find(s => s.department === deptName && s.month === selectedMonth);
    const status = deptSche ? deptSche.status : 'DRAFT';
    
    let deptAttendanceSum = 0;
    let deptPCount = 0;
    let deptKLCount = 0;
    let deptTSCount = 0;
    let deptHCount = 0;
    
    if (deptSche) {
      deptSche.schedules.forEach(staffSche => {
        Object.entries(staffSche.schedule).forEach(([dateStr, code]) => {
          const dayIdx = parseInt(dateStr, 10) - 1;
          if (dayIdx >= 0 && dayIdx < days.length) {
            if (code === 'X') {
              deptAttendanceSum += 1.0;
            } else if (code === 'X/2' || code === 'S' || code === 'C') {
              deptAttendanceSum += 0.5;
            }
          }
          
          if (code === 'P') deptPCount++;
          else if (code === 'KL') deptKLCount++;
          else if (code === 'TS') deptTSCount++;
          else if (code === 'H') deptHCount++;
        });
      });
    }
    
    const avgDeptAttendance = deptAttendanceSum / (days.length || 1);
    const deptActiveRatio = staffCount > 0 ? (avgDeptAttendance / staffCount) * 100 : 0;
    
    return {
      department: deptName,
      staffCount,
      avgAttendance: avgDeptAttendance,
      activeRatio: deptActiveRatio,
      totalShifts: deptAttendanceSum,
      leaves: deptPCount,
      unpaidLeaves: deptKLCount,
      maternityLeaves: deptTSCount,
      studyLeaves: deptHCount,
      status
    };
  });

  // Custom colors for qualification chart
  const qualColors: Record<string, string> = {
    CNĐĐ: '#2563eb', // blue-600
    CĐĐĐ: '#10b981', // emerald-500
    ĐDTC: '#f59e0b', // amber-500
    YSĐK: '#8b5cf6', // violet-500
    TSCT: '#ec4899', // pink-500
    CĐPHCN: '#06b6d4' // cyan-500
  };

  const qualTotal = Object.values(qualifications).reduce((a, b) => a + b, 0);

  // SVG parameters for Qualification donut
  let lastAngle = 0;
  const donutsParts = Object.entries(qualifications).map(([name, val]) => {
    const pct = val / (qualTotal || 1);
    const angle = pct * 360;
    const startAngle = lastAngle;
    const endAngle = lastAngle + angle;
    lastAngle += angle;

    // Convert polar to cartesian
    const radian = (degree: number) => (degree - 90) * Math.PI / 180;
    const x1 = 100 + 70 * Math.cos(radian(startAngle));
    const y1 = 100 + 70 * Math.sin(radian(startAngle));
    const x2 = 100 + 70 * Math.cos(radian(endAngle));
    const y2 = 100 + 70 * Math.sin(radian(endAngle));
    const largeArc = angle > 180 ? 1 : 0;

    return {
      name,
      val,
      pct,
      path: `M ${x1} ${y1} A 70 70 0 ${largeArc} 1 ${x2} ${y2}`,
      color: qualColors[name] || '#6b7280'
    };
  });

  // Compute Clinical Compliance metrics
  const complianceScorecard = React.useMemo(() => {
    // 1. Tỷ lệ Cử nhân Điều dưỡng (CNĐĐ)
    const totalCN = qualifications['CNĐĐ'] || 0;
    const pctCN = totalCN / (qualTotal || 1);
    const isCnPassed = pctCN >= 0.25;

    // 2. Bảo phủ nhân sự trực gác (Staffing Coverage)
    const isStaffingPassed = warnings.length === 0;

    // 3. Ngăn ngừa kiệt sức (Overwork Prevention)
    let hasOverload = false;
    departmentSchedules.forEach(deptSche => {
      if (deptSche.month === selectedMonth) {
        deptSche.schedules.forEach(staffSche => {
          let workdays = 0;
          Object.values(staffSche.schedule).forEach(code => {
            if (code === 'X' || code === 'X/2' || code === 'S' || code === 'C') {
              workdays += (code === 'X' ? 1.0 : 0.5);
            }
          });
          if (workdays > 24) {
            hasOverload = true;
          }
        });
      }
    });
    const isOverloadPassed = !hasOverload;

    // 4. Giám sát quản lý (Supervision Presence)
    let hasSupervision = true;
    let checkedDeptsCount = 0;
    Object.keys(staffList).forEach(deptName => {
      const sched = departmentSchedules.find(s => s.department === deptName && s.month === selectedMonth);
      if (sched) {
        checkedDeptsCount++;
        const staffsOfDept = staffList[deptName] || [];
        const chief = staffsOfDept.find(s => s.isChief);
        if (chief) {
          const chiefSched = sched.schedules.find(s => s.staffId === chief.id);
          if (chiefSched) {
            let totalActive = 0;
            Object.values(chiefSched.schedule).forEach(code => {
              if (code === 'X' || code === 'X/2' || code === 'S' || code === 'C') {
                totalActive += (code === 'X' ? 1.0 : 0.5);
              }
            });
            if (totalActive < 10) { // Chief nurse should have at least 10 shifts/workdays
              hasSupervision = false;
            }
          } else {
            hasSupervision = false;
          }
        } else {
          hasSupervision = false;
        }
      }
    });
    const isSupervisionPassed = checkedDeptsCount > 0 ? hasSupervision : true;

    // Total score
    let score = 0;
    if (isCnPassed) score += 25;
    if (isStaffingPassed) score += 25;
    if (isOverloadPassed) score += 25;
    if (isSupervisionPassed) score += 25;

    return {
      pctCN,
      isCnPassed,
      isStaffingPassed,
      isOverloadPassed,
      isSupervisionPassed,
      score,
      warningsCount: warnings.length
    };
  }, [qualifications, qualTotal, warnings, departmentSchedules, selectedMonth, staffList]);

  // SVG parameters for dynamic days attendance sheet trending line
  const maxAttendance = Math.max(...dailyAttendance, 1);
  const paddingX = 40;
  const paddingY = 20;
  const width = 600;
  const height = 180;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  // Calculate coordinates
  const linePoints = dailyAttendance.map((val, idx) => {
    const x = paddingX + (idx / (days.length - 1 || 1)) * chartW;
    const y = paddingY + chartH - (val / (totalStaffCount || 1)) * chartH;
    return { x, y, val, date: idx + 1 };
  });

  const pathD = linePoints.length > 0 
    ? `M ${linePoints[0].x} ${linePoints[0].y} ` + linePoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const areaD = linePoints.length > 0
    ? `${pathD} L ${linePoints[linePoints.length-1].x} ${paddingY + chartH} L ${linePoints[0].x} ${paddingY + chartH} Z`
    : '';

  // Function to print report
  const handlePrintReport = () => {
    window.print();
  };

  const [yearStr, monthStr] = selectedMonth.split('-');

  return (
    <div className="flex flex-col gap-6">
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, nav, footer, button, select, .no-print {
            display: none !important;
          }
          #printable-report-area {
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          #printable-report-area * {
            visibility: visible !important;
          }
          .print-page-break {
            page-break-before: always;
          }
        }
      `}</style>

      {/* Top Filter and Month selection Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:inline">Lọc theo tháng thống kê:</h2>
          <MonthSelector selectedMonth={selectedMonth} onChangeMonth={onChangeMonth} />
        </div>
        
        {/* Unified Department filter */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-550 uppercase tracking-wider">Khoa phòng:</span>
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value as any)}
              className="border border-slate-200 bg-slate-50 text-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer outline-none focus:border-blue-500"
            >
              <option value="All">Tất cả khoa phòng</option>
              {Object.keys(staffList).map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-1 no-print">
        <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
          <button
            onClick={() => setDashboardTab('VISUAL')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              dashboardTab === 'VISUAL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Biểu đồ trực quan</span>
          </button>
          <button
            onClick={() => setDashboardTab('ANALYTICS')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              dashboardTab === 'ANALYTICS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Phân tích HR &amp; Công phép</span>
          </button>
          <button
            onClick={() => setDashboardTab('REPORT')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              dashboardTab === 'REPORT'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Báo cáo Chi tiết &amp; Rà soát AI</span>
          </button>
        </div>

        {dashboardTab === 'REPORT' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Báo Cáo</span>
            </button>
            {(currentRole === 'ADMIN' || currentRole === 'HEAD_OF_NURSING') && (
              <button
                onClick={() => exportToExcel(departmentSchedules, staffList, selectedMonth)}
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Xuất Excel</span>
              </button>
            )}
          </div>
        )}
      </div>

      {dashboardTab === 'VISUAL' ? (
        <>
          {/* Primary KPI Indicator Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
            
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-lg">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Tổng điều dưỡng viên</span>
                <h4 className="text-2xl font-black text-gray-900 leading-tight">{totalStaffCount} <span className="text-xs text-gray-400 font-medium">Nhân sự</span></h4>
                <p className="text-xs text-blue-750 font-bold flex items-center gap-1.5 mt-0.5">
                  <span>Có {chiefNursesCount} điều dưỡng trưởng</span>
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Tỷ lệ Nhân lực đi làm</span>
                <h4 className="text-2xl font-black text-gray-900 leading-tight">
                  {activeRatio.toFixed(1)}%
                </h4>
                <p className="text-xs text-gray-500 font-medium mt-0.5">~{avgAttendance.toFixed(1)} nhân sự hoạt động hàng ngày</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="bg-pink-50 text-pink-600 p-3 rounded-lg">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Quỹ Nghỉ phép Lũy Kế</span>
                <h4 className="text-2xl font-black text-gray-900 leading-tight">{totalPApplied} <span className="text-xs text-gray-400 font-medium">Ngày P</span></h4>
                <p className="text-xs text-rose-600 font-bold mt-0.5">Và {totalKLApplied} ngày KL (Không lương)</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex items-center gap-4">
              <div className="bg-purple-50 text-purple-600 p-3 rounded-lg">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Chế độ đào tạo & thai sản</span>
                <h4 className="text-2xl font-black text-gray-900 leading-tight">{totalHApplied + totalTSApplied} <span className="text-xs text-gray-400 font-medium">Lượt nghỉ</span></h4>
                <p className="text-xs text-purple-750 font-bold mt-0.5">Học tập: {totalHApplied} | Thai sản: {totalTSApplied}</p>
              </div>
            </div>

          </div>

          {/* Charts Grid: Qualifications & Month Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
            
            {/* Line Chart: Daily Presence */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm lg:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                    <Calendar className="text-blue-500 w-4 h-4" />
                    Biểu đồ Phủ kín Nhân lực Làm việc ({days.length} Ngày)
                  </h3>
                  
                  {/* Department filtering switcher for stats */}
                  <div className="flex items-center gap-1.5 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                    <button
                      id="stats-filter-all"
                      onClick={() => setSelectedDeptFilter('All')}
                      className={`px-2 py-1 text-[10px] font-bold rounded-md ${selectedDeptFilter === 'All' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-950'}`}
                    >
                      Tất cả
                    </button>
                    {Object.keys(staffList).map(dept => (
                      <button
                        key={dept}
                        id={`stats-filter-${dept.replace(/\s+/g, '')}`}
                        onClick={() => setSelectedDeptFilter(dept)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md ${selectedDeptFilter === dept ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-950'}`}
                      >
                        {dept.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Đường biểu diễn dao động quân số hoạt động thực tế (X, X/2, S, C) trong tháng đối chiếu mức tối đa.</p>
              </div>

              <div className="w-full mt-4 bg-slate-50/50 p-2 rounded-lg border border-gray-100">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                  <defs>
                    <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Y Axis Grid lines */}
                  {Array(5).fill(0).map((_, i) => {
                    const yVal = paddingY + chartH - (i / 4) * chartH;
                    const gridLabel = (i / 4) * totalStaffCount;
                    return (
                      <g key={i}>
                        <line x1={paddingX} y1={yVal} x2={width - paddingX} y2={yVal} stroke="#e5e7eb" strokeDasharray="3 3" />
                        <text x={paddingX - 10} y={yVal + 3} className="text-[8px] font-mono fill-gray-400 text-right" textAnchor="end">
                          {gridLabel.toFixed(0)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area path */}
                  <path d={areaD} fill="url(#gradient-area)" />

                  {/* Line path */}
                  <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />

                  {/* Circle Data Points */}
                  {linePoints.map((p, i) => {
                    const sund = (p.date - 1) % 7 === 0;
                    return (
                      <g key={i} className="group/dot cursor-pointer">
                        <circle 
                          cx={p.x} 
                          cy={p.y} 
                          r={sund ? 3.5 : 2} 
                          fill={sund ? '#ef4444' : '#3b82f6'} 
                          stroke="#ffffff" 
                          strokeWidth="1" 
                        />
                        <title>{`Ngày ${p.date}: ${p.val.toFixed(1)} nhân sự làm việc`}</title>
                        <text 
                          x={p.x} 
                          y={p.y - 8} 
                          className="text-[8px] font-bold fill-blue-900 opacity-0 group-hover/dot:opacity-100 transition-opacity bg-white"
                          textAnchor="middle"
                        >
                          {p.val}
                        </text>
                      </g>
                    );
                  })}

                  {/* X Axis Labels */}
                  {linePoints.filter((_, idx) => idx % 3 === 0 || idx === linePoints.length - 1).map((p, idx) => (
                    <text key={idx} x={p.x} y={height - 2} className="text-[8px] font-mono fill-gray-400" textAnchor="middle">
                      N{p.date}
                    </text>
                  ))}
                </svg>
              </div>
            </div>

            {/* Donut Chart: Qualification Demographics */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2 border-b border-gray-50 pb-3">
                  <Award className="text-purple-500 w-4 h-4" />
                  Chất lượng & Trình độ Điều dưỡng
                </h3>
                <p className="text-xs text-gray-400 mt-2">Bản đồ phân loại nhân lực điều dưỡng toàn viện dựa trên trình độ chuyên môn kỹ thuật.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
                <div className="relative w-36 h-36 flex-none">
                  <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                    <circle cx={100} cy={100} r={70} fill="none" stroke="#f3f4f6" strokeWidth="20" />
                    {donutsParts.map((pt, i) => (
                      <path
                        key={i}
                        d={pt.path}
                        fill="none"
                        stroke={pt.color}
                        strokeWidth="20"
                        strokeLinecap="butt"
                        className="hover:opacity-85 cursor-pointer transition-opacity"
                        title={`${pt.name}: ${pt.val} người (${(pt.pct * 100).toFixed(0)}%)`}
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-gray-800 leading-none">{qualTotal}</span>
                    <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider block mt-1">Đội ngũ</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 w-full text-[10px]">
                  {donutsParts.map((pt, idx) => (
                    <div key={idx} className="flex items-center justify-between font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: pt.color }} />
                        <span className="text-gray-600 font-bold">{pt.name}</span>
                      </div>
                      <span className="text-gray-500 font-bold font-mono">
                        {pt.val} người ({ (pt.pct * 100).toFixed(0) }%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Critical Alert Warnings Section */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm no-print">
            <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wide flex items-center gap-2 border-b border-rose-50 pb-3">
              <AlertTriangle className="text-rose-500 w-5 h-5 animate-bounce" />
              Cảnh báo Đảm bảo Nhân lực Làm việc Tối thiểu (Ngưỡng Vận hành An Toàn)
            </h3>
            
            {warnings.length === 0 ? (
              <div className="p-4 mt-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg text-xs font-semibold">
                ✔ Tất cả các ngày trong tháng đều đảm bảo mức nhân lực tối thiểu làm việc tại khoa phòng! Không có hiện tượng bỏ trống không ai đi làm.
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-2 max-h-48 overflow-y-auto">
                {warnings.map((warn, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-100 text-rose-950 font-semibold rounded-lg text-xs hover:bg-rose-100/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 text-[10px] font-extrabold font-mono">Cảnh báo</span>
                      <span>
                        Ngày <strong>{warn.date} ({warn.dayName})</strong>: Khoa <strong>{warn.department}</strong> chỉ có{' '}
                        <strong className="text-rose-700 underline">{warn.count} điều dưỡng</strong> làm việc.
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 italic">
                      Định mức an toàn cần &gt;= {warn.limit} người đi làm
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : dashboardTab === 'ANALYTICS' ? (
        <div className="space-y-6">
          {/* Advanced HR Analytics Panel */}
          <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-6 rounded-2xl border border-slate-800 text-white shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10">
              <Activity className="w-64 h-64 text-blue-400" />
            </div>
            <div className="relative space-y-2 max-w-2xl">
              <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-wider">
                Advanced HR Analytics
              </span>
              <h2 className="text-xl font-black tracking-tight font-sans uppercase">
                Phân tích chuyên sâu Hiệu suất &amp; Công lao động
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Biểu đồ phân tích trực quan nâng cao giúp Phòng Điều dưỡng có cái nhìn tổng quan về tỷ lệ phân ca, tần suất trực đêm, tổng phép đã nghỉ và cơ cấu kíp trực để điều phối nhân sự hiệu quả giữa các khoa phòng khi có tình trạng quá tải cục bộ.
              </p>
            </div>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* 1. Qualification Shift Distribution & Workload Balance */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                    Phân phối ca theo Trình độ
                  </h3>
                  <p className="text-[10px] text-gray-400 font-medium">Phân phối ca trực (CNĐD, CĐĐĐ, ĐDTC...)</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                So sánh định mức lao động trung bình của từng chức danh trình độ đào tạo trong tháng {selectedMonth}. Giúp cân bằng khối lượng công việc chuyên môn.
              </p>

              <div className="space-y-4 flex-1">
                {hrAnalyticsData.qualificationStats.map((stat, idx) => {
                  const avgWorkdays = stat.staffCount > 0 ? (stat.totalWorkdays / stat.staffCount).toFixed(1) : '0';
                  const maxExpectedWorkdays = 22; // Standard monthly workdays
                  const progressPercent = Math.min(100, (parseFloat(avgWorkdays) / maxExpectedWorkdays) * 100);

                  return (
                    <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-gray-150/80 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-800 bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-md border border-purple-150/60 font-sans">
                          {stat.major}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">
                          {stat.staffCount} nhân sự
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10.5px]">
                          <span className="text-slate-500 font-bold">Số công TB / người:</span>
                          <span className="font-extrabold text-slate-800">{avgWorkdays} / 22 công</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              parseFloat(avgWorkdays) > 24 
                                ? 'bg-rose-500' 
                                : parseFloat(avgWorkdays) >= 18 
                                ? 'bg-emerald-500' 
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-dashed border-gray-200">
                        <div className="leading-tight">
                          <span className="text-[9px] text-gray-400 block font-bold">Tổng Công</span>
                          <span className="text-xs font-black text-slate-800 font-mono">{stat.totalWorkdays}</span>
                        </div>
                        <div className="leading-tight">
                          <span className="text-[9px] text-gray-400 block font-bold">Trực Đêm</span>
                          <span className="text-xs font-black text-indigo-700 font-mono">{stat.totalNightShifts}</span>
                        </div>
                        <div className="leading-tight">
                          <span className="text-[9px] text-gray-400 block font-bold">Nghỉ Phép</span>
                          <span className="text-xs font-black text-emerald-700 font-mono">{stat.totalLeaves}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Interactive Staff Ranks (Night Shifts & Yearly Leaves) */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                      Tần suất Trực &amp; Phép chi tiết
                    </h3>
                    <p className="text-[10px] text-gray-400 font-medium">Bảng xếp hạng khối lượng lao động từng người</p>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={analyticsSortBy}
                    onChange={(e) => setAnalyticsSortBy(e.target.value as any)}
                    className="p-1.5 border border-gray-250 bg-white rounded-lg text-[10.5px] font-black text-slate-700 focus:outline-hidden"
                  >
                    <option value="night">Trực đêm nhiều nhất</option>
                    <option value="work">Tổng công cao nhất</option>
                    <option value="leaves">Phép trong tháng</option>
                    <option value="yearly">Phép lũy kế năm</option>
                  </select>
                </div>
              </div>

              {/* Search & Dept Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={analyticsSearchQuery}
                    onChange={(e) => setAnalyticsSearchQuery(e.target.value)}
                    placeholder="Tìm tên nhân viên..."
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-200 bg-slate-50/50 rounded-xl text-xs font-bold placeholder-gray-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <select
                    value={analyticsDeptFilter}
                    onChange={(e) => setAnalyticsDeptFilter(e.target.value as any)}
                    className="w-full p-1.5 border border-gray-200 bg-slate-50/50 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
                  >
                    <option value="All">Tất cả khoa phòng</option>
                    {Object.keys(staffList).map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Staff Table / List */}
              <div className="flex-1 max-h-[380px] overflow-y-auto border border-gray-100 rounded-xl shadow-3xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-150 text-[10px] text-slate-400 uppercase font-black tracking-wider sticky top-0 z-10">
                      <th className="p-2.5 pl-3.5">Họ tên / Khoa</th>
                      <th className="p-2.5 text-center">Trình độ</th>
                      <th className="p-2.5 text-center">Ca Đêm (Đ)</th>
                      <th className="p-2.5 text-center">Trực 24h (T)</th>
                      <th className="p-2.5 text-center">Công Tháng</th>
                      <th className="p-2.5 pr-3.5 text-right font-black text-slate-500">Phép năm lũy kế</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {(() => {
                      const filtered = hrAnalyticsData.staffMetrics
                        .filter(sm => {
                          const matchesSearch = sm.name.toLowerCase().includes(analyticsSearchQuery.toLowerCase());
                          const matchesDept = analyticsDeptFilter === 'All' || sm.department === analyticsDeptFilter;
                          return matchesSearch && matchesDept;
                        })
                        .sort((a, b) => {
                          if (analyticsSortBy === 'night') return b.curNightShifts - a.curNightShifts;
                          if (analyticsSortBy === 'work') return b.curWorkdays - a.curWorkdays;
                          if (analyticsSortBy === 'leaves') return b.curLeaves - a.curLeaves;
                          if (analyticsSortBy === 'yearly') return b.yearlyLeavesUsed - a.yearlyLeavesUsed;
                          return 0;
                        });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-xs font-semibold italic text-gray-400">
                              Không tìm thấy nhân viên phù hợp bộ lọc.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((staff, i) => (
                        <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-2.5 pl-3.5">
                            <span className="font-bold text-slate-800 block leading-tight">{staff.name}</span>
                            <span className="text-[9.5px] text-slate-400 font-bold block mt-0.5">{staff.department}</span>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="text-[9.5px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black border border-slate-200">
                              {staff.major}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className={`text-xs font-black ${staff.curNightShifts > 4 ? 'text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100' : 'text-indigo-600'}`}>
                              {staff.curNightShifts}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-bold text-purple-600">
                            {staff.cur24hShifts}
                          </td>
                          <td className="p-2.5 text-center font-black text-slate-800 font-mono">
                            {staff.curWorkdays}
                          </td>
                          <td className="p-2.5 pr-3.5 text-right font-black text-emerald-700 font-mono">
                            {staff.yearlyLeavesUsed} <span className="text-[9px] text-slate-400 font-bold font-sans">ngày</span>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* 3. Operational Highlights & Alert Dashboard */}
          <div className="bg-amber-50/40 border border-amber-200/50 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl mt-0.5">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-amber-900 uppercase tracking-wide">
                  Đề xuất điều phối lâm bạ &amp; Kiệt sức (Anti-Burnout Insight)
                </h4>
                <p className="text-[11px] text-amber-800 leading-relaxed font-semibold">
                  {(() => {
                    const overloads = hrAnalyticsData.staffMetrics.filter(sm => sm.curNightShifts > 4 || sm.curWorkdays > 24);
                    if (overloads.length > 0) {
                      return `Hệ thống phân tích phát hiện có ${overloads.length} nhân viên (như ${overloads.slice(0, 2).map(o => o.name).join(', ')}${overloads.length > 2 ? '...' : ''}) đang có tần suất trực đêm quá dầy (>4 đêm) hoặc đi làm vượt định mức tối đa (>24 công) trong tháng. Khuyến nghị điều phối nhân viên từ các khoa khác sang hỗ trợ trực chéo để tránh kiệt sức nghề nghiệp y tế.`;
                    }
                    return 'Tuyệt vời! Hiện tại phân phối ca trực và kíp trực đêm của các nhân viên y tế đang nằm trong ngưỡng an toàn lao động y tế (<4 đêm trực/người), không phát hiện rủi ro kiệt sức do quá tải.';
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Detailed Medical/Operational Report & AI Audit Tab */
        <div id="printable-report-area" className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-md flex flex-col gap-8">
          
          {/* 1. Official Letterhead */}
          <div className="flex justify-between items-start border-b border-gray-300 pb-4">
            <div className="text-left font-serif">
              <p className="text-[10px] sm:text-xs font-bold text-gray-800 uppercase tracking-tight">SỞ Y TẾ TỈNH BẮC GIANG</p>
              <p className="text-[11px] sm:text-sm font-black text-gray-950 uppercase tracking-tight">BỆNH VIỆN ĐA KHOA SÔNG THƯƠNG</p>
              <p className="text-[9px] sm:text-[10px] text-gray-500 italic mt-0.5">Số: 142/BC-PĐD-SÔNGTHƯƠNG</p>
            </div>
            <div className="text-center font-serif">
              <p className="text-[10px] sm:text-xs font-black text-gray-950 uppercase tracking-tight">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p className="text-[11px] sm:text-xs font-bold text-gray-900 border-b border-gray-900 pb-1 uppercase tracking-tight">Độc lập - Tự do - Hạnh phúc</p>
              <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1">Bắc Giang, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
            </div>
          </div>

          {/* 2. Main Title */}
          <div className="text-center my-2 flex flex-col gap-1.5">
            <h1 className="text-base sm:text-xl font-black text-slate-900 uppercase tracking-wide">
              BÁO CÁO TOÀN DIỆN VỀ ĐIỀU PHỐI NHÂN LỰC &amp; CHẤT LƯỢNG LÂM SÀNG
            </h1>
            <p className="text-xs sm:text-sm font-bold text-gray-700">Tháng {monthStr} năm {yearStr}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Đối tượng rà soát: Toàn bộ Điều dưỡng, Hộ sinh, Kỹ thuật viên</p>
          </div>

          {/* 3. Executive Metrics Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="text-center border-r border-slate-200/60 last:border-0">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Nhân sự</span>
              <span className="text-lg sm:text-xl font-black text-blue-900">{totalStaffCount}</span>
              <span className="text-[9px] text-gray-500 block">Biên chế điều dưỡng</span>
            </div>
            <div className="text-center border-r border-slate-200/60 last:border-0">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Trực ban TB</span>
              <span className="text-lg sm:text-xl font-black text-emerald-700">~{avgAttendance.toFixed(1)}</span>
              <span className="text-[9px] text-gray-500 block">Kíp trực đi làm/ngày</span>
            </div>
            <div className="text-center border-r border-slate-200/60 last:border-0">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Tỷ lệ Phủ kín</span>
              <span className="text-lg sm:text-xl font-black text-purple-700">{activeRatio.toFixed(1)}%</span>
              <span className="text-[9px] text-gray-500 block">Hiệu suất sử dụng phép</span>
            </div>
            <div className="text-center last:border-0">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Phép lũy kế</span>
              <span className="text-lg sm:text-xl font-black text-pink-600">{totalPApplied} Ngày</span>
              <span className="text-[9px] text-gray-500 block">Tổng quỹ phép đã duyệt</span>
            </div>
          </div>

          {/* 4. Table breakdown */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-600 shrink-0" />
              <span>1. Chi tiết phân bổ nhân lực hoạt động từng khoa phòng</span>
            </h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-700 tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5">Khoa phòng</th>
                    <th className="px-3 py-2.5 text-center">Tổng nhân sự</th>
                    <th className="px-3 py-2.5 text-center">Hoạt động TB/ngày</th>
                    <th className="px-3 py-2.5 text-center">Tỷ lệ đi làm</th>
                    <th className="px-3 py-2.5 text-center">Nghỉ phép [P]</th>
                    <th className="px-3 py-2.5 text-center">Không lương [KL]</th>
                    <th className="px-3 py-2.5 text-center">Thai sản [TS]</th>
                    <th className="px-3 py-2.5 text-center">Học tập [H]</th>
                    <th className="px-3 py-2.5 text-center">Trạng thái lịch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium">
                  {departmentBreakdowns.map((dept, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 font-bold text-gray-900">{dept.department}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-gray-600">{dept.staffCount}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-emerald-700 font-bold">{dept.avgAttendance.toFixed(1)}</td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-blue-700">{dept.activeRatio.toFixed(1)}%</td>
                      <td className="px-3 py-2.5 text-center font-mono text-rose-600 font-semibold">{dept.leaves}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-gray-500">{dept.unpaidLeaves}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-purple-600">{dept.maternityLeaves}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-amber-600">{dept.studyLeaves}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                          dept.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          dept.status === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {dept.status === 'APPROVED' ? 'Đã duyệt' :
                           dept.status === 'SUBMITTED' ? 'Chờ duyệt' : 'Bản nháp'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-slate-50 font-bold border-t-2 border-gray-200">
                    <td className="px-3 py-2.5 text-gray-900">TỔNG TOÀN VIỆN</td>
                    <td className="px-3 py-2.5 text-center font-mono">{departmentBreakdowns.reduce((sum, d) => sum + d.staffCount, 0)}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-emerald-800">{avgAttendance.toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-blue-800">{activeRatio.toFixed(1)}%</td>
                    <td className="px-3 py-2.5 text-center font-mono text-rose-800">{totalPApplied}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-gray-700">{totalKLApplied}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-purple-800">{totalTSApplied}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-amber-800">{totalHApplied}</td>
                    <td className="px-3 py-2.5 text-center text-[10px] text-gray-400 font-mono">HỆ THỐNG</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Clinical Compliance Scorecard Component */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>2. Thẩm định quy chuẩn vận hành lâm sàng &amp; An toàn kíp trực</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Criterion 1 */}
              <div className="p-3.5 rounded-xl border border-slate-150 bg-slate-50/50 flex flex-col justify-between gap-2">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tỷ lệ Cử nhân ĐĐ</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase ${
                    complianceScorecard.isCnPassed 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {complianceScorecard.isCnPassed ? 'ĐẠT' : 'CẦN CHỈNH'}
                  </span>
                </div>
                <div className="leading-tight">
                  <span className="text-sm font-black text-slate-800 font-mono">{(complianceScorecard.pctCN * 100).toFixed(1)}%</span>
                  <span className="text-[9.5px] text-slate-500 block mt-0.5">Yêu cầu tối thiểu &gt;= 25% tổng biên chế lâm sàng để đảm bảo an toàn kỹ thuật cao.</span>
                </div>
              </div>

              {/* Criterion 2 */}
              <div className="p-3.5 rounded-xl border border-slate-150 bg-slate-50/50 flex flex-col justify-between gap-2">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Trực gác tối thiểu</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase ${
                    complianceScorecard.isStaffingPassed 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                  }`}>
                    {complianceScorecard.isStaffingPassed ? 'ĐẠT' : 'CÓ VI PHẠM'}
                  </span>
                </div>
                <div className="leading-tight">
                  <span className="text-sm font-black text-slate-800 font-mono">
                    {complianceScorecard.isStaffingPassed ? 'Không phát hiện thiếu hụt' : `${complianceScorecard.warningsCount} ngày thiếu`}
                  </span>
                  <span className="text-[9.5px] text-slate-500 block mt-0.5">Các ca trực bắt buộc phải có ít nhất 1-3 ĐĐ làm việc tùy quy định đặc thù khoa phòng.</span>
                </div>
              </div>

              {/* Criterion 3 */}
              <div className="p-3.5 rounded-xl border border-slate-150 bg-slate-50/50 flex flex-col justify-between gap-2">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Ngăn ngừa kiệt sức</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase ${
                    complianceScorecard.isOverloadPassed 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {complianceScorecard.isOverloadPassed ? 'AN TOÀN' : 'CẢNH BÁO'}
                  </span>
                </div>
                <div className="leading-tight">
                  <span className="text-sm font-black text-slate-800 font-mono">
                    {complianceScorecard.isOverloadPassed ? 'Trực tối đa <= 24 công' : 'Có ĐĐ làm quá 24 công'}
                  </span>
                  <span className="text-[9.5px] text-slate-500 block mt-0.5">Định mức an toàn giới hạn số ngày đi làm tối đa trong tháng để giữ sức khỏe điều dưỡng.</span>
                </div>
              </div>

              {/* Criterion 4 */}
              <div className="p-3.5 rounded-xl border border-slate-150 bg-slate-50/50 flex flex-col justify-between gap-2">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Chỉ đạo &amp; Giám sát</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase ${
                    complianceScorecard.isSupervisionPassed 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {complianceScorecard.isSupervisionPassed ? 'ĐỦ GIÁM SÁT' : 'THIẾU CHỈ ĐẠO'}
                  </span>
                </div>
                <div className="leading-tight">
                  <span className="text-sm font-black text-slate-800 font-mono">
                    {complianceScorecard.isSupervisionPassed ? 'ĐD Trưởng trực tốt' : 'ĐD Trưởng trực quá ít'}
                  </span>
                  <span className="text-[9.5px] text-slate-500 block mt-0.5">Đảm bảo vai trò điều hành chính của Điều dưỡng trưởng luôn hoạt động đều trong tháng.</span>
                </div>
              </div>

            </div>

            {/* Score progress bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-3xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Điểm chất lượng quy chuẩn lâm sàng:</span>
                <span className={`text-sm font-black ${
                  complianceScorecard.score >= 75 ? 'text-emerald-700' : 'text-amber-700'
                }`}>{complianceScorecard.score}/100</span>
              </div>
              <div className="flex-1 max-w-sm bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    complianceScorecard.score >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`} 
                  style={{ width: `${complianceScorecard.score}%` }} 
                />
              </div>
              <span className="text-[10px] text-slate-400 font-bold italic">
                {complianceScorecard.score === 100 
                  ? '✔ Đạt tiêu chuẩn ISO lâm sàng tối ưu' 
                  : '⚠ Cần điều chỉnh một số ca trực đề xuất'}
              </span>
            </div>
          </div>

          {/* 5. Competency Structure and Demographics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <h3 className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-purple-600 shrink-0" />
                <span>3. Đánh giá chất lượng &amp; cơ cấu chuyên ngành</span>
              </h3>
              <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-100/60 flex flex-col gap-3">
                <p className="text-xs text-gray-600 leading-relaxed font-semibold">
                  Cơ cấu kỹ thuật lâm sàng dựa trên bằng cấp đào tạo chuyên ngành của đội ngũ. Tỷ lệ điều dưỡng trình độ Cử nhân (CNĐĐ) và Cao đẳng đảm bảo hoạt động kỹ thuật nâng cao.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {donutsParts.map((pt, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded-lg border border-purple-50 shadow-xs flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pt.color }} />
                      <div className="leading-tight">
                        <span className="text-[10px] text-gray-400 font-bold block">{pt.name}</span>
                        <span className="text-xs font-black text-gray-800">{pt.val} người ({ (pt.pct * 100).toFixed(0) }%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 6. Administrative Handover & Risk Review */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>4. Danh sách cảnh báo rủi ro an toàn vận hành</span>
              </h3>
              <div className="flex-1 p-4 bg-rose-50/45 rounded-xl border border-rose-100/60 flex flex-col gap-2.5 max-h-[170px] overflow-y-auto">
                {warnings.length === 0 ? (
                  <p className="text-xs text-emerald-800 font-semibold italic flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Hệ thống rà soát tự động không phát hiện rủi ro thiếu hụt nhân sự cục bộ trong tháng.</span>
                  </p>
                ) : (
                  warnings.slice(0, 10).map((warn, i) => (
                    <div key={i} className="text-xs font-semibold text-rose-950 flex items-start gap-1.5 leading-tight">
                      <span className="text-rose-600 text-[10px] uppercase font-black bg-rose-100 px-1.5 py-0.5 rounded shrink-0">Ngày {warn.date}</span>
                      <span>
                        Khoa <strong>{warn.department}</strong> có <strong>{warn.count} ĐĐ</strong> đi làm (Ngưỡng an toàn &gt;={warn.limit})
                      </span>
                    </div>
                  ))
                )}
                {warnings.length > 10 && (
                  <span className="text-[10px] text-rose-700 font-bold italic mt-1">
                    ...và {warnings.length - 10} cảnh báo an toàn khác. Xem chi tiết trong biểu đồ hoặc tệp excel.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 7. AI Clinical Review & Guidance */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs sm:text-sm font-black text-amber-800 uppercase tracking-wide border-b border-amber-100 pb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>5. Kết quả rà soát chi tiết bằng trí tuệ nhân tạo (AI Audit Report)</span>
            </h3>

            {aiLoading ? (
              <div className="p-8 bg-amber-50/30 border border-amber-200/50 rounded-2xl flex flex-col items-center justify-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto text-amber-500 w-4 h-4 animate-ping" />
                </div>
                <div className="text-center">
                  <h4 className="text-xs font-bold text-amber-900">Bác sĩ ảo Gemini đang rà soát chuyên sâu...</h4>
                  <p className="text-[10px] text-amber-600 mt-1 max-w-sm leading-relaxed font-medium">
                    Hệ thống đang tiến hành đối chiếu luật lao động y tế, rà soát trùng lịch trực, phát hiện quá tải ca, cảnh báo thiếu hụt Cử nhân điều dưỡng và tính toán phương án cứu trợ chéo...
                  </p>
                </div>
              </div>
            ) : aiReport ? (
              <div className="p-5 sm:p-6 bg-amber-50/35 border border-amber-200/40 rounded-2xl shadow-xs relative">
                <div className="absolute top-4 right-4 bg-amber-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-xs">
                  AI Verified
                </div>
                
                {/* AI Markdown render */}
                <div 
                  className="prose prose-sm leading-relaxed text-gray-800"
                  dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(aiReport) }}
                />

                {onTriggerAI && (
                  <button
                    onClick={onTriggerAI}
                    className="mt-4 flex items-center gap-1 text-xs text-amber-700 font-bold hover:text-amber-900 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                    <span>Tải lại rà soát bằng AI</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-4 text-center">
                <div className="bg-amber-50 text-amber-600 p-3 rounded-full border border-amber-100 shadow-xs">
                  <Sparkles className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-tight">Chưa tiến hành rà soát bằng AI</h4>
                  <p className="text-[10px] text-gray-400 font-semibold max-w-sm mt-1 leading-relaxed">
                    Hãy bấm nút bên dưới để Trợ lý ảo Gemini quét và đưa ra rà soát, đề xuất chuyên môn tối ưu hóa và cảnh báo lỗ hổng lịch trực cho Phòng Điều dưỡng.
                  </p>
                </div>
                {onTriggerAI && (
                  <button
                    onClick={onTriggerAI}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg shadow-xs cursor-pointer transition-transform flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Bắt đầu rà soát bằng AI</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 8. Signature Block */}
          <div className="grid grid-cols-3 gap-6 text-center text-xs mt-12 font-serif">
            <div className="flex flex-col justify-between h-28">
              <span className="font-bold text-gray-800">Người lập báo cáo</span>
              <div>
                <div className="h-10"></div>
                <span className="font-extrabold text-gray-900 block">Phòng Điều dưỡng</span>
                <span className="text-[10px] text-gray-400">(Ký, ghi rõ họ tên)</span>
              </div>
            </div>
            <div className="flex flex-col justify-between h-28">
              <span className="font-bold text-gray-800">Trưởng phòng Điều dưỡng</span>
              <div>
                <div className="h-10"></div>
                <span className="font-extrabold text-gray-900 block">{headOfNursingName}</span>
                <span className="text-[10px] text-gray-400">(Ký, ghi rõ họ tên)</span>
              </div>
            </div>
            <div className="flex flex-col justify-between h-28">
              <span className="font-bold text-gray-800">Giám đốc Bệnh viện</span>
              <div>
                <div className="h-10"></div>
                <span className="font-extrabold text-gray-900 block">Ban Giám Đốc</span>
                <span className="text-[10px] text-gray-400">(Ký tên, đóng dấu)</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
