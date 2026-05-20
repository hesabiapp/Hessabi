import React, { useEffect, useState } from "react";
import "../Style/Instagram.css";

const API = import.meta.env.VITE_API_URL;

type Post = {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
};

type Story = {
  id: string;
  media_url?: string;
  timestamp: string;
};

type IGData = {
  connected: boolean;
  reason?: string;
  profile?: {
    username: string;
    followersCount: number;
    mediaCount: number;
    profilePictureUrl?: string;
  };
  insights?: {
    reach: number;
    impressions: number;
    profileViews: number;
  };
  topPosts?: Post[];
  stories?: Story[];
};

const formatNumber = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const InstagramTab = () => {
  const [data, setData]       = useState<IGData | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetchIGData();

    // If user just came back from OAuth, check the URL param
    const params = new URLSearchParams(window.location.search);
    if (params.get("ig") === "connected") {
      // Clean the URL without reload
      window.history.replaceState({}, "", window.location.pathname + "?tab=instagram");
      fetchIGData();
    }
  }, []);

  const fetchIGData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/instagram/data`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const json = await res.json();
      setData(json);
    } catch {
      setData({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // Redirect to backend OAuth entry point
    window.location.href = `${API}/instagram/auth?token=${localStorage.getItem("token")}`;
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect your Instagram account?")) return;
    setDisconnecting(true);
    try {
      await fetch(`${API}/instagram/disconnect`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setData({ connected: false });
    } catch {
      alert("Something went wrong. Try again.");
    } finally {
      setDisconnecting(false);
    }
  };

  // ── Loading state ──────────────────────────
  if (loading) {
    return (
      <div className="ig-loading">
        <div className="ig-spinner" />
        <p>Loading Instagram data...</p>
      </div>
    );
  }

  // ── Not connected state ────────────────────
  if (!data?.connected) {
    return (
      <div className="ig-connect-wrapper">
        <div className="ig-connect-card">
          <div className="ig-connect-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="1.8"/>
              <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8"/>
              <circle cx="17.5" cy="6.5" r="1" fill="white"/>
            </svg>
          </div>
          <h2>Connect Instagram</h2>
          <p>
            Link your Instagram Business account to see followers, reach,
            post engagement, stories, and your top posts — all inside Hessabi.
          </p>
          <div className="ig-connect-features">
            <div className="ig-feature"><span>📈</span> Followers & Growth</div>
            <div className="ig-feature"><span>👁</span> Reach & Impressions</div>
            <div className="ig-feature"><span>❤️</span> Post Engagement</div>
            <div className="ig-feature"><span>🎬</span> Stories Performance</div>
            <div className="ig-feature"><span>🏆</span> Top Performing Posts</div>
          </div>
          <button className="ig-connect-btn" onClick={handleConnect}>
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
              <rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="2"/>
              <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="2"/>
              <circle cx="17.5" cy="6.5" r="1" fill="white"/>
            </svg>
            Connect Instagram Account
          </button>
          {data?.reason === "token_expired" && (
            <p className="ig-expired-note">⚠️ Your session expired — please reconnect.</p>
          )}
          <p className="ig-connect-note">Requires an Instagram Business or Creator account</p>
        </div>
      </div>
    );
  }

  // ── Connected state ────────────────────────
  const { profile, insights, topPosts = [], stories = [] } = data;
  const totalEngagement = topPosts.reduce(
    (s, p) => s + p.like_count + p.comments_count, 0
  );
  const engagementRate = profile?.followersCount
    ? ((totalEngagement / (topPosts.length || 1) / profile.followersCount) * 100).toFixed(2)
    : "0.00";

  return (
    <div className="ig-wrapper">

      {/* Header */}
      <div className="ig-header">
        <div className="ig-profile-row">
          {profile?.profilePictureUrl ? (
            <img src={profile.profilePictureUrl} className="ig-avatar" alt="profile" />
          ) : (
            <div className="ig-avatar-placeholder">
              <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="1.8"/>
                <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8"/>
                <circle cx="17.5" cy="6.5" r="1" fill="white"/>
              </svg>
            </div>
          )}
          <div>
            <div className="ig-username">@{profile?.username}</div>
            <div className="ig-tag">Instagram Business</div>
          </div>
        </div>
        <button
          className="ig-disconnect-btn"
          onClick={handleDisconnect}
          disabled={disconnecting}
        >
          {disconnecting ? "Disconnecting..." : "Disconnect"}
        </button>
      </div>

      {/* KPI row */}
      <div className="ig-kpi-grid">
        <div className="ig-kpi">
          <span className="ig-kpi-label">Followers</span>
          <span className="ig-kpi-value">{formatNumber(profile?.followersCount ?? 0)}</span>
          <span className="ig-kpi-sub">{profile?.mediaCount ?? 0} posts</span>
        </div>
        <div className="ig-kpi">
          <span className="ig-kpi-label">Reach</span>
          <span className="ig-kpi-value">{formatNumber(insights?.reach ?? 0)}</span>
          <span className="ig-kpi-sub">Last 30 days</span>
        </div>
        <div className="ig-kpi">
          <span className="ig-kpi-label">Impressions</span>
          <span className="ig-kpi-value">{formatNumber(insights?.impressions ?? 0)}</span>
          <span className="ig-kpi-sub">Last 30 days</span>
        </div>
        <div className="ig-kpi highlight">
          <span className="ig-kpi-label">Engagement Rate</span>
          <span className="ig-kpi-value ig-gradient-text">{engagementRate}%</span>
          <span className="ig-kpi-sub">Avg per post</span>
        </div>
        <div className="ig-kpi">
          <span className="ig-kpi-label">Profile Views</span>
          <span className="ig-kpi-value">{formatNumber(insights?.profileViews ?? 0)}</span>
          <span className="ig-kpi-sub">Last 30 days</span>
        </div>
      </div>

      {/* Row: Top Posts + Engagement breakdown */}
      <div className="ig-row">
        <div className="ig-card wide">
          <h3 className="ig-card-title">Top Performing Posts</h3>
          {topPosts.length === 0 ? (
            <p className="ig-empty">No posts found</p>
          ) : (
            <div className="ig-post-grid">
              {topPosts.slice(0, 6).map((post, i) => (
                <div key={post.id} className="ig-post-thumb">
                  {post.media_url ? (
                    <img
                      src={post.media_type === "VIDEO" ? post.thumbnail_url : post.media_url}
                      alt={post.caption ?? "post"}
                      className="ig-post-img"
                    />
                  ) : (
                    <div className="ig-post-placeholder" />
                  )}
                  {i < 3 && <span className="ig-post-rank">#{i + 1}</span>}
                  <div className="ig-post-overlay">
                    <span className="ig-post-stat">❤️ {formatNumber(post.like_count)}</span>
                    <span className="ig-post-stat">💬 {formatNumber(post.comments_count)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ig-card">
          <h3 className="ig-card-title">Engagement Breakdown</h3>
          {topPosts.length === 0 ? (
            <p className="ig-empty">No data yet</p>
          ) : (
            <div className="ig-engagement-list">
              {topPosts.slice(0, 5).map((post, i) => {
                const eng = post.like_count + post.comments_count;
                const maxEng = Math.max(...topPosts.map(p => p.like_count + p.comments_count), 1);
                const pct = (eng / maxEng) * 100;
                return (
                  <div key={post.id} className="ig-eng-row">
                    <span className="ig-eng-label">Post {i + 1} · {formatDate(post.timestamp)}</span>
                    <div className="ig-eng-bar-bg">
                      <div className="ig-eng-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="ig-eng-val">{formatNumber(eng)}</span>
                  </div>
                );
              })}
              <div className="ig-eng-legend">
                <span>❤️ {formatNumber(topPosts.reduce((s, p) => s + p.like_count, 0))} likes</span>
                <span>💬 {formatNumber(topPosts.reduce((s, p) => s + p.comments_count, 0))} comments</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stories */}
      <div className="ig-card" style={{ marginBottom: 20 }}>
        <h3 className="ig-card-title">Recent Stories</h3>
        {stories.length === 0 ? (
          <p className="ig-empty">No active stories</p>
        ) : (
          <div className="ig-stories-row">
            {stories.slice(0, 8).map((story) => (
              <div key={story.id} className="ig-story-bubble">
                {story.media_url ? (
                  <img src={story.media_url} alt="story" className="ig-story-img" />
                ) : (
                  <div className="ig-story-placeholder" />
                )}
                <span className="ig-story-date">{formatDate(story.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default InstagramTab;