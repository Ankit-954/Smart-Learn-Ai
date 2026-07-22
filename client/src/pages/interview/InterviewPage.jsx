import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaVolumeUp,
  FaCloudUploadAlt,
  FaClipboardCheck,
  FaRobot,
  FaFileAlt,
  FaPhoneSlash,
  FaCheckCircle,
  FaExclamationTriangle,
  FaLightbulb,
  FaUserCircle,
  FaKeyboard,
  FaHome,
  FaChartLine,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import API from "../../utils/api.js";
const server = API.defaults.baseURL;
import "./interviewPage.css";

/* ── Constants ───────────────────────────────────────────────── */
const CIRC_LG = 2 * Math.PI * 34;
const TARGET_QUESTIONS = 6;
const SILENCE_TIMEOUT_MS = 2000; // faster auto-submit after 2s silence

const GaugeChart = ({ score, max = 10, label, fillClass }) => {
  const pct = Math.min(Number(score) || 0, max) / max;
  const offset = CIRC_LG * (1 - pct);
  return (
    <div className="iv-gauge-card">
      <div className="iv-gauge-svg-wrap">
        <svg viewBox="0 0 80 80">
          <circle className="iv-gauge-bg" cx="40" cy="40" r="34" />
          <circle className={`iv-gauge-fill ${fillClass}`} cx="40" cy="40" r="34"
            strokeDasharray={CIRC_LG} strokeDashoffset={offset} />
        </svg>
        <span className="iv-gauge-value">{score}<small>/{max}</small></span>
      </div>
      <div className="iv-gauge-label">{label}</div>
    </div>
  );
};

const formatTime = (seconds) => {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
};

/* ── Pick Indian English TTS voice ───────────────────────────── */
const getIndianVoice = () => {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  // Prefer Indian English voices
  const indian = voices.find(
    (v) => v.lang === "en-IN" || v.lang.startsWith("en-IN")
  );
  if (indian) return indian;
  // Fallback: any "en" voice with "India" in name
  const indiaName = voices.find(
    (v) => /india/i.test(v.name) && v.lang.startsWith("en")
  );
  if (indiaName) return indiaName;
  // Fallback: any English voice
  return voices.find((v) => v.lang.startsWith("en")) || null;
};

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
const InterviewPage = () => {
  const navigate = useNavigate();
  const faceDetectorRef = useRef(null);
  const mpDetectorRef = useRef(null);
  const mpLoadingRef = useRef(false);
  const faceCanvasRef = useRef(null);
  const faceStatsRef = useRef({
    samples: 0,
    detected: 0,
    multi: 0,
    centerSum: 0,
    movementSum: 0,
    lastCenter: null,
  });
  /* ── Setup state ───────────────────────────────────────────── */
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  /* ── Call state ─────────────────────────────────────────────── */
  const [inCall, setInCall] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentDifficulty, setCurrentDifficulty] = useState("beginner");
  const [followUp, setFollowUp] = useState("");
  const [candidateAnswer, setCandidateAnswer] = useState("");
  const [history, setHistory] = useState([]);
  const [finalReport, setFinalReport] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cameraSignals, setCameraSignals] = useState({
    supported: false,
    samples: 0,
    detectedRate: 0,
    multiRate: 0,
    eyeContactApprox: 0,
    headStability: 0,
  });

  /* ── Media state ───────────────────────────────────────────── */
  const [cameraOn, setCameraOn] = useState(true);
  const [micMuted, setMicMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [aiStatus, setAiStatus] = useState("idle");
  const [timer, setTimer] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [manualInput, setManualInput] = useState("");
  const [voiceReady, setVoiceReady] = useState(false);

  /* ── Refs ───────────────────────────────────────────────────── */
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const speechBaseRef = useRef("");
  const currentAnswerRef = useRef("");
  const isSubmittingRef = useRef(false);
  const historyRef = useRef([]);
  const currentQuestionRef = useRef("");
  const resumeTextRef = useRef("");
  const currentDifficultyRef = useRef("beginner");
  const listeningIntentRef = useRef(false); // true when we WANT to be listening
  const inCallRef = useRef(false);

  const buildCameraSignals = (stats) => {
    const samples = stats.samples || 0;
    const detectedRate = samples ? stats.detected / samples : 0;
    const multiRate = samples ? stats.multi / samples : 0;
    const avgCenter = stats.detected ? stats.centerSum / stats.detected : 0;
    const avgMovement = stats.detected ? stats.movementSum / stats.detected : 0;
    const headStability = Math.max(0, 1 - avgMovement / 0.12);
    return {
      supported: Boolean(faceDetectorRef.current || mpDetectorRef.current),
      samples,
      detectedRate,
      multiRate,
      eyeContactApprox: avgCenter,
      headStability,
    };
  };

  const cameraSummary = useMemo(() => {
    if (!cameraSignals.supported || cameraSignals.samples === 0) return null;
    const presence = cameraSignals.detectedRate;
    const center = cameraSignals.eyeContactApprox;
    const stability = cameraSignals.headStability;
    const multiPenalty = Math.min(0.4, cameraSignals.multiRate);
    const score = Math.max(0, Math.min(1, presence * 0.5 + center * 0.3 + stability * 0.2 - multiPenalty));
    if (score >= 0.75) return { level: "good", label: "Strong presence" };
    if (score >= 0.5) return { level: "fair", label: "Fair presence" };
    return { level: "poor", label: "Needs improvement" };
  }, [cameraSignals]);

  const resetCameraSignals = useCallback(() => {
    faceStatsRef.current = {
      samples: 0,
      detected: 0,
      multi: 0,
      centerSum: 0,
      movementSum: 0,
      lastCenter: null,
    };
    setCameraSignals({
      supported: Boolean(faceDetectorRef.current || mpDetectorRef.current),
      samples: 0,
      detectedRate: 0,
      multiRate: 0,
      eyeContactApprox: 0,
      headStability: 0,
    });
  }, []);

  const loadMediapipeDetector = useCallback(async () => {
    if (mpDetectorRef.current || mpLoadingRef.current) return mpDetectorRef.current;
    mpLoadingRef.current = true;
    try {
      const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
      );
      const detector = await FaceDetector.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
        },
        runningMode: "IMAGE",
        minDetectionConfidence: 0.5,
      });
      mpDetectorRef.current = detector;
      return detector;
    } catch (err) {
      console.warn("MediaPipe detector init failed:", err);
      return null;
    } finally {
      mpLoadingRef.current = false;
    }
  }, []);

  // Keep refs in sync
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { currentQuestionRef.current = currentQuestion; }, [currentQuestion]);
  useEffect(() => { resumeTextRef.current = resumeText; }, [resumeText]);
  useEffect(() => { currentDifficultyRef.current = currentDifficulty; }, [currentDifficulty]);
  useEffect(() => { inCallRef.current = inCall; }, [inCall]);

  useEffect(() => {
    if (typeof window !== "undefined" && "FaceDetector" in window) {
      try {
        faceDetectorRef.current = new window.FaceDetector({
          fastMode: true,
          maxDetectedFaces: 3,
        });
      } catch {
        faceDetectorRef.current = null;
      }
    }
    resetCameraSignals();
  }, [resetCameraSignals]);

  useEffect(() => {
    if (!inCall || !cameraOn) return;
    if (faceDetectorRef.current || mpDetectorRef.current || mpLoadingRef.current) return;
    let active = true;
    const initFallback = async () => {
      const detector = await loadMediapipeDetector();
      if (!active || !detector) return;
      setCameraSignals((prev) => ({ ...prev, supported: true }));
    };
    initFallback();
    return () => {
      active = false;
    };
  }, [inCall, cameraOn, loadMediapipeDetector]);

  useEffect(() => {
    if (!inCall || !cameraOn) return;
    const detector = faceDetectorRef.current || mpDetectorRef.current;
    if (!detector) return;
    let active = true;
    if (!faceCanvasRef.current) {
      faceCanvasRef.current = document.createElement("canvas");
    }
    const canvas = faceCanvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const sample = async () => {
      if (!active) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(video, 0, 0, w, h);

      let faces = [];
      try {
        if (faceDetectorRef.current) {
          faces = await detector.detect(canvas);
        } else if (mpDetectorRef.current) {
          const result = mpDetectorRef.current.detect(canvas);
          const detections = result?.detections || [];
          faces = detections.map((d) => ({
            boundingBox: {
              x: d.boundingBox?.originX ?? 0,
              y: d.boundingBox?.originY ?? 0,
              width: d.boundingBox?.width ?? 0,
              height: d.boundingBox?.height ?? 0,
            },
          }));
        }
      } catch {
        return;
      }

      const stats = faceStatsRef.current;
      stats.samples += 1;

      if (faces.length > 0) {
        stats.detected += 1;
        if (faces.length > 1) stats.multi += 1;
        let largest = faces[0];
        let maxArea = 0;
        faces.forEach((face) => {
          const area = face.boundingBox.width * face.boundingBox.height;
          if (area > maxArea) {
            maxArea = area;
            largest = face;
          }
        });
        const cx = (largest.boundingBox.x + largest.boundingBox.width / 2) / w;
        const cy = (largest.boundingBox.y + largest.boundingBox.height / 2) / h;
        const dx = cx - 0.5;
        const dy = cy - 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const centerScore = Math.max(0, 1 - dist / 0.35);
        stats.centerSum += centerScore;
        if (stats.lastCenter) {
          const mx = cx - stats.lastCenter.x;
          const my = cy - stats.lastCenter.y;
          stats.movementSum += Math.sqrt(mx * mx + my * my);
        }
        stats.lastCenter = { x: cx, y: cy };
      }

      if (stats.samples % 10 === 0) {
        setCameraSignals(buildCameraSignals(stats));
      }
    };

    const interval = setInterval(sample, 900);
    sample();
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [inCall, cameraOn, cameraSignals.supported]);

  const speechSupport = useMemo(() => {
    const canSTT = typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    const canTTS = typeof window !== "undefined" &&
      typeof window.speechSynthesis !== "undefined";
    return { canSTT: Boolean(canSTT), canTTS: Boolean(canTTS) };
  }, []);

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { token } : {};
  }, []);

  // Wait for voices to load (needed for Indian accent)
  useEffect(() => {
    if (!speechSupport.canTTS) return;
    const handleVoicesChanged = () => setVoiceReady(true);
    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    // Some browsers load voices immediately
    if (window.speechSynthesis.getVoices().length > 0) setVoiceReady(true);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
    };
  }, [speechSupport.canTTS]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  /* ═══ CAMERA — FIX: attach stream after video element mounts ═ */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });
      streamRef.current = stream;
      return stream;
    } catch (err) {
      console.warn("Camera access denied:", err);
      setCameraOn(false);
      return null;
    }
  }, []);

  // Attach stream to video element whenever videoRef or stream changes
  useEffect(() => {
    if (inCall && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [inCall, cameraOn]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const toggleCamera = useCallback(() => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCameraOn(videoTrack.enabled);
    }
  }, []);

  /* ═══ SPEECH RECOGNITION ═══════════════════════════════════ */
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const handleAutoSubmit = useCallback(async () => {
    const answer = currentAnswerRef.current.trim();
    if (!answer || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    listeningIntentRef.current = false;
    setSubmitting(true);
    setAiStatus("thinking");
    setIsListening(false);

    try { recognitionRef.current?.stop(); } catch {}

    setTranscript((prev) => [...prev, { sender: "user", text: answer }]);

    try {
      const { data } = await axios.post(
        `${server}/api/interview/turn`,
        {
          resumeText: resumeTextRef.current,
          currentQuestion: currentQuestionRef.current,
          candidateAnswer: answer,
          history: historyRef.current,
        },
        { headers: authHeaders }
      );

      const completedTurn = {
        question: currentQuestionRef.current,
        answer,
        difficulty: currentDifficultyRef.current,
        evaluation: data?.evaluation || null,
        follow_up: data?.follow_up || "",
      };

      setHistory((prev) => [...prev, completedTurn]);
      setCandidateAnswer("");
      currentAnswerRef.current = "";
      setFollowUp(String(data?.follow_up || ""));

      if (data?.done) {
        setFinalReport(data?.finalReport || null);
        setCameraSignals(buildCameraSignals(faceStatsRef.current));
        setCurrentQuestion("");
        setAiStatus("idle");
        stopCamera();
        stopListening();
        if (data?.finalReport?.summary_message) {
          setTranscript((prev) => [...prev, { sender: "ai", text: data.finalReport.summary_message }]);
          speakOnly(data.finalReport.summary_message);
        }
      } else {
        const nextQ = String(data?.question || "");
        setCurrentQuestion(nextQ);
        setCurrentDifficulty(String(data?.difficulty || "intermediate"));
        setTranscript((prev) => [...prev, { sender: "ai", text: nextQ }]);
        speakAndListen(nextQ);
      }
    } catch (apiError) {
      console.error("Interview turn failed:", apiError);
      setTranscript((prev) => [...prev, { sender: "ai", text: "Sorry, something went wrong. Please try again or type your answer." }]);
      setAiStatus("listening");
      startListeningFn();
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  }, [authHeaders]);

  const startListeningFn = useCallback(() => {
    if (!recognitionRef.current) return;
    speechBaseRef.current = "";
    currentAnswerRef.current = "";
    setCandidateAnswer("");
    listeningIntentRef.current = true;
    setIsListening(true);
    setAiStatus("listening");
    try {
      recognitionRef.current.start();
    } catch {
      // Already started — ok
    }
  }, []);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    listeningIntentRef.current = false;
    setIsListening(false);
    try { recognitionRef.current?.stop(); } catch {}
  }, [clearSilenceTimer]);

  // Initialize speech recognition – FIX: auto-restart on end to prevent stalling
  useEffect(() => {
    if (!speechSupport.canSTT || !inCall) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN"; // Indian English for recognition

    recognition.onresult = (event) => {
      clearSilenceTimer();
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      const combined = `${speechBaseRef.current} ${finalTranscript} ${interimTranscript}`.trim();
      currentAnswerRef.current = combined;
      setCandidateAnswer(combined);

      if (finalTranscript) {
        speechBaseRef.current = `${speechBaseRef.current} ${finalTranscript}`.trim();
      }

      // Reset silence timer — auto-submit after SILENCE_TIMEOUT_MS of silence
      silenceTimerRef.current = setTimeout(() => {
        if (currentAnswerRef.current.trim().length > 5) {
          listeningIntentRef.current = false;
          try { recognitionRef.current?.stop(); } catch {}
          setIsListening(false);
          handleAutoSubmit();
        }
      }, SILENCE_TIMEOUT_MS);
    };

    recognition.onerror = (e) => {
      if (e.error !== "aborted" && e.error !== "no-speech") {
        console.warn("Speech recognition error:", e.error);
      }
    };

    // FIX: Auto-restart recognition when it ends if we still intend to listen
    recognition.onend = () => {
      if (listeningIntentRef.current && inCallRef.current && !isSubmittingRef.current) {
        // Browser stopped recognition (timeout/no-speech) — restart it
        setTimeout(() => {
          if (listeningIntentRef.current && inCallRef.current && !isSubmittingRef.current) {
            try {
              recognition.start();
            } catch {
              // Already running
            }
          }
        }, 200);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    return () => {
      clearSilenceTimer();
      listeningIntentRef.current = false;
      try { recognition.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, [speechSupport.canSTT, inCall, clearSilenceTimer, handleAutoSubmit]);

  /* ═══ TEXT-TO-SPEECH — Indian accent voice ═════════════════ */
  const speakOnly = useCallback((text) => {
    if (!speechSupport.canTTS || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1;
    utterance.lang = "en-IN";
    const indianVoice = getIndianVoice();
    if (indianVoice) utterance.voice = indianVoice;
    setIsSpeaking(true);
    setAiStatus("speaking");
    utterance.onend = () => { setIsSpeaking(false); setAiStatus("idle"); };
    utterance.onerror = () => { setIsSpeaking(false); setAiStatus("idle"); };
    window.speechSynthesis.speak(utterance);
  }, [speechSupport.canTTS]);

  const speakAndListen = useCallback((text) => {
    if (!speechSupport.canTTS || !text) {
      setTimeout(() => startListeningFn(), 300);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05; // slightly faster for snappier feel
    utterance.pitch = 1;
    utterance.lang = "en-IN"; // Indian English

    // Try to pick Indian voice
    const indianVoice = getIndianVoice();
    if (indianVoice) {
      utterance.voice = indianVoice;
    }

    setIsSpeaking(true);
    setAiStatus("speaking");

    utterance.onend = () => {
      setIsSpeaking(false);
      // After AI finishes speaking, immediately start listening (faster transition)
      setTimeout(() => startListeningFn(), 300);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setTimeout(() => startListeningFn(), 300);
    };
    window.speechSynthesis.speak(utterance);
  }, [speechSupport.canTTS, startListeningFn]);

  /* ═══ TIMER ════════════════════════════════════════════════ */
  useEffect(() => {
    if (inCall && !finalReport) {
      setTimer(0);
      timerIntervalRef.current = setInterval(() => setTimer((p) => p + 1), 1000);
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [inCall, finalReport]);

  /* ═══ FILE READER ══════════════════════════════════════════ */
  const readResumeFile = async (file) => {
    if (!file) return;
    const fileName = String(file.name || "");
    const isTextFile = file.type.startsWith("text/") || /\.(txt|md|json|csv)$/i.test(fileName);
    const isPdfFile = file.type === "application/pdf" || /\.pdf$/i.test(fileName);
    const isDocxFile = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || /\.docx$/i.test(fileName);
    if (!isTextFile && !isPdfFile && !isDocxFile) { setError("Upload TXT, PDF, or DOCX."); return; }
    setError(""); setResumeFileName(fileName); setResumeLoading(true);
    try {
      if (isTextFile) {
        const text = (await file.text()).trim();
        if (text.length < 50) { setError("Text too short."); return; }
        setResumeText(text); return;
      }
      if (isPdfFile) {
        let pdfjsLib;
        try { pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs"); }
        catch { try { pdfjsLib = await import("pdfjs-dist/build/pdf.mjs"); } catch { pdfjsLib = await import("pdfjs-dist"); } }
        const lib = pdfjsLib.default || pdfjsLib;
        if (lib.GlobalWorkerOptions) lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${lib.version}/pdf.worker.mjs`;
        const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        let combined = "";
        for (let p = 1; p <= pdf.numPages; p++) {
          const tc = await (await pdf.getPage(p)).getTextContent();
          combined += tc.items.map((i) => i?.str || "").join(" ") + "\n";
        }
        if (combined.trim().length < 50) { setError("Could not extract text from PDF."); return; }
        setResumeText(combined.trim()); return;
      }
      if (isDocxFile) {
        let mm;
        try { mm = await import("mammoth/mammoth.browser"); } catch { mm = await import("mammoth"); }
        const mammoth = mm?.default || mm;
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        const text = String(result?.value || "").trim();
        if (text.length < 50) { setError("Could not extract DOCX text."); return; }
        setResumeText(text);
      }
    } catch (err) {
      console.error("File read error:", err);
      setError("Unable to read file. Paste resume text instead.");
    } finally { setResumeLoading(false); }
  };

  /* ═══ START INTERVIEW ══════════════════════════════════════ */
  const startInterview = async () => {
    const clean = resumeText.trim();
    if (clean.length < 50) { setError("Resume must be at least 50 characters."); return; }
    setError(""); setLoading(true);
    try {
      // Start camera first, then transition to call
      await startCamera();
      const { data } = await axios.post(
        `${server}/api/interview/turn`,
        { resumeText: clean, history: [] },
        { headers: authHeaders }
      );
      const firstQ = String(data?.question || "");
      setHistory([]);
      setFinalReport(null);
      setCandidateAnswer("");
      currentAnswerRef.current = "";
      setCurrentQuestion(firstQ);
      setCurrentDifficulty(String(data?.difficulty || "beginner"));
      setFollowUp(String(data?.follow_up || ""));
      setTranscript([{ sender: "ai", text: firstQ }]);
      setAiStatus("speaking");
      setInCall(true); // Switch to call view — useEffect will attach camera

      // Speak first question after a brief render
      setTimeout(() => speakAndListen(firstQ), 400);
    } catch (apiError) {
      setError(apiError?.response?.data?.message || "Unable to start interview.");
      stopCamera();
    } finally { setLoading(false); }
  };

  /* ═══ END INTERVIEW ════════════════════════════════════════ */
  const endInterview = useCallback(async () => {
    stopListening();
    stopCamera();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    clearSilenceTimer();
    setAiStatus("thinking");
    if (historyRef.current.length > 0) {
      try {
        const { data } = await axios.post(
          `${server}/api/interview/turn`,
          {
            resumeText: resumeTextRef.current,
            currentQuestion: currentQuestionRef.current || "End interview",
            candidateAnswer: currentAnswerRef.current || "End interview requested",
            history: historyRef.current,
            forceEnd: true,
          },
          { headers: authHeaders }
        );
        if (data?.finalReport) {
          setFinalReport(data.finalReport);
          setCameraSignals(buildCameraSignals(faceStatsRef.current));
        }
      } catch {}
    }
    setAiStatus("idle");
  }, [authHeaders, stopListening, clearSilenceTimer]);

  /* ═══ RESET ════════════════════════════════════════════════ */
  const resetInterview = useCallback(() => {
    stopListening();
    stopCamera();
    clearSilenceTimer();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setInCall(false);
    setLoading(false); setSubmitting(false);
    setCurrentQuestion(""); setCurrentDifficulty("beginner");
    setCandidateAnswer(""); currentAnswerRef.current = "";
    setHistory([]); setFinalReport(null); setFollowUp("");
    setError(""); setTranscript([]); setTimer(0);
    setAiStatus("idle"); setIsListening(false); setIsSpeaking(false);
    resetCameraSignals();
  }, [stopListening, stopCamera, clearSilenceTimer]);

  /* ═══ MANUAL TEXT SUBMIT ═══════════════════════════════════ */
  const handleManualSubmit = () => {
    const text = manualInput.trim();
    if (!text || submitting) return;
    currentAnswerRef.current = text;
    setCandidateAnswer(text);
    setManualInput("");
    stopListening();
    handleAutoSubmit();
  };

  /* ═══ MIC TOGGLE ═══════════════════════════════════════════ */
  const toggleMic = useCallback(() => {
    if (micMuted) {
      setMicMuted(false);
      if (aiStatus === "listening") startListeningFn();
    } else {
      setMicMuted(true);
      stopListening();
    }
  }, [micMuted, aiStatus, startListeningFn, stopListening]);

  /* ═══ CLEANUP ══════════════════════════════════════════════ */
  useEffect(() => {
    return () => {
      inCallRef.current = false; // Prevents pending async start() calls
      stopCamera();
      clearSilenceTimer();
      listeningIntentRef.current = false;
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.onend = null; // Unbind to prevent auto-restart loop
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, [stopCamera, clearSilenceTimer]);

  const isDone = Boolean(finalReport);
  const questionNumber = history.length + (isDone ? 0 : 1);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  /* ── SETUP PHASE ───────────────────────────────────────────── */
  if (!inCall) {
    return (
      <div className="iv-page">
        <div className="iv-setup-content">
          <div className="iv-header">
            <div className="iv-header-badge"><FaRobot /> AI-Powered</div>
            <h1>Mock Interview</h1>
            <p>Upload your resume and start a real-time AI conversation — just like a video interview.</p>
          </div>
          <section className="iv-glass">
            <div className={`iv-upload-zone ${dragOver ? "iv-drag-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); readResumeFile(e.dataTransfer?.files?.[0]); }}
              onClick={() => document.getElementById("iv-resume-file")?.click()}>
              <input id="iv-resume-file" type="file"
                accept=".txt,.md,.json,.csv,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => readResumeFile(e.target.files?.[0])} />
              <FaCloudUploadAlt className="iv-upload-icon" />
              <p><span className="iv-upload-cta">Click to upload</span> or drag & drop your resume</p>
              <p style={{ fontSize: "0.78rem", marginTop: 4 }}>Supports PDF, DOCX, TXT</p>
              {resumeFileName && <span className="iv-file-tag"><FaFileAlt /> {resumeFileName}</span>}
            </div>
            <textarea className="iv-textarea" value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Or paste your resume text here..." rows={8} />
            <div className="iv-meta"><span>{resumeText.trim().length} characters</span></div>
            <div className="iv-actions">
              <button type="button" className="iv-btn-primary" onClick={startInterview}
                disabled={loading || resumeLoading}>
                <FaVideo />
                {resumeLoading ? "Reading file..." : loading ? "Starting..." : "Begin Interview"}
              </button>
            </div>
            {error && <div className="iv-error">{error}</div>}
            {!speechSupport.canSTT && (
              <div className="iv-error" style={{ background: "rgba(251, 191, 36, 0.1)", borderColor: "rgba(251, 191, 36, 0.3)", color: "#fbbf24" }}>
                ⚠️ Voice input not supported. Use Chrome/Edge for full voice. You can still type answers.
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  /* ── VIDEO-CALL PHASE ──────────────────────────────────────── */
  return (
    <div className="iv-call">
      <div className="iv-call-topbar">
        <span className="iv-call-title"><FaRobot /> AI Mock Interview</span>
        <div className="iv-rec-badge"><span className="iv-rec-dot" /> REC</div>
        <div className="iv-call-topbar-right">
          <span className="iv-timer">{formatTime(timer)}</span>
          <button className="iv-end-btn" onClick={endInterview} disabled={submitting}>
            <FaPhoneSlash /> End Interview
          </button>
        </div>
      </div>

      <div className="iv-call-body">
        {/* AI Panel */}
        <div className="iv-panel iv-ai-panel">
          <span className="iv-q-badge">Q{questionNumber} / {TARGET_QUESTIONS}</span>
          <span className={`iv-difficulty-call ${currentDifficulty}`}>{currentDifficulty}</span>
          <div className="iv-avatar-wrap">
            <div style={{ position: "relative" }}>
              <div className={`iv-avatar-ring ${isSpeaking ? "iv-speaking" : ""}`} />
              <div className="iv-avatar-circle" style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)", fontWeight: 800, color: "#fff" }}>
                S
              </div>
            </div>
            <div className={`iv-ai-bars ${isSpeaking ? "iv-active" : ""}`}>
              <span /><span /><span /><span /><span />
            </div>
            <span className="iv-ai-label">Sarah</span>
            <span className={`iv-ai-status ${
              aiStatus === "speaking" ? "iv-status-speaking" :
              aiStatus === "listening" ? "iv-status-listening" :
              aiStatus === "thinking" ? "iv-status-thinking" : ""
            }`}>
              {aiStatus === "speaking" ? "🔊 Speaking..." :
               aiStatus === "listening" ? "🎙️ Listening to you..." :
               aiStatus === "thinking" ? "🤔 Evaluating..." : "Ready"}
            </span>
          </div>
        </div>

        {/* User Panel — FIX: re-attach stream on mount */}
        <div className="iv-panel iv-user-panel">
          {cameraOn ? (
            <video
              ref={(el) => {
                videoRef.current = el;
                // Attach stream immediately when ref is available
                if (el && streamRef.current && !el.srcObject) {
                  el.srcObject = streamRef.current;
                }
              }}
              className="iv-user-video"
              autoPlay
              muted
              playsInline
            />
          ) : (
            <div className="iv-no-camera">
              <FaUserCircle />
              <span>Camera off</span>
            </div>
          )}
          <span className="iv-user-label">You</span>
        </div>
      </div>

      <div className="iv-controls">
        <button className={`iv-ctrl-btn ${micMuted ? "iv-muted" : ""} ${isListening && !micMuted ? "iv-listening-active" : ""}`}
          onClick={toggleMic} title={micMuted ? "Unmute" : "Mute"}>
          {micMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
        </button>
        <button className={`iv-ctrl-btn ${!cameraOn ? "iv-muted" : ""}`}
          onClick={toggleCamera} title={cameraOn ? "Turn off camera" : "Turn on camera"}>
          {cameraOn ? <FaVideo /> : <FaVideoSlash />}
        </button>
      </div>

      <div className="iv-transcript">
        {transcript.map((msg, i) => (
          <div key={i} className={`iv-transcript-line ${msg.sender === "ai" ? "iv-ai-msg" : "iv-user-msg"}`}>
            <span className={`iv-transcript-sender ${msg.sender === "ai" ? "iv-sender-ai" : "iv-sender-user"}`}>
              {msg.sender === "ai" ? "Sarah:" : "You:"}
            </span>
            {msg.text}
          </div>
        ))}
        {isListening && candidateAnswer && (
          <div className="iv-transcript-line iv-user-msg">
            <span className="iv-transcript-sender iv-sender-user">You:</span>
            {candidateAnswer}
            <span className="iv-live-indicator"><span className="iv-live-dot" /> speaking</span>
          </div>
        )}
        <div ref={transcriptEndRef} />
      </div>

      <div className="iv-manual-input">
        <input value={manualInput} onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleManualSubmit(); }}
          placeholder={isListening ? "Or type your answer here..." : "Type your answer and press Enter..."}
          disabled={submitting} />
        <button className="iv-manual-send" onClick={handleManualSubmit} disabled={submitting || !manualInput.trim()}>
          Send
        </button>
      </div>

      {isDone && finalReport && (
          <div className="iv-report-overlay">
            <div className="iv-report-card">
              <h2 className="iv-report-title"><FaClipboardCheck /> Interview Performance Report</h2>
              <p className="iv-report-note">
                Scores are based on your transcript and answer detail. Camera signals below are approximate and not used in scoring.
              </p>
              <div className="iv-camera-metrics">
                <h3><FaVideo /> Camera Signals (Beta)</h3>
                {cameraSignals.supported ? (
                  cameraSignals.samples > 0 ? (
                    <ul className="iv-camera-list">
                      <li>Face detected: {Math.round(cameraSignals.detectedRate * 100)}%</li>
                      <li>Eye contact (approx): {Math.round(cameraSignals.eyeContactApprox * 100)}%</li>
                      <li>Head stability: {Math.round(cameraSignals.headStability * 100)}%</li>
                      <li>Multiple faces: {Math.round(cameraSignals.multiRate * 100)}%</li>
                    </ul>
                  ) : (
                    <p className="iv-camera-note">No camera samples captured during this interview.</p>
                  )
                ) : (
                  <p className="iv-camera-note">Camera analysis is not supported in this browser.</p>
                )}
                {cameraSummary && (
                  <div className="iv-camera-summary">
                    Camera presence:
                    <span className={`iv-camera-pill ${cameraSummary.level}`}>{cameraSummary.label}</span>
                  </div>
                )}
              </div>
              <div className="iv-gauges">
              <GaugeChart score={finalReport.technical_score || 0} label="Technical" fillClass="iv-fill-tech" />
              <GaugeChart score={finalReport.communication_score || 0} label="Communication" fillClass="iv-fill-comm" />
              <GaugeChart score={finalReport.confidence_score || 0} label="Confidence" fillClass="iv-fill-conf" />
            </div>
            <div className="iv-report-grid">
              <div className="iv-report-list-card">
                <h3 className="iv-strengths-title"><FaCheckCircle /> Strengths</h3>
                <ul>{(finalReport.strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
              <div className="iv-report-list-card">
                <h3 className="iv-weak-title"><FaExclamationTriangle /> Areas to Improve</h3>
                <ul>{(finalReport.weak_topics || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
              <div className="iv-report-list-card">
                <h3 className="iv-rec-title"><FaLightbulb /> Recommendations</h3>
                <ul>{(finalReport.recommendations || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            </div>
            <div className="iv-actions">
              <button type="button" className="iv-btn-secondary" onClick={() => navigate("/")}>
                <FaHome /> Home
              </button>
              <button type="button" className="iv-btn-secondary" onClick={() => navigate("/progress")}>
                <FaChartLine /> Progress
              </button>
              <button type="button" className="iv-btn-primary" onClick={resetInterview}>
                <FaRobot /> Start New Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewPage;
