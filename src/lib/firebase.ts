import { initializeApp } from 'firebase/app';
import { 
  getFirestore,
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { DepartmentSchedule, Staff, AppNotification, DeleteRequest, Directive, ChatMessage, DirectiveReply } from '../types';
import { getInitialDepartmentSchedules, INITIAL_STAFF } from '../initialData';

const firebaseConfig = {
  projectId: "gen-lang-client-0809150444",
  appId: "1:284328229401:web:0b4edc4a88f9ceb9ea8888",
  apiKey: "AIzaSyBGL0WEn3vuqtLbnR8KO0QkH9AuT8Ekx-g",
  authDomain: "gen-lang-client-0809150444.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-ngklchlmviciudng-d35a0f68-c6c6-47d7-bcb9-2c9024244576",
  storageBucket: "gen-lang-client-0809150444.firebasestorage.app",
  messagingSenderId: "284328229401",
  measurementId: ""
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Helper to seed initial data if Firestore is empty
export async function seedInitialDataIfEmpty() {
  try {
    const schedulesSnap = await getDocs(collection(db, 'schedules'));
    if (schedulesSnap.empty) {
      console.log('Seeding initial schedules...');
      const defaultSchedules = getInitialDepartmentSchedules();
      const batch = writeBatch(db);
      defaultSchedules.forEach(schedule => {
        // Use document ID format: "month_department"
        const docId = `${schedule.month}_${schedule.department.replace(/\//g, '-')}`;
        const ref = doc(db, 'schedules', docId);
        batch.set(ref, schedule);
      });
      await batch.commit();
    }

    const staffSnap = await getDocs(collection(db, 'staff'));
    if (staffSnap.empty) {
      console.log('Seeding initial staff...');
      const batch = writeBatch(db);
      Object.entries(INITIAL_STAFF).forEach(([dept, staffs]) => {
        const ref = doc(db, 'staff', dept.replace(/\//g, '-'));
        batch.set(ref, { department: dept, list: staffs });
      });
      await batch.commit();
    }

    const notificationsSnap = await getDocs(collection(db, 'notifications'));
    if (notificationsSnap.empty) {
      console.log('Seeding initial notifications...');
      const today = new Date();
      const currentMonthYear = `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      const defaultNotifs: AppNotification[] = [
        {
          id: 'notif-1',
          type: 'REMINDER',
          title: 'Nhắc nhở nộp lịch làm việc',
          message: `Lịch đăng ký tuần & tháng ${currentMonthYear} của Khoa Nội - Nhi đang ở trạng thái Bản Nháp. Hãy nộp trước đúng hạn.`,
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          isRead: false,
          targetRole: 'CHIEF_NURSE',
          targetDepartment: 'Nội - Nhi'
        },
        {
          id: 'notif-2',
          type: 'PENDING',
          title: 'Lịch đăng ký mới chờ phê duyệt',
          message: 'Khoa YHCT - PHCN đã nộp lịch đăng ký làm việc, đang chờ Trưởng phòng Điều dưỡng phê duyệt.',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          isRead: false,
          targetRole: 'HEAD_OF_NURSING'
        },
        {
          id: 'notif-3',
          type: 'APPROVED',
          title: 'Lịch đăng ký đã được phê duyệt',
          message: `Bảng xếp lịch tháng ${currentMonthYear} Khoa Ngoại đã được duyệt thành công.`,
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          isRead: true,
          targetRole: 'CHIEF_NURSE',
          targetDepartment: 'Ngoại'
        }
      ];

      const batch = writeBatch(db);
      defaultNotifs.forEach(notif => {
        const ref = doc(db, 'notifications', notif.id);
        batch.set(ref, notif);
      });
      await batch.commit();
    }

    const directivesSnap = await getDocs(collection(db, 'directives'));
    if (directivesSnap.empty) {
      console.log('Seeding initial directives...');
      const defaultDirectives: Directive[] = [
        {
          id: 'dir-1',
          title: 'Triển khai lịch trực tăng cường dịp cuối tuần và phòng chống bão lũ',
          content: 'Đề nghị Điều dưỡng trưởng tất cả các khoa kiểm tra quân số, đảm bảo trực 24/24. Báo cáo tình hình chuẩn bị vật tư y tế khẩn cấp trước 17h00 chiều nay.',
          senderName: 'Nguyễn Thanh Hương',
          senderUsername: 'phongdieuduong',
          recipient: 'ALL',
          priority: 'URGENT',
          timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
          isOpinionRequest: false,
          replies: [
            {
              id: 'reply-1',
              senderName: 'Trương Thị Ngân',
              senderUsername: 'ngoai',
              content: 'Khoa Ngoại đã rà soát và hoàn tất danh sách điều dưỡng ứng trực khẩn cấp. Sẵn sàng vật tư cấp cứu.',
              timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
            }
          ]
        },
        {
          id: 'dir-2',
          title: 'Xin ý kiến chỉ đạo: Sắp xếp điều dưỡng đi học chuyên đề Hồi sức cấp cứu',
          content: 'Khoa Nội - Nhi hiện tại đang thiếu nhân sự do có 1 điều dưỡng nghỉ thai sản. Đề xuất xin ý kiến Trưởng phòng điều phối thêm 1 nhân viên từ khoa khác hỗ trợ trong thời gian điều dưỡng đi học.',
          senderName: 'Phạm Thị Cánh',
          senderUsername: 'noinhi',
          recipient: 'ALL',
          priority: 'NORMAL',
          timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
          isOpinionRequest: true,
          replies: [
            {
              id: 'reply-2',
              senderName: 'Nguyễn Thanh Hương',
              senderUsername: 'phongdieuduong',
              content: 'Phòng Điều dưỡng đã ghi nhận. Sẽ xem xét điều chuyển tạm thời 1 nhân sự từ LCK hoặc Ngoại sang hỗ trợ từ tuần tới.',
              timestamp: new Date(Date.now() - 3600000 * 6).toISOString()
            }
          ]
        }
      ];
      const batch = writeBatch(db);
      defaultDirectives.forEach(dir => {
        const ref = doc(db, 'directives', dir.id);
        batch.set(ref, dir);
      });
      await batch.commit();
    }

    const chatSnap = await getDocs(collection(db, 'chat'));
    if (chatSnap.empty) {
      console.log('Seeding initial chat messages...');
      const defaultMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          senderUsername: 'phongdieuduong',
          senderName: 'Nguyễn Thanh Hương',
          senderRole: 'HEAD_OF_NURSING',
          recipientUsername: 'all',
          content: 'Xin chào toàn thể các anh chị em Điều dưỡng trưởng các khoa! Kênh chat chung toàn viện bắt đầu hoạt động.',
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
          id: 'msg-2',
          senderUsername: 'noinhi',
          senderName: 'Phạm Thị Cánh',
          senderRole: 'CHIEF_NURSE',
          recipientUsername: 'all',
          content: 'Khoa Nội - Nhi xin chào Trưởng phòng và các đồng nghiệp ạ!',
          timestamp: new Date(Date.now() - 3600000 * 23.5).toISOString()
        },
        {
          id: 'msg-3',
          senderUsername: 'ngoai',
          senderName: 'Trương Thị Ngân',
          senderRole: 'CHIEF_NURSE',
          recipientUsername: 'all',
          content: 'Khoa Ngoại điểm danh đầy đủ!',
          timestamp: new Date(Date.now() - 3600000 * 23).toISOString()
        },
        {
          id: 'msg-4',
          senderUsername: 'phongdieuduong',
          senderName: 'Nguyễn Thanh Hương',
          senderRole: 'HEAD_OF_NURSING',
          recipientUsername: 'leadership',
          content: 'Chào các bạn, đây là kênh mật dành riêng cho Phòng điều dưỡng bàn bạc kế hoạch trực chỉ đạo.',
          timestamp: new Date(Date.now() - 3600000 * 12).toISOString()
        }
      ];
      const batch = writeBatch(db);
      defaultMessages.forEach(msg => {
        const ref = doc(db, 'chat', msg.id);
        batch.set(ref, msg);
      });
      await batch.commit();
    }

    const statusesSnap = await getDocs(collection(db, 'memberStatuses'));
    if (statusesSnap.empty) {
      console.log('Seeding initial member statuses...');
      const defaultStatuses: Record<string, string> = {
        admin: '🟢 Đang trực ban',
        phongdieuduong: '🟢 Đang trực ban',
        noinhi: '🟡 Đang đi buồng bệnh',
        ngoai: '🔴 Trong phòng mổ / Giao ban',
        yhct: '🟢 Đang trực ban',
        lck: '⚪ Ngoại tuyến (Nghỉ ca)'
      };
      const batch = writeBatch(db);
      Object.entries(defaultStatuses).forEach(([user, status]) => {
        const ref = doc(db, 'memberStatuses', user);
        batch.set(ref, { username: user, status });
      });
      await batch.commit();
    }
  } catch (error) {
    console.error('Error seeding initial Firestore data:', error);
  }
}

// REAL-TIME SUBSCRIPTION UTILITIES

// 1. Department Schedules Sync
export function subscribeToSchedules(onUpdate: (schedules: DepartmentSchedule[]) => void) {
  return onSnapshot(collection(db, 'schedules'), (snapshot) => {
    const schedules: DepartmentSchedule[] = [];
    snapshot.forEach((doc) => {
      schedules.push(doc.data() as DepartmentSchedule);
    });
    onUpdate(schedules);
  }, (error) => {
    console.error('Firestore schedules subscription error:', error);
  });
}

export async function saveScheduleToFirestore(schedule: DepartmentSchedule) {
  const docId = `${schedule.month}_${schedule.department.replace(/\//g, '-')}`;
  await setDoc(doc(db, 'schedules', docId), schedule);
}

// 2. Staff List Sync
export function subscribeToStaff(onUpdate: (staffMap: Record<string, Staff[]>) => void) {
  return onSnapshot(collection(db, 'staff'), (snapshot) => {
    const staffMap: Record<string, Staff[]> = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.department && data.list) {
        staffMap[data.department] = data.list;
      }
    });
    onUpdate(staffMap);
  }, (error) => {
    console.error('Firestore staff subscription error:', error);
  });
}

export async function saveStaffToFirestore(department: string, list: Staff[]) {
  const docId = department.replace(/\//g, '-');
  await setDoc(doc(db, 'staff', docId), { department, list });
}

// 3. Notifications Sync
export function subscribeToNotifications(onUpdate: (notifications: AppNotification[]) => void) {
  return onSnapshot(collection(db, 'notifications'), (snapshot) => {
    const notifs: AppNotification[] = [];
    snapshot.forEach((doc) => {
      notifs.push(doc.data() as AppNotification);
    });
    // Sort descending by timestamp
    notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    onUpdate(notifs);
  }, (error) => {
    console.error('Firestore notifications subscription error:', error);
  });
}

export async function addNotificationToFirestore(notif: AppNotification) {
  await setDoc(doc(db, 'notifications', notif.id), notif);
}

export async function markNotificationReadInFirestore(id: string) {
  const ref = doc(db, 'notifications', id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { isRead: true });
  }
}

export async function deleteNotificationFromFirestore(id: string) {
  await deleteDoc(doc(db, 'notifications', id));
}

// 4. Delete Requests Sync
export function subscribeToDeleteRequests(onUpdate: (requests: DeleteRequest[]) => void) {
  return onSnapshot(collection(db, 'deleteRequests'), (snapshot) => {
    const reqs: DeleteRequest[] = [];
    snapshot.forEach((doc) => {
      reqs.push(doc.data() as DeleteRequest);
    });
    onUpdate(reqs);
  }, (error) => {
    console.error('Firestore deleteRequests subscription error:', error);
  });
}

export async function addDeleteRequestToFirestore(req: DeleteRequest) {
  await setDoc(doc(db, 'deleteRequests', req.id), req);
}

export async function removeDeleteRequestFromFirestore(id: string) {
  await deleteDoc(doc(db, 'deleteRequests', id));
}

// 5. Directives Sync
export function subscribeToDirectives(onUpdate: (directives: Directive[]) => void) {
  return onSnapshot(collection(db, 'directives'), (snapshot) => {
    const dirs: Directive[] = [];
    snapshot.forEach((doc) => {
      dirs.push(doc.data() as Directive);
    });
    // Sort descending by timestamp
    dirs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    onUpdate(dirs);
  }, (error) => {
    console.error('Firestore directives subscription error:', error);
  });
}

export async function addDirectiveToFirestore(dir: Directive) {
  await setDoc(doc(db, 'directives', dir.id), dir);
}

export async function deleteDirectiveFromFirestore(id: string) {
  await deleteDoc(doc(db, 'directives', id));
}

export async function addDirectiveReplyToFirestore(directiveId: string, reply: DirectiveReply) {
  const ref = doc(db, 'directives', directiveId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const dir = snap.data() as Directive;
    const updatedReplies = [...dir.replies, reply];
    await updateDoc(ref, { replies: updatedReplies });
  }
}

// 6. Chat Messages Sync
export function subscribeToChat(onUpdate: (messages: ChatMessage[]) => void) {
  return onSnapshot(collection(db, 'chat'), (snapshot) => {
    const messages: ChatMessage[] = [];
    snapshot.forEach((doc) => {
      messages.push(doc.data() as ChatMessage);
    });
    // Sort ascending by timestamp
    messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    onUpdate(messages);
  }, (error) => {
    console.error('Firestore chat subscription error:', error);
  });
}

export async function addChatMessageToFirestore(msg: ChatMessage) {
  await setDoc(doc(db, 'chat', msg.id), msg);
}

// 7. Member Statuses Sync
export function subscribeToMemberStatuses(onUpdate: (statuses: Record<string, string>) => void) {
  return onSnapshot(collection(db, 'memberStatuses'), (snapshot) => {
    const statuses: Record<string, string> = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.username && data.status) {
        statuses[data.username] = data.status;
      }
    });
    onUpdate(statuses);
  }, (error) => {
    console.error('Firestore memberStatuses subscription error:', error);
  });
}

export async function updateMemberStatusInFirestore(username: string, status: string) {
  await setDoc(doc(db, 'memberStatuses', username), { username, status });
}
