'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Dossier, readDossiers } from '../../../../lib/dossier-storage';
import {
  DossierWorkflow,
  WORKFLOW_PRIORITIES,
  WORKFLOW_STAGES,
  WorkflowPriority,
  WorkflowStage,
  getDeadlineState,
  getWorkflowProgress,
  moveWorkflowStage,
  readDossierWorkflow,
  writeDossierWorkflow,
} from '../../../../lib/dossier-workflow';

export default function DossierWorkflowPage() {
  const params = useParams<{ id: string }>();
  const dossierId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [workflow, setWorkflow] = useState<DossierWorkflow | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDossier(readDossiers().find((item) => item.id === dossierId) || null);
    setWorkflow(readDossierWorkflow(dossierId));
    setReady(true);
  }, [dossierId]);

  useEffect(() => {
    if (ready && workflow) writeDossierWorkflow(workflow);
  }, [ready, workflow]);

  const progress = useMemo(() => workflow ? getWorkflowProgress(workflow.stage) : 0, [workflow]);
  const deadline = useMemo(() => getDeadlineState(workflow?.dueDate || ''), [workflow?.dueDate]);

  function submitStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workflow) return;
    const data = new FormData(event.currentTarget);
    const stage = String(data.get('stage')) as WorkflowStage;
    const note = String(data.get('note') || '');
    const actor = String(data.get('actor') || dossier?.owner || 'Người xử lý');
    setWorkflow(moveWorkflowStage(workflow, stage, note, actor));
    event.currentTarget.reset();
  }

  if (!ready) return <main className="shell"><section className="panel"><p>Đang mở quy trình…</p></section></main>;

  if (!dossier || !workflow) {
    return (
      <main className="shell narrow">
        <section className="panel">
          <div className="eyebrow">KHÔNG TÌM THẤY HỒ SƠ</div>
          <h1>Không thể mở quy trình xử lý.</h1>
          <Link className="primary" href="/ho-so">Trở về danh sách hồ sơ</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <Link className="brand" href="/">HTL HỒ SƠ CHUẨN</Link>
          <div className="tagline">Điều hành quy trình xử lý hồ sơ</div>
        </div>
        <div className="actions">
          <Link className="primary secondary" href={`/ho-so/${encodeURIComponent(dossier.id)}`}>Chi tiết hồ sơ</Link>
          <Link className="primary secondary" href="/dashboard">Dashboard</Link>
        </div>
      </header>

      <section className="panel">
        <div className="resultHead">
          <div>
            <div className="eyebrow">WORKFLOW HỒ SƠ</div>
            <strong>{dossier.code}</strong>
            <h1>{dossier.name}</h1>
            <p className="muted">{dossier.company} · Phụ trách: {dossier.owner || 'Chưa phân công'}</p>
          </div>
          <div className="score"><strong>{progress}%</strong><span>Tiến độ quy trình</span></div>
        </div>

        <div className="progressTrack"><span style={{ width: `${progress}%` }} /></div>

        <div className="workflowSteps">
          {WORKFLOW_STAGES.map((stage, index) => {
            const activeIndex = WORKFLOW_STAGES.indexOf(workflow.stage);
            const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'waiting';
            return (
              <div className={`workflowStep ${state}`} key={stage}>
                <span>{index + 1}</span>
                <strong>{stage}</strong>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="resultHead">
          <div>
            <div className="eyebrow">ĐIỀU HÀNH HIỆN TẠI</div>
            <h2>{workflow.stage}</h2>
          </div>
          <span className={`badge ${deadline.tone}`}>{deadline.label}</span>
        </div>

        <div className="twoCols">
          <label>
            <strong>Mức độ ưu tiên</strong>
            <select value={workflow.priority} onChange={(event) => setWorkflow({ ...workflow, priority: event.target.value as WorkflowPriority, updatedAt: new Date().toISOString() })}>
              {WORKFLOW_PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
            </select>
          </label>
          <label>
            <strong>Thời hạn hoàn thành</strong>
            <input type="date" value={workflow.dueDate} onChange={(event) => setWorkflow({ ...workflow, dueDate: event.target.value, updatedAt: new Date().toISOString() })} />
          </label>
        </div>

        <label>
          <strong>Việc cần làm tiếp theo</strong>
          <textarea value={workflow.nextAction} onChange={(event) => setWorkflow({ ...workflow, nextAction: event.target.value, updatedAt: new Date().toISOString() })} />
        </label>

        <div className="notice">
          <h3>Kết luận điều hành</h3>
          <p>Hồ sơ đang ở bước <strong>{workflow.stage}</strong>, mức ưu tiên <strong>{workflow.priority}</strong>. {workflow.nextAction || 'Chưa xác định đầu việc tiếp theo.'}</p>
        </div>
      </section>

      <section className="panel">
        <div className="eyebrow">CHUYỂN BƯỚC XỬ LÝ</div>
        <h2>Cập nhật tiến trình hồ sơ</h2>
        <form className="workflowForm" onSubmit={submitStage}>
          <select name="stage" defaultValue={workflow.stage}>
            {WORKFLOW_STAGES.map((stage) => <option key={stage}>{stage}</option>)}
          </select>
          <input name="actor" defaultValue={dossier.owner} placeholder="Người thực hiện" />
          <textarea name="note" placeholder="Lý do chuyển bước, kết quả đã xử lý hoặc việc còn vướng..." />
          <button className="primary" type="submit">Ghi nhận chuyển bước</button>
        </form>
      </section>

      <section className="panel">
        <div className="resultHead">
          <div>
            <div className="eyebrow">NHẬT KÝ QUY TRÌNH</div>
            <h2>{workflow.events.length} lần cập nhật</h2>
          </div>
        </div>
        <div className="historyList">
          {workflow.events.map((event) => (
            <article className="finding" key={event.id}>
              <small>{new Date(event.createdAt).toLocaleString('vi-VN')}</small>
              <h3>{event.fromStage ? `${event.fromStage} → ${event.toStage}` : event.toStage}</h3>
              <p>{event.note}</p>
              <p className="muted">Người thực hiện: {event.actor}</p>
            </article>
          ))}
        </div>
      </section>

      <style jsx>{`
        .workflowSteps { display: grid; grid-template-columns: repeat(7, minmax(120px, 1fr)); gap: 10px; overflow-x: auto; margin-top: 22px; padding-bottom: 8px; }
        .workflowStep { min-width: 120px; border: 1px solid rgba(120,120,120,.28); border-radius: 16px; padding: 14px; display: grid; gap: 8px; }
        .workflowStep span { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; border: 1px solid currentColor; }
        .workflowStep.done { opacity: .75; }
        .workflowStep.active { border-width: 2px; box-shadow: 0 8px 24px rgba(0,0,0,.08); }
        .workflowStep.waiting { opacity: .48; }
        label { display: grid; gap: 8px; }
        select, input, textarea { width: 100%; }
        .workflowForm { display: grid; gap: 12px; }
        .workflowForm textarea { min-height: 110px; }
      `}</style>
    </main>
  );
}
