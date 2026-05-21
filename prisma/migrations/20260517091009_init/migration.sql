-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PAUSED', 'STOPPED', 'UNDER_FOLLOWUP', 'BANNED');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'DIVORCED', 'WIDOWED', 'MARRIED_SEEKING_POLYGAMY');

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('BELOW_HIGH_SCHOOL', 'HIGH_SCHOOL', 'UNIVERSITY', 'MASTERS', 'PHD');

-- CreateEnum
CREATE TYPE "HijabType" AS ENUM ('NIQAB', 'HIJAB', 'NONE');

-- CreateEnum
CREATE TYPE "SkinColor" AS ENUM ('WHITE', 'WHEAT', 'BROWN', 'DARK');

-- CreateEnum
CREATE TYPE "Governorate" AS ENUM ('CAIRO', 'GIZA', 'ALEXANDRIA', 'ASWAN', 'ASSIUT', 'BENI_SUEF', 'PORT_SAID', 'DAKAHLIA', 'DAMIETTA', 'SUEZ', 'SHARQIA', 'GHARBIA', 'FAIYUM', 'KAFR_EL_SHEIKH', 'LUXOR', 'MATRUH', 'MINYA', 'MONUFIA', 'NEW_VALLEY', 'NORTH_SINAI', 'QENA', 'QALIUBIYA', 'RED_SEA', 'SOHAG', 'SOUTH_SINAI', 'ISMAILIA', 'BEHEIRA');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING_FEMALE', 'PENDING_MALE', 'FULLY_MATCHED', 'FEMALE_REJECTED', 'MALE_REJECTED', 'UNDER_FOLLOWUP', 'COMPLETED_MARRIAGE', 'COMPLETED_NO_MATCH');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RatingType" AS ENUM ('INITIAL_MATCH', 'RESPECTFUL_NO_MATCH', 'UNFRIENDLY', 'SLOW_RESPONSE', 'FORMAL_COMPLAINT', 'NO_CONTACT', 'NO_RESPONSE');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('PENDING', 'WARNED', 'SUSPENDED', 'BANNED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "PreferenceTrait" AS ENUM ('AGE_MIN', 'AGE_MAX', 'CURRENT_GOVERNORATE', 'POST_MARRIAGE_GOVERNORATE', 'RELIGIOUS_LEVEL_MIN', 'EDUCATION_LEVEL_MIN', 'HEIGHT_MIN', 'WEIGHT_MIN', 'WEIGHT_MAX', 'SKIN_COLOR', 'ACCEPTS_CHILDREN', 'ACCEPTS_DIVORCED', 'ACCEPTS_WIDOWED', 'ACCEPTS_POLYGAMY', 'HIJAB_TYPE_PREFERENCE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "gender" "Gender" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "reputationScore" INTEGER NOT NULL DEFAULT 100,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "adminPassword" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "currentGovernorate" "Governorate" NOT NULL,
    "postMarriageGovernorate" "Governorate" NOT NULL,
    "maritalStatus" "MaritalStatus" NOT NULL,
    "childrenCount" INTEGER,
    "currentWivesCount" INTEGER,
    "religiousLevel" INTEGER NOT NULL,
    "educationLevel" "EducationLevel" NOT NULL,
    "heightCategory" TEXT NOT NULL,
    "weightCategory" TEXT NOT NULL,
    "skinColor" "SkinColor" NOT NULL,
    "personalMessage" TEXT NOT NULL,
    "hijabType" "HijabType",
    "guardianPhone" TEXT,
    "completenessScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trait" "PreferenceTrait" NOT NULL,
    "value" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "maleId" TEXT NOT NULL,
    "femaleId" TEXT NOT NULL,
    "compatibilityScore" DOUBLE PRECISION NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING_FEMALE',
    "femaleDecision" "Decision",
    "maleDecision" "Decision",
    "femaleDecidedAt" TIMESTAMP(3),
    "maleDecidedAt" TIMESTAMP(3),
    "contactsRevealedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "femaleMatchId" TEXT,
    "maleMatchId" TEXT,
    "raterId" TEXT NOT NULL,
    "ratedId" TEXT NOT NULL,
    "ratingType" "RatingType" NOT NULL,
    "availableAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "complainantId" TEXT NOT NULL,
    "respondentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isFromBot" BOOLEAN NOT NULL DEFAULT true,
    "messageType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpLog" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Preference_userId_trait_key" ON "Preference"("userId", "trait");

-- CreateIndex
CREATE UNIQUE INDEX "Match_maleId_femaleId_key" ON "Match"("maleId", "femaleId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_femaleMatchId_key" ON "Rating"("femaleMatchId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_maleMatchId_key" ON "Rating"("maleMatchId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_maleId_fkey" FOREIGN KEY ("maleId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_femaleId_fkey" FOREIGN KEY ("femaleId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_femaleMatchId_fkey" FOREIGN KEY ("femaleMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_maleMatchId_fkey" FOREIGN KEY ("maleMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_ratedId_fkey" FOREIGN KEY ("ratedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_complainantId_fkey" FOREIGN KEY ("complainantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotMessage" ADD CONSTRAINT "BotMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpLog" ADD CONSTRAINT "FollowUpLog_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpLog" ADD CONSTRAINT "FollowUpLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
