
import { useNavigate } from "react-router-dom";

const API = "http://localhost:3000";

export const Logout = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await fetch(`${API}/auth/logout`, {
            method: "POST",
            credentials: "include",
        });
        navigate("/");
    };

    return handleLogout;
};
