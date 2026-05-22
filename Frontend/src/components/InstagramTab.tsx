import React, { useEffect, useState } from "react";
import "../Style/Instagram.css";
import { Heart, MessageCircle } from "lucide-react";

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

// ── Demo data ──────────────────────────────────
const DEMO_DATA: IGData = {
  connected: true,
  profile: {
    username: "Hessabi._",
    followersCount: 1240,
    mediaCount: 47,
    profilePictureUrl: undefined,
  },
  insights: {
    reach: 3850,
    impressions: 9200,
    profileViews: 412,
  },
  topPosts: [
    { id: "1", caption: "New collection just dropped 🔥", media_type: "IMAGE", timestamp: "2026-05-10T10:00:00Z", like_count: 184, comments_count: 23 },
    { id: "2", caption: "Behind the scenes ✨", media_type: "IMAGE", timestamp: "2026-05-05T14:00:00Z", like_count: 156, comments_count: 18 },
    { id: "3", caption: "Thank you for 1000 followers! 🎉", media_type: "IMAGE", timestamp: "2026-04-28T09:00:00Z", like_count: 312, comments_count: 45 },
    { id: "4", caption: "Summer vibes only ☀️", media_type: "IMAGE", timestamp: "2026-04-20T16:00:00Z", like_count: 98, comments_count: 12 },
    { id: "5", caption: "New arrivals this week 🛍️", media_type: "IMAGE", timestamp: "2026-04-15T11:00:00Z", like_count: 143, comments_count: 19 },
    { id: "6", caption: "Restock alert 🚨", media_type: "IMAGE", timestamp: "2026-04-10T08:00:00Z", like_count: 87, comments_count: 9 },
  ],
  stories: [],
};

const formatNumber = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const InstagramTab = () => {
  const [data, setData]       = useState<IGData | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [isDemo, setIsDemo]   = useState(false);

  useEffect(() => {
    fetchIGData();
    const params = new URLSearchParams(window.location.search);
    if (params.get("ig") === "connected") {
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
      if (json.connected) {
        setData(json);
        setIsDemo(false);
      } else {
        setData(DEMO_DATA);
        setIsDemo(true);
      }
    } catch {
      setData(DEMO_DATA);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
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
      setData(DEMO_DATA);
      setIsDemo(true);
    } catch {
      alert("Something went wrong. Try again.");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="ig-loading">
        <div className="ig-spinner" />
        <p>Loading Instagram data...</p>
      </div>
    );
  }

  const { profile, insights, topPosts = [], stories = [] } = data!;
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isDemo && (
            <span style={{
              background: "linear-gradient(135deg, #f093fb, #f5576c)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 20,
              letterSpacing: 0.5,
            }}>
              DEMO MODE
            </span>
          )}
          {isDemo ? (
            <button className="ig-disconnect-btn" onClick={handleConnect}>
              Connect Real Account
            </button>
          ) : (
            <button
              className="ig-disconnect-btn"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          )}
        </div>
      </div>

      {/* Demo banner */}
      {isDemo && (
        <div style={{
          background: "linear-gradient(135deg, #667eea20, #764ba220)",
          border: "1px solid #667eea40",
          borderRadius: 12,
          padding: "12px 16px",
          marginBottom: 16,
          fontSize: 13,
          color: "#555",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span>✨</span>
          <span>This is a preview with sample data. Connect your Instagram Business account to see your real analytics.</span>
        </div>
      )}

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
                    <div className="ig-post-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" width="24" height="24" style={{ opacity: 0.3 }}>
                        <rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="1.5"/>
                        <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.5"/>
                      </svg>
                    </div>
                  )}
                  {i < 3 && <span className="ig-post-rank">#{i + 1}</span>}

                  {/* Caption — always visible at bottom */}
                  {post.caption && (
                    <div className="ig-post-caption">{post.caption}</div>
                  )}

                  {/* Stats — visible on hover */}
                  <div className="ig-post-overlay">
                    <span className="ig-post-stat">
                      <Heart size={13} color="#fff" /> {formatNumber(post.like_count)}
                    </span>
                    <span className="ig-post-stat">
                      <MessageCircle size={13} color="#fff" /> {formatNumber(post.comments_count)}
                    </span>
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
                <span><Heart size={14} color="#e24b4a" /> {formatNumber(topPosts.reduce((s, p) => s + p.like_count, 0))} likes</span>
                <span><MessageCircle size={14} color="#378add" /> {formatNumber(topPosts.reduce((s, p) => s + p.comments_count, 0))} comments</span>
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