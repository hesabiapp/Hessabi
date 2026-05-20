import { useState } from "react";

const API = import.meta.env.VITE_API_URL;

type Profile = {
    username: string;
    Fname: string;
    Lname: string;
    email: string;
    role: string;
    mobile: string | null;
    photo: string | null;
};

type FormState = {
    username: string;
    Fname: string;
    Lname: string;
    email: string;
    password: string;
    mobile: string;
    errors: Record<string, string>;
};

const emptyForm = (): FormState => ({
    username: "",
    Fname: "",
    Lname: "",
    email: "",
    password: "",
    mobile: "",
    errors: {},
});

export const userProfile = () => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/auth/viewUser`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            const data = await res.json();
            if (res.ok) {
                setProfile(data);
                setForm({
                    username: data.username,
                    Fname: data.Fname,
                    Lname: data.Lname,
                    email: data.email,
                    mobile: data.mobile ?? "",
                    password: "",
                    errors: {},
                });
            }
        } catch (err) {
            setError("Failed to load profile.");
        } finally {
            setLoading(false);
        }
    };

    const setField = (key: keyof FormState, value: any) =>
        setForm((f) => ({ ...f, [key]: value, errors: { ...f.errors, [key]: "" } }));

    const updateProfile = async (userId: string) => {
        setError("");
        setSuccess("");
        try {
            const res = await fetch(`${API}/auth/editUsers`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify({
                    userId,
                    username: form.username,
                    Fname: form.Fname,
                    Lname: form.Lname,
                    email: form.email,
                    mobile: form.mobile,
                    ...(form.password ? { password: form.password } : {}),
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess("Profile updated successfully.");
                await fetchProfile();
            } else {
                setError(data.message ?? "Update failed.");
            }
        } catch (err) {
            setError("Something went wrong.");
        }
    };

    return {
        profile,
        form,
        loading,
        error,
        success,
        fetchProfile,
        setField,
        updateProfile,
    };
};
