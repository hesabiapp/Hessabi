// ── subscription-controller.ts ────────────────────────────
import { Request, Response } from "express";
import Subscription from "../collections/subscription-collection.js";
import User from "../collections/user-collection.js";

const MONTHLY_PRICE = 3;
const FULL_PRICE    = 50;

const INSTALLMENT_PRICES: Record<number, { total: number; monthly: number }> = {
  3:  { total: 50, monthly: 16.667 },
  6:  { total: 50, monthly: 8.333  },
  9:  { total: 50, monthly: 5.556  },
  12: { total: 50, monthly: 4.167  },
};

// ─────────────────────────────────────────────────────────
// Called when a new user registers → create trial subscription
// ─────────────────────────────────────────────────────────
export const createTrialSubscription = async (businessId: string) => {
  const start = new Date();
  const end   = new Date(start);
  end.setDate(end.getDate() + 14);

  await Subscription.create({
    businessId,
    planType:    "trial",
    planStatus:  "active",
    startDate:   start,
    endDate:     end,
    totalAmount: 0,
    paidAmount:  0,
  });
};

// ─────────────────────────────────────────────────────────
// GET /subscription/  — all subscriptions (super admin)
// ─────────────────────────────────────────────────────────
export const getAllSubscriptions = async (req: Request, res: Response) => {
  try {
    const subs = await Subscription.find({})
      .populate("businessId", "Fname Lname email username")
      .sort({ createdAt: -1 });

    const data = subs.map((s: any) => ({
      businessId:        s.businessId._id,
      ownerName:         `${s.businessId.Fname} ${s.businessId.Lname}`,
      email:             s.businessId.email,
      planType:          s.planType,
      planStatus:        s.planStatus,
      startDate:         s.startDate,
      endDate:           s.endDate,
      totalAmount:       s.totalAmount,
      paidAmount:        s.paidAmount,
      installmentMonths: s.installmentMonths,
      lastLogin:         s.lastLogin,
    }));

    return res.status(200).json({ subscriptions: data });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────
// POST /subscription/  — create or update a subscription
// ─────────────────────────────────────────────────────────
export const upsertSubscription = async (req: Request, res: Response) => {
  const sessionUser: any = req.user;
  const businessId = req.body.businessId ?? sessionUser?.businessId;
  const { planType, installmentMonths, paidAmount } = req.body;

  if (!businessId || !planType) {
    return res.status(400).json({ message: "businessId and planType are required." });
  }

  try {
    const start = new Date();
    let endDate: Date | null = null;
    let totalAmount = 0;

    if (planType === "trial") {
      endDate = new Date(start);
      endDate.setDate(endDate.getDate() + 14);
      totalAmount = 0;
    } else if (planType === "subscription") {
      endDate = new Date(start);
      endDate.setMonth(endDate.getMonth() + 1);
      totalAmount = MONTHLY_PRICE;
    } else if (planType === "full") {
      const months = Number(installmentMonths);
      if (!INSTALLMENT_PRICES[months]) {
        return res.status(400).json({ message: "Invalid installment months. Choose 3, 6, 9, or 12." });
      }
      endDate     = null;
      totalAmount = INSTALLMENT_PRICES[months].total;
    }

    const sub = await Subscription.findOneAndUpdate(
      { businessId },
      {
        planType,
        planStatus:        "active",
        startDate:         start,
        endDate,
        totalAmount,
        paidAmount:        paidAmount ?? 0,
        installmentMonths: planType === "full" ? installmentMonths : null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ message: "Subscription saved.", subscription: sub });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────
// PUT /subscription/extend  — extend end date
// ─────────────────────────────────────────────────────────
export const extendSubscription = async (req: Request, res: Response) => {
  const { businessId, months } = req.body;
  if (!businessId || !months) {
    return res.status(400).json({ message: "businessId and months are required." });
  }

  try {
    const sub = await Subscription.findOne({ businessId });
    if (!sub) return res.status(404).json({ message: "Subscription not found." });

    const base = sub.endDate ? new Date(sub.endDate) : new Date();
    base.setMonth(base.getMonth() + Number(months));
    sub.endDate    = base;
    sub.planStatus = "active";
    await sub.save();

    return res.status(200).json({ message: "Subscription extended.", endDate: sub.endDate });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

// 
// PUT /subscription/pay  — record an installment payment
// 
export const recordPayment = async (req: Request, res: Response) => {
  const { businessId, amount } = req.body;
  if (!businessId || !amount) {
    return res.status(400).json({ message: "businessId and amount are required." });
  }

  try {
    const sub = await Subscription.findOne({ businessId });
    if (!sub) return res.status(404).json({ message: "Subscription not found." });

    sub.paidAmount = Math.min(sub.totalAmount, sub.paidAmount + Number(amount));
    if (sub.paidAmount >= sub.totalAmount && sub.planType === "subscription") {
      const base = sub.endDate ? new Date(sub.endDate) : new Date();
      base.setMonth(base.getMonth() + 1);
      sub.endDate    = base;
      sub.planStatus = "active";
    }
    await sub.save();

    return res.status(200).json({ message: "Payment recorded.", paidAmount: sub.paidAmount });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────
// GET /subscription/me  — current user's subscription
// ─────────────────────────────────────────────────────────
export const getMySubscription = async (req: Request, res: Response) => {
  const user: any = req.user;
  try {
    const sub = await Subscription.findOne({ businessId: user.businessId });
    if (!sub) return res.status(404).json({ message: "No subscription found." });

    if (sub.endDate && new Date() > sub.endDate && sub.planStatus === "active") {
      sub.planStatus = sub.planType === "subscription" ? "overdue" : "expired";
      await sub.save();
    }

    return res.status(200).json({ subscription: sub });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

//
// Cron helper: expire overdue subscriptions
//
export const expireOverdueSubscriptions = async () => {
  const now = new Date();
  await Subscription.updateMany(
    { endDate: { $lt: now }, planStatus: "active", planType: "subscription" },
    { planStatus: "overdue" }
  );
  await Subscription.updateMany(
    { endDate: { $lt: now }, planStatus: "active", planType: "trial" },
    { planStatus: "expired" }
  );
  console.log(`[CRON] Subscription expiry check done at ${now.toISOString()}`);
};

// 
// POST /subscription/charge  — create Tap charge
//
export const createTapCharge = async (req: Request, res: Response) => {
  const { amount, planType, installmentMonths, isOnetime } = req.body;
  const sessionUser: any = req.user;

  if (!sessionUser) return res.status(401).json({ message: "Not authenticated." });

  try {
    const user = await User.findById(sessionUser.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const response = await fetch("https://api.tap.company/v2/charges", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.TAP_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "BHD",
        customer: {
          email:      user.email,
          first_name: user.Fname,
          last_name:  user.Lname,
        },
        source: { id: "src_all" },
        metadata: {
          planType,
          installmentMonths: installmentMonths ?? null,
          isOnetime:         isOnetime ?? false,
        },
        redirect: { url: "http://localhost:5173/payment-success" },
      }),
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ message: "Failed to create charge." });
  }
};

// 
// POST /subscription/verify  — verify Tap payment after redirect
// 
export const verifyTapPayment = async (req: Request, res: Response) => {
  const { tapId } = req.body;
  const sessionUser: any = req.user;

  if (!sessionUser) return res.status(401).json({ message: "Not authenticated." });

  try {
    const response = await fetch(`https://api.tap.company/v2/charges/${tapId}`, {
      headers: { "Authorization": `Bearer ${process.env.TAP_SECRET_KEY}` },
    });

    const charge = await response.json();

    if (charge.status === "CAPTURED") {
      const planType          = charge.metadata?.planType || "subscription";
      const installmentMonths = charge.metadata?.installmentMonths ?? null;
      const isOnetime         = charge.metadata?.isOnetime === true || charge.metadata?.isOnetime === "true";

      const start = new Date();
      let endDate: Date | null = null;
      let totalAmount = charge.amount;
      let paidAmount  = charge.amount;

      if (planType === "subscription") {
        endDate = new Date(start);
        endDate.setMonth(endDate.getMonth() + 1);
        totalAmount = MONTHLY_PRICE;
        paidAmount  = charge.amount;
      } else if (planType === "full") {
        totalAmount = FULL_PRICE;
        paidAmount  = isOnetime ? FULL_PRICE : charge.amount;
        endDate     = null;
      }

      await Subscription.findOneAndUpdate(
        { businessId: sessionUser.businessId },
        {
          planType,
          planStatus:        "active",
          startDate:         start,
          endDate,
          totalAmount,
          paidAmount,
          installmentMonths: isOnetime ? null : installmentMonths,
        },
        { new: true }
      );

      return res.status(200).json({ success: true });
    }

    return res.status(200).json({ success: false, status: charge.status });
  } catch (err) {
    return res.status(500).json({ message: "Verification failed." });
  }
};

//
// POST /subscription/demo-activate  — demo only, bypasses Tap
//
export const demoActivate = async (req: Request, res: Response) => {
  const { planType, installmentMonths } = req.body;
  const user: any = req.user;

  if (!user) return res.status(401).json({ message: "Not authenticated." });

  try {
    const start = new Date();
    let endDate: Date | null = null;
    let totalAmount = 0;
    let paidAmount  = 0;

    if (planType === "subscription") {
      endDate     = new Date(start);
      endDate.setMonth(endDate.getMonth() + 1);
      totalAmount = MONTHLY_PRICE;
      paidAmount  = MONTHLY_PRICE;
    } else if (planType === "full") {
      endDate     = null;
      totalAmount = FULL_PRICE;
      paidAmount  = FULL_PRICE;
    }

    await Subscription.findOneAndUpdate(
      { businessId: user.businessId },
      {
        planType,
        planStatus:        "active",
        startDate:         start,
        endDate,
        totalAmount,
        paidAmount,
        installmentMonths: planType === "full" ? (installmentMonths ?? null) : null,
      },
      { new: true }
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: "Demo activation failed." });
  }
};