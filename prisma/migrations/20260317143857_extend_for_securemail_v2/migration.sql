/*
  Warnings:

  - You are about to drop the column `s3Url` on the `document` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "document" DROP COLUMN "s3Url",
ADD COLUMN     "contentType" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "messageId" TEXT,
ALTER COLUMN "expiryDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "encryptedPrivateKey" TEXT,
ADD COLUMN     "privateKeyIV" TEXT,
ADD COLUMN     "privateKeySalt" TEXT;

-- CreateTable
CREATE TABLE "message" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
