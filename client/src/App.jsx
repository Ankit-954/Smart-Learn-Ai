import React, { Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { UserData } from "./context/UserContext";
import "./App.css";

/* ── Always-loaded (visible on every page) ────────────────────── */
import Header from "./components/header/Header";
import Footer from "./components/footer/Footer";
import Loading from "./components/loading/Loading";
import UserSidebar from "./components/sidebar/UserSidebar";

/* ── Lazy-loaded pages (code-split into separate chunks) ──────── */
const Home             = React.lazy(() => import("./pages/home/Home"));
const Login            = React.lazy(() => import("./pages/auth/Login"));
const Register         = React.lazy(() => import("./pages/auth/Register"));
const Verify           = React.lazy(() => import("./pages/auth/Verify"));
const ForgotPassword   = React.lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword    = React.lazy(() => import("./pages/auth/ResetPassword"));
const Account          = React.lazy(() => import("./pages/account/Account"));
const Courses          = React.lazy(() => import("./pages/courses/Courses"));
const CourseDescription = React.lazy(() => import("./pages/coursedescription/CourseDescription"));
const PaymentSuccess   = React.lazy(() => import("./pages/paymentsuccess/PaymentSuccess"));
const Dashbord         = React.lazy(() => import("./pages/dashbord/Dashbord"));
const CourseStudy      = React.lazy(() => import("./pages/coursestudy/CourseStudy"));
const Lecture          = React.lazy(() => import("./pages/lecture/Lecture"));
const Progress         = React.lazy(() => import("./pages/progress/Progress"));
const InterviewPage    = React.lazy(() => import("./pages/interview/InterviewPage"));
const TestDomain       = React.lazy(() => import("./pages/Test/TestDomain"));
const TestSection      = React.lazy(() => import("./pages/Test/TestSection"));
const RoadmapPage      = React.lazy(() => import("./components/header/RoadmapPage"));
const ReviewPage       = React.lazy(() => import("./pages/review/ReviewPage"));

/* ── Lazy-loaded footer pages ─────────────────────────────────── */
const About            = React.lazy(() => import("./pages/about/About"));
const Contact          = React.lazy(() => import("./pages/contact/Contact"));
const FAQ              = React.lazy(() => import("./pages/faq/FAQ"));
const Blog             = React.lazy(() => import("./pages/blog/Blog"));
const BlogDetail       = React.lazy(() => import("./pages/blog/BlogDetail"));
const Careers          = React.lazy(() => import("./pages/careers/Careers"));
const Privacy          = React.lazy(() => import("./pages/legal/Privacy"));
const Terms            = React.lazy(() => import("./pages/legal/Terms"));
const Cookies          = React.lazy(() => import("./pages/legal/Cookies"));

/* ── Lazy-loaded admin pages ──────────────────────────────────── */
const AdminDashbord    = React.lazy(() => import("./admin/Dashboard/AdminDashbord"));
const AdminCourses     = React.lazy(() => import("./admin/Courses/AdminCourses"));
const AdminUsers       = React.lazy(() => import("./admin/Users/AdminUsers"));
const AdminBlog        = React.lazy(() => import("./admin/AdminBlog/AdminBlog"));
const AdminAbout       = React.lazy(() => import("./admin/AdminAbout/AdminAbout"));
const AdminCareers     = React.lazy(() => import("./admin/AdminCareers/AdminCareers"));
const AdminContacts    = React.lazy(() => import("./admin/AdminContacts/AdminContacts"));
const AdminNewsletter  = React.lazy(() => import("./admin/AdminNewsletter/AdminNewsletter"));

const App = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

const AppContent = () => {
  const { isAuth, user, loading } = UserData();
  const location = useLocation();
  const [isUserSidebarOpen, setIsUserSidebarOpen] = useState(false);
  const isTestTakingPage =
    location.pathname.startsWith("/test/") && location.pathname !== "/test";

  useEffect(() => {
    if (isTestTakingPage) {
      document.body.classList.add("no-app-header");
    } else {
      document.body.classList.remove("no-app-header");
    }
    return () => {
      document.body.classList.remove("no-app-header");
    };
  }, [isTestTakingPage]);

  useEffect(() => {
    setIsUserSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isUserSidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isUserSidebarOpen]);

  return (
    <>
      {loading ? (
        <Loading />
      ) : (
        <>
          {!isTestTakingPage && (
            <>
              <Header
                onToggleSidebar={() => setIsUserSidebarOpen((prev) => !prev)}
              />
              <UserSidebar
                isOpen={isUserSidebarOpen}
                onClose={() => setIsUserSidebarOpen(false)}
                isAuth={isAuth}
                user={user}
              />
            </>
          )}
          {/* Suspense wraps all lazy routes — shows Loading spinner while chunk downloads */}
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/progress" element={isAuth ? <Progress user={user} /> : <Login />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/account" element={isAuth ? <Account user={user} /> : <Login />} />
              <Route path="/login" element={isAuth ? <Home /> : <Login />} />
              <Route path="/register" element={isAuth ? <Home /> : <Register />} />
              <Route path="/verify" element={isAuth ? <Home /> : <Verify />} />
              <Route path="/forgot" element={isAuth ? <Home /> : <ForgotPassword />} />
              <Route path="/reset-password/:token" element={isAuth ? <Home /> : <ResetPassword />} />
              <Route path="/course/:id" element={isAuth ? <CourseDescription user={user} /> : <Login />} />
              <Route path="/payment-success/:id" element={isAuth ? <PaymentSuccess user={user} /> : <Login />} />
              <Route path="/:id/dashboard" element={isAuth ? <Dashbord user={user} /> : <Login />} />
              <Route path="/course/study/:id" element={isAuth ? <CourseStudy user={user} /> : <Login />} />
              <Route path="/lectures/:id" element={isAuth ? <Lecture user={user} /> : <Login />} />
              <Route
                path="/admin/dashboard"
                element={isAuth && user?.role === "admin" ? <AdminDashbord user={user} /> : <Navigate to="/" />}
              />
              <Route
                path="/admin/course"
                element={isAuth && user?.role === "admin" ? <AdminCourses user={user} /> : <Navigate to="/" />}
              />
              <Route
                path="/admin/users"
                element={isAuth && user?.role === "admin" ? <AdminUsers user={user} /> : <Navigate to="/" />}
              />
              <Route
                path="/admin/blogs"
                element={isAuth && user?.role === "admin" ? <AdminBlog user={user} /> : <Navigate to="/" />}
              />
              <Route
                path="/admin/about"
                element={isAuth && user?.role === "admin" ? <AdminAbout user={user} /> : <Navigate to="/" />}
              />
              <Route
                path="/admin/careers"
                element={isAuth && user?.role === "admin" ? <AdminCareers user={user} /> : <Navigate to="/" />}
              />
              <Route
                path="/admin/contacts"
                element={isAuth && user?.role === "admin" ? <AdminContacts user={user} /> : <Navigate to="/" />}
              />
              <Route
                path="/admin/newsletter"
                element={isAuth && user?.role === "admin" ? <AdminNewsletter user={user} /> : <Navigate to="/" />}
              />
              <Route path="/roadmap/:roadmapName" element={<RoadmapPage />} />
              <Route path="/reviews" element={isAuth ? <ReviewPage /> : <Login />} />
              <Route path="/interview" element={isAuth ? <InterviewPage /> : <Login />} />
              <Route path="/test" element={<TestDomain />} />
              <Route path="/test/:domain" element={isAuth ? <TestSection /> : <Login />} />
              
              {/* Footer Pages */}
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:id" element={<BlogDetail />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/cookies" element={<Cookies />} />
            </Routes>
          </Suspense>
          {!isTestTakingPage && <Footer />}
        </>
      )}
    </>
  );
};

export default App;
