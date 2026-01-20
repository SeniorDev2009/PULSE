import React, { useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("demo@demo.com");
  const [password, setPassword] = useState("12345678");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await login(email, password);
      nav("/");
    } catch (e) {
      setErr("Login xato. Email/parol tekshiring.");
    }
  }

  return (
    <div className="card">
      <h2>Kirish</h2>
      <form onSubmit={onSubmit} className="form">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Parol" type="password" />
        {err && <div className="error">{err}</div>}
        <button className="btn primary" type="submit">Kirish</button>
      </form>
    </div>
  );
}
