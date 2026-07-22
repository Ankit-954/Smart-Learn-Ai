import React, { useState, useEffect } from "react";
import Layout from "../Utils/Layout";
import axios from "axios";
import API from "../../utils/api.js";
const server = API.defaults.baseURL;
import toast from "react-hot-toast";
import { AiOutlineDelete, AiOutlinePlus, AiOutlineLoading3Quarters, AiOutlineSave } from "react-icons/ai";
import "./adminabout.css";

const AdminAbout = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [aboutData, setAboutData] = useState({
    hero: { title: "", intro: "", bannerImage: "", tagline: "" },
    mission: { text: "", image: "" },
    vision: { text: "", image: "" },
    features: [],
    approach: { text: "", image: "" },
    team: [],
    stats: [],
  });

  useEffect(() => {
    fetchAboutData();
  }, []);

  const fetchAboutData = async () => {
    try {
      const { data } = await axios.get(`${server}/api/public/about`);
      if (data.data) {
        setAboutData(data.data);
      }
    } catch (error) {
      toast.error("Failed to load About page data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const ensureId = (item) => ({
        ...item,
        id: item?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });

      const validateArray = (arr, requiredKeys, sectionLabel) => {
        if (!Array.isArray(arr)) return { cleaned: [], errors: [] };
        const errors = [];
        const cleaned = arr.map((item, idx) => {
          const fixed = ensureId(item);
          const missing = requiredKeys.filter((key) => !String(fixed?.[key] || "").trim());
          if (missing.length > 0) {
            errors.push({
              section: sectionLabel,
              index: idx + 1,
              missing,
            });
          }
          return fixed;
        });
        return { cleaned, errors };
      };

      const featuresCheck = validateArray(aboutData.features, ["title", "icon", "description"], "Features");
      const teamCheck = validateArray(aboutData.team, ["name", "role", "description"], "Team");
      const statsCheck = validateArray(aboutData.stats, ["label", "value", "icon"], "Stats");

      const errors = [...featuresCheck.errors, ...teamCheck.errors, ...statsCheck.errors];
      if (errors.length > 0) {
        const first = errors[0];
        toast.error(
          `${first.section} item #${first.index} missing: ${first.missing.join(", ")}.`
        );
        if (errors.length > 1) {
          toast.error(`There are ${errors.length - 1} more incomplete items.`);
        }
        return;
      }

      const cleaned = {
        ...aboutData,
        features: featuresCheck.cleaned,
        team: teamCheck.cleaned,
        stats: statsCheck.cleaned,
      };

      const { data } = await axios.put(`${server}/api/admin/about`, cleaned, {
        headers: { token: localStorage.getItem("token") },
      });
      toast.success(data.message);
      setAboutData(data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save data");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (e, section, objectKey, idx = null) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    const loader = toast.loading("Uploading image...");
    try {
      const { data } = await axios.post(`${server}/api/admin/about/image`, formData, {
        headers: { token: localStorage.getItem("token") },
      });

      const newAboutData = { ...aboutData };
      if (idx !== null) {
         newAboutData[section][idx][objectKey] = data.imageUrl;
      } else {
         newAboutData[section][objectKey] = data.imageUrl;
      }
      setAboutData(newAboutData);
      toast.success("Image uploaded successfully", { id: loader });
    } catch (error) {
      toast.error("Image upload failed", { id: loader });
    }
  };

  const handleTextChange = (e, section, field) => {
    setAboutData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: e.target.value,
      },
    }));
  };

  const handleArrayChange = (e, section, idx, field) => {
    const newArray = [...aboutData[section]];
    newArray[idx][field] = e.target.value;
    setAboutData((prev) => ({ ...prev, [section]: newArray }));
  };

  const addArrayItem = (section, template) => {
    setAboutData((prev) => ({
      ...prev,
      [section]: [...prev[section], { id: Date.now().toString(), ...template }],
    }));
  };

  const removeArrayItem = (section, idx) => {
    const newArray = [...aboutData[section]];
    newArray.splice(idx, 1);
    setAboutData((prev) => ({ ...prev, [section]: newArray }));
  };

  const resolveImage = (src) => {
    if (!src) return "";
    if (/^https?:\/\//i.test(src)) return src;
    return `${server}/${src}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-spinner"><AiOutlineLoading3Quarters className="spinner" size={40}/></div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="admin-about-page">
        <div className="admin-page-header">
          <h1>Manage "About Us" Page</h1>
          <button className="common-btn save-btn" onClick={handleSave} disabled={submitting}>
            {submitting ? <AiOutlineLoading3Quarters className="spinner" /> : <AiOutlineSave />} 
            Save Changes
          </button>
        </div>

        <div className="admin-about-grid">
          {/* Hero Section */}
          <div className="admin-card">
            <h2>Hero Section</h2>
            <div className="input-group">
              <label>Banner Image</label>
              {aboutData.hero?.bannerImage && (
                <img src={resolveImage(aboutData.hero.bannerImage)} alt="Hero Banner" className="img-preview-small" />
              )}
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "hero", "bannerImage")} />
            </div>
            <div className="input-group">
              <label>Title</label>
              <input type="text" value={aboutData.hero?.title} onChange={(e) => handleTextChange(e, "hero", "title")} />
            </div>
            <div className="input-group">
              <label>Tagline</label>
              <input type="text" value={aboutData.hero?.tagline} onChange={(e) => handleTextChange(e, "hero", "tagline")} />
            </div>
            <div className="input-group">
              <label>Intro Description</label>
              <textarea rows="3" value={aboutData.hero?.intro} onChange={(e) => handleTextChange(e, "hero", "intro")}></textarea>
            </div>
          </div>

          {/* Mission & Vision */}
          <div className="admin-card">
            <h2>Mission & Vision</h2>
            <h3>Mission</h3>
            <div className="input-group">
              <label>Mission Image</label>
              {aboutData.mission?.image && <img src={resolveImage(aboutData.mission.image)} alt="Mission" className="img-preview-small" />}
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "mission", "image")} />
            </div>
            <div className="input-group">
              <label>Mission Text</label>
              <textarea rows="3" value={aboutData.mission?.text} onChange={(e) => handleTextChange(e, "mission", "text")}></textarea>
            </div>
            <hr />
            <h3>Vision</h3>
            <div className="input-group">
              <label>Vision Image</label>
              {aboutData.vision?.image && <img src={resolveImage(aboutData.vision.image)} alt="Vision" className="img-preview-small" />}
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "vision", "image")} />
            </div>
            <div className="input-group">
              <label>Vision Text</label>
              <textarea rows="3" value={aboutData.vision?.text} onChange={(e) => handleTextChange(e, "vision", "text")}></textarea>
            </div>
          </div>

          {/* Features / What We Offer */}
          <div className="admin-card full-span">
            <div className="card-header-flex">
              <h2>What We Offer (Features)</h2>
              <button className="add-btn" onClick={() => addArrayItem("features", { title: "", icon: "FaStar", description: "" })}>
                <AiOutlinePlus /> Add Feature
              </button>
            </div>
            {aboutData.features?.length === 0 && <p className="no-data">No features added yet. Click "Add Feature" to start.</p>}
            <div className="array-grid">
              {aboutData.features?.map((feat, idx) => (
                <div key={feat.id || idx} className="array-item-card">
                  <div className="delete-row"><AiOutlineDelete onClick={() => removeArrayItem("features", idx)} className="delete-icon" /></div>
                  <div className="input-group"><label>Title</label><input type="text" value={feat.title} onChange={(e) => handleArrayChange(e, "features", idx, "title")} /></div>
                  <div className="input-group"><label>Icon Name (react-icons)</label><input type="text" value={feat.icon} onChange={(e) => handleArrayChange(e, "features", idx, "icon")} placeholder="e.g. FaLaptop" /></div>
                  <div className="input-group"><label>Description</label><textarea rows="2" value={feat.description} onChange={(e) => handleArrayChange(e, "features", idx, "description")}></textarea></div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Section */}
          <div className="admin-card full-span">
            <div className="card-header-flex">
              <h2>Our Team</h2>
              <button className="add-btn" onClick={() => addArrayItem("team", { name: "", role: "", description: "", image: "" })}>
                <AiOutlinePlus /> Add Team Member
              </button>
            </div>
            {aboutData.team?.length === 0 && <p className="no-data">No team members added yet.</p>}
            <div className="array-grid">
              {aboutData.team?.map((member, idx) => (
                <div key={member.id || idx} className="array-item-card">
                  <div className="delete-row"><AiOutlineDelete onClick={() => removeArrayItem("team", idx)} className="delete-icon" /></div>
                  <div className="input-group">
                    <label>Profile Image</label>
                    {member.image && <img src={resolveImage(member.image)} alt={member.name} className="team-preview-small" />}
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "team", "image", idx)} />
                  </div>
                  <div className="input-group"><label>Name</label><input type="text" value={member.name} onChange={(e) => handleArrayChange(e, "team", idx, "name")} /></div>
                  <div className="input-group"><label>Role</label><input type="text" value={member.role} onChange={(e) => handleArrayChange(e, "team", idx, "role")} /></div>
                  <div className="input-group"><label>Description</label><textarea rows="2" value={member.description} onChange={(e) => handleArrayChange(e, "team", idx, "description")}></textarea></div>
                </div>
              ))}
            </div>
          </div>

          {/* Statistics Section */}
          <div className="admin-card full-span">
            <div className="card-header-flex">
              <h2>Statistics</h2>
              <button className="add-btn" onClick={() => addArrayItem("stats", { label: "", value: "", icon: "FaChartBar" })}>
                <AiOutlinePlus /> Add Stat
              </button>
            </div>
            {aboutData.stats?.length === 0 && <p className="no-data">No statistics added yet.</p>}
            <div className="array-grid stats-grid">
              {aboutData.stats?.map((stat, idx) => (
                <div key={stat.id || idx} className="array-item-card">
                  <div className="delete-row"><AiOutlineDelete onClick={() => removeArrayItem("stats", idx)} className="delete-icon" /></div>
                  <div className="input-group"><label>Value (e.g. 50k+)</label><input type="text" value={stat.value} onChange={(e) => handleArrayChange(e, "stats", idx, "value")} /></div>
                  <div className="input-group"><label>Label (e.g. Students)</label><input type="text" value={stat.label} onChange={(e) => handleArrayChange(e, "stats", idx, "label")} /></div>
                  <div className="input-group"><label>Icon Name</label><input type="text" value={stat.icon} onChange={(e) => handleArrayChange(e, "stats", idx, "icon")} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminAbout;
