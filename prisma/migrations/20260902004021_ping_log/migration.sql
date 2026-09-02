-- CreateTable
CREATE TABLE "PingLog" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "statusCode" INTEGER,
    "latencyMs" INTEGER NOT NULL,
    "isUp" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PingLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PingLog" ADD CONSTRAINT "PingLog_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "MonitorTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
