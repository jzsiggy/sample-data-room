import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatSize } from "../rooms/format-size";
import {
  MAX_FILE_SIZE,
  Room,
  RoomFile,
  confirmUpload,
  deleteFile,
  deleteRoom,
  getRoom,
  listFiles,
  presignUpload,
  putToStorage,
  regenerateShareToken,
  renameRoom,
  setLinkEnabled,
  shareLink,
} from "../rooms/rooms-api";

export function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [files, setFiles] = useState<RoomFile[]>([]);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getRoom(id)
      .then((value) => {
        if (!cancelled) setRoom(value);
      })
      .catch(() => {
        /* leave empty on failure */
      });
    listFiles(id)
      .then((value) => {
        if (!cancelled) setFiles(value);
      })
      .catch(() => {
        /* leave empty on failure */
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!room) {
    return <p>Loading…</p>;
  }

  function startRename() {
    setDraftName(room!.name);
    setRenaming(true);
  }

  async function onRename(event: FormEvent) {
    event.preventDefault();
    const updated = await renameRoom(room!.id, draftName);
    setRoom(updated);
    setRenaming(false);
  }

  async function onDelete() {
    await deleteRoom(room!.id);
    navigate("/rooms");
  }

  async function onCopy() {
    await navigator.clipboard.writeText(shareLink(room!.shareToken));
  }

  async function onToggleLink() {
    const updated = await setLinkEnabled(room!.id, !room!.linkEnabled);
    setRoom(updated);
  }

  async function onRegenerate() {
    const updated = await regenerateShareToken(room!.id);
    setRoom(updated);
  }

  async function onSelectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!file || !room) return;

    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`"${file.name}" is larger than the 50 MB limit.`);
      return;
    }

    setUploadError(null);
    setUploading(true);
    const meta = {
      name: file.name,
      contentType: file.type,
      size: file.size,
    };
    try {
      const { url, key } = await presignUpload(room.id, meta);
      await putToStorage(url, file);
      const created = await confirmUpload(room.id, { ...meta, key });
      setFiles((prev) => [created, ...prev]);
    } catch {
      setUploadError(`Could not upload "${file.name}".`);
    } finally {
      setUploading(false);
    }
  }

  async function onDeleteFile(fileId: string) {
    await deleteFile(room!.id, fileId);
    setFiles((prev) => prev.filter((file) => file.id !== fileId));
  }

  return (
    <main>
      <h1>{room.name}</h1>

      {renaming ? (
        <form onSubmit={onRename}>
          <label htmlFor="room-name">Room name</label>
          <input
            id="room-name"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
          />
          <button type="submit">Save</button>
        </form>
      ) : (
        <button type="button" onClick={startRename}>
          Rename
        </button>
      )}

      <button type="button" onClick={onDelete}>
        Delete
      </button>

      <section>
        <label htmlFor="share-link">Share link</label>
        <input
          id="share-link"
          readOnly
          value={shareLink(room.shareToken)}
        />
        <button type="button" onClick={onCopy}>
          Copy
        </button>
        <button type="button" onClick={onToggleLink}>
          {room.linkEnabled ? "Disable" : "Enable"}
        </button>
        <button type="button" onClick={onRegenerate}>
          Regenerate
        </button>
      </section>

      <section>
        <h2>Files</h2>

        <label htmlFor="file-upload">Upload a file</label>
        <input id="file-upload" type="file" onChange={onSelectFile} />
        {uploading && <p>Uploading…</p>}
        {uploadError && <p role="alert">{uploadError}</p>}

        <ul>
          {files.map((file) => (
            <li key={file.id}>
              <span>{file.name}</span>
              <span>{file.contentType}</span>
              <span>{formatSize(file.size)}</span>
              <button
                type="button"
                aria-label={`Delete ${file.name}`}
                onClick={() => onDeleteFile(file.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
