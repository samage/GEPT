import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  QuestionTypeSchema,
  SkillSchema,
  LevelSchema,
} from '@/types/content';
import type { ExamQuestionDTO } from '@/lib/exam/types';

export const runtime = 'nodejs';

const QuerySchema = z.object({
  type: QuestionTypeSchema.optional(),
  skill: SkillSchema.optional(),
  level: LevelSchema.optional(),
  weekNo: z.coerce.number().int().min(1).max(20).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parsed = QuerySchema.safeParse({
    type: sp.get('type') ?? undefined,
    skill: sp.get('skill') ?? undefined,
    level: sp.get('level') ?? undefined,
    weekNo: sp.get('weekNo') ?? undefined,
    limit: sp.get('limit') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query.' }, { status: 400 });
  }
  const { type, skill, level, weekNo, limit } = parsed.data;

  const questions = await prisma.examQuestion.findMany({
    where: { type, skill, level, weekNo },
    take: limit,
    orderBy: { createdAt: 'asc' },
    // 不選取 correctAnswer / explanation，避免答案外洩
    select: {
      id: true,
      type: true,
      skill: true,
      level: true,
      weekNo: true,
      questionText: true,
      options: true,
      audioUrl: true,
      imageUrl: true,
    },
  });

  const dto: ExamQuestionDTO[] = questions.map((q) => ({
    id: q.id,
    type: q.type,
    skill: q.skill,
    level: q.level,
    weekNo: q.weekNo,
    questionText: q.questionText,
    options: (q.options as unknown[]) ?? [],
    audioUrl: q.audioUrl,
    imageUrl: q.imageUrl,
  }));

  return NextResponse.json({ questions: dto });
}
