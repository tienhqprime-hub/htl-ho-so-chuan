'use client';

import { useEffect } from 'react';

const ACCEPTED_TYPES = '.pdf,.png,.jpg,.jpeg,.webp,.txt';
const MAX_FILES = 8;

function getUploadInput(): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>('label.upload input[type="file"]');
}

function updateInputFiles(input: HTMLInputElement, files: File[]): void {
  const transfer = new DataTransfer();
  files.slice(0, MAX_FILES).forEach((file) => transfer.items.add(file));
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function makeButton(label: string, className: string, onClick: () => void): HTMLButtonElement {
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

function enhanceUpload(): void {
  const input = getUploadInput();
  const upload = input?.closest<HTMLLabelElement>('label.upload');
  if (!input || !upload) return;

  let counter = upload.querySelector<HTMLSpanElement>('.uploadFileCounter');
  if (!counter) {
    counter = document.createElement('span');
    counter.className = 'uploadFileCounter';
    counter.setAttribute('aria-live', 'polite');
    upload.appendChild(counter);
  }

  const files = Array.from(input.files || []);
  counter.textContent = `📎 ${files.length}`;

  const fileList = document.querySelector<HTMLElement>('.fileList');
  if (!fileList) return;

  const rows = Array.from(fileList.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
  const totalRow = rows.find((row) => row.querySelector('strong')?.textContent?.trim() === 'Tổng cộng');
  if (totalRow) totalRow.style.display = 'none';

  const fileRows = rows.filter((row) => row !== totalRow);
  fileRows.forEach((row, index) => {
    if (row.querySelector('.fileRowActions')) return;

    row.classList.add('smartFileRow');
    const actions = document.createElement('div');
    actions.className = 'fileRowActions';

    const replaceButton = makeButton('Tải lại', 'fileActionButton', () => {
      const chooser = document.createElement('input');
      chooser.type = 'file';
      chooser.accept = ACCEPTED_TYPES;
      chooser.style.display = 'none';
      chooser.addEventListener('change', () => {
        const replacement = chooser.files?.[0];
        if (!replacement) return;
        const currentFiles = Array.from(getUploadInput()?.files || []);
        currentFiles[index] = replacement;
        const currentInput = getUploadInput();
        if (currentInput) updateInputFiles(currentInput, currentFiles);
        chooser.remove();
      }, { once: true });
      document.body.appendChild(chooser);
      chooser.click();
    });

    const deleteButton = makeButton('Xóa', 'fileActionButton fileActionDanger', () => {
      const currentInput = getUploadInput();
      if (!currentInput) return;
      const currentFiles = Array.from(currentInput.files || []).filter((_, fileIndex) => fileIndex !== index);
      updateInputFiles(currentInput, currentFiles);
    });

    actions.append(replaceButton, deleteButton);
    row.appendChild(actions);
  });
}

export default function FileUploadEnhancer() {
  useEffect(() => {
    const style = document.createElement('style');
    style.dataset.smartUpload = 'true';
    style.textContent = `
      label.upload { position: relative; }
      .uploadFileCounter {
        position: absolute;
        top: 14px;
        right: 16px;
        min-width: 48px;
        padding: 6px 10px;
        border: 1px solid #d8e0e8;
        border-radius: 999px;
        background: #ffffff;
        color: #3f4b5c;
        font-size: 13px;
        font-weight: 900;
        line-height: 1;
        text-align: center;
        box-shadow: 0 4px 14px rgba(23, 32, 51, .08);
      }
      .fileList .smartFileRow {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
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
        background: #ffffff;
        color: #26364b;
        padding: 7px 10px;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        transition: border-color .2s ease, background .2s ease, transform .2s ease;
      }
      .fileActionButton:hover {
        border-color: #8798aa;
        background: #f7f9fb;
        transform: translateY(-1px);
      }
      .fileActionDanger {
        color: #a32218;
        border-color: #efc4c0;
        background: #fff8f7;
      }
      @media (max-width: 640px) {
        .fileList .smartFileRow {
          grid-template-columns: minmax(0, 1fr) auto;
        }
        .fileList .smartFileRow > span { grid-column: 1; }
        .fileRowActions { grid-column: 2; grid-row: 1 / span 2; }
      }
    `;
    document.head.appendChild(style);

    enhanceUpload();
    const observer = new MutationObserver(() => enhanceUpload());
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('change', enhanceUpload, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('change', enhanceUpload, true);
      style.remove();
    };
  }, []);

  return null;
}
