import React, { useEffect, useState, useRef } from "react";
import "../Style/Instagram.css";
import { Heart, MessageCircle, Inbox, Send, RefreshCw } from "lucide-react";

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

type Conversation = {
  id: string;
  participant: {
    username: string;
    profilePictureUrl?: string;
    isFollower: boolean;
  };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

type Message = {
  id: string;
  text: string;
  fromMe: boolean;
  createdAt: string;
  attachments: { type: string; url: string }[];
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

const DEMO_CONVERSATIONS: Conversation[] = [
  { id: "1", participant: { username: "fatima.designs", isFollower: true }, lastMessage: "Hi! Is this still available?", lastMessageAt: "2026-05-23T10:30:00Z", unreadCount: 2 },
  { id: "2", participant: { username: "noura_bh", isFollower: true }, lastMessage: "Thank you so much! 😊", lastMessageAt: "2026-05-23T09:00:00Z", unreadCount: 0 },
  { id: "3", participant: { username: "sara.style", isFollower: false }, lastMessage: "What sizes do you have?", lastMessageAt: "2026-05-22T18:45:00Z", unreadCount: 1 },
  { id: "4", participant: { username: "layla_99", isFollower: true }, lastMessage: "Can I order 2?", lastMessageAt: "2026-05-22T14:00:00Z", unreadCount: 0 },
];

const DEMO_MESSAGES: Record<string, Message[]> = {
  "1": [
    { id: "m1", text: "Hi! Is this still available?", fromMe: false, createdAt: "2026-05-23T10:28:00Z", attachments: [] },
    { id: "m2", text: "How much does it cost?", fromMe: false, createdAt: "2026-05-23T10:30:00Z", attachments: [] },
  ],
  "2": [
    { id: "m3", text: "I received my order!", fromMe: false, createdAt: "2026-05-23T08:55:00Z", attachments: [] },
    { id: "m4", text: "So glad to hear that! Enjoy 🎉", fromMe: true, createdAt: "2026-05-23T09:00:00Z", attachments: [] },
    { id: "m5", text: "Thank you so much! 😊", fromMe: false, createdAt: "2026-05-23T09:01:00Z", attachments: [] },
  ],
  "3": [
    { id: "m6", text: "What sizes do you have?", fromMe: false, createdAt: "2026-05-22T18:45:00Z", attachments: [] },
  ],
  "4": [
    { id: "m7", text: "Can I order 2?", fromMe: false, createdAt: "2026-05-22T14:00:00Z", attachments: [] },
  ],
};

const formatNumber = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const formatTime = (d: string | null) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return formatDate(d);
};

const InstagramTab = () => {
  const [data, setData]             = useState<IGData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [isDemo, setIsDemo]         = useState(false);
  const [activeTab, setActiveTab]   = useState<"overview" | "inbox">("overview");

  // Inbox state
  const [conversations, setConversations]     = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId]   = useState<string | null>(null);
  const [messages, setMessages]               = useState<Message[]>([]);
  const [replyText, setReplyText]             = useState("");
  const [sending, setSending]                 = useState(false);
  const [inboxLoading, setInboxLoading]       = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

useEffect(() => { fetchIGData(); }, []);
 useEffect(() => {
  if (activeTab === "inbox") {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
    fetchConversations();
    autoRefreshRef.current = setInterval(() => {
      fetchConversations(true);
      if (selectedConvId) fetchMessages(selectedConvId, true);
    }, 10000);
  }
  return () => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
  };
}, [activeTab, selectedConvId]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

const fetchConversations = async (silent = false) => {
  if (!silent) setInboxLoading(true);
  try {
    if (isDemo) {
      setConversations(DEMO_CONVERSATIONS);
      return;
    }
    const res = await fetch(`${API}/instagram/inbox`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const json = await res.json();
    const newConvs: Conversation[] = json.conversations ?? [];

   
    if (silent && conversations.length > 0) {
  newConvs.forEach(newConv => {
    const existing = conversations.find(c => c.id === newConv.id);
    const isNewMessage = !existing || 
      (newConv.lastMessageAt && existing.lastMessageAt && 
       new Date(newConv.lastMessageAt) > new Date(existing.lastMessageAt));
    
    if (isNewMessage && newConv.lastMessage) {
      if (Notification.permission === "granted") {
        new Notification(`New message from @${newConv.participant.username}`, {
          body: newConv.lastMessage,
          icon: "/images/HLogo.png",
        });
      }
    }
  });
}


    setConversations(newConvs);
  } catch {
    if (isDemo) setConversations(DEMO_CONVERSATIONS);
  } finally {
    if (!silent) setInboxLoading(false);
  }
};


  const fetchMessages = async (convId: string, silent = false) => {
    if (!silent) setMessagesLoading(true);
    try {
      if (isDemo) {
        setMessages(DEMO_MESSAGES[convId] ?? []);
        return;
      }
      const res = await fetch(`${API}/instagram/inbox/${convId}/messages`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const json = await res.json();
      setMessages(json.messages ?? []);
    } catch {
      if (isDemo) setMessages(DEMO_MESSAGES[convId] ?? []);
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  };

  const handleSelectConversation = (convId: string) => {
    setSelectedConvId(convId);
    setMessages([]);
    fetchMessages(convId);
    // Mark as read locally
    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c)
    );
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConvId || sending) return;
    setSending(true);
    const text = replyText.trim();
    setReplyText("");

    // Optimistic update
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      text,
      fromMe: true,
      createdAt: new Date().toISOString(),
      attachments: [],
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      if (!isDemo) {
        await fetch(`${API}/instagram/inbox/${selectedConvId}/reply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ text }),
        });
      }
      // Update last message in conversation list
      setConversations(prev =>
        prev.map(c => c.id === selectedConvId ? { ...c, lastMessage: text, lastMessageAt: new Date().toISOString() } : c)
      );
    } catch {
      // Remove optimistic on failure
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setReplyText(text);
    } finally {
      setSending(false);
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

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);
  const selectedConv = conversations.find(c => c.id === selectedConvId);

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
            }}>DEMO MODE</span>
          )}
          {isDemo ? (
            <button className="ig-disconnect-btn" onClick={handleConnect}>Connect Real Account</button>
          ) : (
            <button className="ig-disconnect-btn" onClick={handleDisconnect} disabled={disconnecting}>
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

      {/* Sub-tabs */}
      <div className="ig-subtabs">
        <button
          className={`ig-subtab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={`ig-subtab ${activeTab === "inbox" ? "active" : ""}`}
          onClick={() => setActiveTab("inbox")}
        >
          <Inbox size={14} />
          Inbox
          {totalUnread > 0 && <span className="ig-unread-badge">{totalUnread}</span>}
        </button>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <>
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
                      {post.caption && <div className="ig-post-caption">{post.caption}</div>}
                      <div className="ig-post-overlay">
                        <span className="ig-post-stat"><Heart size={13} color="#fff" /> {formatNumber(post.like_count)}</span>
                        <span className="ig-post-stat"><MessageCircle size={13} color="#fff" /> {formatNumber(post.comments_count)}</span>
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
        </>
      )}

      {/* ── INBOX TAB ── */}
      {activeTab === "inbox" && (
        <div className="ig-inbox">

          {/* Conversation list */}
          <div className="ig-conv-list">
            <div className="ig-conv-list-header">
              <span>Messages</span>
              <button className="ig-refresh-btn" onClick={() => fetchConversations()}>
                <RefreshCw size={14} />
              </button>
            </div>
            {inboxLoading ? (
              <div className="ig-inbox-loading"><div className="ig-spinner-sm" /></div>
            ) : conversations.length === 0 ? (
              <p className="ig-empty" style={{ padding: "20px 16px" }}>No conversations yet</p>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`ig-conv-item ${selectedConvId === conv.id ? "active" : ""}`}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <div className="ig-conv-avatar">
                    {conv.participant.profilePictureUrl ? (
                      <img src={conv.participant.profilePictureUrl} alt={conv.participant.username} />
                    ) : (
                      <div className="ig-conv-avatar-placeholder">
                        {conv.participant.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="ig-conv-info">
                    <div className="ig-conv-top">
                      <span className="ig-conv-name">@{conv.participant.username}</span>
                      <span className="ig-conv-time">{formatTime(conv.lastMessageAt)}</span>
                    </div>
                    <div className="ig-conv-bottom">
                      {conv.unreadCount > 0 && (
                        <span className="ig-unread-dot">{conv.unreadCount}</span>
                      )}
                    </div>
                    {conv.participant.isFollower && (
                      <span className="ig-follower-badge">Follower</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Messages panel */}
          <div className="ig-messages-panel">
            {!selectedConvId ? (
              <div className="ig-no-conv">
                <Inbox size={40} color="#ccc" />
                <p>Select a conversation to start replying</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="ig-chat-header">
                  <div className="ig-conv-avatar" style={{ width: 36, height: 36 }}>
                    {selectedConv?.participant.profilePictureUrl ? (
                      <img src={selectedConv.participant.profilePictureUrl} alt="" />
                    ) : (
                      <div className="ig-conv-avatar-placeholder">
                        {selectedConv?.participant.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="ig-chat-name">@{selectedConv?.participant.username}</div>
                    {selectedConv?.participant.isFollower && (
                      <div className="ig-chat-sub">Follows you</div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="ig-messages-list">
                  {messagesLoading ? (
                    <div className="ig-inbox-loading"><div className="ig-spinner-sm" /></div>
                  ) : messages.length === 0 ? (
                    <p className="ig-empty" style={{ textAlign: "center", marginTop: 40 }}>No messages yet</p>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id} className={`ig-msg ${msg.fromMe ? "from-me" : "from-them"}`}>
                        <div className="ig-msg-bubble">
                          {msg.text}
                          {msg.attachments.map((a, i) => (
                            <div key={i} className="ig-msg-attachment">
                              {a.type === "image" ? (
                                <img src={a.url} alt="attachment" />
                              ) : (
                                <a href={a.url} target="_blank" rel="noreferrer">Attachment</a>
                              )}
                            </div>
                          ))}
                        </div>
                        <span className="ig-msg-time">{formatTime(msg.createdAt)}</span>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply input */}
                <div className="ig-reply-row">
                  <input
                    className="ig-reply-input"
                    placeholder="Type a reply..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                  />
                  <button
                    className="ig-reply-send"
                    onClick={handleSendReply}
                    disabled={sending || !replyText.trim()}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default InstagramTab;