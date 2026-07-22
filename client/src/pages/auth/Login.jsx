import React, { useState, useCallback, useEffect, useRef } from "react";
import "./auth.css";
import { Link, useNavigate } from "react-router-dom";
import { UserData } from "../../context/UserContext";
import { CourseData } from "../../context/CourseContext";
import { FiEye, FiEyeOff } from "react-icons/fi";

const Login = () => {
  const navigate = useNavigate();
  const { btnLoading, loginUser, googleLogin } = UserData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const googleButtonRef = useRef(null);

  const { fetchMyCourse } = CourseData();

  const submitHandler = async (e) => {
    e.preventDefault();
    await loginUser(email, password, navigate, fetchMyCourse);
  };

  const handleGoogleCredential = useCallback((response) => {
    if (response.credential) {
      googleLogin(response.credential, navigate, fetchMyCourse);
    }
  }, [googleLogin, navigate, fetchMyCourse]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !googleButtonRef.current) return undefined;

    let cancelled = false;
    let intervalId;

    const renderGoogleButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) {
        return false;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
      });

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        type: "standard",
        text: "signin_with",
        shape: "rectangular",
        width: googleButtonRef.current.offsetWidth || 320,
      });
      return true;
    };

    if (!renderGoogleButton()) {
      intervalId = window.setInterval(() => {
        if (renderGoogleButton()) {
          window.clearInterval(intervalId);
        }
      }, 250);
    }

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [handleGoogleCredential]);

  return (
    <div className="auth-page">
      <div className="auth-form login-form">
        <div className="auth-badge">Welcome Back</div>
        <h2>Sign in to SmartLearn AI</h2>
        <p className="auth-subtitle">
          Continue your learning streak where you left off.
        </p>
        <form onSubmit={submitHandler}>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          <button disabled={btnLoading} type="submit" className="common-btn">
            {btnLoading ? "Please Wait..." : "Login"}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="google-btn-wrapper" ref={googleButtonRef} />

        <p className="auth-links">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
        <p className="auth-links">
          <Link to="/forgot">Forgot password?</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
