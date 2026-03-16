import React, { useEffect, useState } from "react";
import "./coursedescription.css";
import { useNavigate, useParams } from "react-router-dom";
import { CourseData } from "../../context/CourseContext";
import { server } from "../../main";
import axios from "axios";
import toast from "react-hot-toast";
import { UserData } from "../../context/UserContext";
import Loading from "../../components/loading/Loading";
import CourseThumbnail from "../../components/coursethumbnail/CourseThumbnail";

const formatCourseDuration = (duration, durationUnit) => {
  const numericDuration = Number(duration);
  const safeDuration = Number.isFinite(numericDuration) && numericDuration > 0 ? numericDuration : 0;
  const normalizedUnit = ["day", "week", "month"].includes(String(durationUnit || "").toLowerCase())
    ? String(durationUnit).toLowerCase()
    : "week";
  const unitLabel = safeDuration === 1 ? normalizedUnit : `${normalizedUnit}s`;

  return `${safeDuration} ${unitLabel}`;
};

const CourseDescription = ({ user }) => {
  const params = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const { fetchUser } = UserData();

  const { fetchCourse, course, fetchCourses, fetchMyCourse } = CourseData();

  useEffect(() => {
    fetchCourse(params.id);
  }, [params.id]);

  const enrollFreeHandler = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(
        `${server}/api/course/enroll/${params.id}`,
        {},
        { headers: { token } }
      );
      await fetchUser();
      await fetchCourses();
      await fetchMyCourse();
      toast.success(data.message);
      setLoading(false);
      navigate(`/course/study/${params.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to enroll");
      setLoading(false);
    }
  };

  const checkoutHandler = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first");
      return;
    }

    if (!window.Razorpay) {
      toast.error("Razorpay SDK failed to load. Refresh and try again.");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { order, key },
      } = await axios.post(
        `${server}/api/course/checkout/${params.id}`,
        {},
        {
          headers: {
            token,
          },
        }
      );

      const options = {
        key,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Edu-Tech",
        description: "Learn with us",
        order_id: order.id,
        handler: async function (response) {
          const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
            response;

          try {
            const { data } = await axios.post(
              `${server}/api/verification/${params.id}`,
              {
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
              },
              {
                headers: {
                  token,
                },
              }
            );

            await fetchUser();
            await fetchCourses();
            await fetchMyCourse();
            toast.success(data.message);
            setLoading(false);
            navigate(`/payment-success/${razorpay_payment_id}`);
          } catch (error) {
            toast.error(error.response?.data?.message || "Payment verification failed");
            setLoading(false);
          }
        },
        theme: {
          color: "#8a4baf",
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            toast.error("Payment popup closed");
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response) {
        const err = response?.error || {};
        console.error("Razorpay payment.failed", err);
        if (err.reason === "international_transaction_not_allowed") {
          toast.error(
            "This merchant accepts domestic cards only in current setup. Use UPI (success@razorpay) or an Indian test card."
          );
          setLoading(false);
          return;
        }
        const msg = [
          err.description || "Payment failed",
          err.reason ? `Reason: ${err.reason}` : "",
          err.step ? `Step: ${err.step}` : "",
          err.code ? `Code: ${err.code}` : "",
        ]
          .filter(Boolean)
          .join(" | ");
        toast.error(msg);
        setLoading(false);
      });
      razorpay.open();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to initialize payment");
      setLoading(false);
    }
  };

  return (
    <>
      {loading ? (
        <Loading />
      ) : (
        <>
          {course && (
            <div className="course-description">
              <div className="course-header">
                <CourseThumbnail course={course} className="course-image" />
                <div className="course-info">
                  <h2>{course.title}</h2>
                  <p>Instructor: {course.createdBy}</p>
                  <p>Duration: {formatCourseDuration(course.duration, course.durationUnit)}</p>
                </div>
              </div>

              <p>{course.description}</p>

              <p>
                {course.isFree || Number(course.price) <= 0
                  ? "This course is free."
                  : `Let's get started with course at Rs ${course.price}`}
              </p>

              {user && user.subscription?.includes(course._id) ? (
                <button
                  onClick={() => navigate(`/course/study/${course._id}`)}
                  className="common-btn"
                >
                  Study
                </button>
              ) : (
                <>
                  {course.isFree || Number(course.price) <= 0 ? (
                    <button onClick={enrollFreeHandler} className="common-btn">
                      Enroll Free
                    </button>
                  ) : (
                    <button onClick={checkoutHandler} className="common-btn">
                      Buy Now
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default CourseDescription;


