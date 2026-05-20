# Tổng hợp Redmine cho dự án Script Helper

## 1. Giới thiệu chung project

Project này gồm các helper script dùng cho môi trường web nội bộ `http://192.168.50.14:81/*`.
Mục tiêu chính:
- hỗ trợ dịch nhanh từ tiếng Nhật sang tiếng Việt
- quản lý từ điển dịch và alias cho các file domain
- tô màu biến/thuộc tính trong bảng method
- phát hiện thay đổi iframe `frSheet` và cập nhật lại nội dung

Các file chính hiện có:
- `translate/domain-helper.js` — quản lý dictionary, hiển thị tooltip, form chỉnh sửa alias
- `translate/tab-helper.js` — dialog dịch nhanh trên tab / iframe
- `variable-maker-color/color-helper.js` — parse bảng method và tô màu biến, attribute

## 2. Hướng dẫn cài đặt extension Script Cat

1. Mở Visual Studio Code.
2. Vào `Extensions` (biểu tượng ô vuông bên trái) hoặc nhấn `Ctrl+Shift+X`.
3. Tìm kiếm từ khóa: `Script Cat`.
4. Chọn extension phù hợp và bấm `Install`.
5. Sau khi cài xong, nếu có yêu cầu reload VS Code thì bấm `Reload`.

## 3. Link mở Script Cat và file help.js

### Cài đặt helper  **Script Cat**.
- Mở [`translate/domain-helper.user.js`](https://nsvn-tranminhhoang.github.io/helper-coder-read-domain/translate/domain-helper.user.js)
- Mở [`translate/tab-helper.user.js`](https://nsvn-tranminhhoang.github.io/helper-coder-read-domain/translate/domain-helper.user.js)
- Mở [`variable-maker-color/color-helper.user.js`](https://nsvn-tranminhhoang.github.io/helper-coder-read-domain/variable-maker-color/color-helper.user.js)


### Mở trang Script Cat trên web
- Nếu bạn muốn mở trực tiếp giao diện Script Cat trên web để lưu cấu hình, dùng link sau:
  - [Mở Script Cat Web](https://docs.scriptcat.org/)

> Nếu Script Cat web của bạn có URL khác, thay `https://docs.scriptcat.org/` bằng URL đó.

## 4. Cách sử dụng

### 4.1 Sử dụng chức năng dịch nhanh
- Trong giao diện web, click chuột phải vào một dòng tiếng Nhật trong `#index-files`.
- Tooltip dịch sẽ hiện nếu có alias trong `localStorage`.
- Nếu chưa có alias, mở popup để nhập và lưu.

### 4.2 Dùng panel Dictionary Manager
- Nhấn đúp vào button `VI` ở góc dưới cùng để mở panel chính.
- Tìm kiếm từ tiếng Nhật hoặc alias.
- Chỉnh sửa alias, xóa, xuất / nhập dictionary.

### 4.3 Quản lý alias class, attribute và method
- Mở `Script Cat` hoặc form quản lý class trong phần `#index-files`.
- Nhập `alias` cho class.
- Nhập `alias` các attributes, methods class.
- Bấm `Lưu` để ghi vào `localStorage`.

### 4.4 Kịch bản sử dụng thường gặp
1. Mở file `translate/domain-helper.js` và kiểm tra cấu trúc dictionary.
2. Cài Script Cat và mở command để phân tích file.
3. Tìm từ Nhật cần dịch, nhập alias vào panel.
4. Lưu và kiểm tra tooltip hiển thị trong trang web.
