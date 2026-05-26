import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { auth } from "../middleware/auth.js";
import User from "../collections/user-collection.js";
import IgMessage from "../collections/igMessage-collection.js";

const router = express.Router();

const ZERNIO_API_KEY = process.env.ZERNIO_API_KEY!;
const FRONTEND_URL   = process.env.FRONTEND_URL ?? "http://localhost:5173";
const BACKEND_URL    = process.env.BACKEND_URL  ?? "https://hessabi.onrender.com";



const zernio = axios.create({
  baseURL: "https://zernio.com/api/v1",
  headers: { Authorization: `Bearer ${ZERNIO_API_KEY}` },
});

/* ── STEP 1 — Create Zernio profile + get auth URL ── */
router.get("/auth", async (req: any, res) => {
  const token = req.query.token as string;
  if (!token) return res.status(401).json({ message: "You need to login." });

  let userId: string;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    userId = decoded.id;
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  try {
    const user = await User.findById(userId);
    let profileId = user?.zernioProfileId;

    if (!profileId) {
      try {
        const profileRes = await zernio.post("/profiles", {
          name: `Hessabi User ${userId}`,
        });
        profileId = profileRes.data.profile._id;
      } catch (err: any) {
        if (err.response?.data?.error === "A profile with this name already exists") {
          const listRes = await zernio.get("/profiles");
          const profiles = listRes.data.profiles ?? listRes.data ?? [];
          const existing = profiles.find((p: any) => p.name === `Hessabi User ${userId}`);
          if (!existing) throw err;
          profileId = existing._id;
        } else {
          throw err;
        }
      }
      await User.findByIdAndUpdate(userId, { zernioProfileId: profileId });
    }

    const connectRes = await zernio.get(`/connect/instagram`, {
      params: {
        profileId,
        redirect_url: `${BACKEND_URL}/instagram/callback/${userId}`,
      },
    });

    const authUrl = connectRes.data.authUrl ?? connectRes.data.url ?? connectRes.data.connectUrl;
    res.redirect(authUrl);

  } catch (err: any) {
    console.error("Zernio auth error:", err.response?.data ?? err.message);
    res.redirect(`${FRONTEND_URL}/Dashboard?ig=error`);
  }
});

/* ── STEP 2 — Zernio redirects back after OAuth ── */
router.get("/callback/:userId", async (req, res) => {
  const { userId } = req.params;
  const error = req.query.error;

  if (error || !userId) {
    return res.redirect(`${FRONTEND_URL}/Dashboard?ig=denied`);
  }

  try {
    const user = await User.findById(userId);
    if (!user?.zernioProfileId) {
      return res.redirect(`${FRONTEND_URL}/Dashboard?ig=error`);
    }

    const accountsRes = await zernio.get("/accounts", {
      params: { profileId: user.zernioProfileId, platform: "instagram" },
    });

    const accounts = accountsRes.data.accounts ?? [];
    if (accounts.length === 0) {
      return res.redirect(`${FRONTEND_URL}/Dashboard?ig=error`);
    }

    const igAccount = accounts[0];

    await User.findByIdAndUpdate(userId, {
      zernioAccountId:       igAccount._id,
      zernioAccountUsername: igAccount.username ?? igAccount.accountUsername,
      igConnectedAt:         new Date(),
      igTokenExpires:        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    res.redirect(`${FRONTEND_URL}/Dashboard?ig=connected`);

  } catch (err: any) {
    console.error("Zernio callback error:", err.response?.data ?? err.message);
    res.redirect(`${FRONTEND_URL}/Dashboard?ig=error`);
  }
});

/* ── STEP 3 — Frontend fetches all IG data ── */
router.get("/data", auth, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user?.zernioAccountId) {
      return res.json({ connected: false });
    }

    const accountId = user.zernioAccountId;

    const [accountsRes, insightsRes, analyticsRes, storiesRes] = await Promise.all([
      zernio.get("/accounts").catch(() => ({ data: { accounts: [] } })),
      zernio.get("/analytics/instagram/account-insights", {
        params: { accountId },
      }).catch(() => ({ data: {} })),
      zernio.get("/analytics", {
        params: { platform: "instagram", accountId, sortBy: "engagement", limit: 12 },
      }).catch(() => ({ data: { posts: [] } })),
      zernio.get(`/accounts/${accountId}/instagram/stories`)
        .catch(() => ({ data: { stories: [] } })),
    ]);

    const accounts  = accountsRes.data.accounts ?? [];
    const igAccount = accounts.find((a: any) => a._id === accountId) ?? accounts[0] ?? {};
    const insights  = insightsRes.data ?? {};
    const posts     = analyticsRes.data.posts ?? analyticsRes.data ?? [];
    const stories   = storiesRes.data.stories ?? [];

    const topPosts = (Array.isArray(posts) ? posts : []).map((p: any) => ({
      id:             p.postId ?? p._id,
      caption:        p.content ?? "",
      media_type:     p.mediaType ?? "IMAGE",
      media_url:      p.thumbnailUrl ?? p.mediaItems?.[0]?.url,
      thumbnail_url:  p.thumbnailUrl,
      timestamp:      p.publishedAt ?? p.scheduledFor,
      like_count:     p.analytics?.likes    ?? 0,
      comments_count: p.analytics?.comments ?? 0,
    }));

    res.json({
      connected: true,
      profile: {
        username:          igAccount.username ?? igAccount.accountUsername ?? "",
        followersCount:    igAccount.followerCount ?? igAccount.followersCount ?? 0,
        mediaCount:        igAccount.mediaCount ?? 0,
        profilePictureUrl: igAccount.profilePictureUrl ?? igAccount.avatar,
      },
      insights: {
        reach:        insights.reach        ?? insights.data?.reach        ?? 0,
        impressions:  insights.impressions  ?? insights.data?.impressions  ?? 0,
        profileViews: insights.profileViews ?? insights.data?.profileViews ?? 0,
      },
      topPosts,
      stories: stories.map((s: any) => ({
        id:        s._id ?? s.storyId,
        media_url: s.mediaUrl,
        timestamp: s.timestamp,
      })),
    });

  } catch (err: any) {
    console.error("Instagram data error:", err.response?.data ?? err.message);
    res.status(500).json({ error: "Failed to fetch Instagram data" });
  }
});

/* ── STEP 4 — Disconnect ── */
router.post("/disconnect", auth, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user?.zernioAccountId) {
      await zernio.delete(`/accounts/${user.zernioAccountId}`).catch(() => {});
    }

    await User.findByIdAndUpdate(req.user.id, {
      $unset: {
        zernioAccountId:       "",
        zernioProfileId:       "",
        zernioAccountUsername: "",
        igConnectedAt:         "",
        igTokenExpires:        "",
      },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("Instagram disconnect error:", err.message);
    res.status(500).json({ error: "Failed to disconnect" });
  }
});

/* ── INBOX — List conversations from MongoDB ── */
router.get("/inbox", auth, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.zernioAccountId) return res.json({ conversations: [] });

    /* Get the latest message per conversation for this account */
    const latest = await IgMessage.aggregate([
      { $match: { accountId: user.zernioAccountId } },
      { $sort: { sentAt: -1 } },
      {
        $group: {
          _id:                 "$conversationId",
          lastMessage:         { $first: "$message" },
          lastMessageAt:       { $first: "$sentAt" },
          participantName:     { $first: "$participantName" },
          participantUsername: { $first: "$participantUsername" },
          participantPicture:  { $first: "$participantPicture" },
          unreadCount: {
            $sum: {
              $cond: [{ $and: [{ $eq: ["$direction", "incoming"] }, { $eq: ["$isRead", false] }] }, 1, 0],
            },
          },
        },
      },
      { $sort: { lastMessageAt: -1 } },
    ]);

    const conversations = latest.map((c: any) => ({
      id:            c._id,
      participant: {
        username:          c.participantUsername ?? c.participantName ?? "Unknown",
        profilePictureUrl: c.participantPicture ?? null,
        isFollower:        false,
      },
      lastMessage:   c.lastMessage ?? "",
      lastMessageAt: c.lastMessageAt ?? null,
      unreadCount:   c.unreadCount ?? 0,
    }));

    res.json({ conversations });
  } catch (err: any) {
    console.error("Inbox list error:", err.message);
    res.status(500).json({ error: "Failed to fetch inbox" });
  }
});

/* ── INBOX — Get messages in a conversation from MongoDB ── */
router.get("/inbox/:conversationId/messages", auth, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.zernioAccountId) return res.json({ messages: [] });

    const { conversationId } = req.params;

    /* Mark messages as read */
    await IgMessage.updateMany(
      { accountId: user.zernioAccountId, conversationId, direction: "incoming", isRead: false },
      { $set: { isRead: true } }
    );

    const raw = await IgMessage.find({
      accountId:      user.zernioAccountId,
      conversationId,
    }).sort({ sentAt: 1 });

    const messages = raw.map((m: any) => ({
      id:          m._id.toString(),
      text:        m.message ?? "",
      fromMe:      m.direction === "outgoing",
      createdAt:   m.sentAt,
      attachments: m.attachments ?? [],
    }));

    res.json({ messages });
  } catch (err: any) {
    console.error("Messages fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/* ── INBOX — Send a reply ── */
router.post("/inbox/:conversationId/reply", auth, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.zernioAccountId) return res.status(400).json({ error: "Not connected" });

    const { conversationId } = req.params;
    const { text } = req.body;

    if (!text?.trim()) return res.status(400).json({ error: "Message cannot be empty" });

    /* Send via Zernio */
    await zernio.post(`/inbox/conversations/${conversationId}/messages`, {
      accountId: user.zernioAccountId,
      message:   text.trim(),
    });

    /* Save outgoing message to MongoDB */
    const conv = await IgMessage.findOne({ accountId: user.zernioAccountId, conversationId }).sort({ sentAt: -1 });

    await IgMessage.create({
      accountId:           user.zernioAccountId,
      conversationId,
      participantName:     conv?.participantName ?? "",
      participantUsername: conv?.participantUsername ?? "",
      participantPicture:  conv?.participantPicture ?? null,
      message:             text.trim(),
      direction:           "outgoing",
      sentAt:              new Date(),
      isRead:              true,
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("Reply error:", err.response?.data ?? err.message);
    res.status(500).json({ error: "Failed to send reply" });
  }
});

/* ── Webhook receiver — saves messages to MongoDB ── */
router.post("/webhook", express.json(), async (req, res) => {
  try {
    const event = req.body;

    if (event.message && event.account && 
       (event.event === "message.received" || event.event === "message.sent" || event.event === "message.delivered")) {
      
      const { message, conversation, account } = event;

      const exists = await IgMessage.findOne({ platformMessageId: message.platformMessageId });
      if (!exists) {
        await IgMessage.create({
          accountId:           account.id,
          accountUsername:     account.username,
          conversationId:      conversation.id,
          participantId:       conversation.participantId,
          participantName:     conversation.participantName,
          participantUsername: conversation.participantUsername ?? conversation.participantName,
          message:             message.text ?? "",
          direction:           message.direction === "outgoing" ? "outgoing" : "incoming",
          sentAt:              new Date(message.sentAt),
          isRead:              message.direction === "outgoing" ? true : false,
          platformMessageId:   message.platformMessageId,
          attachments:         message.attachments ?? [],
        });
      }
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("Webhook error:", err.message);
    res.status(500).json({ error: "Webhook failed" });
  }
});
