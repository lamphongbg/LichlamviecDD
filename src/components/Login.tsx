import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, Building, ShieldCheck, AlertCircle, Eye, EyeOff, Activity, ChevronDown, User } from 'lucide-react';
import { Role, Department, AuthUser, Staff } from '../types';
import { INITIAL_STAFF } from '../initialData';

interface LoginProps {
  onLoginSuccess: (user: AuthUser) => void;
}

type LoginOption = 'noinhi' | 'ngoai' | 'yhct' | 'lck' | 'admin' | 'phongdieuduong' | 'staff';

export default function Login({ onLoginSuccess }: LoginProps) {
  const [selectedOption, setSelectedOption] = useState<LoginOption>('noinhi');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Staff Selection States
  const [staffDept, setStaffDept] = useState<string>('Nội - Nhi');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  // Load staff list from localstorage or fallback to INITIAL_STAFF
  const [staffList, setStaffList] = useState<Record<string, Staff[]>>(() => {
    try {
      const cached = localStorage.getItem('song_thuong_staff_list_v1');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_STAFF;
  });

  const [storedPasswords, setStoredPasswords] = useState<Record<LoginOption, string>>({
    admin: '',
    phongdieuduong: '',
    noinhi: '',
    ngoai: '',
    yhct: '',
    lck: '',
    staff: ''
  });

  // Load latest passwords from localStorage
  useEffect(() => {
    const cached = localStorage.getItem('song_thuong_auth_passwords_v3');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Ensure all keys are defined (fallback if cache is partially outdated)
        const updated = {
          admin: parsed.admin ?? '',
          phongdieuduong: parsed.phongdieuduong ?? '',
          noinhi: parsed.noinhi ?? '',
          ngoai: parsed.ngoai ?? '',
          yhct: parsed.yhct ?? '',
          lck: parsed.lck ?? '',
          staff: ''
        };
        setStoredPasswords(updated);
      } catch (e) {
        console.error("Error loading cached passwords", e);
      }
    } else {
      const defaults = {
        admin: '',
        phongdieuduong: '',
        noinhi: '',
        ngoai: '',
        yhct: '',
        lck: '',
        staff: ''
      };
      localStorage.setItem('song_thuong_auth_passwords_v3', JSON.stringify(defaults));
      setStoredPasswords(defaults);
    }
  }, []);

  // Update selected staff id when department changes
  useEffect(() => {
    const list = staffList[staffDept] || [];
    if (list.length > 0) {
      setSelectedStaffId(list[0].id);
    } else {
      setSelectedStaffId('');
    }
  }, [staffDept, staffList]);

  // List of authorized divisions/departments for selection
  const loginOptions = [
    { value: 'noinhi' as LoginOption, label: 'Khoa Nội - Nhi (Điều dưỡng Trưởng)', role: 'CHIEF_NURSE' as Role, dept: 'Nội - Nhi' as Department },
    { value: 'ngoai' as LoginOption, label: 'Khoa Ngoại (Điều dưỡng Trưởng)', role: 'CHIEF_NURSE' as Role, dept: 'Ngoại' as Department },
    { value: 'yhct' as LoginOption, label: 'Khoa YHCT - PHCN (Điều dưỡng Trưởng)', role: 'CHIEF_NURSE' as Role, dept: 'YHCT - PHCN' as Department },
    { value: 'lck' as LoginOption, label: 'Liên Chuyên Khoa (Điều dưỡng Trưởng)', role: 'CHIEF_NURSE' as Role, dept: 'LCK' as Department },
    { value: 'phongdieuduong' as LoginOption, label: 'Phòng Điều dưỡng (Trưởng phòng)', role: 'HEAD_OF_NURSING' as Role, dept: undefined },
    { value: 'admin' as LoginOption, label: 'Tài khoản Admin (Hệ thống)', role: 'ADMIN' as Role, dept: undefined },
    { value: 'staff' as LoginOption, label: 'Tra cứu lịch cá nhân (Nhân viên y tế)', role: 'STAFF' as Role, dept: undefined },
  ];

  // Handle local form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedOption === 'staff') {
      if (!selectedStaffId) {
        setError('Vui lòng chọn nhân viên y tế cần tra cứu.');
        return;
      }
      setIsLoading(true);
      setTimeout(() => {
        const list = staffList[staffDept] || [];
        const staffObj = list.find(s => s.id === selectedStaffId);
        if (staffObj) {
          onLoginSuccess({
            username: staffObj.id,
            role: 'STAFF',
            department: staffDept,
            fullName: staffObj.name
          });
        } else {
          setError('Không tìm thấy nhân viên đã chọn.');
        }
        setIsLoading(false);
      }, 400);
      return;
    }

    // Dynamic password lookup (default is empty string now)
    const expectedPassword = storedPasswords[selectedOption] ?? '';

    // If expected password is set (not empty), but no input was provided, block submit
    if (expectedPassword !== '' && !password) {
      setError('Vui lòng nhập mật khẩu xác thực để đăng nhập khoa của bạn.');
      return;
    }

    setIsLoading(true);

    // Simulate database network check for smooth professional feedback
    setTimeout(() => {
      if (password === expectedPassword) {
        // Load custom representative fullNames if configured
        let customNames: Record<string, string> = {};
        try {
          const cachedNames = localStorage.getItem('song_thuong_account_names_v3');
          if (cachedNames) customNames = JSON.parse(cachedNames);
        } catch (e) {
          console.error(e);
        }

        if (selectedOption === 'admin') {
          onLoginSuccess({
            username: 'admin',
            role: 'ADMIN',
            fullName: customNames['admin'] || 'Quản trị viên Hệ thống (Admin)'
          });
        } else if (selectedOption === 'phongdieuduong') {
          onLoginSuccess({
            username: 'phongdieuduong',
            role: 'HEAD_OF_NURSING',
            fullName: customNames['phongdieuduong'] || 'Nguyễn Thanh Hương'
          });
        } else {
          const config = loginOptions.find(o => o.value === selectedOption);
          const dept = config?.dept || 'Nội - Nhi';
          
          // Get representative name: first try customNames, then chief nurse in staff list, then fallback
          let fullName = customNames[selectedOption] || '';
          
          if (!fullName) {
            try {
              const cached = localStorage.getItem('song_thuong_staff_list_v1');
              if (cached) {
                const staffList = JSON.parse(cached);
                const staffs = staffList[dept];
                if (Array.isArray(staffs)) {
                  const chief = staffs.find((s: any) => s.isChief);
                  if (chief) fullName = chief.name;
                }
              }
            } catch (e) {
              console.error(e);
            }
          }
          
          if (!fullName) {
            const fallbacks: Record<string, string> = {
              'Nội - Nhi': 'Phạm Thị Cánh',
              'Ngoại': 'Trương Thị Ngân',
              'YHCT - PHCN': 'Phạm Thị Hiền',
              'LCK': 'Trần Hoài Thương'
            };
            fullName = fallbacks[dept] || 'Điều dưỡng Trưởng';
          }
          
          onLoginSuccess({
            username: selectedOption, // Use selectedOption as username to track who changed pass
            role: 'CHIEF_NURSE',
            department: dept,
            fullName
          });
        }
        setIsLoading(false);
      } else {
        setError(`Mật khẩu không chính xác. Vui lòng nhập đúng hoặc liên hệ Trưởng phòng Điều dưỡng để được đặt lại.`);
        setIsLoading(false);
      }
    }, 400);
  };

  const getPasswordStatusText = (option: LoginOption) => {
    if (option === 'staff') return "Tra cứu tự do";
    const rawPass = storedPasswords[option];
    if (rawPass === "" || rawPass === undefined) return "Không mật khẩu (Đăng nhập trực tiếp)";
    return "Đã thiết lập khóa bảo mật";
  };

  const isCurrentPasswordless = selectedOption === 'staff' || (storedPasswords[selectedOption] ?? '') === '';

  return (
    <div id="login-container" className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Visual background atmospheric elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse duration-[12000ms]" />
      <div className="absolute top-[40%] left-[35%] w-[30%] h-[30%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main card */}
      <motion.div
        id="login-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-slate-900/40 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl relative z-10"
      >
        {/* Portal Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-[0_4px_20px_rgba(59,130,246,0.3)] mb-4 animate-bounce duration-[3000ms]">
            <Activity className="w-7 h-7" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 mb-2">
            BỆNH VIỆN ĐA KHOA SÔNG THƯƠNG
          </span>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 tracking-wider">CỔNG ỦY QUYỀN SỐ HÓA</h2>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">Hệ Thống Phân Công Lịch Trực & Thẩm Định Nhân Lực Điều Dưỡng</p>
        </div>

        {/* Action Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Department / Division Select Dropdown */}
          <div className="space-y-1.5">
            <label htmlFor="dept-select-option" className="block text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-blue-400" />
              Chọn Bộ phận đăng nhập
            </label>
            <div className="relative">
              <select
                id="dept-select-option"
                value={selectedOption}
                onChange={(e) => {
                  setSelectedOption(e.target.value as LoginOption);
                  setError(null);
                  setPassword(''); // Clear fields on change
                }}
                className="w-full pl-3 pr-10 py-3 bg-slate-950/80 border border-white/[0.08] hover:border-slate-600 rounded-xl text-sm font-bold text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all cursor-pointer appearance-none"
              >
                {loginOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900 text-white py-2">
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {selectedOption === 'staff' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 pt-1"
            >
              {/* Staff Department Selection */}
              <div className="space-y-1.5">
                <label htmlFor="staff-dept-select" className="block text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-400" />
                  Chọn Khoa / Phòng làm việc
                </label>
                <div className="relative">
                  <select
                    id="staff-dept-select"
                    value={staffDept}
                    onChange={(e) => {
                      setStaffDept(e.target.value);
                      setError(null);
                    }}
                    className="w-full pl-3 pr-10 py-3 bg-slate-950/80 border border-white/[0.08] hover:border-slate-600 rounded-xl text-sm font-bold text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all cursor-pointer appearance-none"
                  >
                    {Object.keys(staffList).map((dept) => (
                      <option key={dept} value={dept} className="bg-slate-900 text-white py-2">
                        {dept}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Staff Name Selection */}
              <div className="space-y-1.5">
                <label htmlFor="staff-name-select" className="block text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  Họ và tên của bạn
                </label>
                <div className="relative">
                  <select
                    id="staff-name-select"
                    value={selectedStaffId}
                    onChange={(e) => {
                      setSelectedStaffId(e.target.value);
                      setError(null);
                    }}
                    className="w-full pl-3 pr-10 py-3 bg-slate-950/80 border border-white/[0.08] hover:border-slate-600 rounded-xl text-sm font-bold text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all cursor-pointer appearance-none"
                  >
                    {(staffList[staffDept] || []).map((staff) => (
                      <option key={staff.id} value={staff.id} className="bg-slate-900 text-white py-2">
                        {staff.name} ({staff.major})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Password Input (Hidden or styled as optional when passwordless) */}
          {selectedOption !== 'staff' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password-input" className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                  Mật khẩu xác minh
                </label>
                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${isCurrentPasswordless ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/30' : 'bg-amber-950/40 text-amber-300 border border-amber-800/20'}`}>
                  {getPasswordStatusText(selectedOption)}
                </span>
              </div>
              
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isCurrentPasswordless ? "Tài khoản hiện không cần mật khẩu. Hãy nhấn Đăng nhập!" : "Nhập mật khẩu riêng đã tạo để đăng nhập"}
                  disabled={isCurrentPasswordless}
                  className={`w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 transition-all ${
                    isCurrentPasswordless
                      ? 'border-emerald-500/30 text-slate-400 focus:ring-emerald-500/50 bg-slate-950/40 cursor-not-allowed'
                      : 'border-white/[0.08] focus:ring-blue-500/50 focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                  }`}
                />
                {!isCurrentPasswordless && (
                  <button
                    id="toggle-pass-visibility-btn"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
              
              {isCurrentPasswordless ? (
                <p className="text-[10px] text-emerald-400 font-medium">
                  ✨ Tài khoản này hiện tại chưa đặt mật khẩu khóa học. Mọi thành viên có quyền truy cập trực tiếp và có thể thiết lập mật khẩu bảo mật riêng từ menu sau khi đăng nhập.
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 italic">
                  * tài khoản này đã được đặt mật khẩu khóa riêng. Nhập mật khẩu để tiếp tục.
                </p>
              )}
            </div>
          )}

          {/* Feedback alerts */}
          {error && (
            <motion.div
              id="login-error-alert"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-200"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Submit Action Button */}
          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center justify-center gap-2.5 shadow-[0_4px_20px_rgba(59,130,246,0.25)] hover:shadow-[0_4px_25px_rgba(59,130,246,0.4)] active:scale-[0.98] cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Xác nhận danh tính khoa trực...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Bắt đầu Đăng nhập</span>
              </>
            )}
          </button>
        </form>

      </motion.div>

      {/* Hospital Footer signature */}
      <div className="mt-8 text-center text-[10px] text-slate-500 font-medium tracking-wide relative z-10">
        <p>© 2026 BỆNH VIỆN ĐA KHOA SÔNG THƯƠNG BẮC GIANG</p>
        <p className="text-slate-600 mt-0.5">Đường Lê Lợi, Phường Hoàng Văn Thụ, Thành phố Bắc Giang</p>
      </div>

    </div>
  );
}
