import React, { useEffect, useMemo, useState } from "react";
import "./testimonials.css";
import API from "../../utils/api.js";
const server = API.defaults.baseURL;

const Testimonials = () => {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const fetchTopReviews = async () => {
      try {
        const response = await fetch(`${server}/api/reviews`);
        const data = await response.json();
        if (data.reviews) {
          setReviews(data.reviews);
        }
      } catch (error) {
        console.error("Failed to load testimonial reviews:", error);
      }
    };

    fetchTopReviews();
  }, []);

  const topReviews = useMemo(() => {
    const sortByQuality = (a, b) => {
      const aHasImage = a.image ? 1 : 0;
      const bHasImage = b.image ? 1 : 0;
      if (bHasImage !== aHasImage) return bHasImage - aHasImage;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return new Date(b.createdAt) - new Date(a.createdAt);
    };

    const featured = reviews.filter((r) => r.isFeatured).sort(sortByQuality);
    const nonFeatured = reviews.filter((r) => !r.isFeatured).sort(sortByQuality);

    return [...featured, ...nonFeatured].slice(0, 4);
  }, [reviews]);

  const renderStars = (rating = 0) =>
    "\u2605".repeat(rating) + "\u2606".repeat(5 - rating);

  return (
    <section className="testimonials">
      <h2>What our students say</h2>
      <div className="testmonials-cards">
        {topReviews.length > 0 ? (
          topReviews.map((e) => (
            <div className="testimonial-card" key={e._id}>
              <div className="student-image">
                <img
                  src={
                    e.image
                      ? `${server}/${e.image}`
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          e.name || "Student"
                        )}&background=1d4ed8&color=fff`
                  }
                  alt={e.name || "Student"}
                />
              </div>
              <p className="message">{e.comment || "Great learning experience."}</p>
              <div className="info">
                <p className="name">{e.name || "Student"}</p>
                <p className="position">Student</p>
                <p className="rating">{renderStars(e.rating)}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="testimonial-empty">No reviews available yet.</p>
        )}
      </div>
    </section>
  );
};

export default Testimonials;
