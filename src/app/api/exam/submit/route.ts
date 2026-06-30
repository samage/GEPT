import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { gradeAnswer } from '@/lib/exam/grade';
import { sunsFromRate, type SkillSummary } from '@/lib/scoring/suns';
import type { GradeResult } from '@/lib/exam/types';
import type { Skill } from '@/types/content';

export const runtime = 'nodejs';

const BodySchema = z.object({
  userId: z.string().max(128).optional(),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        answer: z.string().max(2000),
      }),
    )
    .min(1)
    .max(50),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
  }
  const { userId, answers } = parsed.data;

  const ids = answers.map((a) => a.questionId);
  const questions = await prisma.examQuestion.findMany({
    where: { id: { in: ids } },
  });
  const byId = new Map(questions.map((q) => [q.id, q]));

  const results: GradeResult[] = [];
  const affectedSkills = new Set<Skill>();

  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    const isCorrect = gradeAnswer(q.type, q.correctAnswer, a.answer);
    affectedSkills.add(q.skill);

    results.push({
      questionId: q.id,
      isCorrect,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    });

    if (userId) {
      await prisma.attempt
        .create({
          data: {
            userId,
            questionId: q.id,
            skill: q.skill,
            isCorrect,
            score: isCorrect ? 100 : 0,
          },
        })
        .catch(() => undefined);
    }
  }

  // 重算受影響分項的太陽數與達成率
  const summaries: SkillSummary[] = [];
  if (userId) {
    for (const skill of affectedSkills) {
      const grouped = await prisma.attempt.groupBy({
        by: ['isCorrect'],
        where: { userId, skill },
        _count: { _all: true },
      });
      const total = grouped.reduce((n, g) => n + g._count._all, 0);
      const correct = grouped.find((g) => g.isCorrect)?._count._all ?? 0;
      const achievement = total > 0 ? correct / total : 0;
      const suns = sunsFromRate(achievement);

      await prisma.skillScore.upsert({
        where: { userId_skill: { userId, skill } },
        update: { suns, achievement, totalAttempts: total, correctCount: correct },
        create: {
          userId,
          skill,
          suns,
          achievement,
          totalAttempts: total,
          correctCount: correct,
        },
      });

      summaries.push({ skill, suns, achievement, totalAttempts: total, correctCount: correct });
    }
  }

  const correctNow = results.filter((r) => r.isCorrect).length;
  return NextResponse.json({
    results,
    correct: correctNow,
    total: results.length,
    skillSummaries: summaries,
  });
}
