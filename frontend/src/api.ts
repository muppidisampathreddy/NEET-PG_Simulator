export type Question = {
  id: number; section: number; text: string; image: string | null; options: string[];
  answer?: number; explanation?: string; // admin only
};
export type Exam = {
  id: number; title: string; sections: number; minutes_per_section: number;
  marks_correct: number; marks_wrong: number; published: boolean; question_count: number; questions?: Question[];
};
export type Result = {
  right: number; wrong: number; unattempted: number; score: number; max_score: number;
  key: Record<string, { answer: number; explanation: string }>;
};
export type ExamSettings = Pick<Exam, 'title' | 'sections' | 'minutes_per_section' | 'marks_correct' | 'marks_wrong'>;

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(path, init);
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(typeof d.detail === 'string' ? d.detail : `${r.status} ${r.statusText}`);
  }
  return r.status === 204 ? (undefined as T) : r.json();
}
const json = (method: string, body: unknown, headers: Record<string, string> = {}) =>
  ({ method, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const api = {
  exams: () => req<Exam[]>('/api/exams'),
  exam: (id: number) => req<Exam>(`/api/exams/${id}`),
  submit: (id: number, answers: Record<number, number | null>) => req<Result>(`/api/exams/${id}/submit`, json('POST', { answers })),
  setupNeeded: () => req<{ needed: boolean }>('/api/admin/setup').then(r => r.needed),
  setup: (password: string) => req<void>('/api/admin/setup', json('POST', { password })),
};

export function adminApi(key: string) {
  const headers = { 'X-Admin-Key': key };
  return {
    list: () => req<Exam[]>('/api/admin/exams', { headers }),
    get: (id: number) => req<Exam>(`/api/admin/exams/${id}`, { headers }),
    create: (body: ExamSettings) => req<Exam>('/api/admin/exams', json('POST', body, headers)),
    update: (id: number, body: Partial<ExamSettings & { published: boolean }>) => req<Exam>(`/api/admin/exams/${id}`, json('PATCH', body, headers)),
    remove: (id: number) => req<void>(`/api/admin/exams/${id}`, { method: 'DELETE', headers }),
    addQuestion: (examId: number, form: FormData) => req<Question>(`/api/admin/exams/${examId}/questions`, { method: 'POST', headers, body: form }),
    updateQuestion: (id: number, form: FormData) => req<Question>(`/api/admin/questions/${id}`, { method: 'PUT', headers, body: form }),
    removeQuestion: (id: number) => req<void>(`/api/admin/questions/${id}`, { method: 'DELETE', headers }),
  };
}
