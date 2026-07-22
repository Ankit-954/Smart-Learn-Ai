import React from "react";
import "./account.css";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import API from "../../utils/api.js";
const server = API.defaults.baseURL;
import { UserData } from "../../context/UserContext";

const Account = ({ user }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isEditMode = searchParams.get("edit") === "1";
  const { setUser, fetchUser } = UserData();
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    country: "",
    address: "",
    education: "",
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      phone: user.phone || "",
      country: user.country || "",
      address: user.address || "",
      education: user.education || "",
    });
    setPhotoPreview(user.photo ? `${server}/${String(user.photo).replace(/\\/g, "/")}` : "");
    setPhotoFile(null);
  }, [user]);

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append("name", form.name || "");
      payload.append("phone", form.phone || "");
      payload.append("country", form.country || "");
      payload.append("address", form.address || "");
      payload.append("education", form.education || "");
      if (photoFile) {
        payload.append("photo", photoFile);
      }

      const { data } = await axios.put(`${server}/api/user/me`, payload, {
        headers: {
          token: localStorage.getItem("token"),
        },
      });
      setUser(data.user);
      await fetchUser();
      toast.success(data.message || "Profile updated");
      setSearchParams({});
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const onPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  if (!user) return null;

  return (
    <div className="account-page">
      <div className="profile">
        <div className="profile-head">
          <div className="profile-avatar-wrap">
            {(photoPreview || user.photo) ? (
              <img
                src={photoPreview || `${server}/${String(user.photo || "").replace(/\\/g, "/")}`}
                alt={user.name || "Profile"}
                className="profile-photo"
              />
            ) : (
              <div className="profile-avatar">{user.name?.charAt(0)?.toUpperCase() || "U"}</div>
            )}
          </div>
          <div>
            <h2>{isEditMode ? "Edit Profile" : "My Profile"}</h2>
            <p>Welcome back, {user.name}</p>
          </div>
        </div>

        {isEditMode ? (
          <form className="profile-form" onSubmit={submit}>
            <label>
              Profile Photo
              <input
                type="file"
                accept="image/*"
                onChange={onPhotoChange}
              />
            </label>
            <label>
              Name
              <input name="name" value={form.name} onChange={onChange} required />
            </label>
            <label>
              Phone
              <input name="phone" value={form.phone} onChange={onChange} />
            </label>
            <label>
              Country
              <input name="country" value={form.country} onChange={onChange} />
            </label>
            <label>
              Address
              <input name="address" value={form.address} onChange={onChange} />
            </label>
            <label>
              Education
              <input name="education" value={form.education} onChange={onChange} />
            </label>
            <div className="profile-form-actions">
              <button type="button" className="common-btn ghost-btn" onClick={() => setSearchParams({})}>
                Cancel
              </button>
              <button type="submit" className="common-btn" disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-info">
            <div className="profile-top-actions">
              <button
                type="button"
                className="common-btn profile-edit-btn"
                onClick={() => setSearchParams({ edit: "1" })}
              >
                Edit Profile
              </button>
            </div>
            <div className="info-row">
              <span>Name</span>
              <strong>{user.name}</strong>
            </div>
            <div className="info-row">
              <span>Email</span>
              <strong>{user.email}</strong>
            </div>
            <div className="info-row">
              <span>Phone</span>
              <strong>{user.phone || "-"}</strong>
            </div>
            <div className="info-row">
              <span>Country</span>
              <strong>{user.country || "-"}</strong>
            </div>
            <div className="info-row">
              <span>Address</span>
              <strong>{user.address || "-"}</strong>
            </div>
            <div className="info-row">
              <span>Education</span>
              <strong>{user.education || "-"}</strong>
            </div>
            <div className="info-row">
              <span>Role</span>
              <strong className="role-chip">{user.role}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;
