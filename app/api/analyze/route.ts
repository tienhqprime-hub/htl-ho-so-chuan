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
        'NHIỆM VỤ CỐT LÕI: Sau khi nhận tệp, phải xác định đúng một trong hai quy trình nghiệp vụ chính của HTL.',
        'QUY TRÌNH SỬA TÀI LIỆU: áp dụng cho tài liệu có thể cập nhật. Mục tiêu là làm rõ tài liệu cần sửa chỗ nào để đúng, rõ và sử dụng được. Mỗi finding phải chỉ rõ nội dung hiện tại, nội dung đề nghị sửa và lý do. recommendation phải là câu hoặc nội dung thay thế cụ thể khi có đủ căn cứ, không chỉ nói chung chung “cần chỉnh sửa”.',
        'QUY TRÌNH LÀM RÕ HỒ SƠ: áp dụng cho hồ sơ chính thức. Mục tiêu là làm rõ hồ sơ đang vướng ở điểm nào: thiếu gì, sai gì, không thống nhất ở đâu, chưa đủ căn cứ gì và cần xử lý theo thủ tục nào. Không viết lại hoặc đề nghị sửa trực tiếp bản gốc đã ký, đóng dấu, phát hành hay xác nhận.',
        'Nếu bộ tệp có cả hai bản chất, chọn workflowMode HỖN HỢP và xử lý từng tệp theo đúng bản chất. Nếu chưa đủ căn cứ, chọn CHƯA XÁC ĐỊNH.',
        `Vấn đề người dùng cần làm rõ: ${context || 'Kiểm tra tổng thể, chỉ ra điểm cần sửa hoặc điểm hồ sơ đang vướng và việc cần làm tiếp theo.'}`,
        `Danh mục tệp:\n${fileManifest}`,
        'BƯỚC 1 — NHẬN DIỆN: Với từng tệp, xác định documentType, objectNature và handlingPrinciple; sau đó chọn workflowMode cho toàn bộ phiên.',
        'HỒ SƠ CHÍNH THỨC là bằng chứng hoặc bản ghi của sự việc/giao dịch đã được phát hành, ký, đóng dấu, phê duyệt hoặc xác nhận; ví dụ hóa đơn đã phát hành, hợp đồng đã ký, biên bản đã ký, quyết định, giấy phép, chứng từ giao nhận.',
        'TÀI LIỆU CÓ THỂ CẬP NHẬT là nội dung dùng để soạn thảo, hướng dẫn, vận hành hoặc cải tiến; ví dụ dự thảo, quy trình, hướng dẫn, quy định nội bộ, biểu mẫu chưa phát hành.',
        'Không suy đoán trạng thái chỉ từ tên tệp. Nếu không đủ dấu hiệu, chọn CHƯA XÁC ĐỊNH.',
        'BƯỚC 2 — PHÂN TÍCH ĐÚNG NHÁNH: Với SỬA TÀI LIỆU, ưu tiên lỗi nội dung, câu chữ, cấu trúc, logic, nghiệp vụ, thiếu thông tin và đề nghị viết đúng. Với LÀM RÕ HỒ SƠ, ưu tiên tính đầy đủ, nhất quán, bằng chứng, thẩm quyền, trạng thái và thủ tục xử lý.',
        'BƯỚC 3 — ĐỐI CHIẾU: Chỉ đánh dấu KHÔNG THỐNG NHẤT khi quan sát được ít nhất hai giá trị khác nhau từ nguồn cụ thể. Không đọc rõ, thiếu dữ liệu hoặc chỉ có một nguồn phải ghi CHƯA ĐỦ DỮ LIỆU.',
        'Không coi khác biệt viết hoa, dấu câu, viết tắt hoặc định dạng tương đương là mâu thuẫn khi vẫn là cùng một giá trị.',
        'BƯỚC 4 — KẾT LUẬN: Summary phải trả lời đúng nhánh. Với tài liệu: cần sửa gì để đúng. Với hồ sơ: đang vướng ở đâu và có thể tiếp tục hay phải tạm dừng để xác minh.',
        'BƯỚC 5 — LẬP KẾ HOẠCH XỬ LÝ: Tạo actionPlan theo đúng thứ tự thực hiện. Mỗi bước phải có mức ưu tiên LÀM NGAY, LÀM TIẾP hoặc THEO DÕI; nêu hành động cụ thể, lý do và bằng chứng dùng để xác nhận đã hoàn thành. Không lặp lại finding bằng câu chữ chung chung.',
        'BƯỚC 6 — ĐIỀU KIỆN HOÀN THÀNH: completionCondition phải nêu trạng thái kiểm chứng được để biết khi nào tài liệu có thể sử dụng hoặc hồ sơ có thể tiếp tục xử lý; không khẳng định đủ điều kiện pháp lý tuyệt đối khi chưa có căn cứ.',
        'BƯỚC 7 — LƯU VÀ TRẢ KẾT QUẢ: Kết quả phải đủ rõ để hệ thống lưu lịch sử và người dùng có thể thực hiện ngay theo thứ tự ưu tiên.',
        'Mỗi nguồn theo mẫu “Tên tệp – trang/vị trí”. Nếu không xác định được trang, ghi vị trí quan sát được; không tự tạo số trang.',
        'Không biến thiếu hồ sơ thành bằng chứng gian lận. Không khẳng định thật/giả, gian lận, hiệu lực pháp lý hoặc trách nhiệm pháp lý tuyệt đối.',
        'Confidence phản ánh độ đầy đủ và rõ của bằng chứng, không phải xác suất tài liệu thật.',
      ].join('\n\n'),
    }];

    for (const file of files) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const mime = inferMime(file.name, file.type);
      const filename = safeName(file.name);
      if (mime === 'text/plain') {
        content.push({ type: 'input_text', text: `\n--- TỆP VĂN BẢN: ${filename} ---\n${bytes.toString('utf8').slice(0, 50000)}` });
      } else if (mime.startsWith('image/')) {
        content.push({ type: 'input_image', image_url: `data:${mime};base64,${bytes.toString('base64')}`, detail: 'high' });
        content.push({ type: 'input_text', text: `Ảnh ngay phía trên là tệp: ${filename}` });
      } else {
        content.push({ type: 'input_file', filename, file_data: `data:application/pdf;base64,${bytes.toString('base64')}` });
      }
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(55_000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5-mini',
        store: false,
        instructions: [
          'Bạn là HTL HỒ SƠ CHUẨN.',
          'Sau khi nhận tệp, bắt buộc chọn đúng quy trình: sửa tài liệu để viết đúng hoặc làm rõ hồ sơ đang vướng ở đâu.',
          'Tài liệu có thể cập nhật thì đề xuất sửa cụ thể. Hồ sơ chính thức thì không tự ý sửa bản gốc, chỉ nêu điểm vướng và cách xử lý đúng.',
          'Sau phân tích, phải lập kế hoạch hành động có thứ tự ưu tiên và điều kiện hoàn thành kiểm chứng được.',
          'Luôn tách bằng chứng quan sát được, suy luận thận trọng và điều chưa thể kết luận.',
          'Không bịa nội dung, trang, cơ quan, quy định hoặc kết quả xác minh bên ngoài tài liệu.',
          'Dùng tiếng Việt rõ ràng, ngắn gọn, hướng đến hành động tiếp theo.',
          'Chỉ trả kết quả đúng JSON schema.',
        ].join(' '),
        input: [{ role: 'user', content }],
        text: { format: { type: 'json_schema', name: 'document_verification_result', strict: true, schema: resultSchema } },
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      console.error('OpenAI error', payload);
      return NextResponse.json({ error: friendlyApiError(response.status, payload?.error?.message) }, { status: response.status >= 500 ? 502 : response.status });
    }

    const outputText = extractOutputText(payload);
    if (!outputText) throw new Error('AI không trả kết quả có cấu trúc.');
    const result = JSON.parse(outputText);
    if (!isValidResult(result)) throw new Error('Kết quả AI không đạt cấu trúc yêu cầu.');
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
  return detail || 'Dịch vụ AI chưa xử lý được tài liệu.';
}

function isValidResult(value: any) {
  const statuses = ['CÓ CƠ SỞ TIN CẬY', 'CẦN XÁC MINH THÊM', 'CÓ DẤU HIỆU BẤT THƯỜNG'];
  const crossStatuses = ['THỐNG NHẤT', 'KHÔNG THỐNG NHẤT', 'CHƯA ĐỦ DỮ LIỆU'];
  return Boolean(
    value && workflowModes.includes(value.workflowMode) && statuses.includes(value.status) && Number.isInteger(value.confidence) && value.confidence >= 0 && value.confidence <= 100 &&
    typeof value.summary === 'string' && Array.isArray(value.documentClassifications) &&
    value.documentClassifications.every((item: any) => item && typeof item.fileName === 'string' && documentTypes.includes(item.documentType) && objectNatures.includes(item.objectNature) && Number.isInteger(item.confidence) && item.confidence >= 0 && item.confidence <= 100 && typeof item.evidence === 'string' && typeof item.handlingPrinciple === 'string') &&
    Array.isArray(value.crossChecks) && value.crossChecks.every((item: any) => item && crossCheckFields.includes(item.field) && crossStatuses.includes(item.status) && Array.isArray(item.values) && item.values.every((entry: any) => entry && typeof entry.value === 'string' && typeof entry.source === 'string') && typeof item.evidence === 'string' && typeof item.recommendation === 'string') &&
    Array.isArray(value.findings) && Array.isArray(value.limitations) && Array.isArray(value.nextSteps) &&
    Array.isArray(value.actionPlan) && value.actionPlan.every((item: any) => item && Number.isInteger(item.order) && item.order >= 1 && actionPriorities.includes(item.priority) && typeof item.action === 'string' && typeof item.reason === 'string' && typeof item.completionEvidence === 'string') &&
    typeof value.completionCondition === 'string',
  );
}

function mockResult(files: File[], context: string) {
  return {
    workflowMode: 'CHƯA XÁC ĐỊNH',
    status: 'CẦN XÁC MINH THÊM',
    confidence: 35,
    summary: `HTL đã tiếp nhận ${files.length} tài liệu nhưng chưa thể xác định quy trình sửa tài liệu hay làm rõ hồ sơ vì môi trường triển khai chưa cấu hình OPENAI_API_KEY.`,
    documentClassifications: files.map((file) => ({
      fileName: safeName(file.name),
      documentType: 'Chưa xác định',
      objectNature: 'CHƯA XÁC ĐỊNH',
      confidence: 0,
      evidence: 'Chưa có kết quả phân tích nội dung.',
      handlingPrinciple: 'Không sửa trực tiếp tệp gốc cho đến khi xác định đây là hồ sơ chính thức hay tài liệu có thể cập nhật.',
    })),
    crossChecks: crossCheckFields.map((field) => ({
      field,
      status: 'CHƯA ĐỦ DỮ LIỆU',
      values: [],
      evidence: 'Chưa có kết quả đọc nội dung để đối chiếu.',
      recommendation: 'Cấu hình OPENAI_API_KEY và chạy lại tài liệu.',
    })),
    findings: [
      {
        severity: 'TRUNG BÌNH',
        title: 'Chưa kích hoạt phân tích AI thực tế',
        evidence: 'Máy chủ không tìm thấy biến môi trường OPENAI_API_KEY.',
        source: files.map((file) => safeName(file.name)).join(', '),
        recommendation: 'Cấu hình OPENAI_API_KEY trên Vercel rồi chạy lại.',
      },
      {
        severity: 'THÔNG TIN',
        title: 'Vấn đề cần làm rõ đã được ghi nhận',
        evidence: context || 'Người dùng chưa nêu vấn đề cụ thể.',
        source: 'Thông tin người dùng nhập',
        recommendation: 'Nêu rõ tài liệu cần sửa gì hoặc hồ sơ đang vướng ở đâu để kết quả tập trung hơn.',
      },
    ],
    limitations: ['Đây là thông báo vận hành, chưa phải kết quả kiểm tra nội dung.'],
    nextSteps: ['Cấu hình khóa OpenAI trên Vercel', 'Triển khai lại ứng dụng', 'Chạy lại tài liệu và kiểm tra bằng chứng trước khi quyết định'],
    actionPlan: [
      {
        order: 1,
        priority: 'LÀM NGAY',
        action: 'Cấu hình biến môi trường OPENAI_API_KEY trên Vercel.',
        reason: 'HTL chưa thể đọc và phân tích nội dung tệp khi thiếu khóa API.',
        completionEvidence: 'Vercel hiển thị biến OPENAI_API_KEY cho môi trường triển khai đang sử dụng.',
      },
      {
        order: 2,
        priority: 'LÀM TIẾP',
        action: 'Triển khai lại ứng dụng và chạy lại phiên xử lý.',
        reason: 'Bản triển khai cần nạp biến môi trường mới.',
        completionEvidence: 'Phiên mới trả kết quả phân tích nội dung thay vì thông báo vận hành.',
      },
    ],
    completionCondition: 'HTL đọc được nội dung tệp, xác định được đúng quy trình và trả kết quả có bằng chứng để người dùng kiểm tra.',
  };
}
