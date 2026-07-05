import React from 'react';
import { Role, Department, AppNotification, AuthUser } from '../types';
import { 
  Shield, 
  Users, 
  Building, 
  FileSpreadsheet, 
  RefreshCw, 
  Sparkles, 
  Bell, 
  BellOff, 
  Check, 
  Trash, 
  LogOut, 
  KeyRound,
  Palette,
  Image as ImageIcon,
  HeartPulse,
  Activity,
  Stethoscope,
  Settings,
  Upload,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Keyboard,
  List
} from 'lucide-react';

interface HeaderProps {
  currentUser: AuthUser;
  onLogout: () => void;
  onOpenPasswordModal: () => void;
  currentRole: Role;
  onChangeRole: (role: Role) => void;
  selectedDepartment: Department;
  onChangeDepartment: (dept: Department) => void;
  onResetData: () => void;
  onTriggerAI: () => void;
  isAiLoading: boolean;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: (role: Role, department?: Department) => void;
  onClearNotifications: (role: Role, department?: Department) => void;
  enableCellDropdown: boolean;
  onChangeEnableCellDropdown: (val: boolean) => void;
  enableBottomKeypad: boolean;
  onChangeEnableBottomKeypad: (val: boolean) => void;
  departments?: Department[];
}

export default function Header({
  currentUser,
  onLogout,
  onOpenPasswordModal,
  currentRole,
  onChangeRole,
  selectedDepartment,
  onChangeDepartment,
  onResetData,
  onTriggerAI,
  isAiLoading,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearNotifications,
  enableCellDropdown,
  onChangeEnableCellDropdown,
  enableBottomKeypad,
  onChangeEnableBottomKeypad,
  departments: departmentsProp
}: HeaderProps) {
  const [isOpenNotif, setIsOpenNotif] = React.useState(false);
  const notifRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsOpenNotif(false);
      }
    }
    if (isOpenNotif) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpenNotif]);

  const departments: Department[] = departmentsProp || ['Nội - Nhi', 'Ngoại', 'YHCT - PHCN', 'LCK'];

  // Theme/Banner customization states (loaded from localStorage)
  const [bgType, setBgType] = React.useState<'color' | 'gradient' | 'image'>(() => {
    return (localStorage.getItem('header_bg_type') as any) || 'color';
  });
  const [bgColorClass, setBgColorClass] = React.useState<string>(() => {
    return localStorage.getItem('header_bg_color_class') || 'bg-white border-b border-slate-200 text-slate-800';
  });
  const [bgGradientClass, setBgGradientClass] = React.useState<string>(() => {
    return localStorage.getItem('header_bg_gradient_class') || 'bg-gradient-to-r from-blue-50 via-teal-50 to-emerald-50 border-b border-blue-200 text-slate-800';
  });
  const [bgImageUrl, setBgImageUrl] = React.useState<string>(() => {
    return localStorage.getItem('header_bg_image_url') || 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=1200';
  });
  const [bgOpacity, setBgOpacity] = React.useState<number>(() => {
    const val = localStorage.getItem('header_bg_opacity');
    return val ? parseInt(val, 10) : 55;
  });
  const [bgBlur, setBgBlur] = React.useState<number>(() => {
    const val = localStorage.getItem('header_bg_blur');
    return val ? parseInt(val, 10) : 1;
  });

  const handleSelectBgOpacity = (val: number) => {
    setBgOpacity(val);
    localStorage.setItem('header_bg_opacity', String(val));
  };

  const handleSelectBgBlur = (val: number) => {
    setBgBlur(val);
    localStorage.setItem('header_bg_blur', String(val));
  };
  const [logoType, setLogoType] = React.useState<string>(() => {
    return localStorage.getItem('header_logo_type') || 'spreadsheet';
  });
  const [customLogoUrl, setCustomLogoUrl] = React.useState<string>(() => {
    return localStorage.getItem('header_custom_logo_url') || '';
  });
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);
  const [isOpenThemePanel, setIsOpenThemePanel] = React.useState(false);
  const [inputCustomUrl, setInputCustomUrl] = React.useState('');

  const [hospitalName, setHospitalName] = React.useState<string>(() => {
    return localStorage.getItem('header_hospital_name') || 'BỆNH VIỆN ĐA KHOA SÔNG THƯƠNG';
  });
  const [appTitle, setAppTitle] = React.useState<string>(() => {
    return localStorage.getItem('header_app_title') || 'QUẢN LÝ ĐIỀU DƯỠNG SÔNG THƯƠNG';
  });
  const [appSubtitle, setAppSubtitle] = React.useState<string>(() => {
    return localStorage.getItem('header_app_subtitle') || 'Bảng Đăng Ký Nhân Lực Làm Việc Hàng Tuần';
  });

  const handleUpdateHospitalName = (val: string) => {
    setHospitalName(val);
    localStorage.setItem('header_hospital_name', val);
  };

  const handleUpdateAppTitle = (val: string) => {
    setAppTitle(val);
    localStorage.setItem('header_app_title', val);
  };

  const handleUpdateAppSubtitle = (val: string) => {
    setAppSubtitle(val);
    localStorage.setItem('header_app_subtitle', val);
  };

  const PRESET_COLORS = [
    { label: 'Trắng Sạch Sẽ', class: 'bg-white border-b border-slate-200 text-slate-800', preview: 'bg-white border border-slate-300' },
    { label: 'Xanh Bệnh Viện', class: 'bg-sky-50 border-b border-sky-200 text-sky-950', preview: 'bg-sky-100 border border-sky-300' },
    { label: 'Xanh Ngọc Y Tế', class: 'bg-teal-50 border-b border-teal-200 text-teal-950', preview: 'bg-teal-100 border border-teal-300' },
    { label: 'Lá Kháng Khuẩn', class: 'bg-emerald-50 border-b border-emerald-200 text-emerald-950', preview: 'bg-emerald-100 border border-emerald-300' },
    { label: 'Hồng Chăm Sóc', class: 'bg-rose-50 border-b border-rose-200 text-rose-950', preview: 'bg-rose-100 border border-rose-300' },
    { label: 'Xám Phòng Sạch', class: 'bg-slate-50 border-b border-slate-200 text-slate-800', preview: 'bg-slate-200 border border-slate-300' },
  ];

  const PRESET_GRADIENTS = [
    { label: 'Bình Minh Sông Thương', class: 'bg-gradient-to-r from-blue-50 via-teal-50 to-emerald-50 border-b border-blue-200 text-slate-800', preview: 'bg-gradient-to-r from-blue-100 via-teal-100 to-emerald-100' },
    { label: 'Sắc Xuân Y Khoa', class: 'bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-teal-200 text-slate-800', preview: 'bg-gradient-to-r from-emerald-100 to-teal-100' },
    { label: 'Tia Sáng Hy Vọng', class: 'bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 border-b border-indigo-200 text-slate-800', preview: 'bg-gradient-to-r from-sky-100 via-indigo-100 to-purple-100' },
    { label: 'Ấm Áp Tình Thương', class: 'bg-gradient-to-r from-rose-50 to-amber-50 border-b border-rose-200 text-slate-800', preview: 'bg-gradient-to-r from-rose-100 to-amber-100' },
  ];

  const PRESET_IMAGES = [
    { label: 'Không gian Y khoa Thư thái', url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1200' },
    { label: 'Phòng thực nghiệm hiện đại', url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=1200' },
    { label: 'Sóng Sinh Học Mềm Mại', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=1200' },
    { label: 'Bình minh Bắc Giang nhạt', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200' },
  ];

  const PRESET_LOGOS = [
    { type: 'spreadsheet', label: 'Bảng xếp lịch', icon: <FileSpreadsheet className="w-4 h-4 text-blue-600" /> },
    { type: 'heart-pulse', label: 'Nhịp tim y khoa', icon: <HeartPulse className="w-4 h-4 text-rose-600" /> },
    { type: 'activity', label: 'Sóng tâm đồ', icon: <Activity className="w-4 h-4 text-emerald-600" /> },
    { type: 'stethoscope', label: 'Ống nghe lâm sàng', icon: <Stethoscope className="w-4 h-4 text-indigo-600" /> },
    { type: 'shield', label: 'Khiên bảo vệ', icon: <Shield className="w-4 h-4 text-sky-600" /> },
    { type: 'building', label: 'Tòa nhà bệnh viện', icon: <Building className="w-4 h-4 text-amber-600" /> },
  ];

  const handleSelectBgType = (type: 'color' | 'gradient' | 'image') => {
    setBgType(type);
    localStorage.setItem('header_bg_type', type);
  };

  const handleSelectColor = (colorClass: string) => {
    setBgColorClass(colorClass);
    localStorage.setItem('header_bg_color_class', colorClass);
  };

  const handleSelectGradient = (gradClass: string) => {
    setBgGradientClass(gradClass);
    localStorage.setItem('header_bg_gradient_class', gradClass);
  };

  const handleSelectImage = (url: string) => {
    setBgImageUrl(url);
    localStorage.setItem('header_bg_image_url', url);
  };

  const handleSelectLogo = (logo: string) => {
    setLogoType(logo);
    localStorage.setItem('header_logo_type', logo);
  };

  const renderLogoIcon = () => {
    if (logoType === 'custom') {
      if (customLogoUrl) {
        return <img src={customLogoUrl} alt="Hospital Logo" className="w-full h-full object-contain rounded-lg" referrerPolicy="no-referrer" />;
      }
      return <Upload className="w-7 h-7 sm:w-9 sm:h-9 text-white" />;
    }
    switch (logoType) {
      case 'heart-pulse':
        return <HeartPulse className="w-7 h-7 sm:w-9 sm:h-9 text-white" />;
      case 'activity':
        return <Activity className="w-7 h-7 sm:w-9 sm:h-9 text-white" />;
      case 'stethoscope':
        return <Stethoscope className="w-7 h-7 sm:w-9 sm:h-9 text-white" />;
      case 'shield':
        return <Shield className="w-7 h-7 sm:w-9 sm:h-9 text-white" />;
      case 'building':
        return <Building className="w-7 h-7 sm:w-9 sm:h-9 text-white" />;
      case 'spreadsheet':
      default:
        return <FileSpreadsheet className="w-7 h-7 sm:w-9 sm:h-9 text-white" />;
    }
  };

  const activeNotifications = (notifications || []).filter(n => {
    if (currentRole === 'CHIEF_NURSE') {
      return n.targetRole === 'CHIEF_NURSE' && (!n.targetDepartment || n.targetDepartment === selectedDepartment);
    }
    if (currentRole === 'HEAD_OF_NURSING') {
      return n.targetRole === 'HEAD_OF_NURSING';
    }
    return n.targetRole === 'ADMIN' || n.targetRole === 'CHIEF_NURSE' || n.targetRole === 'HEAD_OF_NURSING'; 
  });

  const unreadCount = activeNotifications.filter(n => !n.isRead).length;

  const roleLabels = {
    CHIEF_NURSE: {
      label: 'Điều dưỡng Trưởng khoa',
      icon: <Users className="w-4 h-4" />,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200'
    },
    HEAD_OF_NURSING: {
      label: 'Trưởng phòng Điều dưỡng',
      icon: <Shield className="w-4 h-4" />,
      color: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
    },
    ADMIN: {
      label: 'Quản trị hệ thống (Admin)',
      icon: <Settings className="w-4 h-4" />,
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200'
    }
  };

  let headerBgClass = "";
  let headerStyle: React.CSSProperties = {};

  if (bgType === 'color') {
    headerBgClass = bgColorClass;
  } else if (bgType === 'gradient') {
    headerBgClass = bgGradientClass;
  } else {
    headerBgClass = "border-b border-gray-200 text-slate-800";
    headerStyle = {
      backgroundImage: `url(${bgImageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }

  const overlayStyle: React.CSSProperties = bgType === 'image' ? {
    backgroundColor: `rgba(255, 255, 255, ${bgOpacity / 100})`,
    backdropFilter: `blur(${bgBlur}px)`,
    WebkitBackdropFilter: `blur(${bgBlur}px)`,
  } : {};

  const getDisplayUserInfo = () => {
    // Attempt to load live custom names to ensure instant reflection without relogging
    let liveNames: Record<string, string> = {};
    try {
      const cachedNames = localStorage.getItem('song_thuong_account_names_v3');
      if (cachedNames) {
        liveNames = JSON.parse(cachedNames);
      }
    } catch (e) {
      console.error(e);
    }

    if (currentUser.role === 'ADMIN') {
      const customName = liveNames['admin'] || currentUser.fullName;
      return {
        fullName: customName && !customName.includes('Quản trị viên') ? customName : 'Quản trị viên Hệ thống',
        title: 'Hệ thống Admin'
      };
    }
    
    if (currentUser.role === 'HEAD_OF_NURSING') {
      return {
        fullName: liveNames['phongdieuduong'] || 'Nguyễn Thanh Hương',
        title: 'Trưởng phòng Điều dưỡng'
      };
    }
    
    const dept = currentUser.department || 'Nội - Nhi';
    let userKey = '';
    if (dept === 'Nội - Nhi') userKey = 'noinhi';
    else if (dept === 'Ngoại') userKey = 'ngoai';
    else if (dept === 'YHCT - PHCN') userKey = 'yhct';
    else if (dept === 'LCK') userKey = 'lck';

    let fullName = userKey ? liveNames[userKey] : '';
    if (!fullName) {
      fullName = currentUser.fullName;
    }
    
    if (!fullName || fullName.startsWith('Điều dưỡng Trưởng Khoa')) {
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
      
      if (!fullName || fullName.startsWith('Điều dưỡng Trưởng Khoa')) {
        const fallbacks: Record<string, string> = {
          'Nội - Nhi': 'Phạm Thị Cánh',
          'Ngoại': 'Trương Thị Ngân',
          'YHCT - PHCN': 'Phạm Thị Hiền',
          'LCK': 'Trần Hoài Thương'
        };
        fullName = fallbacks[dept] || 'Điều dưỡng Trưởng';
      }
    }
    
    return {
      fullName,
      title: `Điều dưỡng trưởng khoa ${dept}`
    };
  };

  const displayUser = getDisplayUserInfo();

  return (
    <header 
      className={`relative z-40 shadow-xs transition-all duration-300 ${headerBgClass}`}
      style={headerStyle}
    >
      <div className="w-full h-full transition-all duration-300" style={overlayStyle}>
        {/* Main top bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-row items-center justify-between py-4 sm:py-5.5 md:py-6.5 gap-2 sm:gap-4">
            
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1 md:flex-initial">
              <div className={`w-14 h-14 sm:w-22 sm:h-22 rounded-2xl flex items-center justify-center shadow-3xs shrink-0 transition-all duration-300 hover:scale-105 ${logoType === 'custom' && customLogoUrl ? 'bg-transparent' : 'bg-blue-600 text-white'}`}>
                {renderLogoIcon()}
              </div>
              <div className="min-w-0 flex-1">
                {/* Row 1: Hospital Name & Version (spacing adjusted) */}
                <div className="flex items-center gap-1.5 sm:gap-2 leading-normal flex-wrap mb-1 sm:mb-2">
                  <span className="text-[8px] sm:text-[9.5px] font-semibold tracking-wider text-blue-700 bg-blue-50/90 px-2 py-0.5 sm:py-1 rounded-full border border-blue-150 uppercase font-sans shrink-0 max-w-[200px] sm:max-w-none truncate shadow-3xs">
                    {hospitalName}
                  </span>
                  <span className="text-slate-500 text-[8px] sm:text-[9px] font-mono font-semibold bg-slate-100/90 border border-slate-205 px-1.5 py-0.5 rounded shrink-0 shadow-3xs">v1.2.0</span>
                </div>
                {/* Row 2: Title and Subtitle with clean layout & line spacing */}
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0">
                  <h1 className="text-xs sm:text-base md:text-lg lg:text-xl font-semibold text-slate-900 tracking-wide uppercase leading-snug font-sans truncate drop-shadow-3xs">
                    {appTitle}
                  </h1>
                  <span className="text-[9.5px] sm:text-[10.5px] md:text-xs text-slate-600 font-medium border-l-0 sm:border-l sm:border-slate-300 sm:pl-3 leading-relaxed truncate block">
                    {appSubtitle}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Action Side: Roles & Settings */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              
              {/* Role Switcher based on security permissions */}
              {currentUser.role === 'ADMIN' && (
                <div className="flex items-center gap-1 border-l border-slate-200/60 pl-1 sm:pl-2 shrink-0">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 hidden xl:inline font-sans">Giả lập:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 shadow-3xs">
                    {(Object.keys(roleLabels) as Role[]).map((role) => (
                      <button
                        key={role}
                        id={`role-btn-${role}`}
                        onClick={() => onChangeRole(role)}
                        className={`flex items-center gap-1 px-1 py-0.5 sm:px-2 sm:py-0.8 text-[9px] sm:text-[10px] font-bold rounded-md transition-all cursor-pointer duration-200 ${
                          currentRole === role
                            ? 'bg-white text-blue-600 shadow-3xs border border-slate-205'
                            : 'text-slate-505 hover:text-slate-850 hover:bg-white/40'
                        }`}
                        title={`Chuyển sang vai trò: ${roleLabels[role].label}`}
                      >
                        <span className={`transition-colors shrink-0 ${currentRole === role ? 'text-blue-500' : 'text-slate-400'}`}>
                          {roleLabels[role].icon}
                        </span>
                        <span className="hidden xl:inline">
                          {roleLabels[role].label.replace(' hệ thống', '').replace('Điều dưỡng ', 'ĐĐ ').replace('Trưởng phòng ', 'TP ')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* User Session Widget & Log out */}
              <div className="flex items-center gap-1 sm:gap-2 border-l border-slate-200/80 pl-1 sm:pl-2 shrink-0">
                <div className="flex items-center gap-1 sm:gap-1.5 bg-white border border-slate-200/85 rounded-lg px-1 sm:px-2 py-0.5 sm:py-0.8 shadow-3xs shrink-0">
                  <div className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center font-bold text-blue-700 text-[10px] sm:text-xs shrink-0 select-none">
                    {displayUser.fullName ? displayUser.fullName.split(' ').pop()?.charAt(0) : 'U'}
                  </div>
                  <div className="hidden md:flex flex-col text-left leading-none min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 shrink-0 whitespace-nowrap">
                      {displayUser.fullName}
                    </span>
                    <span className="text-[7.5px] sm:text-[8px] font-bold text-blue-600/85 tracking-wide mt-0.5 uppercase shrink-0 whitespace-nowrap">
                      {displayUser.title}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                  <button
                    id="btn-open-password-config"
                    onClick={onOpenPasswordModal}
                    className="p-1 sm:p-1.2 text-slate-505 hover:text-blue-600 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-200 rounded-lg transition-all flex items-center justify-center cursor-pointer gap-1 bg-white shadow-3xs"
                    title={currentUser.role === 'ADMIN' || currentUser.role === 'HEAD_OF_NURSING' ? 'Quản lý mật khẩu toàn bộ phòng/khoa' : 'Thay đổi mật khẩu tài khoản của bạn'}
                    type="button"
                  >
                    <KeyRound className="w-3 h-3 text-blue-500/80" />
                    <span className="text-[9.5px] font-semibold hidden xl:inline">Mật khẩu</span>
                  </button>
                  <button
                    id="btn-logout"
                    onClick={onLogout}
                    className="p-1 sm:p-1.2 text-slate-555 hover:text-rose-600 hover:bg-rose-50/50 border border-slate-200 hover:border-rose-200 rounded-lg transition-all flex items-center justify-center cursor-pointer gap-1 bg-white shadow-3xs"
                    title="Đăng xuất khỏi hệ thống"
                    type="button"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500/80" />
                    <span className="text-[10px] font-semibold hidden xl:inline">Thoát</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Sub-bar for roles & workflows */}
        <div className="border-t border-slate-200/85 bg-slate-50/45 py-1.5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-row items-center justify-between gap-3 text-xs">
            
            {/* Controls for current active Chief Nurse */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {currentRole === 'CHIEF_NURSE' && (
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px] sm:text-[9px] font-sans shrink-0">Khoa điều hành:</span>
                  {currentUser.role === 'CHIEF_NURSE' ? (
                    <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-emerald-50 text-emerald-800 rounded-full text-[10px] sm:text-[11px] font-semibold border border-emerald-200/60 flex items-center gap-1 sm:gap-1.5 shadow-3xs shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block animate-pulse shrink-0" />
                      <span className="truncate">Khoa {currentUser.department} (Hệ chính thức)</span>
                    </div>
                  ) : (
                    <div className="inline-flex rounded-lg border border-slate-200/80 p-0.5 bg-slate-100 shadow-3xs overflow-x-auto max-w-full shrink-0">
                      {departments.map((dept) => (
                        <button
                          key={dept}
                          id={`dept-tab-${dept.replace(/\s+/g, '')}`}
                          onClick={() => onChangeDepartment(dept)}
                          className={`px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                            selectedDepartment === dept
                              ? 'bg-white text-blue-600 shadow-xs border border-slate-200'
                              : 'text-slate-550 hover:text-slate-800 hover:bg-white/30'
                          }`}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {currentRole === 'HEAD_OF_NURSING' && (
                <div className="flex items-center gap-1.5 text-blue-800 bg-blue-50/60 border border-blue-200/60 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold min-w-0 shadow-3xs animate-fade-in">
                  <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate"><strong>Trưởng phòng:</strong> Xem xét & phê duyệt lịch của các khoa.</span>
                </div>
              )}

              {currentRole === 'ADMIN' && (
                <div className="flex items-center gap-1.5 text-indigo-900 bg-indigo-50/60 border border-indigo-200/60 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold min-w-0 shadow-3xs animate-fade-in">
                  <Settings className="w-3.5 h-3.5 text-indigo-500 shrink-0 animate-spin-slow" />
                  <span className="truncate"><strong>Admin:</strong> Cấu hình hệ thống.</span>
                </div>
              )}
            </div>

            {/* Action buttons (Right-side container) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              
              {/* Notification Center Popover */}
              <div className="relative" ref={notifRef}>
                <button
                  id="btn-bell-notification"
                  onClick={() => setIsOpenNotif(!isOpenNotif)}
                  className={`relative p-1.5 sm:p-2 rounded-lg transition-all border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 flex items-center justify-center cursor-pointer shadow-3xs ${
                    isOpenNotif ? 'bg-slate-100 text-slate-900 border-slate-350 shadow-none' : ''
                  }`}
                  title="Thông báo tự động"
                  type="button"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {isOpenNotif && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 text-gray-800 overflow-hidden animate-fade-in">
                    
                    {/* Dropdown Header */}
                    <div className="bg-slate-50 px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[10px] text-slate-800 tracking-wide uppercase">Thông báo ({unreadCount})</span>
                        {unreadCount > 0 && (
                          <span className="inline-block px-1.5 py-0.2 bg-red-100 text-red-850 text-[8px] font-bold rounded animate-pulse">LIVE</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={() => onMarkAllAsRead(currentRole, selectedDepartment)}
                            className="text-[9px] text-blue-600 hover:text-blue-800 font-bold transition-colors cursor-pointer"
                            type="button"
                          >
                            Đọc hết
                          </button>
                        )}
                        {activeNotifications.length > 0 && (
                          <button
                            onClick={() => onClearNotifications(currentRole, selectedDepartment)}
                            className="text-[9px] text-gray-500 hover:text-gray-700 font-bold transition-colors cursor-pointer"
                            type="button"
                          >
                            Xóa hết
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dropdown List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                      {activeNotifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-xs flex flex-col items-center gap-1">
                          <BellOff className="w-6 h-6 text-slate-300" />
                          <p className="font-bold text-slate-500 animate-pulse text-[11.5px]">Không có thông báo mới</p>
                          <p className="text-[9px] text-gray-400 italic">Hệ thống luôn sẵn sàng đồng hành cùng bạn</p>
                        </div>
                      ) : (
                        activeNotifications.map((notif, idx) => {
                          let iconColor = 'bg-blue-100 text-blue-700';
                          if (notif.type === 'REMINDER') iconColor = 'bg-amber-100 text-amber-800';
                          else if (notif.type === 'APPROVED') iconColor = 'bg-emerald-150 text-emerald-800';
                          else if (notif.type === 'REJECTED') iconColor = 'bg-rose-100 text-rose-800';
                          else if (notif.type === 'CHANGE') iconColor = 'bg-sky-100 text-sky-800';

                          return (
                            <div 
                              key={`${notif.id}-${idx}`} 
                              onClick={() => {
                                onMarkAsRead(notif.id);
                              }}
                              className={`p-2.5 text-left hover:bg-slate-55 transition-colors cursor-pointer flex gap-2.5 items-start ${
                                !notif.isRead ? 'bg-blue-50/10' : ''
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${!notif.isRead ? 'bg-blue-600' : 'bg-gray-305'}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="font-bold text-[10.5px] text-slate-900 block truncate">{notif.title}</span>
                                  <span className="text-[8px] text-slate-400 shrink-0 font-mono">
                                    {new Date(notif.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-gray-600 text-[10px] leading-relaxed mt-0.5 break-words">{notif.message}</p>
                                {notif.targetDepartment && (
                                  <span className="inline-block mt-0.5 px-1 py-0 bg-blue-50 text-blue-700 rounded text-[8px] font-bold">
                                    Khoa: {notif.targetDepartment}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    
                    <div className="bg-slate-50 px-3 py-1.5 border-t border-gray-100 text-[9px] text-center text-slate-400 font-medium tracking-wide">
                      Hỗ trợ Điều Dưỡng Trưởng Sông Thương
                    </div>

                  </div>
                )}
              </div>

              {/* AI Advise Button */}
              <button
                id="btn-ai-advise"
                onClick={onTriggerAI}
                disabled={isAiLoading}
                className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-bold px-2 py-1 rounded shadow-xs transition-all cursor-pointer disabled:opacity-50 text-[10.5px] sm:text-[11px] shrink-0"
              >
                <Sparkles className="w-3 h-3 shrink-0" />
                <span className="hidden xs:inline whitespace-nowrap">{isAiLoading ? 'AI...' : 'Cố vấn chuyên gia AI'}</span>
                <span className="xs:hidden whitespace-nowrap">{isAiLoading ? 'AI...' : 'Cố vấn AI'}</span>
              </button>
              
              {currentUser.role === 'ADMIN' && (
                <button
                  id="btn-seed-data"
                  onClick={onResetData}
                  className="flex items-center gap-1 px-2 py-1 text-rose-600 hover:text-white hover:bg-rose-600 rounded transition-all cursor-pointer border border-rose-200 bg-rose-50 text-[10.5px] sm:text-[11px] font-semibold shrink-0"
                  title="Xóa toàn bộ dữ liệu lịch làm việc hiện tại để xếp dữ liệu mới"
                >
                  <Trash className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden md:inline whitespace-nowrap">Xóa toàn bộ dữ liệu</span>
                  <span className="md:hidden hidden sm:inline whitespace-nowrap">Xóa dữ liệu</span>
                </button>
              )}

              {/* Theme Settings Button — Only shown to Admin */}
              {currentUser.role === 'ADMIN' && (
                <button
                  id="btn-theme-config"
                  onClick={() => setIsOpenThemePanel(!isOpenThemePanel)}
                  className={`flex items-center gap-1 px-2 py-1 rounded transition-all cursor-pointer border text-[10.5px] sm:text-[11px] font-bold shrink-0 ${
                    isOpenThemePanel 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-2xs' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                  title="Thay đổi màu, chọn logo hoặc hình ảnh banner cho Header (Dành riêng cho Admin)"
                  type="button"
                >
                  <Palette className="w-3 h-3 shrink-0" />
                  <span className="hidden xs:inline whitespace-nowrap">Giao diện</span>
                </button>
              )}
            </div>

          </div>
        </div>

        {/* collapsible theme customizer panel */}
        {isOpenThemePanel && currentUser.role === 'ADMIN' && (
          <div className="mt-2 text-left mb-2.5 p-4 bg-white border border-slate-200 rounded-lg shadow-md animate-fade-in text-xs text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-150 mb-3">
              <div className="flex items-center gap-1.5 font-bold text-slate-950 text-sm">
                <Settings className="w-4 h-4 text-blue-600 animate-spin-slow" />
                <span>Bảng Tùy Biến Giao Diện & Cấu Hình Nhập Liệu (Dành Cho Admin)</span>
              </div>
              <button
                onClick={() => setIsOpenThemePanel(false)}
                className="text-slate-400 hover:text-slate-600 font-bold px-1.5 py-0.5 hover:bg-slate-100 rounded cursor-pointer"
                type="button"
              >
                Đóng ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              
              {/* Left Column: Logo Option selection */}
              <div className="md:col-span-4 border-r border-slate-200 pr-0 md:pr-4">
                <p className="font-bold text-slate-700 mb-2 uppercase tracking-wide text-[10px]">1. Chọn biểu tượng Logo chính:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {PRESET_LOGOS.map((lg) => (
                    <button
                      key={lg.type}
                      onClick={() => handleSelectLogo(lg.type)}
                      className={`flex items-center gap-2 p-2 border rounded-md text-left transition-all hover:border-blue-300 hover:bg-blue-50/20 cursor-pointer ${
                        logoType === lg.type
                          ? 'border-blue-600 bg-blue-50/50 font-bold text-blue-800'
                          : 'border-slate-200 text-slate-600'
                      }`}
                      type="button"
                    >
                      <div className="p-1 bg-white rounded border border-slate-150 shadow-2xs">
                        {lg.icon}
                      </div>
                      <span className="text-[10px] leading-tight truncate">{lg.label}</span>
                    </button>
                  ))}

                  {/* Custom upload representation option button */}
                  {customLogoUrl && (
                    <button
                      onClick={() => handleSelectLogo('custom')}
                      className={`flex items-center gap-1.5 p-1.5 border rounded-md text-left transition-all hover:border-blue-300 hover:bg-blue-50/20 cursor-pointer ${
                        logoType === 'custom'
                          ? 'border-blue-600 bg-blue-50/50 font-bold text-blue-800'
                          : 'border-slate-200 text-slate-600'
                      }`}
                      type="button"
                    >
                      <div className="p-1 bg-white rounded border border-slate-150 shadow-2xs flex items-center justify-center shrink-0 w-6 h-6">
                        <img src={customLogoUrl} alt="Logo tải lên" className="w-4 h-4 object-contain rounded" referrerPolicy="no-referrer" />
                      </div>
                      <span className="text-[10px] leading-tight truncate">Logo Tải Lên</span>
                    </button>
                  )}
                </div>

                {/* Upload Logo area */}
                <div className="mt-3 pt-3 border-t border-slate-150">
                  <p className="font-bold text-slate-700 mb-1.5 uppercase tracking-wide text-[10px]">Tải file logo bệnh viện mới:</p>
                  
                  <div className="flex flex-col gap-2 p-2 bg-slate-50 rounded-md border border-slate-200 animate-fade-in">
                    {customLogoUrl ? (
                      <div className="flex items-center justify-between gap-1.5 bg-white p-1.5 rounded border border-slate-150">
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={customLogoUrl} alt="Logo bệnh viện" className="w-7 h-7 object-contain rounded border bg-slate-50" />
                          <div className="min-w-0">
                            <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Đã có logo riêng</p>
                            <button
                              onClick={() => handleSelectLogo('custom')}
                              className={`text-[9px] font-bold block text-left truncate leading-none cursor-pointer ${
                                logoType === 'custom' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700 underline'
                              }`}
                            >
                              {logoType === 'custom' ? '• Đang kích hoạt' : 'Sử dụng logo này'}
                            </button>
                          </div>
                        </div>
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1 shrink-0 bg-red-50 p-1 rounded border border-red-200 animate-pulse">
                            <span className="text-[10px] font-bold text-red-600">Xóa?</span>
                            <button
                              onClick={() => {
                                setCustomLogoUrl('');
                                localStorage.setItem('header_custom_logo_url', '');
                                if (logoType === 'custom') {
                                  handleSelectLogo('spreadsheet');
                                }
                                setIsConfirmingDelete(false);
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all"
                              type="button"
                            >
                              Xóa
                            </button>
                            <button
                              onClick={() => setIsConfirmingDelete(false)}
                              className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all"
                              type="button"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setIsConfirmingDelete(true)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded cursor-pointer transition-colors shrink-0"
                            title="Xóa logo hiện tại"
                            type="button"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded p-2 bg-white hover:bg-slate-50 hover:border-blue-400 cursor-pointer transition-all">
                        <Upload className="w-4 h-4 text-slate-400 mb-1 animate-pulse" />
                        <span className="text-[9px] text-slate-600 font-medium">Bấm thiết bị để tải ảnh</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const base64 = event.target?.result as string;
                                if (base64) {
                                  setCustomLogoUrl(base64);
                                  localStorage.setItem('header_custom_logo_url', base64);
                                  setLogoType('custom');
                                  localStorage.setItem('header_logo_type', 'custom');
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

              </div>

              {/* Middle Column: Background choice selection */}
              <div className="md:col-span-4 md:border-r md:border-slate-200 md:pr-4 flex flex-col gap-3 pb-4 md:pb-0">
                <div>
                  <p className="font-bold text-slate-700 mb-2 uppercase tracking-wide text-[10px]">2. Chọn phong cách Nền (Banner):</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleSelectBgType('color')}
                      className={`px-1.5 py-1 rounded border text-[10px] sm:text-[10.5px] font-bold cursor-pointer transition-all flex-1 text-center ${
                        bgType === 'color'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                      type="button"
                    >
                      Màu Sáng
                    </button>
                    <button
                      onClick={() => handleSelectBgType('gradient')}
                      className={`px-1.5 py-1 rounded border text-[10px] sm:text-[10.5px] font-bold cursor-pointer transition-all flex-1 text-center ${
                        bgType === 'gradient'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                      type="button"
                    >
                      Gradient
                    </button>
                    <button
                      onClick={() => handleSelectBgType('image')}
                      className={`px-1.5 py-1 rounded border text-[10px] sm:text-[10.5px] font-bold cursor-pointer transition-all flex-1 text-center ${
                        bgType === 'image'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                      type="button"
                    >
                      Hình Ảnh
                    </button>
                  </div>
                </div>

                {/* Sub-selectors for selected Background Type */}
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60 flex-1">
                  
                  {bgType === 'color' && (
                    <div>
                      <p className="font-semibold text-slate-600 mb-2 text-[10px]">Lựa chọn màu đơn sắc nhẹ:</p>
                      <div className="grid grid-cols-2 gap-1">
                        {PRESET_COLORS.map((c, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectColor(c.class)}
                            className={`flex items-center gap-1.5 p-1 border rounded cursor-pointer text-left transition-all hover:bg-white ${
                              bgColorClass === c.class
                                ? 'border-blue-600 bg-white font-bold ring-2 ring-blue-100'
                                : 'border-slate-200 bg-transparent text-slate-600'
                            }`}
                            type="button"
                          >
                            <span className={`w-3 h-3 rounded-full shrink-0 ${c.preview}`} />
                            <span className="text-[9.5px] truncate">{c.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {bgType === 'gradient' && (
                    <div>
                      <p className="font-semibold text-slate-600 mb-2 text-[10px]">Lựa chọn phối màu gradient:</p>
                      <div className="grid grid-cols-1 gap-1">
                        {PRESET_GRADIENTS.map((g, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectGradient(g.class)}
                            className={`flex items-center gap-2 p-1.5 border rounded cursor-pointer text-left transition-all hover:bg-white ${
                              bgGradientClass === g.class
                                ? 'border-blue-600 bg-white font-bold ring-2 ring-blue-100'
                                : 'border-slate-200 bg-transparent text-slate-600'
                            }`}
                            type="button"
                          >
                            <span className={`w-8 h-3.5 rounded shrink-0 ${g.preview}`} />
                            <span className="text-[9.5px] truncate">{g.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {bgType === 'image' && (
                    <div className="flex flex-col gap-2">
                      <p className="font-semibold text-slate-600 mb-1 text-[10px]">Chọn ảnh nền có sẵn hoặc dán link:</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {PRESET_IMAGES.slice(0, 4).map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              handleSelectImage(img.url);
                              setInputCustomUrl('');
                            }}
                            className={`flex flex-col border rounded overflow-hidden cursor-pointer text-left transition-all hover:opacity-90 ${
                              bgImageUrl === img.url
                                ? 'border-blue-600 ring-2 ring-blue-100'
                                : 'border-slate-200'
                            }`}
                            type="button"
                          >
                            <img src={img.url} alt={img.label} referrerPolicy="no-referrer" className="w-full h-8 object-cover" />
                            <span className="text-[8.5px] p-0.5 truncate block font-medium w-full text-center bg-white text-slate-600">{img.label}</span>
                          </button>
                        ))}
                      </div>
                      
                      {/* Custom input URL form */}
                      <div className="border-t border-slate-200/60 pt-1.5 flex flex-col gap-1 mt-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide shrink-0">Dán URL ảnh tùy chọn:</label>
                        <input
                          type="url"
                          placeholder="Link ảnh .jpg"
                          value={inputCustomUrl || bgImageUrl}
                          onChange={(e) => {
                            setInputCustomUrl(e.target.value);
                            handleSelectImage(e.target.value);
                          }}
                          className="w-full text-[9.5px] px-1.5 py-0.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 bg-white outline-none"
                        />
                      </div>

                      {/* Opacity and Blur controllers */}
                      <div className="border-t border-slate-200/60 pt-2 flex flex-col gap-2 mt-1 bg-white p-2 rounded-lg border border-slate-100">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                            <span>Độ mờ lớp phủ trắng:</span>
                            <span className="text-blue-600 font-extrabold font-mono text-[10px]">{bgOpacity}%</span>
                          </div>
                          <p className="text-[8.5px] text-slate-400 leading-tight mb-0.5">Kéo về bên trái (giảm độ mờ) để ảnh nền hiển thị rõ nét, rực rỡ và chân thực hơn!</p>
                          <input
                            type="range"
                            min="10"
                            max="90"
                            step="5"
                            value={bgOpacity}
                            onChange={(e) => handleSelectBgOpacity(parseInt(e.target.value, 10))}
                            className="w-full h-1 bg-slate-250 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                            <span>Độ nhòe hình nền (Blur):</span>
                            <span className="text-blue-600 font-extrabold font-mono text-[10px]">{bgBlur}px</span>
                          </div>
                          <p className="text-[8.5px] text-slate-400 leading-tight mb-0.5">Thiết lập 0px để giữ hình ảnh sắc nét, rõ ràng nhất có thể.</p>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            step="1"
                            value={bgBlur}
                            onChange={(e) => handleSelectBgBlur(parseInt(e.target.value, 10))}
                            className="w-full h-1 bg-slate-250 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Right Column: Input Mode Settings */}
              <div className="md:col-span-4 flex flex-col gap-3">
                <div>
                  <p className="font-bold text-slate-700 mb-2 uppercase tracking-wide text-[10px]">3. Cấu hình chế độ nhập liệu cực bộ:</p>
                  <p className="text-[10px] text-slate-400 mb-1 leading-normal">
                    Lựa chọn phương thức nhập được hỗ trợ khi chỉnh sửa lịch. Cho phép bật cả 2 cùng lúc hoặc chọn riêng lẻ tùy ngữ cảnh thiết bị.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {/* Option 1: Cell dropdown */}
                  <label 
                    className={`flex items-start gap-2.5 p-2 px-3 border rounded-lg cursor-pointer transition-all select-none hover:bg-slate-50 ${
                      enableCellDropdown 
                        ? 'border-blue-600 bg-blue-50/15 font-bold shadow-2xs' 
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      className="mt-1 accent-blue-650 h-3.5 w-3.5 rounded cursor-pointer shrink-0"
                      checked={enableCellDropdown}
                      onChange={(e) => onChangeEnableCellDropdown(e.target.checked)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-[11px] text-slate-900 font-bold mb-0.5">
                        <List className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        Danh sách thả xuống (Dropdown)
                      </div>
                      <p className="text-[9.5px] font-normal text-slate-400 leading-normal">
                        Mở ô thả xuống dọc trực tiếp tại ô lịch được click để gán nhanh ca làm việc bằng chuột.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Bottom character bar */}
                  <label 
                    className={`flex items-start gap-2.5 p-2 px-3 border rounded-lg cursor-pointer transition-all select-none hover:bg-slate-50 ${
                      enableBottomKeypad 
                        ? 'border-blue-600 bg-blue-50/15 font-bold shadow-2xs' 
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      className="mt-1 accent-indigo-650 h-3.5 w-3.5 rounded cursor-pointer shrink-0"
                      checked={enableBottomKeypad}
                      onChange={(e) => onChangeEnableBottomKeypad(e.target.checked)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-[11px] text-slate-900 font-bold mb-0.5">
                        <Keyboard className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        Thanh ký tự/phím bấm cuối trang
                      </div>
                      <p className="text-[9.5px] font-normal text-slate-400 leading-normal">
                        Ghim thanh bảng phím bấm to tiện lợi ở dưới đáy màn hình, phù hợp bấm nhanh hoặc theo dõi phím nhập.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="mt-1 p-2 bg-slate-50 border border-slate-150 rounded text-[9.5px] text-slate-400 leading-normal font-medium">
                  💡 <strong>Hiệu quả:</strong> Bật đồng thời cả hai giúp thao tác trực quan tối đa trên cả màn hình máy tính lớn và máy tính bảng!
                </div>

                {/* Section 4: Chỉnh sửa thông tin hiển thị */}
                <div className="border-t border-slate-200/80 pt-3 flex flex-col gap-2">
                  <p className="font-bold text-slate-700 mb-0.5 uppercase tracking-wide text-[10px]">4. Chỉnh sửa thông tin hiển thị:</p>
                  
                  <div className="flex flex-col gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-250">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Tên bệnh viện / Đơn vị:</label>
                      <input
                        type="text"
                        value={hospitalName}
                        onChange={(e) => handleUpdateHospitalName(e.target.value)}
                        placeholder="Nhập tên bệnh viện..."
                        className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 bg-white font-semibold text-slate-800 outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Tiêu đề hệ thống:</label>
                      <input
                        type="text"
                        value={appTitle}
                        onChange={(e) => handleUpdateAppTitle(e.target.value)}
                        placeholder="Nhập tiêu đề ứng dụng..."
                        className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 bg-white font-bold text-slate-800 outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Phụ đề hệ thống:</label>
                      <input
                        type="text"
                        value={appSubtitle}
                        onChange={(e) => handleUpdateAppSubtitle(e.target.value)}
                        placeholder="Nhập phụ đề ứng dụng..."
                        className="w-full text-xs px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 bg-white text-slate-700 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
  </header>
  );
}
