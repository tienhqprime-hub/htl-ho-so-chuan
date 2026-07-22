'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AI_CLASSIFICATION_THRESHOLD,
  ChecklistSyncResult,
  DocumentClassification,
  saveVerificationHistory,
  syncUploadedFilesToChecklist,
  updateDossierStatus,
} from '../../lib/dossier-storage';

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
  documentClassifications: DocumentClassification[];
  findings: Finding[];
  limitations: string[];
  nextSteps: string[];
};

type DossierContext = {
  id: string;
  code: string;
  name: string;
  company: string;
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
  const [dossier, setDossier] = useState<DossierContext | null>(null);
  const [checklistSync, setChecklistSync] = useState<ChecklistSyncResult | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('dossierId') || '';
    if (!id) return;
    setDossier({
      id,
      code: params.get('code') || '',
      name: params.get('name') || '',
      company: params.get('company') || '',
    });
  }, []);

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
    setChecklistSync(null);
    setLoading(true);
    setStep(0);
    if (dossier) updateDossierStatus(dossier.id, 'Đang kiểm tra');

    const timer = window.setInterval(() => {
      setStep((current) => Math.min(current + 1, processSteps.length - 1));
    }, 1400);

    try {
      const form = new FormData();
      files.forEach((file) => form.append('files', file));
      form.append('context', context);

      const response = await fetch('/api/analyze', { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Hệ thống chưa xử lý được hồ sơ.');

      const completedResult = payload as Result;
      setResult(completedResult);

      if (dossier) {
        const fileNames = files.map((file) => file.name);
        saveVerificationHistory({
          id: crypto.randomUUID(),
          dossierId: dossier.id,
          dossierCode: dossier.code,
          dossierName: dossier.name,
          company: dossier.company,
          createdAt: new Date().toLocaleString('vi-VN'),
          fileNames,
          context,
          status: completedResult.status,
          confidence: completedResult.confidence,
          summary: completedResult.summary,
        });

        setChecklistSync(
          syncUploadedFilesToChecklist(
            dossier.id,
            fileNames,
            completedResult.documentClassifications || [],
          )
        );
        updateDossierStatus(
          dossier.id,
          completedResult.status === 'CÓ CƠ SỞ TIN CẬY' ? 'Hoàn thành' : 'Chờ bổ sung'
        );
      }
    } catch (caught) {
      if (dossier) updateDossierStatus(dossier.id, 'Chờ bổ sung');
      setError(caught instanceof Error ? caught.message : 'Đã có lỗi xảy ra.');
    } finally {
      window.clearInterval(timer);
      setLoading(false);
    }
  }

  function resetVerification() {
    setResult(null);
    setChecklistSync(null);
    setFiles([]);
    setContext('');
  }

  return (
    <main className="shell narrow">
      <header className="topbar noPrint">
        <Link href="/" className="brand">HTL HỒ SƠ CHUẨN</Link>
        <div className="actions">
          <Link className="primary secondary" href="/ho-so">Danh sách hồ sơ</Link>
          <span className="pilot">BẢN PILOT</span>
        </div>
      </header>

      <section className="panel noPrint">
        <div className="eyebrow">PHIÊN KIỂM TRA MỚI</div>
        <h1>Xin chào, tôi sẽ cùng anh/chị rà soát bộ hồ sơ này.</h1>
        <p className="leadResult muted">
          Tôi chỉ nhận định từ những tài liệu được cung cấp. Khi chưa đủ bằng chứng, tôi sẽ nói rõ điều đó thay vì suy đoán.
        </p>

        {dossier && (
          <div className="dossierContext">
            <div><small>HỒ SƠ ĐANG KIỂM TRA</small><strong>{dossier.code} · {dossier.name}</strong></div>
            <span>{dossier.company}</span>
          </div>
        )}

        {!dossier && (
          <div className="notice">
            Phiên này chưa gắn với hồ sơ quản lý. Kết quả vẫn hiển thị nhưng sẽ không được lưu vào lịch sử hồ sơ.
          </div>
        )}

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
              <div><strong>Tổng cộng</strong><span>{(totalSize / 1024 / 1024).toFixed(2)} MB</span></div>
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
            {processSteps.map((item, index) => <li className={index <= step ? 'done' : ''} key={item}>{item}</li>)}
          </ol>
        </section>
      )}

      {result && (
        <section className="panel result">
          <div className="resultHead">
            <div><div className="eyebrow">QUAN ĐIỂM CỦA HTL</div><h2>{result.status}</h2></div>
            <div className="score"><strong>{result.confidence}%</strong><span>Mức độ tự tin</span></div>
          </div>
          <p className="leadResult">{result.summary}</p>
          <div className="notice">Kết quả này hỗ trợ ra quyết định, không thay thế giám định, công chứng, cơ quan cấp phát hoặc tư vấn pháp lý.</div>
          {dossier && <p className="savedNotice">Đã lưu kết quả vào lịch sử hồ sơ {dossier.code}.</p>}

          {result.documentClassifications?.length > 0 && (
            <>
              <h3>AI đã phân loại tài liệu như thế nào?</h3>
              <div className="findings">
                {result.documentClassifications.map((classification, index) => {
                  const needsReview = classification.documentType === 'Chưa xác định' || classification.confidence < AI_CLASSIFICATION_THRESHOLD;
                  return (
                    <article className="finding" key={`${classification.fileName}-${index}`}>
                      <span className={`badge ${needsReview ? 'trung-bình' : 'thông-tin'}`}>
                        {needsReview ? 'Cần người dùng xác nhận' : 'Đủ ngưỡng tự động'}
                      </span>
                      <h3>{classification.fileName}</h3>
                      <p><strong>Loại tài liệu:</strong> {classification.documentType}</p>
                      <p><strong>Mức độ tin cậy:</strong> {classification.confidence}%</p>
                      <p><strong>Căn cứ nhận diện:</strong> {classification.evidence}</p>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          {dossier && checklistSync && (
            <div className="notice">
              <h3>Checklist hồ sơ đã được đối chiếu</h3>
              {checklistSync.updatedItemNames.length > 0 ? (
                <>
                  <p><strong>Các mục đã ghi nhận có tài liệu:</strong></p>
                  <ul>{checklistSync.updatedItemNames.map((item) => <li key={item}>{item}</li>)}</ul>
                </>
              ) : (
                <p>Chưa có tài liệu nào đạt đủ căn cứ để tự động cập nhật Checklist.</p>
              )}
              {checklistSync.reviewFileNames.length > 0 && (
                <>
                  <p><strong>Các tệp cần người dùng rà soát:</strong></p>
                  <ul>{checklistSync.reviewFileNames.map((item) => <li key={item}>{item}</li>)}</ul>
                </>
              )}
              {checklistSync.unmatchedFileNames.length > 0 && (
                <>
                  <p><strong>Các tệp chưa được AI hoặc tên tệp xác định:</strong></p>
                  <ul>{checklistSync.unmatchedFileNames.map((item) => <li key={item}>{item}</li>)}</ul>
                </>
              )}
              <p className="muted">
                HTL chỉ tự động cập nhật khi AI đạt từ {AI_CLASSIFICATION_THRESHOLD}% và nhận diện đúng một loại tài liệu trong Checklist. Việc ghi nhận chưa khẳng định tài liệu còn hiệu lực, đầy đủ hoặc hợp lệ.
              </p>
              <Link className="primary secondary" href={`/ho-so/${encodeURIComponent(dossier.id)}`}>
                Mở Checklist của hồ sơ
              </Link>
            </div>
          )}

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
            <div><h3>Điều chưa thể kết luận</h3><ul>{result.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div><h3>Việc nên làm tiếp theo</h3><ol>{result.nextSteps.map((item) => <li key={item}>{item}</li>)}</ol></div>
          </div>

          <div className="actions noPrint">
            <button className="primary" onClick={() => window.print()}>In hoặc lưu PDF</button>
            {dossier && <Link className="primary secondary" href={`/ho-so/${encodeURIComponent(dossier.id)}`}>Trở về hồ sơ</Link>}
            <button className="primary secondary" onClick={resetVerification}>Kiểm tra tài liệu khác</button>
          </div>
        </section>
      )}
    </main>
  );
}
