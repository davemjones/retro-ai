-- DropForeignKey
ALTER TABLE "SessionActivity" DROP CONSTRAINT "SessionActivity_sessionId_fkey";

-- AddForeignKey
ALTER TABLE "SessionActivity" ADD CONSTRAINT "SessionActivity_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserSession"("sessionId") ON DELETE CASCADE ON UPDATE CASCADE;
