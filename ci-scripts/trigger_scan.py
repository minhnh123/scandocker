import os
import sys
import json
import urllib.request
import urllib.parse
from urllib.error import URLError, HTTPError
import time

def check_security(image_name: str, backend_url: str):
    print(f"[*] Đang yêu cầu ScanDocker quét Image: {image_name}")
    print(f"[*] Backend API: {backend_url}")
    
    encoded_image = urllib.parse.quote(image_name)
    api_endpoint = f"{backend_url}/api/scan/image?image_name={encoded_image}"
    
    print("[*] Vui lòng đợi trong giây lát, quá trình quét đang diễn ra...")
    
    try:
        headers = {
            'User-Agent': 'CI-CD-Pipeline',
            'ngrok-skip-browser-warning': 'true'
        }
        req = urllib.request.Request(api_endpoint, headers=headers)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            
        print("[+] Quét thành công! Đang phân tích kết quả...")
        
        # Bóc tách JSON
        critical_count = 0
        high_count = 0
        
        results = data.get("results", {}).get("Results", [])
        for target in results:
            vulns = target.get("Vulnerabilities", [])
            for v in vulns:
                sev = v.get("Severity", "").upper()
                if sev == "CRITICAL":
                    critical_count += 1
                elif sev == "HIGH":
                    high_count += 1
                    
        print(f"----------------------------------------")
        print(f"BÁO CÁO BẢO MẬT (IMAGE: {image_name})")
        print(f"CRITICAL: {critical_count}")
        print(f"HIGH: {high_count}")
        print(f"----------------------------------------")
        
        if critical_count > 0:
            print("[!!!] PHÁT HIỆN LỖ HỔNG NGHIÊM TRỌNG (CRITICAL) [!!!]")
            print("[X] PIPELINE BỊ CHẶN LẠI (SHIFT-LEFT SECURITY BLOCK). Vui lòng khắc phục lỗi trước khi Deploy.")
            sys.exit(1) # Báo lỗi cho Github Action
        else:
            print("[V] Mức độ an toàn đạt chuẩn. Tiếp tục Pipeline Deploy.")
            sys.exit(0) # Thành công
            
    except HTTPError as e:
        print(f"[X] Lỗi từ máy chủ API: {e.code} - {e.read().decode()}")
        sys.exit(1)
    except URLError as e:
        print(f"[X] Không thể kết nối tới Backend ({backend_url}): {e.reason}")
        print("[!] Đảm bảo rằng biến môi trường SCANDOCKER_API_URL đã được trỏ tới máy chủ ScanDocker hợp lệ.")
        sys.exit(1)
    except Exception as e:
        print(f"[X] Lỗi không xác định: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Sử dụng: python trigger_scan.py <tên_image:tag>")
        sys.exit(1)
        
    image_to_scan = sys.argv[1]
    # Lấy URL từ Github Secrets hoặc biến môi trường
    backend_url = os.environ.get("SCANDOCKER_API_URL", "http://localhost:8002")
    
    check_security(image_to_scan, backend_url)
