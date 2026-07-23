'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AI_CLASSIFICATION_THRESHOLD,
  ChecklistSyncResult,
  DocumentClassification,
  WorkflowMode,
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

type CrossCheckStatus = 'THỐNG NHẤT' | 'KHÔNG THỐNG NHẤT' | 'CHƯA ĐỦ DỮ LIỆU';

type CrossCheck = {
  field: string;
  status: CrossCheckStatus;
  values: Array<{ value: string; source: string }>;
  evidence: string;
  recommendation: string;
};

type Result = {
  workflowMode: WorkflowMode;
  status: 'CÓ CƠ SỞ TIN CẬY' | 'CẦN XÁC MINH THÊM' | 'CÓ DẤU HIỆU BẤT THƯỜNG';
  confidence: number;
  summary: string;
  documentClassifications: DocumentClassification[];
  crossChecks: CrossCheck[];
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
  'Đọc tệp người dùng vừa cung cấp',
  'Nhận diện đây là tài liệu cần sửa hay hồ sơ cần làm rõ',
  'Chọn đúng quy trình xử lý',
  'Làm rõ nội dung cần sửa hoặc điểm hồ sơ đang vướng',
  'Lưu và chuẩn bị kết quả để người dùng tiếp tục công việc',
];

const severityText: Record<Finding['severity'], string> = {
  CAO: 'Cần xử lý ngay',
  'TRUNG BÌNH': 'Cần làm rõ',
  THẤP: 'Nên kiểm tra thêm',
  'THÔNG TIN': 'Thông tin hỗ trợ',
};

const crossCheckBadge: Record<CrossCheckStatus, string> = {
  'THỐNG NHẤT': 'thông-tin',
  'KHÔNG THỐNG NHẤT': 'cao',
  'CHƯA ĐỦ DỮ LIỆU': 'trung-bình',
};

const workflowPresentation: Record<WorkflowMode, {
  eyebrow: string;
  title: string;
  findingsTitle: string;
  evidenceLabel: string;
  actionLabel: string;
  nextStepsTitle: string;
}> = {
  'SỬA TÀI LIỆU': {
    eyebrow: 'KẾT QUẢ SỬA TÀI LIỆU',
    title: 'Tài liệu cần sửa để đúng',
    findingsTitle: 'Những nội dung cần sửa',
    evidenceLabel: 'Nội dung hiện tại hoặc căn cứ',
    actionLabel: 'Đề nghị sửa',
    nextStepsTitle: 'Các bước hoàn thiện tài liệu',
  },
  'LÀM RÕ HỒ SƠ': {
    eyebrow: 'KẾT QUẢ LÀM RÕ HỒ SƠ',
    title: 'Hồ sơ đang vướng ở đâu',
    findingsTitle: 'Các điểm hồ sơ đang vướng',
    evidenceLabel: 'Bằng chứng',
    actionLabel: 'Cách xử lý',
    nextStepsTitle: 'Các bước xử lý hồ sơ',
  },
  'HỖN HỢP': {
    eyebrow: 'KẾT QUẢ XỬ LÝ HỖN HỢP',
    title: 'Tài liệu cần sửa và hồ sơ cần làm rõ',
    findingsTitle: 'Các nội dung cần xử lý theo từng bản chất',
    evidenceLabel: 'Bằng chứng hoặc nội dung hiện tại',
    actionLabel: 'Cách xử lý phù hợp',
    nextStepsTitle: 'Các bước thực hiện tiếp theo',
  },
  'CHƯA XÁC ĐỊNH': {
    eyebrow: 'KẾT QUẢ NHẬN DIỆN',
    title: 'Chưa đủ căn cứ chọn quy trình',
    findingsTitle: 'Các điểm cần xác minh trước',
    evidenceLabel: 'Căn cứ quan sát được',
    actionLabel: 'Việc cần làm',
    nextStepsTitle: 'Các bước xác minh tiếp theo',
  },
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

  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  const crossCheckSummary = useMemo(() => {
    const checks = result?.crossChecks || [];
    return {
      consistent: checks.filter((item) => item.status === 'THỐNG NHẤT').length,
      inconsistent: checks.filter((item) => item.status === 'KHÔNG THỐNG NHẤT').length,
      insufficient: checks.filter((item) => item.status === 'CHƯA ĐỦ DỮ LIỆU').length,
    };
  }, [result]);

  const presentation = result ? workflowPresentation[result.workflowMode] : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!files.length) {
      setError('Anh/chị vui lòng chọn ít nhất một tài liệu hoặc hồ sơ đang cần xử lý.');
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
      if (!response.ok) throw new Error(payload?.error || 'HTL chưa xử lý được tài liệu này.');

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
          workflowMode: completedResult.workflowMode,
          status: completedResult.status,
          confidence: completedResult.confidence,
          summary: completedResult.summary,
          crossChecks: completedResult.crossChecks || [],
        });

        setChecklistSync(
          syncUploadedFilesToChecklist(
            dossier.id,
            fileNames,
            completedResult.documentClassifications || [],
          ),
        );
        updateDossierStatus(
          dossier.id,
          completedResult.status === 'CÓ CƠ SỞ TIN CẬY' ? 'Hoàn thành' : 'Chờ bổ sung',
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
          <Link className="primary secondary" href="/ho-so">Lịch sử hồ sơ</Link>
          <span className="pilot">BẢN PILOT</span>
        </div>
      </header>

      <section className="panel noPrint">
        <div className="eyebrow">TIẾP NHẬN VÀ LÀM RÕ</div>
        <h1>Đưa tài liệu hoặc hồ sơ đang làm anh/chị mắc việc vào đây.</h1>
        <p className="leadResult muted">
          HTL sẽ nhận diện đúng bản chất: tài liệu thì giúp chỉ rõ cần sửa gì để đúng; hồ sơ thì giúp làm rõ đang vướng ở đâu và cần xử lý thế nào.
        </p>

        <div className="notice">
          <strong>Nguyên tắc xử lý:</strong> Hồ sơ chính thức đã ký, đóng dấu hoặc ban hành không được tự ý sửa trực tiếp. Tài liệu có thể cập nhật sẽ được chỉ rõ nội dung cần sửa và cách viết phù hợp.
        </div>

        {dossier && (
          <div className="dossierContext">
            <div><small>ĐANG GẮN VỚI HỒ SƠ</small><strong>{dossier.code} · {dossier.name}</strong></div>
            <span>{dossier.company}</span>
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
            <span>Chọn hoặc kéo tài liệu, hồ sơ đang cần làm rõ vào đây</span>
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
            Anh/chị đang cần sửa tài liệu hay đang vướng ở điểm nào trong hồ sơ?
            <textarea
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="Ví dụ: Hãy chỉ rõ hợp đồng dự thảo này cần sửa gì để đúng; hoặc hồ sơ này đang thiếu và không thống nhất ở điểm nào."
            />
          </label>

          {error && <p className="error">{error}</p>}
          <button className="primary button" disabled={loading} type="submit">
            {loading ? 'HTL đang xử lý…' : 'Làm rõ ngay'}
          </button>
        </form>
      </section>

      {loading && (
        <section className="panel noPrint">
          <div className="eyebrow">HTL ĐANG LÀM VIỆC</div>
          <h2>{processSteps[step]}</h2>
          <div className="progressTrack"><span style={{ width: `${((step + 1) / processSteps.length) * 100}%` }} /></div>
          <ol className="processList">
            {processSteps.map((item, index) => <li className={index <= step ? 'done' : ''} key={item}>{item}</li>)}
          </ol>
        </section>
      )}

      {result && presentation && (
        <section className="panel result">
          <div className="resultHead">
            <div>
              <div className="eyebrow">{presentation.eyebrow}</div>
              <h2>{presentation.title}</h2>
              <p><strong>Quy trình:</strong> {result.workflowMode}</p>
              <p><strong>Trạng thái:</strong> {result.status}</p>
            </div>
            <div className="score"><strong>{result.confidence}%</strong><span>Mức độ tin cậy</span></div>
          </div>
          <p className="leadResult">{result.summary}</p>

          {result.findings?.length > 0 && (
            <>
              <h3>{presentation.findingsTitle}</h3>
              <div className="findings">
                {result.findings.map((finding, index) => (
                  <article className="finding" key={`${finding.title}-${index}`}>
                    <span className={`badge ${finding.severity.toLowerCase().replace(' ', '-')}`}>{severityText[finding.severity]}</span>
                    <h3>{finding.title}</h3>
                    <p><strong>{presentation.evidenceLabel}:</strong> {finding.evidence}</p>
                    <p><strong>Nguồn:</strong> {finding.source}</p>
                    <p><strong>{presentation.actionLabel}:</strong> {finding.recommendation}</p>
                  </article>
                ))}
              </div>
            </>
          )}

          {result.crossChecks?.length > 0 && (
            <>
              <div className="resultHead">
                <div>
                  <div className="eyebrow">ĐỐI CHIẾU</div>
                  <h2>{crossCheckSummary.inconsistent > 0 ? `${crossCheckSummary.inconsistent} điểm không thống nhất` : 'Chưa phát hiện điểm không thống nhất'}</h2>
                </div>
              </div>
              <div className="twoCols">
                <div className="finding"><strong>{crossCheckSummary.consistent}</strong><p>Điểm thống nhất</p></div>
                <div className="finding"><strong>{crossCheckSummary.inconsistent}</strong><p>Điểm không thống nhất</p></div>
                <div className="finding"><strong>{crossCheckSummary.insufficient}</strong><p>Điểm chưa đủ dữ liệu</p></div>
              </div>
              <div className="findings">
                {result.crossChecks.map((check, index) => (
                  <article className="finding" key={`${check.field}-${index}`}>
                    <span className={`badge ${crossCheckBadge[check.status]}`}>{check.status}</span>
                    <h3>{check.field}</h3>
                    {check.values.length > 0 && (
                      <ul>{check.values.map((entry, valueIndex) => <li key={`${entry.value}-${valueIndex}`}><strong>{entry.value}</strong> — {entry.source}</li>)}</ul>
                    )}
                    <p><strong>Căn cứ:</strong> {check.evidence}</p>
                    <p><strong>Việc cần làm:</strong> {check.recommendation}</p>
                  </article>
                ))}
              </div>
            </>
          )}

          {result.documentClassifications?.length > 0 && (
            <>
              <h3>HTL xác định bản chất và loại tệp</h3>
              <div className="findings">
                {result.documentClassifications.map((classification, index) => {
                  const needsReview =
                    classification.documentType === 'Chưa xác định' ||
                    classification.objectNature === 'CHƯA XÁC ĐỊNH' ||
                    classification.confidence < AI_CLASSIFICATION_THRESHOLD;
                  return (
                    <article className="finding" key={`${classification.fileName}-${index}`}>
                      <span className={`badge ${needsReview ? 'trung-bình' : 'thông-tin'}`}>
                        {needsReview ? 'Cần xác nhận' : 'Đã nhận diện'}
                      </span>
                      <h3>{classification.fileName}</h3>
                      <p><strong>Bản chất:</strong> {classification.objectNature}</p>
                      <p><strong>Loại tài liệu:</strong> {classification.documentType}</p>
                      <p><strong>Mức độ tin cậy:</strong> {classification.confidence}%</p>
                      <p><strong>Căn cứ nhận diện:</strong> {classification.evidence}</p>
                      <p><strong>Nguyên tắc xử lý:</strong> {classification.handlingPrinciple}</p>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          <div className="twoCols">
            <div><h3>Điều chưa thể kết luận</h3><ul>{result.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div><h3>{presentation.nextStepsTitle}</h3><ol>{result.nextSteps.map((item) => <li key={item}>{item}</li>)}</ol></div>
          </div>

          {dossier && checklistSync && (
            <div className="notice">
              Kết quả và loại quy trình đã được lưu vào hồ sơ {dossier.code}. Việc lưu chỉ nhằm theo dõi lịch sử, không làm thay đổi bản gốc của hồ sơ đã ban hành.
            </div>
          )}

          <div className="notice">Kết quả hỗ trợ xử lý công việc, không thay thế cơ quan có thẩm quyền, giám định chuyên môn hoặc tư vấn pháp lý bắt buộc.</div>

          <div className="actions noPrint">
            <button className="primary" onClick={() => window.print()}>In hoặc lưu PDF</button>
            <button className="primary secondary" onClick={resetVerification}>Xử lý tệp khác</button>
            {dossier && <Link className="primary secondary" href={`/ho-so/${encodeURIComponent(dossier.id)}`}>Mở lịch sử hồ sơ</Link>}
          </div>
        </section>
      )}
    </main>
  );
}
