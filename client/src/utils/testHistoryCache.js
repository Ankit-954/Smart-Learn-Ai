import axios from "axios";
import API from "../utils/api.js";
const server = API.defaults.baseURL;

const cache = {
  data: null,
  timestamp: 0,
  promise: null,
};

const readLocalTests = () => {
  try {
    const localTests = JSON.parse(localStorage.getItem("testHistory") || "[]");
    return Array.isArray(localTests) ? localTests : [];
  } catch (error) {
    return [];
  }
};

export const getTestHistory = async ({ token, ttlMs = 60000, force = false } = {}) => {
  if (!token) {
    throw new Error("Please login to view your activity.");
  }

  const now = Date.now();
  if (!force && cache.data && now - cache.timestamp < ttlMs) {
    return cache.data;
  }

  if (cache.promise) {
    return cache.promise;
  }

  cache.promise = (async () => {
    try {
      const testHistoryRes = await axios.get(`${server}/api/user/test-history`, {
        headers: { token },
      });
      const serverTests = Array.isArray(testHistoryRes?.data?.attempts)
        ? testHistoryRes.data.attempts
        : [];

      cache.data = serverTests;
      cache.timestamp = Date.now();
      return serverTests;
    } catch (error) {
      const localTests = readLocalTests();
      if (cache.data && cache.data.length) {
        return cache.data;
      }
      if (localTests.length) {
        return localTests;
      }
      if (error?.response?.status === 429) {
        return [];
      }
      throw error;
    } finally {
      cache.promise = null;
    }
  })();

  return cache.promise;
};
