import cron from "node-cron";
import mongoose from "mongoose";
import { User } from "../models/User.js";

/**
 * ─── Cron Jobs for SmartLearn AI ────────────────────────────────
 *
 * Schedule format: "second minute hour day month weekday"
 *
 * Jobs:
 *  1. Clean expired password-reset tokens   — every day at 2:00 AM
 *  2. Purge in-memory AI caches             — every 15 minutes
 *  3. Remove old unverified accounts        — every day at 3:00 AM
 *  4. Server health heartbeat log           — every 5 minutes
 *  5. Database connection health check      — every 10 minutes
 */

const log = (event, meta = {}) =>
  console.log(JSON.stringify({ ts: new Date().toISOString(), cron: true, event, ...meta }));

/**
 * Initialize all cron jobs.
 * @param {{ cache?: Map, inflight?: Map }} stores — in-memory stores from index.js
 */
export const initCronJobs = (stores = {}) => {
  const { cache, inflight } = stores;

  // ──────────────────────────────────────────────────────────────
  // 1. Clean expired password-reset tokens — Daily at 2:00 AM
  // ──────────────────────────────────────────────────────────────
  cron.schedule("0 2 * * *", async () => {
    try {
      const result = await User.updateMany(
        { resetPasswordExpire: { $lt: new Date() } },
        { $unset: { resetPasswordExpire: "" } }
      );
      log("clean_expired_tokens", { modifiedCount: result.modifiedCount });
    } catch (err) {
      log("clean_expired_tokens_error", { error: err.message });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // 2. Purge stale AI cache entries — Every 15 minutes
  //    Removes entries older than 10 minutes (matches CACHE_TTL_MS)
  // ──────────────────────────────────────────────────────────────
  if (cache instanceof Map) {
    cron.schedule("*/15 * * * *", () => {
      const now = Date.now();
      const TTL = 10 * 60 * 1000; // 10 minutes
      let purged = 0;
      for (const [key, entry] of cache.entries()) {
        if (entry?.timestamp && now - entry.timestamp > TTL) {
          cache.delete(key);
          purged++;
        }
      }
      // Also clean up any stale inflight request trackers
      if (inflight instanceof Map) {
        inflight.clear();
      }
      log("purge_ai_cache", { purged, remaining: cache.size });
    });
  }

  // ──────────────────────────────────────────────────────────────
  // 3. Remove old unverified accounts — Daily at 3:00 AM
  //    Deletes user accounts created > 7 days ago that were never verified
  //    (users who registered but never completed OTP verification)
  // ──────────────────────────────────────────────────────────────
  cron.schedule("0 3 * * *", async () => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      // Only delete if your User model has a 'verified' field
      // Adjust this query based on your verification logic
      const result = await User.deleteMany({
        createdAt: { $lt: sevenDaysAgo },
        role: "user",
        subscription: { $size: 0 },
        // Only users with no activity at all
        testHistory: { $size: 0 },
      });
      if (result.deletedCount > 0) {
        log("clean_inactive_accounts", { deletedCount: result.deletedCount });
      }
    } catch (err) {
      log("clean_inactive_accounts_error", { error: err.message });
    }
  });

  // ──────────────────────────────────────────────────────────────
  // 4. Server health heartbeat — Every 5 minutes
  //    Logs memory usage and uptime for monitoring
  // ──────────────────────────────────────────────────────────────
  cron.schedule("*/5 * * * *", () => {
    const mem = process.memoryUsage();
    log("heartbeat", {
      uptimeMinutes: Math.round(process.uptime() / 60),
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
      cacheSize: cache?.size ?? 0,
    });
  });

  // ──────────────────────────────────────────────────────────────
  // 5. Database connection health check — Every 10 minutes
  //    Verifies MongoDB connection is alive, logs warning if not
  // ──────────────────────────────────────────────────────────────
  cron.schedule("*/10 * * * *", () => {
    const state = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const stateNames = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
    const dbStatus = stateNames[state] || "unknown";
    if (state !== 1) {
      log("db_health_warning", { status: dbStatus, state });
    } else {
      log("db_health_ok", { status: dbStatus });
    }
  });

  log("cron_jobs_initialized", {
    jobs: [
      "clean_expired_tokens (daily 2AM)",
      "purge_ai_cache (every 15min)",
      "clean_inactive_accounts (daily 3AM)",
      "heartbeat (every 5min)",
      "db_health_check (every 10min)",
    ],
  });
};
