# 小英檢樂學 (GEPT Kids App) — 專案規格書

2026 全功能英檢（小 GEPT / 全民英檢初級）全端練習 App。涵蓋自然發音音素積木、Azure 發音評測、聽說讀寫全題型模擬、20 週學習計畫與太陽數能力診斷。

---

## 1. 專案說明

- 對標 LTTC「小學英檢（GEPT Kids）」與「全民英檢初級」，CEFR A1。
- 成績採「太陽數（0–5）＋分項能力達成率」診斷回饋，**非及格制**（呼應官方簡章）。
- 兒童友善 UI：大字體、大按鈕、紅黃綠即時回饋、語音示範。

## 2. 技術棧

| 類別 | 技術 |
| --- | --- |
| 框架 | Next.js 14（App Router）+ TypeScript |
| 樣式 | Tailwind CSS 3 |
| 資料庫 | PostgreSQL + Prisma 5 |
| 語音評測 | Azure Cognitive Services Speech SDK（Pronunciation Assessment）|
| 語音合成 | 瀏覽器 SpeechSynthesis（示範）/ Azure TTS（離線生成示範音）|
| 限流 | 可插拔：記憶體（本機）/ Upstash Redis（正式）|
| 拖曳 | @dnd-kit（句子重組）|
| 驗證 | zod |
| 部署 | GitHub + Vercel（免費）|

## 3. 系統架構

```
瀏覽器 (兒童端)
  ├─ /phonics  發音積木 → 錄音(WAV/降噪/切靜音) → /api/assess-pronunciation → Azure 評測 → 音素對齊分數
  ├─ /exam     聽說讀寫題型 → /api/exam/questions(取題) /api/exam/submit(批改+計太陽數)
  └─ /plan     20 週地圖 + 能力雷達 → /api/study-plan(取/更新進度)
                    │
              Next.js Route Handlers (/api, nodejs runtime)
                    │  Prisma Client
                PostgreSQL
```

內容管線（離線）：`prisma/data/*.json`（單一真實來源）→ slicer/造題器/AI 生成 → `npm run db:seed` → DB。

## 4. 目錄結構

```
src/
  app/
    page.tsx                       首頁
    phonics/page.tsx               發音積木練習
    exam/page.tsx                  英檢模擬（?weekNo= 由學習地圖帶入）
    plan/page.tsx                  20 週學習計畫 + 能力診斷
    api/
      assess-pronunciation/route.ts  發音評測 + 限流
      words/route.ts                 取單字（含 phonemeMapping）
      exam/questions/route.ts        取題（不含答案）
      exam/submit/route.ts           批改 + 計太陽數
      study-plan/route.ts            取/更新 20 週計畫
  components/
    phonics/PhonicsBlock.tsx
    exam/*Question.tsx + ExamRunner.tsx
    plan/WeekMap.tsx, SkillRadar.tsx
  lib/
    prisma.ts
    rate-limit.ts
    azure/speech.ts, azure/phoneme-align.ts
    audio/audioRecorder.ts, audioCache.ts, tts.ts
    exam/grade.ts, types.ts, generators/index.ts
    scoring/suns.ts
    phonics/slicer.ts
    study-plan/curriculum.ts
  types/content.ts                 5/6/7 共用型別 + zod schema（單一真實來源）
prisma/
  schema.prisma
  seed.ts
  data/ words.json, questions.json, curriculum.json, phonics-overrides.json
scripts/ run-slicer, content-validate, content-build, gen-sentences, gen-images, gen-audio, gen-questions, csv-to-words
```

## 5. API 規格

### POST /api/assess-pronunciation
發音評測（multipart/form-data）。

- 請求：`audio`(WAV Blob, ≤2MB)、`wordText`(string)、`userId`(optional)
- 限流：每分鐘每 User/IP 20 次，超過回 `429 {"error":"Too many requests. Please try again later."}`
- 回應 200：
  ```json
  {
    "word": "station",
    "recognizedText": "station",
    "overall": { "accuracy": 92, "fluency": 88, "completeness": 100, "pronunciation": 90 },
    "scores": [{ "index": 0, "text": "st", "phoneme": "st", "score": 95 }],
    "remaining": 19
  }
  ```
- 其他狀態：`400` 輸入錯誤、`404` 查無單字、`503` Azure 未設定、`502` 評測失敗

### GET /api/words
- 查詢：`weekNo?`(1-20)、`category?`、`limit?`(≤100)
- 回應：`{ words: [{ id, text, ipa, phonemeMapping, audioUrl, weekNo }] }`

### GET /api/exam/questions
- 查詢：`type?`、`skill?`、`level?`、`weekNo?`、`limit?`(≤50)
- 回應：`{ questions: ExamQuestionDTO[] }`（**不含 correctAnswer / explanation**）

### POST /api/exam/submit
- 請求：`{ userId?, answers: [{ questionId, answer }] }`
- 回應：`{ results: [{ questionId, isCorrect, correctAnswer, explanation }], correct, total, skillSummaries: [{ skill, suns, achievement, totalAttempts, correctCount }] }`

### GET /api/study-plan?userId=
- 回應：`{ userId, streak, weeks: PlanWeek[], skillScores: [{ skill, suns, achievement }] }`

### POST /api/study-plan
- 請求：`{ userId, taskId, increment? }`
- 行為：更新任務完成度 → 重算週進度 → 完成則解鎖下一週 → 更新連續打卡
- 回應：同 GET 的最新計畫

### 題型答案格式（submit 的 answer 與 correctAnswer 慣例）
| 題型 | answer | correctAnswer |
| --- | --- | --- |
| MULTIPLE_CHOICE / WRITING_CLOZE / LISTENING_IMAGE | 選項字串 / label | 同左 |
| LISTENING_TF / READING_TF | "Y" / "N" | "Y" / "N" |
| SPELLING | 拼出的字串 | 單字 |
| SHORT_ANSWER | 句子（含關鍵字即可） | 關鍵答案 |
| WRITING_REORDER | 重組後句子 | 正解句子 |
| MATCHING | JSON `{left:right}` | JSON `{left:right}` |
| SPEAKING_* | "done"（參與計分） | — |

## 6. 資料庫 Schema 重點

- `PhonicsCategory` 1—N `Word`（`phonemeMapping` 為積木陣列 JSON）
- `ExamQuestion`（`type`/`skill`/`level`/`weekNo` + `options`/`correctAnswer`）
- `User` 1—N `StudyPlan` 1—N `StudyWeek` 1—N `WeeklyTask`（`WeeklyTaskQuestion` 多對多連結題目）
- `Attempt`（作答紀錄）、`SkillScore`（太陽數/達成率）、`Achievement`（徽章/打卡）

詳見 [prisma/schema.prisma](prisma/schema.prisma)。

## 7. 環境變數

見 [.env.example](.env.example)。重點：`DATABASE_URL`、`AZURE_SPEECH_KEY/REGION`、`UPSTASH_REDIS_REST_URL/TOKEN`、`RATE_LIMIT_PER_MINUTE`、`ALLOWED_ORIGINS`。
AI 生成腳本另需 `OPENAI_API_KEY` / `OPENAI_IMAGE_API_KEY`（僅本機離線使用）。**機密一律走環境變數，不入版控。**

## 8. 本機啟動

```powershell
# 1. 安裝相依
npm install

# 2. 複製環境變數並填入你的 DATABASE_URL（Neon/Supabase/本機 PostgreSQL）
Copy-Item .env.example .env

# 3. 建立資料表（不會清空既有資料）
npm run db:migrate

# 4. 匯入種子資料（6 示範字 + 題庫 + 20 週課程，upsert 冪等）
npm run db:seed

# 5. 啟動開發伺服器
npm run dev
```

開啟 http://localhost:3000 。未設定 Azure 金鑰時，發音頁仍可用瀏覽器語音示範，評分會顯示「服務尚未設定」。

## 9. 內容擴充流程（單字 → 句子 → 圖片/音檔 → 題目）

```powershell
# 補單字：編輯 prisma/data/words.json 或匯入 CSV
npm run csv:words -- path\to\words.csv

# 自動切音素積木（不規則字用 phonics-overrides.json 覆蓋）
npm run content:phonics

# AI 生成（需金鑰；未設定則僅列出待生成清單）
npm run gen:sentences   # LLM 例句（reviewed:false，需人工審核）
npm run gen:images      # 生圖模型插畫 → public/images/words
npm run gen:audio       # Azure TTS 示範音 → public/audio/words

# 由已審內容造題、驗證並輸出覆蓋率報告
npm run gen:questions
npm run content:validate

# 一鍵：slicer → 造題 → 驗證
npm run content:build

# 寫入資料庫
npm run db:seed
```

新增題型：① `QuestionType`（schema + `types/content.ts`）② 造題器 `lib/exam/generators` ③ 前端元件 `components/exam` + `lib/exam/grade.ts` 批改分支。

## 10. 免費部署（GitHub + Vercel）

> GitHub Pages 只能放靜態網站，無法執行本專案的 API/Prisma/PostgreSQL，故不適用。

1. 將程式碼推上 **GitHub**。
2. **Neon** 或 **Supabase** 建立免費 PostgreSQL，取得 `DATABASE_URL`。
3. **Vercel** 匯入該 GitHub repo（框架自動辨識為 Next.js）。
4. 在 Vercel 專案 Settings → Environment Variables 設定：`DATABASE_URL`、`AZURE_SPEECH_KEY`、`AZURE_SPEECH_REGION`、（選用）`UPSTASH_REDIS_REST_URL/TOKEN`、`ALLOWED_ORIGINS`。
5. 首次部署後，於本機對正式庫建表並灌資料：
   ```powershell
   $env:DATABASE_URL="<正式庫連線字串>"
   npm run db:deploy   # prisma migrate deploy（不清空資料）
   npm run db:seed
   ```
6. 之後每次 `git push` Vercel 會自動部署。`build` 指令已含 `prisma generate`。

限流：未設定 Upstash 時自動用記憶體限流（單實例足夠）；多實例請設定 Upstash。
語音：Azure 免費 F0 層即可使用發音評測。

## 11. 安全性（遵守安全編碼規範）

- 機密只存環境變數，`.env` 由 `.gitignore` 排除。
- 所有 API 輸入以 zod 驗證；DB 查詢全程 Prisma 參數化，無字串拼接。
- 答案不隨題目下發（`/api/exam/questions` 不回 correctAnswer），批改在後端。
- CORS 採 allowlist（`ALLOWED_ORIGINS`），不使用 `*`。
- 發音評測有大小上限與每分鐘限流，避免濫用與成本失控。
- 不執行任何破壞性資料庫指令（不使用 migrate:fresh / reset）。
