import React from "react";
import "./Style/Sales.css";
import "./Style/Expenses.css";
import "./Style/Product.css";
import "./Style/Pricing.css";
import "./Style/Users.css"
import "./Style/Admin.css"
import "./Style/Auth.css"
import "./Style/Profile.css"
import "./Style/Reports.css"
import "./Style/Dashboard.css"
import "./Style/System.css"
import "./Style/Home.css"
import "./Style/OurStory.css"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./Home";
import Products from "./Products";
import Dashboard from "./Dashboard";
import Sales from "./Sales";
import Expenses from "./Expenses";  
import Users from "./Users";
import Reports from "./Reports";
import Profile from "./Profile";
import PricingPage from "./pricing";
import Ourstory from "./Ourstory";
import PaymentSuccess from "./payment-success";
import Auth from "./Auth";
import { SubscriptionProvider } from "./context/SubscriptionContext";
import AdminDashboard from "./AdminDashboard";
import AdminLogin from "./AdminLogin";
import ProtectedRoute from "./ProtectedRoute";

function App() {
  return (
    <SubscriptionProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/Auth" element={<Auth />} />
          <Route path="/Pricing" element={<PricingPage />} />
          <Route path="/Ourstory" element={<Ourstory />} />
          <Route path="/admin-login" element={<AdminLogin />} />

          {/* Protected routes */}
          <Route path="/Dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
          <Route path="/Products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/Expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
          <Route path="/Users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
          <Route path="/Reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
          <Route path="/admin-dashboard" element={<AdminDashboard /> }/>
        </Routes>
      </Router>
    </SubscriptionProvider>
  );
}

export default App;