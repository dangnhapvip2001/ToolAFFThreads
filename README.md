# 🤖 ToolAFFThreads — Threads Auto Affiliate Bot Pro

**ToolAFFThreads** là tiện ích mở rộng trình duyệt (Chrome Extension - Manifest V3) chuyên dụng giúp tự động hóa quy trình tiếp thị liên kết (Shopee Affiliate) trên nền tảng **Threads (`threads.com` / `threads.net`)**. Công cụ hỗ trợ tự động tạo link sạch, cuộn trang quét các bài viết đang viral, xoay vòng kịch bản bình luận và tự động đăng phản hồi theo cơ chế giãn cách ngẫu nhiên chống khóa tài khoản.

---

## ✨ Tính năng cốt lõi

* **🔗 Tự động chuẩn hóa Link Shopee Affiliate:** Tự động bóc tách `shop_id` và `item_id` từ tab sản phẩm Shopee đang mở, loại bỏ tham số thừa và gắn mã định danh `mmp_pid`, `utm_source` cùng `utm_content` (Sub_ID) để đo lường nguồn đơn hàng.
* **🔥 Bộ lọc bài viết Viral thông minh:** Tự động cuộn bảng tin Threads, phân tích chỉ số tương tác (hỗ trợ mọi định dạng hiển thị như `125`, `1,5K`, `2,3 N`, `1,2 Tr`) và chỉ dừng lại bình luận ở những bài đạt ngưỡng lượt Thích (Tim) tối thiểu do bạn cài đặt.
* **🔄 Xoay vòng 10+ Kịch bản & Spintax:** Cho phép thiết lập sẵn danh sách nhiều kịch bản bán hàng khác nhau (mỗi dòng 1 kịch bản) kết hợp cú pháp trộn từ `{A|B}` giúp mỗi bình luận đăng lên đều tự nhiên, duy nhất.
* **⚡ Tương thích Lexical Editor & React SPA:** Giả lập chuẩn thao tác chuột (`PointerEvent` / `MouseEvent`) và gõ phím thật trên trình soạn thảo của Meta, tự động nhận diện nút gửi bình luận và tự điều hướng quay lại bảng tin chính.
* **🛡️ Cơ chế Anti-Spam & Chống trùng lặp:** 
  * Lưu vết ID bài viết (`postId`) đã xử lý trong phiên làm việc để không bao giờ bình luận lặp lại vào cùng một bài.
  * Bộ đếm ngược thời gian nghỉ ngẫu nhiên (`Random Cooldown Timer` từ `Min` đến `Max` giây) giữa 2 lần rải để mô phỏng hành vi người dùng thật.

---

## 📂 Cấu trúc thư mục

```text
ToolAFFThreads/
├── manifest.json    # Cấu hình Chrome Extension (Manifest V3)
├── popup.html       # Giao diện thiết lập Affiliate ID, bộ lọc Tim & danh sách kịch bản
├── popup.js         # Logic lưu trữ tự động (Auto-save) và xử lý bóc tách link Shopee
├── content.js       # Bot tự động quét DOM Threads, điền kịch bản và gửi bình luận
└── README.md        # Tài liệu hướng dẫn cài đặt và sử dụng
