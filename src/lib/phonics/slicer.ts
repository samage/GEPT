import type { PhonemeBlock } from '@/types/content';

// 長單字「絞肉機」：由 text(+ipa) 自動切出 phonemeMapping 積木。
// 這是「最佳努力」的啟發式工具，不規則字請用 phonics-overrides 覆蓋。

// 金牌字尾（獨立成一塊）
const SUFFIXES: { text: string; phoneme: string }[] = [
  { text: 'tion', phoneme: 'ʃən' },
  { text: 'sion', phoneme: 'ʒən' },
  { text: 'cian', phoneme: 'ʃən' },
  { text: 'ture', phoneme: 'tʃər' },
  { text: 'tious', phoneme: 'ʃəs' },
  { text: 'ing', phoneme: 'ɪŋ' },
];

const VOWEL_PHONEME: Record<string, string> = {
  ee: 'iː', ea: 'iː', oo: 'uː', ai: 'eɪ', ay: 'eɪ', oa: 'oʊ', ow: 'oʊ',
  ou: 'aʊ', oi: 'ɔɪ', oy: 'ɔɪ', ie: 'aɪ', ey: 'eɪ', au: 'ɔ', aw: 'ɔ',
  ar: 'ɑr', er: 'ər', ir: 'ɜr', or: 'ɔr', ur: 'ɜr',
  a: 'æ', e: 'ɛ', i: 'ɪ', o: 'ɑ', u: 'ʌ', y: 'i',
};

const CONSONANT_DIGRAPH: Record<string, string> = {
  ch: 'tʃ', sh: 'ʃ', th: 'θ', ph: 'f', wh: 'w', ck: 'k', ng: 'ŋ',
};

const CONSONANT: Record<string, string> = {
  b: 'b', c: 'k', d: 'd', f: 'f', g: 'g', h: 'h', j: 'dʒ', k: 'k',
  l: 'l', m: 'm', n: 'n', p: 'p', q: 'k', r: 'r', s: 's', t: 't',
  v: 'v', w: 'w', x: 'ks', z: 'z',
};

function consonantPhoneme(str: string): string {
  let out = '';
  let i = 0;
  while (i < str.length) {
    const two = str.slice(i, i + 2);
    if (CONSONANT_DIGRAPH[two]) {
      out += CONSONANT_DIGRAPH[two];
      i += 2;
    } else {
      out += CONSONANT[str[i]] ?? str[i];
      i += 1;
    }
  }
  return out;
}

function vowelPhoneme(group: string): string {
  return VOWEL_PHONEME[group] ?? VOWEL_PHONEME[group[0]] ?? group;
}

function sliceStem(stem: string): PhonemeBlock[] {
  if (!stem) return [];
  const vowelRe = /[aeiouy]+/g;
  const matches = [...stem.matchAll(vowelRe)];
  if (matches.length === 0) {
    return [{ text: stem, phoneme: consonantPhoneme(stem), isStressed: false }];
  }

  const blocks: PhonemeBlock[] = [];
  let cursor = 0;
  matches.forEach((m, idx) => {
    const onset = stem.slice(cursor, m.index);
    const vowel = m[0];
    const text = onset + vowel;
    const phoneme = consonantPhoneme(onset) + vowelPhoneme(vowel);
    blocks.push({ text, phoneme, isStressed: false });
    cursor = (m.index ?? 0) + vowel.length;
    void idx;
  });

  // 字尾剩餘子音併入最後一塊
  const tail = stem.slice(cursor);
  if (tail && blocks.length > 0) {
    const last = blocks[blocks.length - 1];
    last.text += tail;
    last.phoneme += consonantPhoneme(tail);
  }

  return blocks;
}

export interface SliceOptions {
  ipa?: string;
  override?: PhonemeBlock[];
}

export function sliceWord(text: string, options: SliceOptions = {}): PhonemeBlock[] {
  if (options.override && options.override.length > 0) return options.override;

  const w = text.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return [{ text, phoneme: text, isStressed: false }];

  let blocks: PhonemeBlock[] = [];
  const suffix = SUFFIXES.find((s) => w.length > s.text.length + 1 && w.endsWith(s.text));
  if (suffix) {
    const stem = w.slice(0, -suffix.text.length);
    blocks = [...sliceStem(stem), { text: suffix.text, phoneme: suffix.phoneme, isStressed: false }];
  } else {
    blocks = sliceStem(w);
  }

  // 重音啟發式：2 音節重前、3+ 音節重第二塊（僅近似，建議以 override 修正）
  if (blocks.length >= 2) {
    const stressIdx = blocks.length >= 3 ? 1 : 0;
    blocks[stressIdx].isStressed = true;
  }

  return blocks;
}
