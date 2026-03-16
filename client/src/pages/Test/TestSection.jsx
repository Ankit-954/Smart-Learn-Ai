import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import './TestSection.css';
import { server } from '../../main';

const pendingQuestionRequests = new Map();
const TOTAL_QUESTIONS = 10;
const QUESTIONS_PER_DIFFICULTY = 6;
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

const getDifficultyOrder = (preferred) => {
  if (preferred === 'hard') return ['hard', 'medium', 'easy'];
  if (preferred === 'easy') return ['easy', 'medium', 'hard'];
  return ['medium', 'hard', 'easy'];
};

const getNextDifficulty = (currentDifficulty, isCorrect) => {
  if (isCorrect && currentDifficulty === 'easy') return 'medium';
  if (isCorrect && currentDifficulty === 'medium') return 'hard';
  if (!isCorrect && currentDifficulty === 'hard') return 'medium';
  if (!isCorrect && currentDifficulty === 'medium') return 'easy';
  return currentDifficulty;
};

const takeUniqueQuestion = (preferredDifficulty, pools, usedQuestionKeys) => {
  const nextPools = {
    easy: [...(pools.easy || [])],
    medium: [...(pools.medium || [])],
    hard: [...(pools.hard || [])],
  };
  const nextUsed = new Set(usedQuestionKeys);

  for (const difficulty of getDifficultyOrder(preferredDifficulty)) {
    const list = nextPools[difficulty];
    const idx = list.findIndex((q) => {
      const key = String(q?.question || '').trim().toLowerCase();
      return key && !nextUsed.has(key);
    });

    if (idx >= 0) {
      const question = list[idx];
      list.splice(idx, 1);
      nextUsed.add(String(question.question).trim().toLowerCase());
      return {
        question: { ...question, difficulty: question.difficulty || difficulty, topic: question.topic || 'General Concepts' },
        updatedPools: nextPools,
        updatedUsedKeys: nextUsed,
        selectedDifficulty: difficulty,
      };
    }
  }

  return null;
};

const persistTestAttempt = async ({ domain, score, totalQuestions }) => {
  try {
    const safeTotal = Number(totalQuestions) || 0;
    const safeScore = Number(score) || 0;
    const percentage = safeTotal > 0 ? Number(((safeScore / safeTotal) * 100).toFixed(2)) : 0;
    const attempt = {
      id: `${Date.now()}-${Math.random()}`,
      domain,
      score: safeScore,
      totalQuestions: safeTotal,
      percentage,
      completedAt: new Date().toISOString(),
    };

    const token = localStorage.getItem('token');
    if (token) {
      await fetch(`${server}/api/user/test-history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token,
        },
        body: JSON.stringify(attempt),
      });
    }

    const existing = JSON.parse(localStorage.getItem('testHistory') || '[]');
    const history = Array.isArray(existing) ? existing : [];
    history.push(attempt);
    localStorage.setItem('testHistory', JSON.stringify(history.slice(-100)));
  } catch (err) {
    // Ignore localStorage errors
  }
};

const TestSection = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { domainName } = location.state || {};
  const domain = domainName || 'Domain';

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [testCompleted, setTestCompleted] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState([]);
  const [fullscreenReady, setFullscreenReady] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [currentDifficulty, setCurrentDifficulty] = useState('medium');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [sessionSeed, setSessionSeed] = useState(() => `${Date.now()}-${Math.random()}`);
  const questionPoolsRef = useRef({ easy: [], medium: [], hard: [] });
  const usedQuestionKeysRef = useRef(new Set());
  const attemptSavedRef = useRef(false);

  const requestFullscreenMode = async () => {
    const element = document.documentElement;

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
      setFullscreenReady(true);
    } catch (err) {
      alert('Please allow fullscreen mode to continue the test.');
    }
  };

  const generateQuestions = async (domain, difficulty, sessionId, numQuestions = QUESTIONS_PER_DIFFICULTY, retries = 5, delay = 1000) => {
    try {
      const response = await fetch(`${server}/api/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, numQuestions, difficulty, fresh: true, sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429 && retries > 0) {
          console.warn(`Rate limit exceeded. Retrying in ${delay / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return generateQuestions(domain, difficulty, sessionId, numQuestions, retries - 1, delay * 2);
        }

        throw new Error(errorData.details || errorData.error || `Failed to generate questions (${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error('Question generation failed:', error);
      throw error;
    }
  };

  const getOrCreateQuestionsRequest = (domain, difficulty, sessionId, numQuestions = QUESTIONS_PER_DIFFICULTY) => {
    const requestKey = `${domain}-${difficulty}-${numQuestions}-${sessionId}`;

    if (pendingQuestionRequests.has(requestKey)) {
      return pendingQuestionRequests.get(requestKey);
    }

    const requestPromise = generateQuestions(domain, difficulty, sessionId, numQuestions).finally(() => {
      pendingQuestionRequests.delete(requestKey);
    });

    pendingQuestionRequests.set(requestKey, requestPromise);
    return requestPromise;
  };

  useEffect(() => {
    let isActive = true;

    const fetchQuestions = async () => {
      try {
        setLoading(true);
        setError(null);
        setAiFeedback(null);

        const [easyData, mediumData, hardData] = await Promise.all([
          getOrCreateQuestionsRequest(domain, 'easy', sessionSeed),
          getOrCreateQuestionsRequest(domain, 'medium', sessionSeed),
          getOrCreateQuestionsRequest(domain, 'hard', sessionSeed),
        ]);

        const rawPools = {
          easy: Array.isArray(easyData?.questions) ? easyData.questions : [],
          medium: Array.isArray(mediumData?.questions) ? mediumData.questions : [],
          hard: Array.isArray(hardData?.questions) ? hardData.questions : [],
        };

        const seen = new Set();
        const normalizedPools = { easy: [], medium: [], hard: [] };
        for (const level of DIFFICULTY_LEVELS) {
          for (const q of rawPools[level]) {
            const questionText = String(q?.question || '').trim();
            const questionKey = questionText.toLowerCase();
            if (!questionText || seen.has(questionKey)) continue;

            seen.add(questionKey);
            normalizedPools[level].push({
              ...q,
              question: questionText,
              difficulty: q?.difficulty || level,
              topic: q?.topic || 'General Concepts',
            });
          }
        }

        const firstPick = takeUniqueQuestion('medium', normalizedPools, new Set());
        if (!firstPick) {
          throw new Error('Unable to prepare unique questions for this test');
        }

        if (!isActive) return;
        questionPoolsRef.current = firstPick.updatedPools;
        usedQuestionKeysRef.current = firstPick.updatedUsedKeys;
        setQuestions([firstPick.question]);
        setCurrentQuestionIndex(0);
        setCurrentDifficulty(firstPick.selectedDifficulty);
        setScore(0);
        setUserAnswers([]);
        setSelectedOption(null);
        setTestCompleted(false);
        setTimeLeft(60);
        setError(null);
      } catch (err) {
        if (!isActive) return;
        if (err.message.includes('quota') || err.message.includes('429')) {
          setError('Rate limit exceeded. Please try again later.');
        } else {
          setError(err.message);
        }
      } finally {
        if (!isActive) return;
        setLoading(false);
      }
    };

    fetchQuestions();

    return () => {
      isActive = false;
    };
  }, [domain, sessionSeed]);

  // Timer effect
  useEffect(() => {
    if (testCompleted || loading || error || !questions.length) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTestCompleted(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [testCompleted, loading, error, questions.length]);

  useEffect(() => {
    if (loading || error || testCompleted || !questions.length) return;

    const warningMessage =
      'Warning: Leaving test screen is not allowed during assessment.';

    const pushWarning = () => {
      setWarningCount((prev) => prev + 1);
      alert(warningMessage);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pushWarning();
      }
    };

    const handleWindowBlur = () => {
      pushWarning();
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenReady(false);
        pushWarning();
      }
    };

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [loading, error, testCompleted, questions.length]);

  useEffect(() => {
    if (!testCompleted) return;
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen();
    }
  }, [testCompleted]);

  useEffect(() => {
    if (!testCompleted || attemptSavedRef.current) return;
    persistTestAttempt({ domain, score, totalQuestions: TOTAL_QUESTIONS });
    attemptSavedRef.current = true;
  }, [testCompleted, domain, score]);

  useEffect(() => {
    if (!testCompleted || !userAnswers.length) return;
    let isActive = true;

    const getFeedback = async () => {
      try {
        setFeedbackLoading(true);
        const response = await fetch(`${server}/api/analyze-test-performance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain,
            score,
            totalQuestions: TOTAL_QUESTIONS,
            answers: userAnswers.filter(Boolean),
          }),
        });

        const data = await response.json();
        if (!isActive) return;
        setAiFeedback(data?.analysis || null);
      } catch (err) {
        if (!isActive) return;
        setAiFeedback(null);
      } finally {
        if (!isActive) return;
        setFeedbackLoading(false);
      }
    };

    getFeedback();

    return () => {
      isActive = false;
    };
  }, [testCompleted, userAnswers, domain, score]);

  const handleAnswerSubmit = () => {
    if (selectedOption === null) {
      alert('Please select an answer');
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedOption === currentQuestion.correctAnswer;

    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = {
      questionIndex: currentQuestionIndex,
      question: currentQuestion.question,
      selectedAnswer: selectedOption,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect,
      difficulty: currentQuestion.difficulty || currentDifficulty,
      topic: currentQuestion.topic || 'General Concepts',
    };
    setUserAnswers(newAnswers);

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= TOTAL_QUESTIONS) {
      setTestCompleted(true);
      return;
    }

    const preferredDifficulty = getNextDifficulty(currentDifficulty, isCorrect);
    const nextPick = takeUniqueQuestion(
      preferredDifficulty,
      questionPoolsRef.current,
      usedQuestionKeysRef.current
    );

    if (!nextPick) {
      setTestCompleted(true);
      return;
    }

    questionPoolsRef.current = nextPick.updatedPools;
    usedQuestionKeysRef.current = nextPick.updatedUsedKeys;
    setCurrentDifficulty(nextPick.selectedDifficulty);
    setQuestions((prev) => [...prev, nextPick.question]);
    setCurrentQuestionIndex(nextIndex);
    setSelectedOption(null);
  };

  const handleRestartTest = () => {
    questionPoolsRef.current = { easy: [], medium: [], hard: [] };
    usedQuestionKeysRef.current = new Set();
    setCurrentQuestionIndex(0);
    setScore(0);
    setTestCompleted(false);
    setSelectedOption(null);
    setTimeLeft(60);
    setUserAnswers([]);
    setFullscreenReady(false);
    setWarningCount(0);
    setCurrentDifficulty('medium');
    setAiFeedback(null);
    setFeedbackLoading(false);
    setSessionSeed(`${Date.now()}-${Math.random()}`);
    attemptSavedRef.current = false;
  };

  const saveCurrentSelectionIfNeeded = () => {
    if (selectedOption === null || userAnswers[currentQuestionIndex]) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedOption === currentQuestion.correctAnswer;

    setUserAnswers((prev) => {
      const next = [...prev];
      next[currentQuestionIndex] = {
        questionIndex: currentQuestionIndex,
        question: currentQuestion.question,
        selectedAnswer: selectedOption,
        correctAnswer: currentQuestion.correctAnswer,
        isCorrect,
        difficulty: currentQuestion.difficulty || currentDifficulty,
        topic: currentQuestion.topic || 'General Concepts',
      };
      return next;
    });

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
  };

  const handleSubmitNow = () => {
    if (!window.confirm('Submit test now?')) return;
    saveCurrentSelectionIfNeeded();
    setTestCompleted(true);
  };

  const handleExitTest = () => {
    if (!window.confirm('Exit test now? Unsaved progress will be lost.')) return;
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen();
    }
    navigate('/test');
  };

  if (testCompleted) {
    return (
      <Result
        score={score}
        totalQuestions={TOTAL_QUESTIONS}
        onRestart={handleRestartTest}
        domain={domain}
        analysis={aiFeedback}
        analysisLoading={feedbackLoading}
      />
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Generating questions for {domain}...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progressPercent = ((currentQuestionIndex + 1) / TOTAL_QUESTIONS) * 100;

  return (
    <div className="test-page">
      {!fullscreenReady && (
        <div className="fullscreen-gate">
          <h3>Fullscreen Mode Required</h3>
          <p>Start the test in fullscreen for secure assessment.</p>
          <button onClick={requestFullscreenMode} className="enter-fullscreen-btn">
            Enter Fullscreen & Start
          </button>
        </div>
      )}
      <div className="test-section">
        <div className="test-header">
          <p className="test-kicker">Skill Assessment</p>
          <h2>{domain} Test</h2>
          <div className="test-meta-row">
            <div className={`timer ${timeLeft <= 15 ? 'timer-danger' : ''}`}>
              Time Left: {timeLeft}s
            </div>
            <div className="test-progress-label">
              Question {currentQuestionIndex + 1} of {TOTAL_QUESTIONS}
            </div>
          </div>
          <div className="test-progress-track">
            <span style={{ width: `${progressPercent}%` }}></span>
          </div>
          <p className="test-progress-label">Current difficulty: {currentDifficulty}</p>
          {warningCount > 0 && (
            <p className="warning-note">Warnings: {warningCount}</p>
          )}
          <div className="test-top-actions">
            <button onClick={handleExitTest} className="exit-test-btn">
              Exit Test
            </button>
            <button onClick={handleSubmitNow} className="submit-now-btn">
              Submit Now
            </button>
          </div>
        </div>
        <Question
          question={currentQuestion}
          selectedOption={selectedOption}
          onOptionSelect={setSelectedOption}
        />
        <button onClick={handleAnswerSubmit} className="next-btn">
          {currentQuestionIndex === TOTAL_QUESTIONS - 1 ? 'Submit Test' : 'Next Question'}
        </button>
      </div>
    </div>
  );
};

// Result Component
const Result = ({ score, totalQuestions, onRestart, domain, analysis, analysisLoading }) => {
  const percentage = ((score / totalQuestions) * 100).toFixed(2);
  const numericPercentage = Number(percentage);
  const performanceTone =
    numericPercentage >= 80 ? "Strong" : numericPercentage >= 50 ? "Improving" : "Needs Focus";
  const shareText = `I scored ${score}/${totalQuestions} (${percentage}%) in the ${domain} test on SmartLearn AI.`;
  const shareUrl = window.location.origin;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(shareUrl);

  const handleShare = (platform) => {
    let url = "";
    if (platform === "linkedin") {
      url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    } else if (platform === "whatsapp") {
      url = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
    } else if (platform === "twitter") {
      url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    } else if (platform === "instagram") {
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      alert("Result copied. Paste it in your Instagram post/story.");
      url = "https://www.instagram.com/";
    }

    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="test-page">
      <div className="result-container">
        <h2>Test Completed!</h2>
        <div className="score-display">
          <h3>Your Score: {score} / {totalQuestions}</h3>
          <p>Percentage: {percentage}%</p>
        </div>
        <div className="result-actions">
          <button onClick={onRestart} className="restart-btn">
            Restart Test
          </button>
          <button onClick={() => window.history.back()} className="back-btn">
            Back to Domains
          </button>
        </div>
        <div className="result-analysis">
          <div className="result-analysis-head">
            <h4>AI Performance Analysis</h4>
            <span className={`analysis-badge tone-${performanceTone.toLowerCase().replace(" ", "-")}`}>
              {performanceTone}
            </span>
          </div>
          {analysisLoading && <p className="analysis-loading">Analyzing your weak areas...</p>}
          {!analysisLoading && analysis && (
            <>
              <div className="analysis-panel">
                <p className="analysis-label">Summary</p>
                <p className="analysis-text">{analysis.summary}</p>
              </div>
              {Array.isArray(analysis.focusAreas) && analysis.focusAreas.length > 0 && (
                <ul className="analysis-focus-list">
                  {analysis.focusAreas.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              )}
              <div className="analysis-panel plan-panel">
                <p className="analysis-label">Practice Plan</p>
                <p className="analysis-text">{analysis.practicePlan}</p>
              </div>
            </>
          )}
          {!analysisLoading && !analysis && (
            <p className="analysis-loading">Analysis unavailable right now. Retry the test for fresh feedback.</p>
          )}
        </div>
        <div className="share-result-block">
          <p>Share your result</p>
          <div className="share-buttons">
            <button onClick={() => handleShare("linkedin")} className="share-btn linkedin-btn">
              LinkedIn
            </button>
            <button onClick={() => handleShare("whatsapp")} className="share-btn whatsapp-btn">
              WhatsApp
            </button>
            <button onClick={() => handleShare("instagram")} className="share-btn instagram-btn">
              Instagram
            </button>
            <button onClick={() => handleShare("twitter")} className="share-btn twitter-btn">
              Twitter/X
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Updated Question Component
const Question = ({ question, selectedOption, onOptionSelect }) => {
  return (
    <div className="question-container">
      <h3>{question.question}</h3>
      <ul className="options-list">
        {question.options.map((option, index) => (
          <li key={index}>
            <label>
              <input
                type="radio"
                name="option"
                value={option}
                checked={selectedOption === option}
                onChange={() => onOptionSelect(option)}
              />
              <span className="option-text">{option}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TestSection;
