-- CreateIndex
CREATE INDEX "user_orgId_idx" ON "user"("orgId");

-- CreateIndex
CREATE INDEX "message_senderId_createdAt_idx" ON "message"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "message_orgId_idx" ON "message"("orgId");

-- CreateIndex
CREATE INDEX "message_expiryDate_idx" ON "message"("expiryDate");

-- CreateIndex
CREATE INDEX "message_recipient_userId_deletedAt_archivedAt_idx" ON "message_recipient"("userId", "deletedAt", "archivedAt");

-- CreateIndex
CREATE INDEX "document_messageId_idx" ON "document"("messageId");

-- CreateIndex
CREATE INDEX "document_expiryDate_idx" ON "document"("expiryDate");

-- CreateIndex
CREATE INDEX "document_recipient_userId_idx" ON "document_recipient"("userId");

-- CreateIndex
CREATE INDEX "audit_log_timestamp_idx" ON "audit_log"("timestamp");

-- CreateIndex
CREATE INDEX "audit_log_userId_idx" ON "audit_log"("userId");

-- CreateIndex
CREATE INDEX "audit_log_initiatorOrgId_idx" ON "audit_log"("initiatorOrgId");

-- CreateIndex
CREATE INDEX "audit_log_targetOrgId_idx" ON "audit_log"("targetOrgId");
