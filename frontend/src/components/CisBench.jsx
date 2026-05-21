import React, { useState } from 'react';
import { Settings, Loader2 } from 'lucide-react';
import axios from 'axios';

function CisBench() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    setResult(null);
    try {
      const res = await axios.get('http://localhost:8002/api/scan/cis');
      setResult(res.data.results);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Settings /> CIS Benchmark
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
        Chạy Docker Bench for Security để kiểm tra các cấu hình máy chủ và Docker daemon theo tiêu chuẩn CIS.
        Lưu ý: Trên Windows (Docker Desktop), một số bài kiểm tra máy chủ sẽ không khả dụng do chạy qua VM.
      </p>

      <button className="btn btn-primary" onClick={handleScan} disabled={scanning}>
        {scanning ? <><Loader2 size={16} className="spin" style={{marginRight: '8px', animation: 'spin 1s linear infinite'}} /> Đang chạy benchmark...</> : 'Bắt đầu Benchmark'}
      </button>

      {error && (
        <div style={{ marginTop: '24px', color: 'var(--danger)', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '24px' }}>
          <h3>Kết quả Benchmark:</h3>
          <pre style={{ 
              marginTop: '12px', 
              background: 'rgba(0,0,0,0.5)', 
              padding: '16px', 
              borderRadius: '8px',
              overflowX: 'auto',
              fontSize: '14px',
              color: 'var(--text-main)',
              maxHeight: '500px',
              overflowY: 'auto'
          }}>
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

export default CisBench;
