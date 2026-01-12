require('dotenv').config();
const redis = require('redis');

const url = process.env.REDIS_URL;
if (!url) {
  console.error('REDIS_URL not set in .env');
  process.exit(2);
}

console.log('Testing Redis connection to:', url);

async function test() {
  const client = redis.createClient({ url });
  client.on('error', (err) => {
    console.error('Redis client error event:', err);
  });
  try {
    await client.connect();
    const pong = await client.ping();
    console.log('PING response:', pong);
    await client.quit();
    console.log('Redis connection succeeded');
    process.exit(0);
  } catch (err) {
    console.error('Redis connection failed:', err.message || err);
    try { await client.quit(); } catch(e){}
    process.exit(1);
  }
}

test();
