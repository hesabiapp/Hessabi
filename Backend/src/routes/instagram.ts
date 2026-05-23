import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { auth } from "../middleware/auth.js";
import User from "../collections/user-collection.js";

const router = express.Router();

const ZERNIO_API_KEY = process.env.ZERNIO_API_KEY!;
const FRONTEND_URL   = process.env.FRONTEND_URL ?? "http://localhost:5173";
const BACKEND_URL    = process.env.BACKEND_URL  ?? "https://hessabi.onrender.com";

const zernio = axios.create({
  baseURL: "https://zernio.com/api/v1",
  headers: { Authorization: `Bearer ${ZERNIO_API_KEY}` },
});

// ─────────────────────────────────────────────
// STEP 1 — Create Zernio profile + get auth URL
// GET /instagram/auth?token=<jwt>
// ─────────────────────────────────────────────
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
    // Profile already exists on Zernio — fetch it instead
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
    res.redirect(`${FRONTEND_URL}/dashboard?ig=error`);
  }
});

// ─────────────────────────────────────────────
// STEP 2 — Zernio redirects back after OAuth
// GET /instagram/callback/:userId
// ─────────────────────────────────────────────
router.get("/callback/:userId", async (req, res) => {
  const { userId } = req.params;
  const error = req.query.error;

  if (error || !userId) {
    return res.redirect(`${FRONTEND_URL}/dashboard?ig=denied`);
  }

  try {
    const user = await User.findById(userId);
    if (!user?.zernioProfileId) {
      return res.redirect(`${FRONTEND_URL}/dashboard?ig=error`);
    }

    const accountsRes = await zernio.get("/accounts", {
      params: { profileId: user.zernioProfileId, platform: "instagram" },
    });

    const accounts = accountsRes.data.accounts ?? [];
    if (accounts.length === 0) {
      return res.redirect(`${FRONTEND_URL}/dashboard?ig=error`);
    }

    const igAccount = accounts[0];

    await User.findByIdAndUpdate(userId, {
      zernioAccountId: igAccount._id,
      igConnectedAt:   new Date(),
      igTokenExpires:  new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    res.redirect(`${FRONTEND_URL}/dashboard?ig=connected`);

  } catch (err: any) {
    console.error("Zernio callback error:", err.response?.data ?? err.message);
    res.redirect(`${FRONTEND_URL}/dashboard?ig=error`);
  }
});

// ─────────────────────────────────────────────
// STEP 3 — Frontend fetches all IG data
// GET /instagram/data
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// STEP 4 — Disconnect
// POST /instagram/disconnect
// ─────────────────────────────────────────────
router.post("/disconnect", auth, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user?.zernioAccountId) {
      await zernio.delete(`/accounts/${user.zernioAccountId}`).catch(() => {});
    }

    await User.findByIdAndUpdate(req.user.id, {
      $unset: {
        zernioAccountId: "",
        zernioProfileId: "",
        igConnectedAt:   "",
        igTokenExpires:  "",
      },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error("Instagram disconnect error:", err.message);
    res.status(500).json({ error: "Failed to disconnect" });
  }
});

export default router;
