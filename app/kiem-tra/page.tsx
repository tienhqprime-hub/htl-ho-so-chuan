'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';

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

const processSteps = [
  'Tiếp nhận và phân loại tài liệu',
  'Đọc nội dung, dấu và chữ ký nhìn thấy được',
  'Đối chiếu tên, số, ngày tháng và số liệu',
  'Tìm điểm mâu thuẫn hoặc còn thiếu',
  'Chuẩn bị báo cáo có dẫn chứng',
];

const severityText: Record<Finding['severity'], string> = {
  CAO: 'Ưu tiên cao',
  'TRUNG BÌNH': 'Cần lưu ý',
  THẤP: 'Theo dõi',
  'THÔNG TIN': 'Thông tin',
};

export default function VerificationPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files]
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!files.length) {
      setError('Anh/chị vui lòng chọn ít nhất một tài liệu.');
      return;
    }

    setError('');
    setResult(null);
    setLoading(true);
    setStep(0);

    const timer = window.setInterval(() => {
      setStep((current) => Math.min(current + 1, processSteps.length - 1));
    }, 1400);

    try {
      const form = new FormData();
      files.forEach((file) => form.append('files', file));
      form.append('context', context);

      const response = await fetch('/api/verify', { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Hệ thống chưa xử lý được hồ sơ.');
      setResult(payload as Result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Đã có lỗi xảy ra.');
    } finally {
      window.clearInterval(timer);
      setLoading(false);
    }
  }

  return (
    <main className="shell narrow">
      <header className="topbar noPrint">
        <Link href="/" className="brand">HTL HỒ SƠ CHUẨN</Link>
        <span className="pilot">BẢN PILOT</span>
      </header>

      <section className="panel noPrint">
        <div className="eyebrow">PHIÊN KIỂM TRA MỚI</div>
        <h1>Xin chào, tôi sẽ cùng anh/chị rà soát bộ hồ sơ này.</h1>
        <p className="leadResult muted">
          Tôi chỉ nhận định từ những tài liệu được cung cấp. Khi chưa đủ bằng chứng, tôi sẽ nói rõ điều đó thay vì suy đoán.
        </p>

        <form onSubmit={submit}>
          <label className="upload">
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
              onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 8))}
            />
            <span>Chọn hoặc kéo tài liệu vào đây</span>
            <small>PDF, ảnh hoặc TXT · tối đa 8 tệp · mỗi tệp 12 MB</small>
          </label>

          {files.length > 0 && (
            <div className="fileList">
              {files.map((file) => (
                <div key={`${file.name}-${file.size}`}>
                  <strong>{file.name}</strong>
                  <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              ))}
              <div>
                <strong>Tổng cộng</strong>
                <span>{(totalSize / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            </div>
          )}

          <label className="field">
            Anh/chị đang nghi ngờ hoặc muốn làm rõ điều gì?
            <textarea
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="Ví dụ: Kiểm tra tên người ký, ngày phát hành, số tiền và sự thống nhất giữa hợp đồng với phụ lục."
            />
          </label>

          {error && <p className="error">{error}</p>}
          <button className="primary button" disabled={loading} type="submit">
            {loading ? 'HTL đang rà soát hồ sơ…' : 'Bắt đầu kiểm tra'}
          </button>
        </form>
      </section>

      {loading && (
        <section className="panel noPrint">
          <div className="eyebrow">HTL ĐANG SUY NGHĨ</div>
          <h2>{processSteps[step]}</h2>
          <div className="progressTrack"><span style={{ width: `${((step + 1) / processSteps.length) * 100}%` }} /></div>
          <p className="muted">Anh/chị vui lòng giữ trang này mở. Thời gian xử lý phụ thuộc số lượng và độ dài tài liệu.</p>
          <ol className="processList">
            {processSteps.map((item, index) => (
              <li className={index <= step ? 'done' : ''} key={item}>{item}</li>
            ))}
          </ol>
        </section>
      )}

      {result && (
        <section className="panel result">
          <div className="resultHead">
            <div>
              <div className="eyebrow">QUAN ĐIỂM CỦA HTL</div>
              <h2>{result.status}</h2>
            </div>
            <div className="score"><strong>{result.confidence}%</strong><span>Mức độ tự tin</span></div>
          </div>

          <p className="leadResult">{result.summary}</p>
          <div className="notice">Kết quả này hỗ trợ ra quyết định, không thay thế giám định, công chứng, cơ quan cấp phát hoặc tư vấn pháp lý.</div>

          <h3>Các điểm HTL đã phát hiện</h3>
          <div className="findings">
            {result.findings.map((finding, index) => (
              <article className="finding" key={`${finding.title}-${index}`}>
                <span className={`badge ${finding.severity.toLowerCase().replace(' ', '-')}`}>{severityText[finding.severity]}</span>
                <h3>{finding.title}</h3>
                <p><strong>Bằng chứng:</strong> {finding.evidence}</p>
                <p><strong>Nguồn:</strong> {finding.source}</p>
                <p><strong>Khuyến nghị:</strong> {finding.recommendation}</p>
              </article>
            ))}
          </div>

          <div className="twoCols">
            <div>
              <h3>Điều chưa thể kết luận</h3>
              <ul>{result.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div>
              <h3>Việc nên làm tiếp theo</h3>
              <ol>{result.nextSteps.map((item) => <li key={item}>{item}</li>)}</ol>
            </div>
          </div>

          <div className="actions noPrint">
            <button className="primary" onClick={() => window.print()}>In hoặc lưu PDF</button>
            <button className="primary secondary" onClick={() => { setResult(null); setFiles([]); setContext(''); }}>Kiểm tra bộ hồ sơ khác</button>
          </div>
        </section>
      )}
    </main>
  );
}
