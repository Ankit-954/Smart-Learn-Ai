import React, { useState, useEffect } from "react";
import axios from "axios";
import API from "../../utils/api.js";
const server = API.defaults.baseURL;
import "./blog.css";
import { Link } from "react-router-dom";
import { AiOutlineClockCircle, AiOutlineUser, AiOutlineCheckCircle, AiOutlineLoading3Quarters } from "react-icons/ai";
import { usePageSeo } from "../../utils/usePageSeo";

// Fallback posts if the DB is completely empty (for immediate visual feedback)
const fallbackPosts = [
  {
    title: "The Future of AI in Education",
    excerpt: "Discover how artificial intelligence is transforming personalized learning, predicting student outcomes, and automating administrative tasks.",
    category: "AI Technology",
    publishedAt: "2024-10-12T00:00:00Z",
    author: "Dr. Sarah Jenkins",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "Mastering React 19: What's New?",
    excerpt: "A deep dive into the latest features of React 19, including the new compiler, server components, and improved hooks.",
    category: "Web Development",
    publishedAt: "2024-09-28T00:00:00Z",
    author: "Alex Morgan",
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80"
  }
];

const Blog = () => {
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  usePageSeo({
    title: "Blog",
    description: "Read SmartLearn AI articles on learning, technology, careers, AI, and modern software development.",
    canonicalPath: "/blog",
  });

  const [email, setEmail] = useState("");
  const [subStatus, setSubStatus] = useState("idle");
  const [subMsg, setSubMsg] = useState("");

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data } = await axios.get(`${server}/api/public/blog`);
      if (data.success && data.posts.length > 0) {
        setPosts(data.posts);
      } else {
        setPosts(fallbackPosts);
      }
    } catch (error) {
      console.error("Error fetching blogs:", error);
      setPosts(fallbackPosts); // Use fallbacks if API fails
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSubStatus("loading");
    setSubMsg("");
    try {
      const { data } = await axios.post(`${server}/api/public/newsletter`, { email });
      if (data.success) {
        setSubStatus("success");
        setSubMsg(data.message || "Subscribed successfully!");
        setEmail("");
        setTimeout(() => setSubStatus("idle"), 5000);
      }
    } catch (error) {
      setSubStatus("error");
      setSubMsg(error.response?.data?.error || "Subscription failed.");
      setTimeout(() => setSubStatus("idle"), 5000);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const resolveImage = (src) => {
    if (!src) return "";
    if (/^https?:\/\//i.test(src)) return src;
    return `${server}/${src}`;
  };

  return (
    <div className="blog-page">
      <div className="blog-hero anim-fade-up">
        <h1>SmartLearn Insights</h1>
        <p>Expert articles, tutorials, and news about learning, technology, and career building.</p>
      </div>

      <div className="blog-grid anim-scale-in">
        {loadingPosts ? (
          <div style={{ textAlign: "center", gridColumn: "1/-1", padding: "40px" }}>
            <AiOutlineLoading3Quarters className="spinner" size={40} style={{ color: "var(--primary)" }} />
          </div>
        ) : (
          posts.map((post, index) => (
            <article key={index} className="blog-card card-3d">
              <div className="blog-img-wrapper">
                <span className="blog-category">{post.category}</span>
                <img src={resolveImage(post.image)} alt={post.title} className="blog-image" />
              </div>
              <div className="blog-content">
                <h2>{post.title}</h2>
                <p className="blog-excerpt">{post.excerpt}</p>
                
                <div className="blog-meta">
                  <div className="meta-item">
                    <AiOutlineUser className="meta-icon" />
                    <span>{post.author}</span>
                  </div>
                  <div className="meta-item">
                    <AiOutlineClockCircle className="meta-icon" />
                    <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                  </div>
                </div>
                
                {post._id ? (
                  <Link className="read-more-btn" to={`/blog/${post._id}`}>
                    Read Article &rarr;
                  </Link>
                ) : (
                  <span className="read-more-btn" style={{ cursor: "default", opacity: 0.7 }}>
                    Read Article &rarr;
                  </span>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      <div className="blog-newsletter anim-fade-up">
        <h2>Don't miss out on updates</h2>
        <p>Subscribe to get the latest posts delivered straight to your inbox.</p>
        {subStatus === "success" ? (
          <div className="success-message-box anim-scale-in" style={{ padding: "20px" }}>
             <AiOutlineCheckCircle size={28} />
             <h3 style={{ margin: "10px 0 0" }}>{subMsg}</h3>
          </div>
        ) : (
          <form className="blog-subscribe" onSubmit={handleSubscribe}>
             <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address..." required disabled={subStatus === "loading"} />
             <button type="submit" className="common-btn" disabled={subStatus === "loading"}>
               {subStatus === "loading" ? "..." : "Subscribe"}
             </button>
             {subStatus === "error" && <div style={{ color: "var(--danger)", width: "100%", marginTop: "10px", textAlign: "left" }}>{subMsg}</div>}
          </form>
        )}
      </div>
    </div>
  );
};

export default Blog;
