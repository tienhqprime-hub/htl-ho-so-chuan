'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AuditEvent,
  EnterpriseMember,
  EnterpriseOrganization,
  EnterpriseRole,
  ROLE_PERMISSIONS,
  appendAuditEvent,
  ensureEnterpriseSeed,
  getRolePermissionSummary,
  readAuditEvents,
  readEnterpriseMembers,
  readOrganizations,
  writeEnterpriseMembers,
  writeOrganizations,
} from '../../lib/enterprise-governance';

const roles: EnterpriseRole[] = ['Quản trị hệ thống', 'Lãnh đạo', 'Chuyên viên', 'Kiểm soát', 'Chỉ xem'];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function EnterpriseAdministrationPage() {
  const [organizations, setOrganizations] = useState<EnterpriseOrganization[]>([]);
  const [members, setMembers] = useState<EnterpriseMember[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [activeTab, setActiveTab] = useState<'tong-quan' | 'thanh-vien' | 'phan-quyen' | 'nhat-ky'>('tong-quan');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureEnterpriseSeed();
    const organizationItems = readOrganizations();
    setOrganizations(organizationItems);
    setMembers(readEnterpriseMembers());
    setAudit(readAuditEvents());
    setSelectedOrganizationId(organizationItems[0]?.id || '');
    setReady(true);
  }, []);

  const selectedOrganization = organizations.find((item) => item.id === selectedOrganizationId) || organizations[0];
  const organizationMembers = useMemo(
    () => members.filter((item) => item.organizationId === selectedOrganization?.id),
    [members, selectedOrganization?.id]
  );
  const organizationAudit = useMemo(
    () => audit.filter((item) => item.organizationId === selectedOrganization?.id),
    [audit, selectedOrganization?.id]
  );

  const metrics = useMemo(() => ({
    organizations: organizations.length,
    activeMembers: members.filter((item) => item.status === 'Đang hoạt động').length,
    lockedMembers: members.filter((item) => item.status === 'Đã khóa').length,
    auditEvents: audit.length,
  }), [audit.length, members, organizations.length]);

  function refreshAudit() {
    setAudit(readAuditEvents());
  }

  function addOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const code = String(data.get('code') || '').trim();
    const name = String(data.get('name') || '').trim();
    if (!code || !name) return;

    const organization: EnterpriseOrganization = {
      id: crypto.randomUUID(),
      code,
      name,
      status: 'Hoạt động',
      createdAt: new Date().toISOString(),
    };
    const next = [organization, ...organizations];
    setOrganizations(next);
    writeOrganizations(next);
    setSelectedOrganizationId(organization.id);
    appendAuditEvent({
      organizationId: organization.id,
      actor: 'Quản trị HTL',
      actorRole: 'Quản trị hệ thống',
      action: 'Tạo tổ chức',
      targetType: 'Tổ chức',
      targetId: organization.id,
      description: `Tạo tổ chức ${organization.code} - ${organization.name}.`,
    });
    refreshAudit();
    form.reset();
  }

  function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrganization) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('memberName') || '').trim();
    const email = String(data.get('email') || '').trim();
    const role = String(data.get('role') || 'Chuyên viên') as EnterpriseRole;
    if (!name || !email) return;

    const member: EnterpriseMember = {
      id: crypto.randomUUID(),
      organizationId: selectedOrganization.id,
      name,
      email,
      role,
      status: 'Đang hoạt động',
      createdAt: new Date().toISOString(),
    };
    const next = [member, ...members];
    setMembers(next);
    writeEnterpriseMembers(next);
    appendAuditEvent({
      organizationId: selectedOrganization.id,
      actor: 'Quản trị HTL',
      actorRole: 'Quản trị hệ thống',
      action: 'Thêm thành viên',
      targetType: 'Thành viên',
      targetId: member.id,
      description: `Thêm ${member.name} với vai trò ${member.role}.`,
    });
    refreshAudit();
    form.reset();
  }

  function updateMember(member: EnterpriseMember, changes: Partial<EnterpriseMember>) {
    const next = members.map((item) => item.id === member.id ? { ...item, ...changes } : item);
    setMembers(next);
    writeEnterpriseMembers(next);

    if (changes.role && changes.role !== member.role) {
      appendAuditEvent({
        organizationId: member.organizationId,
        actor: 'Quản trị HTL',
        actorRole: 'Quản trị hệ thống',
        action: 'Đổi vai trò',
        targetType: 'Thành viên',
        targetId: member.id,
        description: `Đổi vai trò của ${member.name} từ ${member.role} sang ${changes.role}.`,
      });
    }
    if (changes.status && changes.status !== member.status) {
      appendAuditEvent({
        organizationId: member.organizationId,
        actor: 'Quản trị HTL',
        actorRole: 'Quản trị hệ thống',
        action: changes.status === 'Đã khóa' ? 'Khóa thành viên' : 'Mở khóa thành viên',
        targetType: 'Thành viên',
        targetId: member.id,
        description: `${changes.status === 'Đã khóa' ? 'Khóa' : 'Mở khóa'} tài khoản ${member.name}.`,
      });
    }
    refreshAudit();
  }

  if (!ready) {
    return <main className="shell"><section className="panel"><p>Đang tải Trung tâm Quản trị Doanh nghiệp…</p></section></main>;
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <Link className="brand" href="/">HTL HỒ SƠ CHUẨN</Link>
          <div className="tagline">Enterprise Administration Center</div>
        </div>
        <div className="actions">
          <Link className="primary secondary" href="/dashboard">Dashboard</Link>
          <Link className="primary secondary" href="/ho-so">Hồ sơ</Link>
        </div>
      </header>

      <section className="panel adminHero">
        <div>
          <div className="eyebrow">QUẢN TRỊ DOANH NGHIỆP</div>
          <h1>Quản lý tổ chức, thành viên, phân quyền và nhật ký kiểm toán</h1>
          <p className="leadResult muted">Lớp quản trị giúp HTL tiến tới mô hình nhiều doanh nghiệp, nhiều vai trò và kiểm soát trách nhiệm theo từng hành động.</p>
        </div>
        <div className="organizationPicker">
          <label>Đơn vị đang quản trị</label>
          <select value={selectedOrganizationId} onChange={(event) => setSelectedOrganizationId(event.target.value)}>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>{organization.code} · {organization.name}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="metricGrid">
        <article className="metricCard"><span>Tổ chức</span><strong>{metrics.organizations}</strong><small>Đang được quản lý</small></article>
        <article className="metricCard"><span>Thành viên hoạt động</span><strong>{metrics.activeMembers}</strong><small>Có thể truy cập hệ thống</small></article>
        <article className="metricCard"><span>Tài khoản đã khóa</span><strong>{metrics.lockedMembers}</strong><small>Đã ngừng quyền truy cập</small></article>
        <article className="metricCard"><span>Sự kiện kiểm toán</span><strong>{metrics.auditEvents}</strong><small>Đã ghi nhận cục bộ</small></article>
      </section>

      <nav className="adminTabs">
        <button className={activeTab === 'tong-quan' ? 'active' : ''} onClick={() => setActiveTab('tong-quan')}>Tổng quan</button>
        <button className={activeTab === 'thanh-vien' ? 'active' : ''} onClick={() => setActiveTab('thanh-vien')}>Thành viên</button>
        <button className={activeTab === 'phan-quyen' ? 'active' : ''} onClick={() => setActiveTab('phan-quyen')}>Phân quyền</button>
        <button className={activeTab === 'nhat-ky' ? 'active' : ''} onClick={() => setActiveTab('nhat-ky')}>Nhật ký kiểm toán</button>
      </nav>

      {activeTab === 'tong-quan' && (
        <>
          <section className="twoCols">
            <article className="panel">
              <div className="eyebrow">TỔ CHỨC HIỆN TẠI</div>
              <h2>{selectedOrganization?.name || 'Chưa có tổ chức'}</h2>
              {selectedOrganization && (
                <div className="organizationFacts">
                  <p><strong>Mã đơn vị:</strong> {selectedOrganization.code}</p>
                  <p><strong>Trạng thái:</strong> <span className="badge thông-tin">{selectedOrganization.status}</span></p>
                  <p><strong>Ngày tạo:</strong> {formatDate(selectedOrganization.createdAt)}</p>
                  <p><strong>Thành viên:</strong> {organizationMembers.length}</p>
                  <p><strong>Sự kiện kiểm toán:</strong> {organizationAudit.length}</p>
                </div>
              )}
            </article>

            <article className="panel">
              <div className="eyebrow">THÊM TỔ CHỨC</div>
              <h2>Khởi tạo đơn vị mới</h2>
              <form className="adminForm" onSubmit={addOrganization}>
                <label>Mã tổ chức<input name="code" placeholder="VD: HTL-002" required /></label>
                <label>Tên tổ chức<input name="name" placeholder="Tên doanh nghiệp hoặc đơn vị" required /></label>
                <button className="primary" type="submit">Tạo tổ chức</button>
              </form>
            </article>
          </section>

          <section className="panel">
            <div className="resultHead">
              <div><div className="eyebrow">PHÂN BỔ VAI TRÒ</div><h2>Cơ cấu thành viên của đơn vị</h2></div>
              <span className="badge">{organizationMembers.length} THÀNH VIÊN</span>
            </div>
            <div className="roleSummaryGrid">
              {roles.map((role) => {
                const count = organizationMembers.filter((member) => member.role === role).length;
                return <article key={role}><span>{role}</span><strong>{count}</strong><small>{getRolePermissionSummary(role).total} quyền</small></article>;
              })}
            </div>
          </section>
        </>
      )}

      {activeTab === 'thanh-vien' && (
        <section className="panel">
          <div className="resultHead">
            <div><div className="eyebrow">QUẢN LÝ THÀNH VIÊN</div><h2>{selectedOrganization?.name}</h2></div>
            <span className="badge">{organizationMembers.length} TÀI KHOẢN</span>
          </div>

          <form className="memberForm" onSubmit={addMember}>
            <input name="memberName" placeholder="Họ và tên" required />
            <input name="email" type="email" placeholder="Email" required />
            <select name="role" defaultValue="Chuyên viên">{roles.map((role) => <option key={role}>{role}</option>)}</select>
            <button className="primary" type="submit">Thêm thành viên</button>
          </form>

          <div className="memberList">
            {organizationMembers.map((member) => (
              <article className="memberCard" key={member.id}>
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.email}</span>
                  <small>Tham gia {formatDate(member.createdAt)}</small>
                </div>
                <select value={member.role} onChange={(event) => updateMember(member, { role: event.target.value as EnterpriseRole })}>
                  {roles.map((role) => <option key={role}>{role}</option>)}
                </select>
                <span className={`badge ${member.status === 'Đã khóa' ? 'cao' : 'thông-tin'}`}>{member.status}</span>
                <button className="primary secondary" type="button" onClick={() => updateMember(member, { status: member.status === 'Đã khóa' ? 'Đang hoạt động' : 'Đã khóa' })}>
                  {member.status === 'Đã khóa' ? 'Mở khóa' : 'Khóa'}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'phan-quyen' && (
        <section className="panel">
          <div className="eyebrow">MA TRẬN PHÂN QUYỀN RBAC</div>
          <h2>Quyền theo vai trò</h2>
          <p className="muted">Ma trận này là nền tảng kiểm soát truy cập. Khi kết nối Supabase Auth, quyền sẽ được thực thi ở cả giao diện và tầng dữ liệu.</p>
          <div className="permissionTableWrap">
            <table className="permissionTable">
              <thead><tr><th>Vai trò</th><th>Quản lý tổ chức</th><th>Quản lý thành viên</th><th>Tạo/sửa hồ sơ</th><th>Kiểm tra</th><th>Phê duyệt</th><th>Xuất báo cáo</th><th>Xem audit</th></tr></thead>
              <tbody>
                {roles.map((role) => {
                  const permissions = ROLE_PERMISSIONS[role];
                  const yes = (allowed: boolean) => allowed ? 'Có' : '—';
                  return (
                    <tr key={role}>
                      <th>{role}</th>
                      <td>{yes(permissions.includes('organization.manage'))}</td>
                      <td>{yes(permissions.includes('member.manage'))}</td>
                      <td>{yes(permissions.includes('dossier.create') || permissions.includes('dossier.edit'))}</td>
                      <td>{yes(permissions.includes('dossier.verify'))}</td>
                      <td>{yes(permissions.includes('dossier.approve'))}</td>
                      <td>{yes(permissions.includes('report.export'))}</td>
                      <td>{yes(permissions.includes('audit.view'))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'nhat-ky' && (
        <section className="panel">
          <div className="resultHead">
            <div><div className="eyebrow">AUDIT TRAIL</div><h2>Nhật ký hoạt động của {selectedOrganization?.name}</h2></div>
            <span className="badge">{organizationAudit.length} SỰ KIỆN</span>
          </div>
          {!organizationAudit.length && <div className="emptyState">Chưa có sự kiện nào được ghi nhận cho tổ chức này.</div>}
          <div className="auditList">
            {organizationAudit.map((event) => (
              <article className="auditCard" key={event.id}>
                <div className="auditTime"><strong>{formatDate(event.createdAt)}</strong><span>{event.actorRole}</span></div>
                <div><strong>{event.action}</strong><p>{event.description}</p><small>{event.actor} · {event.targetType} · {event.targetId}</small></div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="panel governanceNotice">
        <div className="eyebrow">TRẠNG THÁI TRIỂN KHAI</div>
        <h2>Nền tảng quản trị đã sẵn sàng về mô hình nghiệp vụ</h2>
        <p>Dữ liệu hiện vẫn lưu trên trình duyệt của bản pilot. Bước tiếp theo cần chuyển tổ chức, thành viên, vai trò và nhật ký sang Supabase để nhiều người dùng có thể làm việc đồng thời, đăng nhập an toàn và bảo toàn Audit Trail trên máy chủ.</p>
      </section>

      <style jsx>{`
        .adminHero { display:flex; justify-content:space-between; gap:28px; align-items:center; }
        .organizationPicker { min-width:300px; }
        .organizationPicker label, .organizationPicker select { display:block; width:100%; }
        .organizationPicker label { font-weight:700; margin-bottom:8px; }
        .metricGrid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin:18px 0; }
        .metricCard { padding:18px; border:1px solid rgba(120,120,120,.22); border-radius:16px; }
        .metricCard span,.metricCard strong,.metricCard small { display:block; }
        .metricCard strong { font-size:2rem; margin:8px 0; }
        .metricCard small { opacity:.7; }
        .adminTabs { display:flex; gap:8px; margin:0 0 18px; padding:8px; border:1px solid rgba(120,120,120,.22); border-radius:16px; overflow-x:auto; }
        .adminTabs button { border:0; background:transparent; color:inherit; padding:12px 16px; border-radius:12px; cursor:pointer; white-space:nowrap; font-weight:700; }
        .adminTabs button.active { background:rgba(120,120,120,.16); }
        .adminForm { display:grid; gap:14px; }
        .adminForm label { display:grid; gap:7px; font-weight:700; }
        .roleSummaryGrid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; }
        .roleSummaryGrid article { padding:16px; border:1px solid rgba(120,120,120,.2); border-radius:14px; }
        .roleSummaryGrid span,.roleSummaryGrid strong,.roleSummaryGrid small { display:block; }
        .roleSummaryGrid strong { font-size:2rem; margin:8px 0; }
        .memberForm { display:grid; grid-template-columns:1fr 1fr 220px auto; gap:10px; margin:20px 0; }
        .memberList { display:grid; gap:10px; }
        .memberCard { display:grid; grid-template-columns:minmax(220px,1fr) 220px auto auto; gap:12px; align-items:center; padding:16px; border:1px solid rgba(120,120,120,.2); border-radius:15px; }
        .memberCard div span,.memberCard div small { display:block; opacity:.72; margin-top:4px; }
        .permissionTableWrap { overflow-x:auto; }
        .permissionTable { width:100%; border-collapse:collapse; min-width:900px; }
        .permissionTable th,.permissionTable td { padding:14px 12px; border-bottom:1px solid rgba(120,120,120,.18); text-align:center; }
        .permissionTable th:first-child { text-align:left; }
        .auditList { display:grid; gap:10px; }
        .auditCard { display:grid; grid-template-columns:210px 1fr; gap:18px; padding:16px; border-left:4px solid currentColor; background:rgba(120,120,120,.06); border-radius:10px; }
        .auditCard p { margin:5px 0; }
        .auditCard small,.auditTime span { opacity:.7; }
        .auditTime strong,.auditTime span { display:block; }
        .governanceNotice { border-width:2px; }
        @media (max-width:1050px) {
          .metricGrid { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .roleSummaryGrid { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .memberForm { grid-template-columns:1fr 1fr; }
          .memberCard { grid-template-columns:1fr 1fr; }
        }
        @media (max-width:680px) {
          .adminHero { flex-direction:column; align-items:stretch; }
          .organizationPicker { min-width:0; }
          .metricGrid,.roleSummaryGrid,.memberForm,.memberCard { grid-template-columns:1fr; }
          .auditCard { grid-template-columns:1fr; }
        }
      `}</style>
    </main>
  );
}
