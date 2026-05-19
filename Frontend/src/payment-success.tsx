import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSubscription } from "./context/SubscriptionContext";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tapId = searchParams.get("tap_id");
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const { refetch } = useSubscription();

  useEffect(() => {
    const verify = async () => {
      if (!tapId) {
        setStatus("failed");
        return;
      }

      try {
        const res = await fetch("${API}/subscription/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tapId }),
        });

        const data = await res.json();

        if (data.success) {
          await refetch(); 
          setStatus("success");
          setTimeout(() => navigate("/Dashboard"), 2000);
        } else {
          setStatus("failed");
          setTimeout(() => navigate("/Pricing"), 2000);
        }
      } catch (err) {
        setStatus("failed");
        setTimeout(() => navigate("/Pricing"), 2000);
      }
    };

    verify();
  }, [tapId]);

  return (
    <div style={{
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "center",
      height:         "100vh",
      fontFamily:     "Sora, sans-serif",
      background:     "#eef0f5",
      gap:            "16px",
    }}>
      {status === "loading" && (
        <>
          <div style={{
            width:        "48px",
            height:       "48px",
            border:       "4px solid #e2e8f0",
            borderTop:    "4px solid #1e3a5f",
            borderRadius: "50%",
            animation:    "spin 0.8s linear infinite",
          }} />
          <h2 style={{ color: "#1e2d3d", margin: 0 }}>Processing your payment...</h2>
          <p style={{ color: "#64748b", margin: 0 }}>Please wait while we confirm your subscription.</p>
        </>
      )}

      {status === "success" && (
        <>
          <div style={{ fontSize: "3rem" }}>✅</div>
          <h2 style={{ color: "#2e7d32", margin: 0 }}>Payment Successful!</h2>
          <p style={{ color: "#64748b", margin: 0 }}>Redirecting you to the dashboard...</p>
        </>
      )}

      {status === "failed" && (
        <>
          <div style={{ fontSize: "3rem" }}>❌</div>
          <h2 style={{ color: "#c0392b", margin: 0 }}>Payment Failed</h2>
          <p style={{ color: "#64748b", margin: 0 }}>Redirecting you back to pricing...</p>
        </>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PaymentSuccess;