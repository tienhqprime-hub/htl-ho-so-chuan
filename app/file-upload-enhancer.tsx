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

function renderControls(): void {
  const input = getUploadInput();
  const upload = input?.closest<HTMLLabelElement>('label.upload');
  if (!input || !upload) return;

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
    if (fileName) {
      fileName.title = fileName.textContent?.trim() || '';
    }

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
      const nextFiles = Array.from(currentInput.files || []).filter(
        (_, fileIndex) => fileIndex !== index,
      );
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
        position: absolute;
        top: 14px;
        right: 16px;
        min-width: 58px;
        padding: 7px 11px;
        border: 1px solid #d8e0e8;
        border-radius: 999px;
        background: #fff;
        color: #26364b;
        font-size: 12px;
        font-weight: 900;
        line-height: 1;
        text-align: center;
        box-shadow: 0 4px 14px rgba(23,32,51,.08);
      }
      .fileList .smartFileRow {
        display: grid;
        grid-template-columns: minmax(0,1fr) auto auto;
        align-items: center;
        gap: 12px;
      }
      .fileList .smartFileRow > strong {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .fileRowActions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .fileActionButton {
        border: 1px solid #cfd8e2;
        border-radius: 9px;
        background: #fff;
        color: #26364b;
        padding: 7px 10px;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        white-space: nowrap;
      }
      .fileActionButton:hover { background: #f7f9fb; border-color: #8798aa; }
      .fileActionDanger { color: #a32218; border-color: #efc4c0; background: #fff8f7; }
      @media (max-width: 640px) {
        .fileList .smartFileRow { grid-template-columns: minmax(0,1fr) auto; }
        .fileList .smartFileRow > span { grid-column: 1; }
        .fileRowActions { grid-column: 2; grid-row: 1 / span 2; flex-direction: column; }
      }
    `;
    document.head.appendChild(style);

    const handleChange = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.matches('label.upload input[type="file"]')) {
        scheduleRender();
      }
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
