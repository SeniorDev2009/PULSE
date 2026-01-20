import React, { useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", username: "", displayName: "", password: "" });
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await register(form);
      nav("/");
    } catch {
      setErr("Ro‘yxatdan o‘tishda xato. Email/username band bo‘lishi mumkin.");
    }
  }

  return (
    <div className="card">
      <h2>Ro‘yxatdan o‘tish</h2>
      <form onSubmit={onSubmit} className="form">
        <input value={form.email} onChange={(e)=>setForm(s=>({...s,email:e.target.value}))} placeholder="Email" />
        <input value={form.username} onChange={(e)=>setForm(s=>({...s,username:e.target.value}))} placeholder="Username (masalan: kamron_01)" />
        <input value={form.displayName} onChange={(e)=>setForm(s=>({...s,displayName:e.target.value}))} placeholder="Display name" />
        <input value={form.password} onChange={(e)=>setForm(s=>({...s,password:e.target.value}))} placeholder="Parol (8+)" type="password" />
        {err && <div className="error">{err}</div>}
        <button className="btn primary" type="submit">Yaratish</button>
      </form>
    </div>
  );
}
