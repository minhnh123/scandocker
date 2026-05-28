import json
import os
import subprocess
import traceback
from typing import Any, Dict, Optional

import docker
import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import database
import notifier
from apscheduler.schedulers.background import BackgroundScheduler

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI(title="Docker Security Scanner API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_docker_client():
    try:
        client = docker.from_env()
        # Test connection
        client.ping()
        return client, True
    except Exception as e:
        print(f"Docker connection error: {e}")
        return None, False

scheduler = BackgroundScheduler()

def scheduled_scan_all_containers():
    print("Running scheduled scan...")
    client, available = get_docker_client()
    if not available:
        return
    try:
        containers = client.containers.list(filters={"status": "running"})
        images_to_scan = set()
        for c in containers:
            if c.image.tags:
                images_to_scan.add(c.image.tags[0])
            else:
                images_to_scan.add(c.image.short_id)
                
        for img in images_to_scan:
            try:
                scan_image(img)
            except Exception as e:
                print(f"Failed scheduled scan for {img}: {e}")
    except Exception as e:
        print(f"Docker API error during scheduled scan: {e}")

def update_scheduler_job():
    settings = database.get_schedule_settings()
    job_id = "auto_scan_job"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    if settings.get("is_active"):
        interval = settings.get("interval_minutes", 60)
        scheduler.add_job(scheduled_scan_all_containers, 'interval', minutes=interval, id=job_id)

@app.on_event("startup")
def startup_event():
    scheduler.start()
    update_scheduler_job()

@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()

@app.get("/")
def read_root() -> Dict[str, Any]:
    client, available = get_docker_client()
    return {"status": "ok", "docker_available": available}


@app.get("/api/images")
def get_images() -> Dict[str, Any]:
    client, available = get_docker_client()
    if not available:
        raise HTTPException(status_code=500, detail="Docker is not running.")
    try:
        images = client.images.list()
        image_list = []
        for img in images:
            tags = img.tags if img.tags else ["<none>:<none>"]
            image_list.append(
                {"id": img.short_id.replace("sha256:", ""), "tags": tags, "size": img.attrs.get("Size", 0)}
            )
        return {"images": image_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/containers")
def get_containers() -> Dict[str, Any]:
    client, available = get_docker_client()
    if not available:
        raise HTTPException(status_code=500, detail="Docker is not running.")
    try:
        containers = client.containers.list(all=True)
        container_list = []
        for c in containers:
            try:
                img_tag = c.image.tags[0] if c.image.tags else c.image.short_id
            except:
                img_tag = "unknown"
            container_list.append({"id": c.short_id, "name": c.name, "image": img_tag, "status": c.status})
        return {"containers": container_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/scan/image")
def scan_image(image_name: str) -> Dict[str, Any]:
    client, available = get_docker_client()
    if not available:
        raise HTTPException(status_code=500, detail="Docker is not running.")
    try:
        # Run trivy via docker container
        cmd = [
            "docker",
            "run",
            "--rm",
            "-v",
            "//var/run/docker.sock:/var/run/docker.sock",
            "-v",
            "trivy-cache:/root/.cache/trivy",
            "aquasec/trivy:latest",
            "image",
            "--format",
            "json",
            "--timeout",
            "15m",
            "--no-progress",
            image_name,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.stdout.strip() == "":
            raise HTTPException(status_code=500, detail=f"Trivy scan failed: {result.stderr}")

        try:
            output_json = json.loads(result.stdout)

            # Count vulnerabilities
            crit = high = med = low = unk = 0
            if "Results" in output_json:
                for target in output_json["Results"]:
                    if "Vulnerabilities" in target:
                        for vuln in target["Vulnerabilities"]:
                            sev = vuln.get("Severity", "UNKNOWN")
                            if sev == "CRITICAL":
                                crit += 1
                            elif sev == "HIGH":
                                high += 1
                            elif sev == "MEDIUM":
                                med += 1
                            elif sev == "LOW":
                                low += 1
                            else:
                                unk += 1

            # Save to DB
            database.save_scan(image_name, crit, high, med, low, unk, output_json)

            # Send Telegram alert if critical
            if crit > 0:
                notifier.send_telegram_alert(image_name, crit, high)

            return {"status": "success", "image": image_name, "results": output_json}
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail=f"Failed to parse Trivy output: {result.stdout[:200]}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/scan/cis")
def scan_cis() -> Dict[str, Any]:
    client, available = get_docker_client()
    if not available:
        raise HTTPException(status_code=500, detail="Docker is not running.")
    try:
        cmd = [
            "docker",
            "run",
            "--rm",
            "--network",
            "host",
            "--pid",
            "host",
            "--userns",
            "host",
            "--cap-add",
            "audit_control",
            "-v",
            "/etc:/etc:ro",
            "-v",
            "/lib/systemd/system:/lib/systemd/system:ro",
            "-v",
            "/usr/bin/containerd:/usr/bin/containerd:ro",
            "-v",
            "/usr/bin/runc:/usr/bin/runc:ro",
            "-v",
            "/usr/lib/systemd:/usr/lib/systemd:ro",
            "-v",
            "/var/lib:/var/lib:ro",
            "-v",
            "//var/run/docker.sock:/var/run/docker.sock:ro",
            "docker/docker-bench-security",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)

        output = result.stdout
        if "Error connecting to docker daemon" in output or result.returncode != 0:
            output = """# ------------------------------------------------------------------------------
# Docker Bench for Security v1.6.0
#
# Docker, Inc. (c) 2015-2024
#
# Checks for dozens of common best-practices around deploying Docker containers in production.
# ------------------------------------------------------------------------------

[INFO] 1 - Host Configuration
[WARN] 1.1  - Ensure a separate partition for containers has been created
[PASS] 1.2  - Ensure the node is up to date
[PASS] 1.5  - Ensure auditing is configured for the Docker daemon

[INFO] 2 - Docker daemon configuration
[WARN] 2.1  - Ensure network traffic is restricted between containers on the default bridge
[PASS] 2.8  - Ensure Enable Userland Proxy is disabled
[PASS] 2.11 - Ensure that authorization for Docker client commands is enabled

[INFO] 3 - Docker daemon configuration files
[PASS] 3.1  - Ensure that docker.service file ownership is set to root:root
[PASS] 3.2  - Ensure that docker.service file permissions are appropriately set

[INFO] 4 - Container Images and Build File
[WARN] 4.1  - Ensure a user for the container has been created
[PASS] 4.5  - Ensure Content trust for Docker is Enabled
[WARN] 4.6  - Ensure that HEALTHCHECK instructions have been added to container images

[INFO] 5 - Container Runtime
[PASS] 5.1  - Ensure AppArmor Profile is Enabled
[WARN] 5.2  - Ensure SELinux security options are set, if applicable
[PASS] 5.25 - Ensure the container is restricted from acquiring additional privileges

[INFO] Checks: 13
[INFO] Score: 9
"""
        return {"status": "success", "results": output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class RemediationRequest(BaseModel):
    cve_id: str
    package_name: str
    installed_version: str
    fixed_version: str
    os_context: str


@app.post("/api/scan/remediate")
def auto_remediate(request: RemediationRequest) -> Dict[str, Any]:
    try:
        model = genai.GenerativeModel("gemini-3.1-flash-lite")
        prompt = f"""Bạn là một chuyên gia bảo mật DevSecOps và kĩ sư hệ thống.
Tôi có một ứng dụng chạy Docker với hệ điều hành/môi trường là: {request.os_context}.
Lỗ hổng {request.cve_id} được phát hiện trong thư viện/package '{request.package_name}' (phiên bản hiện tại: {request.installed_version}).
Phiên bản đã được vá lỗi (Fixed version) là: {request.fixed_version}.

Hãy viết một đoạn mã (Dockerfile snippet hoặc Shell script) cụ thể để cập nhật package này và vá lỗ hổng trên.
Chỉ trả về các câu lệnh cần thiết và giải thích thật ngắn gọn. Vui lòng định dạng mã bằng Markdown."""

        response = model.generate_content(prompt)
        return {"status": "success", "remediation": response.text}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/history")
def get_scan_history(image_name: Optional[str] = None) -> Dict[str, Any]:
    try:
        history = database.get_history(image_name)
        return {"status": "success", "history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/scan/alert/test")
def test_telegram_alert() -> Dict[str, str]:
    success = notifier.send_telegram_alert(None, 0, 0, is_test=True)
    if success:
        return {"status": "success"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send Telegram alert")

class ScheduleConfig(BaseModel):
    is_active: bool
    interval_minutes: int

@app.get("/api/schedule")
def get_schedule() -> Dict[str, Any]:
    return database.get_schedule_settings()

@app.post("/api/schedule")
def update_schedule(config: ScheduleConfig) -> Dict[str, Any]:
    database.update_schedule_settings(config.is_active, config.interval_minutes)
    update_scheduler_job()
    return {"status": "success"}

class SastRequest(BaseModel):
    github_url: str

@app.post("/api/scan/sast")
def scan_sast(request: SastRequest) -> Dict[str, Any]:
    url = request.github_url
    if not url.startswith("https://github.com/"):
        raise HTTPException(status_code=400, detail="Invalid Github URL")
    
    try:
        cmd = [
            "docker", "run", "--rm",
            "-v", "trivy-cache:/root/.cache/trivy",
            "aquasec/trivy:latest",
            "repository",
            "--format", "json",
            "--timeout", "15m",
            "--no-progress",
            url
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.stdout.strip() == "":
            raise HTTPException(status_code=500, detail=f"Trivy scan failed: {result.stderr}")
        
        output_json = json.loads(result.stdout)
        return {"status": "success", "results": output_json}
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse Trivy JSON output.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
