import React, { useState, useEffect } from 'react';
import { Role, Department, DepartmentSchedule, Staff, ScheduleCode, AppNotification, AuthUser, DeleteRequest } from './types';
import { getInitialDepartmentSchedules, INITIAL_STAFF, getInitialSchedule } from './initialData';
import Header from './components/Header';
import ScheduleGrid from './components/ScheduleGrid';
import StatsDashboard from './components/StatsDashboard';
import AIAdvisor from './components/AIAdvisor';
import Login from './components/Login';
import PasswordModal from './components/PasswordModal';
import CommunicationCenter from './components/CommunicationCenter';
import PersonalScheduleView from './components/PersonalScheduleView';
import { FileSpreadsheet, BarChart3, HelpCircle, CheckCircle, Clock, AlertTriangle, RefreshCw, X, Trash, MessageSquare } from 'lucide-react';
import { 
  seedInitialDataIfEmpty,
  subscribeToSchedules, 
  saveScheduleToFirestore,
  subscribeToStaff, 
  saveStaffToFirestore,
  subscribeToNotifications, 
  addNotificationToFirestore, 
  markNotificationReadInFirestore,
  subscribeToDeleteRequests, 
  addDeleteRequestToFirestore, 
  removeDeleteRequestFromFirestore,
  deleteNotificationFromFirestore
} from './lib/firebase';

const LOCAL_STORAGE_KEY_SCHEDULES = 'song_thuong_dept_schedules_v1';
const LOCAL_STORAGE_KEY_STAFT = 'song_thuong_staff_list_v1';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const cachedUser = localStorage.getItem('song_thuong_auth_user_v1');
    if (cachedUser) {
      try {
        return JSON.parse(cachedUser);
      } catch (e) {
        console.error("Error loading cached user on init state:", e);
      }
    }
    return null;
  });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role>(() => {
    const cachedUser = localStorage.getItem('song_thuong_auth_user_v1');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        if (parsed && parsed.role) return parsed.role;
      } catch (e) {}
    }
    return 'CHIEF_NURSE';
  });
  const [selectedDepartment, setSelectedDepartment] = useState<Department>(() => {
    const cachedUser = localStorage.getItem('song_thuong_auth_user_v1');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        if (parsed && parsed.department) return parsed.department;
      } catch (e) {}
    }
    return 'Nội - Nhi';
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    const yr = today.getFullYear();
    const mn = String(today.getMonth() + 1).padStart(2, '0');
    return `${yr}-${mn}`;
  });
  const [activeTab, setActiveTab] = useState<'GRID' | 'DASHBOARD' | 'COMMUNICATION'>('GRID');
  
  // Custom states for input configurations configurable by Admin
  const [enableCellDropdown, setEnableCellDropdown] = useState<boolean>(() => {
    const saved = localStorage.getItem('config_enable_cell_dropdown');
    return saved === null ? true : saved === 'true';
  });

  const [enableBottomKeypad, setEnableBottomKeypad] = useState<boolean>(() => {
    const saved = localStorage.getItem('config_enable_bottom_keypad');
    return saved === null ? true : saved === 'true';
  });
  
  // State for database / local persistence
  const [departmentSchedules, setDepartmentSchedules] = useState<DepartmentSchedule[]>([]);
  const [staffList, setStaffList] = useState<Record<string, Staff[]>>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [deleteRequests, setDeleteRequests] = useState<DeleteRequest[]>(() => {
    const cached = localStorage.getItem('song_thuong_delete_requests_v1');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Error reading deleteRequests from registry", e);
      }
    }
    return [];
  });

  // Dynamically initialize schedules for selectedMonth if not already present
  useEffect(() => {
    if (departmentSchedules.length === 0 || Object.keys(staffList).length === 0) return;

    const depts = Object.keys(staffList);
    const missingDepts = depts.filter(dept => 
      !departmentSchedules.some(s => s.department === dept && s.month === selectedMonth)
    );

    if (missingDepts.length > 0) {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      const newSchedules = missingDepts.map(dept => {
        const staffs = staffList[dept] || [];
        const staffSchedules = staffs.map(staff => {
          return {
            staffId: staff.id,
            schedule: getInitialSchedule(staff.id, year, month - 1)
          };
        });

        return {
          department: dept,
          month: selectedMonth,
          schedules: staffSchedules,
          status: 'DRAFT' as const,
          updatedAt: new Date().toISOString()
        };
      });

      const updated = [...departmentSchedules, ...newSchedules];
      updateCachedSchedules(updated);
    }
  }, [selectedMonth, departmentSchedules.length, staffList]);

  // States for custom modals to bypass browser window.confirm / alert blocks
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetScope, setResetScope] = useState<'ALL' | 'YEAR' | 'MONTH' | 'DAY'>('ALL');
  const [resetDate, setResetDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [resetMonth, setResetMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [resetYear, setResetYear] = useState<string>(() => {
    return String(new Date().getFullYear());
  });
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => {
        setSuccessToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // AI Advisor States
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  // Load persistent configurations on mount and setup real-time sync
  useEffect(() => {
    let unsubSchedules: (() => void) | undefined;
    let unsubStaff: (() => void) | undefined;
    let unsubNotifications: (() => void) | undefined;
    let unsubDeleteReqs: (() => void) | undefined;

    const init = async () => {
      await seedInitialDataIfEmpty();
      
      unsubSchedules = subscribeToSchedules((schedules) => {
        setDepartmentSchedules(schedules);
      });

      unsubStaff = subscribeToStaff((staffMap) => {
        setStaffList(staffMap);
      });

      unsubNotifications = subscribeToNotifications((notifs) => {
        setNotifications(notifs);
      });

      unsubDeleteReqs = subscribeToDeleteRequests((reqs) => {
        setDeleteRequests(reqs);
      });
    };

    init().catch(err => console.error("Error initializing Firebase:", err));

    return () => {
      if (unsubSchedules) unsubSchedules();
      if (unsubStaff) unsubStaff();
      if (unsubNotifications) unsubNotifications();
      if (unsubDeleteReqs) unsubDeleteReqs();
    };
  }, []);

  // Sync state helpers to persistent Storage & Firestore
  const updateCachedSchedules = (updated: DepartmentSchedule[]) => {
    setDepartmentSchedules(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY_SCHEDULES, JSON.stringify(updated));
    // Sync each schedule to Firestore
    updated.forEach(schedule => {
      saveScheduleToFirestore(schedule).catch(err => console.error("Error saving schedule to Firestore:", err));
    });
  };

  const updateCachedStaff = (updated: Record<string, Staff[]>) => {
    setStaffList(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY_STAFT, JSON.stringify(updated));
    // Sync each department's staff list to Firestore
    Object.entries(updated).forEach(([dept, list]) => {
      saveStaffToFirestore(dept, list).catch(err => console.error("Error saving staff to Firestore:", err));
    });
  };

  const addNotification = (
    type: AppNotification['type'],
    title: string,
    message: string,
    targetRole: Role,
    targetDepartment?: Department
  ) => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      isRead: false,
      targetRole,
      targetDepartment
    };
    addNotificationToFirestore(newNotif).catch(err => console.error("Error adding notification to Firestore:", err));
  };

  const handleMarkAsRead = (id: string) => {
    markNotificationReadInFirestore(id).catch(err => console.error("Error marking notification read:", err));
  };

  const handleMarkAllAsReadByRole = (role: Role, department?: Department) => {
    notifications.forEach(n => {
      let isTarget = false;
      if (role === 'CHIEF_NURSE') {
        isTarget = n.targetRole === 'CHIEF_NURSE' && (!n.targetDepartment || n.targetDepartment === department);
      } else if (role === 'HEAD_OF_NURSING') {
        isTarget = n.targetRole === 'HEAD_OF_NURSING';
      } else {
        isTarget = n.targetRole === 'ADMIN' || n.targetRole === 'CHIEF_NURSE' || n.targetRole === 'HEAD_OF_NURSING';
      }
      if (isTarget && !n.isRead) {
        markNotificationReadInFirestore(n.id).catch(err => console.error("Error marking notification read:", err));
      }
    });
  };

  const handleClearNotificationsByRole = (role: Role, department?: Department) => {
    notifications.forEach(n => {
      let isTarget = false;
      if (role === 'CHIEF_NURSE') {
        isTarget = n.targetRole === 'CHIEF_NURSE' && (!n.targetDepartment || n.targetDepartment === department);
      } else if (role === 'HEAD_OF_NURSING') {
        isTarget = n.targetRole === 'HEAD_OF_NURSING';
      } else {
        isTarget = n.targetRole === 'ADMIN' || n.targetRole === 'CHIEF_NURSE' || n.targetRole === 'HEAD_OF_NURSING';
      }
      if (isTarget) {
        deleteNotificationFromFirestore(n.id).catch(err => console.error("Error deleting notification:", err));
      }
    });
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    if (user.department) {
      setSelectedDepartment(user.department);
    }
    localStorage.setItem('song_thuong_auth_user_v1', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('song_thuong_auth_user_v1');
    setCurrentRole('CHIEF_NURSE');
    setSelectedDepartment('Nội - Nhi');
  };

  // 1. Update individual shift code for a specific nurse and date
  const handleUpdateSchedule = (
    dept: Department,
    staffId: string,
    date: string,
    code: ScheduleCode,
    targetMonth?: string
  ) => {
    const activeMonth = targetMonth || selectedMonth;
    
    // Lazy initialize schedules for activeMonth if empty/missing
    let currentSchedules = [...departmentSchedules];
    const exists = currentSchedules.some(s => s.month === activeMonth);
    if (!exists && Object.keys(staffList).length > 0) {
      const departments: Department[] = ['Nội - Nhi', 'Ngoại', 'YHCT - PHCN', 'LCK'];
      const [yearStr, monthStr] = activeMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      const newSchedules = departments.map(d => {
        const staffs = staffList[d] || [];
        const staffSchedules = staffs.map(staff => ({
          staffId: staff.id,
          schedule: getInitialSchedule(staff.id, year, month - 1)
        }));

        return {
          department: d,
          month: activeMonth,
          schedules: staffSchedules,
          status: 'DRAFT' as const,
          updatedAt: new Date().toISOString()
        };
      });
      currentSchedules = [...currentSchedules, ...newSchedules];
    }

    const updated = currentSchedules.map(deptSche => {
      if (deptSche.department !== dept || deptSche.month !== activeMonth) return deptSche;

      const updatedStaffSchedules = deptSche.schedules.map(staffSche => {
        if (staffSche.staffId !== staffId) return staffSche;
        return {
          ...staffSche,
          schedule: {
            ...staffSche.schedule,
            [date]: code
          }
        };
      });

      return {
        ...deptSche,
        schedules: updatedStaffSchedules,
        updatedAt: new Date().toISOString()
      };
    });

    updateCachedSchedules(updated);

    // Trigger automatic notification about change
    let staffName = 'Nhân sự';
    const deptStaff = staffList[dept] || [];
    const staffMember = deptStaff.find(s => s.id === staffId);
    if (staffMember) {
      staffName = staffMember.name;
    }
    
    addNotification(
      'CHANGE',
      `Thay đổi lịch làm việc Khoa ${dept}`,
      `Có thay đổi lịch làm việc ngày ${date} của nhân sự ${staffName} sang ca "${code || 'Trống/Xóa'}"`,
      'CHIEF_NURSE',
      dept
    );
    addNotification(
      'CHANGE',
      `Thay đổi lịch làm việc Khoa ${dept}`,
      `Trưởng khoa ${dept} đã cập nhật lịch làm việc ngày ${date} của nhân sự ${staffName} thành "${code || 'Trống/Xóa'}".`,
      'HEAD_OF_NURSING'
    );
  };

  // 2. Add new nurse to the roster
  const handleAddStaff = (
    dept: Department,
    name: string,
    gender: 'Nam' | 'Nữ',
    major: string,
    isChief: boolean
  ) => {
    // Generate new ID
    const newId = `${dept.toLowerCase().substring(0,2)}-${Date.now()}`;
    const newStaffMember: Staff = { id: newId, name, gender, major, isChief };

    // Update staff lists
    const updatedStaffList = {
      ...staffList,
      [dept]: [...(staffList[dept] || []), newStaffMember]
    };
    updateCachedStaff(updatedStaffList);

    const updatedSchedules = departmentSchedules.map(deptSche => {
      if (deptSche.department !== dept) return deptSche;
      
      const [yearStr, monthStr] = deptSche.month.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const length = new Date(year, month, 0).getDate();

      const defaultCodes: Record<string, ScheduleCode> = {};
      for (let i = 1; i <= length; i++) {
        const dKey = i < 10 ? `0${i}` : `${i}`;
        const dateObj = new Date(year, month - 1, i);
        const isSunday = dateObj.getDay() === 0;
        defaultCodes[dKey] = isSunday ? '0' : 'X';
      }

      return {
        ...deptSche,
        schedules: [
          ...deptSche.schedules,
          { staffId: newId, schedule: defaultCodes }
        ],
        updatedAt: new Date().toISOString()
      };
    });
    updateCachedSchedules(updatedSchedules);
  };

  // 2.1. Add new department/room
  const handleAddDepartment = (deptName: string) => {
    const trimmed = deptName.trim();
    if (!trimmed) return;
    if (staffList[trimmed]) {
      alert(`Khoa/Phòng "${trimmed}" đã tồn tại!`);
      return;
    }
    const updatedStaffList = {
      ...staffList,
      [trimmed]: []
    };
    updateCachedStaff(updatedStaffList);

    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const newSchedule: DepartmentSchedule = {
      department: trimmed,
      month: selectedMonth,
      schedules: [],
      status: 'DRAFT',
      updatedAt: new Date().toISOString()
    };

    const updatedSchedules = [...departmentSchedules, newSchedule];
    updateCachedSchedules(updatedSchedules);
  };

  // 3. Remove a nurse from the roster
  const handleRemoveStaff = (dept: Department, staffId: string) => {
    // Filter staff out of listing
    const updatedStaffList = {
      ...staffList,
      [dept]: (staffList[dept] || []).filter(s => s.id !== staffId)
    };
    updateCachedStaff(updatedStaffList);

    // Fitler schedule registry out:
    const updatedSchedules = departmentSchedules.map(deptSche => {
      if (deptSche.department !== dept) return deptSche;
      return {
        ...deptSche,
        schedules: deptSche.schedules.filter(s => s.staffId !== staffId),
        updatedAt: new Date().toISOString()
      };
    });
    updateCachedSchedules(updatedSchedules);

    // Filter out any active or pending delete requests for this staff in Firestore
    deleteRequests.forEach(r => {
      if (r.staffId === staffId) {
        removeDeleteRequestFromFirestore(r.id).catch(err => console.error("Error removing delete request from Firestore:", err));
      }
    });
  };

  // 3.1. Update existing staff member info (or transfer department if newDept is provided and different)
  const handleUpdateStaff = (dept: Department, staffId: string, updatedFields: Partial<Staff>, newDept?: Department) => {
    let updatedStaffList = { ...staffList };
    const staffToMove = (staffList[dept] || []).find(s => s.id === staffId);
    const isTransfer = newDept && newDept !== dept && staffToMove;

    if (isTransfer) {
      // Remove from old department
      updatedStaffList[dept] = (staffList[dept] || []).filter(s => s.id !== staffId);
      // Apply updates and add to new department
      const updatedStaff = { ...staffToMove, ...updatedFields };
      updatedStaffList[newDept] = [...(updatedStaffList[newDept] || []), updatedStaff];
      
      // Perform schedule transfer for all months
      const updatedSchedules = departmentSchedules.map(deptSche => {
        // If this is the old department, remove the staff member's schedule
        if (deptSche.department === dept) {
          return {
            ...deptSche,
            schedules: deptSche.schedules.filter(s => s.staffId !== staffId),
            updatedAt: new Date().toISOString()
          };
        }
        return deptSche;
      });

      const finalSchedules = [...updatedSchedules];
      
      departmentSchedules.forEach(oldDeptSche => {
        if (oldDeptSche.department === dept) {
          const staffScheduleToMove = oldDeptSche.schedules.find(s => s.staffId === staffId);
          if (staffScheduleToMove) {
            // Find or create the corresponding DepartmentSchedule in newDept for the same month
            const targetIndex = finalSchedules.findIndex(
              s => s.department === newDept && s.month === oldDeptSche.month
            );
            if (targetIndex !== -1) {
              const targetSche = finalSchedules[targetIndex];
              if (!targetSche.schedules.some(s => s.staffId === staffId)) {
                finalSchedules[targetIndex] = {
                  ...targetSche,
                  schedules: [...targetSche.schedules, staffScheduleToMove],
                  updatedAt: new Date().toISOString()
                };
              }
            } else {
              finalSchedules.push({
                department: newDept,
                month: oldDeptSche.month,
                schedules: [staffScheduleToMove],
                status: 'DRAFT',
                updatedAt: new Date().toISOString()
              });
            }
          }
        }
      });
      
      updateCachedSchedules(finalSchedules);
    } else {
      updatedStaffList[dept] = (staffList[dept] || []).map(s => {
        if (s.id === staffId) {
          return { ...s, ...updatedFields };
        }
        return s;
      });
    }

    updateCachedStaff(updatedStaffList);

    if (isTransfer) {
      addNotification(
        'CHANGE',
        `Điều chuyển nhân sự`,
        `Quyền Admin tối cao đã điều chuyển nhân viên ${updatedFields.name || staffToMove?.name || 'nhân viên'} từ khoa ${dept} sang khoa ${newDept}.`,
        'CHIEF_NURSE',
        dept
      );
      addNotification(
        'CHANGE',
        `Tiếp nhận nhân sự điều chuyển`,
        `Khoa ${newDept} tiếp nhận điều chuyển nhân viên ${updatedFields.name || staffToMove?.name || 'nhân viên'} từ khoa ${dept}.`,
        'CHIEF_NURSE',
        newDept
      );
    } else {
      addNotification(
        'CHANGE',
        `Cập nhật thông tin nhân viên`,
        `Đã chỉnh sửa thông tin nhân sự ${updatedFields.name || 'nhân viên'} của khoa ${dept}.`,
        'CHIEF_NURSE',
        dept
      );
    }
  };

  // 3.2. File deletion request (or delete immediately if role is ADMIN)
  const handleRequestDeleteStaff = (dept: Department, staffId: string, staffName: string) => {
    if (currentRole === 'ADMIN') {
      handleRemoveStaff(dept, staffId);
      addNotification(
        'CHANGE',
        `Xóa nhân sự trực tiếp`,
        `Quyền Admin tối cao đã thực hiện xóa nhân sự ${staffName} khỏi hệ thống khoa ${dept}.`,
        'CHIEF_NURSE',
        dept
      );
      return;
    }

    // Otherwise, create a Deletion Request for Admin
    const requsterLabel = currentRole === 'HEAD_OF_NURSING' ? 'Trưởng phòng ĐD' : `Điều dưỡng trưởng khoa ${dept}`;
    const newRequest: DeleteRequest = {
      id: `del-req-${Date.now()}`,
      staffId,
      staffName,
      department: dept,
      requestedBy: requsterLabel,
      timestamp: new Date().toISOString(),
      status: 'PENDING'
    };

    addDeleteRequestToFirestore(newRequest).catch(err => console.error("Error adding delete request to Firestore:", err));

    addNotification(
      'PENDING',
      `Yêu cầu phê duyệt xóa nhân sự`,
      `Nhận yêu cầu xóa nhân sự ${staffName} tại khoa ${dept} nộp bởi ${requsterLabel}. Chờ Admin phê duyệt.`,
      'ADMIN'
    );
  };

  // 3.3. Approve staff deletion request (by ADMIN)
  const handleApproveDeleteStaff = (requestId: string) => {
    const request = deleteRequests.find(r => r.id === requestId);
    if (!request) return;

    // Filter staff out of listing and update rosters
    handleRemoveStaff(request.department, request.staffId);

    // Update request status to APPROVED in Firestore
    const updatedRequest: DeleteRequest = {
      ...request,
      status: 'APPROVED'
    };
    addDeleteRequestToFirestore(updatedRequest).catch(err => console.error("Error updating delete request in Firestore:", err));

    addNotification(
      'APPROVED',
      `Đã duyệt xóa nhân sự`,
      `Admin đã PHÊ DUYỆT yêu cầu xóa nhân viên ${request.staffName} tại khoa ${request.department}.`,
      'CHIEF_NURSE',
      request.department
    );
  };

  // 3.4. Reject staff deletion request (by ADMIN)
  const handleRejectDeleteStaff = (requestId: string) => {
    const request = deleteRequests.find(r => r.id === requestId);
    if (!request) return;

    // Update request status to REJECTED in Firestore
    const updatedRequest: DeleteRequest = {
      ...request,
      status: 'REJECTED'
    };
    addDeleteRequestToFirestore(updatedRequest).catch(err => console.error("Error updating delete request in Firestore:", err));

    addNotification(
      'REJECTED',
      `Từ chối yêu cầu xóa nhân sự`,
      `Admin đã bác bỏ và TỪ CHỐI yêu cầu xóa nhân viên ${request.staffName} của khoa ${request.department}.`,
      'CHIEF_NURSE',
      request.department
    );
  };

  // 4. Update approval pipeline status
  const handleUpdateStatus = (
    dept: Department,
    status: DepartmentSchedule['status'],
    feedback?: string
  ) => {
    const updated = departmentSchedules.map(deptSche => {
      if (deptSche.department !== dept || deptSche.month !== selectedMonth) return deptSche;
      return {
        ...deptSche,
        status,
        feedback: feedback || undefined,
        updatedAt: new Date().toISOString()
      };
    });
    updateCachedSchedules(updated);

    const monthParts = selectedMonth.split('-');
    const formattedMonth = `tháng ${monthParts[1]}/${monthParts[0]}`;

    // Trigger automatic notifications of states: SUBMITTED (PENDING), APPROVED, REJECTED
    if (status === 'SUBMITTED') {
      addNotification(
        'PENDING',
        `Yêu cầu phê duyệt Lịch Trực Khoa ${dept}`,
        `Trưởng khoa ${dept} đã gửi bảng lịch làm việc ${formattedMonth}. Vui lòng phê duyệt hoặc từ chối bổ sung.`,
        'HEAD_OF_NURSING'
      );
      addNotification(
        'PENDING',
        `Đã nộp lịch kiểm duyệt Khoa ${dept}`,
        `Bảng xếp lịch ${formattedMonth} đã được nộp thành công lên Phòng Điều dưỡng và đang chờ xét duyệt.`,
        'CHIEF_NURSE',
        dept
      );
    } else if (status === 'APPROVED') {
      addNotification(
        'APPROVED',
        `Lịch làm việc đã được PHÊ DUYỆT - Khoa ${dept}`,
        `Chúc mừng! Trưởng phòng Điều dưỡng đã chính thức phê duyệt lịch làm việc của Khoa ${dept} cho ${formattedMonth}.`,
        'CHIEF_NURSE',
        dept
      );
      addNotification(
        'APPROVED',
        `Đã duyệt lịch làm việc Khoa ${dept}`,
        `Bạn đã phê duyệt thành công bảng đăng ký nhân lực làm việc ${formattedMonth} cho Khoa ${dept}.`,
        'HEAD_OF_NURSING'
      );
    } else if (status === 'REJECTED') {
      addNotification(
        'REJECTED',
        `Lịch làm việc bị TỪ CHỐI DUYỆT - Khoa ${dept}`,
        `Cảnh báo: Trưởng phòng từ chối bảng lịch làm việc ${formattedMonth} Khoa ${dept}. Ghi chú phản hồi: "${feedback || 'Vui lòng bổ sung nhân lực ca kíp phù hợp.'}"`,
        'CHIEF_NURSE',
        dept
      );
      addNotification(
        'REJECTED',
        `Đã từ chối duyệt lịch Khoa ${dept}`,
        `Bạn đã từ chối bảng đăng ký nhân lực làm việc khoa ${dept} (${formattedMonth}) và yêu cầu chỉnh sửa với lý do: "${feedback}"`,
        'HEAD_OF_NURSING'
      );
    }
  };

  // 5. Clear / Wipe entire database and schedule boards
  const handleResetData = () => {
    setIsResetConfirmOpen(true);
  };

  const executeResetData = () => {
    let clearedSchedules = [...departmentSchedules];
    let toastMessage = '';

    if (resetScope === 'ALL') {
      // Clear all codes to empty string "" (Not scheduled / Blank)
      clearedSchedules = departmentSchedules.map(deptSche => {
        const updatedSchedules = deptSche.schedules.map(staffSche => {
          const emptyCodes: Record<string, ScheduleCode> = {};
          Object.keys(staffSche.schedule).forEach(dayKey => {
            emptyCodes[dayKey] = ''; // Set every cell to blank
          });
          return {
            ...staffSche,
            schedule: emptyCodes
          };
        });

        return {
          ...deptSche,
          status: 'DRAFT' as const,
          schedules: updatedSchedules,
          feedback: undefined,
          updatedAt: new Date().toISOString()
        };
      });

      // Delete deleteRequests and notifications in Firestore
      deleteRequests.forEach(r => {
        removeDeleteRequestFromFirestore(r.id).catch(err => console.error(err));
      });

      notifications.forEach(n => {
        deleteNotificationFromFirestore(n.id).catch(err => console.error(err));
      });
      
      // Clear custom symbols convention back to default values
      localStorage.removeItem('song_thuong_convention_symbols_v1');
      
      toastMessage = 'Đã xóa sạch toàn bộ dữ liệu lịch làm việc! Tất cả các bảng đăng ký nhân lực hiện có trạng thái Trống để sẵn sàng xếp lịch mới.';
    } else if (resetScope === 'YEAR') {
      // Clear all codes of schedules in a specific year
      clearedSchedules = departmentSchedules.map(deptSche => {
        if (deptSche.month.startsWith(resetYear)) {
          const updatedSchedules = deptSche.schedules.map(staffSche => {
            const emptyCodes: Record<string, ScheduleCode> = {};
            Object.keys(staffSche.schedule).forEach(dayKey => {
              emptyCodes[dayKey] = '';
            });
            return {
              ...staffSche,
              schedule: emptyCodes
            };
          });

          return {
            ...deptSche,
            status: 'DRAFT' as const,
            schedules: updatedSchedules,
            feedback: undefined,
            updatedAt: new Date().toISOString()
          };
        }
        return deptSche;
      });

      toastMessage = `Đã xóa sạch toàn bộ dữ liệu lịch làm việc của năm ${resetYear}!`;
    } else if (resetScope === 'MONTH') {
      // Clear all codes of schedules in a specific month
      const formattedMonthStr = resetMonth; // e.g. "2026-07"
      const [year, monthVal] = formattedMonthStr.split('-');
      
      clearedSchedules = departmentSchedules.map(deptSche => {
        if (deptSche.month === formattedMonthStr) {
          const updatedSchedules = deptSche.schedules.map(staffSche => {
            const emptyCodes: Record<string, ScheduleCode> = {};
            Object.keys(staffSche.schedule).forEach(dayKey => {
              emptyCodes[dayKey] = '';
            });
            return {
              ...staffSche,
              schedule: emptyCodes
            };
          });

          return {
            ...deptSche,
            status: 'DRAFT' as const,
            schedules: updatedSchedules,
            feedback: undefined,
            updatedAt: new Date().toISOString()
          };
        }
        return deptSche;
      });

      toastMessage = `Đã xóa sạch toàn bộ dữ liệu lịch làm việc của tháng ${monthVal}/${year}!`;
    } else if (resetScope === 'DAY') {
      // Clear a specific day in a specific month
      const [year, monthVal, dayVal] = resetDate.split('-');
      const targetMonthStr = `${year}-${monthVal}`; // e.g. "2026-07"
      const targetDayKey = dayVal; // e.g. "03"

      clearedSchedules = departmentSchedules.map(deptSche => {
        if (deptSche.month === targetMonthStr) {
          const updatedSchedules = deptSche.schedules.map(staffSche => {
            const updatedCodes = { ...staffSche.schedule };
            if (updatedCodes.hasOwnProperty(targetDayKey)) {
              updatedCodes[targetDayKey] = '';
            } else {
              updatedCodes[targetDayKey] = '';
            }
            return {
              ...staffSche,
              schedule: updatedCodes
            };
          });

          return {
            ...deptSche,
            schedules: updatedSchedules,
            updatedAt: new Date().toISOString()
          };
        }
        return deptSche;
      });

      toastMessage = `Đã xóa dữ liệu lịch làm việc của ngày ${dayVal}/${monthVal}/${year}!`;
    }

    updateCachedSchedules(clearedSchedules);
    setAiReport(null);
    setIsResetConfirmOpen(false);
    setSuccessToast(toastMessage);
  };

  // 6. Request Gemini dynamic Workforce Analysis
  const handleTriggerAI = async () => {
    setAiLoading(true);
    setAiPanelOpen(true);
    setAiReport(null);

    try {
      const response = await fetch('/api/analyze-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentSchedules,
          staffList,
          selectedMonth
        })
      });

      const data = await response.json();
      if (data.error) {
        setAiReport(`### ❌ LỖI KẾT NỐI AI\n\n${data.error}`);
      } else {
        setAiReport(data.analysis);
      }
    } catch (err: any) {
      console.error(err);
      setAiReport(`### ❌ LỖI HỆ THỐNG\n\nKhông thể kết nối đến máy chủ phân tích AI. Vui lòng kiểm tra cổng vận hành.`);
    } finally {
      setAiLoading(false);
    }
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (currentUser.role === 'STAFF') {
    return (
      <PersonalScheduleView
        currentUser={currentUser}
        departmentSchedules={departmentSchedules}
        onLogout={handleLogout}
        staffList={staffList}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans antialiased">
      
      {/* Upper Navigation block */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
        currentRole={currentRole}
        onChangeRole={setCurrentRole}
        selectedDepartment={selectedDepartment}
        onChangeDepartment={setSelectedDepartment}
        onResetData={handleResetData}
        onTriggerAI={handleTriggerAI}
        isAiLoading={aiLoading}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsReadByRole}
        onClearNotifications={handleClearNotificationsByRole}
        enableCellDropdown={enableCellDropdown}
        onChangeEnableCellDropdown={(val) => {
          setEnableCellDropdown(val);
          localStorage.setItem('config_enable_cell_dropdown', String(val));
        }}
        enableBottomKeypad={enableBottomKeypad}
        onChangeEnableBottomKeypad={(val) => {
          setEnableBottomKeypad(val);
          localStorage.setItem('config_enable_bottom_keypad', String(val));
        }}
        departments={Object.keys(staffList)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5">
        
        {/* Navigation Tabs and Quick Indicators */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-gray-200 pb-3 gap-3">
          
          <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200 self-start">
            <button
              id="tab-btn-grid"
              onClick={() => setActiveTab('GRID')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md cursor-pointer transition-all ${
                activeTab === 'GRID'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-gray-500" />
              <span>Bảng đăng ký chi tiết</span>
            </button>
            
            <button
              id="tab-btn-dashboard"
              onClick={() => setActiveTab('DASHBOARD')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md cursor-pointer transition-all ${
                activeTab === 'DASHBOARD'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <span>Phân tích & Báo cáo</span>
            </button>

            <button
              id="tab-btn-communication"
              onClick={() => setActiveTab('COMMUNICATION')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md cursor-pointer transition-all ${
                activeTab === 'COMMUNICATION'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-emerald-600 animate-bounce" />
              <span className="text-emerald-700">Liên lạc & Chỉ đạo</span>
            </button>
          </div>

          {/* Quick status recap for the Chief Nurse */}
          {currentRole === 'CHIEF_NURSE' && (
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-100 shadow-xs p-2 rounded-lg">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>
                Cơ sở dữ liệu lưu cục bộ tại trình duyệt (Đã bảo mật). Tên bạn điều hành:{' '}
                <strong>
                  {staffList[selectedDepartment]?.find(s => s.isChief)?.name || 'Điều dưỡng trưởng'}
                </strong>
              </span>
            </div>
          )}

        </div>

        {/* Content render tab */}
        {activeTab === 'GRID' ? (
          <ScheduleGrid
            currentRole={currentRole}
            selectedDepartment={selectedDepartment}
            departmentSchedules={departmentSchedules}
            staffList={staffList}
            onUpdateSchedule={handleUpdateSchedule}
            onAddStaff={handleAddStaff}
            onRemoveStaff={handleRemoveStaff}
            onUpdateStatus={handleUpdateStatus}
            selectedMonth={selectedMonth}
            onChangeMonth={setSelectedMonth}
            deleteRequests={deleteRequests}
            onRequestDeleteStaff={handleRequestDeleteStaff}
            onApproveDeleteStaff={handleApproveDeleteStaff}
            onRejectDeleteStaff={handleRejectDeleteStaff}
            onUpdateStaff={handleUpdateStaff}
            enableCellDropdown={enableCellDropdown}
            enableBottomKeypad={enableBottomKeypad}
            onBulkUpdateSchedules={updateCachedSchedules}
            onAddDepartment={handleAddDepartment}
          />
        ) : activeTab === 'DASHBOARD' ? (
          <StatsDashboard
            departmentSchedules={departmentSchedules}
            staffList={staffList}
            selectedMonth={selectedMonth}
            onChangeMonth={setSelectedMonth}
            aiReport={aiReport}
            aiLoading={aiLoading}
            onTriggerAI={handleTriggerAI}
            currentRole={currentRole}
          />
        ) : (
          <CommunicationCenter
            currentUser={currentUser!}
            staffList={staffList}
          />
        )}

      </main>

      {/* Slide-over Right AI Advisor Sidebar Panel */}
      <AIAdvisor
        isOpen={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        isLoading={aiLoading}
        analysisReport={aiReport}
        onTriggerAnalysis={handleTriggerAI}
      />

      {/* Password Management & Reset Dialog */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        currentUser={currentUser}
      />

      {/* Custom Confirmation Modal for resetting data */}
      {isResetConfirmOpen && (
        <div id="reset-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden transform transition-all animate-scale-up">
            {/* Header */}
            <div className="bg-rose-50 border-b border-rose-100 px-5 py-4 flex items-center gap-3">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Cấu hình xóa dữ liệu</h3>
                <p className="text-[10px] text-rose-600 font-medium font-mono">BỆNH VIỆN ĐA KHOA SÔNG THƯƠNG BẮC GIANG</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Chọn phạm vi thời gian cần xóa:</label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setResetScope('DAY')}
                    className={`px-1 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      resetScope === 'DAY' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetScope('MONTH')}
                    className={`px-1 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      resetScope === 'MONTH' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Tháng
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetScope('YEAR')}
                    className={`px-1 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      resetScope === 'YEAR' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Năm
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetScope('ALL')}
                    className={`px-1 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      resetScope === 'ALL' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Toàn bộ
                  </button>
                </div>
              </div>

              {/* Dynamic input based on selection */}
              {resetScope === 'DAY' && (
                <div className="animate-fade-in space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Chọn ngày cụ thể cần xóa:</label>
                  <input
                    type="date"
                    value={resetDate}
                    onChange={(e) => setResetDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  <p className="text-[10px] text-slate-400">Chỉ xóa dữ liệu phân ca của riêng ngày đã chọn.</p>
                </div>
              )}

              {resetScope === 'MONTH' && (
                <div className="animate-fade-in space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Chọn tháng cần xóa:</label>
                  <input
                    type="month"
                    value={resetMonth}
                    onChange={(e) => setResetMonth(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  <p className="text-[10px] text-slate-400">Toàn bộ lịch làm việc của tháng này sẽ được đưa về trạng thái Bản nháp trống.</p>
                </div>
              )}

              {resetScope === 'YEAR' && (
                <div className="animate-fade-in space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Chọn năm cần xóa:</label>
                  <select
                    value={resetYear}
                    onChange={(e) => setResetYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                      <option key={y} value={String(y)}>Năm {y}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400">Toàn bộ lịch làm việc của năm này sẽ được đưa về trạng thái Bản nháp trống.</p>
                </div>
              )}

              {resetScope === 'ALL' && (
                <div className="animate-fade-in bg-rose-50 p-3 rounded-lg border border-rose-100 space-y-1.5">
                  <p className="text-xs text-rose-800 leading-relaxed font-semibold">
                    Bạn đang chọn xóa TOÀN BỘ dữ liệu trên hệ thống:
                  </p>
                  <ul className="text-[11px] text-rose-700 space-y-1 pl-3 list-disc">
                    <li>Đưa mọi ca làm việc của tất cả nhân sự về trạng thái Trống.</li>
                    <li>Đưa tất cả bảng phân ca về trạng thái Bản Nháp.</li>
                    <li>Gỡ bỏ tất cả các chỉ đạo, thông báo & phản hồi liên quan.</li>
                    <li>Vẫn giữ nguyên danh sách cán bộ nhân sự để tái sử dụng.</li>
                  </ul>
                </div>
              )}

              <p className="text-[11px] font-bold text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100 leading-relaxed">
                ⚠️ Cảnh báo: Hành động xóa dữ liệu này không thể hoàn tác. Vui lòng cân nhắc kỹ trước khi xác nhận!
              </p>
            </div>

            {/* Footer Actions */}
            <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex items-center justify-end gap-2.5">
              <button
                id="btn-cancel-reset"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-bold hover:bg-slate-200/50 rounded-lg transition-all cursor-pointer border border-slate-200"
              >
                Hủy bỏ
              </button>
              <button
                id="btn-confirm-reset"
                onClick={executeResetData}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <Trash className="w-3.5 h-3.5" />
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Beautiful Auto-dismiss Toast Notification */}
      {successToast && (
        <div id="toast-success-reset" className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-600 text-white py-3 px-4 rounded-xl shadow-xl border border-emerald-500/30 max-w-sm animate-fade-in-slide-up">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold leading-normal">{successToast}</p>
          </div>
          <button 
            id="btn-close-toast"
            onClick={() => setSuccessToast(null)} 
            className="text-white/70 hover:text-white hover:bg-white/10 rounded p-1 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <footer className="bg-white border-t border-gray-200 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-400 font-medium">
          <p>© 2026 - Bản quyền thuộc Bệnh Viện Sông Thương Bắc Giang. Bộ quản lý nhân sự số hóa Phòng Điều Dưỡng.</p>
        </div>
      </footer>

    </div>
  );
}
