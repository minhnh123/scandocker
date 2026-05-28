import os
import sys
import json
import urllib.request
import urllib.parse
from urllib.error import URLError, HTTPError

def check_security_sast(github_url: str, backend_url: str):
    print(f"[*] Đang yêu cầu ScanDocker quét Mã Nguồn tĩnh (SAST): {github_url}")
    print(f"[*] Backend API: {backend_url}")
    
    api_endpoint = f"{backend_url}/api/scan/sast"
    print("[*] Vui lòng đợi trong giây lát, quá trình quét đang diễn ra...")
    
    data_payload = json.dumps({"github_url": github_url}).encode("utf-8")
    
    try:
        headers = {
            'User-Agent': 'CI-CD-Pipeline',
            'ngrok-skip-browser-warning': 'true',
            'Content-Type': 'application/json'
        }
        req = urllib.request.Request(api_endpoint, data=data_payload, headers=headers)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            
        print("[+] Quét thành công! Đang phân tích kết quả...")
        
        critical_count = 0
        high_count = 0
        
        results = data.get("results", {}).get("Results", [])
        for target in results:
            issues = target.get("Vulnerabilities", []) or target.get("Misconfigurations", []) or target.get("Secrets", [])
            for v in issues:
                sev = v.get("Severity", "").upper()
                if sev == "CRITICAL":
                    critical_count += 1
                elif sev == "HIGH":
                    high_count += 1
                    
        print(f"----------------------------------------")
        print(f"BÁO CÁO BẢO MẬT MÃ NGUỒN (SAST)")
        print(f"CRITICAL: {critical_count}")
        print(f"HIGH: {high_count}")
        print(f"----------------------------------------")
        
        if critical_count > 0:
            print("[!!!] PHÁT HIỆN LỖ HỔNG NGHIÊM TRỌNG (CRITICAL) TRONG SOURCE CODE [!!!]")
            print("[X] PIPELINE BỊ CHẶN LẠI (SHIFT-LEFT SECURITY BLOCK). Vui lòng khắc phục mã nguồn.")
            sys.exit(1)
        else:
            print("[V] Mức độ an toàn đạt chuẩn. Tiếp tục Pipeline Deploy.")
            sys.exit(0)
            
    except HTTPError as e:
        print(f"[X] Lỗi từ máy chủ API: {e.code} - {e.read().decode()}")
        sys.exit(1)
    except URLError as e:
        print(f"[X] Không thể kết nối tới Backend ({backend_url}): {e.reason}")
        sys.exit(1)
    except Exception as e:
        print(f"[X] Lỗi không xác định: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Sử dụng: python trigger_sast.py <github_url>")
        sys.exit(1)
        
    url = sys.argv[1]
    backend_url = os.environ.get("SCANDOCKER_API_URL", "http://localhost:8002")
    
    check_security_sast(url, backend_url)
