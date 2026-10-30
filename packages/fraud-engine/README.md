# @flowclaim/fraud-engine

Perceptual hash and duplicate receipt verification engine for the FlowClaim expense verification system.

## Features
- **64-bit dHash (Difference Hash)**: Resamples images to a $9 \times 8$ grayscale matrix and computes 64 adjacent gradient comparisons.
- **Hamming Distance & Similarity**: Bitwise XOR popcount with normalized similarity metric ($1 - d/64$).
- **Bloom Filter Pre-Screening**: Fast $O(1)$ probabilisitic pre-screen for exact SHA-256 matches using RedisBloom or an in-memory test store.
- **Definitive Post-Extraction Verification**: Cross-references dHash candidates against normalized merchant name, transaction date, and total monetary amounts (minor units).

## Public API

```javascript
import {
  computeDHash,
  hammingDistance,
  similarity,
  createFraudEngine,
  createMemoryFingerprintStore,
  createRedisFingerprintStore
} from '@flowclaim/fraud-engine';

// 1. Create store
const store = createMemoryFingerprintStore();

// 2. Initialize engine
const engine = createFraudEngine({
  store,
  config: { hammingThreshold: 5 }
});

// 3. Screen receipt
const screenResult = await engine.screen({
  claimId: 'claim-uuid-1',
  bytes: receiptBuffer,
  contentType: 'image/jpeg'
});

// 4. Verify duplicate candidates
const verifyResult = await engine.verify({
  claimId: 'claim-uuid-1',
  screen: screenResult,
  extraction: receiptExtraction,
  lookup: claimLookupPort
});
```
