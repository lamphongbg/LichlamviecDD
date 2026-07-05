import React, { useState, useEffect, useRef } from 'react';
import { AuthUser, Role, Department, Directive, DirectiveReply, ChatMessage } from '../types';
import { 
  subscribeToDirectives,
  addDirectiveToFirestore,
  deleteDirectiveFromFirestore,
  addDirectiveReplyToFirestore,
  subscribeToChat,
  addChatMessageToFirestore,
  addChatMessageReactionToFirestore,
  subscribeToMemberStatuses,
  updateMemberStatusInFirestore,
  addNotificationToFirestore,
  deleteChatMessageFromFirestore,
  clearChatHistoryFromFirestore,
  autoCleanupOldChatMessages
} from '../lib/firebase';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Megaphone, 
  HelpCircle, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  CornerDownRight, 
  ShieldAlert,
  Clock,
  Volume2,
  VolumeX,
  Trash2,
  Sparkles,
  MessageCircle,
  User,
  Layers,
  Search,
  Paperclip,
  FileText,
  File,
  Upload,
  Image as ImageIcon,
  Check,
  Download,
  Activity,
  UserCheck,
  Shield,
  Smile,
  XCircle,
  X,
  FileSpreadsheet
} from 'lucide-react';

interface CommunicationCenterProps {
  currentUser: AuthUser;
  staffList: Record<string, any[]>;
}

const DEFAULT_ACCOUNT_IDS = ['admin', 'phongdieuduong', 'noinhi', 'ngoai', 'yhct', 'lck'];

const FALLBACK_ACCOUNT_LABELS: Record<string, string> = {
  admin: 'Quản trị viên Hệ thống (Admin)',
  phongdieuduong: 'Nguyễn Thanh Hương (Trưởng phòng)',
  noinhi: 'Phạm Thị Cánh (Trưởng khoa Nội-Nhi)',
  ngoai: 'Trương Thị Ngân (Trưởng khoa Ngoại)',
  yhct: 'Phạm Thị Hiền (Trưởng khoa YHCT)',
  lck: 'Trần Hoài Thương (Trưởng khoa LCK)'
};

const ACCOUNT_DEPARMENTS: Record<string, string> = {
  admin: 'Hệ thống',
  phongdieuduong: 'Phòng Điều dưỡng',
  noinhi: 'Khoa Nội - Nhi',
  ngoai: 'Khoa Ngoại',
  yhct: 'Khoa Y học cổ truyền',
  lck: 'Khoa Liên chuyên khoa'
};

// Available clinical statuses
const CLINICAL_STATUSES = [
  { label: '🟢 Đang trực ban', color: 'bg-emerald-500 text-emerald-800' },
  { label: '🟡 Đang đi buồng bệnh', color: 'bg-amber-500 text-amber-800' },
  { label: '🔴 Trong phòng mổ / Giao ban', color: 'bg-rose-500 text-rose-800' },
  { label: '🏖️ Đang nghỉ phép / Nghỉ bù', color: 'bg-sky-500 text-sky-800' },
  { label: '⚪ Ngoại tuyến (Nghỉ ca)', color: 'bg-slate-400 text-slate-700' }
];

export default function CommunicationCenter({ currentUser, staffList }: CommunicationCenterProps) {
  // Navigation tabs within Communication
  const [activeCommTab, setActiveCommTab] = useState<'DIRECTIVES' | 'CHAT'>('CHAT'); // Default to CHAT to highlight the completed feature!

  // Directives & Opinions State
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [directiveTitle, setDirectiveTitle] = useState('');
  const [directiveContent, setDirectiveContent] = useState('');
  const [directivePriority, setDirectivePriority] = useState<'NORMAL' | 'URGENT'>('NORMAL');
  const [directiveRecipient, setDirectiveRecipient] = useState<'ALL' | Department>('ALL');
  const [showAddDirectiveForm, setShowAddDirectiveForm] = useState(false);
  const [directiveReplyTexts, setDirectiveReplyTexts] = useState<Record<string, string>>({});

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeRoom, setActiveRoom] = useState<string>('all'); // 'all', 'leadership', or username (e.g. 'noinhi')
  const [typedMessage, setTypedMessage] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(true);
  const [pendingAttachment, setPendingAttachment] = useState<{
    name: string;
    type: 'pdf' | 'excel' | 'image' | 'word' | 'any';
    size: string;
    dataUrl?: string;
  } | null>(null);
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    type: string;
    size: string;
    dataUrl?: string;
    senderName?: string;
    timestamp?: string;
  } | null>(null);

  // Custom confirmation modal state to bypass sandboxed iframe window.confirm block
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Dynamic names loaded from localStorage
  const [accountNames, setAccountNames] = useState<Record<string, string>>({});

  // Dynamic statuses of users in localStorage
  const [memberStatuses, setMemberStatuses] = useState<Record<string, string>>(() => {
    const cached = localStorage.getItem('song_thuong_member_statuses_v1');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return {
      admin: '🟢 Đang trực ban',
      phongdieuduong: '🟢 Đang trực ban',
      noinhi: '🟡 Đang đi buồng bệnh',
      ngoai: '🔴 Trong phòng mổ / Giao ban',
      yhct: '🟢 Đang trực ban',
      lck: '⚪ Ngoại tuyến (Nghỉ ca)'
    };
  });

  // User's own status
  const [myStatus, setMyStatus] = useState<string>(() => {
    const cached = localStorage.getItem('song_thuong_member_statuses_v1');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed[currentUser.username]) {
          return parsed[currentUser.username];
        }
      } catch (e) {}
    }
    return '🟢 Đang trực ban';
  });

  // Simulated Attachments Popover
  const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);

  // Preset clinical attachments that can be sent
  const HOSPITAL_FILES = [
    { name: 'BC_Truc_HanhChinh_DauMo.pdf', type: 'pdf', size: '240 KB' },
    { name: 'Bang_Cong_Kiem_Tra_BaoCao_Q2.xlsx', type: 'excel', size: '1.2 MB' },
    { name: 'Phieu_Duyet_Nhan_Su_Tang_Cuong.pdf', type: 'pdf', size: '180 KB' },
    { name: 'Anh_KhaoSat_VatTu_CapCuu.jpg', type: 'image', size: '1.5 MB' }
  ];

  // Quick clinical templates
  const CLINICAL_QUICK_TEMPLATES = [
    { text: 'Nhận chỉ đạo, phòng đã triển khai ngay!', roles: ['CHIEF_NURSE'] },
    { text: 'Khoa tôi đã rà soát quân số trực đầy đủ.', roles: ['CHIEF_NURSE'] },
    { text: 'Đã hoàn thành gửi danh sách trực, xin phê duyệt.', roles: ['CHIEF_NURSE'] },
    { text: 'Báo cáo Trưởng phòng: Khoa hiện đang quá tải.', roles: ['CHIEF_NURSE'] },
    { text: 'Đề nghị các Khoa rà soát ngay lịch trực tuần tới.', roles: ['HEAD_OF_NURSING'] },
    { text: 'Đã phê duyệt lịch trực, đề nghị thực hiện nghiêm túc.', roles: ['HEAD_OF_NURSING'] },
    { text: 'Đề nghị họp giao ban nhanh tại văn phòng lúc 11h30.', roles: ['HEAD_OF_NURSING'] },
    { text: 'Cảm ơn sự hỗ trợ kịp thời từ Phòng Điều dưỡng!', roles: ['CHIEF_NURSE', 'ADMIN'] }
  ];

  // Audio for real-time notification
  const playNotificationSound = () => {
    if (isMuted) return;
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, context.currentTime); // D5 note
      gainNode.gain.setValueAtTime(0.08, context.currentTime);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.12);
    } catch (e) {
      // Audio context might be blocked or unsupported
    }
  };

  // Load account names
  const loadAccountNames = () => {
    const cachedNames = localStorage.getItem('song_thuong_account_names_v3');
    if (cachedNames) {
      try {
        const parsed = JSON.parse(cachedNames);
        const resolved: Record<string, string> = {};
        DEFAULT_ACCOUNT_IDS.forEach(id => {
          resolved[id] = parsed[id] || FALLBACK_ACCOUNT_LABELS[id];
        });
        setAccountNames(resolved);
      } catch (e) {
        setAccountNames(FALLBACK_ACCOUNT_LABELS);
      }
    } else {
      setAccountNames(FALLBACK_ACCOUNT_LABELS);
    }
  };

  // Set up refs to ignore sound on first loading
  const initialDirectivesLoaded = useRef(false);
  const initialChatLoaded = useRef(false);

  useEffect(() => {
    loadAccountNames();

    const unsubDirectives = subscribeToDirectives((dirs) => {
      setDirectives(dirs);
      if (initialDirectivesLoaded.current) {
        playNotificationSound();
      } else {
        initialDirectivesLoaded.current = true;
      }
    });

    const unsubChat = subscribeToChat((messages) => {
      setChatMessages(messages);
      if (initialChatLoaded.current) {
        playNotificationSound();
      } else {
        initialChatLoaded.current = true;
      }
    });

    const unsubStatuses = subscribeToMemberStatuses((statuses) => {
      setMemberStatuses(statuses);
      if (statuses[currentUser.username]) {
        setMyStatus(statuses[currentUser.username]);
      }
    });

    return () => {
      unsubDirectives();
      unsubChat();
      unsubStatuses();
    };
  }, [isMuted, currentUser.username]);

  // Run automatic cleanup of chat messages older than 7 days upon load
  useEffect(() => {
    autoCleanupOldChatMessages(7)
      .then(count => {
        if (count > 0) {
          console.log(`[Dọn dẹp tự động]: Đã tự động dọn dẹp ${count} tin nhắn cũ hơn 7 ngày từ cơ sở dữ liệu.`);
        }
      })
      .catch(err => console.error("Lỗi khi dọn dẹp tin nhắn cũ:", err));
  }, []);

  // Scroll to bottom of chat when room or message count changes
  useEffect(() => {
    if (activeCommTab === 'CHAT' && chatContainerRef.current) {
      // Direct scroll of the chat div container to prevent full-page/viewport jumping or auto-scrolling
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, activeRoom, activeCommTab]);

  // Handle changing user's own status
  const handleMyStatusChange = (status: string) => {
    setMyStatus(status);
    updateMemberStatusInFirestore(currentUser.username, status).catch(err => console.error("Error updating member status in Firestore:", err));
  };

  // Handle adding a directive or asking for advice
  const handleAddDirectiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directiveTitle.trim() || !directiveContent.trim()) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung.');
      return;
    }

    const isOpinion = currentUser.role === 'CHIEF_NURSE';

    const newDirective: Directive = {
      id: `dir-${Date.now()}`,
      title: directiveTitle.trim(),
      content: directiveContent.trim(),
      senderName: currentUser.fullName,
      senderUsername: currentUser.username,
      recipient: isOpinion ? 'ALL' : directiveRecipient,
      priority: directivePriority,
      timestamp: new Date().toISOString(),
      isOpinionRequest: isOpinion,
      replies: []
    };

    addDirectiveToFirestore(newDirective).catch(err => console.error("Error adding directive to Firestore:", err));

    // Also trigger a system notification in Firestore so others get alert
    const newNotif = {
      id: `notif-${Date.now()}`,
      type: isOpinion ? ('PENDING' as const) : ('CHANGE' as const),
      title: isOpinion ? 'Yêu cầu ý kiến chỉ đạo mới' : 'Chỉ đạo từ Phòng Điều dưỡng',
      message: `${currentUser.fullName}: "${directiveTitle.trim().substring(0, 45)}..."`,
      timestamp: new Date().toISOString(),
      isRead: false,
      targetRole: isOpinion ? ('HEAD_OF_NURSING' as const) : ('CHIEF_NURSE' as const),
      targetDepartment: isOpinion ? currentUser.department : undefined
    };
    addNotificationToFirestore(newNotif).catch(err => console.error("Error creating notification in Firestore:", err));

    // Reset Form
    setDirectiveTitle('');
    setDirectiveContent('');
    setDirectivePriority('NORMAL');
    setShowAddDirectiveForm(false);
  };

  // Handle sending a reply in directive thread
  const handleSendDirectiveReply = (directiveId: string) => {
    const replyText = directiveReplyTexts[directiveId] || '';
    if (!replyText.trim()) return;

    const newReply: DirectiveReply = {
      id: `reply-${Date.now()}`,
      senderName: currentUser.fullName,
      senderUsername: currentUser.username,
      content: replyText.trim(),
      timestamp: new Date().toISOString()
    };

    addDirectiveReplyToFirestore(directiveId, newReply).catch(err => console.error("Error adding directive reply in Firestore:", err));
    setDirectiveReplyTexts(prev => ({ ...prev, [directiveId]: '' }));
  };

  // Handle sending a chat message (text or attachment)
  const handleSendChatMessage = (e?: React.FormEvent, attachmentObj?: { name: string; type: 'pdf' | 'excel' | 'image' | 'word' | 'any'; size: string; dataUrl?: string }) => {
    if (e) e.preventDefault();
    
    const finalAttachment = attachmentObj || pendingAttachment;
    if (!typedMessage.trim() && !finalAttachment) return;

    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      senderUsername: currentUser.username,
      senderName: currentUser.fullName,
      senderRole: currentUser.role,
      recipientUsername: activeRoom,
      content: typedMessage.trim() || `[Đã gửi đính kèm: ${finalAttachment?.name}]`,
      timestamp: new Date().toISOString(),
      ...(finalAttachment && {
        attachment: {
          name: finalAttachment.name,
          type: finalAttachment.type,
          size: finalAttachment.size,
          dataUrl: finalAttachment.dataUrl
        }
      })
    };

    addChatMessageToFirestore(newMsg).catch(err => console.error("Error saving chat message to Firestore:", err));
    setTypedMessage('');
    setPendingAttachment(null);
    setShowAttachmentDropdown(false);
  };

  // Handle uploading actual files from user's device
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;

      // Determine file category
      let type: 'pdf' | 'excel' | 'image' | 'word' | 'any' = 'any';
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') type = 'pdf';
      else if (['xlsx', 'xls', 'csv'].includes(ext || '')) type = 'excel';
      else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '')) type = 'image';
      else if (['doc', 'docx'].includes(ext || '')) type = 'word';

      // Human-readable size
      let sizeStr = `${(file.size / 1024).toFixed(0)} KB`;
      if (file.size > 1024 * 1024) {
        sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      }

      setPendingAttachment({
        name: file.name,
        type,
        size: sizeStr,
        dataUrl
      });
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;

      let type: 'pdf' | 'excel' | 'image' | 'word' | 'any' = 'any';
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') type = 'pdf';
      else if (['xlsx', 'xls', 'csv'].includes(ext || '')) type = 'excel';
      else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '')) type = 'image';
      else if (['doc', 'docx'].includes(ext || '')) type = 'word';

      let sizeStr = `${(file.size / 1024).toFixed(0)} KB`;
      if (file.size > 1024 * 1024) {
        sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      }

      setPendingAttachment({
        name: file.name,
        type,
        size: sizeStr,
        dataUrl
      });
    };
    reader.readAsDataURL(file);
  };

  // Clear directive
  const handleDeleteDirective = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xóa văn bản chỉ đạo',
      message: 'Bạn có chắc chắn muốn xóa văn bản chỉ đạo này không? Thao tác này không thể hoàn tác.',
      onConfirm: () => {
        deleteDirectiveFromFirestore(id).catch(err => console.error("Error deleting directive in Firestore:", err));
        setConfirmModal(null);
      }
    });
  };

  // Filter messages for active room
  const filteredChatMessages = chatMessages.filter(msg => {
    if (activeRoom === 'all') {
      return msg.recipientUsername === 'all';
    }
    if (activeRoom === 'leadership') {
      return msg.recipientUsername === 'leadership';
    }
    // Direct message logic
    return (
      (msg.senderUsername === currentUser.username && msg.recipientUsername === activeRoom) ||
      (msg.senderUsername === activeRoom && msg.recipientUsername === currentUser.username)
    );
  });

  // Simulator helper
  const handleSimulateReply = () => {
    let simulatorUsername = '';
    let simulatorName = '';
    let simulatorRole: Role = 'CHIEF_NURSE';
    let responseText = '';
    let randomAttachment: any = undefined;

    // 20% chance the simulator sends a report file to show high-fidelity attachments
    const shouldSendAttachment = Math.random() < 0.25;

    if (activeRoom === 'all') {
      const pool = [
        { u: 'ngoai', n: 'Trương Thị Ngân', r: 'CHIEF_NURSE' as Role, text: 'Khoa Ngoại đã bố trí trực gác 100% quân số, báo cáo Trưởng phòng!' },
        { u: 'yhct', n: 'Phạm Thị Hiền', r: 'CHIEF_NURSE' as Role, text: 'Khoa Y học cổ truyền đã nhận chỉ đạo, đang thực hiện rà soát.' },
        { u: 'phongdieuduong', n: 'Nguyễn Thanh Hương', r: 'HEAD_OF_NURSING' as Role, text: 'Đề nghị các khoa cập nhật nhanh tình hình trực ngày hôm nay lên phần mềm nhé.' }
      ];
      const choice = pool.filter(p => p.u !== currentUser.username)[Math.floor(Math.random() * (pool.length - 1))];
      if (!choice) return;
      simulatorUsername = choice.u;
      simulatorName = choice.n;
      simulatorRole = choice.r;
      responseText = choice.text;
    } else if (activeRoom === 'leadership') {
      simulatorUsername = 'phongdieuduong';
      simulatorName = accountNames['phongdieuduong'] || 'Nguyễn Thanh Hương';
      simulatorRole = 'HEAD_OF_NURSING';
      responseText = 'Cảm ơn ý kiến của các đồng chí. Tôi đã phê duyệt lịch và điều động dự phòng cho tuần này.';
    } else {
      simulatorUsername = activeRoom;
      simulatorName = accountNames[activeRoom] || activeRoom;
      simulatorRole = activeRoom === 'phongdieuduong' ? 'HEAD_OF_NURSING' : (activeRoom === 'admin' ? 'ADMIN' : 'CHIEF_NURSE');

      const pool = [
        'Vâng thưa Trưởng phòng, tôi đã nhận chỉ đạo và đang triển khai nhanh tại khoa.',
        'Đã gửi bảng đề xuất sắp xếp trực dự phòng rồi nhé, bạn check giúp.',
        'Hiện tại khoa tôi đang có 2 ca cấp cứu nặng, tôi sẽ phản hồi lịch sau giao ban nhé.',
        'Chào đồng nghiệp, khoa bên bạn có thể đổi giúp mình ca trực sáng Chủ Nhật được không?',
        'Hoàn toàn nhất trí với phương án điều phối này của Phòng điều dưỡng.',
        'Ok ạ! Lát mình gửi file báo cáo qua chat riêng này luôn nhé.'
      ];
      responseText = pool[Math.floor(Math.random() * pool.length)];

      if (shouldSendAttachment) {
        randomAttachment = {
          name: `Bao_Cao_Nhan_Su_${simulatorUsername.toUpperCase()}.pdf`,
          type: 'pdf',
          size: '145 KB'
        };
        responseText = `Đã gửi báo cáo đính kèm: Bao_Cao_Nhan_Su_${simulatorUsername.toUpperCase()}.pdf`;
      }
    }

    const mockMsg: ChatMessage = {
      id: `sim-${Date.now()}`,
      senderUsername: simulatorUsername,
      senderName: simulatorName,
      senderRole: simulatorRole,
      recipientUsername: activeRoom === 'all' || activeRoom === 'leadership' ? activeRoom : currentUser.username,
      content: responseText,
      timestamp: new Date().toISOString(),
      attachment: randomAttachment
    };

    addChatMessageToFirestore(mockMsg).catch(err => console.error("Error saving simulated reply to Firestore:", err));
    
    // Also trigger alert
    const cachedNotifs = localStorage.getItem('song_thuong_notifications_v1') || '[]';
    try {
      const notifs = JSON.parse(cachedNotifs);
      notifs.unshift({
        id: `notif-${Date.now()}`,
        type: 'CHANGE',
        title: `Tin nhắn mới từ ${simulatorName}`,
        message: responseText,
        timestamp: new Date().toISOString(),
        isRead: false,
        targetRole: currentUser.role,
        targetDepartment: currentUser.department
      });
      localStorage.setItem('song_thuong_notifications_v1', JSON.stringify(notifs));
    } catch (e) {}

    window.dispatchEvent(new Event('storage'));
    playNotificationSound();
  };

  // Helper to count unread messages in other rooms
  const getUnreadIndicator = (roomKey: string) => {
    const lastMsg = chatMessages
      .filter(m => m.senderUsername === roomKey && m.recipientUsername === currentUser.username)
      .slice(-1)[0];
    if (lastMsg) {
      return (
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" title="Tin nhắn mới" />
      );
    }
    return null;
  };

  // Get recipient status details for header
  const getRecipientStatus = () => {
    if (activeRoom === 'all') return 'Phòng trò chuyện toàn viện công khai';
    return memberStatuses[activeRoom] || '🟢 Đang hoạt động';
  };

  // Filter contacts based on search query
  const filteredContactIds = DEFAULT_ACCOUNT_IDS.filter(id => {
    if (id === currentUser.username) return false; // Exclude self
    const label = accountNames[id] || FALLBACK_ACCOUNT_LABELS[id] || '';
    const dept = ACCOUNT_DEPARMENTS[id] || '';
    return (
      label.toLowerCase().includes(contactSearch.toLowerCase()) ||
      dept.toLowerCase().includes(contactSearch.toLowerCase()) ||
      id.toLowerCase().includes(contactSearch.toLowerCase())
    );
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row h-[750px]">
      
      {/* LEFT SIDEBAR PANEL */}
      <div className={`w-full md:w-80 bg-slate-50 border-r border-slate-200 flex flex-col h-full shrink-0 ${showSidebarOnMobile ? 'flex' : 'hidden md:flex'}`}>
        
        {/* Module Header with Live Indicator */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <span className="font-black text-xs uppercase tracking-wider">Hệ Thống Liên Lạc Viện</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Trực tuyến</span>
          </div>
        </div>

        {/* Tab Selection Switch */}
        <div className="grid grid-cols-2 p-2 gap-1 bg-slate-100 border-b border-slate-200">
          <button
            id="comm-tab-btn-directives"
            onClick={() => {
              setActiveCommTab('DIRECTIVES');
              setShowSidebarOnMobile(false);
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
              activeCommTab === 'DIRECTIVES'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Megaphone className="w-4 h-4 text-amber-500" />
            <span>Chỉ đạo & Đề xuất</span>
          </button>
          
          <button
            id="comm-tab-btn-chat"
            onClick={() => {
              setActiveCommTab('CHAT');
              setShowSidebarOnMobile(true);
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
              activeCommTab === 'CHAT'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-500" />
            <span>Phòng Trò Chuyện</span>
          </button>
        </div>

        {/* Dynamic Sidebar Listings */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
          {activeCommTab === 'DIRECTIVES' ? (
            <div className="p-3 text-xs text-slate-500 flex flex-col gap-3">
              <div>
                <p className="font-bold text-slate-700 mb-1 uppercase text-[9px] tracking-wider text-slate-400">
                  Văn bản & Chỉ thị chuyên môn
                </p>
                <p className="leading-relaxed text-[11px] text-slate-600">
                  Nơi ban hành các quyết định điều động công tác lâm sàng, trực tăng cường hoặc gửi phiếu lấy ý kiến nhanh từ điều dưỡng trưởng các khoa tới Phòng Điều dưỡng.
                </p>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-amber-900 text-[11px] flex flex-col gap-2 shadow-3xs">
                <span className="font-extrabold flex items-center gap-1 text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  Quy trình phối hợp:
                </span>
                <span className="font-medium">• <strong>Trưởng phòng</strong>: ban hành quyết định, chỉ đạo áp dụng toàn viện hoặc từng khoa.</span>
                <span className="font-medium">• <strong>ĐD Trưởng</strong>: báo cáo đề xuất, xin ý kiến chỉ đạo khẩn cấp.</span>
                <span className="font-medium">• Có hỗ trợ thảo luận trực tiếp dưới chân mỗi chỉ đạo giúp phản hồi tập trung.</span>
              </div>
            </div>
          ) : (
            /* CHAT TAB CONTACT LIST */
            <div className="flex flex-col gap-2">
              
              {/* CONTACT SEARCH BAR */}
              <div className="relative mx-1 my-1">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm thành viên, khoa phòng..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
                {contactSearch && (
                  <button 
                    onClick={() => setContactSearch('')}
                    className="absolute right-2.5 top-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                  >
                    X
                  </button>
                )}
              </div>

              {/* SECTION 1: CHAT CHUNG TOÀN VIỆN */}
              <div className="flex flex-col gap-1">
                <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider px-2 py-1">Phòng trò chuyện nhóm</span>
                
                <button
                  onClick={() => {
                    setActiveRoom('all');
                    setShowSidebarOnMobile(false);
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all text-xs text-left ${
                    activeRoom === 'all'
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'bg-white border border-slate-150 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="font-bold">💬 Kênh trò chuyện chung</span>
                      <span className={`text-[9px] ${activeRoom === 'all' ? 'text-emerald-200' : 'text-slate-400'}`}>Tất cả Điều dưỡng viên</span>
                    </div>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0 ${activeRoom === 'all' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                    Public
                  </span>
                </button>
              </div>

              {/* SECTION 2: LÃNH ĐẠO PHÒNG ĐIỀU DƯỠNG */}
              {currentUser.username !== 'phongdieuduong' && filteredContactIds.includes('phongdieuduong') && (
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[9.5px] font-extrabold text-blue-500 uppercase tracking-wider px-2 py-0.5">Lãnh đạo Phòng Điều dưỡng</span>
                  {(() => {
                    const id = 'phongdieuduong';
                    const isActive = activeRoom === id;
                    const status = memberStatuses[id] || '🟢 Đang trực ban';
                    return (
                      <button
                        onClick={() => {
                          setActiveRoom(id);
                          setShowSidebarOnMobile(false);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all text-xs text-left ${
                          isActive
                            ? 'bg-slate-900 text-white font-bold shadow-xs border border-slate-800'
                            : 'bg-white border border-slate-150 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-extrabold flex items-center justify-center text-xs border border-blue-200 shrink-0 shadow-3xs">
                            H
                          </div>
                          <div className="flex flex-col truncate">
                            <span className="font-bold">
                              {accountNames['phongdieuduong']?.split('(')[0].trim() || 'Nguyễn Thanh Hương'}
                            </span>
                            <span className={`text-[9px] font-mono truncate ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                              {status}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {getUnreadIndicator(id)}
                          <span className="text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-1 py-0.5 rounded">TP.ĐD</span>
                        </div>
                      </button>
                    );
                  })()}
                </div>
              )}

              {/* SECTION 3: CÁC ĐIỀU DƯỠNG TRƯỞNG KHOA KHÁC */}
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-[9.5px] font-extrabold text-emerald-600 uppercase tracking-wider px-2 py-0.5">Trò chuyện riêng với Điều dưỡng Trưởng</span>
                {filteredContactIds
                  .filter(id => id !== 'phongdieuduong' && id !== 'admin')
                  .map(id => {
                    const label = accountNames[id] || FALLBACK_ACCOUNT_LABELS[id] || id;
                    const cleanName = label.split('(')[0].trim();
                    const isActive = activeRoom === id;
                    const status = memberStatuses[id] || '🟢 Đang trực ban';
                    const isUrgentStatus = status.includes('🔴') || status.includes('Trong phòng mổ');
                    
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          setActiveRoom(id);
                          setShowSidebarOnMobile(false);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all text-xs text-left ${
                          isActive
                            ? 'bg-slate-800 text-white font-bold shadow-xs'
                            : 'bg-white border border-slate-150 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className={`w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs shrink-0 shadow-3xs ${
                            isActive ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {cleanName.charAt(0)}
                          </div>
                          <div className="flex flex-col truncate">
                            <span className="font-bold truncate">{cleanName}</span>
                            <span className={`text-[9px] truncate ${
                              isActive ? 'text-slate-300' : (isUrgentStatus ? 'text-rose-500 font-bold' : 'text-slate-400')
                            }`}>
                              {status}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {getUnreadIndicator(id)}
                          <span className="text-[9px] font-mono font-medium text-slate-400">@{id}</span>
                        </div>
                      </button>
                    );
                  })}
              </div>

              {/* SECTION 4: HỆ THỐNG / ADMIN */}
              {currentUser.username !== 'admin' && filteredContactIds.includes('admin') && (
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider px-2 py-0.5">Quản trị viên</span>
                  {(() => {
                    const id = 'admin';
                    const isActive = activeRoom === id;
                    return (
                      <button
                        onClick={() => {
                          setActiveRoom(id);
                          setShowSidebarOnMobile(false);
                        }}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all text-xs text-left ${
                          isActive
                            ? 'bg-slate-800 text-white font-bold'
                            : 'bg-white border border-slate-150 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-extrabold flex items-center justify-center text-xs shrink-0">
                            A
                          </div>
                          <span className="font-bold truncate">Quản trị viên Hệ thống</span>
                        </div>
                        <span className="text-[9px] text-slate-400">@admin</span>
                      </button>
                    );
                  })()}
                </div>
              )}

              {filteredContactIds.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-[11px]">
                  Không tìm thấy thành viên phù hợp.
                </div>
              )}

            </div>
          )}
        </div>
        
        {/* LOGGED IN ACCOUNT CARD WITH STATUS CHANGER */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 text-[11px] text-slate-600 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0" />
              <div className="flex flex-col truncate">
                <span className="font-bold text-slate-700 truncate">{currentUser.fullName}</span>
                <span className="text-[9.5px] font-mono text-slate-400">Tài khoản: @{currentUser.username}</span>
              </div>
            </div>
            
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors cursor-pointer border border-transparent hover:border-slate-200 bg-white"
              title={isMuted ? "Bật âm báo tin nhắn" : "Tắt âm báo"}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Clinical Status Dropdown selector */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-3xs">
            <span className="text-[9.5px] font-bold text-slate-500 shrink-0 uppercase">Trạng thái:</span>
            <select
              value={myStatus}
              onChange={(e) => handleMyStatusChange(e.target.value)}
              className="flex-1 bg-transparent text-xs text-slate-700 font-semibold focus:outline-hidden cursor-pointer"
            >
              {CLINICAL_STATUSES.map((st, i) => (
                <option key={i} value={st.label}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* RIGHT DISPLAY PANEL - DETAIL STREAM */}
      <div className={`flex-1 min-w-0 flex flex-col bg-white h-full ${!showSidebarOnMobile ? 'flex' : 'hidden md:flex'}`}>
        
        {activeCommTab === 'DIRECTIVES' ? (
          /* ==================== DIRECTIVES TAB PANEL ==================== */
          <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
            
            {/* Header of Directives */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowSidebarOnMobile(true)}
                  className="md:hidden flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-bold shadow-3xs transition-colors shrink-0"
                >
                  ← Menu
                </button>
                <div>
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                    <Megaphone className="w-4 h-4 text-amber-500 shrink-0" />
                    Bảng Chỉ Đạo & Đề Xuất Chuyên Môn
                  </h3>
                  <p className="text-[10.5px] text-slate-500">
                    Cập nhật quyết định điều phối khẩn cấp, bàn giao ca hoặc đề xuất ý kiến nhanh toàn viện.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddDirectiveForm(!showAddDirectiveForm)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs self-start"
              >
                <Plus className="w-4 h-4" />
                <span>{currentUser.role === 'CHIEF_NURSE' ? 'Gửi đề xuất / Xin ý kiến' : 'Ban hành chỉ đạo mới'}</span>
              </button>
            </div>

            {/* Directive stream list */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              
              {/* Form to add directive / opinion */}
              {showAddDirectiveForm && (
                <form 
                  onSubmit={handleAddDirectiveSubmit}
                  className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 flex flex-col gap-3 animate-fadeIn shadow-2xs"
                >
                  <div className="flex items-center justify-between border-b border-amber-200/50 pb-2">
                    <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      {currentUser.role === 'CHIEF_NURSE' ? 'PHIẾU GỬI Ý KIẾN CHỈ ĐẠO LÊN TRƯỞNG PHÒNG' : 'THÔNG BÁO BAN HÀNH CHỈ THỊ CHUYÊN MÔN MỚI'}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setShowAddDirectiveForm(false)} 
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      Hủy bỏ
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Tiêu đề văn bản</label>
                    <input
                      type="text"
                      placeholder={currentUser.role === 'CHIEF_NURSE' ? "Ví dụ: Đề xuất xin bổ sung nhân lực trực đêm do khoa quá tải..." : "Ví dụ: Tăng cường giám sát quy trình bàn giao điều dưỡng đầu ca..."}
                      value={directiveTitle}
                      onChange={(e) => setDirectiveTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Mức độ khẩn cấp</label>
                      <select
                        value={directivePriority}
                        onChange={(e) => setDirectivePriority(e.target.value as any)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-hidden cursor-pointer font-medium"
                      >
                        <option value="NORMAL">Thường quy (Không khẩn)</option>
                        <option value="URGENT">⚠️ KHẨN CẤP (Ưu tiên giải quyết nhanh)</option>
                      </select>
                    </div>

                    {currentUser.role !== 'CHIEF_NURSE' && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Phạm vi áp dụng</label>
                        <select
                          value={directiveRecipient}
                          onChange={(e) => setDirectiveRecipient(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-hidden cursor-pointer"
                        >
                          <option value="ALL">Tất cả các Khoa/Phòng toàn viện</option>
                          <option value="Nội - Nhi">Khoa Nội - Nhi</option>
                          <option value="Ngoại">Khoa Ngoại</option>
                          <option value="Y học cổ truyền">Khoa Y học cổ truyền</option>
                          <option value="Liên chuyên khoa">Khoa Liên chuyên khoa</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nội dung chi tiết</label>
                    <textarea
                      rows={3}
                      placeholder="Mô tả chi tiết nội dung chỉ đạo hoặc vấn đề cần xin ý kiến phối hợp chuyên môn..."
                      value={directiveContent}
                      onChange={(e) => setDirectiveContent(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 rounded-lg transition-all shadow-xs"
                  >
                    {currentUser.role === 'CHIEF_NURSE' ? '🚀 Gửi ý kiến chỉ đạo tới Trưởng phòng' : '📣 Ban hành & Phát thông báo toàn viện'}
                  </button>
                </form>
              )}

              {directives.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Không có chỉ đạo hay đề xuất nào tại hệ thống.
                </div>
              ) : (
                directives.map(dir => {
                  const isUrgent = dir.priority === 'URGENT';
                  const isOpinion = dir.isOpinionRequest;
                  return (
                    <div 
                      key={dir.id}
                      className={`border rounded-xl p-4 shadow-3xs hover:shadow-2xs transition-shadow flex flex-col gap-3 ${
                        isUrgent 
                          ? 'border-rose-200 bg-rose-50/10' 
                          : (isOpinion ? 'border-indigo-150 bg-indigo-50/10' : 'border-slate-200 bg-white')
                      }`}
                    >
                      {/* Badge and Sender Info */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isUrgent ? (
                            <span className="bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded text-[9.5px] font-extrabold flex items-center gap-1 animate-pulse">
                              <AlertCircle className="w-3 h-3" />
                              CHỈ ĐẠO KHẨN CẤP
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-800 border border-slate-300 px-2 py-0.5 rounded text-[9.5px] font-extrabold">
                              THÔNG BÁO THƯỜNG QUY
                            </span>
                          )}

                          {isOpinion && (
                            <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 px-2 py-0.5 rounded text-[9.5px] font-extrabold flex items-center gap-1">
                              <HelpCircle className="w-3 h-3" />
                              XIN Ý KIẾN CHỈ ĐẠO
                            </span>
                          )}

                          <span className="text-[10.5px] text-slate-500">
                            • Tác giả: <strong className="text-slate-800">{dir.senderName}</strong> (@{dir.senderUsername})
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(dir.timestamp).toLocaleTimeString('vi-VN')} {new Date(dir.timestamp).toLocaleDateString('vi-VN')}</span>
                          
                          {/* Admin or the creator can delete */}
                          {(currentUser.role === 'ADMIN' || currentUser.username === dir.senderUsername) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDirective(dir.id)}
                              className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors"
                              title="Xóa chỉ đạo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Directive Details */}
                      <div>
                        <h4 className="text-xs font-black text-slate-900 leading-tight mb-1">
                          {dir.title}
                        </h4>
                        <p className="text-[11.5px] text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">
                          {dir.content}
                        </p>
                      </div>

                      {/* Display Recipient Target */}
                      <div className="text-[9.5px] text-slate-400 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md self-start border border-slate-150">
                        <span>Được gửi tới:</span>
                        <strong className="text-slate-600">
                          {dir.recipient === 'ALL' ? 'Toàn bộ Khoa / Phòng Hệ thống' : `Khoa ${dir.recipient}`}
                        </strong>
                      </div>

                      {/* Replies List */}
                      <div className="bg-slate-50/70 border border-slate-150 rounded-lg p-3 flex flex-col gap-2.5">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                          Luồng ý kiến & Phản hồi phối hợp ({dir.replies.length})
                        </span>

                        {dir.replies.map(reply => (
                          <div key={reply.id} className="text-xs bg-white border border-slate-100 p-2 rounded-md shadow-3xs flex flex-col gap-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>
                                <strong className="text-slate-700">{reply.senderName}</strong> (@{reply.senderUsername})
                              </span>
                              <span>
                                {new Date(reply.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              {reply.content}
                            </p>
                          </div>
                        ))}

                        {/* Add Reply Input */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="text"
                            placeholder="Nhập ý kiến thảo luận hoặc cập nhật phản hồi kết quả tại đây..."
                            value={directiveReplyTexts[dir.id] || ''}
                            onChange={(e) => setDirectiveReplyTexts(prev => ({ ...prev, [dir.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSendDirectiveReply(dir.id);
                            }}
                            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] bg-white text-slate-800 focus:outline-hidden"
                          />
                          <button
                            onClick={() => handleSendDirectiveReply(dir.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-3xs shrink-0"
                          >
                            Gửi phản hồi
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}

            </div>
          </div>
        ) : (
          /* ==================== PERFECTED CHAT ROOM PANEL ==================== */
          <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
            
            {/* Header of Active Chat Room with Detailed Meta */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
              <div className="overflow-hidden flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowSidebarOnMobile(true)}
                  className="md:hidden flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-bold shadow-3xs transition-colors shrink-0"
                >
                  ← Danh bạ
                </button>
                {/* Visual indicator corresponding to active room type */}
                <div className={`p-2 rounded-xl shrink-0 ${
                  activeRoom === 'all' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-slate-100 text-slate-800'
                }`}>
                  {activeRoom === 'all' ? (
                    <Users className="w-5 h-5" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>

                <div className="overflow-hidden">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <span className="truncate">
                      {activeRoom === 'all' 
                        ? 'Kênh trò chuyện chung' 
                        : `Trò chuyện riêng: ${accountNames[activeRoom]?.split('(')[0].trim() || activeRoom}`}
                    </span>
                  </h3>
                  
                  {/* Status subtitle */}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                    {activeRoom !== 'all' && (
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    )}
                    <span className="truncate font-semibold text-slate-600">{getRecipientStatus()}</span>
                    {activeRoom !== 'all' && (
                      <span className="text-slate-400">• Khoa/Phòng: {ACCOUNT_DEPARMENTS[activeRoom] || 'Lâm sàng'}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Clear Chat History button - Only displayed for ADMIN */}
                {currentUser.role === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Xóa toàn bộ lịch sử trò chuyện',
                        message: 'Bạn có chắc chắn muốn xóa TOÀN BỘ lịch sử trò chuyện của kênh này không? Thao tác này không thể hoàn tác.',
                        onConfirm: () => {
                          clearChatHistoryFromFirestore(activeRoom, currentUser.username)
                            .then(() => {
                              // Clean local storage backup too
                              localStorage.removeItem('song_thuong_chat_messages_v1');
                            })
                            .catch(err => console.error("Error clearing chat history in Firestore:", err));
                          setConfirmModal(null);
                        }
                      });
                    }}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-[10px] px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-3xs cursor-pointer"
                    title="Xóa toàn bộ lịch sử trò chuyện của phòng này"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Xóa lịch sử</span>
                  </button>
                )}

                {/* Simulation panel of real-time reply */}
                <button
                  type="button"
                  onClick={handleSimulateReply}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-extrabold text-[10px] px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-3xs shrink-0 cursor-pointer"
                  title="Mô phỏng tài khoản đối diện trả lời tự động để rà soát thời gian thực"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-bounce" />
                  <span>Simulate Reply</span>
                </button>
              </div>
            </div>

            {/* Chat message stream container */}
            <div 
              ref={chatContainerRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 relative transition-all duration-200 ${
                isDragging ? 'bg-emerald-50/50 border-2 border-dashed border-emerald-400' : 'bg-slate-50/40'
              }`}
            >
              {isDragging && (
                <div className="absolute inset-0 bg-emerald-50/95 z-20 flex flex-col items-center justify-center gap-2 text-emerald-800 pointer-events-none animate-fadeIn">
                  <div className="p-4 bg-emerald-100 rounded-full border border-emerald-300">
                    <Upload className="w-10 h-10 text-emerald-700 animate-bounce" />
                  </div>
                  <span className="font-extrabold text-sm uppercase tracking-wide">Thả tệp vào đây để tải lên</span>
                  <span className="text-[11px] font-semibold text-emerald-600">Hỗ trợ ảnh, PDF, Excel, Word và các định dạng tài liệu khác</span>
                </div>
              )}
              
              {/* Notification banner about secure chat */}
              <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200 text-[10.5px] text-slate-600 leading-relaxed flex items-center gap-2 max-w-xl mx-auto self-center text-center">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Các cuộc hội thoại được bảo mật hai chiều trên máy chủ lưu trữ. <strong>Hệ thống tự động xóa tin nhắn cũ hơn 7 ngày để dọn dẹp và tối ưu bộ nhớ.</strong>
                </span>
              </div>

              {filteredChatMessages.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                  <div className="p-3 bg-slate-100 rounded-full text-slate-300">
                    <MessageCircle className="w-10 h-10" />
                  </div>
                  <span className="font-bold text-slate-500 text-xs">Chưa có cuộc thảo luận nào được ghi nhận tại phòng chat này</span>
                  <span className="text-[10px] text-slate-400">Hãy nhập tin nhắn hoặc gửi văn bản/báo cáo nhanh bằng thanh công cụ bên dưới!</span>
                </div>
              ) : (
                filteredChatMessages.map(msg => {
                  const isMe = msg.senderUsername === currentUser.username;
                  const senderDept = ACCOUNT_DEPARMENTS[msg.senderUsername] || '';
                  
                  return (
                    <div 
                      key={msg.id}
                      className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                    >
                      {/* Name & Role badge of Sender */}
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold mb-0.5 px-1">
                        <span className={isMe ? 'text-slate-600' : 'text-slate-700'}>
                          {isMe ? 'Tôi' : msg.senderName} 
                        </span>
                        {senderDept && (
                          <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 rounded px-1 font-semibold">
                            {senderDept}
                          </span>
                        )}
                        <span className="text-[8.5px] font-mono text-slate-300 font-normal">(@{msg.senderUsername})</span>
                      </div>

                      {/* Message Bubble */}
                      <div 
                        className={`p-3 rounded-2xl text-xs leading-relaxed break-words shadow-3xs flex flex-col gap-1.5 ${
                          isMe 
                            ? 'bg-slate-900 text-white rounded-br-none' 
                            : 'bg-white border border-slate-150 text-slate-800 rounded-bl-none'
                        }`}
                      >
                        <p className="font-semibold">{msg.content}</p>

                        {/* HIGH-FIDELITY MEDICAL ATTACHMENT */}
                        {msg.attachment && (
                          <div className={`p-2 rounded-xl border flex flex-col gap-2 ${
                            isMe ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                          }`}>
                            {msg.attachment.type === 'image' && msg.attachment.dataUrl && (
                              <div className="overflow-hidden rounded-lg max-h-48 border border-slate-200/50 bg-white">
                                <img 
                                  src={msg.attachment.dataUrl} 
                                  alt={msg.attachment.name} 
                                  className="w-full h-auto object-contain cursor-pointer hover:scale-[1.02] transition-transform max-w-full" 
                                  onClick={() => {
                                    setPreviewFile({
                                      name: msg.attachment!.name,
                                      type: msg.attachment!.type,
                                      size: msg.attachment!.size,
                                      dataUrl: msg.attachment!.dataUrl,
                                      senderName: msg.senderName,
                                      timestamp: msg.timestamp
                                    });
                                  }}
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              {/* Clickable icon & info to trigger preview */}
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewFile({
                                    name: msg.attachment!.name,
                                    type: msg.attachment!.type,
                                    size: msg.attachment!.size,
                                    dataUrl: msg.attachment!.dataUrl,
                                    senderName: msg.senderName,
                                    timestamp: msg.timestamp
                                  });
                                }}
                                className="flex-1 flex items-center gap-3 min-w-0 text-left hover:opacity-85 transition-opacity cursor-pointer"
                                title="Xem trước tài liệu"
                              >
                                <div className={`p-2 rounded-lg shrink-0 ${isMe ? 'bg-slate-700 text-emerald-400' : 'bg-emerald-100 text-emerald-800'}`}>
                                  {msg.attachment.type === 'pdf' ? (
                                    <FileText className="w-5 h-5" />
                                  ) : msg.attachment.type === 'excel' ? (
                                    <FileSpreadsheet className="w-5 h-5" />
                                  ) : msg.attachment.type === 'word' ? (
                                    <FileText className="w-5 h-5 text-blue-500" />
                                  ) : msg.attachment.type === 'image' ? (
                                    <ImageIcon className="w-5 h-5" />
                                  ) : (
                                    <File className="w-5 h-5" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-black text-[10.5px] truncate flex items-center gap-1.5 ${isMe ? 'text-white' : 'text-slate-800'}`}>
                                    <span className="truncate">{msg.attachment.name}</span>
                                    <span className="text-[8px] bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200/50 rounded-sm px-1 font-bold">Xem</span>
                                  </p>
                                  <p className={`text-[9.5px] font-mono ${isMe ? 'text-slate-400' : 'text-slate-400'}`}>
                                    {msg.attachment.size} • Đã quét mã độc an toàn
                                  </p>
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (msg.attachment?.dataUrl) {
                                    const link = document.createElement('a');
                                    link.href = msg.attachment.dataUrl;
                                    link.download = msg.attachment.name;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  } else {
                                    alert(`Mô phỏng: Đang tải tệp tin an toàn: ${msg.attachment?.name}`);
                                  }
                                }}
                                className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 cursor-pointer shadow-3xs flex items-center justify-center shrink-0"
                                title="Tải tệp tin về máy"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Existing Reactions */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 px-1">
                          {Object.entries(msg.reactions).map(([emoji, rawUsers]) => {
                            const users = rawUsers as string[];
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => addChatMessageReactionToFirestore(msg.id, currentUser.username, emoji)}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold border transition-all cursor-pointer ${
                                  users.includes(currentUser.username)
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-3xs'
                                    : 'bg-white text-slate-600 border-slate-200'
                                }`}
                                title={`Đã thả bởi: ${users.join(', ')}`}
                              >
                                <span>{emoji}</span>
                                <span>{users.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Timestamp and Rapid Reactions Row */}
                      <div className={`flex items-center gap-1.5 mt-0.5 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-[9px] text-slate-400">
                          {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        {(isMe || currentUser.role === 'ADMIN') && (
                          <>
                            <span className="text-slate-200">•</span>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: 'Xóa tin nhắn',
                                  message: 'Bạn có chắc chắn muốn xóa tin nhắn này không? Thao tác này không thể hoàn tác.',
                                  onConfirm: () => {
                                    deleteChatMessageFromFirestore(msg.id).catch(err => console.error("Error deleting chat message in Firestore:", err));
                                    setConfirmModal(null);
                                  }
                                });
                              }}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer flex items-center justify-center"
                              title="Xóa tin nhắn"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </>
                        )}
                        <span className="text-slate-250">•</span>
                        <div className="flex items-center gap-1 bg-slate-50/80 px-1 py-0.5 rounded-md border border-slate-100 shadow-4xs">
                          {['👍', '❤️', '👏', '⚠️'].map(emoji => {
                            const users = msg.reactions?.[emoji] || [];
                            const hasMyReaction = users.includes(currentUser.username);
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => addChatMessageReactionToFirestore(msg.id, currentUser.username, emoji)}
                                className={`text-[10px] p-0.5 rounded-md hover:bg-slate-200 transition-colors cursor-pointer ${
                                  hasMyReaction ? 'bg-emerald-100 scale-110' : 'opacity-40 hover:opacity-100'
                                }`}
                                title={emoji === '👍' ? 'Đồng ý' : emoji === '❤️' ? 'Yêu thích' : emoji === '👏' ? 'Hoan hô' : 'Lưu ý khẩn'}
                              >
                                {emoji}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* QUICK PRESET MESSAGES BAR FOR HIGH EFFICIENCY */}
            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
              <span className="text-[9px] font-bold text-slate-400 shrink-0 uppercase tracking-wide">Mẫu trả lời nhanh:</span>
              {CLINICAL_QUICK_TEMPLATES
                .filter(t => !t.roles || t.roles.includes(currentUser.role))
                .map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTypedMessage(tmpl.text)}
                    className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors shadow-4xs shrink-0"
                  >
                    {tmpl.text}
                  </button>
                ))}
            </div>

            {/* Chat Message Input Form with Attachments Support */}
            <form 
              onSubmit={(e) => handleSendChatMessage(e)}
              className="p-3 bg-white border-t border-slate-200 flex flex-col gap-2 relative"
            >
              {/* GORGEOUS DRAFT PENDING FILE PREVIEW */}
              {pendingAttachment && (
                <div className="flex items-center justify-between gap-3 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl animate-fadeIn max-w-md">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-10 h-10 rounded-lg bg-white border border-emerald-100 flex items-center justify-center shrink-0 overflow-hidden shadow-3xs">
                      {pendingAttachment.type === 'image' && pendingAttachment.dataUrl ? (
                        <img 
                          src={pendingAttachment.dataUrl} 
                          alt={pendingAttachment.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : pendingAttachment.type === 'pdf' ? (
                        <FileText className="w-5 h-5 text-rose-500" />
                      ) : pendingAttachment.type === 'excel' ? (
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                      ) : pendingAttachment.type === 'word' ? (
                        <FileText className="w-5 h-5 text-blue-500" />
                      ) : (
                        <File className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-slate-800 truncate" title={pendingAttachment.name}>
                        {pendingAttachment.name}
                      </p>
                      <p className="text-[9px] font-mono text-emerald-700 font-semibold">
                        {pendingAttachment.size} • Sẵn sàng gửi an toàn
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Preview download */}
                    {pendingAttachment.dataUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = pendingAttachment.dataUrl!;
                          link.download = pendingAttachment.name;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                        title="Tải tệp đang soạn thảo về máy"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Clear attachment */}
                    <button
                      type="button"
                      onClick={() => setPendingAttachment(null)}
                      className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-500 transition-colors cursor-pointer"
                      title="Hủy đính kèm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                
                {/* Simulated Attachment Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAttachmentDropdown(!showAttachmentDropdown)}
                    className={`p-2.5 rounded-xl transition-all border shrink-0 cursor-pointer ${
                      showAttachmentDropdown 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200'
                    }`}
                    title="Đính kèm tài liệu nghiệp vụ"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
 
                  {/* Hidden actual file input */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
 
                  {/* Attachment dropdown menu */}
                  {showAttachmentDropdown && (
                    <div className="absolute bottom-12 left-0 w-72 bg-white border border-slate-200 rounded-2xl shadow-lg p-3 z-30 flex flex-col gap-2 animate-fadeIn">
                      <p className="font-extrabold text-[10.5px] text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        Đính kèm văn bản nghiệp vụ
                      </p>
 
                      {/* Real File Upload Option */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2.5 p-2 rounded-xl text-left bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-200/60"
                      >
                        <div className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-[11px]">Tải lên tệp thực tế...</p>
                          <span className="text-[9px] text-emerald-600/80">Chọn từ máy tính/điện thoại</span>
                        </div>
                      </button>
 
                      <div className="h-px bg-slate-100 my-0.5" />
 
                      <p className="font-extrabold text-[9px] text-slate-400 uppercase tracking-wider px-1">
                        Hoặc chọn nhanh tệp mẫu:
                      </p>
 
                      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                        {HOSPITAL_FILES.map((f, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setPendingAttachment({
                                name: f.name,
                                type: f.type as any,
                                size: f.size,
                                dataUrl: undefined
                              });
                              setShowAttachmentDropdown(false);
                            }}
                            className="flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100"
                          >
                            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
                              {f.type === 'pdf' ? (
                                <FileText className="w-4 h-4" />
                              ) : f.type === 'excel' ? (
                                <FileSpreadsheet className="w-4 h-4" />
                              ) : (
                                <ImageIcon className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[10.5px] text-slate-700 truncate">{f.name}</p>
                              <span className="text-[9px] font-mono text-slate-400">{f.size}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="text-[8.5px] text-slate-400 bg-slate-50 p-1.5 rounded-lg text-center font-medium">
                        Chọn tệp thực tế hoặc tệp mẫu để chuẩn bị gửi kèm tin nhắn.
                      </div>
                    </div>
                  )}
                </div>
 
                {/* Primary input box */}
                <input
                  type="text"
                  placeholder={`Nhập tin nhắn gửi tới ${
                    activeRoom === 'all' 
                      ? 'Mọi người (Công khai)' 
                      : (activeRoom === 'leadership' ? 'Ban lãnh đạo & ĐD Trưởng' : `@${activeRoom}`)
                  }...`}
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-bold placeholder-slate-400 shadow-4xs"
                />
 
                {/* Submit button */}
                <button
                  type="submit"
                  disabled={!typedMessage.trim() && !pendingAttachment}
                  className={`p-2.5 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer ${
                    typedMessage.trim() || pendingAttachment
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105 active:scale-95' 
                      : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                  }`}
                  title="Gửi tin nhắn"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>

          </div>
        )}

      </div>

      {/* GORGEOUS INLINE FILE PREVIEW LIGHTBOX MODAL */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-fadeIn">
          <div className="relative bg-white border border-slate-200 w-full max-w-4xl h-full max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-scaleIn">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-xl shrink-0 ${
                  previewFile.type === 'pdf' ? 'bg-red-50 text-red-700' :
                  previewFile.type === 'excel' ? 'bg-emerald-50 text-emerald-700' :
                  previewFile.type === 'word' ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-700'
                }`}>
                  {previewFile.type === 'pdf' ? (
                    <FileText className="w-5 h-5" />
                  ) : previewFile.type === 'excel' ? (
                    <FileSpreadsheet className="w-5 h-5" />
                  ) : previewFile.type === 'word' ? (
                    <FileText className="w-5 h-5 text-blue-500" />
                  ) : previewFile.type === 'image' ? (
                    <ImageIcon className="w-5 h-5" />
                  ) : (
                    <File className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-xs md:text-sm text-slate-950 truncate" title={previewFile.name}>
                    {previewFile.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span className="font-mono">{previewFile.size}</span>
                    <span>•</span>
                    <span>Tải lên bởi: <strong>{previewFile.senderName || 'Hệ thống'}</strong></span>
                    {previewFile.timestamp && (
                      <>
                        <span>•</span>
                        <span>{new Date(previewFile.timestamp).toLocaleTimeString('vi-VN')} {new Date(previewFile.timestamp).toLocaleDateString('vi-VN')}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {previewFile.dataUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = previewFile.dataUrl!;
                      link.download = previewFile.name;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 cursor-pointer transition-colors shadow-3xs flex items-center gap-1 text-[11px] font-bold"
                    title="Tải tệp tin về máy"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Tải về</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => alert(`Mô phỏng: Đang tải tệp tin an toàn: ${previewFile.name}`)}
                    className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 cursor-pointer transition-colors shadow-3xs flex items-center gap-1 text-[11px] font-bold"
                    title="Tải tệp tin về máy"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Tải về</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer border border-slate-200/50 transition-colors shadow-3xs flex items-center justify-center shrink-0"
                  title="Đóng cửa sổ"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100/50 flex flex-col">
              {/* IMAGE PREVIEW */}
              {previewFile.type === 'image' && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <div className="bg-white p-3 rounded-2xl border border-slate-200/70 shadow-sm max-h-[50vh] flex items-center justify-center overflow-hidden">
                    {previewFile.dataUrl ? (
                      <img 
                        src={previewFile.dataUrl} 
                        alt={previewFile.name} 
                        className="max-w-full max-h-[46vh] object-contain rounded-lg shadow-4xs"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-center p-12 text-slate-400">
                        <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-30 animate-pulse" />
                        <p className="text-xs">Không có dữ liệu hình ảnh thực tế</p>
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-mono shadow-3xs">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      An toàn tuyệt đối • File ảnh PNG/JPG đã giải mã
                    </span>
                  </div>
                </div>
              )}

              {/* PDF PREVIEW: Highly authentic clinical report rendering */}
              {previewFile.type === 'pdf' && (
                <div className="flex-1 bg-white border border-slate-200 shadow-sm rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto w-full font-sans text-slate-800 leading-relaxed relative flex flex-col justify-between">
                  {/* Digital Signature Emblem overlay */}
                  <div className="absolute top-12 right-12 opacity-10 pointer-events-none select-none">
                    <Shield className="w-40 h-40 text-emerald-800" />
                  </div>

                  <div>
                    {/* Medical Header */}
                    <div className="flex justify-between items-start border-b border-dashed border-slate-200 pb-4 mb-6">
                      <div className="text-left">
                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wide">SỞ Y TẾ BẮC GIANG</h4>
                        <h5 className="text-[10px] font-extrabold text-slate-700 uppercase mt-0.5">BỆNH VIỆN ĐA KHOA SÔNG THƯƠNG</h5>
                        <p className="text-[8.5px] text-slate-400 mt-1">Đ/c: Số 250 Lê Lợi, TP Bắc Giang</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2.5 py-1 rounded bg-slate-100 text-[9px] font-bold text-slate-700 border border-slate-200">
                          MÃ LƯU TRỮ: {previewFile.name.toUpperCase().replace('.PDF', '')}
                        </span>
                        <p className="text-[8.5px] font-mono text-slate-400 mt-1">Hệ thống: e-Hospital v3.8</p>
                      </div>
                    </div>

                    {/* Report Title */}
                    <div className="text-center my-6">
                      <h2 className="text-sm font-black text-slate-950 uppercase tracking-widest">
                        {previewFile.name.includes('BC_Truc') ? 'BÁO CÁO GIAO BAN TRỰC HÀNH CHÍNH' : 'PHIẾU PHÊ DUYỆT TĂNG CƯỜNG NHÂN SỰ'}
                      </h2>
                      <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">
                        Sổ theo dõi trực tuyến • Phòng Điều dưỡng trưởng
                      </p>
                    </div>

                    {/* Report Content Details depending on File Name */}
                    {previewFile.name.includes('BC_Truc') ? (
                      <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-150">
                          <div>
                            <p className="text-slate-500 font-bold text-[9.5px]">Ca trực hành chính:</p>
                            <p className="font-extrabold text-slate-800">Trực ngày nghỉ / Lễ chuyên môn</p>
                          </div>
                          <div>
                            <p className="text-slate-500 font-bold text-[9.5px]">Điều dưỡng trưởng ca trực:</p>
                            <p className="font-extrabold text-slate-800">Phạm Thị Cánh</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-slate-900 mb-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                            I. Tình hình nhân lực & Hoạt động lâm sàng
                          </h4>
                          <p className="text-slate-600 pl-2.5">
                            Quân số trực đầy đủ, đúng giờ quy định. Toàn ca trực thực hiện nghiêm chỉnh quy chế chuyên môn, quy trình kỹ thuật điều dưỡng và giao tiếp ứng xử văn minh.
                          </p>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-slate-900 mb-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                            II. Chỉ số bệnh nhân trong ca
                          </h4>
                          <div className="overflow-x-auto pl-2.5 mt-1">
                            <table className="w-full text-[10.5px] text-slate-700 border-collapse border border-slate-200">
                              <thead>
                                <tr className="bg-slate-50">
                                  <th className="border border-slate-200 p-1 text-left font-extrabold">Khoa lâm sàng</th>
                                  <th className="border border-slate-200 p-1 text-center font-extrabold">Số BN Hiện diện</th>
                                  <th className="border border-slate-200 p-1 text-center font-extrabold">Bệnh nặng cấp C1</th>
                                  <th className="border border-slate-200 p-1 text-center font-extrabold">Trực đặc biệt</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="border border-slate-200 p-1">Khoa Nội - Nhi</td>
                                  <td className="border border-slate-200 p-1 text-center">45</td>
                                  <td className="border border-slate-200 p-1 text-center font-bold text-red-600">03</td>
                                  <td className="border border-slate-200 p-1 text-center">02</td>
                                </tr>
                                <tr>
                                  <td className="border border-slate-200 p-1">Khoa Ngoại</td>
                                  <td className="border border-slate-200 p-1 text-center">32</td>
                                  <td className="border border-slate-200 p-1 text-center font-bold text-red-600">02</td>
                                  <td className="border border-slate-200 p-1 text-center">01</td>
                                </tr>
                                <tr>
                                  <td className="border border-slate-200 p-1">Y học cổ truyền</td>
                                  <td className="border border-slate-200 p-1 text-center">28</td>
                                  <td className="border border-slate-200 p-1 text-center">00</td>
                                  <td className="border border-slate-200 p-1 text-center">00</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-slate-900 mb-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                            III. Sự cố phát sinh & Hướng giải quyết
                          </h4>
                          <p className="text-slate-600 pl-2.5">
                            • Có 01 ca cấp cứu nặng chuyển khoa Nội từ Khoa Cấp cứu lúc 03h15. Đã bố trí tăng cường kíp trực chăm sóc tích cực, BN hiện ổn định.
                          </p>
                          <p className="text-slate-600 pl-2.5 mt-1">
                            • Vật tư y tế dự phòng đầy đủ, không ghi nhận trục trặc trang thiết bị y khoa.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-150">
                          <div>
                            <p className="text-slate-500 font-bold text-[9.5px]">Khoa đề xuất nhân lực:</p>
                            <p className="font-extrabold text-slate-800">Khoa Ngoại Chấn Thương</p>
                          </div>
                          <div>
                            <p className="text-slate-500 font-bold text-[9.5px]">Thời gian tăng cường dự kiến:</p>
                            <p className="font-extrabold text-slate-800">Trực đêm 05/07/2026 - 12/07/2026</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-slate-900 mb-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                            1. Lý do xin tăng cường quân số trực
                          </h4>
                          <p className="text-slate-600 pl-2.5">
                            Số lượng bệnh nhân phẫu thuật chương trình tăng đột biến trong tuần (tăng 45% so với tuần trước). Đồng thời, khoa tiếp nhận nhiều ca cấp cứu chấn thương từ tuyến dưới chuyển lên vào đêm khuya, gây quá tải cục bộ cho kíp trực chính quy.
                          </p>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-slate-900 mb-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                            2. Kế hoạch điều động lâm sàng chi tiết
                          </h4>
                          <p className="text-slate-600 pl-2.5">
                            • Điều động tăng cường thêm 01 Điều dưỡng trung cấp lâm sàng từ khoa Liên chuyên khoa sang Khoa Ngoại mỗi đêm.
                          </p>
                          <p className="text-slate-600 pl-2.5 mt-1">
                            • Bố trí trực dự phòng tại nhà 01 Điều dưỡng đại học để sẵn sàng điều động khi có báo cáo khẩn cấp từ Trưởng kíp trực ngoại.
                          </p>
                        </div>

                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-semibold">
                          📣 Ý kiến Trưởng phòng Điều dưỡng: Đề xuất hoàn toàn phù hợp chuyên môn. Đã phê duyệt ký số điện tử điều động từ kíp trực luân phiên. Đề nghị khoa Ngoại tiếp nhận và bàn giao chỉ tiêu cụ thể đầu ca trực.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Signatures */}
                  <div className="flex justify-between items-end border-t border-dashed border-slate-200 pt-6 mt-8">
                    <div className="text-center w-1/3">
                      <p className="text-[10px] text-slate-500">Người lập báo cáo</p>
                      <p className="text-[10.5px] font-black text-slate-800 mt-8">ĐD Trưởng Khoa</p>
                      <span className="text-[8px] bg-emerald-50 text-emerald-800 px-1 border border-emerald-300 rounded font-bold mt-1 inline-block">ĐÃ KÝ SỐ</span>
                    </div>
                    <div className="text-center w-1/3">
                      <p className="text-[9px] text-slate-400 font-mono italic">Bảo mật nội bộ</p>
                      <p className="text-[10px] font-extrabold text-emerald-700 mt-8 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        ĐÃ KIỂM DUYỆT
                      </p>
                    </div>
                    <div className="text-center w-1/3">
                      <p className="text-[10px] text-slate-500">Phê duyệt kiểm soát</p>
                      <p className="text-[10.5px] font-black text-slate-800 mt-8">Trưởng Phòng Điều dưỡng</p>
                      <span className="text-[8px] bg-emerald-50 text-emerald-800 px-1 border border-emerald-300 rounded font-bold mt-1 inline-block">ĐÃ PHÊ DUYỆT</span>
                    </div>
                  </div>
                </div>
              )}

              {/* EXCEL PREVIEW: Live clinical spreadsheet rendering with search and totals */}
              {previewFile.type === 'excel' && (
                <div className="flex-1 bg-white border border-slate-200 shadow-sm rounded-2xl p-4 md:p-6 max-w-4xl w-full mx-auto flex flex-col overflow-hidden">
                  
                  {/* Excel Tools Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 mb-4 text-xs font-semibold text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-600 text-white font-black px-2 py-1 rounded text-[10px] font-mono">XLSX READER</span>
                      <span className="text-slate-700 font-extrabold">BẢNG TỔNG HỢP KIỂM TRA ĐIỀU DƯỠNG QUÝ II</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 bg-white border border-slate-150 px-2.5 py-1 rounded-lg">
                      Số lượng hàng: 6 hàng • Đã tự động tính tổng
                    </div>
                  </div>

                  {/* Spreadsheet table */}
                  <div className="flex-1 overflow-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left text-slate-700 border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10.5px] uppercase font-mono">
                          <th className="p-2.5 border-r border-slate-200 text-center w-10 bg-slate-150"></th>
                          <th className="p-2.5 border-r border-slate-200 min-w-[240px]">A - Chỉ số kiểm tra chất lượng</th>
                          <th className="p-2.5 border-r border-slate-200 text-center">B - Chỉ tiêu</th>
                          <th className="p-2.5 border-r border-slate-200 text-center">C - Khoa Nội</th>
                          <th className="p-2.5 border-r border-slate-200 text-center">D - Khoa Ngoại</th>
                          <th className="p-2.5 border-r border-slate-200 text-center">E - Khoa Sản</th>
                          <th className="p-2.5 text-center">F - Tỷ lệ đạt (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { id: 1, name: 'Bàn giao ca đầy đủ, có ký số xác nhận điện tử', target: '100%', n: '100%', ng: '100%', s: '95%', rate: '98.3%' },
                          { id: 2, name: 'Hồ sơ bệnh án sắp xếp khoa học, sạch đẹp', target: '95%', n: '98%', ng: '92%', s: '96%', rate: '95.3%' },
                          { id: 3, name: 'Sử dụng vật tư y tế đúng quy trình định mức', target: '100%', n: '100%', ng: '100%', s: '100%', rate: '100%' },
                          { id: 4, name: 'Tỷ lệ người bệnh hài lòng khi phục vụ lâm sàng', target: '90%', n: '94%', ng: '91%', s: '95%', rate: '93.3%' },
                          { id: 5, name: 'Thực hiện đúng quy tắc vô khuẩn buồng bệnh', target: '100%', n: '100%', ng: '98%', s: '100%', rate: '99.3%' },
                          { id: 6, name: 'Chữ ký số hồ sơ bệnh án hoàn thành đúng giờ', target: '95%', n: '96%', ng: '90%', s: '94%', rate: '93.3%' }
                        ].map((row, index) => (
                          <tr key={row.id} className="border-b border-slate-150 hover:bg-slate-50/50 transition-colors">
                            <td className="p-2.5 border-r border-slate-200 text-center font-mono font-bold text-slate-400 bg-slate-50/60">{index + 1}</td>
                            <td className="p-2.5 border-r border-slate-200 font-bold text-slate-800">{row.name}</td>
                            <td className="p-2.5 border-r border-slate-200 text-center font-semibold font-mono text-slate-600">{row.target}</td>
                            <td className="p-2.5 border-r border-slate-200 text-center font-bold font-mono text-blue-600">{row.n}</td>
                            <td className="p-2.5 border-r border-slate-200 text-center font-bold font-mono text-purple-600">{row.ng}</td>
                            <td className="p-2.5 border-r border-slate-200 text-center font-bold font-mono text-indigo-600">{row.s}</td>
                            <td className="p-2.5 text-center font-black font-mono text-emerald-700 bg-emerald-50/30">{row.rate}</td>
                          </tr>
                        ))}
                        {/* Summary / Total row */}
                        <tr className="bg-slate-50 font-black border-t-2 border-slate-300">
                          <td className="p-2.5 border-r border-slate-200 text-center font-mono text-slate-400 bg-slate-100">∑</td>
                          <td className="p-2.5 border-r border-slate-200 text-slate-900 font-extrabold text-[11px] uppercase">CHỈ SỐ TRUNG BÌNH TOÀN VIỆN</td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-mono text-slate-700">96.6%</td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-mono text-emerald-700 bg-emerald-50/30">98.0%</td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-mono text-emerald-700 bg-emerald-50/30">95.1%</td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-mono text-emerald-700 bg-emerald-50/30">96.0%</td>
                          <td className="p-2.5 text-center font-extrabold text-[12px] text-emerald-800 bg-emerald-100/40">96.5%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Summary eval */}
                  <div className="mt-4 p-3.5 bg-emerald-50/55 border border-emerald-200 rounded-xl flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-extrabold text-xs text-emerald-900">ĐÁNH GIÁ CHẤT LƯỢNG KỲ BÁO CÁO</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">
                        Điểm trung bình toàn viện đạt <strong>96.5%</strong>, đạt mức chỉ tiêu xuất sắc loại A. Điểm số cao nhất thuộc về chỉ số quản lý vật tư y tế và bàn giao ca hành chính lâm sàng. Đề xuất Trưởng phòng Điều dưỡng ký duyệt áp dụng biểu mẫu kiểm tra số hóa này cho Quý III/2026.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* WORD / OTHER DOCUMENT PREVIEW */}
              {previewFile.type !== 'image' && previewFile.type !== 'pdf' && previewFile.type !== 'excel' && (
                <div className="flex-1 bg-white border border-slate-200 shadow-sm rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto w-full flex flex-col justify-between">
                  <div>
                    <div className="border-b border-slate-100 pb-3 mb-4">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Dữ liệu tài liệu</span>
                      <h3 className="font-black text-slate-900 text-sm mt-0.5">{previewFile.name}</h3>
                    </div>
                    
                    <div className="py-6 text-center text-slate-400">
                      <File className="w-16 h-16 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-600">Định dạng văn bản thông dụng</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-md mx-auto">
                        Tệp tài liệu an toàn đã mã hóa trên hệ thống Bệnh viện Sông Thương. Vui lòng bấm nút "Tải về máy" bên dưới để đọc toàn bộ nội dung chi tiết.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 mt-6 text-center">
                    {previewFile.dataUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = previewFile.dataUrl!;
                          link.download = previewFile.name;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        <span>Tải tệp tin tức thì ({previewFile.size})</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 font-semibold">
                        Đây là tệp tin mô phỏng của hệ thống
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Mã hóa AES-256 an toàn • Chỉ lưu trữ nội bộ bệnh viện</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2 rounded-xl cursor-pointer transition-all shadow-3xs"
              >
                Đóng xem trước
              </button>
            </div>

          </div>
        </div>
      )}

      {/* BEAUTIFUL CUSTOM STATE-BASED CONFIRMATION MODAL */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6 animate-scaleIn">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-slate-950 text-sm">
                  {confirmModal.title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed font-medium">
                  {confirmModal.message}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-3xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
