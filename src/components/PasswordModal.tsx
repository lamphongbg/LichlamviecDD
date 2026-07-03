import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Lock, KeyRound, ShieldAlert, CheckCircle2, RefreshCw, UserCheck, Eye, EyeOff, AlertTriangle, ShieldCheck, Trash } from 'lucide-react';
import { AuthUser } from '../types';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
}

type AccountKey = 'admin' | 'phongdieuduong' | 'noinhi' | 'ngoai' | 'yhct' | 'lck';

const ACCOUNT_LABELS: Record<AccountKey, string> = {
  admin: 'Tài khoản Admin (Hệ thống)',
  phongdieuduong: 'Phòng Điều dưỡng (Trưởng phòng)',
  noinhi: 'Khoa Nội - Nhi',
  ngoai: 'Khoa Ngoại',
  yhct: 'Khoa YHCT - PHCN',
  lck: 'Liên Chuyên Khoa'
};

const DEFAULT_PASSWORDS: Record<AccountKey, string> = {
  admin: '',
  phongdieuduong: '',
  noinhi: '',
  ngoai: '',
  yhct: '',
  lck: ''
};

const DEFAULT_ACCOUNT_NAMES: Record<AccountKey, string> = {
  admin: 'Quản trị viên Hệ thống (Admin)',
  phongdieuduong: 'Nguyễn Thanh Hương',
  noinhi: 'Phạm Thị Cánh',
  ngoai: 'Trương Thị Ngân',
  yhct: 'Phạm Thị Hiền',
  lck: 'Trần Hoài Thương'
};

export default function PasswordModal({ isOpen, onClose, currentUser }: PasswordModalProps) {
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});

  // Custom confirmation dialog state to bypass sandbox restriction
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

  // Dynamic loaded passwords for all accounts
  const [accounts, setAccounts] = useState<Record<AccountKey, string>>({
    admin: '',
    phongdieuduong: '',
    noinhi: '',
    ngoai: '',
    yhct: '',
    lck: ''
  });

  // Dynamic loaded full names for all accounts
  const [accountNames, setAccountNames] = useState<Record<AccountKey, string>>(DEFAULT_ACCOUNT_NAMES);

  // Load passwords and names on mount or when modal opens
  useEffect(() => {
    if (isOpen) {
      const cached = localStorage.getItem('song_thuong_auth_passwords_v3');
      if (cached) {
        try {
          setAccounts(JSON.parse(cached));
        } catch (e) {
          console.error("Error loading cached passwords", e);
        }
      }
      
      const cachedNames = localStorage.getItem('song_thuong_account_names_v3');
      if (cachedNames) {
        try {
          setAccountNames(JSON.parse(cachedNames));
        } catch (e) {
          console.error("Error loading cached account names", e);
        }
      } else {
        localStorage.setItem('song_thuong_account_names_v3', JSON.stringify(DEFAULT_ACCOUNT_NAMES));
      }

      // Reset forms
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Save current accounts state back to LocalStorage
  const savePasswords = (newAccounts: Record<AccountKey, string>) => {
    localStorage.setItem('song_thuong_auth_passwords_v3', JSON.stringify(newAccounts));
    setAccounts(newAccounts);
  };

  const saveAccountNames = (newNames: Record<AccountKey, string>) => {
    localStorage.setItem('song_thuong_account_names_v3', JSON.stringify(newNames));
    setAccountNames(newNames);
  };

  // Toggle dynamic visibility
  const toggleVisibility = (key: string) => {
    setShowPass(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Determine current user key in accounts dictionary
  let userKey: AccountKey = 'admin';
  if (currentUser.role === 'CHIEF_NURSE') {
    if (currentUser.department === 'Nội - Nhi') userKey = 'noinhi';
    else if (currentUser.department === 'Ngoại') userKey = 'ngoai';
    else if (currentUser.department === 'YHCT - PHCN') userKey = 'yhct';
    else if (currentUser.department === 'LCK') userKey = 'lck';
  } else if (currentUser.role === 'HEAD_OF_NURSING') {
    userKey = 'phongdieuduong';
  } else if (currentUser.role === 'ADMIN') {
    userKey = 'admin';
  }

  const activeUserPassword = accounts[userKey] || "";
  const isPasswordless = activeUserPassword === "";

  // Profile-level self password change/creation
  const handleUserChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // If current password is set, verify currentPasswordInput matches
    if (activeUserPassword !== "" && !currentPasswordInput) {
      setErrorMsg('Vui lòng nhập "Mật khẩu hiện tại" để xác thực quyền thay đổi.');
      return;
    }

    if (activeUserPassword !== "" && currentPasswordInput !== activeUserPassword) {
      setErrorMsg('Mật khẩu hiện tại không khớp dữ liệu hệ thống.');
      return;
    }

    if (!newPasswordInput) {
      setErrorMsg('Vui lòng nhập mật khẩu mới.');
      return;
    }

    if (newPasswordInput.length < 4) {
      setErrorMsg('Mật khẩu quá ngắn! Mật khẩu mới phải từ 4 kí tự trở lên để bảo mật.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    // Execute password update
    const updated = {
      ...accounts,
      [userKey]: newPasswordInput
    };

    savePasswords(updated);
    setSuccessMsg('Tuyệt vời! Bạn đã tạo/thay đổi mật khẩu riêng tư thành công.');
    
    // Clear forms
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
  };

  // Profile-level self password deletion
  const handleUserDeletePassword = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (activeUserPassword !== "" && !currentPasswordInput) {
      setErrorMsg('Vui lòng nhập "Mật khẩu hiện tại" trước khi thực hiện xóa mật khẩu.');
      return;
    }

    if (activeUserPassword !== "" && currentPasswordInput !== activeUserPassword) {
      setErrorMsg('Mật khẩu hiện tại không khớp.');
      return;
    }

    confirmAction(
      "Xác nhận xóa mật khẩu",
      "Bạn có chắc chắn muốn XÓA mật khẩu của tài khoản này? Sau khi xóa, bất kỳ ai cũng có thể đăng nhập vào tài khoản này bằng cách để trống mật khẩu.",
      () => {
        const updated = {
          ...accounts,
          [userKey]: ""
        };
        savePasswords(updated);
        setSuccessMsg('Đã xóa mật khẩu thành công! Tài khoản này hiện không có mật khẩu bảo mật (đăng nhập không cần mật khẩu).');
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
      }
    );
  };

  // Admin resets a specific account's password to default state
  const handleAdminResetPassword = (targetKey: AccountKey) => {
    const defaultPass = DEFAULT_PASSWORDS[targetKey];
    const updated = {
      ...accounts,
      [targetKey]: defaultPass
    };
    savePasswords(updated);
    setErrorMsg(null);
    setSuccessMsg(`Đã khôi phục mật khẩu của "${ACCOUNT_LABELS[targetKey]}" về mặc định thành công ("${defaultPass}").`);
  };

  // Admin resets all accounts back to raw system defaults
  const handleAdminResetAllPasswords = () => {
    confirmAction(
      "Đặt lại tất cả mật khẩu",
      "Bạn có chắc chắn muốn đặt lại mật khẩu của TOÀN BỘ tài khoản về ban đầu của bệnh viện?",
      () => {
        savePasswords(DEFAULT_PASSWORDS);
        setErrorMsg(null);
        setSuccessMsg('Đã khôi phục toàn bộ mật khẩu trên hệ thống về mặc định!');
      }
    );
  };

  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-150 flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white uppercase">Cấu hình khóa & mật khẩu đăng nhập</h3>
              <p className="text-[10px] text-slate-300 font-medium">Bảo vệ quyền truy cập phòng/khoa của bạn</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-white"
            title="Đóng bảng cấu hình"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Container with customized scroll */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Active Status Header */}
          <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 px-2 py-0.5 rounded bg-blue-50 border border-blue-100">Tài khoản hiện tại</span>
                <p className="text-xs font-extrabold text-slate-800 mt-0.5">{currentUser.fullName}</p>
                <p className="text-[10px] font-bold text-slate-500">Người đại diện: {currentUser.role === 'ADMIN' ? 'Hệ thống Quản trị (Admin)' : currentUser.role === 'HEAD_OF_NURSING' ? 'Phòng Điều dưỡng' : `Điều dưỡng trưởng khoa ${currentUser.department}`}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">Mật khẩu hiện tại:</span>
              {isPasswordless ? (
                <span className="px-2 py-1 select-none font-bold text-amber-700 bg-amber-50 rounded-md border border-amber-200 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Chưa cài mật khẩu (Quá sơ hở)
                </span>
              ) : (
                <span className="px-2 py-1 select-none font-bold text-emerald-700 bg-emerald-50 rounded-md border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Đã cài khóa riêng tư
                </span>
              )}
            </div>
          </div>

          {/* User change password form */}
          <div className="bg-white border border-gray-200/90 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-700" />
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-tight">Cá nhân: Tự thiết lập, Thay mới hoặc Xóa mật khẩu</h4>
              </div>
              <span className="text-[10px] text-slate-400 italic">Có thể để trống để đăng nhập không bảo mật</span>
            </div>

            <form onSubmit={handleUserChangePassword} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                {/* Current password */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Mật khẩu hiện hành</label>
                    {isPasswordless && <span className="text-[9px] text-amber-600 font-bold">(Được để trống)</span>}
                  </div>
                  <div className="relative">
                    <input
                      type={showPass['selfCurrent'] ? 'text' : 'password'}
                      value={currentPasswordInput}
                      onChange={(e) => setCurrentPasswordInput(e.target.value)}
                      placeholder={isPasswordless ? "Không cần nhập" : "Nhập MK hiện tại"}
                      disabled={isPasswordless}
                      className="w-full pl-3 pr-8 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50/50 disabled:bg-slate-100/70 disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                    {!isPasswordless && (
                      <button
                        type="button"
                        onClick={() => toggleVisibility('selfCurrent')}
                        className="absolute right-2 top-1.5 text-gray-400 hover:text-slate-600"
                      >
                        {showPass['selfCurrent'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* New password */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Khởi tạo mật khẩu mới</label>
                  <div className="relative">
                    <input
                      type={showPass['selfNew'] ? 'text' : 'password'}
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Mật khẩu mới (min 4 ký tự)"
                      className="w-full pl-3 pr-8 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility('selfNew')}
                      className="absolute right-2 top-1.5 text-gray-400 hover:text-slate-600"
                    >
                      {showPass['selfNew'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm new password */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Xác thực nhập lại khóa mới</label>
                  <div className="relative">
                    <input
                      type={showPass['selfConfirm'] ? 'text' : 'password'}
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full pl-3 pr-8 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility('selfConfirm')}
                      className="absolute right-2 top-1.5 text-gray-400 hover:text-slate-600"
                    >
                      {showPass['selfConfirm'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

              </div>

              <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t border-gray-100/60">
                {/* Delete/Delete current password button (Making it empty) */}
                <button
                  type="button"
                  onClick={handleUserDeletePassword}
                  disabled={isPasswordless}
                  className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                    isPasswordless
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200/20'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 active:scale-[0.98]'
                  }`}
                  title="Xóa bỏ mật khẩu của tài khoản để đăng nhập không cần mật khẩu"
                >
                  <Trash className="w-3.5 h-3.5" />
                  Xóa bỏ mật khẩu của tôi (Đăng nhập không khóa)
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-lg transition-transform hover:scale-[1.02] cursor-pointer flex items-center gap-1.5 border border-slate-950 shadow-md shadow-slate-900/10"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Lưu & Áp dụng mật khẩu
                </button>
              </div>
            </form>
          </div>

          {/* Error and success messages */}
          {(errorMsg || successMsg) && (
            <div className="space-y-2">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800 font-semibold shadow-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-800 font-semibold shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* Administrator view: reset passwords for all accounts */}
          {isAdmin && (
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <div>
                    <h4 className="font-bold text-xs text-amber-900 uppercase tracking-tight">Quyền hạn Admin: Quản lý mật khẩu toàn viện</h4>
                    <p className="text-[10px] text-amber-700 font-medium">Bạn có đặc quyền đổi trực tiếp, đặt trống hoặc reset nhanh phím quản lý các khoa</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAdminResetAllPasswords}
                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold rounded-lg transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  Xóa & Khôi phục tất cả về mặc định
                </button>
              </div>

              {/* Grid or table listing all accounts */}
              <div className="grid grid-cols-1 gap-2">
                {(Object.keys(ACCOUNT_LABELS) as AccountKey[]).map((key) => {
                  const label = ACCOUNT_LABELS[key];
                  const currentPassword = accounts[key] ?? "";
                  const isDefaultValue = currentPassword === DEFAULT_PASSWORDS[key];
                  const isDeptPasswordless = currentPassword === "";

                  return (
                    <div
                      key={key}
                      id={`admin-pwd-${key}`}
                      className="bg-white border border-amber-100 rounded-lg p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 hover:shadow-xs transition-shadow"
                    >
                      <div className="flex flex-col flex-1 min-w-[200px]">
                        <span className="text-xs font-extrabold text-slate-800">{label}</span>
                        {/* Editable full name field for Admin */}
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">Họ tên đại diện:</span>
                          <input
                            type="text"
                            value={accountNames[key] ?? ""}
                            onChange={(e) => {
                              const updatedNames = {
                                ...accountNames,
                                [key]: e.target.value
                              };
                              saveAccountNames(updatedNames);
                            }}
                            className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500 flex-1 max-w-[200px]"
                            placeholder="Nhập tên đại diện..."
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                          <span className="font-mono">Account ID: <strong className="text-slate-700">{key}</strong></span>
                          <span>•</span>
                          {isDeptPasswordless ? (
                            <span className="px-1.5 py-0.2 rounded font-bold bg-rose-50 text-rose-700 border border-rose-100 text-[9px]">
                              Để trống (Không mật khẩu)
                            </span>
                          ) : (
                            <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${isDefaultValue ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>
                              {isDefaultValue ? 'Mật khẩu mặc định' : 'Mật khẩu riêng tư'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 justify-between sm:justify-end mt-1 sm:mt-0 flex-wrap">
                        {/* Display the active password for ease of maintenance */}
                        <div className="relative">
                          <input
                            type={showPass[key] ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => {
                              const updated = {
                                ...accounts,
                                [key]: e.target.value
                              };
                              savePasswords(updated);
                              setErrorMsg(null);
                            }}
                            className="pl-2 pr-7 py-1 bg-slate-50/50 border border-gray-200 rounded text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500 w-36"
                            placeholder="Để trống mật khẩu"
                            title="Xóa trắng để cho phép đăng nhập không mật khẩu, hoặc đổi trực tiếp"
                          />
                          <button
                            type="button"
                            onClick={() => toggleVisibility(key)}
                            className="absolute right-1.5 top-1.5 text-gray-400 hover:text-slate-600"
                          >
                            {showPass[key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Reset button or Clear direct button */}
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = {
                                ...accounts,
                                [key]: ""
                              };
                              savePasswords(updated);
                              setErrorMsg(null);
                              setSuccessMsg(`Đã xóa bỏ mật khẩu của "${ACCOUNT_LABELS[key]}" thành công.`);
                            }}
                            disabled={isDeptPasswordless}
                            className={`px-1.5 py-1 text-[9px] font-bold rounded ${
                              isDeptPasswordless
                                ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer'
                            }`}
                            title="Đặt mật khẩu về trạng thái trống"
                          >
                            Xóa trắng
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleAdminResetPassword(key)}
                            className={`px-2 py-1 text-[10px] font-extrabold rounded select-none cursor-pointer ${
                              isDefaultValue
                                ? 'bg-gray-100 text-gray-400 cursor-default border border-gray-150 border-dashed'
                                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                            }`}
                            title={`Click để phục hồi về "${DEFAULT_PASSWORDS[key]}"`}
                          >
                            Khôi phục mặc định
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer transition-colors"
          >
            Đóng cấu hình
          </button>
        </div>
        {/* Custom elegant confirmation overlay modal */}
        {customConfirm && (
          <div className="fixed inset-0 z-[110] overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-sm w-full overflow-hidden text-left">
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

      </motion.div>
    </div>
  );
}
