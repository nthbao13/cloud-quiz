# Cloud Quiz Application

Ứng dụng web làm quiz về Cloud Computing với thiết kế tối giản, hiện đại theo phong cách Apple/Notion.

## Tính năng

### 1. Chế độ chơi đơn
- **Làm theo từng quiz**: Chọn Quiz 1, Quiz 2,... để làm riêng lẻ
- **Làm tất cả quiz**: Làm tất cả các câu hỏi từ mọi quiz
- **Random câu hỏi**: Bật/tắt tính năng trộn thứ tự câu hỏi

### 2. Chế độ chơi Online 🌐 (MỚI!)
- **Tạo phòng chơi**: Tạo phòng và chia sẻ mã phòng với bạn bè
- **Tham gia phòng**: Nhập mã phòng để tham gia cùng người khác
- **Chọn chủ đề**: Chủ phòng chọn quiz cụ thể hoặc tất cả
- **Thi đấu realtime**: Mỗi câu hỏi có 10 giây
- **Tính điểm thông minh**: 
  - Trả lời đúng + nhanh = điểm cao
  - Điểm tối đa: 1000 điểm/câu
  - Điểm tối thiểu (đúng): 500 điểm/câu
- **Bảng xếp hạng trực tiếp**: Xem điểm của tất cả người chơi realtime
- **Kết quả cuối cùng**: Hiển thị thứ hạng với huy chương 🥇🥈🥉

### 3. Trắc nghiệm thông minh
- Tự động nhận dạng câu hỏi một đáp án hoặc nhiều đáp án
- Hiển thị kết quả ngay sau khi submit (đúng/sai)
- Đánh dấu đáp án đúng và sai bằng màu sắc rõ ràng
- **Lọc bỏ câu tự luận**: Chỉ hiển thị câu trắc nghiệm trong chế độ online

### 4. Giải thích câu trả lời
- Hiển thị explanation có sẵn từ dữ liệu
- Tự động gọi Gemini AI để lấy giải thích nếu không có sẵn
- Giải thích bằng tiếng Việt, ngắn gọn và dễ hiểu

### 5. Kết quả và làm lại
- Hiển thị thống kê: số câu đúng, sai, phần trăm điểm
- **Tính năng làm lại câu sai**: Chỉ làm lại những câu đã trả lời sai
- Nút quay về trang chủ để chọn quiz khác

### 6. Giao diện
- Thiết kế tối giản, hiện đại
- Tone màu đen trắng chủ đạo với gradient tím cho chế độ online
- Responsive, hoạt động tốt trên mọi thiết bị
- Hiệu ứng animation mượt mà

## Cài đặt và sử dụng

### 1. Cấu hình Firebase cho chế độ Online (Bắt buộc cho Online Mode)

Để sử dụng tính năng chơi online, bạn cần cấu hình Firebase Realtime Database:

📖 **Xem hướng dẫn chi tiết tại: [FIREBASE_SETUP.md](FIREBASE_SETUP.md)**

Tóm tắt:
1. Tạo Firebase project tại https://console.firebase.google.com/
2. Enable Realtime Database
3. Copy config và paste vào file `firebase-config.js`

### 2. Cấu hình Gemini API (Tùy chọn)

Để sử dụng tính năng giải thích tự động, bạn cần API key từ Google Gemini:

1. Truy cập: https://aistudio.google.com/app/apikey
2. Đăng nhập với tài khoản Google
3. Tạo API key mới
4. Click vào biểu tượng ⚙️ trên ứng dụng và nhập API key

**Lưu ý**: Nếu không cấu hình API key, ứng dụng vẫn hoạt động bình thường với explanation có sẵn trong dữ liệu.

### 3. Chạy ứng dụng

#### Cách 1: Mở trực tiếp file HTML
```bash
# Mở file index.html bằng trình duyệt
open index.html  # macOS
```

#### Cách 2: Sử dụng local server (Khuyến nghị)
```bash
# Sử dụng Python
python3 -m http.server 8000

# Hoặc sử dụng Node.js
npx http-server

# Sau đó truy cập: http://localhost:8000
```

## Cấu trúc thư mục

```
cloud-quiz/
├── index.html          # Giao diện chính
├── styles.css          # Styling
├── app.js             # Logic ứng dụng
├── config.js          # Hướng dẫn cấu hình
├── README.md          # Tài liệu
└── dataset/
    └── quizz_cloud.csv  # Dữ liệu quiz
```

## Cấu trúc dữ liệu CSV

File `quizz_cloud.csv` có cấu trúc:
```
Quiz,Question,Answer,Explain
Quiz 1,,,
,"Câu hỏi 1...","Đáp án đúng","Giải thích..."
,"Câu hỏi 2...","Đáp án 1, Đáp án 2","Giải thích..."
Quiz 2,,,
...
```

### Quy tắc:
- Dòng đầu tiên của mỗi quiz: `Quiz X,,,`
- Câu hỏi có nhiều đáp án đúng: phân cách bằng dấu phẩy trong cột Answer
- Ứng dụng tự động nhận dạng câu hỏi một đáp án hay nhiều đáp án

## Công nghệ sử dụng

- **HTML5**: Cấu trúc trang web
- **CSS3**: Styling với thiết kế hiện đại
- **Vanilla JavaScript**: Logic ứng dụng (không sử dụng framework)
- **Google Gemini API**: AI giải thích câu trả lời (tùy chọn)

## Tính năng nổi bật

### 1. Smart Answer Detection
Ứng dụng tự động phát hiện câu hỏi là single-choice hay multiple-choice dựa trên số lượng đáp án đúng trong dữ liệu.

### 2. Dynamic Explanation
- Ưu tiên hiển thị explanation có sẵn
- Tự động gọi AI nếu không có explanation
- Loading indicator khi đang fetch từ API

### 3. Retry Wrong Answers
Tính năng độc đáo cho phép người dùng chỉ làm lại các câu đã trả lời sai, giúp học hiệu quả hơn.

### 4. Minimal Design
Giao diện được thiết kế theo triết lý "less is more" của Apple và Notion:
- Typography rõ ràng, dễ đọc
- Spacing hợp lý
- Animation mượt mà
- Không có yếu tố phức tạp làm phân tán

## Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra file CSV có đúng cấu trúc không
2. Kiểm tra API key Gemini (nếu sử dụng)
3. Mở Console trong trình duyệt để xem lỗi
4. Đảm bảo chạy ứng dụng qua HTTP server (không phải file://)

## License

MIT License - Sử dụng tự do cho mục đích học tập và thương mại.
