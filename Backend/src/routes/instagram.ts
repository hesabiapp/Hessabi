import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { auth } from "../middleware/auth.js";
import User from "../collections/user-collection.js";

const router = express.Router();

const CLIENT_ID     = process.env.META_APP_ID!;
const CLIENT_SECRET = process.env.META_APP_SECRET!;
const REDIRECT_URI  = process.env.META_REDIRECT_URI!;
const FRONTEND_URL  = process.env.FRONTEND_URL ?? "http://localhost:5173";

// ─────────────────────────────────────────────
// STEP 1 — Redirect user to Meta OAuth screen
// GET /instagram/auth?token=<jwt>
// ─────────────────────────────────────────────
router.get("/auth", (req: any, res) => {
  const token = req.query.token as string;

  if (!token) {
    return res.status(401).json({ message: "You need to login." });
  }

  let userId: string;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    userId = decoded.id;
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  const state = Buffer.from(userId).toString("base64");
  const scope = [
    "instagram_basic",
    "instagram_manage_insights",
    "pages_show_list",
    "pages_read_engagement",
  ].join(",");

  const url =
    `https://www.facebook.com/v19.0/dialog/oauth` +
    `?client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${scope}` +
    `&response_type=code` +
    `&state=${state}`;

  res.redirect(url);
});

// ─────────────────────────────────────────────
// STEP 2 — Meta redirects back here with code
// GET /instagram/callback
// ─────────────────────────────────────────────
router.get("/callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}/dashboard?ig=denied`);
  }

  if (!code || !state) {
    return res.redirect(`${FRONTEND_URL}/dashboard?ig=error`);
  }

  const userId = Buffer.from(state as string, "base64").toString("utf8");

  try {
    // Exchange code → short-lived token
    const shortRes = await axios.get(
      `https://graph.facebook.com/v19.0/oauth/access_token`,
      {
        params: {
          client_id:     CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri:  REDIRECT_URI,
          code,
        },
      }
    );

    // Exchange short-lived → long-lived token (60 days)
    const longRes = await axios.get(
      `https://graph.facebook.com/v19.0/oauth/access_token`,
      {
        params: {
          grant_type:        "fb_exchange_token",
          client_id:         CLIENT_ID,
          client_secret:     CLIENT_SECRET,
          fb_exchange_token: shortRes.data.access_token,
        },
      }
    );

    const longToken = longRes.data.access_token as string;
    const expiresIn = longRes.data.expires_in   as number;

    await User.findByIdAndUpdate(userId, {
      igAccessToken:  longToken,
      igConnectedAt:  new Date(),
      igTokenExpires: new Date(Date.now() + expiresIn * 1000),
    });

    res.redirect(`${FRONTEND_URL}/dashboard?ig=connected`);

  } catch (err: any) {
    console.error("Instagram callback error:", err.response?.data ?? err.message);
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

    if (!user?.igAccessToken) {
      return res.json({ connected: false });
    }

    if (user.igTokenExpires && new Date() > user.igTokenExpires) {
      return res.json({ connected: false, reason: "token_expired" });
    }

    const token = user.igAccessToken;

    // 1. Get Facebook Pages
    const pagesRes = await axios.get(
      `https://graph.facebook.com/v19.0/me/accounts`,
      { params: { access_token: token } }
    );

    const pages = pagesRes.data.data ?? [];
    if (pages.length === 0) {
      return res.json({ connected: false, reason: "no_page" });
    }

    const page      = pages[0];
    const pageToken = page.access_token as string;
    const pageId    = page.id           as string;

    // 2. Get Instagram Business Account
    const igAccRes = await axios.get(
      `https://graph.facebook.com/v19.0/${pageId}`,
      {
        params: {
          fields:       "instagram_business_account",
          access_token: pageToken,
        },
      }
    );

    const igId = igAccRes.data.instagram_business_account?.id as string;
    if (!igId) {
      return res.json({ connected: false, reason: "no_ig_business_account" });
    }

    // 3. Fetch all data in parallel
    const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const until = Math.floor(Date.now() / 1000);

    const [profileRes, insightsRes, mediaRes, storiesRes] = await Promise.all([
      axios.get(`https://graph.facebook.com/v19.0/${igId}`, {
        params: {
          fields:       "username,followers_count,media_count,profile_picture_url",
          access_token: pageToken,
        },
      }),
      axios.get(`https://graph.facebook.com/v19.0/${igId}/insights`, {
        params: {
          metric:       "reach,impressions,profile_views",
          period:       "day",
          since,
          until,
          access_token: pageToken,
        },
      }),
      axios.get(`https://graph.facebook.com/v19.0/${igId}/media`, {
        params: {
          fields:       "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count",
          limit:        12,
          access_token: pageToken,
        },
      }),
      axios.get(`https://graph.facebook.com/v19.0/${igId}/stories`, {
        params: {
          fields:       "id,media_url,timestamp",
          access_token: pageToken,
        },
      }).catch(() => ({ data: { data: [] } })),
    ]);

    const profile  = profileRes.data;
    const insights = insightsRes.data.data ?? [];
    const media    = mediaRes.data.data    ?? [];
    const stories  = storiesRes.data.data  ?? [];

    const insightMap: Record<string, number> = {};
    insights.forEach((metric: any) => {
      insightMap[metric.name] = (metric.values ?? []).reduce(
        (sum: number, v: any) => sum + (v.value ?? 0), 0
      );
    });

    const topPosts = [...media].sort(
      (a: any, b: any) =>
        (b.like_count + b.comments_count) - (a.like_count + a.comments_count)
    );

    res.json({
      connected: true,
      profile: {
        username:          profile.username,
        followersCount:    profile.followers_count,
        mediaCount:        profile.media_count,
        profilePictureUrl: profile.profile_picture_url,
      },
      insights: {
        reach:        insightMap["reach"]         ?? 0,
        impressions:  insightMap["impressions"]   ?? 0,
        profileViews: insightMap["profile_views"] ?? 0,
      },
      topPosts,
      stories,
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
    await User.findByIdAndUpdate(req.user.id, {
      $unset: {
        igAccessToken:  "",
        igConnectedAt:  "",
        igTokenExpires: "",
      },
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error("Instagram disconnect error:", err.message);
    res.status(500).json({ error: "Failed to disconnect" });
  }
});

export default router;
