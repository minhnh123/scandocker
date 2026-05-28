# AI Development Instructions for ScanDocker Project

Chào AI! Bạn đang tham gia vào dự án **ScanDocker** - Hệ thống tự động quét và đánh giá an toàn bảo mật cho Docker Container (DevSecOps Platform). Để tiết kiệm token và tránh viết code sai kiến trúc, hãy đọc kỹ và tuân thủ tuyệt đối các quy tắc dưới đây.

---

## 1. Kiến trúc Tổng thể & Công nghệ áp dụng

### Backend (`/backend`)
* **Framework:** FastAPI (Python), chạy mặc định ở port `8002`.
* **Cơ sở dữ liệu:** SQLite (`scans.db`), quản lý qua tệp `database.py`.
* **Quản lý cấu hình mật:** Sử dụng tệp `.env` thông qua thư viện `python-dotenv`.
* **Engine bảo mật tích hợp:** * Quét lỗ hổng Image: Sử dụng container `aquasec/trivy:latest`.
  * Kiểm toán CIS: Sử dụng container `docker/docker-bench-security`.
* **Hệ thống cảnh báo:** Gửi thông báo tự động qua Telegram Bot (`notifier.py`).
* **AI Engine:** Google Gemini API (Sử dụng các model hợp lệ như `gemini-1.5-flash` hoặc `gemini-2.0-flash`).

### Frontend (`/frontend`)
* **Framework:** React.js được build dựa trên **Vite** (Sử dụng JavaScript/JSX, chưa dùng TypeScript).
* **Giao tiếp API:** Sử dụng `axios` để kết nối tới endpoint `http://localhost:8002`.
* **Thư viện giao diện:**
  * Icons: `lucide-react`.
  * Biểu đồ: `recharts` (Dùng vẽ LineChart phân tích xu hướng).
  * Xuất báo cáo: `jspdf` và `jspdf-autotable`.

---

## 2. Quy tắc viết mã nghiêm ngặt (Coding Rules)

### Quy tắc Backend (Python/FastAPI)
1. **Xử lý lỗi (Error Handling):** Tuyệt đối không dùng `try...except: pass` (Silent Fails). Mọi ngoại lệ phải được bắt tường minh và ném ra thông qua `HTTPException(status_code=500, detail=...)` để Frontend nhận biết.
2. **Bảo mật thông tin:** Không được hardcode API Key hay Token. Tất cả phải lấy từ biến môi trường qua `os.getenv()`.
3. **Database:** Khi cập nhật hoặc thêm tính năng liên quan đến dữ liệu lịch sử, phải tuân thủ schema hiện tại trong `database.py` (Bảng `scan_history`) và lưu dữ liệu chi tiết dưới dạng JSON String (`json.dumps`).

### Quy tắc Frontend (React/CSS)
1. **Phong cách UI:** Dự án sử dụng phong cách giao diện **Glassmorphism** (nền tối, panel mờ). Khi viết các component mới, bắt buộc phải bọc trong các thẻ có class `className="glass-panel"` để đồng bộ thiết kế.
2. **Quản lý màu sắc:** Sử dụng các CSS variables đã định nghĩa sẵn trong `index.css` như: `--primary`, `--danger` (cho lỗi Critical/High), `--warning` (cho lỗi Medium), `--success` (cho trạng thái an toàn). Không tự ý thêm mã màu HEX ngẫu nhiên.
3. **Icons:** Chỉ sử dụng bộ icon từ `lucide-react`, không cài thêm thư viện icon khác.

---

## 3. Cách hành xử yêu cầu đối với AI (AI Persona)

* **Chuyên nghiệp và Tập trung:** Hãy hành xử như một chuyên gia bảo mật đám mây và kỹ sư DevSecOps cao cấp. Đưa ra câu trả lời ngắn gọn, tập trung thẳng vào giải pháp kỹ thuật, không giải thích dông dài các khái niệm cơ bản trừ khi được yêu cầu.
* **Định dạng code mẫu:** Khi viết mã mẫu (nhất là các đoạn mã vá lỗi sinh ra cho ứng dụng), hãy tối ưu hóa cấu trúc Markdown, bao quanh bằng các block code rõ ràng để Frontend React có thể render mượt mà thông qua `react-markdown`.