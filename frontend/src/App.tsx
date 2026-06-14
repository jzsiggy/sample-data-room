import { AppRoutes } from "./AppRoutes";
import { AuthProvider } from "./auth/AuthContext";

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
