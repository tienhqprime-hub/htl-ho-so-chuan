'use client';

import { useMemo, useState } from 'react';

type Finding = {
  severity: 'CAO' | 'TRUNG BÌNH' | 'THẤP' | 'THÔNG TIN';
  title: string;
  evidence: string;
  source: string;
  recommendation: string;
};

type Result = {
  status: 'CÓ CƠ SỞ TIN CẬY' | 'CẦN XÁC MINH THÊM' | 'CÓ DẤU HIỆU BẤT THƯỜNG';
  confidence: number;
  summary: string;
  findings: Finding[];
  limitations: string[];
  nextSteps: string[];
};

export default function KiemTraPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const totalMb = useMemo(() => files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024, [files]);

  async function runCheck() {
    setError('');
    setResult(null);
    if (!files.length) return setError('Anh hãy chọn ít nhất một tài liệu.');
    setLoading(true);
    try {
      const form = new FormData();
      files.forEach((file) => form.append('files', file));
      form.append('context', context);
      const response = await fetch('/api/analyze', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể phân tích hồ sơ.');
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell narrow">
      <header className="topbar">
        <a href="/" className="brand">HTL HỒ SƠ CHUẨN</a>
        <span className="pilot">PILOT · CHỦ SỞ HỮU VẬN HÀNH</span>
      </header>

      <section className="panel">
        <div className="eyebrow">PHIÊN KIỂM TRA MỚI</div>
        <h1>Hồ sơ nào đang khiến anh chưa chắc chắn?</h1>
        <p className="muted">Chỉ đưa vào những tài liệu cần làm rõ. Hệ thống hỗ trợ PDF, ảnh và TXT; tối đa 8 tệp, tổng 30 MB.</p>

        <label className="upload">
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
            onChange={(event) => setFiles(Array.from(event.target.files || []))}
          />
          <span>Chọn tài liệu cần kiểm tra</span>
          <small>{files.length ? `${files.length} tệp · ${totalMb.toFixed(1)} MB` : 'PDF, JPG, PNG, WEBP hoặc TXT'}</small>
        </label>

        {files.length > 0 && (
          <div className="fileList">
            {files.map((file) => <div key={`${file.name}-${file.size}`}>{file.name} <span>{Math.ceil(file.size / 1024)} KB</span></div>)}
          </div>
        )}

        <label className="field">
          <span>Điều anh đang nghi ngờ hoặc muốn làm rõ</span>
          <textarea value={context} onChange={(event) => setContext(event.target.value)} placeholder="Ví dụ: ngày tháng, số tiền và tên người ký giữa các tài liệu có thống nhất không?" />
        </label>

        <button className="primary button" onClick={runCheck} disabled={loading}>
          {loading ? 'AI đang đọc và đối chiếu...' : 'Kiểm tra toàn diện'}
        </button>
        {error && <p className="error">{error}</p>}
      </section>

      {result && (
        <section className="result panel" id="verification-report">
          <div className="resultHead">
            <div><div className="eyebrow">KẾT QUẢ HỖ TRỢ KIỂM TRA</div><h2>{result.status}</h2></div>
            <div className="score"><strong>{result.confidence}%</strong><span>Mức tin cậy</span></div>
          </div>
          <p className="leadResult">{result.summary}</p>
          <div className="findings">
            {result.findings.map((item, index) => (
              <article key={index} className="finding">
                <span className={`badge ${item.severity.toLowerCase().replace(' ', '-')}`}>{item.severity}</span>
                <h3>{item.title}</h3>
                <p><b>Bằng chứng:</b> {item.evidence}</p>
                <p><b>Nguồn:</b> {item.source}</p>
                <p><b>Khuyến nghị:</b> {item.recommendation}</p>
              </article>
            ))}
          </div>

          <div className="twoCols">
            <div><h3>Giới hạn</h3><ul>{result.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
            <div><h3>Bước tiếp theo</h3><ul>{result.nextSteps.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
          </div>

          <div className="actions noPrint">
            <button className="secondary button" onClick={() => window.print()}>In hoặc lưu PDF</button>
            <button className="secondary button" onClick={() => { setResult(null); setFiles([]); setContext(''); }}>Tạo phiên mới</button>
          </div>
          <div className="notice">Kết quả do AI hỗ trợ, cần Chủ sở hữu hoặc người có thẩm quyền xác nhận. Không thay thế giám định, công chứng, cơ quan phát hành hoặc tư vấn pháp lý.</div>
        </section>
      )}
    </main>
  );
}
