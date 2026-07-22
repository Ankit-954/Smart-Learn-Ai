import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar, faTrash } from "@fortawesome/free-solid-svg-icons";
import toast from "react-hot-toast";
import "./reviewPage.css";
import API from "../../utils/api.js";
const server = API.defaults.baseURL;
import { UserData } from "../../context/UserContext";

const MAX_IMAGE_SIZE = 30 * 1024;

const ReviewPage = () => {
  const [reviews, setReviews] = useState([]);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [filterSort, setFilterSort] = useState("newest");
  const { user } = UserData();

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setFetchLoading(true);
      const response = await fetch(`${server}/api/reviews`);
      const data = await response.json();

      if (data.reviews) {
        setReviews(data.reviews);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setFetchLoading(false);
    }
  };

  const getSortedReviews = () => {
    const reviewsCopy = [...reviews];

    const qualitySort = (a, b) => {
      const aHasImage = a.image ? 1 : 0;
      const bHasImage = b.image ? 1 : 0;
      if (bHasImage !== aHasImage) return bHasImage - aHasImage;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return new Date(b.createdAt) - new Date(a.createdAt);
    };

    switch (filterSort) {
      case "highest":
        return reviewsCopy.sort(qualitySort);
      case "lowest":
        return reviewsCopy.sort((a, b) => a.rating - b.rating);
      case "featured": {
        const featured = reviewsCopy.filter((r) => r.isFeatured).sort(qualitySort);
        const remaining = reviewsCopy.filter((r) => !r.isFeatured).sort(qualitySort);
        return [...featured, ...remaining];
      }
      case "newest":
      default:
        return reviewsCopy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImage(null);
      setImagePreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be 30KB or less");
      e.target.value = "";
      return;
    }

    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !comment.trim() || !rating) {
      toast.error("Please fill all fields");
      return;
    }

    if (comment.length < 10) {
      toast.error("Review must be at least 10 characters long");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("comment", comment);
      formData.append("rating", rating);
      if (image) {
        formData.append("image", image);
      }

      const response = await fetch(`${server}/api/reviews`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Review submitted successfully!");
        setReviews([data.review, ...reviews]);
        setName("");
        setComment("");
        setRating(5);
        setImage(null);
        setImagePreview("");
      } else {
        toast.error(data.message || "Failed to submit review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Error submitting review");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this review?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${server}/api/reviews/${reviewId}`, {
        method: "DELETE",
        headers: {
          token,
        },
      });

      if (response.ok) {
        setReviews(reviews.filter((r) => r._id !== reviewId));
        toast.success("Review deleted successfully");
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to delete review");
      }
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("Error deleting review");
    }
  };

  const handleFeatureToggle = async (reviewId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${server}/api/reviews/${reviewId}/feature`, {
        method: "PUT",
        headers: {
          token,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Unable to update testimonial selection");
        return;
      }

      toast.success(data.message);
      setReviews((prev) =>
        prev.map((r) => (r._id === reviewId ? { ...r, isFeatured: !r.isFeatured } : r))
      );
    } catch (error) {
      console.error("Error toggling featured review:", error);
      toast.error("Error updating testimonial selection");
    }
  };

  const renderStars = (ratingValue = rating, interactive = true) => {
    return Array.from({ length: 5 }, (_, index) => (
      <FontAwesomeIcon
        key={index}
        icon={faStar}
        className={index < ratingValue ? "star-filled" : "star-empty"}
        onClick={() => interactive && setRating(index + 1)}
        style={{ cursor: interactive ? "pointer" : "default" }}
      />
    ));
  };

  const sortedReviews = getSortedReviews();

  return (
    <div className="review-page-container">
      <div className="review-form-section">
        <div className="form-header">
          <h1>Share Your Experience</h1>
          <p>Help other students by sharing your feedback</p>
        </div>

        <form onSubmit={handleSubmit} className="review-form">
          <div className="form-group">
            <label htmlFor="name">Your Name</label>
            <input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="comment">Your Review</label>
            <textarea
              id="comment"
              placeholder="Write your detailed review or comment (minimum 10 characters)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="form-textarea"
              rows="6"
              required
            ></textarea>
            <small className="char-count">{comment.length} characters</small>
          </div>

          <div className="form-group">
            <label>Rating</label>
            <div className="rating-input">
              {renderStars(rating, true)}
              <span className="rating-text">{rating} out of 5</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="review-image">Photo (optional, max 30KB)</label>
            <input
              id="review-image"
              type="file"
              accept="image/*"
              className="form-input"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="review-upload-preview" />
            )}
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </div>

      <div className="reviews-section">
        <div className="reviews-header">
          <div className="header-top">
            <h2>What Students Say</h2>
            <span className="review-count">{reviews.length} Reviews</span>
          </div>

          <div className="filter-buttons">
            <button
              className={`filter-btn ${filterSort === "newest" ? "active" : ""}`}
              onClick={() => setFilterSort("newest")}
            >
              Newest
            </button>
            <button
              className={`filter-btn ${filterSort === "highest" ? "active" : ""}`}
              onClick={() => setFilterSort("highest")}
            >
              Top Rated + Photo
            </button>
            <button
              className={`filter-btn ${filterSort === "featured" ? "active" : ""}`}
              onClick={() => setFilterSort("featured")}
            >
              Testimonial Picks
            </button>
            <button
              className={`filter-btn ${filterSort === "lowest" ? "active" : ""}`}
              onClick={() => setFilterSort("lowest")}
            >
              Low Rated
            </button>
          </div>
        </div>

        {fetchLoading ? (
          <div className="loading">Loading reviews...</div>
        ) : sortedReviews.length > 0 ? (
          <div className="reviews-list">
            {sortedReviews.map((review) => (
              <div key={review._id} className="review-card">
                <div className="review-header">
                  <div className="review-name-rating">
                    <div className="reviewer-block">
                      <img
                        className="reviewer-thumb"
                        src={
                          review.image
                            ? `${server}/${review.image}`
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                review.name || "Student"
                              )}&background=4f46e5&color=fff`
                        }
                        alt={review.name}
                      />
                      <div>
                        <h3 className="review-name">{review.name}</h3>
                        <div className="review-stars">{renderStars(review.rating, false)}</div>
                      </div>
                    </div>
                  </div>

                  {user?.role === "admin" && (
                    <div className="admin-review-actions">
                      <button
                        className={`feature-btn ${review.isFeatured ? "is-featured" : ""}`}
                        onClick={() => handleFeatureToggle(review._id)}
                      >
                        {review.isFeatured ? "Featured" : "Show in Testimonials"}
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteReview(review._id)}
                        title="Delete review (Admin only)"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  )}
                </div>

                <p className="review-comment">{review.comment}</p>

                <span className="review-date">
                  {new Date(review.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-reviews">
            <p>No reviews yet</p>
            <p className="subtext">Be the first to share your experience!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewPage;
