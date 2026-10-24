import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeDeliveryFee, computeOrderPricing, splitBill } from "../utils/pricing.js";
import { BASE_DELIVERY_FEE, FREE_DELIVERY_ABOVE, DISCOUNT_TIERS, BATCH_MAX_MEMBERS } from "../config/batch.config.js";

describe("Pricing Utilities Test Suite", () => {
  describe("computeDeliveryFee", () => {
    it("should charge base fee ₹40 for 1 member (0% discount)", () => {
      const fee = computeDeliveryFee(200, 1);
      assert.strictEqual(fee, 40);
    });

    it("should charge ₹28 for 2 members (30% discount on ₹40)", () => {
      const fee = computeDeliveryFee(200, 2);
      assert.strictEqual(fee, 28);
    });

    it("should charge ₹20 for 3 members (50% discount on ₹40)", () => {
      const fee = computeDeliveryFee(200, 3);
      assert.strictEqual(fee, 20);
    });

    it("should charge ₹14 for 4 members (65% discount on ₹40)", () => {
      const fee = computeDeliveryFee(200, 4);
      assert.strictEqual(fee, 14);
    });

    it("should charge ₹8 for 5 members (80% discount on ₹40)", () => {
      const fee = computeDeliveryFee(200, 5);
      assert.strictEqual(fee, 8);
    });

    it("should cap at 5 members discount for memberCount > 5", () => {
      const fee6 = computeDeliveryFee(200, 6);
      const fee10 = computeDeliveryFee(200, 10);
      assert.strictEqual(fee6, 8);
      assert.strictEqual(fee10, 8);
    });

    it("should provide free delivery (₹0) when itemsTotal exceeds FREE_DELIVERY_ABOVE (₹500)", () => {
      assert.strictEqual(computeDeliveryFee(501, 1), 0);
      assert.strictEqual(computeDeliveryFee(600, 2), 0);
      assert.strictEqual(computeDeliveryFee(1000, 5), 0);
    });

    it("should handle edge cases like memberCount = 0 or null by defaulting to 1 member", () => {
      assert.strictEqual(computeDeliveryFee(250, 0), 40);
      assert.strictEqual(computeDeliveryFee(250, null), 40);
      assert.strictEqual(computeDeliveryFee(250, undefined), 40);
    });
  });

  describe("computeOrderPricing", () => {
    it("should calculate correct totals and breakdown", () => {
      const pricing = computeOrderPricing(300, 3);
      assert.strictEqual(pricing.itemsTotal, 300);
      assert.strictEqual(pricing.deliveryFeeBase, 40);
      assert.strictEqual(pricing.discountPct, 0.5);
      assert.strictEqual(pricing.deliveryFee, 20);
      assert.strictEqual(pricing.total, 320);
    });
  });

  describe("splitBill", () => {
    it("should return zeros for empty cart", () => {
      const result = splitBill({ participants: [] });
      assert.strictEqual(result.total, 0);
      assert.strictEqual(result.deliveryFee, 0);
      assert.deepStrictEqual(result.shares, []);
    });

    it("should split odd delivery fee ₹40 among 3 participants deterministically so sum equals total exactly", () => {
      const cart = {
        participants: [
          { user: "user1", name: "Alice", items: [{ price: 100, quantity: 1 }] },
          { user: "user2", name: "Bob", items: [{ price: 150, quantity: 1 }] },
          { user: "user3", name: "Charlie", items: [{ price: 200, quantity: 1 }] }
        ]
      };

      // 40 / 3 = 13.33 -> base 13, remainder 1 -> shares: 14, 13, 13
      const result = splitBill(cart, 40);

      assert.strictEqual(result.deliveryFee, 40);
      assert.strictEqual(result.itemsTotal, 450);
      assert.strictEqual(result.total, 490);

      assert.strictEqual(result.shares.length, 3);
      assert.strictEqual(result.shares[0].deliveryFeeShare, 14);
      assert.strictEqual(result.shares[1].deliveryFeeShare, 13);
      assert.strictEqual(result.shares[2].deliveryFeeShare, 13);

      const feeSum = result.shares.reduce((s, p) => s + p.deliveryFeeShare, 0);
      assert.strictEqual(feeSum, 40);

      const totalSum = result.shares.reduce((s, p) => s + p.total, 0);
      assert.strictEqual(totalSum, 490);
    });

    it("should guarantee sum of shares strictly equals total for 1 through 10 participants with odd item amounts", () => {
      for (let n = 1; n <= 10; n++) {
        const participants = [];
        for (let i = 1; i <= n; i++) {
          participants.push({
            user: `user_${i}`,
            name: `Participant ${i}`,
            items: [
              { price: 99 + (i * 13), quantity: 1 } // odd numbers
            ]
          });
        }

        const cart = { participants };
        // Test with different arbitrary delivery fees including odd amounts
        const oddFees = [0, 8, 14, 20, 28, 37, 40, 43];

        for (const fee of oddFees) {
          const result = splitBill(cart, fee);

          // 1. Fee sum equals delivery fee
          const feeSum = result.shares.reduce((acc, p) => acc + p.deliveryFeeShare, 0);
          assert.strictEqual(feeSum, result.deliveryFee, `Fee sum mismatch for n=${n}, fee=${fee}`);

          // 2. Items sum equals total items
          const itemsSum = result.shares.reduce((acc, p) => acc + p.itemsTotal, 0);
          assert.strictEqual(itemsSum, result.itemsTotal, `Items sum mismatch for n=${n}, fee=${fee}`);

          // 3. Overall total equals items total + delivery fee
          assert.strictEqual(result.total, result.itemsTotal + result.deliveryFee);

          // 4. Sum of participant shares equals overall total
          const sharesTotal = result.shares.reduce((acc, p) => acc + p.total, 0);
          assert.strictEqual(sharesTotal, result.total, `Total sum mismatch for n=${n}, fee=${fee}`);
        }
      }
    });
  });
});
