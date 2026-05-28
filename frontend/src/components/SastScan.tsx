import React, { useState } from 'react';
import axios from 'axios';
import { Search, AlertTriangle, CheckCircle, Code, Shield } from 'lucide-react';

const SastScan: React.FC = () => {
  const [githubUrl, setGithubUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);

  const handleScan = async () => {
    if (!githubUrl.startsWith('https://github.com/')) {
      setErrorMsg('Vui lòng nhập đường link Github hợp lệ (bắt đầu bằng https://github.com/)');
      return;
    }
    setErrorMsg(null);
    setScanning(true);
    setResults(null);

    try {
      const res = await axios.post('http://localhost:8002/api/scan/sast', {
        github_url: githubUrl,
      });
      setResults(res.data.results);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Lỗi khi quét mã nguồn.');
    } finally {
      setScanning(false);
    }
  };

  const renderResults = () => {
    if (!results) return null;
    if (!results.Results || results.Results.length === 0) {
      return (
        <div
          style={{
            marginTop: '20px',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle size={20} />
          <strong>Chúc mừng! Không tìm thấy lỗ hổng nào trong mã nguồn này.</strong>
        </div>
      );
    }

    return (
      <div style={{ marginTop: '24px' }}>
        <h3>Kết quả Phân tích:</h3>
        {results.Results.map((targetObj: any, idx: number) => {
          if (!targetObj.Vulnerabilities && !targetObj.Misconfigurations && !targetObj.Secrets)
            return null;

          const issues =
            targetObj.Vulnerabilities || targetObj.Misconfigurations || targetObj.Secrets;
          if (!issues || issues.length === 0) return null;

          return (
            <div
              key={idx}
              style={{
                marginBottom: '24px',
                backgroundColor: 'rgba(0,0,0,0.3)',
                padding: '16px',
                borderRadius: '8px',
              }}
            >
              <h4
                style={{ color: 'var(--info)', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Code size={18} /> File: {targetObj.Target}
              </h4>
              <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '12px' }}>
                Loại: {targetObj.Type || targetObj.Class}
              </p>

              <table className="custom-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Lỗ hổng / Secret ID</th>
                    <th>Mức độ</th>
                    <th>Mô tả</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue: any, iIdx: number) => (
                    <tr key={iIdx}>
                      <td>{issue.VulnerabilityID || issue.ID || issue.Title}</td>
                      <td>
                        <span className={`tag tag-${issue.Severity.toLowerCase()}`}>
                          {issue.Severity}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.9rem', maxWidth: '400px' }}>
                        {issue.Title || issue.Description || issue.Message}
                        {issue.Match && (
                          <div style={{ marginTop: '4px', color: '#ff4d4f' }}>
                            <code>{issue.Match}</code>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Shield className="text-primary" size={28} />
        Phân Tích Mã Nguồn Tĩnh (SAST / Secrets Scanning)
      </h2>
      <p style={{ color: '#bbb', marginBottom: '24px' }}>
        Dán đường link Github của bạn vào đây để công cụ quét tự động tìm kiếm các lỗi bảo mật trong
        thư viện (Dependencies), cấu hình sai (Misconfigurations) và mật khẩu bị lộ lọt (Secrets).
      </p>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="https://github.com/user/repository"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #444',
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: '#fff',
            fontSize: '1rem',
          }}
          disabled={scanning}
        />
        <button
          className="btn btn-primary"
          onClick={handleScan}
          disabled={scanning}
          style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {scanning ? (
            <>
              <div className="spin">
                <Search size={20} />
              </div>{' '}
              Đang quét...
            </>
          ) : (
            <>
              <Search size={20} /> Bắt đầu Quét
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div
          style={{
            marginTop: '16px',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={18} /> {errorMsg}
        </div>
      )}

      {renderResults()}
    </div>
  );
};

export default SastScan;
