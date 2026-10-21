/**
 * @file packages/fraud-engine/src/bloom-filter/redis-store.js
 * Redis / RedisBloom implementation of the FingerprintStore interface.
 */

import { hammingDistance } from '../similarity/hamming.js';

const KEY_BLOOM_SHA = 'fc:bloom:sha256';
const KEY_SHA_TO_CLAIM = 'fc:sha256:claims';
const KEY_CLAIM_TO_DHASH = 'fc:dhash:claims';

/**
 * Creates a Redis-backed FingerprintStore.
 * Works with RedisStack (RedisBloom) with graceful fallback to Redis BITSET/GETBIT.
 *
 * @param {object} redisClient - An ioredis or node-redis compatible client
 * @param {object} [options]
 * @param {string} [options.keyPrefix='']
 * @returns {import('../index.js').FingerprintStore}
 */
export function createRedisFingerprintStore(redisClient, options = {}) {
  const prefix = options.keyPrefix || '';
  const bloomKey = `${prefix}${KEY_BLOOM_SHA}`;
  const shaKey = `${prefix}${KEY_SHA_TO_CLAIM}`;
  const dhashKey = `${prefix}${KEY_CLAIM_TO_DHASH}`;

  let hasBloomModule = true;

  return {
    async bloomHasSha256(sha256) {
      if (hasBloomModule) {
        try {
          const res = await redisClient.sendCommand(['BF.EXISTS', bloomKey, sha256]);
          return res === 1 || res === '1';
        } catch (err) {
          if (err.message && (err.message.includes('unknown command') || err.message.includes('ERR'))) {
            hasBloomModule = false;
          } else {
            throw err;
          }
        }
      }

      // Bitset fallback: simple 3-hash bitfield simulation in Redis
      const h1 = (parseInt(sha256.slice(0, 8), 16) % 1000000);
      const res = await redisClient.getbit(bloomKey, h1);
      return res === 1;
    },

    async bloomAddSha256(sha256) {
      if (hasBloomModule) {
        try {
          await redisClient.sendCommand(['BF.ADD', bloomKey, sha256]);
          return;
        } catch (err) {
          if (err.message && (err.message.includes('unknown command') || err.message.includes('ERR'))) {
            hasBloomModule = false;
          } else {
            throw err;
          }
        }
      }

      const h1 = (parseInt(sha256.slice(0, 8), 16) % 1000000);
      await redisClient.setbit(bloomKey, h1, 1);
    },

    async getClaimIdBySha256(sha256) {
      const res = await redisClient.hget(shaKey, sha256);
      return res || null;
    },

    async setClaimIdBySha256(sha256, claimId) {
      await redisClient.hset(shaKey, sha256, claimId);
    },

    async addDhash(claimId, dhashHex) {
      await redisClient.hset(dhashKey, claimId, dhashHex.toLowerCase());
    },

    async findDhashCandidates(dhashHex, maxDistance) {
      const allEntries = await redisClient.hgetall(dhashKey);
      if (!allEntries) return [];

      const target = dhashHex.toLowerCase();
      /** @type {{ claimId: string, hammingDistance: number }[]} */
      const candidates = [];

      for (const [storedClaimId, storedHash] of Object.entries(allEntries)) {
        try {
          const dist = hammingDistance(target, storedHash);
          if (dist <= maxDistance) {
            candidates.push({ claimId: storedClaimId, hammingDistance: dist });
          }
        } catch {
          // Ignore corrupted hashes
        }
      }

      return candidates.sort((a, b) => a.hammingDistance - b.hammingDistance);
    },
  };
}
