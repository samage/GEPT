import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const QuerySchema = z.object({
  weekNo: z.coerce.number().int().min(1).max(20).optional(),
  category: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parsed = QuerySchema.safeParse({
    weekNo: sp.get('weekNo') ?? undefined,
    category: sp.get('category') ?? undefined,
    limit: sp.get('limit') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query.' }, { status: 400 });
  }
  const { weekNo, category, limit } = parsed.data;

  const words = await prisma.word.findMany({
    where: {
      weekNo,
      category: category ? { name: category } : undefined,
    },
    take: limit,
    orderBy: { text: 'asc' },
    select: {
      id: true,
      text: true,
      ipa: true,
      phonemeMapping: true,
      audioUrl: true,
      weekNo: true,
    },
  });

  return NextResponse.json({ words });
}
