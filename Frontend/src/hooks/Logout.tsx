
import { useNavigate } from "react-router-dom";

const API = "${API}";

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
