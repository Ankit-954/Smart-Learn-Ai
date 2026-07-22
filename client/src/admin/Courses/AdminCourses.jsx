import React, { useState } from "react";
import Layout from "../Utils/Layout";
import { useNavigate } from "react-router-dom";
import { CourseData } from "../../context/CourseContext";
import CourseCard from "../../components/coursecard/CourseCard";
import "./admincourses.css";
import toast from "react-hot-toast";
import axios from "axios";
import API from "../../utils/api.js";
const server = API.defaults.baseURL;

const categories = [
  "Web Development",
  "App Development",
  "Game Development",
  "Data Science",
  "Artificial Intelligence",
];

const streams = [
  "Computer Science",
  "Commerce",
  "Arts",
  "Science",
  "Management",
  "Medical",
];

const levels = ["All Levels", "Beginner", "Intermediate", "Advanced", "Beginner to Advanced"];
const durationUnits = [
  { value: "day", label: "Day(s)" },
  { value: "week", label: "Week(s)" },
  { value: "month", label: "Month(s)" },
];

const AdminCourses = ({ user }) => {
  const navigate = useNavigate();

  if (user && user.role !== "admin") return navigate("/");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [stream, setStream] = useState("");
  const [level, setLevel] = useState("All Levels");
  const [subjects, setSubjects] = useState("");
  const [isTopCourse, setIsTopCourse] = useState(false);
  const [topPriority, setTopPriority] = useState(0);
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [createdBy, setCreatedBy] = useState("");
  const [duration, setDuration] = useState("");
  const [durationUnit, setDurationUnit] = useState("week");
  const [image, setImage] = useState("");
  const [imagePrev, setImagePrev] = useState("");
  const [btnLoading, setBtnLoading] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);

  const changeImageHandler = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setImage("");
      setImagePrev("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file only (jpg/png/webp).");
      e.target.value = "";
      setImage("");
      setImagePrev("");
      return;
    }
    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onloadend = () => {
      setImagePrev(reader.result);
      setImage(file);
    };
  };

  const { courses, fetchCourses } = CourseData();

  const resetForm = () => {
    setImage("");
    setTitle("");
    setDescription("");
    setDuration("");
    setDurationUnit("week");
    setImagePrev("");
    setCreatedBy("");
    setPrice("");
    setIsFree(false);
    setCategory("");
    setStream("");
    setLevel("All Levels");
    setSubjects("");
    setIsTopCourse(false);
    setTopPriority(0);
    setEditingCourseId(null);
  };

  const startEditCourse = (course) => {
    if (!course) return;
    setEditingCourseId(course._id);
    setTitle(course.title || "");
    setDescription(course.description || "");
    setCategory(course.category || "");
    setStream(course.stream || "");
    setLevel(course.level || "All Levels");
    setSubjects(Array.isArray(course.subjects) ? course.subjects.join(", ") : "");
    setIsTopCourse(Boolean(course.isTopCourse));
    setTopPriority(course.topPriority || 0);
    const freeFlag = course.isFree || Number(course.price) <= 0;
    setIsFree(freeFlag);
    setPrice(freeFlag ? "0" : String(course.price ?? ""));
    setCreatedBy(course.createdBy || "");
    setDuration(course.duration || "");
    setDurationUnit(course.durationUnit || "week");
    setImage("");
    setImagePrev(course.image ? `${server}/${course.image}` : "");
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    setBtnLoading(true);

    const myForm = new FormData();

    myForm.append("title", title);
    myForm.append("description", description);
    myForm.append("category", category);
    myForm.append("stream", stream);
    myForm.append("level", level);
    myForm.append("subjects", subjects);
    myForm.append("isTopCourse", String(isTopCourse));
    myForm.append("topPriority", String(topPriority || 0));
    myForm.append("price", price);
    myForm.append("isFree", String(isFree));
    myForm.append("createdBy", createdBy);
    myForm.append("duration", duration);
    myForm.append("durationUnit", durationUnit);
    if (image) {
      myForm.append("file", image);
    }

    try {
      const endpoint = editingCourseId
        ? `${server}/api/course/${editingCourseId}`
        : `${server}/api/course/new`;
      const method = editingCourseId ? "put" : "post";
      const { data } = await axios[method](endpoint, myForm, {
        headers: {
          token: localStorage.getItem("token"),
        },
      });

      toast.success(data.message);
      setBtnLoading(false);
      await fetchCourses();
      resetForm();
    } catch (error) {
      toast.error(error.response.data.message);
      setBtnLoading(false);
    }
  };

  return (
    <Layout>
      <div className="admin-courses">
        <div className="left admin-courses-list-panel">
          <div className="admin-courses-header">
            <h1>Manage Courses</h1>
            <p>Create, review, and update your course catalog.</p>
          </div>
          <div className="dashboard-content admin-course-grid">
            {courses && courses.length > 0 ? (
              courses.map((e) => {
                return <CourseCard key={e._id} course={e} onEdit={startEditCourse} />;
              })
            ) : (
              <p className="admin-empty-state">No Courses Yet</p>
            )}
          </div>
        </div>

        <div className="right admin-courses-form-panel">
          <div className="add-course">
            <div className="course-form">
              <h2>{editingCourseId ? "Edit Course" : "Add Course"}</h2>
              <form onSubmit={submitHandler}>
                <label htmlFor="text">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />

                <label htmlFor="text">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />

                <label htmlFor="text">Pricing Type</label>
                <select
                  value={isFree ? "free" : "paid"}
                  onChange={(e) => {
                    const nextIsFree = e.target.value === "free";
                    setIsFree(nextIsFree);
                    setPrice(nextIsFree ? "0" : "");
                  }}
                >
                  <option value="paid">Paid</option>
                  <option value="free">Free</option>
                </select>

                <label htmlFor="text">Price</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required={!isFree}
                  disabled={isFree}
                />

                <label htmlFor="text">createdBy</label>
                <input
                  type="text"
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                  required
                />

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value={""}>Select Category</option>
                  {categories.map((e) => (
                    <option value={e} key={e}>
                      {e}
                    </option>
                  ))}
                </select>

                <select
                  value={stream}
                  onChange={(e) => setStream(e.target.value)}
                  required
                >
                  <option value={""}>Select Stream</option>
                  {streams.map((e) => (
                    <option value={e} key={e}>
                      {e}
                    </option>
                  ))}
                </select>

                <select value={level} onChange={(e) => setLevel(e.target.value)} required>
                  {levels.map((e) => (
                    <option value={e} key={e}>
                      {e}
                    </option>
                  ))}
                </select>

                <label htmlFor="text">Subjects (comma separated)</label>
                <input
                  type="text"
                  value={subjects}
                  onChange={(e) => setSubjects(e.target.value)}
                  placeholder="e.g. React, Redux, Node.js"
                  required
                />

                <label className="admin-top-course-check">
                  <input
                    type="checkbox"
                    checked={isTopCourse}
                    onChange={(e) => setIsTopCourse(e.target.checked)}
                  />
                  Mark as Top Course
                </label>

                <label htmlFor="text">Top Priority (1 = highest)</label>
                <input
                  type="number"
                  min="0"
                  value={topPriority}
                  onChange={(e) => setTopPriority(e.target.value)}
                />

                <label htmlFor="text">Duration</label>
                <div className="admin-duration-row">
                  <input
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    required
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value)}
                    required
                  >
                    {durationUnits.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>

                <label htmlFor="course-cover">Course Cover Image (optional)</label>
                <input
                  id="course-cover"
                  type="file"
                  accept="image/*"
                  onChange={changeImageHandler}
                />
                <small>Allowed: jpg, png, webp. If skipped, default cover is generated.</small>
                {imagePrev && <img src={imagePrev} alt="" width={300} />}

                <div className="admin-course-form-actions">
                  <button
                    type="submit"
                    disabled={btnLoading}
                    className="common-btn"
                  >
                    {btnLoading ? "Please Wait..." : editingCourseId ? "Update" : "Add"}
                  </button>
                  {editingCourseId && (
                    <button
                      type="button"
                      className="common-btn"
                      style={{ background: "#475569" }}
                      onClick={resetForm}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminCourses;
