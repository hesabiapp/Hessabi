import React, { useState, useEffect } from "react";
import "./Style/Auth.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSubscription } from "./context/SubscriptionContext";

const API = import.meta.env.VITE_API_URL;

const Auth = () => {
  const [isActive, setIsActive] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refetch } = useSubscription();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (searchParams.get("signup") === "true") {
      setIsActive(true);
    }
    setTimeout(() => setLoaded(true), 50);
  }, []);

  // Sign up
  const [username, setUsername]               = useState("");
  const [firstName, setFirstName]             = useState("");
  const [lastName, setLastName]               = useState("");
  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupError, setSignupError]         = useState("");

  // Login
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError]       = useState("");

  const handleSignUp = async () => {
    setSignupError("");
    if (password !== confirmPassword) {
      setSignupError("Password do not match.");
      return;
    }
    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, Fname: firstName, Lname: lastName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setSignupError(data.message); return; }

      const loginRes = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!loginRes.ok) { setSignupError("Signup succeeded but login failed."); return; }

      const loginData = await loginRes.json();
      localStorage.setItem("token", loginData.token);

      const userRes = await fetch(`${API}/auth/viewUser`, {
        headers: { Authorization: `Bearer ${loginData.token}` },
      });
      const userData = await userRes.json();
      sessionStorage.setItem("user", JSON.stringify({
        firstName: userData.Fname,
        lastName:  userData.Lname,
        role:      userData.role,
      }));

      await refetch();
      const redirect = searchParams.get("redirect");  
      navigate(redirect ?? "/Dashboard"); 
    } catch (err) {
      setSignupError("Something went wrong. Try again.");
    }
  };

  const handleLogin = async () => {
    setLoginError("");
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) { setLoginError(data.message); return; }

      localStorage.setItem("token", data.token);

      const userRes = await fetch(`${API}/auth/viewUser`, {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      const userData = await userRes.json();
      sessionStorage.setItem("user", JSON.stringify({
        firstName: userData.Fname,
        lastName:  userData.Lname,
        role:      userData.role,
      }));

      await refetch();

      const redirect = searchParams.get("redirect");
      navigate(redirect ?? "/Dashboard");

    } catch (err) {
      setLoginError("Something went wrong. Try again.");
    }
  };

  return (
    <div className="auth-page">
    <div className={`auth-container${isActive ? " active" : ""}${loaded ? " loaded" : ""}`}>

        {/* Sign Up Panel */}
        <div className="auth-formContainer signUp">
          <div className="auth-login-logo">
            <img src="images/Logo2.png" alt="Hessabi Logo" className="login-logo" />
          </div>
          <form>
            <h1>Create Account</h1>
            <input type="text" placeholder="UserName" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <input type="email" placeholder="example@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            {signupError && <p className="error-msg">{signupError}</p>}
            <button type="button" onClick={handleSignUp}>Sign Up</button>
          </form>
        </div>

        {/* Login Panel */}
        <div className="auth-formContainer login">
          <div className="login-logo">
            <img src="images/Logo2.png" alt="Hessabi Logo" className="login-logo" />
          </div>
          <form>
            <h1>Login</h1>
            <span>Login With Username &amp; Password</span>
            <input type="text" placeholder="Enter Username" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} />
            <input type="password" placeholder="Enter Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
            <a href="#" onClick={(e) => { e.preventDefault(); setIsActive(true); }}>You don't have an Account?</a>
            {loginError && <p className="error-msg">{loginError}</p>}
            <button type="button" onClick={handleLogin}>Login</button>
          </form>
        </div>

        {/* Toggle Panel */}
        <div className="auth-toggleContainer">
          <div className="auth-toggle">
            <div className="auth-togglePanel auth-toggleLeft">
              <div className="auth-logo-section">
                <img src="images/2HLogo.png" alt="Hessabi Logo" className="auth-logo" />
              </div>
              <h1>Welcome To <br /> Hessabi</h1>
              <p>Sign in With Email &amp; Password</p>
              <button type="button" className="hidden" onClick={() => setIsActive(false)}>Login</button>
            </div>
            <div className="auth-togglePanel auth-toggleRight">
              <div className="auth-logo-section">
                <img src="images/2HLogo.png" alt="Hessabi Logo" className="auth-logo" />
              </div>
              <h1>Join Us!</h1>
              <p>Sign up now and enjoy our Financial System</p>
              <button type="button" className="hidden" onClick={() => setIsActive(true)}>Sign Up</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Auth;
