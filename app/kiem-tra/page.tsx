'use client';

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
  reportId?: string;
  checkedAt?: string;
  model?: string;
};

function friendlyError(message: string) {
  const value = message.toLowerCase();
  if (value.includes('quota') || value.includes('billing')) return 'Tài khoản AI hiện không còn hạn mức xử lý. Chủ sở hữu vui lòng kiểm tra số dư API.';
  if (value.includes('rate limit')) return 'Dịch vụ AI đang quá tải