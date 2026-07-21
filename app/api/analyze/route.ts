import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;

const resultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'confidence', 'summary', 'findings', 'limitations', 'nextSteps'],
  properties: {
    status: {
      type: 'string',
      enum: ['CÓ CƠ SỞ TIN CẬY', 'CẦN XÁC MINH THÊM', 'CÓ DẤU HIỆU BẤT THƯỜNG']
    },
    confidence: { type: 'integer', minimum: 0, maximum: 100 },
    summary: { type: 'string' },
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
          recommendation: { type: 'string' }
        }
      }
    },
    limitations: { type: 'array', items: { type: 'string' } },
    nextSteps: { type: 'array', items: { type: 'string' } }
  }
} as const;

type InputContent =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string; detail: 'high' }
  | { type: 'input_file'; filename: string; file_data: string };

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form.getAll('files').filter((value): value is File => value instanceof File);
    const context = String(form.get('context') || '').trim();

    if (!files.length) {
      return NextResponse.json({ error: 'Thiếu tài liệu cần kiểm tra.' }, { status: 400 });
    }
    if (files.length > 8) {
      return NextResponse.json({ error: 'Bản Pilot hỗ trợ tối đa 8 tệp mỗi phiên.' }, { status: 400 });
    }
    if (files.some((file) => file.size > MAX_FILE_BYTES)) {
      return NextResponse.json({ error: 'Mỗi tệp tối đa 12 MB trong bản Pilot.' }, { status: 400 });
    }
    if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) {
      return NextResponse.json({ error: 'Tổng dung lượng mỗi phiên tối đa 30 MB.' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json(mockResult(files, context));

    const content: InputContent[] = [
      {
        type: 'input_text',
        text: [
          'Hãy kiểm tra toàn diện các tài liệu đính kèm.',
          `Mục đích hoặc nghi ngờ của người dùng: ${context || 'Kiểm tra tổng thể tính nhất quán và độ tin cậy.'}`,
          'Yêu cầu: đối chiếu tên, số, ngày tháng, số liệu, chữ ký/dấu nhìn thấy được, thành phần hồ sơ, mâu thuẫn nội bộ và dấu hiệu cần xác minh.',
          'Mỗi phát hiện phải nêu nguồn theo tên tệp và trang/vị trí nếu xác định được.',
          'Không khẳng định tài liệu giả, gian lận hoặc có giá trị pháp lý tuyệt đối. Khi thiếu căn cứ, phải nói rõ giới hạn.'
        ].join('\n')
      }
    ];

    for (const file of files) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const mime = file.type || inferMime(file.name);
      if (mime.startsWith('text/')) {
        content.push({
          type: 'input_text',
          text: `\n--- TỆP: ${file.name} ---\n${bytes.toString('utf8').slice(0, 30000)}`
        });
      } else if (mime.startsWith('image/')) {
        content.push({
          type: 'input_image',
          image_url: `data:${mime};base64,${bytes.toString('base64')}`,
          detail: 'high'
        });
        content.push({ type: 'input_text', text: `Ảnh phía trên có tên tệp: ${file.name}` });
      } else if (mime === 'application/pdf') {
        content.push({
          type: 'input_file',
          filename: file.name,
          file_data: `data:application/pdf;base64,${bytes.toString('base64')}`
        });
      } else {
        return NextResponse.json({ error: `Định dạng chưa hỗ trợ: ${file.name}` }, { status: 415 });
      }
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5-mini',
        store: false,
        instructions: [
          'Bạn là HTL HỒ SƠ CHUẨN, trợ lý AI hỗ trợ kiểm tra độ tin cậy của hồ sơ.',
          'Ưu tiên sự thật, bằng chứng truy xuất được và sự thận trọng.',
          'Không thay thế giám định, công chứng, cơ quan cấp phát hoặc tư vấn pháp lý.',
          'Chỉ trả kết quả đúng schema.'
        ].join(' '),
        input: [{ role: 'user', content }],
        text: {
          format: {
            type: 'json_schema',
            name: 'document_verification_result',
            strict: true,
            schema: resultSchema
          }
        }
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      console.error('OpenAI error', payload);
      return NextResponse.json(
        { error: payload?.error?.message || 'Dịch vụ AI chưa xử lý được hồ sơ.' },
        { status: response.status }
      );
    }

    const outputText = extractOutputText(payload);
    if (!outputText) throw new Error('AI không trả kết quả có cấu trúc.');
    return NextResponse.json(JSON.parse(outputText));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Không thể xử lý phiên kiểm tra. Anh hãy thử lại.' }, { status: 500 });
  }
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

function inferMime(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.txt')) return 'text/plain';
  return 'application/octet-stream';
}

function mockResult(files: File[], context: string) {
  return {
    status: 'CẦN XÁC MINH THÊM',
    confidence: 72,
    summary: `Đã tiếp nhận ${files.length} tài liệu. Hệ thống đang chạy chế độ minh họa vì chưa cấu hình OPENAI_API_KEY. Luồng kiểm tra và báo cáo đã hoạt động.`,
    findings: [
      {
        severity: 'TRUNG BÌNH',
        title: 'Chưa kích hoạt phân tích AI thực tế',
        evidence: 'Các tệp đã được tiếp nhận nhưng chưa gửi đến mô hình phân tích.',
        source: files.map((file) => file.name).join(', '),
        recommendation: 'Thêm OPENAI_API_KEY vào Environment Variables của Vercel.'
      },
      {
        severity: 'THÔNG TIN',
        title: 'Mục tiêu kiểm tra đã được ghi nhận',
        evidence: context || 'Người dùng chưa nêu nghi ngờ cụ thể.',
        source: 'Thông tin do người vận hành nhập',
        recommendation: 'Nêu câu hỏi cụ thể để AI tập trung đối chiếu chính xác hơn.'
      }
    ],
    limitations: ['Đây là dữ liệu minh họa, chưa phải kết quả kiểm tra tài liệu thực tế.'],
    nextSteps: ['Kích hoạt OpenAI API', 'Chạy lại với cùng bộ hồ sơ', 'Người vận hành xác nhận trước khi sử dụng']
  };
}
