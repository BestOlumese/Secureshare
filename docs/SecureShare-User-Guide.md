# SecureShare

## Complete User & Administrator Guide

**Version 1.0**
**Prepared:** June 2026

---

# Table of Contents

1. Introduction
2. Why SecureShare Exists
3. Key Concepts & Terminology
4. Getting Started: Creating Your Account
5. Onboarding: Setting Up Your Encryption Vault
6. Understanding Roles & Permissions
7. The Dashboard: Your Secure Inbox
8. Composing and Sending Secure Messages
9. Reading, Replying, and Forwarding Messages
10. Organizing Your Inbox: Archive, Delete, and Bulk Actions
11. Read Receipts and Mark-All-Read
12. Message and File Expiry
13. Keyboard Shortcuts
14. Your Profile
15. The Security Center
16. Organization Management (Admins & Owners)
17. Inviting and Managing Members
18. The Organization Vault
19. Audit Logs
20. Account Security: Sessions, Recovery, and Login Alerts
21. Troubleshooting & FAQ
22. Glossary
23. Appendix A: Security & Encryption Explained Simply
24. Appendix B: Technical Encryption Reference

---

# 1. Introduction

SecureShare is a secure communications platform built for organizations that need to send sensitive files and messages without exposing them to the risks of ordinary email or chat tools. It combines an inbox-style messaging experience with end-to-end encryption, so that every file and every message is locked before it ever leaves your device, and can only be unlocked by the people you intended to receive it.

This guide explains, in detail, how to use every part of SecureShare — from creating your account and setting up your encryption keys, to sending your first secure message, to managing an organization with multiple members and roles. It is written for three types of readers:

- **Everyday users** who need to send and receive secure messages and files.
- **Organization Owners and Admins** who manage members, roles, invitations, and security policy.
- **Technically curious readers** who want to understand exactly how the encryption works under the hood (see Appendix B).

You do not need any technical or security background to use SecureShare. The platform is designed so that strong, modern encryption happens automatically in the background — your job is simply to compose a message, choose who receives it, and click send.

---

# 2. Why SecureShare Exists

## 2.1 The Problem with Ordinary Email and File Sharing

Most organizations today share sensitive documents — contracts, financial records, HR files, medical information, credentials, legal correspondence — using tools that were never designed to keep that information confidential. Regular email and most consumer chat or file-sharing tools share a set of structural weaknesses:

- **Attachments are stored in plaintext.** When you email a file, a readable copy of that file typically sits on your mail provider's servers, your recipient's mail provider's servers, and often on multiple backup systems in between — indefinitely.
- **Anyone with access to the mailbox can read everything.** This includes IT administrators, anyone who compromises an account through phishing or a leaked password, and in some cases, the email provider itself.
- **There is no real record of who actually opened a file.** Read receipts in normal email are unreliable and easy to fake or ignore. Organizations frequently cannot answer the basic question: "Who actually saw this document, and when?"
- **A single breached inbox can expose years of sensitive history.** Because nothing is encrypted per-message, gaining access to one account often means gaining access to everything that account has ever sent or received.
- **Cross-organization sharing has no consistent security model.** When two different companies need to exchange sensitive files, they typically fall back to email attachments, consumer cloud-storage links, or ad-hoc password-protected zip files — none of which provide real guarantees about who can access the data.

## 2.2 What SecureShare Solves

SecureShare was built specifically to close these gaps. It treats every message and every file as something that must be protected individually, not as something that becomes "safe" simply because it sits inside a company's email system. Concretely, SecureShare provides:

- **True end-to-end encryption.** Files and messages are encrypted on your device before they are uploaded. SecureShare's own servers never see the unencrypted content — not during upload, not in storage, and not even if SecureShare's database were somehow compromised.
- **Per-recipient access control.** Every message is locked with a unique encryption key, and that key is then individually "wrapped" for each recipient using their own personal key. There is no shared secret that, if leaked, would expose every message ever sent.
- **A complete, tamper-evident audit trail.** Every meaningful action — sending a message, viewing a cross-organization file, completing onboarding, resetting a password — is logged with a timestamp and IP address, so organizations can answer "who did what, and when" with confidence.
- **Built-in cross-organization collaboration.** Two different organizations can securely exchange messages and files through SecureShare without needing to set up a shared system, a VPN, or a manual key exchange process.
- **Zero-knowledge architecture.** Your encryption keys are generated on your own device and are never transmitted to SecureShare in a usable (unencrypted) form. Even SecureShare, as the operator of the platform, cannot read your messages.
- **Defense against account compromise.** Features like active session visibility, session revocation, and login notification emails help you detect and respond to unauthorized access quickly.

## 2.3 Who SecureShare Is For

SecureShare is designed for any organization that regularly exchanges confidential information internally or with outside parties: legal teams, finance and accounting departments, healthcare administrators, HR departments, government contractors, consultancies, and any business that has been burned (or wants to avoid being burned) by a leaked attachment or compromised mailbox.

---

# 3. Key Concepts & Terminology

Before diving into the step-by-step instructions, it helps to understand a handful of recurring concepts. Each of these is explained in plain language here, and in full technical detail in Appendix B.

| Term | Plain-language meaning |
|---|---|
| **Encryption** | Scrambling data so that it looks like meaningless noise to anyone without the correct key. |
| **Decryption** | Using the correct key to turn scrambled data back into its original, readable form. |
| **Private Key** | A secret digital "key" that only you possess. It is what allows you to unlock messages sent to you. It is generated on your own device and is meant to never be shared. |
| **Public Key** | The matching half of your private key. It can be shared freely — in fact, SecureShare stores it on the server — because it can only be used to lock things for you, not to unlock anything. |
| **Master Password** | A password you choose during setup that protects your private key so it can be safely synced and recovered. This is separate from your login (you don't log in with a password — see Section 4). |
| **Recovery Key** | A unique, randomly generated backup code created during setup. If you ever forget your Master Password, the Recovery Key is your way back into your encrypted data. |
| **Vault** | Your personal store of encryption keys. "Unlocking your vault" means entering your Master Password so SecureShare can use your private key to decrypt content for you. |
| **Organization (Org)** | The company, team, or group your account belongs to. Every user belongs to exactly one organization at a time. |
| **Org Vault** | An optional, organization-wide encryption key set that lets designated messages be readable by every Owner/Admin in an organization, rather than only a single individual. |
| **Role** | Your level of permission within your organization: Owner, Admin, or User (explained fully in Section 6). |
| **Audit Log** | A permanent record of security-relevant events, viewable by Owners and Admins. |

---

# 4. Getting Started: Creating Your Account

SecureShare uses **passwordless, email-based sign-in**. You never create or type a traditional account password to log in. Instead, every sign-in is verified with a one-time code sent to your email address. This removes an entire category of risk (stolen or reused passwords) from the login process.

### Step-by-step: Signing In or Signing Up

1. Go to the SecureShare login page.
2. Enter your email address and click **"Send login code."**
3. Check your email for a 6-digit verification code. It will arrive within moments from SecureShare.
4. Return to the SecureShare tab and enter the 6-digit code. You can paste the whole code at once, or type each digit individually — the input boxes will automatically move to the next digit as you type.
5. Click **"Verify & sign in."**

If this is the very first time you have signed in with this email address, SecureShare automatically creates your account and takes you directly into the **Onboarding** flow described in Section 5. If you have already onboarded before, you are taken straight to your Dashboard.

> **Note:** If you don't receive the code within a couple of minutes, check your spam folder, confirm you typed your email address correctly, and use the "Use a different email" link to try again if needed.

---

# 5. Onboarding: Setting Up Your Encryption Vault

Onboarding is a one-time setup process that happens the first time you sign in. This is where SecureShare generates your personal encryption keys and gets your account ready to send and receive secure messages. The process has several steps:

### Step 1 — Your Profile

You will be asked for:
- **Full Name** — how you'll appear to other users.
- **Organization Name** — the name of your company or team.

If you were invited to join an existing organization (see Section 17), this step will already show the organization you're joining, and you will not be able to create a separate one — you're joining your inviter's organization instead.

If you were not invited, completing this step creates a brand-new organization, and you automatically become its **Owner** (see Section 6).

### Step 2 — Choose a Master Password

This is one of the most important steps in the entire setup, so it's worth explaining carefully.

Your Master Password is **not** used to log in — you already log in using the emailed code (Section 4). Instead, your Master Password protects your **private encryption key**. Think of your private key as the only key that can unlock messages sent to you; your Master Password is what locks up that key safely so it can be:

- Safely stored on SecureShare's server in an encrypted form (so you can use SecureShare from a new device without losing access to old messages), and
- Quickly unlocked again whenever you need to read a message.

Choose a Master Password that is **at least 12 characters long** and mixes at least three of: lower case, upper case, numbers, and symbols. SecureShare shows a strength meter as you type and will not accept a password that is too short, too repetitive, or one of the commonly used passwords attackers try first.

The requirement is strict for a specific reason. This password is not checked by a server that could rate-limit guesses — it mathematically derives the key that unlocks your private key. Anyone who obtained your encrypted key could guess passwords against it offline, as fast as their hardware allows. Length is what makes that impractical.

Because this password protects your actual encryption keys (not just your login), we also strongly recommend:

- Making it long and unique — don't reuse a password from another site. A memorable passphrase of several words beats a short, complicated one.
- Storing it in a password manager if you use one.
- Never sharing it with anyone, including SecureShare support — nobody at SecureShare can recover it for you if it's lost (this is what "zero-knowledge" means in practice).

During this step, SecureShare generates a brand-new personal encryption keypair for you, entirely inside your own browser. Nothing about your private key is ever sent anywhere in readable form.

### Step 3 — Save Your Recovery Key

Immediately after setting your Master Password, SecureShare generates a **Recovery Key** — a long, random code unique to you. This is your safety net.

If you ever forget your Master Password, there is no "forgot password" email reset, because SecureShare never knows your Master Password in the first place. The **only** way to regain access to your encrypted messages after forgetting your Master Password is to use this Recovery Key.

On this screen you can:
- **Copy** the Recovery Key to your clipboard, or
- **Download** it as a text file.

> **This is the single most important action in the entire setup process.** Store your Recovery Key somewhere safe and offline — a password manager, a printed copy in a secure location, or a company-approved secrets vault. If you lose both your Master Password and your Recovery Key, your previously sent and received encrypted messages cannot be recovered by anyone, including SecureShare.

### Step 4 — Setup Completes

SecureShare finalizes your account: your public key is saved to your profile, your encrypted private key is stored for cross-device sync, and (if applicable) you're added to your invited organization with the correct role.

### Step 5 — Welcome

A brief success screen confirms everything is ready, and you're automatically taken to your Dashboard a couple of seconds later.

---

# 6. Understanding Roles & Permissions

Every member of an organization in SecureShare has exactly one role at a time: **Owner**, **Admin**, or **User**. Roles control what a person can see and do, particularly around organization management and shared (vault) content.

## 6.1 Owner

The Owner is the most privileged role in an organization. By default, the person who creates an organization (the first person to onboard without being invited) becomes its Owner. An Owner can:

- Do everything an Admin can do (see below).
- Generate and manage the **Organization Vault** keys (Section 18) — this is an Owner-exclusive capability.
- Rename the organization.

## 6.2 Admin

Admins are trusted members who help manage the organization day-to-day. Admins can:

- Invite new members to the organization and assign them the User or Admin role.
- Revoke pending invitations.
- Change the role of existing **User**-level members.
- Remove **User**-level members from the organization.
- View and access the **Organization Vault** (shared messages), if one has been set up.
- View the **Audit Log** for the organization.
- Rename the organization.

**Important limit:** Admins cannot change another Admin's role, cannot remove another Admin, and cannot generate Organization Vault keys — those actions are reserved for the Owner. This prevents any single Admin from being able to quietly demote or remove other trusted administrators.

## 6.3 User

Users are standard members of an organization. Users can:

- Compose and send secure messages and files to anyone (inside or outside their organization).
- View and manage their own Inbox, Sent items, and Archive.
- Access their personal Security Center (Section 15) to manage their own keys and sessions.

Users **cannot** invite or remove members, cannot view the Audit Log, and cannot access the Organization Vault.

## 6.4 Role Summary Table

| Capability | Owner | Admin | User |
|---|:---:|:---:|:---:|
| Send/receive secure messages | ✓ | ✓ | ✓ |
| Manage own profile & security settings | ✓ | ✓ | ✓ |
| Invite new members | ✓ | ✓ | — |
| Revoke pending invitations | ✓ | ✓ | — |
| Change a User's role | ✓ | ✓ | — |
| Remove a User from the org | ✓ | ✓ | — |
| Change/remove an Admin | ✓ | — | — |
| Rename the organization | ✓ | ✓ | — |
| View the Organization Vault | ✓ | ✓ | — |
| Generate Organization Vault keys | ✓ | — | — |
| View the Audit Log | ✓ | ✓ | — |

---

# 7. The Dashboard: Your Secure Inbox

The Dashboard is the home screen of SecureShare and is structured much like a familiar email client, with a few security-specific additions.

## 7.1 Layout

- **Sidebar (left):** Lets you switch between your message views — Inbox, Sent, Archived, and (for Owners/Admins) the Organization Vault. The Compose button is also here.
- **Message List (center):** Shows the messages in your currently selected view, with sender, subject, a content preview, and timestamp. Unread messages are visually distinguished from read ones.
- **Message View (right/main):** Shows the full content of whichever message you've selected, including a button to decrypt and view its contents and any attachments.

## 7.2 The Four Views

- **Inbox** — Messages sent to you by other users, excluding anything you've archived or deleted.
- **Sent** — Messages you have sent to others. From here you can also see, per recipient, whether and when they have read your message (see Section 11).
- **Archived** — Messages you've moved out of your main Inbox to keep things tidy, without deleting them.
- **Organization Vault** *(Owners/Admins only)* — Messages that have been explicitly shared with the entire organization rather than (or in addition to) specific individuals. See Section 18.

## 7.3 Auto-Refresh

The Dashboard automatically checks for new messages roughly every 30 seconds in the background, so new mail generally appears without any action on your part. A manual refresh button is also available if you want to check immediately, and a small notification will let you know when new messages have arrived.

---

# 8. Composing and Sending Secure Messages

To start a new message, click **Compose** in the sidebar, or press the **`c`** keyboard shortcut from anywhere in the Dashboard.

## 8.1 Filling Out a Message

The Compose window includes:

- **To** — the primary recipient's email address. They need a SecureShare account already: encryption requires their public key, so there is nothing to encrypt to until they have one. If they don't, invite them to your organization first (Section 17), or ask them to sign up. As you type an organization name here, SecureShare can search and match it against known organizations.
- **CC** — optional additional recipients. You can add multiple CC recipients, and remove any of them before sending.
- **Subject** — a plain-text subject line. (Unlike the message body and attachments, the subject line is not separately end-to-end encrypted the way content is — avoid putting highly sensitive details directly in the subject.)
- **Message Content** — the body of your message. This is fully encrypted before it leaves your device.
- **Attachments** — optionally attach one or more files. Each file is individually encrypted before upload.
- **Expiry (optional)** — set a number of days after which the message and its attachments can no longer be decrypted by recipients (see Section 12).

## 8.2 What Happens When You Click Send

Behind the scenes, the moment you click Send, SecureShare:

1. Generates a brand-new, random encryption key just for this one message.
2. Locks (encrypts) your message subject, your message text, every attached file, **and each file's name** with that key, entirely within your browser. Uploaded files are given a random, meaningless name so that even the storage provider never learns what your documents are called.
3. Looks up the public key of every recipient (and, if you've shared with an organization, the organization's public vault key).
4. "Wraps" — encrypts — a personal copy of the message key separately for each recipient, using their own public key. This means every recipient gets their own private, individually-locked way to unlock the same message; there is no shared password or key that, if leaked, would compromise the message for everyone.
5. Uploads the encrypted message, the encrypted attachments, and each recipient's individually wrapped key to SecureShare's servers. The server only ever stores scrambled data — never the readable content.
6. Sends a notification email to each recipient letting them know a secure message is waiting.

## 8.3 Sending Limits

To protect against abuse and accidental mass-sending, SecureShare limits each user to **20 outgoing messages per minute**. Normal use will never reach this — it exists to stop a script, not a person. If you do hit it, you'll see a notification and can send again once the minute is up.

---

# 9. Reading, Replying, and Forwarding Messages

## 9.1 Opening and Decrypting a Message

Click any message in your Message List to open it. Encrypted content is not shown automatically — click **Decrypt** to unlock it. If your vault is currently locked, you may be asked to enter your Master Password first.

Until you decrypt, an attached file shows only a padlock and the label *"Encrypted file name"*. The real name appears once the message is unlocked, because the name is encrypted along with the file's contents — a document called `Redundancy List Q3.xlsx` gives away a great deal on its own, so SecureShare treats the name as being just as sensitive as what is inside.

Once decrypted, the message text and any attachments become viewable and downloadable for the remainder of your session.

## 9.2 Replying

Click **Reply** on an open message (or press the **`r`** shortcut). This opens the Compose window with the original sender pre-filled as the recipient and the subject automatically prefixed with **"Re:"**. The message is re-encrypted fresh for this new reply — your reply does not reuse the original message's encryption key.

## 9.3 Forwarding

Click **Forward** to send a copy of a message's content to a new recipient. The subject is automatically prefixed with **"Fwd:"**, and you choose a new recipient (and optionally CC others) before sending. As with replies, the forwarded message is independently encrypted for its new recipient(s).

---

# 10. Organizing Your Inbox: Archive, Delete, and Bulk Actions

## 10.1 Archiving

Archiving removes a message from your main Inbox view without deleting it. Archived messages remain fully accessible under the **Archived** view at any time, and can be moved back to your Inbox (un-archived) the same way. Use the Archive action on an open message, or the **`e`** keyboard shortcut.

## 10.2 Deleting

Deleting a message removes it from your own view permanently. This is a personal action — deleting a message from your Inbox does not delete it from the other recipients' or the sender's view. Use the **`#`** keyboard shortcut, or the delete action on an open message. You will be asked to confirm before a delete is finalized.

## 10.3 Bulk Actions

From the Message List, you can select multiple messages at once using checkboxes (or a "Select All" option), then apply Archive, Unarchive, or Delete to the entire selection in one action. A confirmation prompt appears before any bulk delete is carried out, to prevent accidental data loss.

---

# 11. Read Receipts and Mark-All-Read

When you view your own **Sent** messages, SecureShare shows you, for each recipient, whether they have opened (decrypted) the message yet, and the exact date and time they did so. This gives you genuine confirmation — unlike traditional email read receipts, which recipients can usually disable or fake, SecureShare's read status is tied to the recipient actually performing the decryption action.

In your **Inbox**, a one-click **"Mark all as read"** button is available in the header, useful for quickly clearing unread counts without opening every message individually.

---

# 12. Message and File Expiry

When composing a message, you can optionally set an **expiry period**, measured in days. Once a message passes its expiry date:

- It disappears from every inbox, archive, and vault view.
- It can no longer be decrypted by recipients — attempting to open it will show a clear "this message has expired" notice instead of its contents.
- Its attached files are permanently deleted from storage by a scheduled cleanup task. This is not simply a flag that hides them: the encrypted bytes are removed, so the file cannot be recovered by anyone afterwards, SecureShare included.

This is useful for time-sensitive material — for example, a document that should only be accessible during the life of a transaction, or credentials that should automatically become inert after a short window. If no expiry is set, a message remains accessible indefinitely (subject to it not being deleted).

---

# 13. Keyboard Shortcuts

For frequent users, SecureShare supports keyboard shortcuts to speed up everyday triage of your Inbox:

| Key | Action |
|---|---|
| `j` | Move to the next message |
| `k` | Move to the previous message |
| `c` | Open Compose |
| `r` | Reply to the currently open message |
| `e` | Archive the currently open message |
| `#` | Delete the currently open message |
| `Esc` | Close/deselect the currently open message |

---

# 14. Your Profile

Your Profile page (accessible from the main navigation) is where you manage your personal identity within SecureShare. It includes:

- **Overview tab** — your display name, username, email, organization, role, and the date you joined. An **Edit** button lets you update your name and username at any time.
- **Account status** — a quick confirmation of whether your account setup (onboarding) is complete.
- **Logout** — securely end your current session.

Two further tabs — **Security** and **Organization** — are covered in the next two sections.

---

# 15. The Security Center

The Security tab of your Profile is where you manage everything related to your encryption keys and active sessions.

## 15.1 Unlocking Your Vault

Several security actions require you to re-enter your Master Password to "unlock your vault" for that operation — this is a deliberate safeguard so that sensitive key operations can't happen silently in the background without your knowledge.

## 15.2 Exporting Your Private Key

You can export a personal backup copy of your private key as a downloadable file, protected by entering your Master Password. This is useful for:

- Keeping an additional, organization-independent backup of your encryption identity.
- Restoring access on a device where automatic Key Sync isn't available.

> **Treat an exported private key file exactly like a physical master key.** Anyone who obtains it can decrypt your messages. Store it somewhere as secure as you would store your Recovery Key.

## 15.3 Resetting Your Master Password

If you need to change your Master Password — or you've forgotten it entirely — the **Reset Master Password** flow lets you re-establish access using either your previously exported private key file or your original Recovery Key. Successfully resetting your password generates a **new** Recovery Key, which you should save and store securely just as you did the first time (your old Recovery Key stops working once a reset is completed).

## 15.4 Active Sessions

This panel lists every device/browser currently signed into your account, showing:

- IP address and parsed device/browser information (e.g., "Chrome on Windows," "Mobile Safari").
- When the session was created and when it will expire.
- A clear badge marking which session is the one you're currently using.

If you see a session you don't recognize, click **Revoke** next to it to immediately sign that device out. This is one of your most important tools for responding to a suspected account compromise.

## 15.5 Organization Vault Keys (Owners Only)

If you are an organization's Owner, this section lets you generate the Organization Vault's encryption keypair, described fully in Section 18.

---

# 16. Organization Management (Admins & Owners)

The **Organization** tab of your Profile (visible to Owners and Admins) is the control center for managing your team. From here you can:

- View and, if permitted, edit your organization's name.
- See a full list of current members and their roles.
- Invite new members (Section 17).
- View and manage pending invitations.
- Change a member's role, or remove them from the organization, subject to the permission rules in Section 6.

---

# 17. Inviting and Managing Members

## 17.1 Sending an Invitation

From the Organization tab, Owners and Admins can invite a new member by entering their email address and selecting a role (**Admin** or **User**). SecureShare then:

1. Creates a pending invitation record, valid for **7 days**.
2. Sends an email to the invited address containing a secure invitation link and stating who invited them, to which organization, and in what role.

## 17.2 Accepting an Invitation

When the invited person clicks the link:

- If they don't yet have a SecureShare account, they'll be guided through Sign In (Section 4) and Onboarding (Section 5) — onboarding will automatically recognize the pending invitation and join them to the correct organization with the correct role, skipping the "create a new organization" step.
- If they already have an account but aren't signed in, they're shown a clear "Sign in to continue" prompt before being able to accept.
- Once signed in with the **same email address the invitation was sent to**, they'll see an invitation summary (organization name, role, their email) and an **"Accept & Join"** button. Confirming moves them into the new organization immediately.

If an invitation has expired, already been used, or already been revoked, the invited person sees a clear status message rather than a generic error.

## 17.3 Revoking an Invitation

Owners and Admins can revoke any invitation that hasn't yet been accepted, instantly invalidating its link.

## 17.4 Changing Roles and Removing Members

From the member list, Owners and Admins can promote/demote Users, or remove them from the organization outright, subject to the rule that Admins cannot act on other Admins (only the Owner can).

---

# 18. The Organization Vault

The Organization Vault is an optional feature that lets messages be shared at the organization level rather than (or in addition to) with specific individuals — useful for material that any current or future Owner/Admin should be able to access, such as compliance records or organization-wide policy documents.

## 18.1 Setting It Up (Owner Only)

From the Security Center, the Owner can generate the Organization's own encryption keypair by choosing an **organization password** (separate from any individual's personal Master Password). This generates a dedicated public/private keypair for the organization itself, with the private half encrypted using that organization password.

## 18.2 Using It

Once set up, senders can choose to share a message with the receiving organization as a whole (in addition to, or instead of, an individual recipient). Any current Owner or Admin of that organization can then view the message under the **Organization Vault** view in their Dashboard — even if they personally were not an original named recipient.

This is particularly valuable for cross-organization collaboration, ensuring that institutional knowledge isn't lost if a specific individual recipient leaves the organization or is unavailable.

**Vault access is recorded.** Because the vault lets an Owner or Admin read messages they were never a named recipient of, every such decryption is written to the Audit Log with the administrator's identity, the message, and the time. The vault is a legitimate continuity tool, not a silent back door, and the log is what keeps that distinction meaningful.

---

# 19. Audit Logs

Owners and Admins have access to a dedicated **Audit Log** page, providing an immutable record of security-relevant events across the organization. Logged events include (but are not limited to):

- Messages sent, including when a message is sent to a different (external) organization.
- Documents/files viewed across an organizational boundary.
- Messages and files decrypted through the Organization Vault by an Owner or Admin who was not a named recipient.
- User sign-ins, recorded with the originating IP address and browser.
- Completed onboarding events.
- Master Password resets.

Each entry records the responsible user, the action type, a timestamp, the originating IP address, and relevant metadata (for example, how many recipients a message had). The Audit Log can be filtered by action type and searched by user name or email, and supports paging through historical entries.

This feature exists to give organizations a clear, defensible answer to "who did what, and when" — essential for internal security reviews, compliance requirements, and incident investigations.

---

# 20. Account Security: Sessions, Recovery, and Login Alerts

SecureShare layers several protections around your account beyond message-level encryption:

- **Login notification emails** are sent automatically every time a new session is created on your account, so you're alerted immediately to any sign-in — including ones you didn't initiate.
- **Active Sessions & Revocation** (Section 15.4) let you see and shut down any device session at will.
- **Recovery Key & exported private key backups** (Sections 5 and 15) ensure you are never permanently locked out of your own encrypted data, without SecureShare ever needing to hold a usable copy of your private key.
- **Rate limiting** is applied to sensitive actions (such as sending messages) to reduce the impact of a compromised or automated account.

If you ever receive a login notification you don't recognize, the recommended immediate steps are: (1) open your Security Center, (2) revoke any unfamiliar active session, and (3) reset your Master Password as a precaution.

---

# 21. Troubleshooting & FAQ

**I didn't receive my login code email. What do I do?**
Check your spam/junk folder first. Confirm you typed your email address correctly. Wait a minute and try resending. If problems persist, contact your organization's SecureShare administrator.

**I forgot my Master Password — am I locked out forever?**
No. Use your saved Recovery Key (or an exported private key backup, if you made one) in the **Reset Master Password** flow from your Security Center. If you have neither, previously encrypted messages unfortunately cannot be recovered by anyone — this is an intentional consequence of the zero-knowledge design, so please store your Recovery Key carefully.

**A message says it has expired — can I still get the content?**
No. Once a message's expiry date passes, it becomes permanently undecryptable through SecureShare by design. Contact the original sender and ask them to resend the information if you still need it.

**I was invited to an organization, but the invitation link says it's invalid or already used.**
Invitations expire after 7 days and can only be used once. Ask the Owner or Admin who invited you to send a new invitation.

**Can I belong to more than one organization?**
No — each account belongs to a single organization at a time. Accepting a new invitation will move your account into the new organization, replacing your previous organization membership.

**Why can't I see the Organization Vault?**
Only Owners and Admins can view the Organization Vault. If you believe you should have access, check your assigned role with your organization's Owner or Admin.

**I see a session in my Security Center that I don't recognize.**
Click **Revoke** on that session immediately, and consider resetting your Master Password as a precaution.

**Is the subject line of my message encrypted?**
No — unlike message content and attachments, subject lines are kept as readable text for inbox display and search purposes. Avoid including highly sensitive details directly in a subject line.

---

# 22. Glossary

| Term | Definition |
|---|---|
| **AES-256-GCM** | The symmetric encryption algorithm used to lock the actual content of each message and file. |
| **RSA-2048** | The asymmetric (public/private key) encryption algorithm used to securely share each message's unique encryption key with its intended recipients. |
| **Audit Log** | The permanent record of security-relevant actions within an organization, viewable by Owners/Admins. |
| **Decryption** | Unlocking encrypted data back into its original, readable form using the correct key. |
| **Encryption** | Scrambling data using a key so that it cannot be read without that key. |
| **Key Wrapping** | The process of encrypting a message's encryption key individually for each recipient, using that recipient's personal public key. |
| **Master Password** | The password you set to protect (encrypt) your own private key for safe storage and cross-device sync. Not used for login. |
| **One-Time Passcode (OTP)** | The 6-digit, time-limited code emailed to you to verify your identity at sign-in. |
| **Organization (Org)** | The company or team an account belongs to within SecureShare. |
| **Organization Vault** | An organization-wide encryption keypair allowing shared, org-level access to designated messages. |
| **Private Key** | The secret half of your personal encryption keypair, used to decrypt content addressed to you. Generated on, and ideally never leaving, your own devices. |
| **Public Key** | The shareable half of your personal encryption keypair, used by others to encrypt content for you. |
| **Recovery Key** | A unique backup code generated at setup, used to regain access if your Master Password is forgotten. |
| **Role** | Your permission level within an organization: Owner, Admin, or User. |
| **Vault** | A general term for your personal store of encryption keys, and the state of having them available ("unlocked") for use. |
| **Zero-Knowledge** | A design principle meaning the service provider (SecureShare) never has access to your data or keys in a readable form. |

---

# 23. Appendix A: Security & Encryption Explained Simply

Imagine every message you send in SecureShare is placed inside a small, sealed box.

1. **The box gets its own unique lock.** Every single message gets a brand-new, randomly generated lock-and-key combination — it's never reused from any other message, by you or anyone else.
2. **Only the right people get a key that fits.** For each person you're sending the message to, SecureShare creates a personal copy of that one-time key, and then re-locks that copy using a separate, permanent key that only belongs to that specific recipient. It's like having a master key cut into several copies, then placing each copy into its own personal safe that only one person can open.
3. **The box is sealed before it leaves your computer.** All of this locking happens on your own device, inside your web browser, before anything is sent anywhere. SecureShare's servers only ever receive the sealed box and the individually-locked key copies — never anything readable.
4. **Recipients open the box with their own permanent key.** When a recipient opens their copy of the small key (using their own personal, permanent key, protected by their Master Password), they can then use that small key to open the actual sealed box and read the message or download the files inside.
5. **Nobody else — including SecureShare — has a key that opens anything.** Because the permanent keys are generated on individual devices and only ever stored on the server in a locked (encrypted) form, SecureShare itself has no way to open any box, for any message, ever.

This is what is meant by **end-to-end encryption** and **zero-knowledge**: the protection travels with the data itself from the moment it's created to the moment its intended recipient opens it, and the service in the middle is never able to peek inside.

---

# 24. Appendix B: Technical Encryption Reference

This appendix is for technically-minded readers who want precise detail on SecureShare's cryptographic design.

## B.1 Identity Keys

- Each user generates an **RSA-2048** asymmetric keypair, created client-side using the browser's native Web Crypto API at onboarding time.
- The **public key** is stored in plaintext on the server and is used by senders to wrap (encrypt) symmetric keys intended for that user.
- The **private key** is never transmitted to the server in plaintext. It is:
  - Stored locally in the browser (IndexedDB) for immediate use, and
  - Separately encrypted for **Key Sync**, using a key derived from the user's Master Password via **PBKDF2** (100,000 iterations, SHA-256), with a random 16-byte salt and 12-byte IV, then encrypted with **AES-256-GCM**. The resulting ciphertext, salt, and IV are stored server-side.
  - Separately encrypted **again** using a 48-character (24-byte) randomly generated Recovery Key, via the same PBKDF2 → AES-256-GCM scheme, providing an independent recovery path that does not depend on the Master Password.

## B.2 Message & File Encryption

- For every message, a fresh, random **AES-256-GCM** symmetric key is generated client-side.
- The message body (and each attached file) is encrypted with this key using AES-GCM, with the IV prepended to the resulting ciphertext.
- The same one-time AES key is then **wrapped** (encrypted) once per recipient using **RSA-OAEP** with that recipient's RSA public key, producing a distinct `encryptedAesKey` value per recipient — stored against each `MessageRecipient` record. There is no shared symmetric key across recipients.
- If a message is shared with an organization's Vault, the same one-time AES key is additionally wrapped using the **Organization's** RSA public key and stored in a corresponding `MessageOrgShare` record.

## B.3 Organization Vault Keys

- An Owner can generate an organization-level RSA-2048 keypair.
- The organization's private key is encrypted using a PBKDF2-derived AES-256-GCM key, sourced from an organization password chosen by the Owner — using the same cryptographic pattern as personal Key Sync.

## B.4 Decryption Flow

1. The client retrieves the user's encrypted private key (from local storage, or from the server via Key Sync) and the user's Master Password (entered at the time of use).
2. PBKDF2 re-derives the AES key from the Master Password and stored salt; AES-GCM decrypts the private key.
3. The private RSA key is imported into the Web Crypto API.
4. For the message being viewed, the recipient's specific wrapped AES key is decrypted using RSA-OAEP with the private key.
5. The resulting one-time AES key decrypts the message body and any attachments, entirely client-side.

## B.5 Operational Safeguards

- **Rate limiting:** message sending is capped at 20 per hour per user; sensitive page loads are also rate-limited per IP address to mitigate automated abuse. (Implemented as an in-memory limiter; suitable for single-instance deployments, with the documented expectation that a distributed store such as Redis would be used for multi-instance/production-scale deployments.)
- **Session model:** authentication uses server-side sessions (rather than long-lived client tokens) with a per-user session list and an explicit revoke action, so compromised sessions can be terminated immediately.
- **Audit logging:** action types including `MESSAGE_SENT`, `CROSS_ORG_MESSAGE_SENT`, `CROSS_ORG_DOC_VIEWED`, `LOGIN`, `ONBOARDING_COMPLETED`, and `MASTER_PASSWORD_RESET` are persisted with actor, timestamp, IP address, and contextual metadata.
- **Message/document expiry:** an optional `expiryDate` on messages and documents is enforced at decrypt-time, independent of deletion state, ensuring time-bound content cannot be retrieved past its intended window even if records are not separately deleted.

---

*End of document.*
