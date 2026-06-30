-- CreateEnum
CREATE TYPE "Skill" AS ENUM ('LISTENING', 'READING', 'WRITING', 'SPEAKING');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('KIDS', 'BEGINNER');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('LISTENING_IMAGE', 'LISTENING_TF', 'READING_TF', 'MATCHING', 'MULTIPLE_CHOICE', 'SPELLING', 'WRITING_CLOZE', 'SHORT_ANSWER', 'WRITING_REORDER', 'SPEAKING_READ_ALOUD', 'SPEAKING_PICTURE');

-- CreateTable
CREATE TABLE "PhonicsCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "PhonicsCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Word" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "ipa" TEXT,
    "phonemeMapping" JSONB NOT NULL,
    "sentences" JSONB,
    "imageUrl" TEXT,
    "audioUrl" TEXT,
    "weekNo" INTEGER,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamQuestion" (
    "id" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "skill" "Skill" NOT NULL,
    "level" "Level" NOT NULL DEFAULT 'KIDS',
    "weekNo" INTEGER,
    "audioUrl" TEXT,
    "questionText" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "imageUrl" TEXT,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT '小學員',
    "level" "Level" NOT NULL DEFAULT 'KIDS',
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastActive" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "Level" NOT NULL DEFAULT 'KIDS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyWeek" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekNo" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "theme" TEXT,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "StudyWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyTask" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "skill" "Skill" NOT NULL,
    "title" TEXT NOT NULL,
    "targetCount" INTEGER NOT NULL DEFAULT 5,
    "doneCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WeeklyTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyTaskQuestion" (
    "taskId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "WeeklyTaskQuestion_pkey" PRIMARY KEY ("taskId","questionId")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT,
    "skill" "Skill" NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skill" "Skill" NOT NULL,
    "suns" INTEGER NOT NULL DEFAULT 0,
    "achievement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhonicsCategory_name_key" ON "PhonicsCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Word_text_key" ON "Word"("text");

-- CreateIndex
CREATE INDEX "Word_weekNo_idx" ON "Word"("weekNo");

-- CreateIndex
CREATE INDEX "ExamQuestion_type_idx" ON "ExamQuestion"("type");

-- CreateIndex
CREATE INDEX "ExamQuestion_skill_idx" ON "ExamQuestion"("skill");

-- CreateIndex
CREATE INDEX "ExamQuestion_weekNo_idx" ON "ExamQuestion"("weekNo");

-- CreateIndex
CREATE UNIQUE INDEX "StudyPlan_userId_level_key" ON "StudyPlan"("userId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "StudyWeek_planId_weekNo_key" ON "StudyWeek"("planId", "weekNo");

-- CreateIndex
CREATE INDEX "Attempt_userId_skill_idx" ON "Attempt"("userId", "skill");

-- CreateIndex
CREATE INDEX "Attempt_userId_createdAt_idx" ON "Attempt"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SkillScore_userId_skill_key" ON "SkillScore"("userId", "skill");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_userId_code_key" ON "Achievement"("userId", "code");

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PhonicsCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlan" ADD CONSTRAINT "StudyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyWeek" ADD CONSTRAINT "StudyWeek_planId_fkey" FOREIGN KEY ("planId") REFERENCES "StudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyTask" ADD CONSTRAINT "WeeklyTask_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "StudyWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyTaskQuestion" ADD CONSTRAINT "WeeklyTaskQuestion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "WeeklyTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyTaskQuestion" ADD CONSTRAINT "WeeklyTaskQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ExamQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ExamQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillScore" ADD CONSTRAINT "SkillScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
