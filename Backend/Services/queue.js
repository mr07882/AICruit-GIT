const Queue = require('bull');
const redis = require('redis');

// Require REDIS_URL in environment (.env). Do NOT hardcode credentials in source.
const redisUrl = (process.env.REDIS_URL && String(process.env.REDIS_URL).trim());
if (!redisUrl) {
  console.error('FATAL: REDIS_URL is not set. Please add REDIS_URL to your .env and restart the server.');
  throw new Error('REDIS_URL not configured');
}

const dns = require('dns').promises;

// Create queues using connection URL (Bull accepts a connection string)
// We'll perform a DNS check up front and fall back to localhost if resolution fails.
async function createQueues() {
  let finalUrl = redisUrl;
  try {
    // extract hostname from URL
    const m = redisUrl.match(/^[^:]+:\/\/[^@]+@([^:]+):?(\d+)?/);
    const hostname = m && m[1] ? m[1] : null;
    if (hostname) {
      // try resolve
      await dns.lookup(hostname);
    }
  } catch (err) {
    console.error('⚠️ Redis host DNS lookup failed:', err.code || err.message);
    console.error('Falling back to local Redis at redis://127.0.0.1:6379');
    finalUrl = process.env.FALLBACK_REDIS_URL || 'redis://127.0.0.1:6379';
  }

  const rq = new Queue('resumeEvaluation', finalUrl);
  const jsq = new Queue('jobStatus', finalUrl);
  return { rq, jsq, finalUrl };
}

// Initialize queues (synchronously export placeholders first)
let resumeEvaluationQueue;
let jobStatusQueue;
let activeRedisUrl = redisUrl;

const queueInitPromise = createQueues().then(({ rq, jsq, finalUrl }) => {
  resumeEvaluationQueue = rq;
  jobStatusQueue = jsq;
  activeRedisUrl = finalUrl;

  // attach listeners on the created queues
  resumeEvaluationQueue.on('completed', (job) => {
    console.log(`✅ Resume evaluation completed for job ${job.data.jobId}, candidate ${job.data.candidateIndex}`);
  });

  resumeEvaluationQueue.on('failed', (job, err) => {
    console.error(`❌ Resume evaluation failed for job ${job.data.jobId}, candidate ${job.data.candidateIndex}:`, err.message);
  });

  resumeEvaluationQueue.on('error', (err) => {
    console.error('❌ Resume evaluation queue error:', err);
  });

  jobStatusQueue.on('error', (err) => {
    console.error('❌ Job status queue error:', err);
  });

  return { rq: resumeEvaluationQueue, jsq: jobStatusQueue, finalUrl: activeRedisUrl };
}).catch(err => {
  console.error('Failed to initialize Redis queues:', err);
  // throw so server startup fails visibly
  throw err;
});

// Export a helper that resolves once queues are initialized
const getQueues = async () => {
  await queueInitPromise;
  return { resumeEvaluationQueue, jobStatusQueue, activeRedisUrl };
};
// Note: listeners are attached after queues initialize above.

// Helper to create Redis client for direct access if needed
const createRedisClient = () => {
  const client = redis.createClient({ url: activeRedisUrl || redisUrl });
  client.on('error', (err) => console.error('Redis client error:', err));
  return client;
};

module.exports = {
  resumeEvaluationQueue,
  jobStatusQueue,
  createRedisClient,
  redisUrl,
  getQueues,
  getActiveRedisUrl: () => activeRedisUrl,
};
