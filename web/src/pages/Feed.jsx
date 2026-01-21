import React, { useEffect, useMemo, useState } from "react";
import { api, absoluteUrl, uploadImage } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { io } from "socket.io-client";

function timeLeft(expiresAt) {
  if (!expiresAt) return "";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / (1000 * 60 * 60));
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${h}h ${m}m`;
}

export default function Feed() {
  const { token } = useAuth();

  // NEW: mode toggle
  const [mode, setMode] = useState("following"); // "following" | "explore"

  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);

  const [content, setContent] = useState("");
  const [type, setType] = useState("POST");
  const [mediaUrl, setMediaUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyError, setReplyError] = useState("");

  const socket = useMemo(() => {
    if (!token) return null;
    return io("http://localhost:4000", { auth: { token } });
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    socket.on("post:new", (post) => {
      // Real-time post qo'shish: faqat following mode bo'lganda (xohlasangiz explore’da ham qo‘shsa bo‘ladi)
      if (mode === "following") setItems((prev) => [post, ...prev]);
    });
    return () => socket.disconnect();
  }, [socket, mode]);

  function endpointBase() {
    return mode === "explore" ? "/api/posts/explore" : "/api/posts/feed";
  }

  async function loadFirst() {
    const d = await api(endpointBase(), { token });
    setItems(d.items);
    setNextCursor(d.nextCursor);
  }

  async function loadMore() {
    if (!nextCursor) return;
    const d = await api(`${endpointBase()}?cursor=${encodeURIComponent(nextCursor)}`, { token });
    setItems((p) => [...p, ...d.items]);
    setNextCursor(d.nextCursor);
  }

  // NEW: mode o‘zgarsa qayta yuklaydi
  useEffect(() => {
    loadFirst().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function createPost(e) {
    e.preventDefault();
    if (!content.trim()) return;

    const d = await api("/api/posts", {
      method: "POST",
      token,
      body: { content, mediaUrl, type }
    });

    // Post yaratganda: ikkala mode’da ham tepaga qo‘shamiz
    setItems((p) => [d.post, ...p]);
    setContent("");
    setMediaUrl("");
    setType("POST");
  }

  async function toggleLike(p) {
    const liked = p.likedByMe;
    const path = `/api/posts/${p.id}/like`;
    const d = await api(path, { method: liked ? "DELETE" : "POST", token });

    setItems((prev) =>
      prev.map((x) =>
        x.id === p.id ? { ...x, likedByMe: !liked, _count: { ...x._count, likes: d.likes } } : x
      )
    );
  }

  async function submitReply(e) {
    e.preventDefault();
    if (!replyTarget) return;
    if (!replyContent.trim()) {
      setReplyError("Javob matnini kiriting.");
      return;
    }
    setReplyError("");
    try {
      await api(`/api/posts/${replyTarget.id}/reply`, {
        method: "POST",
        token,
        body: { content: replyContent }
      });
      setItems((prev) =>
        prev.map((x) =>
          x.id === replyTarget.id
            ? { ...x, _count: { ...x._count, replies: x._count.replies + 1 } }
            : x
        )
      );
      setReplyContent("");
      setReplyTarget(null);
    } catch {
      setReplyError("Javob yuborilmadi. Qayta urinib ko‘ring.");
    }
  }

  async function onPickFile(file) {
    setUploading(true);
    try {
      const d = await uploadImage(file, token);
      setMediaUrl(d.url);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid">
      <section className="card">
        <h2>Yangi post</h2>

        <form onSubmit={createPost} className="form">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nima bo‘lyapti? (Pulse tanlansa 24 soatdan keyin yo‘qoladi)"
            rows={4}
          />

          <div className="row">
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="POST">Oddiy Post</option>
              <option value="PULSE">Pulse (24h)</option>
            </select>

            <label className="btn">
              Rasm yuklash
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files?.[0] && onPickFile(e.target.files[0])}
              />
            </label>

            <button className="btn primary" disabled={uploading} type="submit">
              {uploading ? "Yuklanmoqda..." : "Post"}
            </button>
          </div>

          {mediaUrl && <img className="preview" src={absoluteUrl(mediaUrl)} alt="preview" />}
        </form>
      </section>

      <section className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Feed</h2>

          {/* NEW: toggle */}
          <div className="row" style={{ gap: 8 }}>
            <button
              className={"btn " + (mode === "following" ? "primary" : "")}
              onClick={() => setMode("following")}
              type="button"
            >
              Following
            </button>
            <button
              className={"btn " + (mode === "explore" ? "primary" : "")}
              onClick={() => setMode("explore")}
              type="button"
            >
              Explore
            </button>
          </div>
        </div>

        <div className="list" style={{ marginTop: 10 }}>
          {items.map((p) => (
            <div className={`post ${p.type === "PULSE" ? "pulse" : ""}`} key={p.id}>
              <div className="postHead">
                <div className="who">
                  <b>{p.author.displayName}</b> <span className="muted">@{p.author.username}</span>
                </div>
                <div className="muted small">
                  {new Date(p.createdAt).toLocaleString()}
                  {p.type === "PULSE" && <span className="pill">Pulse: {timeLeft(p.expiresAt)}</span>}
                </div>
              </div>

              <div className="content">{p.content}</div>

              {p.mediaUrl && <img className="media" src={absoluteUrl(p.mediaUrl)} alt="media" />}

              <div className="actions">
                <button className="btn" onClick={() => toggleLike(p)} type="button">
                  {p.likedByMe ? "❤️" : "🤍"} {p._count.likes}
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setReplyTarget(p);
                    setReplyContent("");
                    setReplyError("");
                  }}
                  type="button"
                >
                  💬 Javob ({p._count.replies})
                </button>
              </div>
            </div>
          ))}
        </div>

        {nextCursor && (
          <button className="btn" onClick={loadMore} type="button">
            Yana yuklash
          </button>
        )}
      </section>

      {replyTarget && (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="modalCard">
            <div className="modalHeader">
              <h3>Javob yozish</h3>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setReplyTarget(null);
                  setReplyContent("");
                  setReplyError("");
                }}
              >
                Yopish
              </button>
            </div>
            <div className="modalBody">
              <div className="muted small">
                @{replyTarget.author.username} postiga javob
              </div>
              <form onSubmit={submitReply} className="form" style={{ marginTop: 10 }}>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Javobingiz..."
                  rows={4}
                />
                {replyError && <div className="error">{replyError}</div>}
                <div className="row" style={{ justifyContent: "flex-end" }}>
                  <button className="btn" type="button" onClick={() => setReplyTarget(null)}>
                    Bekor qilish
                  </button>
                  <button className="btn primary" type="submit">
                    Yuborish
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
