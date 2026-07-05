export type Role = 'CHIEF_NURSE' | 'HEAD_OF_NURSING' | 'ADMIN' | 'STAFF';

export type Department = string;

export type ScheduleCode = 
  | 'X'   // Làm cả ngày (1.0)
  | 'X/2' // Làm nửa ngày (0.5)
  | 'S'   // Làm nửa ngày sáng (0.5)
  | 'C'   // Làm nửa ngày chiều (0.5)
  | 'Đ'   // Trực đêm (1.0)
  | 'T'   // Trực 24h (1.0)
  | '0'   // Nghỉ cả ngày (0.0)
  | 'O'   // Nghỉ cả ngày (alternative 'O', 0.0)
  | 'H'   // Đi học (0.0 but trackable)
  | 'KL'  // Nghỉ không lương (0.0)
  | 'TS'  // Nghỉ thai sản (0.0)
  | 'P'   // Nghỉ phép (0.0 but tracks in leave stats)
  | '';   // Chưa đăng ký

export interface Staff {
  id: string;
  name: string;
  gender: 'Nam' | 'Nữ';
  major: string; // CNĐĐ, CĐĐĐ, ĐDTC, YSĐK, CĐPHCN, TSCT, etc.
  isChief?: boolean; // Highlighted pink in the spreadsheet (Chief Nurse)
}

export type DaySchedule = Record<string, ScheduleCode>; // key: "01" -> "31"

export interface StaffSchedule {
  staffId: string;
  schedule: DaySchedule;
  notes?: string;
}

export interface DepartmentSchedule {
  department: Department;
  month: string; // "2026-03"
  schedules: StaffSchedule[];
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  updatedAt: string;
  feedback?: string; // Feedback from Trưởng phòng điều dưỡng
}

export interface ScheduleSummary {
  staffId: string;
  totalWorkdays: number; // calculated day công
  personalLeaves: number; // accumulated P count
  unpaidLeaves: number; // count of KL
  maternityLeaves: number; // count of TS
  studyDays: number; // count of H
}

export interface AppNotification {
  id: string;
  type: 'REMINDER' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGE';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  targetRole: Role;
  targetDepartment?: Department;
}

export interface AuthUser {
  username: string;
  role: Role;
  department?: Department;
  fullName: string;
}

export interface DeleteRequest {
  id: string;
  staffId: string;
  staffName: string;
  department: Department;
  requestedBy: string; // e.g. "Điều dưỡng trưởng Khoa Ngoại" or role name etc
  timestamp: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface DirectiveReply {
  id: string;
  senderName: string;
  senderUsername: string;
  content: string;
  timestamp: string;
}

export interface Directive {
  id: string;
  title: string;
  content: string;
  senderName: string; // e.g. "Nguyễn Thanh Hương"
  senderUsername: string; // e.g. "phongdieuduong"
  recipient: 'ALL' | Department; // "ALL" or specific department
  priority: 'NORMAL' | 'URGENT';
  timestamp: string;
  isOpinionRequest?: boolean; // true if this is a request for advice from a Chief Nurse to Trưởng phòng
  replies: DirectiveReply[];
}

export interface ChatMessage {
  id: string;
  senderUsername: string;
  senderName: string;
  senderRole: Role;
  recipientUsername: 'all' | string; // 'all' for general channel, or direct username
  content: string;
  timestamp: string;
  attachment?: {
    name: string;
    type: 'pdf' | 'excel' | 'image' | 'word' | 'any';
    size: string;
    dataUrl?: string;
  };
  reactions?: Record<string, string[]>; // emoji -> list of usernames
}

