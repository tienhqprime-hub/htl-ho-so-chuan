'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type Status = 'Mới tiếp nhận' | 'Đang kiểm tra' | 'Chờ bổ sung' | 'Hoàn thành' | 'Đã đóng';

type Dossier = {
  id: string;
  code: string;
  name: string;
  company: string;
  category: string;
  owner: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'htl-dossiers-v1';
const statuses