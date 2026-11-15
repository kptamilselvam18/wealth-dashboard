-- Alert digests are opt-out, and each event records when its digest was sent.
ALTER TABLE "User" ADD COLUMN "emailAlerts" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AlertEvent" ADD COLUMN "notifiedAt" TIMESTAMP(3);

CREATE INDEX "AlertEvent_userId_notifiedAt_idx" ON "AlertEvent"("userId", "notifiedAt");
