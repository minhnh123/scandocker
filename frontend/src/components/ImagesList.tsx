import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, ShieldAlert, Loader2, Wand2, Download, Bell } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function ImagesList({ images }) {
  const [scanning, setScanning] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [remediating, setRemediating] = useState(null);
  const [remediationData, setRemediationData] = useState(null);
  const [remediationError, setRemediationError] = useState(null);
  const [alerting, setAlerting] = useState(false);

  const handleTestAlert = async () => {
    setAlerting(true);
    try {
      await axios.get('http://localhost:8002/api/scan/alert/test');
      alert('✅ Đã gửi cảnh báo Test qua Telegram thành công!');
    } catch (err) {
      alert('❌ Lỗi khi gửi cảnh báo: ' + (err.response?.data?.detail || err.message));
    } finally {
      setAlerting(false);
    }
  };

  const handleRemediate = async (vuln, osContext) => {
    setRemediating(vuln.VulnerabilityID);
    setRemediationData(null);
    setRemediationError(null);
    try {
      const res = await axios.post('http://localhost:8002/api/scan/remediate', {
        cve_id: vuln.VulnerabilityID,
        package_name: vuln.PkgName,
        installed_version: vuln.InstalledVersion,
        fixed_version: vuln.FixedVersion || 'Latest',
        os_context: osContext,
      });
      setRemediationData({ id: vuln.VulnerabilityID, content: res.data.remediation });
    } catch (err) {
      setRemediationError({
        id: vuln.VulnerabilityID,
        message: 'Lỗi phản hồi từ AI: ' + (err.response?.data?.detail || err.message),
      });
    } finally {
      setRemediating(null);
    }
  };

  const handleExportPDF = (res) => {
    const doc = new jsPDF();
    doc.text(`Bao cao Kiem toan DevSecOps: ${res.Target}`, 14, 15);
    if (!res.Vulnerabilities) return;
    const tableData = res.Vulnerabilities.map((v) => [
      v.VulnerabilityID,
      v.Severity,
      v.PkgName,
      v.InstalledVersion,
      v.FixedVersion || 'N/A',
    ]);
    autoTable(doc, {
      startY: 25,
      head: [['Vulnerability ID', 'Severity', 'Package', 'Installed Version', 'Fixed Version']],
      body: tableData,
    });
    doc.save(`Scan_Report_${res.Target.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  const handleExportCSV = (res) => {
    if (!res.Vulnerabilities) return;
    const headers = ['Vulnerability ID,Severity,Package,Installed Version,Fixed Version'];
    const rows = res.Vulnerabilities.map(
      (v) =>
        `${v.VulnerabilityID},${v.Severity},${v.PkgName},${v.InstalledVersion},${v.FixedVersion || 'N/A'}`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Scan_Report_${res.Target.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleScan = async (imageTag) => {
    if (imageTag === '<none>:<none>') {
      setError('Không thể quét image không có tag (dangling image).');
      return;
    }
    setScanning(imageTag);
    setError(null);
    setScanResult(null);
    try {
      const res = await axios.get(
        `http://localhost:8002/api/scan/image?image_name=${encodeURIComponent(imageTag)}`
      );
      setScanResult(res.data.results);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setScanning(null);
    }
  };

  if (scanResult) {
    return (
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button className="btn btn-primary" onClick={() => setScanResult(null)}>
            Quay lại danh sách
          </button>
          <button
            className="btn btn-primary"
            style={{ background: '#0088cc', color: 'white' }}
            onClick={handleTestAlert}
            disabled={alerting}
          >
            {alerting ? <Loader2 size={16} className="spin" /> : <Bell size={16} />}
            {alerting ? 'Đang gửi...' : 'Test Telegram Alert'}
          </button>
        </div>
        <h2>Kết quả quét: {scanResult?.ArtifactName || 'Unknown'}</h2>

        {scanResult?.Results ? (
          scanResult.Results.map((res, i) => (
            <div
              key={i}
              style={{
                marginTop: '20px',
                padding: '16px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <h3>
                  {res.Target} ({res.Type})
                </h3>
                {res.Vulnerabilities && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-primary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '13px',
                        background: 'var(--success)',
                      }}
                      onClick={() => handleExportPDF(res)}
                    >
                      <Download size={14} style={{ marginRight: '4px' }} /> Tải PDF
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '13px',
                        background: 'var(--warning)',
                        color: 'black',
                      }}
                      onClick={() => handleExportCSV(res)}
                    >
                      <Download size={14} style={{ marginRight: '4px' }} /> Xuất CSV
                    </button>
                  </div>
                )}
              </div>
              {res.Vulnerabilities ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', marginTop: '12px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          textAlign: 'left',
                        }}
                      >
                        <th style={{ padding: '8px' }}>Vulnerability ID</th>
                        <th style={{ padding: '8px' }}>Severity</th>
                        <th style={{ padding: '8px' }}>Package</th>
                        <th style={{ padding: '8px' }}>Installed Version</th>
                        <th style={{ padding: '8px' }}>Fixed Version</th>
                        <th style={{ padding: '8px' }}>AI Remediation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {res.Vulnerabilities.map((vuln, j) => (
                        <tr key={j} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '8px', color: 'var(--primary)' }}>
                            <a
                              href={vuln.PrimaryURL}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: 'inherit' }}
                            >
                              {vuln.VulnerabilityID}
                            </a>
                          </td>
                          <td
                            style={{
                              padding: '8px',
                              color:
                                vuln.Severity === 'CRITICAL'
                                  ? 'var(--danger)'
                                  : vuln.Severity === 'HIGH'
                                    ? 'var(--warning)'
                                    : 'var(--text-main)',
                            }}
                          >
                            {vuln.Severity}
                          </td>
                          <td style={{ padding: '8px' }}>{vuln.PkgName}</td>
                          <td style={{ padding: '8px' }}>{vuln.InstalledVersion}</td>
                          <td style={{ padding: '8px', color: 'var(--success)' }}>
                            {vuln.FixedVersion || 'N/A'}
                          </td>
                          <td style={{ padding: '8px' }}>
                            <button
                              className="btn btn-primary"
                              style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                background: 'var(--success)',
                              }}
                              onClick={() => handleRemediate(vuln, res.Target)}
                              disabled={remediating === vuln.VulnerabilityID}
                            >
                              {remediating === vuln.VulnerabilityID ? (
                                'Đang phân tích...'
                              ) : (
                                <>
                                  <Wand2 size={12} style={{ marginRight: '4px' }} /> Vá lỗi (AI)
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ marginTop: '12px', color: 'var(--success)' }}>
                  Không tìm thấy lỗ hổng nào!
                </p>
              )}
            </div>
          ))
        ) : (
          <p>Không có dữ liệu phân tích chi tiết.</p>
        )}

        {/* AI Remediation Modal */}
        {(remediationData || remediationError) &&
          createPortal(
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(4px)',
              }}
            >
              <div
                style={{
                  background: 'var(--bg-dark)',
                  width: '800px',
                  maxWidth: '90vw',
                  maxHeight: '85vh',
                  borderRadius: '12px',
                  border: `1px solid ${remediationError ? 'var(--danger)' : 'var(--success)'}`,
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                  overflowY: 'auto',
                }}
              >
                {remediationError ? (
                  <>
                    <h3
                      style={{
                        color: 'var(--danger)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px',
                      }}
                    >
                      <ShieldAlert size={24} /> Lỗi sinh mã vá cho {remediationError.id}
                    </h3>
                    <p
                      style={{
                        color: 'var(--text-main)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        padding: '16px',
                        borderRadius: '8px',
                      }}
                    >
                      {remediationError.message}
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={() => setRemediationError(null)}
                      style={{
                        marginTop: '24px',
                        background: 'var(--danger)',
                        border: 'none',
                        alignSelf: 'flex-end',
                      }}
                    >
                      Đóng thông báo
                    </button>
                  </>
                ) : (
                  <>
                    <h3
                      style={{
                        color: 'var(--success)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px',
                      }}
                    >
                      <Wand2 size={24} /> Đề xuất vá lỗi bằng AI cho {remediationData.id}
                    </h3>
                    <div style={{ lineHeight: '1.6', fontSize: '15px', color: 'var(--text-main)' }}>
                      <ReactMarkdown>{remediationData.content}</ReactMarkdown>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => setRemediationData(null)}
                      style={{ marginTop: '24px', alignSelf: 'flex-end' }}
                    >
                      Đóng gợi ý
                    </button>
                  </>
                )}
              </div>
            </div>,
            document.body
          )}
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h2 style={{ marginBottom: '24px' }}>Danh sách Docker Images</h2>
      {error && (
        <div
          style={{
            color: 'var(--danger)',
            marginBottom: '16px',
            padding: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px',
          }}
        >
          {error}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>ID</th>
              <th style={{ padding: '12px' }}>Tags</th>
              <th style={{ padding: '12px' }}>Size (MB)</th>
              <th style={{ padding: '12px' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {images.map((img) => (
              <tr key={img.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '12px' }}>{img.id.substring(0, 12)}</td>
                <td style={{ padding: '12px' }}>{img.tags.join(', ')}</td>
                <td style={{ padding: '12px' }}>{(img.size / 1024 / 1024).toFixed(2)}</td>
                <td style={{ padding: '12px' }}>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', fontSize: '14px' }}
                    onClick={() => handleScan(img.tags[0])}
                    disabled={scanning === img.tags[0]}
                  >
                    {scanning === img.tags[0] ? (
                      'Đang quét...'
                    ) : (
                      <>
                        <ShieldAlert size={16} /> Quét bảo mật
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
            {images.length === 0 && (
              <tr>
                <td colSpan="4" style={{ padding: '16px', textAlign: 'center' }}>
                  Không có Image nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ImagesList;
