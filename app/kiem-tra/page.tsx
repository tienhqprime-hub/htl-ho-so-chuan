'use client';

import Link from 'next/link';
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

const processSteps = [
  'Tiếp nhận và phân loại tài liệu',
  'Đọc nội dung, dấu, chữ