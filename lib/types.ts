/**
 * Shared shapes for the data server components hand to client components.
 *
 * These are written by hand rather than derived from Prisma's model types on
 * purpose: they are the contract for what crosses to the browser. Anything a
 * client component receives is serialised into the page payload, so the type
 * doubles as the list of fields we have decided are safe to send.
 */

/** An organization member as shown in the admin member list. */
export interface OrgMember {
  id: string;
  name: string;
  email: string;
  role: string | null;
}

/** A pending or resolved invitation in the admin list. */
export interface OrgInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * The signed-in user's own record.
 *
 * The key material here is theirs alone — it stays encrypted and is only ever
 * unwrapped in their browser with their master password. Never populate this
 * for anyone other than the current user.
 */
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
  orgId: string | null;
  displayUsername: string | null;
  createdAt: Date;
  organization: { id: string; name: string; publicKey: string | null } | null;

  encryptedPrivateKey: string | null;
  privateKeySalt: string | null;
  privateKeyIV: string | null;
  recoveryEncryptedPrivateKey: string | null;
  recoverySalt: string | null;
  recoveryIV: string | null;
  /** PBKDF2 iterations used for the blobs above. Null means legacy (100k). */
  kdfIterations: number | null;
}

/** The subset of the session user the dashboard chrome needs. */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  orgId?: string | null;
}
