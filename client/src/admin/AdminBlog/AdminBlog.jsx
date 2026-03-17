import React, { useState, useEffect } from "react";
import Layout from "../Utils/Layout";
import axios from "axios";
import { server } from "../../main";
import toast from "react-hot-toast";
import { AiOutlineDelete, AiOutlinePlus, AiOutlineLoading3Quarters } from "react-icons/ai";
import "./adminblog.css";

const AdminBlog = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [brokenImages, setBrokenImages] = useState({});
  
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    excerpt: "",
    content: "",
    author: "",
    isPublished: "true",
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const { data } = await axios.get(`${server}/api/admin/blog`, {
        headers: { token: localStorage.getItem("token") },
      });
      setBlogs(data.blogs || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch blogs");
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) {
      toast.error("Please upload an image for the blog");
      return;
    }

    setSubmitting(true);
    const myForm = new FormData();
    myForm.append("title", formData.title);
    myForm.append("category", formData.category);
    myForm.append("excerpt", formData.excerpt);
    myForm.append("content", formData.content);
    myForm.append("author", formData.author);
    myForm.append("isPublished", formData.isPublished);
    myForm.append("image", image);

    try {
      const { data } = await axios.post(`${server}/api/admin/blog/new`, myForm, {
        headers: { token: localStorage.getItem("token") },
      });
      toast.success(data.message);
      setShowModal(false);
      setFormData({ title: "", category: "", excerpt: "", content: "", author: "", isPublished: "true" });
      setImage(null);
      setImagePreview("");
      fetchBlogs();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create blog");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this blog post?")) {
      try {
        const { data } = await axios.delete(`${server}/api/admin/blog/${id}`, {
          headers: { token: localStorage.getItem("token") },
        });
        toast.success(data.message);
        fetchBlogs();
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to delete blog");
      }
    }
  };

  const resolveImage = (src) => {
    if (!src) return "";
    if (/^https?:\/\//i.test(src)) return src;
    return `${server}/${src}`;
  };

  return (
    <Layout>
      <div className="admin-blog-page">
        <div className="admin-page-header">
          <h1>Manage Blog Posts</h1>
          <button className="common-btn" onClick={() => setShowModal(true)}>
            <AiOutlinePlus /> Create New Post
          </button>
        </div>

        {loading ? (
          <div className="loading-spinner"><AiOutlineLoading3Quarters className="spinner" size={40}/></div>
        ) : (
          <div className="blog-admin-grid">
            {blogs?.length === 0 ? (
              <p className="no-data">No blog posts found. Create one!</p>
            ) : (
              blogs.map((blog) => (
                <div key={blog._id} className="admin-blog-card">
                  <div className="img-wrapper">
                    {brokenImages[blog._id] || !blog.image ? (
                      <div className="admin-blog-image-fallback">Image unavailable</div>
                    ) : (
                      <img
                        src={resolveImage(blog.image)}
                        alt={blog.title}
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [blog._id]: true }))
                        }
                      />
                    )}
                    {!blog.isPublished && <span className="draft-badge">Draft</span>}
                  </div>
                  <div className="admin-blog-info">
                    <h3>{blog.title}</h3>
                    <p className="admin-blog-meta">
                      {blog.category} • {new Date(blog.createdAt).toLocaleDateString()}
                    </p>
                    <button onClick={() => handleDelete(blog._id)} className="admin-blog-delete-btn">
                      <AiOutlineDelete /> Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content admin-blog-modal">
              <h2>Create New Blog Post</h2>
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label>Title</label>
                  <input type="text" name="title" value={formData.title} onChange={handleChange} required />
                </div>
                
                <div className="form-row">
                  <div className="input-group">
                    <label>Category</label>
                    <input type="text" name="category" value={formData.category} onChange={handleChange} required />
                  </div>
                  <div className="input-group">
                    <label>Author</label>
                    <input type="text" name="author" value={formData.author} onChange={handleChange} required />
                  </div>
                </div>

                <div className="input-group">
                  <label>Thumbnail Image</label>
                  <input type="file" accept="image/*" onChange={handleImageChange} required />
                </div>
                {imagePreview && <img src={imagePreview} alt="Preview" className="img-preview" />}

                <div className="input-group">
                  <label>Short Excerpt (Max 300 chars)</label>
                  <textarea name="excerpt" rows="2" value={formData.excerpt} onChange={handleChange} maxLength="300" required></textarea>
                </div>

                <div className="input-group">
                  <label>Full Content (Markdown/Text)</label>
                  <textarea name="content" rows="6" value={formData.content} onChange={handleChange} required></textarea>
                </div>

                <div className="input-group">
                  <label>Publish Status</label>
                  <select name="isPublished" value={formData.isPublished} onChange={handleChange}>
                    <option value="true">Published</option>
                    <option value="false">Draft</option>
                  </select>
                </div>

                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</button>
                  <button type="submit" className="common-btn" disabled={submitting}>
                    {submitting ? "Creating..." : "Create Post"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminBlog;
