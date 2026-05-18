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
import Reports from "./Reports" ;
import Profile from "./Profile";
import PricingPage from "./pricing";
import Ourstory from "./Ourstory"
import PaymentSuccess from "./payment-success";
import Auth from "./Auth";
import { SubscriptionProvider } from "./context/SubscriptionContext";
import AdminDashboard from "./AdminDashboard";
import AdminLogin from "./AdminLogin";



function App() {
  return (
    <SubscriptionProvider>
    <Router>
      <Routes>
         <Route path="/" element={<HomePage />} />
         <Route path="/Auth" element={<Auth/>}/>
        <Route path="/Dashboard" element={< Dashboard/>} />
        <Route path="/sales" element={<Sales/>} />
        <Route path="/Products" element={<Products />} />
        <Route path="/Expenses" element={< Expenses/>} /> 
        <Route path="/Users" element={<Users />} />
         <Route path="/Reports" element={<Reports/>} />  
        <Route path="/profile" element={<Profile />} />
       <Route path="/admin-login" element={<AdminLogin />} />
       <Route path="/admin-dashboard" element={<AdminDashboard />} /> 
        <Route path="/Pricing" element={<PricingPage />} />
        <Route path="/Ourstory" element={<Ourstory/>} /> 
        <Route path="/payment-success" element={<PaymentSuccess/>} />



      </Routes>
    </Router>
    </SubscriptionProvider>
  );
}

export default App;

