import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Room,
  deleteRoom,
  getRoom,
  regenerateShareToken,
  renameRoom,
  setLinkEnabled,
  shareLink,
} from "../rooms/rooms-api";

export function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");

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
    </main>
  );
}
