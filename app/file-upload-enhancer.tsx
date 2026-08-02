'use client';

import { useEffect } from 'react';

const ACCEPTED_TYPES = '.pdf,.png,.jpg,.jpeg,.webp,.txt';
const MAX_FILES = 8;

function getUploadInput(): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>('label.upload input[type="file"]');
}

function replaceInputFiles(input: HTMLInputElement, files: File[]): void {
  const transfer = new DataTransfer();
  files.slice(0, MAX_FILES).forEach((file) => transfer.items.add(file));
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function buildButton(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return button;
}

function ensureGuidancePanels(): void {
  const input = getUploadInput();
  const panel = input?.closest<HTMLElement>('section.panel');
  if (!panel || panel.querySelector('.releaseGuidance')) return;

  const guidance = document.createElement('section');
  guidance.className = 'releaseGuidance noPrint';
  guidance.innerHTML = `
    <article class="releaseCard releaseBenefit">
      <div class="releaseCardIcon">✓</div>
      <div>
        <h3>Lợi ích khi dùng HTL</h3>
        <ul>
          <li>Nhận diện đúng bản chất tài liệu</li>
          <li>Chỉ rõ điểm sai, thiếu hoặc chưa phù hợp</li>
          <li>Đề xuất hướng sửa và cách xử lý</li>
          <li>Tiết kiệm thời gian, giảm rủi ro</li>
        </ul>
      </div>
    </article>
    <article class="releaseCard releaseProcess">
      <div class="releaseCardIcon">3</div>
      <div>
        <h3>Quy trình 3 bước</h3>
        <ol>
          <li><strong>Tải tài liệu</strong><span>Chọn đúng tệp cần kiểm tra</span></li>
          <li><strong>HTL phân tích</strong><span>AI nhận diện và đề xuất xử lý</span></li>
          <li><strong>Nhận kết quả</strong><span>Báo cáo rõ ràng, dễ thực hiện</span></li>
        </ol>
      </div>
    </article>
  `;
  panel.appendChild(guidance);
}

function renderControls(): void {
  const input = getUploadInput();
  const upload = input?.closest<HTMLLabelElement>('label.upload');
  if (!input || !upload) return;

  ensureGuidancePanels();

  const fileCount = input.files?.length ?? 0;
  let counter = upload.querySelector<HTMLSpanElement>('.uploadFileCounter');
  if (!counter) {
    counter = document.createElement('span');
    counter.className = 'uploadFileCounter';
    counter.setAttribute('aria-live', 'polite');
    upload.appendChild(counter);
  }
  counter.textContent = `${fileCount} tệp`;
  counter.title = `Đã chọn ${fileCount}/${MAX_FILES} tệp`;

  const fileList = document.querySelector<HTMLElement>('.fileList');
  if (!fileList) return;

  const rows = Array.from(fileList.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );
  const totalRow = rows.find((row) => row.textContent?.includes('Tổng cộng'));
  if (totalRow) {
    totalRow.setAttribute('aria-hidden', 'true');
    totalRow.style.setProperty('display', 'none', 'important');
  }

  rows.filter((row) => row !== totalRow).forEach((row, index) => {
    row.classList.add('smartFileRow');
    row.querySelector('.fileRowActions')?.remove();

    const fileName = row.querySelector<HTMLElement>('strong');
    if (fileName) fileName.title = fileName.textContent?.trim() || '';

    const actions = document.createElement('div');
    actions.className = 'fileRowActions';

    const reload = buildButton('↻ Thay file', 'fileActionButton', () => {
      const chooser = document.createElement('input');
      chooser.type = 'file';
      chooser.accept = ACCEPTED_TYPES;
      chooser.hidden = true;
      chooser.addEventListener('change', () => {
        const replacement = chooser.files?.[0];
        const currentInput = getUploadInput();
        if (replacement && currentInput) {
          const nextFiles = Array.from(currentInput.files || []);
          nextFiles[index] = replacement;
          replaceInputFiles(currentInput, nextFiles);
        }
        chooser.remove();
      }, { once: true });
      document.body.appendChild(chooser);
      chooser.click();
    });

    const remove = buildButton('🗑 Xóa', 'fileActionButton fileActionDanger', () => {
      const currentInput = getUploadInput();
      if (!currentInput) return;
      const nextFiles = Array.from(currentInput.files || []).filter((_, fileIndex) => fileIndex !== index);
      replaceInputFiles(currentInput, nextFiles);
    });

    actions.append(reload, remove);
    row.appendChild(actions);
  });
}

function scheduleRender(): void {
  window.setTimeout(renderControls, 0);
  window.setTimeout(renderControls, 80);
}

export default function FileUploadEnhancer() {
  useEffect(() => {
    const style = document.createElement('style');
    style.dataset.smartUpload = 'release';
    style.textContent = `
      label.upload { position: relative; }
      .uploadFileCounter {
        position: absolute; top: 14px; right: 16px; min-width: 58px;
        padding: 7px 11px; border: 1px solid #d8e0e8; border-radius: 999px;
        background: #fff; color: #26364b; font-size: 12px; font-weight: 900;
        line-height: 1; text-align: center; box-shadow: 0 4px 14px rgba(23,32,51,.08);
      }
      .fileList .smartFileRow {
        display: grid; grid-template-columns: minmax(0,1fr) auto auto;
        align-items: center; gap: 12px;
      }
      .fileList .smartFileRow > strong {
        min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .fileRowActions { display: flex; align-items: center; gap: 8px; }
      .fileActionButton {
        border: 1px solid #cfd8e2; border-radius: 9px; background: #fff; color: #26364b;
        padding: 7px 10px; font-size: 12px; font-weight: 800; cursor: pointer; white-space: nowrap;
      }
      .fileActionButton:hover { background: #f7f9fb; border-color: #8798aa; }
      .fileActionDanger { color: #a32218; border-color: #efc4c0; background: #fff8f7; }
      .releaseGuidance {
        display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 22px;
      }
      .releaseCard {
        display: grid; grid-template-columns: 42px 1fr; gap: 14px; padding: 20px;
        border: 1px solid #dce5ef; border-radius: 18px; background: #fff;
        box-shadow: 0 10px 28px rgba(35,48,68,.06);
      }
      .releaseBenefit { background: linear-gradient(180deg,#f7fffb 0%,#fff 100%); }
      .releaseProcess { background: linear-gradient(180deg,#f7faff 0%,#fff 100%); }
      .releaseCardIcon {
        width: 42px; height: 42px; display: grid; place-items: center; border-radius: 14px;
        background: #10233f; color: #fff; font-weight: 900; font-size: 18px;
      }
      .releaseCard h3 { margin: 2px 0 12px; font-size: 18px; }
      .releaseCard ul, .releaseCard ol { margin: 0; padding-left: 20px; display: grid; gap: 9px; }
      .releaseCard li { color: #40516a; line-height: 1.45; }
      .releaseProcess li { display: grid; gap: 2px; }
      .releaseProcess li span { font-size: 13px; color: #718096; }
      @media (max-width: 760px) {
        .fileList .smartFileRow { grid-template-columns: minmax(0,1fr) auto; }
        .fileList .smartFileRow > span { grid-column: 1; }
        .fileRowActions { grid-column: 2; grid-row: 1 / span 2; flex-direction: column; }
        .releaseGuidance { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);

    const handleChange = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.matches('label.upload input[type="file"]')) scheduleRender();
    };

    document.addEventListener('change', handleChange, true);
    scheduleRender();

    return () => {
      document.removeEventListener('change', handleChange, true);
      style.remove();
    };
  }, []);

  return null;
}
