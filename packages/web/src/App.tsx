import type { ReactNode } from "react";
import { Navigate, Route, BrowserRouter, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth.js";
import LoginPage from "./pages/LoginPage.js";
import ProjectsPage from "./pages/ProjectsPage.js";
import BoardPage from "./pages/BoardPage.js";

function RequireAuth({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="centered">Loading…</div>;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <ProjectsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <RequireAuth>
                <BoardPage />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
