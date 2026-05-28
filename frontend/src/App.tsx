import React, { useState, useEffect } from 'react';
import {
  Shield,
  LayoutDashboard,
  Box,
  HardDrive,
  Settings,
  AlertTriangle,
  Activity,
  Code,
} from 'lucide-react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import ImagesList from './components/ImagesList';
import ContainersList from './components/ContainersList';
import CisBench from './components/CisBench';
import SchedulerConfig from './components/SchedulerConfig';
import SastScan from './components/SastScan';

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [stats, setStats] = useState({ images: [], containers: [] });
  const [history, setHistory] = useState([]);
  const [dockerError, setDockerError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const rootRes = await axios.get('http://localhost:8002/');
      if (!rootRes.data.docker_available) {
        setDockerError(
          'Docker Desktop hiện chưa được bật. Vui lòng khởi động Docker trên máy chủ của bạn.'
        );
        setLoading(false);
        return;
      }

      setDockerError(null);
      const imgRes = await axios.get('http://localhost:8002/api/images');
      const contRes = await axios.get('http://localhost:8002/api/containers');
      const histRes = await axios.get('http://localhost:8002/api/history');

      setStats({
        images: imgRes.data.images || [],
        containers: contRes.data.containers || [],
      });
      setHistory(histRes.data.history || []);
    } catch (err) {
      console.error('API Error:', err);
      setDockerError('Không thể kết nối đến Backend API. Hãy chắc chắn Backend đang chạy.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}>
          <div className="spin">
            <Shield size={48} color="var(--primary)" />
          </div>
        </div>
      );
    }

    if (activeView === 'images') {
      return <ImagesList images={stats.images} />;
    }
    if (activeView === 'containers') {
      return <ContainersList containers={stats.containers} />;
    }
    if (activeView === 'cis') {
      return <CisBench />;
    }
    if (activeView === 'sast') {
      return <SastScan />;
    }

    return (
      <div>
        <div className="dashboard-grid">
          <div
            className="stat-card glass-panel"
            onClick={() => setActiveView('images')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-title">Tổng số Images</div>
            <div className="stat-value">{stats.images.length}</div>
          </div>
          <div
            className="stat-card glass-panel"
            onClick={() => setActiveView('containers')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-title">Containers Đang chạy</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>
              {stats.containers.filter((c) => c.status === 'running').length}
            </div>
          </div>
          <div className="stat-card glass-panel">
            <div className="stat-title">Lượt quét (History)</div>
            <div className="stat-value" style={{ color: 'var(--info)' }}>
              {history.length}
            </div>
          </div>
        </div>

        <SchedulerConfig />

        {history.length > 0 && (
          <div className="glass-panel" style={{ marginTop: '24px', padding: '24px' }}>
            <h2
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}
            >
              <Activity className="text-primary" /> Lịch sử Kiểm toán (Vulnerabilities Trend)
            </h2>
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer>
                <LineChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid stroke="#333" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#888"
                    tickFormatter={(tick) => new Date(tick).toLocaleDateString()}
                  />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="critical"
                    stroke="#ff4d4f"
                    strokeWidth={3}
                    name="Critical"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="high"
                    stroke="#faad14"
                    strokeWidth={2}
                    name="High"
                  />
                  <Line
                    type="monotone"
                    dataKey="medium"
                    stroke="#1890ff"
                    strokeWidth={2}
                    name="Medium"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div
        className="sidebar glass-panel"
        style={{ borderRadius: 0, borderTop: 0, borderBottom: 0, borderLeft: 0 }}
      >
        <div className="sidebar-logo">
          <Shield size={28} />
          DockerSec
        </div>

        <a
          href="#"
          className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            setActiveView('dashboard');
          }}
        >
          <LayoutDashboard size={20} /> Dashboard
        </a>
        <a
          href="#"
          className={`nav-item ${activeView === 'images' ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            setActiveView('images');
          }}
        >
          <Box size={20} /> Danh sách Images
        </a>
        <a
          href="#"
          className={`nav-item ${activeView === 'containers' ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            setActiveView('containers');
          }}
        >
          <HardDrive size={20} /> Danh sách Containers
        </a>
        <a
          href="#"
          className={`nav-item ${activeView === 'cis' ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            setActiveView('cis');
          }}
        >
          <Settings size={20} /> CIS Benchmark
        </a>
        <a
          href="#"
          className={`nav-item ${activeView === 'sast' ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            setActiveView('sast');
          }}
        >
          <Code size={20} /> Quét Mã Nguồn (SAST)
        </a>

        <div style={{ marginTop: 'auto', marginBottom: '24px' }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={fetchData}
          >
            Làm mới dữ liệu
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <h1>Bảng điều khiển Bảo mật</h1>
          <p>Hệ thống tự động quét và đánh giá an toàn cho Docker Container</p>
        </div>

        {dockerError && (
          <div
            className="glass-panel"
            style={{
              padding: '16px 24px',
              marginBottom: '24px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderLeft: '4px solid var(--danger)',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--danger)' }}
            >
              <AlertTriangle size={24} />
              <strong>{dockerError}</strong>
            </div>
          </div>
        )}

        {renderContent()}
      </div>
    </div>
  );
}

export default App;
