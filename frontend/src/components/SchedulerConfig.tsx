import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

const SchedulerConfig: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const res = await axios.get('http://localhost:8002/api/schedule');
      setIsActive(res.data.is_active);
      setIntervalMinutes(res.data.interval_minutes);
    } catch (err) {
      console.error('Failed to fetch schedule settings', err);
    }
  };

  const handleSave = async () => {
    try {
      setStatusMsg(null);
      await axios.post('http://localhost:8002/api/schedule', {
        is_active: isActive,
        interval_minutes: intervalMinutes,
      });
      setStatusMsg({
        type: 'success',
        text: 'Đã lưu cấu hình tự động quét thành công!',
      });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Lỗi khi lưu cấu hình.' });
    }
  };

  return (
    <div className="glass-panel" style={{ marginTop: '24px', padding: '24px' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Clock className="text-primary" /> Cấu hình Tự động quét (Cronjob)
      </h2>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold' }}>Trạng thái:</label>
          <button
            onClick={() => setIsActive(!isActive)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: isActive ? 'var(--success)' : '#444',
              color: '#fff',
              fontWeight: 'bold',
              transition: 'all 0.3s',
            }}
          >
            {isActive ? 'BẬT (ON)' : 'TẮT (OFF)'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold' }}>Lặp lại mỗi (phút):</label>
          <input
            type="number"
            min="1"
            max="1440"
            value={intervalMinutes}
            onChange={(e) => setIntervalMinutes(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #444',
              backgroundColor: 'rgba(0,0,0,0.5)',
              color: '#fff',
              width: '80px',
            }}
          />
        </div>

        <button className="btn btn-primary" onClick={handleSave}>
          Lưu Cấu Hình
        </button>
      </div>

      {statusMsg && (
        <div
          style={{
            marginTop: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: statusMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
            fontWeight: 'bold',
          }}
        >
          {statusMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {statusMsg.text}
        </div>
      )}

      {isActive && (
        <p style={{ marginTop: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Hệ thống sẽ tự động tìm các Container đang chạy và quét bảo mật mỗi {intervalMinutes}{' '}
          phút. Nếu có lỗi CRITICAL/HIGH sẽ báo ngay qua Telegram.
        </p>
      )}
    </div>
  );
};

export default SchedulerConfig;
