import React, { useState } from 'react';
import { DepartmentSchedule, Staff, DaySchedule, Department } from '../types';
import { getMarch2026Days } from '../initialData';
import { Shield, Users, Calendar, AlertTriangle, TrendingUp, Award, Clock } from 'lucide-react';
import MonthSelector from './MonthSelector';

interface StatsDashboardProps {
  departmentSchedules: DepartmentSchedule[];
  staffList: Record<string, Staff[]>;
  selectedMonth: string;
  onChangeMonth: (month: string) => void;
}

export default function StatsDashboard({
  departmentSchedules,
  staffList,
  selectedMonth,
  onChangeMonth
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

  // Flatten all staffs and their respective schedules
  const allStaffs = Object.values(staffList).flat();
  
  // Calculate total personnel counts
  const totalStaffCount = allStaffs.length;
  const chiefNursesCount = allStaffs.filter(s => s.isChief).length;

  // Calculate qualification demographics (CNĐĐ, CĐĐĐ, ĐDTC, YSĐK, etc.)
  const qualifications: Record<string, number> = {};
  allStaffs.forEach(s => {
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
  const activeRatio = totalStaffCount > 0 ? (avgAttendance / (selectedDeptFilter === 'All' ? totalStaffCount : staffList[selectedDeptFilter].length)) * 100 : 0;

  // Identify Understaffing warnings (Daily active staff < 3 for YHCT / LCK or < 1 for Nội-Nhi / Ngoại)
  const warnings: { date: string; dayName: string; department: Department; count: number; limit: number }[] = [];
  
  days.forEach(d => {
    departmentSchedules.forEach(deptSche => {
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

  // Custom data arrays for pure SVG charting
  const qualColors: Record<string, string> = {
    CNĐĐ: '#3b82f6', // blue
    CĐĐĐ: '#10b981', // emerald
    ĐDTC: '#f59e0b', // amber
    YSĐK: '#8b5cf6', // violet
    TSCT: '#ec4899', // pink
    CĐPHCN: '#06b6d4' // cyan
  };

  const qualTotal = Object.values(qualifications).reduce((a, b) => a + b, 0);

  // SVG parameters for Qualification donut
  let lastAngle = 0;
  const donutsParts = Object.entries(qualifications).map(([name, val]) => {
    const pct = val / qualTotal;
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
    const y = paddingY + chartH - (val / (selectedDeptFilter === 'All' ? maxAttendance : staffList[selectedDeptFilter].length)) * chartH;
    return { x, y, val, date: idx + 1 };
  });

  const pathD = linePoints.length > 0 
    ? `M ${linePoints[0].x} ${linePoints[0].y} ` + linePoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const areaD = linePoints.length > 0
    ? `${pathD} L ${linePoints[linePoints.length-1].x} ${paddingY + chartH} L ${linePoints[0].x} ${paddingY + chartH} Z`
    : '';

  return (
    <div className="flex flex-col gap-6">

      {/* Top Filter and Month selection Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:inline">Lọc theo tháng thống kê:</h2>
          <MonthSelector selectedMonth={selectedMonth} onChangeMonth={onChangeMonth} />
        </div>
        
        {/* Unified Department filter */}
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

      {/* Primary KPI Indicator Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="bg-blue-50 text-blue-600 p-3 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Tổng điều dưỡng viên</span>
            <h4 className="text-2xl font-black text-gray-900 leading-tight">{totalStaffCount} <span className="text-xs text-gray-400 font-medium">Nhân sự</span></h4>
            <p className="text-xs text-blue-700 font-semibold flex items-center gap-1.5 mt-0.5">
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
            <p className="text-xs text-purple-700 font-semibold mt-0.5">Học tập: {totalHApplied} | Thai sản: {totalTSApplied}</p>
          </div>
        </div>

      </div>

      {/* Charts Grid: Qualifications & Month Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
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
                const gridLabel = (i / 4) * (selectedDeptFilter === 'All' ? maxAttendance : staffList[selectedDeptFilter].length);
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
                // Highlight sunday point with red color
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
                    {/* Tiny hover tip */}
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
            <p className="text-xs text-gray-400 mt-2">Bản đồ phân loại nhân lực điều dưỡng toàn viện dựa trên trình độ kỹ thuật (CNĐĐ, CĐĐĐ, v.v.).</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
            {/* SVG Donut */}
            <div className="relative w-36 h-36 flex-none">
              <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                {/* Gray background arc */}
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
              {/* Inner Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-gray-800 leading-none">{qualTotal}</span>
                <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider block mt-1">Đội ngũ</span>
              </div>
            </div>

            {/* Labels right */}
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
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
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

    </div>
  );
}
