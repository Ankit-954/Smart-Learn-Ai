import axios from "axios";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import API from "../utils/api.js";
const server = API.defaults.baseURL;

const CourseContext = createContext();

export const CourseContextProvider = ({ children }) => {
  const [courses, setCourses] = useState([]);
  const [course, setCourse] = useState(null);
  const [mycourse, setMyCourse] = useState([]);
  const myCourseRequestRef = useRef(null);
  const didInitRef = useRef(false);

  const fetchCourses = useCallback(async () => {
    try {
      const { data } = await axios.get(`${server}/api/course/all`);

      setCourses(data.courses);
    } catch (error) {
      console.log(error);
    }
  }, []);

  const fetchCourse = useCallback(async (id) => {
    try {
      const { data } = await axios.get(`${server}/api/course/${id}`);
      setCourse(data.course);
    } catch (error) {
      console.log(error);
    }
  }, []);

  const fetchMyCourse = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setMyCourse([]);
      return;
    }

    try {
      if (myCourseRequestRef.current) {
        return myCourseRequestRef.current;
      }

      const request = axios
        .get(`${server}/api/mycourse`, {
          headers: {
            token,
          },
        })
        .then(({ data }) => {
          setMyCourse(data.courses);
          return data;
        })
        .catch((error) => {
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            setMyCourse([]);
          } else {
            console.log(error);
          }
          throw error;
        })
        .finally(() => {
          myCourseRequestRef.current = null;
        });

      myCourseRequestRef.current = request;
      return request;
    } catch (error) {
      return null;
    }
  }, []);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    fetchCourses();
    fetchMyCourse();
  }, [fetchCourses, fetchMyCourse]);

  const value = useMemo(
    () => ({
      courses,
      fetchCourses,
      fetchCourse,
      course,
      mycourse,
      fetchMyCourse,
    }),
    [courses, fetchCourses, fetchCourse, course, mycourse, fetchMyCourse]
  );
  return (
    <CourseContext.Provider value={value}>
      {children}
    </CourseContext.Provider>
  );
};

export const CourseData = () => useContext(CourseContext);
