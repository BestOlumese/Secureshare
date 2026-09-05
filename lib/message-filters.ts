/**
 * Expired messages can no longer be decrypted, so they must not appear in any
 * list — otherwise the only way to discover the expiry is to click and fail.
 */
export const notExpired = () => ({
  OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
});

/**
 * Fields the dashboard needs from a message.
 *
 * Deliberately a `select`, not an `include`. `sender: true` /
 * `user: true` return every scalar column on User — including
 * encryptedPrivateKey, its salt and IV, and the recovery blobs — and these
 * rows are serialised straight into the browser payload. That would hand
 * every user the wrapped private key of everyone they correspond with.
 *
 * fileUrl is omitted too: the client fetches it through getDocumentMetadata,
 * which is where the expiry and access checks live.
 */
export const MESSAGE_SELECT = {
  id: true,
  senderId: true,
  subject: true,
  content: true,
  createdAt: true,
  expiryDate: true,
  sender: { select: { id: true, name: true, email: true } },
  recipients: {
    select: {
      userId: true,
      role: true,
      readAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  },
  documents: {
    select: { id: true, fileName: true, fileSize: true, contentType: true },
  },
} as const;
