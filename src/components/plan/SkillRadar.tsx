'use client';

import type { SkillScoreDTO } from '@/lib/study-plan/curriculum';
import { SKILL_LABELS } from '@/lib/study-plan/curriculum';
import { describeSuns } from '@/lib/scoring/suns';
import type { Skill } from '@/types/content';

const ALL_SKILLS: Skill[] = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'];

export default function SkillRadar({ scores }: { scores: SkillScoreDTO[] }) {
  const bySkill = new Map(scores.map((s) => [s.skill, s]));

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-extrabold">🌞 我的能力太陽</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {ALL_SKILLS.map((skill) => {
          const s = bySkill.get(skill);
          const suns = s?.suns ?? 0;
          const rate = Math.round((s?.achievement ?? 0) * 100);
          return (
            <div key={skill} className="kid-card !p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{SKILL_LABELS[skill]}</span>
                <span className="text-sm text-gray-500">{describeSuns(suns)}</span>
              </div>
              <div className="my-1 text-2xl tracking-widest">
                {'🌞'.repeat(suns)}
                <span className="opacity-25">{'🌞'.repeat(5 - suns)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div className="h-full bg-sky transition-all" style={{ width: `${rate}%` }} />
              </div>
              <p className="mt-1 text-right text-xs text-gray-500">達成率 {rate}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
