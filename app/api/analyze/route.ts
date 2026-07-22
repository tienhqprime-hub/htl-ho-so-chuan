import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
]);

const documentTypes = [
  'Giấy chứng nhận đăng ký doanh nghiệp',
  'Điều lệ doanh nghiệp hiện hành',
  'Giấy tờ pháp lý của người đại diện',
  'Văn bản hoặc tài liệu làm căn cứ cho hồ sơ',
  'Chưa xác định',
] as const;

const crossCheckFields = [
  'Tên doanh nghiệp',
  'Mã số doanh nghiệp',
  'Người đại diện hoặc người ký',
  'Chức danh và thẩm quyền',
  'Địa chỉ trụ sở',
  'Vốn hoặc giá trị giao dịch',
  'Ngày tháng',
  'Số văn bản hoặc số hợp đồng',
  'Nội dung khác',
] as const;

const resultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'confidence', 'summary', 'documentClassifications', 'crossChecks', 'findings', 'limitations', 'nextSteps'],
  properties: {
    status: {
      type: 'string',
      enum: ['CÓ CƠ SỞ TIN CẬY', 'CẦN XÁC MINH THÊM', 'CÓ DẤU HIỆU BẤT THƯỜNG'],
    },
    confidence: { type: 'integer', minimum: 0, maximum: 100 },
    summary: { type: 'string' },
    documentClassifications: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['fileName', 'documentType', 'confidence', 'evidence'],
        properties: {
          fileName: { type: 'string' },
          documentType: { type: 'string', enum: documentTypes },
          confidence: { type: 'integer', minimum: 0, maximum: 100 },
          evidence: { type: 'string' },
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
              properties: {
                value: { type: 'string' },
                source: { type: 'string' },
              },
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
  },
} as const;

type InputContent =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string; detail: 'high' }
  | { type: 'input_file'; filename: string; file_data: string };

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form.getAll('files').filter((value): value is File => value instanceof File);
    const context = String(form.get('context') || '').trim().slice(0, 4000);

    const validationError = validateFiles(files);
    if (validationError) return NextResponse.json({ error: validationError.message }, { status: validationError.status });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json(mockResult(files, context));

    const fileManifest = files
      .map((file, index) => `${index + 1}. ${safeName(file.name)} (${inferMime(file.name, file.type)}, ${(file.size / 1024 / 1024).toFixed(2)} MB)`)
      .join('\n');

    const content: InputContent[] = [{
      type: 'input_text',
      text: [
        'NHIỆM VỤ: Rà soát bộ hồ sơ theo nguyên tắc bằng chứng trước, kết luận sau.',
        `Câu hỏi của người dùng: ${context || 'Kiểm tra tổng thể tính nhất quán, thành phần và các điểm cần xác minh.'}`,
        `Danh mục tài liệu:\n${fileManifest}`,
        'Hãy đối chiếu chéo giữa các tài liệu về: tên doanh nghiệp, mã số doanh nghiệp, người đại diện hoặc người ký, chức danh và thẩm quyền, địa chỉ, vốn hoặc giá trị giao dịch, ngày tháng, số văn bản hoặc số hợp đồng.',
        'Mỗi crossCheck chỉ được đánh dấu KHÔNG THỐNG NHẤT khi có ít nhất hai giá trị khác nhau quan sát được và phải ghi rõ từng giá trị cùng nguồn. Thiếu dữ liệu, không đọc rõ hoặc chỉ có một nguồn phải ghi CHƯA ĐỦ DỮ LIỆU.',
        'Không xem khác biệt cách viết hoa, dấu câu, viết tắt hoặc định dạng ngày tương đương là mâu thuẫn nếu vẫn nhận diện được cùng một giá trị.',
        'Với từng tệp, hãy phân loại vào đúng một nhóm documentType trong schema. Chỉ phân loại khi nội dung quan sát được có căn cứ; nếu không đủ căn cứ phải chọn Chưa xác định.',
        'Mỗi documentClassifications.evidence phải nêu dấu hiệu nội dung dùng để phân loại, không chỉ lặp lại tên tệp.',
        'Mỗi nguồn phải theo mẫu: “Tên tệp – trang/vị trí”. Nếu không xác định được trang, ghi đúng vị trí nhìn thấy thay vì tự tạo số trang.',
        'Không biến việc thiếu hồ sơ thành bằng chứng gian lận. Thiếu dữ liệu chỉ dẫn đến trạng thái CẦN XÁC MINH THÊM.',
        'Chỉ dùng trạng thái CÓ DẤU HIỆU BẤT THƯỜNG khi có mâu thuẫn hoặc dấu hiệu cụ thể quan sát được trong tài liệu.',
        'Không khẳng định thật/giả, gian lận, hiệu lực pháp lý hoặc trách nhiệm pháp lý tuyệt đối.',
        'Confidence phản ánh mức độ đầy đủ và rõ ràng của bằng chứng, không phải xác suất tài liệu thật.',
        'Summary phải đưa ra một kết luận tổng hợp dễ hiểu và lời khuyên nên tiếp tục, tạm dừng hay xác minh trước khi quyết định.',
      ].join('\n\n'),
    }];

    for (const file of files) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const mime = inferMime(file.name, file.type);
      const filename = safeName(file.name);

      if (mime === 'text/plain') {
        content.push({
          type: 'input_text',
          text: `\n--- TỆP VĂN BẢN: ${filename} ---\n${bytes.toString('utf8').slice(0, 50000)}`,
        });
      } else if (mime.startsWith('image/')) {
        content.push({
          type: 'input_image',
          image_url: `data:${mime};base64,${bytes.toString('base64')}`,
          detail: 'high',
        });
        content.push({ type: 'input_text', text: `Ảnh ngay phía trên là tệp: ${filename}` });
      } else {
        content.push({
          type: 'input_file',
          filename,
          file_data: `data:application/pdf;base64,${bytes.toString('base64')}`,
        });
      }
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(55_000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5-mini',
        store: false,
        instructions: [
          'Bạn là HTL HỒ SƠ CHUẨN, trợ lý AI hỗ trợ rà soát hồ sơ doanh nghiệp và pháp lý.',
          'Luôn phân biệt ba lớp: bằng chứng quan sát được, suy luận thận trọng và điều chưa thể kết luận.',
          'Không bịa nội dung, trang, cơ quan, quy định hoặc kết quả xác minh bên ngoài tài liệu.',
          'Ưu tiên ngôn ngữ tiếng Việt rõ ràng, trung tính và có hành động tiếp theo.',
          'Chỉ trả kết quả đúng JSON schema.',
        ].join(' '),
        input: [{ role: 'user', content }],
        text: {
          format: {
            type: 'json_schema',
            name: 'document_verification_result',
            strict: true,
            schema: resultSchema,
          },
        },
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      console.error('OpenAI error', payload);
      return NextResponse.json(
        { error: friendlyApiError(response.status, payload?.error?.message) },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }

    const outputText = extractOutputText(payload);
    if (!outputText) throw new Error('AI không trả kết quả có cấu trúc.');

    const result = JSON.parse(outputText);
    if (!isValidResult(result)) throw new Error('Kết quả AI không đạt cấu trúc báo cáo yêu cầu.');
    return NextResponse.json(result);
  } catch (error) {
    console.error('Analyze route error', error);
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return NextResponse.json(
      { error: timedOut ? 'Phiên phân tích quá thời gian. Anh/chị hãy giảm số lượng hoặc dung lượng tài liệu rồi thử lại.' : 'Không thể xử lý phiên kiểm tra. Anh/chị hãy thử lại.' },
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
  return detail || 'Dịch vụ AI chưa xử lý được hồ sơ.';
}

function isValidResult(value: any) {
  const statuses = ['CÓ CƠ SỞ TIN CẬY', 'CẦN XÁC MINH THÊM', 'CÓ DẤU HIỆU BẤT THƯỜNG'];
  const crossStatuses = ['THỐNG NHẤT', 'KHÔNG THỐNG NHẤT', 'CHƯA ĐỦ DỮ LIỆU'];
  return Boolean(
    value &&
    statuses.includes(value.status) &&
    Number.isInteger(value.confidence) &&
    value.confidence >= 0 && value.confidence <= 100 &&
    typeof value.summary === 'string' &&
    Array.isArray(value.documentClassifications) &&
    value.documentClassifications.every((item: any) =>
      item &&
      typeof item.fileName === 'string' &&
      documentTypes.includes(item.documentType) &&
      Number.isInteger(item.confidence) &&
      item.confidence >= 0 && item.confidence <= 100 &&
      typeof item.evidence === 'string'
    ) &&
    Array.isArray(value.crossChecks) &&
    value.crossChecks.every((item: any) =>
      item &&
      crossCheckFields.includes(item.field) &&
      crossStatuses.includes(item.status) &&
      Array.isArray(item.values) &&
      item.values.every((entry: any) => entry && typeof entry.value === 'string' && typeof entry.source === 'string') &&
      typeof item.evidence === 'string' &&
      typeof item.recommendation === 'string'
    ) &&
    Array.isArray(value.findings) &&
    Array.isArray(value.limitations) &&
    Array.isArray(value.nextSteps),
  );
}

function mockResult(files: File[], context: string) {
  return {
    status: 'CẦN XÁC MINH THÊM',
    confidence: 35,
    summary: `HTL đã tiếp nhận ${files.length} tài liệu nhưng chưa thể phân tích nội dung vì môi trường triển khai chưa cấu hình OPENAI_API_KEY. Chưa nên sử dụng kết quả này để quyết định về hồ sơ.`,
    documentClassifications: files.map((file) => ({
      fileName: safeName(file.name),
      documentType: 'Chưa xác định',
      confidence: 0,
      evidence: 'Chưa có kết quả phân tích nội dung vì máy chủ chưa cấu hình OPENAI_API_KEY.',
    })),
    crossChecks: crossCheckFields.map((field) => ({
      field,
      status: 'CHƯA ĐỦ DỮ LIỆU',
      values: [],
      evidence: 'Chưa có kết quả đọc nội dung tài liệu để thực hiện đối chiếu chéo.',
      recommendation: 'Cấu hình OPENAI_API_KEY và chạy lại cùng bộ hồ sơ.',
    })),
    findings: [
      {
        severity: 'TRUNG BÌNH',
        title: 'Chưa kích hoạt phân tích AI thực tế',
        evidence: 'Máy chủ không tìm thấy biến môi trường OPENAI_API_KEY nên tài liệu chưa được gửi đến mô hình phân tích.',
        source: files.map((file) => safeName(file.name)).join(', '),
        recommendation: 'Cấu hình OPENAI_API_KEY trong Vercel rồi chạy lại đúng bộ hồ sơ.',
      },
      {
        severity: 'THÔNG TIN',
        title: 'Câu hỏi kiểm tra đã được ghi nhận',
        evidence: context || 'Người dùng chưa nêu câu hỏi cụ thể.',
        source: 'Thông tin do người vận hành nhập',
        recommendation: 'Nêu rõ nội dung cần đối chiếu để báo cáo tập trung và hữu ích hơn.',
      },
    ],
    limitations: ['Đây là thông báo vận hành, không phải kết quả rà soát nội dung tài liệu.'],
    nextSteps: ['Cấu hình khóa OpenAI trên Vercel', 'Triển khai lại ứng dụng', 'Chạy lại cùng bộ hồ sơ và kiểm tra bằng chứng trước khi quyết định'],
  };
}
