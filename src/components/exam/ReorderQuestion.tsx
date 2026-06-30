'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { QuestionComponentProps } from './common';

function shuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const j = h % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Tile {
  id: string;
  word: string;
}

function SortableTile({ tile, locked }: { tile: Tile; locked: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tile.id,
    disabled: locked,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={[
        'kid-btn cursor-grab touch-none border-2 border-amber-400 bg-sunny text-amber-900',
        isDragging ? 'opacity-70 ring-4 ring-amber-300' : '',
      ].join(' ')}
    >
      {tile.word}
    </button>
  );
}

// 句子重組：黃色大積木拖曳排序，答案為組合後的字串
export default function ReorderQuestion({
  question,
  onAnswerChange,
  locked,
  result,
}: QuestionComponentProps) {
  const initial = useMemo<Tile[]>(() => {
    const words = (question.options as string[]) ?? [];
    return shuffle(words, question.id).map((word, i) => ({ id: `${question.id}-${i}`, word }));
  }, [question.id, question.options]);

  const [tiles, setTiles] = useState<Tile[]>(initial);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTiles((items) => {
      const oldIndex = items.findIndex((t) => t.id === active.id);
      const newIndex = items.findIndex((t) => t.id === over.id);
      const next = arrayMove(items, oldIndex, newIndex);
      onAnswerChange(next.map((t) => t.word).join(' '));
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-center text-xl font-bold">{question.questionText}</p>
      <p className="text-center text-sm text-gray-500">拖曳黃色積木，排出正確的句子</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tiles.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap justify-center gap-2 rounded-kid bg-cream p-4">
            {tiles.map((tile) => (
              <SortableTile key={tile.id} tile={tile} locked={locked} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {result && (
        <p className="text-center text-lg">
          正確句子：<span className="font-extrabold text-grass">{result.correctAnswer}</span>
        </p>
      )}
    </div>
  );
}
