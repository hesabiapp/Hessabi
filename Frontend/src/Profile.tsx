import React, { useState, useEffect, useRef } from "react";
import "./Style/Profile.css";
import "./Style/System.css";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";

const API = import.meta.env.VITE_API_URL;

type Profile = {
    userId: string;
    username: string;
    Fname: string;
    Lname: string;
    email: string;
    role: string;
    mobile: string | null;
    photo: string | null;
};

const Profile = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState("");
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        username: "",
        Fname: "",
        Lname: "",
        email: "",
        mobile: "",
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
        errors: {} as Record<string, string>,
    });

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async () => {
        setLoading(true);
    try {
        const res = await fetch(`${API}/auth/viewUser`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });

        // If token is invalid/expired, clear it and redirect
        if (res.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "/Auth"; // or use your router's navigate()
            return;
        }

        if (!res.ok) throw new Error("Failed to fetch profile");
            const data = await res.json();
            if (res.ok) {
                setProfile(data);
                setForm(f => ({
                    ...f,
                    username: data.username ?? "",
                    Fname: data.Fname ?? "",
                    Lname: data.Lname ?? "",
                    email: data.email ?? "",
                    mobile: data.mobile ?? "",
                    currentPassword: "",
                    newPassword: "",
                    confirmNewPassword: "",
                    errors: {},
                }));
                setPhotoPreview(data.photo ?? null);
            }
        } catch (err) {
            console.error("Failed to fetch profile:", err);
        } finally {
            setLoading(false);
        }
    };

    const setField = (key: string, value: string) =>
        setForm(f => ({ ...f, [key]: value, errors: { ...f.errors, [key]: "" } }));

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        setSubmitError("");
        setSubmitSuccess("");

        
        if (form.newPassword || form.currentPassword || form.confirmNewPassword) {
            if (!form.currentPassword) {
                setSubmitError("Please enter your current password.");
                return;
            }
            if (form.newPassword !== form.confirmNewPassword) {
                setSubmitError("New passwords do not match.");
                return;
            }
            if (form.newPassword.length < 6) {
                setSubmitError("New password must be at least 6 characters.");
                return;
            }
        }

        
        let photoUrl = profile?.photo ?? null;
        if (photoFile) {
            const formData = new FormData();
            formData.append("photo", photoFile);
            try {
                const res = await fetch(`${API}/auth/uploadPhoto`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                    body: formData,
                });
                const data = await res.json();
                if (res.ok) photoUrl = data.photoUrl;
            } catch (err) {
                console.error("Photo upload failed:", err);
            }
        }

        try {
            const res = await fetch(`${API}/auth/editUsers`, {
                method: "PUT",
                
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },

                body: JSON.stringify({
                    userId: profile?.userId,
                    username: form.username,
                    Fname: form.Fname,
                    Lname: form.Lname,
                    email: form.email,
                    mobile: form.mobile,
                    ...(form.newPassword ? { password: form.newPassword,
                        currentPassword: form.currentPassword
                     } : {}),
                    ...(photoUrl ? { photo: photoUrl } : {}),
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setSubmitSuccess("Profile updated successfully!");
                setEditing(false);
                setPhotoFile(null);
                await fetchProfile();
            } else {
                setSubmitError(data.message ?? "Update failed.");
            }
        } catch (err) {
            setSubmitError("Something went wrong.");
        }
    };

    return (
        <div className="System-container">
           
            <div className="System-layout">
                <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                <div className="System-content-wrapper">
          <Header title="Profile" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

                <div className="System-content profile-page-content">
                    {loading ? (
                        <p className="empty-msg">Loading profile...</p>
                    ) : (
                        <div className="profile-card">

                            
                            <div className="profile-photo-section">
                                <div
                                    className="profile-avatar-wrapper"
                                    onClick={() => editing && fileInputRef.current?.click()}
                                    style={{ cursor: editing ? "pointer" : "default" }}
                                >
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Profile" className="profile-avatar-img" />
                                    ) : (
                                        <div className="profile-avatar-placeholder">
                                            {profile?.Fname?.charAt(0)}{profile?.Lname?.charAt(0)}
                                        </div>
                                    )}
                                    {editing && (
                                        <div className="profile-avatar-overlay">
                                            <span>Change Photo</span>
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: "none" }}
                                    onChange={handlePhotoChange}
                                />
                                <h2 className="profile-name">{profile?.Fname} {profile?.Lname}</h2>
                                <span className={`role-badge ${profile?.role === "Admin" ? "admin" : "accountant"}`}>
                                    {profile?.role}
                                </span>
                            </div>

                          
                            <div className="profile-info-section">
                                {submitSuccess && <p className="profile-success">{submitSuccess}</p>}
                                {submitError && <p className="input-error" style={{ textAlign: "center" }}>{submitError}</p>}

                                
                                <div className="profile-fields">
                                    <div className="profile-field">
                                        <label>First Name</label>
                                        {editing ? <input value={form.Fname} onChange={e => setField("Fname", e.target.value)} /> : <p>{profile?.Fname}</p>}
                                    </div>
                                    <div className="profile-field">
                                        <label>Last Name</label>
                                        {editing ? <input value={form.Lname} onChange={e => setField("Lname", e.target.value)} /> : <p>{profile?.Lname}</p>}
                                    </div>
                                    <div className="profile-field">
                                        <label>Username</label>
                                        {editing ? <input value={form.username} onChange={e => setField("username", e.target.value)} /> : <p>@{profile?.username}</p>}
                                    </div>
                                    <div className="profile-field">
                                        <label>Email</label>
                                        {editing ? <input value={form.email} onChange={e => setField("email", e.target.value)} /> : <p>{profile?.email}</p>}
                                    </div>
                                    <div className="profile-field profile-field--full">
                                        <label>Mobile</label>
                                        {editing ? <input value={form.mobile} onChange={e => setField("mobile", e.target.value)} placeholder="+973 3812 4567" /> : <p>{profile?.mobile ?? "—"}</p>}
                                    </div>
                                </div>

                               
                                {editing && (
                                    <div className="profile-password-section">
                                        <div className="profile-password-header">
                                            <span>Change Password</span>
                                            <p>Leave blank to keep your current password</p>
                                        </div>
                                        <div className="profile-fields">
                                            <div className="profile-field profile-field--full">
                                                <label>Current Password</label>
                                                <input
                                                    type="password"
                                                    placeholder="Enter current password"
                                                    value={form.currentPassword}
                                                    onChange={e => setField("currentPassword", e.target.value)}
                                                />
                                            </div>
                                            <div className="profile-field">
                                                <label>New Password</label>
                                                <input
                                                    type="password"
                                                    placeholder="Enter new password"
                                                    value={form.newPassword}
                                                    onChange={e => setField("newPassword", e.target.value)}
                                                />
                                            </div>
                                            <div className="profile-field">
                                                <label>Confirm New Password</label>
                                                <input
                                                    type="password"
                                                    placeholder="Confirm new password"
                                                    value={form.confirmNewPassword}
                                                    onChange={e => setField("confirmNewPassword", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="profile-actions">
                                    {editing ? (
                                        <>
                                            <button className="cancel-btn" onClick={() => { setEditing(false); setSubmitError(""); setPhotoFile(null); fetchProfile(); }}>Cancel</button>
                                            <button className="confirm-btn" onClick={handleSave}>Save Changes</button>
                                        </>
                                    ) : (
                                        <button className="confirm-btn" onClick={() => setEditing(true)}>Edit Profile</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;