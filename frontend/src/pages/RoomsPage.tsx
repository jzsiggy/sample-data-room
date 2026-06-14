import { useAuth } from "../auth/useAuth";

// Placeholder signed-in landing. Issue 03 builds the real rooms dashboard here.
export function RoomsPage() {
  const { owner, logout } = useAuth();

  return (
    <main>
      <h1>Rooms</h1>
      <p>Signed in as {owner?.email}</p>
      <button type="button" onClick={() => logout()}>
        Log out
      </button>
    </main>
  );
}
