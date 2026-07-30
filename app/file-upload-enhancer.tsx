'use client';

import { useEffect } from 'react';

const ACCEPTED_TYPES = '.pdf,.png,.jpg,.jpeg,.webp,.txt';
const MAX_FILES = 8;

function getUploadInput(): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>('label.upload input[type="file"]');
}

function updateInputFiles(input: HTMLInputElement, files: File[]): void {
  const transfer = new