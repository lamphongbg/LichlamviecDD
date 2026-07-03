import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface MonthSelectorProps {
  selectedMonth: string;
  onChangeMonth: (month: string) => void;
}

export default function MonthSelector({ selectedMonth, onChangeMonth }: MonthSelectorProps) {
  const [isOpenMonthDropdown, setIsOpenMonthDropdown] = useState(false);

  const handleShiftMonth = (direction: 'prev' | 'next') => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-12
    
    let nextYear = year;
    let nextMonth = month;
    if (direction === 'prev') {
      nextMonth = month - 1;
      if (nextMonth < 1) {
        nextMonth = 12;
        nextYear = year - 1;
      }
    } else {
      nextMonth = month + 1;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear = year + 1;
      }
    }
    
    const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
    onChangeMonth(nextMonthStr);
  };

  return (
    <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 shadow-2xs">
      {/* Previous Month button */}
      <button
        onClick={() => handleShiftMonth('prev')}
        className="p-1 px-1.5 text-slate-550 hover:text-blue-600 hover:bg-slate-200/50 rounded transition-all cursor-pointer"
        title="Bấm để chuyển về tháng trước"
        type="button"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Middle clickable Month Trigger */}
      <div className="relative flex items-center px-0.5">
        <button
          onClick={() => setIsOpenMonthDropdown(!isOpenMonthDropdown)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-slate-800 hover:text-blue-600 hover:bg-slate-200/45 rounded transition-all uppercase cursor-pointer tracking-wider shrink-0"
          type="button"
          title="Chọn nhanh tháng bằng danh sách"
        >
          <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="font-sans">
            Tháng {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}
          </span>
        </button>
      </div>

      {/* Next Month button */}
      <button
        onClick={() => handleShiftMonth('next')}
        className="p-1 px-1.5 text-slate-550 hover:text-blue-600 hover:bg-slate-200/50 rounded transition-all cursor-pointer"
        title="Bấm để sang tháng tiếp theo"
        type="button"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* Quick Months dropdown menu */}
      {isOpenMonthDropdown && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-lg shadow-xl p-3.5 z-40 w-72 text-left animate-fade-in">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-sans tracking-wide">Chọn nhanh tháng làm việc:</span>
            <button
              onClick={() => setIsOpenMonthDropdown(false)}
              className="text-slate-400 hover:text-slate-700 text-sm font-bold px-1.5 py-0.2 hover:bg-slate-100 rounded cursor-pointer leading-none"
              type="button"
            >
              ×
            </button>
          </div>
          
          {/* Select Year helper */}
          <div className="grid grid-cols-3 gap-1 mb-2.5 border-b border-slate-100 pb-2">
            {['2025', '2026', '2027'].map((yr) => {
              const isSelectedYear = selectedMonth.startsWith(yr);
              return (
                <button
                  key={yr}
                  onClick={() => {
                    const curMonthPart = selectedMonth.split('-')[1] || '03';
                    onChangeMonth(`${yr}-${curMonthPart}`);
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-bold text-center cursor-pointer transition-colors ${
                    isSelectedYear
                      ? 'bg-blue-600 text-white font-black'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                  type="button"
                >
                  Năm {yr}
                </button>
              );
            })}
          </div>

          {/* Grid of 12 months */}
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => {
              const mIndex = i + 1;
              const monthVal = String(mIndex).padStart(2, '0');
              const currentYear = selectedMonth.split('-')[0] || '2026';
              const targetValue = `${currentYear}-${monthVal}`;
              const isCurrentSelected = selectedMonth === targetValue;

              return (
                <button
                  key={mIndex}
                  onClick={() => {
                    onChangeMonth(targetValue);
                    setIsOpenMonthDropdown(false);
                  }}
                  className={`py-1.5 rounded text-[10px] font-bold text-center cursor-pointer transition-all border ${
                    isCurrentSelected
                      ? 'bg-blue-50 border-blue-600 text-blue-700 font-extrabold shadow-2xs'
                      : 'bg-slate-50 hover:bg-blue-50/40 hover:border-blue-200 border-slate-200 text-slate-600 hover:text-blue-700'
                  }`}
                  type="button"
                >
                  T{mIndex}
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between font-sans">
            <button
              onClick={() => {
                onChangeMonth('2026-03');
                setIsOpenMonthDropdown(false);
              }}
              className="text-[9px] font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-wider cursor-pointer"
              type="button"
            >
              Mặc định (03/2026)
            </button>
            <span className="text-[8px] font-mono font-bold text-slate-400">
              BV ĐA KHOA SÔNG THƯƠNG
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
