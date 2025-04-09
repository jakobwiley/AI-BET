-- CreateEnum
CREATE TYPE "SportType" AS ENUM ('NBA', 'MLB');

-- CreateEnum
CREATE TYPE "PredictionType" AS ENUM ('SPREAD', 'MONEYLINE', 'TOTAL');

-- CreateEnum
CREATE TYPE "PredictionOutcome" AS ENUM ('WIN', 'LOSS', 'PENDING');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'FINAL', 'POSTPONED', 'CANCELLED');

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "sport" "SportType" NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "homeTeamName" TEXT NOT NULL,
    "awayTeamName" TEXT NOT NULL,
    "game_date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "status" "GameStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "odds_json" JSONB,
    "probable_home_pitcher_id" INTEGER,
    "probable_away_pitcher_id" INTEGER,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "predictionType" "PredictionType" NOT NULL,
    "predictionValue" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "outcome" "PredictionOutcome" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "games_id_key" ON "games"("id");

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
