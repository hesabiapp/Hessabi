import { Link } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { Logout } from "../hooks/Logout";
import { useState } from "react";


const UserDropdown = () => {
    const handleLogout = Logout();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const stored = sessionStorage.getItem("user");
    const user = stored ? JSON.parse(stored) : null;
    const fullName = user ? `${user.firstName} ${user.lastName}` : "";

    

    return (


        
        <>
            <div className="Header-user-trigger" onClick={() => setDropdownOpen(!dropdownOpen)}>
             <FaUserCircle size={28} className="System-login-icon" />
              {fullName && <span className="Header-fullname">{fullName}</span>}
              </div>
            {dropdownOpen && (
                <div className="dropdown">
                    <Link to="/profile" onClick={() => setDropdownOpen(false)}>Profile</Link>
                    <span onClick={() => { handleLogout(); setDropdownOpen(false); }}>Logout</span>
                </div>
            )}
        </>

        
    );
};

export default UserDropdown;
