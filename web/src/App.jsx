import React from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Feed from "./pages/Feed.jsx";
import Profile from "./pages/Profile.jsx";

function Shell({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="container">
      <header className="topbar">
        <Link className="logo" to="/">PULSE</Link>
        <nav className="nav">
          {user ? (
            <>
              <Link className="btn" to={`/u/${user.username}`}>Profil</Link>
              <span className="muted">@{user.username}</span>
              <button className="btn" onClick={logout}>Chiqish</button>
            </>
          ) : (
            <>
              <Link className="btn" to="/login">Kirish</Link>
              <Link className="btn" to="/register">Ro‘yxatdan o‘tish</Link>
            </>
          )}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}

function Private({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Shell>
        <Routes>
          <Route path="/" element={<Private><Feed /></Private>} />
          <Route path="/u/:username" element={<Private><Profile /></Private>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </Shell>
    </AuthProvider>
  );
}
