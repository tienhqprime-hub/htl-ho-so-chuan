import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;
const ALLOWED_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain']);

const documentTypes = [
  'Hóa đơn',
  'Hợp đồng',
  'Phụ lục hợp đồng',
  'Đơn đặt hàng',
  'Biên bản',
  'Quyết định',
  'Giấy phép hoặc giấy chứng nhận',
  'Chứng từ xuất nhập khẩu',
  'Quy trình làm việc',
  'Hướng dẫn công việc',
  'Quy định nội bộ',
  'Biểu mẫu',
  'Tài liệu tham khảo',
  'Loại khác',
  'Chưa xác định',
] as const;

const objectNatures = ['HỒ SƠ CHÍNH THỨC', 'TÀI LIỆU CÓ THỂ CẬP NHẬT', 'CHƯA XÁC ĐỊNH'] as const;
const workflowModes = ['SỬA TÀI LIỆU', 'LÀM RÕ HỒ SƠ', 'HỖN HỢP', 'CHƯA XÁC ĐỊNH'] as const;
const actionPriorities = ['LÀM NGAY', 'LÀM TIẾP', 'THEO DÕI'] as const;
const crossCheckFields = [
  'Tên tổ chức hoặc cá nhân',
  'Mã số hoặc định danh',
  'Người đại diện hoặc người ký',
  'Chức danh và thẩm quyền',
  'Địa chỉ',
  'Số tiền hoặc giá trị giao dịch',
  'Số lượng hàng hóa hoặc dịch vụ',
  'Ngày tháng',
  'Số văn bản, hợp đồng, hóa đơn hoặc đơn hàng',
  'Nội dung khác',
] as const;

const resultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['workflowMode', 'status', 'confidence', 'summary', 'documentClassifications', 'crossChecks', 'findings', 'limitations', 'nextSteps', 'actionPlan', 'completionCondition'],
  properties: {
    workflowMode: { type: 'string', enum: workflowModes },
    status: { type: 'string', enum: ['CÓ CƠ SỞ TIN CẬY', 'CẦN XÁC MINH THÊM', 'CÓ DẤU HIỆU BẤT THƯỜNG'] },
    confidence: { type: 'integer', minimum: 0, maximum: 100 },
    summary: { type: 'string' },
    documentClassifications: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['fileName', 'documentType', 'objectNature', 'confidence', 'evidence', 'handlingPrinciple'],
        properties: {
          fileName: { type: 'string' },
          documentType: { type: 'string', enum: documentTypes },
          objectNature: { type: 'string', enum: objectNatures },
          confidence: { type: 'integer', minimum: 0, maximum: 100 },
          evidence: { type: 'string' },
          handlingPrinciple: { type: 'string' },
        },
      },
    },
    crossChecks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['field', 'status', 'values', 'evidence', 'recommendation'],
        properties: {
          field: { type: 'string', enum: crossCheckFields },
          status: { type: 'string', enum: ['THỐNG NHẤT', 'KHÔNG THỐNG NHẤT', 'CHƯA ĐỦ DỮ LIỆU'] },
          values: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['value', 'source'],
              properties: { value: { type: 'string' }, source: { type: 'string' } },
            },
          },
          evidence: { type: 'string' },
          recommendation: { type: 'string' },
        },
      },
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'title', 'evidence', 'source', 'recommendation'],
        properties: {
          severity: { type: 'string', enum: ['CAO', 'TRUNG BÌNH', 'THẤP', 'THÔNG TIN'] },
          title: { type: 'string' },
          evidence: { type: 'string' },
          source: { type: 'string' },
          recommendation: { type: 'string' },
        },
      },
    },
    limitations: { type: 'array', items: { type: 'string' } },
    nextSteps: { type: 'array', items: { type: 'string' } },
    actionPlan: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['order', 'priority', 'action', 'reason', 'completionEvidence'],
        properties: {
          order: { type: 'integer', minimum: 1 },
          priority: { type: 'string', enum: actionPriorities },
          action: { type: 'string' },
          reason: { type: 'string' },
          completionEvidence: { type: 'string' },
        },
      },
    },
    completionCondition: { type: 'string' },
  },
} as const;

type InputContent =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string; detail: 'low' }
  | { type: 'input_file'; filename: string; file_data: string };

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form.getAll('files').filter((value): value is File => value instanceof File);
    const context = String(form.get('context') || '').trim().slice(0, 2000);
    const validationError = validateFiles(files);
    if (validationError) return NextResponse.json({ error: validationError.message }, { status: validationError.status });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Máy chủ chưa cấu hình OPENAI_API_KEY.' }, { status: 500 });

    const manifest = files.map((file, index) => `${index + 1}. ${safeName(file.name)} - ${(file.size / 1024 / 1024).toFixed(2)} MB`).join('\n');
    const content: InputContent[] = [{
      type: 'input_text',
      text: [
        'Phân tích ngắn gọn, chính xác và chỉ dựa trên tài liệu đính kèm.',
        'Xác định mỗi tệp là hồ sơ chính thức, tài liệu có thể cập nhật hoặc chưa xác định.',
        'Nếu là tài liệu có thể cập nhật: nêu chỗ cần sửa và đề nghị sửa cụ thể.',
        'Nếu là hồ sơ chính thức: không đề nghị sửa bản gốc; nêu điểm thiếu, sai, mâu thuẫn hoặc cần xác minh và việc cần làm tiếp.',
        'Chỉ ghi KHÔNG THỐNG NHẤT khi có ít nhất hai giá trị khác nhau nhìn thấy rõ.',
        'Giới hạn kết quả: tối đa 5 findings, 5 nextSteps và 5 actionPlan; câu ngắn, tránh lặp.',
        `Vấn đề cần làm rõ: ${context || 'Kiểm tra tổng thể.'}`,
        `Danh mục tệp:\n${manifest}`,
      ].join('\n'),
    }];

    for (const file of files) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const mime = inferMime(file.name, file.type);
      const filename = safeName(file.name);
      if (mime === 'text/plain') {
        content.push({ type: 'input_text', text: `--- ${filename} ---\n${bytes.toString('utf8').slice(0, 30000)}` });
      } else if (mime.startsWith('image/')) {
        content.push({ type: 'input_image', image_url: `data:${mime};base64,${bytes.toString('base64')}`, detail: 'low' });
        content.push({ type: 'input_text', text: `Ảnh phía trên là tệp ${filename}.` });
      } else {
        content.push({ type: 'input_file', filename, file_data: `data:application/pdf;base64,${bytes.toString('base64')}` });
      }
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(58_000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        store: false,
        max_output_tokens: 2600,
        instructions: 'Bạn là HTL HỒ SƠ CHUẨN. Trả lời tiếng Việt, ngắn gọn, hành động được, không bịa và chỉ xuất JSON đúng schema.',
        input: [{ role: 'user', content }],
        text: { format: { type: 'json_schema', name: 'document_verification_result', strict: true, schema: resultSchema } },
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      console.error('OpenAI error', response.status, payload);
      return NextResponse.json({ error: friendlyApiError(response.status, payload?.error?.message) }, { status: response.status >= 500 ? 502 : response.status });
    }

    const outputText = extractOutputText(payload);
    if (!outputText) throw new Error('AI không trả kết quả có cấu trúc.');
    const result = JSON.parse(outputText);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Analyze route error', error);
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return NextResponse.json(
      { error: timedOut ? 'Dịch vụ AI chưa hoàn tất trong thời gian xử lý của bản Pilot. Hệ thống không kết luận rằng tệp quá lớn; vui lòng thử lại sau ít phút.' : 'Không thể xử lý phiên kiểm tra. Anh/chị hãy thử lại.' },
      { status: timedOut ? 504 : 500 },
    );
  }
}

function validateFiles(files: File[]) {
  if (!files.length) return { message: 'Thiếu tài liệu cần kiểm tra.', status: 400 };
  if (files.length > 8) return { message: 'Bản Pilot hỗ trợ tối đa 8 tệp mỗi phiên.', status: 400 };
  if (files.some((file) => !file.size)) return { message: 'Có tệp rỗng hoặc không đọc được.', status: 400 };
  if (files.some((file) => file.size > MAX_FILE_BYTES)) return { message: 'Mỗi tệp tối đa 12 MB trong bản Pilot.', status: 400 };
  if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) return { message: 'Tổng dung lượng mỗi phiên tối đa 30 MB.', status: 400 };
  const unsupported = files.find((file) => !ALLOWED_MIME.has(inferMime(file.name, file.type)));
  if (unsupported) return { message: `Định dạng chưa hỗ trợ: ${safeName(unsupported.name)}`, status: 415 };
  return null;
}

function extractOutputText(payload: any): string {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  for (const item of payload?.output || []) {
    for (const part of item?.content || []) {
      if (part?.type === 'output_text' && typeof part.text === 'string') return part.text;
    }
  }
  return '';
}

function inferMime(name: string, supplied = '') {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.txt')) return 'text/plain';
  return supplied.toLowerCase() || 'application/octet-stream';
}

function safeName(name: string) {
  return name.replace(/[\r\n\t]/g, ' ').replace(/[<>]/g, '').trim().slice(0, 180) || 'tai-lieu';
}

function friendlyApiError(status: number, detail?: string) {
  if (status === 401) return 'Khóa OpenAI API chưa hợp lệ hoặc đã hết hiệu lực.';
  if (status === 429) return 'Dịch vụ AI đang quá tải hoặc đã đạt giới hạn sử dụng. Anh/chị hãy thử lại sau.';
  if (status >= 500) return 'Dịch vụ AI tạm thời chưa phản hồi. Anh/chị hãy thử lại.';
  return detail || 'Dịch vụ AI chưa xử lý được tài liệu.';
}
