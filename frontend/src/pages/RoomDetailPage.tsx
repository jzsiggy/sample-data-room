import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Room, deleteRoom, getRoom, renameRoom } from "../rooms/rooms-api";

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
    </main>
  );
}
