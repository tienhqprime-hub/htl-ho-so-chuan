export type ExtractedDocumentData = {
  title: string | null;
  document_type: string | null;
  document_number: string | null;
  issuing_authority: string | null;
  signer: string | null;
  issued_at: string | null;
  effective_at: string | null;
  expires_at: string | null;
  enterprise_name: string | null;
  summary: string | null;
  keywords: string[];
  confidence: number;
  warnings: string[];
};

type ResponsesApiResult = {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

const EXTRACTION_PROMPT = `Bạn là chuyên gia kiểm tra hồ sơ pháp lý doanh nghiệp Việt Nam.
Hãy đọc toàn bộ tài liệu đính kèm và trích xuất đúng dữ liệu xuất hiện trong tài liệu.
Không suy đoán. Trường nào không xác định được phải trả về null.
Ngày phải dùng định dạng YYYY-MM-DD.
confidence là số từ 0 đến 1, phản ánh độ tin cậy tổng thể.
warnings là các dấu hiệu cần người dùng kiểm tra như bản scan mờ, thiếu trang, ngày mâu thuẫn hoặc thông tin không rõ.
Chỉ trả về JSON đúng theo schema được yêu cầu.`;

const EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: ['string', 'null'] },
    document_type: { type: ['string', 'null'] },
    document_number: { type: ['string', 'null'] },
    issuing_authority: { type: ['string', 'null'] },
    signer: { type: ['string', 'null'] },
    issued_at: { type: ['string', 'null'] },
    effective_at: { type: ['string', 'null'] },
    expires_at: { type: ['string', 'null'] },
    enterprise_name: { type: ['string', 'null'] },
    summary: { type: ['string', 'null'] },
    keywords: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'title',
    'document_type',
    'document_number',
    'issuing_authority',
    'signer',
    'issued_at',
    'effective_at',
    'expires_at',
    'enterprise_name',
    'summary',
    'keywords',
    'confidence',
    'warnings',
  ],
} as const;

function getOutputText(result: ResponsesApiResult): string {
  if (result.output_text) return result.output_text;
  for (const item of result.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && content.text) return content.text;
    }
  }
  throw new Error('OpenAI không trả về nội dung phân tích.');
}

export async function extractDocumentData(input: {
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
}): Promise<ExtractedDocumentData> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Chưa cấu hình OPENAI_API_KEY trên Vercel.');

  const model = process.env.OPENAI_DOCUMENT_MODEL || 'gpt-4.1-mini';
  const base64 = Buffer.from(input.bytes).toString('base64');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      store: false,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: EXTRACTION_PROMPT },
            {
              type: 'input_file',
              filename: input.filename,
              file_data: `data:${input.mimeType};base64,${base64}`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'document_extraction',
          strict: true,
          schema: EXTRACTION_SCHEMA,
        },
      },
    }),
  });

  const result = (await response.json()) as ResponsesApiResult;
  if (!response.ok) {
    throw new Error(result.error?.message || 'Không thể phân tích tài liệu bằng OpenAI.');
  }

  try {
    return JSON.parse(getOutputText(result)) as ExtractedDocumentData;
  } catch {
    throw new Error('Kết quả AI không đúng định dạng JSON mong đợi.');
  }
}
