
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;


export const Logout = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await fetch(`${API}/auth/logout`, {
            method: "POST",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },

        });
        localStorage.removeItem("token");
        navigate("/");
    };

    return handleLogout;
};
