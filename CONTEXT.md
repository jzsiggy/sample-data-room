# Data Room

The shared language for a simple file-sharing app: an owner gathers files into a room and shares that room through a single public link. "Data room" names the product; the entity is a **Room**.

## Language

### Structure

**Room**:
A named container that holds files and is shared as a single unit. Flat — a room holds files directly, with no nested folders.
_Avoid_: Folder, Space, Vault, Collection, Data room (as an entity name)

**File**:
Any uploaded artifact inside a room — its bytes plus a name, type, and size. Any file type is accepted.
_Avoid_: Document, attachment, asset, upload

### People

**Owner**:
The authenticated person who signs in, creates rooms, and uploads and shares files. A room has exactly one owner.
_Avoid_: User, account, member, admin

**Viewer**:
An anonymous person who opens a room through its public link. Never signs in; the system records no identity for them. Disjoint from Owner.
_Avoid_: Guest, visitor, recipient, client

### Sharing

**Share link**:
The public URL an owner hands out for a room. Contains the share token.
_Avoid_: Public link, share URL

**Share token**:
The unguessable secret embedded in the share link that identifies a room publicly. Distinct from the room's internal id.
_Avoid_: Slug, key, code

**Disable / Enable**:
Turn a room's share link off or back on. Reversible — re-enabling restores the same link (same token).
_Avoid_: Revoke (ambiguous between reversible and permanent), pause, deactivate

**Regenerate**:
Replace a room's share token with a new one. Permanent — the old share link stops working forever, even if the link is later enabled.
_Avoid_: Revoke, reset, rotate

### Activity

**View**:
A counted load of a room's public page through its share link. Raw count — not deduplicated by person, since viewers are anonymous.
_Avoid_: Visit, hit, impression, open

**Preview**:
Rendering a file (PDF or image) directly in the browser on the room page, without downloading. Does not increment the download count.
_Avoid_: View (reserved for room access), open

**Download**:
An explicit retrieval of a file's bytes by a viewer via the download action. Inline preview does not count as a download.
_Avoid_: Fetch, access, get
