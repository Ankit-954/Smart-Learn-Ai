import React, { useEffect, useState } from "react";
import "./lecture.css";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import API from "../../utils/api.js";
const server = API.defaults.baseURL;
import Loading from "../../components/loading/Loading";
import toast from "react-hot-toast";
import { TiTick } from "react-icons/ti";

const Lecture = ({ user }) => {
  const [lectures, setLectures] = useState([]);
  const [lecture, setLecture] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lecLoading, setLecLoading] = useState(false);
  const [show, setShow] = useState(false);
  const params = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [video, setvideo] = useState("");
  const [videoPrev, setVideoPrev] = useState("");
  const [btnLoading, setBtnLoading] = useState(false);

  useEffect(() => {
    const hasAccess =
      user?.role === "admin" ||
      (Array.isArray(user?.subscription) &&
        user.subscription.some((courseId) => String(courseId) === String(params.id)));
    if (user && !hasAccess) {
      navigate("/");
    }
  }, [user, params.id, navigate]);

  async function fetchLectures() {
    try {
      const { data } = await axios.get(`${server}/api/lectures/${params.id}`, {
        headers: {
          token: localStorage.getItem("token"),
        },
      });
      setLectures(data.lectures);
      if (Array.isArray(data.lectures) && data.lectures.length > 0) {
        await fetchLecture(data.lectures[0]._id);
      } else {
        setLecture({});
      }
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  }

  async function fetchLecture(id) {
    setLecLoading(true);
    try {
      const { data } = await axios.get(`${server}/api/lecture/${id}`, {
        headers: {
          token: localStorage.getItem("token"),
        },
      });
      setLecture(data.lecture);
      setLecLoading(false);
    } catch (error) {
      console.log(error);
      setLecLoading(false);
    }
  }

  const changeVideoHandler = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onloadend = () => {
      setVideoPrev(reader.result);
      setvideo(file);
    };
  };

  const submitHandler = async (e) => {
    setBtnLoading(true);
    e.preventDefault();
    const myForm = new FormData();

    myForm.append("title", title);
    myForm.append("description", description);
    myForm.append("file", video);

    try {
      const { data } = await axios.post(
        `${server}/api/course/${params.id}`,
        myForm,
        {
          headers: {
            token: localStorage.getItem("token"),
          },
        }
      );

      toast.success(data.message);
      setBtnLoading(false);
      setShow(false);
      fetchLectures();
      setTitle("");
      setDescription("");
      setvideo("");
      setVideoPrev("");
    } catch (error) {
      toast.error(error.response.data.message);
      setBtnLoading(false);
    }
  };

  const deleteHandler = async (id) => {
    if (confirm("Are you sure you want to delete this lecture")) {
      try {
        const { data } = await axios.delete(`${server}/api/lecture/${id}`, {
          headers: {
            token: localStorage.getItem("token"),
          },
        });

        toast.success(data.message);
        fetchLectures();
      } catch (error) {
        toast.error(error.response.data.message);
      }
    }
  };

  const [completed, setCompleted] = useState("");
  const [completedLec, setCompletedLec] = useState("");
  const [lectLength, setLectLength] = useState("");
  const [progress, setProgress] = useState([]);

  async function fetchProgress() {
    try {
      const { data } = await axios.get(
        `${server}/api/user/progress?course=${params.id}`,
        {
          headers: {
            token: localStorage.getItem("token"),
          },
        }
      );

      setCompleted(data.courseProgressPercentage);
      setCompletedLec(data.completedLectures);
      setLectLength(data.allLectures);
      setProgress(data.progress);
    } catch (error) {
      console.log(error);
    }
  }

  const addProgress = async (id) => {
    try {
      const { data } = await axios.post(
        `${server}/api/user/progress?course=${params.id}&lectureId=${id}`,
        {},
        {
          headers: {
            token: localStorage.getItem("token"),
          },
        }
      );
      fetchProgress();
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchLectures();
    fetchProgress();
  }, []);
  return (
    <>
      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="progress-card">
            <p className="progress-title">
              Lecture Completed: {completedLec} / {lectLength}
            </p>
            <div className="progress-track-row">
              <progress value={completed} max={100}></progress>
              <span>{completed}%</span>
            </div>
          </div>
          <div className="lecture-page">
            <div className="left">
              {lecLoading ? (
                <Loading />
              ) : (
                <>
                  {lecture.video ? (
                    <div className="video-shell">
                      <video
                        src={`${server}/${String(lecture.video || "").replace(/\\/g, "/")}`}
                        className="lecture-video"
                        controls
                        controlsList="nodownload noremoteplayback"
                        disablePictureInPicture
                        disableRemotePlayback
                        autoPlay
                        onEnded={() => addProgress(lecture._id)}
                      ></video>
                      <div className="video-info">
                        <h1>{lecture.title}</h1>
                        <p>{lecture.description}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-lecture-state">
                      <h1>{lectures.length ? "Please Select a Lecture" : "No Lectures Available Yet"}</h1>
                      <p>
                        {lectures.length
                          ? "Choose a lecture from the right panel to start learning."
                          : "This course has no uploaded lectures right now. Please contact admin or check back later."}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="right">
              {user && user.role === "admin" && (
                <button
                  className="common-btn lecture-admin-btn"
                  onClick={() => setShow(!show)}
                >
                  {show ? "Close" : "Add Lecture +"}
                </button>
              )}

              {show && (
                <div className="lecture-form">
                  <h2>Add Lecture</h2>
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

                    <input
                      type="file"
                      placeholder="choose video"
                      onChange={changeVideoHandler}
                      required
                    />

                    {videoPrev && (
                      <video
                        src={videoPrev}
                        alt=""
                        width={300}
                        controls
                      ></video>
                    )}

                    <button
                      disabled={btnLoading}
                      type="submit"
                      className="common-btn"
                    >
                      {btnLoading ? "Please Wait..." : "Add"}
                    </button>
                  </form>
                </div>
              )}

              <div className="lecture-list">
                {lectures && lectures.length > 0 ? (
                  lectures.map((e, i) => (
                    <div key={e._id} className="lecture-item">
                      <div
                        onClick={() => fetchLecture(e._id)}
                        className={`lecture-number ${
                          lecture._id === e._id ? "active" : ""
                        }`}
                      >
                        <span className="lecture-index">{i + 1}</span>
                        <span className="lecture-title">{e.title}</span>
                        {progress[0] &&
                          progress[0].completedLectures.includes(e._id) && (
                            <span className="lecture-completed">
                              <TiTick />
                            </span>
                          )}
                      </div>
                      {user && user.role === "admin" && (
                        <button
                          className="common-btn delete-lecture-btn"
                          onClick={() => deleteHandler(e._id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="no-lectures">No Lectures Yet!</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Lecture;
