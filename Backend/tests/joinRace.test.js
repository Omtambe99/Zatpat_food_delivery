import test, { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Join Race & Atomic Capacity Test Suite", () => {
  /**
   * Simulates MongoDB's atomic document-level execution of:
   * findOneAndUpdate(
   *   {
   *     _id: batchId,
   *     status: "open",
   *     expiresAt: { $gt: new Date() },
   *     "members.user": { $ne: userId },
   *     $expr: { $lt: [{ $size: "$members" }, "$maxMembers"] }
   *   },
   *   { $push: { members: member } }
   * )
   */
  class AtomicBatchDocument {
    constructor(id, maxMembers = 5) {
      this._id = id;
      this.status = "open";
      this.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      this.maxMembers = maxMembers;
      this.members = [];
      // Mutex lock to simulate MongoDB's per-document single-threaded write lock
      this._lock = Promise.resolve();
    }

    atomicJoin(userId, itemsTotal) {
      // Chain onto document lock so writes execute atomically
      const operation = this._lock.then(async () => {
        // Small artificial asynchronous jitter (0 - 5ms) simulating I/O
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));

        // 1. Check status
        if (this.status !== "open") {
          return { success: false, reason: "Batch is not open" };
        }

        // 2. Check expiration
        if (this.expiresAt <= new Date()) {
          return { success: false, reason: "Batch window expired" };
        }

        // 3. Check "members.user": { $ne: userId }
        const alreadyMember = this.members.some((m) => m.user === userId);
        if (alreadyMember) {
          return { success: false, reason: "User already in batch" };
        }

        // 4. Check $expr: { $lt: [{ $size: "$members" }, "$maxMembers"] }
        if (this.members.length >= this.maxMembers) {
          return { success: false, reason: "Batch is full" };
        }

        // 5. $push: { members: tentativeMember }
        const newMember = {
          user: userId,
          itemsTotal,
          joinedAt: new Date()
        };
        this.members.push(newMember);

        return {
          success: true,
          memberCount: this.members.length,
          member: newMember
        };
      });

      this._lock = operation.catch(() => {});
      return operation;
    }
  }

  it("should permit exactly 5 members when 10 concurrent requests race for a batch with capacity 5", async () => {
    const batch = new AtomicBatchDocument("batch_test_race_1", 5);

    // Initial state: host has created the batch (1 member)
    batch.members.push({ user: "host_user_1", itemsTotal: 250, joinedAt: new Date() });
    assert.strictEqual(batch.members.length, 1);

    // 10 concurrent neighbors attempting to join at the exact same moment
    const candidateUserIds = Array.from({ length: 10 }, (_, i) => `neighbor_user_${i + 1}`);

    const joinPromises = candidateUserIds.map((userId) =>
      batch.atomicJoin(userId, 150)
    );

    const results = await Promise.all(joinPromises);

    const successfulJoins = results.filter((r) => r.success);
    const rejectedJoins = results.filter((r) => !r.success);

    // Since initial capacity was 5 and host took 1 spot, exactly 4 neighbors can succeed
    assert.strictEqual(successfulJoins.length, 4, "Expected exactly 4 neighbors to join");
    assert.strictEqual(rejectedJoins.length, 6, "Expected exactly 6 neighbors to be rejected");

    // All rejections must be due to "Batch is full"
    for (const rejected of rejectedJoins) {
      assert.strictEqual(rejected.reason, "Batch is full");
    }

    // Final batch members must equal strictly maxMembers (5)
    assert.strictEqual(batch.members.length, 5, "Total members must equal capacity (5)");

    // Member IDs must be unique
    const userSet = new Set(batch.members.map((m) => m.user));
    assert.strictEqual(userSet.size, 5, "All 5 members must be unique");
  });

  it("should permit exactly 5 members when 10 concurrent requests race for an empty batch with capacity 5", async () => {
    const batch = new AtomicBatchDocument("batch_test_race_2", 5);

    const candidateUserIds = Array.from({ length: 10 }, (_, i) => `concurrent_user_${i + 1}`);

    const results = await Promise.all(
      candidateUserIds.map((userId) => batch.atomicJoin(userId, 120))
    );

    const successfulJoins = results.filter((r) => r.success);
    const rejectedJoins = results.filter((r) => !r.success);

    assert.strictEqual(successfulJoins.length, 5, "Expected exactly 5 successful joins");
    assert.strictEqual(rejectedJoins.length, 5, "Expected exactly 5 rejected joins");
    assert.strictEqual(batch.members.length, 5, "Total members must equal strictly 5");
  });

  it("should prevent duplicate join even when the same user fires multiple concurrent join requests", async () => {
    const batch = new AtomicBatchDocument("batch_test_race_3", 5);

    // Same user fires 5 concurrent join requests
    const results = await Promise.all([
      batch.atomicJoin("spammer_user_1", 100),
      batch.atomicJoin("spammer_user_1", 100),
      batch.atomicJoin("spammer_user_1", 100),
      batch.atomicJoin("spammer_user_1", 100),
      batch.atomicJoin("spammer_user_1", 100)
    ]);

    const successfulJoins = results.filter((r) => r.success);
    const duplicateRejections = results.filter(
      (r) => !r.success && r.reason === "User already in batch"
    );

    assert.strictEqual(successfulJoins.length, 1, "Only 1 request from duplicate user should succeed");
    assert.strictEqual(duplicateRejections.length, 4, "Remaining 4 requests should be rejected as duplicate");
    assert.strictEqual(batch.members.length, 1);
  });
});
