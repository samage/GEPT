import Link from 'next/link';

const cards = [
  {
    href: '/phonics',
    emoji: '🧱',
    title: '發音積木',
    desc: '把單字拆成自然發音積木，跟著示範音大聲讀，AI 幫你打分數！',
    color: 'bg-grass',
  },
  {
    href: '/exam',
    emoji: '📝',
    title: '英檢模擬',
    desc: '聽、說、讀、寫全題型練習，對標小學英檢官方題型。',
    color: 'bg-sky',
  },
  {
    href: '/plan',
    emoji: '🗺️',
    title: '20 週學習計畫',
    desc: '一週一週闖關，集滿太陽，看看自己的能力雷達圖！',
    color: 'bg-coral',
  },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="kid-card bg-gradient-to-br from-sunny to-amber-300 text-center text-amber-900">
        <h1 className="text-4xl font-extrabold drop-shadow sm:text-5xl">
          歡喜評量 · 自信成長
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg sm:text-xl">
          專為小學生打造的英檢練習樂園，從自然發音到聽說讀寫，一步步集滿太陽 🌞
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="kid-card group hover:-translate-y-1 transition">
            <div
              className={`mb-4 flex h-20 w-20 items-center justify-center rounded-kid text-4xl ${c.color}`}
            >
              {c.emoji}
            </div>
            <h2 className="text-2xl font-extrabold">{c.title}</h2>
            <p className="mt-2 text-base text-gray-600">{c.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
