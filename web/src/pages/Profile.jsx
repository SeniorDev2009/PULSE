import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, absoluteUrl } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";

export default function Profile() {
  const { username } = useParams();
  const { token } = useAuth();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
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
