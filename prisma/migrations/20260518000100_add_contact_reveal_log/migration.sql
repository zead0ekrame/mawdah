-- CreateTable
CREATE TABLE "ContactRevealLog" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "revealedToUserId" TEXT NOT NULL,
    "revealedPhone" TEXT NOT NULL,
    "contactType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactRevealLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactRevealLog_matchId_idx" ON "ContactRevealLog"("matchId");

-- CreateIndex
CREATE INDEX "ContactRevealLog_revealedToUserId_idx" ON "ContactRevealLog"("revealedToUserId");

-- AddForeignKey
ALTER TABLE "ContactRevealLog" ADD CONSTRAINT "ContactRevealLog_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRevealLog" ADD CONSTRAINT "ContactRevealLog_revealedToUserId_fkey" FOREIGN KEY ("revealedToUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
