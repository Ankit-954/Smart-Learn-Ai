import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API from '../../utils/api.js';
const server = API.defaults.baseURL;
import './TestDomain.css';

const DomainSelection = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const { data } = await axios.get(`${server}/api/domains`);
        setDomains(Array.isArray(data?.domains) ? data.domains : []);
        setLoading(false);
      } catch (err) {
        setError('Failed to load domains');
        setLoading(false);
      }
    };

    fetchDomains();
  }, []);

  const handleStartTest = (domainId, domainName) => {
    navigate(`/test/${domainId}`, { 
      state: { 
        domainName,
        // Add additional metadata if needed
      }
    });
  };

  if (loading) {
    return (
      <div className="domain-loading-state">
        <div className="domain-spinner"></div>
        Loading domains...
      </div>
    );
  }

  if (error) {
    return (
      <div className="domain-error-state">
        <p>{error}</p>
        <button className="retry-domain-btn" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="domain-selection-container">
      <div className="domain-head">
        <h1>Choose a Domain to Test Your Skills</h1>
        <p>Pick one focus area and start a fast, practical skill assessment.</p>
      </div>
      <div className="domain-grid">
        {domains.map((domain) => (
          <div
            key={domain.id}
            className="domain-card"
            role="button"
            tabIndex={0}
            onClick={() => handleStartTest(domain.id, domain.name)}
            onKeyDown={(e) => e.key === 'Enter' && handleStartTest(domain.id, domain.name)}
            aria-label={`Start ${domain.name} test`}
          >
            <h3>{domain.name}</h3>
            <p>Timed MCQ assessment</p>
            <button 
              className="start-test-button"
              aria-label={`Start ${domain.name} test`}
            >
              Start Test
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DomainSelection;
