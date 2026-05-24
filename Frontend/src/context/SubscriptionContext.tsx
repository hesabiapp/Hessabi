import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const API = import.meta.env.VITE_API_URL;

export type SubscriptionInfo = {
  planType:   "trial" | "subscription" | "full";
  planStatus: "active" | "overdue" | "expired" | "cancelled";
  daysLeft:   number | null;
  endDate:    string | null;
};

type SubscriptionContextType = {
  subscription: SubscriptionInfo | null;
  loading:      boolean;
  refetch:      () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  loading:      true,
  refetch:      async () => {},
});

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading]           = useState(true);

  const fetchSubscription = useCallback(async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem("token");
    if (!token) { setSubscription(null); setLoading(false); return; }

    const res  = await fetch(`${API}/subscriptions/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (res.ok && data.subscription) {
      const sub = data.subscription;

      let daysLeft: number | null = null;
      if (sub.endDate) {
        const diff = new Date(sub.endDate).getTime() - new Date().getTime();
        daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      }

      setSubscription({
        planType:   sub.planType,
        planStatus: sub.planStatus,
        daysLeft,
        endDate:    sub.endDate,
      });
    } else {
      setSubscription(null);
    }
  } catch (err) {
    console.error("Failed to fetch subscription:", err);
    setSubscription(null);
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return (
    <SubscriptionContext.Provider value={{ subscription, loading, refetch: fetchSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};


export const useSubscription = () => useContext(SubscriptionContext);