CREATE INDEX "Profile_currentGovernorate_age_religiousLevel_idx"
  ON "Profile"("currentGovernorate", "age", "religiousLevel");

CREATE INDEX "Match_femaleId_status_femaleDecision_createdAt_idx"
  ON "Match"("femaleId", "status", "femaleDecision", "createdAt");

CREATE INDEX "Match_maleId_status_maleDecision_createdAt_idx"
  ON "Match"("maleId", "status", "maleDecision", "createdAt");

CREATE INDEX "Match_femaleId_appearanceCount_idx"
  ON "Match"("femaleId", "appearanceCount");

CREATE INDEX "Match_maleId_appearanceCount_idx"
  ON "Match"("maleId", "appearanceCount");
