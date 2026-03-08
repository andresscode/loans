import "./global.css";
import { HashRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { LoginPage } from "@/pages/login";
import { HomePage } from "@/pages/home";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
