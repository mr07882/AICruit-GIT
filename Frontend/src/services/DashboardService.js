import { apiFetch } from './AuthService';

// Simple in-memory cache with TTL to avoid repeat network calls during a user session
const _cache = new Map();
const setCache = (key, value, ttlMs = 60_000) => {
  const expires = Date.now() + ttlMs;
  _cache.set(key, { value, expires });
};
const getCache = (key) => {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    _cache.delete(key);
    return null;
  }
  return entry.value;
};

const clearCacheByPrefix = (prefix) => {
  for (const key of Array.from(_cache.keys())) {
    if (String(key).startsWith(prefix)) _cache.delete(key);
  }
};

// Utility to run Promise-returning tasks in batches to limit concurrency
const batchExec = async (items, fn, batchSize = 8) => {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    // run batch in parallel
    // fn should return a promise
    const res = await Promise.all(batch.map(fn));
    results.push(...res);
  }
  return results;
};

export const dashboardService = {
  // Get dashboard data for SuperAdmin
  // Accept optional { userRole, email } to return role-scoped data
  getDashboardData: async ({ userRole = null, email = null } = {}) => {
    try {
      // Try to use cached dashboard payload to reduce repeated work
      const cacheKey = `dashboard:${userRole || 'anon'}:${email || 'nouser'}`;
      const cached = getCache(cacheKey);
      if (cached) return cached;

      // Run independent API calls in parallel to reduce latency
      const [allJobsRes, recRes, jdRes, candRes] = await Promise.all([
        apiFetch('/api/AllJobs', { method: 'GET' }),
        apiFetch('/api/AllRecruiters', { method: 'GET' }),
        apiFetch('/api/JobDashboard', { method: 'GET' }),
        apiFetch('/api/AllCandidates', { method: 'GET' })
      ]);

      const allJobsJson = allJobsRes.ok ? await allJobsRes.json() : { TotalJobs: 0 };
      const recJson = recRes.ok ? await recRes.json() : { TotalRecruiters: 0, RecruiterEmails: [] };
      const jdJson = jdRes.ok ? await jdRes.json() : { Jobs: [] };
      const candJson = candRes.ok ? await candRes.json() : { TotalCandidates: 0 };

      // Build a lookup map of job summaries by JobID for quick access
      const jobSummaryMap = {};
      for (const j of (jdJson.Jobs || [])) jobSummaryMap[String(j.JobID)] = j;

      const jobs = [];
      // If user is HiringAssistant or Candidate, fetch their assigned JobIDs and only load those jobs
      let jobListToIterate = jdJson.Jobs || [];
      if (userRole === 'HiringAssistant' || userRole === 'Candidate') {
        if (!email) {
          const emptyResult = { stats: { activeJobs: 0, totalRecruiters: 0, totalCandidates: 0 }, jobs: [] };
          setCache(cacheKey, emptyResult);
          return emptyResult;
        }
        const haRes = await apiFetch('/api/HiringAssistantJobs', { method: 'POST', body: JSON.stringify({ Email: email }) });
        const haJson = haRes.ok ? await haRes.json() : { JobIDs: [] };
        const haSet = new Set((haJson.JobIDs || []).map(String));
        jobListToIterate = (jdJson.Jobs || []).filter(j => haSet.has(String(j.JobID)));
      }

      // Prepare intrinsics fetch tasks and use cached intrinsics if available
      const intrinsicsCacheKeyPrefix = 'jobIntrinsics:';
      const jobTasks = (jobListToIterate || []).map(j => ({
        job: j,
        id: String(j.JobID)
      }));

      // fetch intrinsics in batches to avoid too many parallel requests
      const intrinsicsResults = await batchExec(jobTasks, async (task) => {
        const { job, id } = task;
        const cachedIntr = getCache(intrinsicsCacheKeyPrefix + id);
        if (cachedIntr) {
          return { job, intrinsics: cachedIntr };
        }
        try {
          const intrRes = await apiFetch('/api/JobIntrinsics', { method: 'POST', body: JSON.stringify({ JobID: job.JobID }) });
          const intrJson = intrRes.ok ? await intrRes.json() : null;
          setCache(intrinsicsCacheKeyPrefix + id, intrJson, 60_000);
          return { job, intrinsics: intrJson };
        } catch (e) {
          console.error('Failed to load JobIntrinsics for', job.JobID, e);
          return { job, intrinsics: null };
        }
      }, 8);

      for (const r of intrinsicsResults) {
        const j = r.job;
        const intrJson = r.intrinsics;
        // Preserve any server-provided creation timestamp if available under common keys
        const createdAt = j.createdAt || j.CreatedAt || j.JobCreatedAt || j.CreatedOn || j.PostedOn || null;
        const merged = {
          id: j.JobID,
          jobID: j.JobID,
          title: j.JobTitle || '',
          companyName: j.CompanyName || '',
          position: j.CompanyName || '',
          description: j.JobDescription || '',
          status: j.JobStatus || '',
          createdAt: createdAt,
          intrinsics: intrJson || null,
          candidatesCount: intrJson && intrJson.TotalNumberOfCandidates ? intrJson.TotalNumberOfCandidates : (intrJson && intrJson.Candidates ? intrJson.Candidates.length : 0)
        };
        jobs.push(merged);
      }

      // Total candidates from backend
      const stats = {
        activeJobs: allJobsJson.TotalJobs || (jdJson.Jobs ? jdJson.Jobs.length : 0),
        totalRecruiters: recJson.TotalRecruiters || 0,
        totalCandidates: candJson.TotalCandidates || 0
      };

      const result = { stats, jobs };
      // Cache dashboard result for a short duration so repeated UI navigations are fast
      setCache(cacheKey, result, 30_000);
      return result;
    } catch (error) {
      console.error('getDashboardData error:', error);
      return { stats: { activeJobs: 0, totalRecruiters: 0, totalCandidates: 0 }, jobs: [] };
    }
  },

  // Pause job (calls JobStatusChange -> Pause)
  pauseJob: async (jobId) => {
    const res = await apiFetch('/api/JobStatusChange', { method: 'POST', body: JSON.stringify({ JobID: jobId, NewStatus: 'Pause' }) });
    if (res.ok) {
      // invalidate cached dashboard and intrinsics so subsequent reads return fresh data
      clearCacheByPrefix('dashboard:');
      clearCacheByPrefix('jobIntrinsics:');
      return await res.json();
    }
    return { success: false };
  },

  // Resume job (calls JobStatusChange -> Resume)
  resumeJob: async (jobId) => {
    const res = await apiFetch('/api/JobStatusChange', { method: 'POST', body: JSON.stringify({ JobID: jobId, NewStatus: 'Resume' }) });
    if (res.ok) {
      clearCacheByPrefix('dashboard:');
      clearCacheByPrefix('jobIntrinsics:');
      return await res.json();
    }
    return { success: false };
  },

  // Delete job (calls JobStatusChange -> Delete)
  deleteJob: async (jobId) => {
    const res = await apiFetch('/api/JobStatusChange', { method: 'POST', body: JSON.stringify({ JobID: jobId, NewStatus: 'Delete' }) });
    if (res.ok) {
      clearCacheByPrefix('dashboard:');
      clearCacheByPrefix('jobIntrinsics:');
      return await res.json();
    }
    return { success: false };
  }
  ,
  // Mark job as ended (calls JobStatusChange -> Ended)
  completeJob: async (jobId) => {
    const res = await apiFetch('/api/JobStatusChange', { method: 'POST', body: JSON.stringify({ JobID: jobId, NewStatus: 'Ended' }) });
    if (res.ok) {
      clearCacheByPrefix('dashboard:');
      clearCacheByPrefix('jobIntrinsics:');
      return await res.json();
    }
    return { success: false };
  }
};