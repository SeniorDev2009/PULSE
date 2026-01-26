import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, absoluteUrl } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";

export default function Profile() {
  const { username } = useParams();
  const { token, user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    setIsFollowing(false);
    api(`/api/users/u/${username}`, { token })
      .then((d) => {
        if (!mounted) return;
        setUser(d.user);
      })
      .catch(() => {
        if (!mounted) return;
        setError("Profil topilmadi yoki yuklanmadi.");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token, username]);

  useEffect(() => {
    if (!user || !currentUser || user.id === currentUser.id) return;
    let mounted = true;
    api(`/api/users/follow/${user.id}`, { token })
      .then((d) => {
        if (!mounted) return;
        setIsFollowing(Boolean(d.following));
      })
      .catch(() => {
        if (!mounted) return;
        setIsFollowing(false);
      });

    return () => {
      mounted = false;
    };
  }, [token, user, currentUser]);

  async function toggleFollow() {
    if (!user || !currentUser || user.id === currentUser.id || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await api(`/api/users/follow/${user.id}`, { method: "DELETE", token });
        setIsFollowing(false);
        setUser((prev) =>
          prev
            ? {
                ...prev,
                _count: { ...prev._count, followers: Math.max((prev._count?.followers ?? 1) - 1, 0) }
              }
            : prev
        );
      } else {
        await api(`/api/users/follow/${user.id}`, { method: "POST", token });
        setIsFollowing(true);
        setUser((prev) =>
          prev
            ? { ...prev, _count: { ...prev._count, followers: (prev._count?.followers ?? 0) + 1 } }
            : prev
        );
      }
    } finally {
      setFollowLoading(false);
    }
  }

  return (
    <div className="profile">
      <section className="card profileCard">
        {loading && <div className="muted">Yuklanmoqda...</div>}
        {error && <div className="error">{error}</div>}
        {!loading && !error && user && (
          <>
            <div className="profileHeader">
              <div className="avatar">
                {user.avatarUrl ? (
                  <img src={absoluteUrl(user.avatarUrl)} alt={user.displayName} />
                ) : (
                  <span>{user.displayName?.[0]?.toUpperCase() ?? "?"}</span>
                )}
              </div>
              <div>
                <h2>{user.displayName}</h2>
                <div className="muted">@{user.username}</div>
              </div>
            </div>
            {currentUser && user.id !== currentUser.id && (
              <div className="profileActions">
                <button className="btn primary" type="button" onClick={toggleFollow} disabled={followLoading}>
                  {isFollowing ? "Kuzatishni bekor qilish" : "Kuzatish"}
                </button>
              </div>
            )}
            {user.bio && <p className="profileBio">{user.bio}</p>}
            <div className="profileStats">
              <div>
                <strong>{user._count?.posts ?? 0}</strong>
                <span>Postlar</span>
              </div>
              <div>
                <strong>{user._count?.followers ?? 0}</strong>
                <span>Followers</span>
              </div>
              <div>
                <strong>{user._count?.following ?? 0}</strong>
                <span>Following</span>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
