import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import API from "../../utils/api.js";
const server = API.defaults.baseURL;
import "./blogDetail.css";
import { AiOutlineArrowLeft, AiOutlineClockCircle, AiOutlineUser, AiOutlineLoading3Quarters } from "react-icons/ai";
import { usePageSeo } from "../../utils/usePageSeo";

const BlogDetail = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  usePageSeo({
    title: post?.title || "Blog",
    description: post?.excerpt || "Read SmartLearn AI insights on technology, learning, and career growth.",
    canonicalPath: `/blog/${id}`,
    robots: error ? "noindex, nofollow" : "index, follow",
  });

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data } = await axios.get(`${server}/api/public/blog/${id}`);
        if (data?.success && data?.post) {
          setPost(data.post);
        } else {
          setError("Blog post not found.");
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load blog post.");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const resolveImage = (src) => {
    if (!src) return "";
    if (/^https?:\/\//i.test(src)) return src;
    return `${server}/${src}`;
  };

  if (loading) {
    return (
      <div className="blog-detail-page">
        <div className="blog-detail-loading">
          <AiOutlineLoading3Quarters className="spinner" size={40} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="blog-detail-page">
        <div className="blog-detail-error">
          <p>{error}</p>
          <Link to="/blog" className="blog-back-link">
            <AiOutlineArrowLeft /> Back to blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-detail-page">
      <div className="blog-detail-container">
        <Link to="/blog" className="blog-back-link">
          <AiOutlineArrowLeft /> Back to blog
        </Link>

        <div className="blog-detail-hero">
          <img src={resolveImage(post.image)} alt={post.title} />
          <span className="blog-detail-category">{post.category}</span>
        </div>

        <h1 className="blog-detail-title">{post.title}</h1>
        <div className="blog-detail-meta">
          <div className="meta-item">
            <AiOutlineUser className="meta-icon" />
            <span>{post.author}</span>
          </div>
          <div className="meta-item">
            <AiOutlineClockCircle className="meta-icon" />
            <span>{formatDate(post.publishedAt || post.createdAt)}</span>
          </div>
        </div>

        <div className="blog-detail-excerpt">{post.excerpt}</div>
        <div className="blog-detail-body">{post.content}</div>
      </div>
    </div>
  );
};

export default BlogDetail;
