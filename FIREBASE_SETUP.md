# Hướng dẫn cấu hình Firebase cho tính năng Online

## Bước 1: Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" hoặc "Thêm dự án"
3. Nhập tên dự án (ví dụ: "cloud-quiz-online")
4. Tắt Google Analytics nếu không cần (hoặc bật nếu muốn)
5. Click "Create project"

## Bước 2: Tạo Web App

1. Trong Firebase Console, click vào biểu tượng Web (</>) để thêm app
2. Đặt tên cho app (ví dụ: "Cloud Quiz Web")
3. **KHÔNG** chọn Firebase Hosting (chúng ta sẽ host tự do)
4. Click "Register app"

## Bước 3: Lấy Firebase Configuration

1. Sau khi đăng ký app, Firebase sẽ hiển thị config code
2. Copy các giá trị trong `firebaseConfig` object
3. Mở file `firebase-config.js` trong dự án
4. Thay thế các giá trị `YOUR_XXX` bằng giá trị thực từ Firebase

Ví dụ config:
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    authDomain: "cloud-quiz-xxxx.firebaseapp.com",
    databaseURL: "https://cloud-quiz-xxxx-default-rtdb.firebaseio.com",
    projectId: "cloud-quiz-xxxx",
    storageBucket: "cloud-quiz-xxxx.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:xxxxxxxxxxxxxxxx"
};
```

## Bước 4: Enable Realtime Database

1. Trong Firebase Console, vào menu bên trái, chọn "Realtime Database"
2. Click "Create Database"
3. Chọn vị trí server (gợi ý: Singapore cho khu vực Việt Nam)
4. Chọn "Start in test mode" (cho phép đọc/ghi tự do trong 30 ngày)
5. Click "Enable"

## Bước 5: Cấu hình Security Rules (Tuỳ chọn - Nâng cao)

Để bảo mật hơn, bạn có thể cấu hình rules:

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": true,
        ".indexOn": ["createdAt", "status"],
        "players": {
          "$playerId": {
            ".validate": "newData.hasChildren(['name', 'score', 'isHost', 'joinedAt'])"
          }
        }
      }
    }
  }
}
```

## Bước 6: Test kết nối

1. Mở file `index.html` bằng Live Server hoặc web server
2. Mở Console trong DevTools (F12)
3. Kiểm tra xem có thông báo "Firebase initialized successfully" không
4. Nếu có lỗi, kiểm tra lại config trong `firebase-config.js`

## Bước 7: Sử dụng tính năng Online

### Tạo phòng:
1. Click nút "🌐 Chơi Online"
2. Nhập tên người chơi
3. Click "➕ Tạo phòng mới"
4. Share mã phòng với bạn bè

### Tham gia phòng:
1. Click nút "🌐 Chơi Online"
2. Nhập tên người chơi
3. Nhập mã phòng (6 ký tự)
4. Click "Tham gia"

### Chơi game:
1. Chủ phòng chọn chủ đề quiz
2. Click "Bắt đầu trò chơi"
3. Mỗi câu hỏi có 10 giây
4. Trả lời đúng càng nhanh, điểm càng cao
5. Xem kết quả và bảng xếp hạng cuối cùng

## Cơ chế tính điểm:

- **Trả lời sai hoặc hết giờ**: 0 điểm
- **Trả lời đúng**: 500 điểm cơ bản + 500 điểm thưởng thời gian
- **Điểm thưởng thời gian**: Tính theo công thức (10 - thời gian đã dùng) / 10
  - Trả lời ngay lập tức: ~1000 điểm
  - Trả lời sau 5 giây: ~750 điểm
  - Trả lời sau 9 giây: ~550 điểm

## Lưu ý:

- Tính năng online chỉ hoạt động khi có kết nối internet
- Phòng sẽ tự động đóng khi chủ phòng rời đi
- Dữ liệu phòng sẽ bị xóa sau khi tất cả người chơi rời đi
- Firebase Realtime Database free plan giới hạn:
  - 1GB storage
  - 10GB/tháng bandwidth
  - 100 connections đồng thời
  
Đủ cho ~100-200 người chơi cùng lúc!

## Troubleshooting:

### Lỗi "Firebase initialization error"
- Kiểm tra lại config trong `firebase-config.js`
- Đảm bảo đã enable Realtime Database

### Lỗi "Permission denied"
- Kiểm tra Security Rules trong Realtime Database
- Đảm bảo rules cho phép đọc/ghi

### Không thể tạo/tham gia phòng
- Kiểm tra kết nối internet
- Mở Console (F12) để xem lỗi chi tiết
- Đảm bảo databaseURL đúng trong config

## Hosting (Tuỳ chọn):

Để bạn bè có thể chơi online, bạn cần host ứng dụng:

### Option 1: Firebase Hosting (Miễn phí)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Option 2: GitHub Pages (Miễn phí)
1. Push code lên GitHub
2. Vào Settings > Pages
3. Chọn branch và folder
4. GitHub sẽ tự động deploy

### Option 3: Netlify/Vercel (Miễn phí)
1. Kết nối GitHub repo
2. Tự động deploy mỗi lần push

---

Chúc bạn chơi vui! 🎮🎉
