import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  weekProgress,
  DEMO_USER_ID,
  type StudyPlanDTO,
  type PlanWeek,
} from '@/lib/study-plan/curriculum';

export const runtime = 'nodejs';

async function buildDTO(userId: string): Promise<StudyPlanDTO> {
  const plan = await prisma.studyPlan.findUnique({
    where: { userId_level: { userId, level: 'KIDS' } },
    include: { weeks: { orderBy: { weekNo: 'asc' }, include: { tasks: true } } },
  });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const skillScores = await prisma.skillScore.findMany({ where: { userId } });

  const weeks: PlanWeek[] = (plan?.weeks ?? []).map((w) => ({
    id: w.id,
    weekNo: w.weekNo,
    title: w.title,
    theme: w.theme,
    unlocked: w.unlocked,
    completed: w.completed,
    progress: w.progress,
    tasks: w.tasks.map((t) => ({
      id: t.id,
      skill: t.skill,
      title: t.title,
      targetCount: t.targetCount,
      doneCount: t.doneCount,
    })),
  }));

  return {
    userId,
    streak: user?.streak ?? 0,
    weeks,
    skillScores: skillScores.map((s) => ({
      skill: s.skill,
      suns: s.suns,
      achievement: s.achievement,
    })),
  };
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId') || DEMO_USER_ID;
  const dto = await buildDTO(userId);
  return NextResponse.json(dto);
}

const PostSchema = z.object({
  userId: z.string().min(1).max(128),
  taskId: z.string().min(1),
  increment: z.number().int().min(1).max(20).default(1),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
  }
  const { userId, taskId, increment } = parsed.data;

  const task = await prisma.weeklyTask.findUnique({
    where: { id: taskId },
    include: { week: { include: { tasks: true, plan: true } } },
  });
  if (!task || task.week.plan.userId !== userId) {
    return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
  }

  // 1) 更新任務完成度（不超過目標）
  const newDone = Math.min(task.targetCount, task.doneCount + increment);
  await prisma.weeklyTask.update({ where: { id: taskId }, data: { doneCount: newDone } });

  // 2) 重算該週進度
  const updatedTasks = task.week.tasks.map((t) =>
    t.id === taskId ? { ...t, doneCount: newDone } : t,
  );
  const progress = weekProgress(updatedTasks);
  const completed = progress >= 1;
  await prisma.studyWeek.update({
    where: { id: task.week.id },
    data: { progress, completed },
  });

  // 3) 完成則解鎖下一週
  if (completed) {
    await prisma.studyWeek.updateMany({
      where: { planId: task.week.planId, weekNo: task.week.weekNo + 1 },
      data: { unlocked: true },
    });
  }

  // 4) 更新連續打卡
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    const now = new Date();
    const last = user.lastActive;
    const sameDay = last && last.toDateString() === now.toDateString();
    if (!sameDay) {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const continued = last && last.toDateString() === yesterday.toDateString();
      await prisma.user.update({
        where: { id: userId },
        data: { streak: continued ? user.streak + 1 : 1, lastActive: now },
      });
    }
  }

  const dto = await buildDTO(userId);
  return NextResponse.json(dto);
}
