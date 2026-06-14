import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Room, createRoom, listRooms } from "../rooms/rooms-api";

export function RoomsPage() {
  const { owner, logout } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    let cancelled = false;
    listRooms()
      .then((value) => {
        if (!cancelled) setRooms(value);
      })
      .catch(() => {
        /* leave the list empty on failure */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const created = await createRoom(name);
    setRooms((prev) => [created, ...prev]);
    setName("");
  }

  return (
    <main>
      <header>
        <h1>Rooms</h1>
        <p>Signed in as {owner?.email}</p>
        <button type="button" onClick={() => logout()}>
          Log out
        </button>
      </header>

      <form onSubmit={onSubmit}>
        <label htmlFor="room-name">Room name</label>
        <input
          id="room-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit">Create room</button>
      </form>

      <ul>
        {rooms.map((room) => (
          <li key={room.id}>
            <Link to={`/rooms/${room.id}`}>{room.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
