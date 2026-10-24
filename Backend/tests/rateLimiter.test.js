import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter } from "../middlewares/rateLimiter.js";

describe("Token Bucket Rate Limiter Test Suite", () => {
  it("should allow requests up to capacity and block subsequent requests", () => {
    const capacity = 3;
    const limiter = createRateLimiter({
      capacity,
      refillIntervalMs: 60000, // 1 min refill
      message: "Rate limit exceeded"
    });

    const req = { userId: "user_test_1" };
    let allowedCount = 0;
    let blockedCount = 0;

    for (let i = 0; i < 5; i++) {
      let passed = false;
      let statusSent = null;
      let bodySent = null;

      const res = {
        status: (code) => {
          statusSent = code;
          return {
            json: (data) => {
              bodySent = data;
            }
          };
        }
      };

      const next = () => {
        passed = true;
      };

      limiter(req, res, next);

      if (passed) {
        allowedCount++;
      } else {
        blockedCount++;
        assert.strictEqual(statusSent, 429);
        assert.strictEqual(bodySent.message, "Rate limit exceeded");
      }
    }

    assert.strictEqual(allowedCount, 3);
    assert.strictEqual(blockedCount, 2);
  });

  it("should track tokens separately for different users", () => {
    const limiter = createRateLimiter({
      capacity: 2,
      refillIntervalMs: 60000
    });

    const user1 = { userId: "user_a" };
    const user2 = { userId: "user_b" };

    let user1Pass = 0;
    let user2Pass = 0;

    const mockRes = () => ({
      status: () => ({ json: () => {} })
    });

    // Exhaust user 1
    limiter(user1, mockRes(), () => { user1Pass++; });
    limiter(user1, mockRes(), () => { user1Pass++; });
    limiter(user1, mockRes(), () => { user1Pass++; }); // should block

    // User 2 should still have full quota
    limiter(user2, mockRes(), () => { user2Pass++; });
    limiter(user2, mockRes(), () => { user2Pass++; });

    assert.strictEqual(user1Pass, 2);
    assert.strictEqual(user2Pass, 2);
  });

  it("should refill tokens after the refill interval expires", async () => {
    const capacity = 2;
    const refillIntervalMs = 50; // fast 50ms refill for unit test
    const limiter = createRateLimiter({
      capacity,
      refillIntervalMs
    });

    const req = { userId: "user_refill_test" };
    const mockRes = () => ({
      status: () => ({ json: () => {} })
    });

    let passes = 0;
    // Consume both
    limiter(req, mockRes(), () => { passes++; });
    limiter(req, mockRes(), () => { passes++; });
    // 3rd should fail
    limiter(req, mockRes(), () => { passes++; });
    assert.strictEqual(passes, 2);

    // Wait 120ms for at least 2 tokens to refill
    await new Promise((resolve) => setTimeout(resolve, 120));

    // Should now pass again
    limiter(req, mockRes(), () => { passes++; });
    assert.strictEqual(passes, 3);
  });
});
