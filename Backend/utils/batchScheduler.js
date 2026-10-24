import RazorPay from "razorpay";
import dotenv from "dotenv";
import Batch from "../models/batch.model.js";
import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import SharedCart from "../models/sharedCart.model.js";
import {
  DISCOUNT_TIERS,
  BATCH_MAX_MEMBERS,
  BASE_DELIVERY_FEE,
  FREE_DELIVERY_ABOVE
} from "../config/batch.config.js";

dotenv.config();

let instance = new RazorPay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Idempotently closes a batch, finalises delivery fees, processes refunds,
 * updates user gamification, and notifies participants.
 */
export const closeBatch = async (batchId, io = null) => {
  try {
    const batch = await Batch.findOneAndUpdate(
      { _id: batchId, status: "open" },
      { status: "closed", closedAt: new Date() },
      { new: true }
    )
      .populate("host", "fullName email mobile socketId")
      .populate("shop", "name image")
      .populate({
        path: "members.order",
        select: "user paymentMethod payment razorpayPaymentId deliveryFee itemsTotal deliveryFeeBase totalAmount"
      });

    if (!batch) {
      return null;
    }

    const now = Date.now();
    // Release any stale online pending holds older than 3 minutes
    batch.members.forEach((m) => {
      if (m.status === "pending" && m.joinedAt && now - new Date(m.joinedAt).getTime() > 3 * 60 * 1000) {
        m.status = "left";
      }
    });

    const activeMembers = batch.members.filter((m) => m.status === "active");
    const activeMemberCount = activeMembers.length;
    const finalPct = DISCOUNT_TIERS[Math.min(activeMemberCount, BATCH_MAX_MEMBERS)] || 0;
    batch.discountPct = finalPct;

    for (const m of activeMembers) {
      const order = m.order;
      const deliveryFeeBase = order?.deliveryFeeBase ?? (m.itemsTotal > FREE_DELIVERY_ABOVE ? 0 : BASE_DELIVERY_FEE);
      const finalDeliveryFee = Math.round(deliveryFeeBase * (1 - finalPct));
      const feePaid = m.feePaidAtJoin;
      const refund = Math.max(0, feePaid - finalDeliveryFee);

      m.finalDeliveryFee = finalDeliveryFee;
      m.refundAmount = refund;

      if (order) {
        order.deliveryFee = finalDeliveryFee;
        order.batchDiscountPct = finalPct;

        if (order.paymentMethod === "cod") {
          order.totalAmount = order.itemsTotal + finalDeliveryFee;
          await Order.findByIdAndUpdate(order._id, {
            deliveryFee: finalDeliveryFee,
            batchDiscountPct: finalPct,
            totalAmount: order.totalAmount
          });
        } else if (order.paymentMethod === "online") {
          order.refundAmount = refund;
          if (refund > 0 && order.razorpayPaymentId) {
            try {
              await instance.payments.refund(order.razorpayPaymentId, {
                amount: Math.round(refund * 100)
              });
            } catch (err) {
              console.error(`Razorpay refund error for payment ${order.razorpayPaymentId}:`, err.message);
            }
          }
          await Order.findByIdAndUpdate(order._id, {
            deliveryFee: finalDeliveryFee,
            batchDiscountPct: finalPct,
            refundAmount: refund
          });
        }

        const savedOnThisOrder = Math.max(0, deliveryFeeBase - finalDeliveryFee);
        if (savedOnThisOrder > 0) {
          await User.findByIdAndUpdate(m.user, {
            $inc: { "gamification.totalSaved": savedOnThisOrder }
          });
        }
      }

      // Send per-member payload to member's socket
      const memberUserId = m.user?._id || m.user;
      const memberUser = await User.findById(memberUserId).select("socketId");
      if (io && memberUser?.socketId) {
        io.to(memberUser.socketId).emit("batchClosed", {
          batchId: batch._id,
          finalDiscountPct: finalPct,
          finalDeliveryFee,
          refundAmount: refund,
          totalSaved: Math.max(0, deliveryFeeBase - finalDeliveryFee)
        });
      }
    }

    await batch.save();

    // Broadcast generic closed event to batch room
    if (io) {
      io.to(`batch:${batch._id}`).emit("batchClosed", {
        batchId: batch._id,
        status: "closed",
        finalDiscountPct: finalPct,
        memberCount: activeMemberCount
      });
    }

    return batch;
  } catch (error) {
    console.error(`closeBatch error for batch ${batchId}:`, error);
    return null;
  }
};

/**
 * Sweeper function that checks for expired batches, holds, and shared carts.
 */
export const runBatchSweeper = async (io = null) => {
  try {
    const now = new Date();

    // 1. Close open batches whose window expired
    const expiredBatches = await Batch.find({
      status: "open",
      expiresAt: { $lte: now }
    }).select("_id");

    for (const b of expiredBatches) {
      await closeBatch(b._id, io);
    }

    // 2. Release stale 3-minute online payment holds on open batches
    const holdCutoff = new Date(Date.now() - 3 * 60 * 1000);
    const batchesWithExpiredHolds = await Batch.find({
      status: "open",
      "members.status": "pending",
      "members.joinedAt": { $lte: holdCutoff }
    });

    for (const b of batchesWithExpiredHolds) {
      let changed = false;
      b.members.forEach((m) => {
        if (m.status === "pending" && m.joinedAt <= holdCutoff) {
          m.status = "left";
          changed = true;
        }
      });

      if (changed) {
        const activeCount = b.members.filter((m) => m.status === "active").length;
        b.discountPct = DISCOUNT_TIERS[Math.min(activeCount, BATCH_MAX_MEMBERS)] || 0;
        await b.save();

        if (io) {
          io.to(`batch:${b._id}`).emit("batchUpdate", {
            batchId: b._id,
            memberCount: activeCount,
            discountPct: b.discountPct,
            expiresAt: b.expiresAt
          });
        }
      }
    }

    // 3. Mark expired SharedCarts
    await SharedCart.updateMany(
      { status: { $in: ["open", "locked"] }, expiresAt: { $lte: now } },
      { status: "expired" }
    );
  } catch (error) {
    console.error("Batch sweeper error:", error.message);
  }
};

/**
 * Initializes batch sweeper with immediate start and 10s interval.
 */
export const startBatchScheduler = (io = null) => {
  // Run once immediately on server start to finalize any batches that expired during downtime
  runBatchSweeper(io);

  // Poll every 10 seconds
  const intervalId = setInterval(() => {
    runBatchSweeper(io);
  }, 10 * 1000);

  return intervalId;
};
