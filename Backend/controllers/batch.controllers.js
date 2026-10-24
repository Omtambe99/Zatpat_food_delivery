import Batch from "../models/batch.model.js";
import Order from "../models/order.model.js";
import Shop from "../models/shop.model.js";
import User from "../models/user.model.js";
import { haversineMeters } from "../utils/geo.js";
import { priceCart, computeDeliveryFee } from "../utils/pricing.js";
import { closeBatch } from "../utils/batchScheduler.js";
import { createOrderFromCart } from "./order.controllers.js";
import {
  BATCH_WINDOW_MS,
  BATCH_RADIUS_M,
  BATCH_MAX_MEMBERS,
  BATCH_MIN_ITEMS_TOTAL,
  BASE_DELIVERY_FEE,
  DISCOUNT_TIERS
} from "../config/batch.config.js";
import RazorPay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

let instance = new RazorPay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Creates a batch for an order that opted in with openToNeighbors.
 * Called immediately for COD, or inside verifyPayment for Online.
 */
export const createBatchForOrder = async (order, shopOrder, io = null) => {
  try {
    if (!order.openToNeighbors || !shopOrder) return null;
    if (order.shopOrders && order.shopOrders.length > 1) return null; // Single shop only
    if (order.batch) return null; // Already has batch

    const hostId = order.user?._id || order.user;
    const anchor = {
      type: "Point",
      coordinates: [order.deliveryAddress.longitude, order.deliveryAddress.latitude]
    };

    const expiresAt = new Date(Date.now() + BATCH_WINDOW_MS);

    const hostMember = {
      user: hostId,
      order: order._id,
      shopOrderId: shopOrder._id,
      joinedAt: new Date(),
      itemsTotal: order.itemsTotal,
      feePaidAtJoin: order.deliveryFee,
      finalDeliveryFee: order.deliveryFee,
      refundAmount: 0,
      status: "active"
    };

    const batch = await Batch.create({
      host: hostId,
      shop: shopOrder.shop,
      anchor,
      status: "open",
      expiresAt,
      maxMembers: BATCH_MAX_MEMBERS,
      members: [hostMember],
      discountPct: 0,
      invitedUserIds: []
    });

    order.batch = batch._id;
    shopOrder.batch = batch._id;
    await order.save();

    await batch.populate("shop", "name image");
    await batch.populate("host", "fullName socketId");

    const hostFirstName = batch.host?.fullName ? batch.host.fullName.trim().split(" ")[0] : "Neighbor";

    // Broadcast to nearby online users within 300 meters
    const nearbyUsers = await User.find({
      role: "user",
      isOnline: true,
      socketId: { $ne: null },
      _id: { $ne: hostId },
      location: {
        $near: {
          $geometry: anchor,
          $maxDistance: BATCH_RADIUS_M
        }
      }
    }).select("_id socketId fullName location");

    for (const neighbor of nearbyUsers) {
      let distM = 150;
      if (neighbor.location?.coordinates?.length === 2) {
        distM = haversineMeters(
          order.deliveryAddress.latitude,
          order.deliveryAddress.longitude,
          neighbor.location.coordinates[1],
          neighbor.location.coordinates[0]
        );
      }
      const approxDistanceM = Math.max(50, Math.round(distM / 50) * 50);

      const payload = {
        batchId: batch._id,
        shopId: batch.shop._id,
        shopName: batch.shop.name,
        shopImage: batch.shop.image,
        hostFirstName,
        approxDistanceM,
        expiresAt: batch.expiresAt,
        memberCount: 1,
        discountTiers: DISCOUNT_TIERS,
        currentDiscountPct: 0
      };

      if (io) {
        io.to(neighbor.socketId).emit("batchInvite", payload);
      }

      batch.invitedUserIds.push(neighbor._id);
    }

    await batch.save();

    // Join host's socket to room batch:<batchId>
    if (io && batch.host?.socketId) {
      io.in(batch.host.socketId).socketsJoin(`batch:${batch._id}`);
    }

    return batch;
  } catch (error) {
    console.error("createBatchForOrder error:", error);
    return null;
  }
};

/**
 * GET /api/batch/nearby
 * Pull endpoint returning sanitised list of open batches within 300m
 */
export const getNearbyBatches = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    let lon = user?.location?.coordinates?.[0];
    let lat = user?.location?.coordinates?.[1];

    if (req.query.lat && req.query.lon) {
      lat = Number(req.query.lat);
      lon = Number(req.query.lon);
    }

    if (lat == null || lon == null || (lat === 0 && lon === 0)) {
      return res.status(200).json([]);
    }

    const nearbyBatches = await Batch.find({
      status: "open",
      expiresAt: { $gt: new Date() },
      host: { $ne: req.userId },
      "members.user": { $ne: req.userId },
      anchor: {
        $near: {
          $geometry: { type: "Point", coordinates: [lon, lat] },
          $maxDistance: BATCH_RADIUS_M
        }
      }
    })
      .populate("shop", "name image")
      .populate("host", "fullName");

    const results = nearbyBatches.map((batch) => {
      const hostFirstName = batch.host?.fullName ? batch.host.fullName.trim().split(" ")[0] : "Neighbor";
      const distM = haversineMeters(
        lat,
        lon,
        batch.anchor.coordinates[1],
        batch.anchor.coordinates[0]
      );
      const approxDistanceM = Math.max(50, Math.round(distM / 50) * 50);
      const activeMembers = batch.members.filter((m) => m.status === "active");

      return {
        batchId: batch._id,
        shopId: batch.shop._id,
        shopName: batch.shop.name,
        shopImage: batch.shop.image,
        hostFirstName,
        approxDistanceM,
        expiresAt: batch.expiresAt,
        memberCount: activeMembers.length,
        discountTiers: DISCOUNT_TIERS,
        currentDiscountPct: batch.discountPct
      };
    });

    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ message: `get nearby batches error: ${error.message || error}` });
  }
};

/**
 * POST /api/batch/:batchId/join
 * Join an open batch with own cartItems and deliveryAddress
 */
export const joinBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { cartItems, paymentMethod, deliveryAddress } = req.body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ message: "Cart cannot be empty" });
    }
    if (!deliveryAddress || !deliveryAddress.text || deliveryAddress.latitude == null || deliveryAddress.longitude == null) {
      return res.status(400).json({ message: "Complete delivery address is required" });
    }

    const batch = await Batch.findById(batchId)
      .populate("shop")
      .populate("host", "fullName mobile");

    if (!batch || batch.status !== "open" || batch.expiresAt <= new Date()) {
      return res.status(400).json({ message: "Batch window is closed or expired" });
    }

    // 2. Address radius check
    const distM = haversineMeters(
      deliveryAddress.latitude,
      deliveryAddress.longitude,
      batch.anchor.coordinates[1],
      batch.anchor.coordinates[0]
    );

    if (distM > BATCH_RADIUS_M) {
      return res.status(400).json({ message: `Delivery address is ${distM}m away; must be within ${BATCH_RADIUS_M}m` });
    }

    // 3. User checks & anti-abuse
    if (String(batch.host._id || batch.host) === String(req.userId)) {
      return res.status(400).json({ message: "You cannot join your own batch as a neighbor" });
    }

    const isAlreadyMember = batch.members.some(
      (m) => String(m.user) === String(req.userId) && m.status === "active"
    );
    if (isAlreadyMember) {
      return res.status(400).json({ message: "You are already an active member of this batch" });
    }

    const memberUser = await User.findById(req.userId);
    if (batch.host.mobile && memberUser?.mobile && batch.host.mobile === memberUser.mobile) {
      return res.status(400).json({ message: "Cannot join batch created by the same contact number" });
    }

    // Rate limit: 1 join per 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentJoin = await Batch.findOne({
      "members.user": req.userId,
      "members.joinedAt": { $gte: tenMinAgo },
      _id: { $ne: batch._id }
    });
    if (recentJoin) {
      return res.status(429).json({ message: "Please wait 10 minutes between joining batches" });
    }

    // 4. Cart verification and items pricing
    const pricedCart = await priceCart(cartItems);
    for (const item of pricedCart.pricedItems) {
      if (String(item.shop) !== String(batch.shop._id)) {
        return res.status(400).json({ message: "All items must be from the batch restaurant" });
      }
    }

    if (pricedCart.itemsTotal < BATCH_MIN_ITEMS_TOTAL) {
      return res.status(400).json({
        message: `Minimum order amount of ₹${BATCH_MIN_ITEMS_TOTAL} required to join (current: ₹${pricedCart.itemsTotal})`
      });
    }

    const currentActive = batch.members.filter((m) => m.status === "active").length;
    const prospectiveCount = Math.min(currentActive + 1, BATCH_MAX_MEMBERS);
    const prospectiveDeliveryFee = computeDeliveryFee(pricedCart.itemsTotal, prospectiveCount);

    // 5. Atomic capacity check
    const tentativeMember = {
      user: req.userId,
      itemsTotal: pricedCart.itemsTotal,
      feePaidAtJoin: prospectiveDeliveryFee,
      finalDeliveryFee: prospectiveDeliveryFee,
      refundAmount: 0,
      status: paymentMethod === "online" ? "pending" : "active",
      joinedAt: new Date()
    };

    const updatedBatch = await Batch.findOneAndUpdate(
      {
        _id: batchId,
        status: "open",
        expiresAt: { $gt: new Date() },
        "members.user": { $ne: req.userId },
        $expr: { $lt: [{ $size: "$members" }, "$maxMembers"] }
      },
      { $push: { members: tentativeMember } },
      { new: true }
    );

    if (!updatedBatch) {
      return res.status(409).json({ message: "Window closed or batch is full" });
    }

    // 6. Create Member's Order
    const orderData = await createOrderFromCart({
      userId: req.userId,
      cartItems,
      paymentMethod,
      deliveryAddress,
      batchId: batch._id,
      memberCount: prospectiveCount
    });

    const io = req.app.get("io");

    if (paymentMethod === "online") {
      const razorOrder = await instance.orders.create({
        amount: Math.round(orderData.totalAmount * 100),
        currency: "INR",
        receipt: `receipt_${Date.now()}`
      });

      orderData.razorpayOrderId = razorOrder.id;
      orderData.payment = false;
      const newOrder = await Order.create(orderData);

      // Link order to the member in batch
      await Batch.updateOne(
        { _id: batchId, "members.user": req.userId },
        {
          $set: {
            "members.$.order": newOrder._id,
            "members.$.shopOrderId": newOrder.shopOrders[0]?._id
          }
        }
      );

      return res.status(200).json({
        razorOrder,
        orderId: newOrder._id,
        batchId: batch._id
      });
    }

    // COD flow
    const newOrder = await Order.create(orderData);

    await Batch.updateOne(
      { _id: batchId, "members.user": req.userId },
      {
        $set: {
          "members.$.order": newOrder._id,
          "members.$.shopOrderId": newOrder.shopOrders[0]?._id,
          "members.$.status": "active"
        }
      }
    );

    const freshBatch = await Batch.findById(batchId);
    const activeCount = freshBatch.members.filter((m) => m.status === "active").length;
    const discountPct = DISCOUNT_TIERS[Math.min(activeCount, BATCH_MAX_MEMBERS)] || 0;
    freshBatch.discountPct = discountPct;
    await freshBatch.save();

    if (io) {
      const newFeePerMember = computeDeliveryFee(BASE_DELIVERY_FEE, activeCount);
      io.to(`batch:${batchId}`).emit("batchUpdate", {
        batchId,
        memberCount: activeCount,
        discountPct,
        newFeePerMember,
        expiresAt: freshBatch.expiresAt
      });

      if (memberUser?.socketId) {
        io.in(memberUser.socketId).socketsJoin(`batch:${batchId}`);
      }
    }

    // If max members reached, close batch early
    if (activeCount >= freshBatch.maxMembers) {
      await closeBatch(batchId, io);
    }

    // Notify shop owner via existing newOrder event
    await newOrder.populate("shopOrders.shopOrderItems.item", "name image price");
    await newOrder.populate("shopOrders.shop", "name");
    await newOrder.populate("shopOrders.owner", "name socketId");
    await newOrder.populate("user", "name email mobile");

    if (io) {
      newOrder.shopOrders.forEach((shopOrder) => {
        const ownerSocketId = shopOrder.owner?.socketId;
        if (ownerSocketId) {
          io.to(ownerSocketId).emit("newOrder", {
            _id: newOrder._id,
            batchId: batch._id,
            paymentMethod: newOrder.paymentMethod,
            user: newOrder.user,
            shopOrders: shopOrder,
            createdAt: newOrder.createdAt,
            deliveryAddress: newOrder.deliveryAddress,
            payment: newOrder.payment
          });
        }
      });
    }

    return res.status(201).json({ order: newOrder, batch: freshBatch });
  } catch (error) {
    return res.status(500).json({ message: `join batch error: ${error.message || error}` });
  }
};

/**
 * GET /api/batch/:batchId
 * Fetch batch details. Members & host get full details (anonymised); non-members get sanitized preview.
 */
export const getBatchById = async (req, res) => {
  try {
    const { batchId } = req.params;
    const batch = await Batch.findById(batchId)
      .populate("shop", "name image address")
      .populate("host", "fullName")
      .populate({
        path: "members.user",
        select: "fullName"
      });

    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    const isHost = String(batch.host._id || batch.host) === String(req.userId);
    const isMember = batch.members.some(
      (m) => String(m.user?._id || m.user) === String(req.userId) && m.status === "active"
    );

    const hostFirstName = batch.host?.fullName ? batch.host.fullName.trim().split(" ")[0] : "Neighbor";

    if (!isHost && !isMember) {
      return res.status(200).json({
        batchId: batch._id,
        shop: batch.shop,
        hostFirstName,
        status: batch.status,
        expiresAt: batch.expiresAt,
        memberCount: batch.members.filter((m) => m.status === "active").length,
        maxMembers: batch.maxMembers,
        discountPct: batch.discountPct,
        discountTiers: DISCOUNT_TIERS
      });
    }

    // Anonymised member listing for participants
    const anonymisedMembers = batch.members
      .filter((m) => m.status === "active")
      .map((m, idx) => {
        const isSelf = String(m.user?._id || m.user) === String(req.userId);
        const isHostMember = String(m.user?._id || m.user) === String(batch.host._id || batch.host);
        return {
          displayName: isSelf ? "You" : isHostMember ? `${hostFirstName} (Host)` : `Neighbor ${idx + 1}`,
          itemsTotal: m.itemsTotal,
          feePaidAtJoin: m.feePaidAtJoin,
          joinedAt: m.joinedAt,
          isSelf,
          isHost: isHostMember
        };
      });

    return res.status(200).json({
      batchId: batch._id,
      shop: batch.shop,
      hostFirstName,
      status: batch.status,
      expiresAt: batch.expiresAt,
      closedAt: batch.closedAt,
      isHost,
      isMember,
      memberCount: anonymisedMembers.length,
      maxMembers: batch.maxMembers,
      discountPct: batch.discountPct,
      discountTiers: DISCOUNT_TIERS,
      members: anonymisedMembers
    });
  } catch (error) {
    return res.status(500).json({ message: `get batch error: ${error.message || error}` });
  }
};

/**
 * POST /api/batch/:batchId/close
 * Host closes batch early
 */
export const closeBatchEarly = async (req, res) => {
  try {
    const { batchId } = req.params;
    const batch = await Batch.findById(batchId);

    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }
    if (String(batch.host) !== String(req.userId)) {
      return res.status(403).json({ message: "Only the batch host can close the batch early" });
    }
    if (batch.status !== "open") {
      return res.status(400).json({ message: "Batch is not open" });
    }

    const closed = await closeBatch(batchId, req.app.get("io"));
    return res.status(200).json({ message: "Batch closed early", batch: closed });
  } catch (error) {
    return res.status(500).json({ message: `close batch error: ${error.message || error}` });
  }
};

/**
 * POST /api/batch/:batchId/leave
 * Non-host member leaves an open batch
 */
export const leaveBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const batch = await Batch.findById(batchId);

    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }
    if (batch.status !== "open") {
      return res.status(400).json({ message: "Cannot leave a batch that is already closed" });
    }
    if (String(batch.host) === String(req.userId)) {
      return res.status(400).json({ message: "Host cannot leave their own batch. Use close early instead." });
    }

    const member = batch.members.find(
      (m) => String(m.user) === String(req.userId) && m.status === "active"
    );
    if (!member) {
      return res.status(400).json({ message: "You are not an active member of this batch" });
    }

    member.status = "left";

    // Handle order cancellation & refund
    if (member.order) {
      const order = await Order.findById(member.order);
      if (order) {
        if (order.paymentMethod === "online" && order.payment && order.razorpayPaymentId) {
          try {
            await instance.payments.refund(order.razorpayPaymentId, {
              amount: Math.round(order.totalAmount * 100)
            });
          } catch (err) {
            console.error("Refund error on batch leave:", err.message);
          }
        }
        await Order.findByIdAndDelete(order._id);
      }
    }

    // Recompute discount tier
    const activeMembers = batch.members.filter((m) => m.status === "active");
    const activeCount = activeMembers.length;
    batch.discountPct = DISCOUNT_TIERS[Math.min(activeCount, BATCH_MAX_MEMBERS)] || 0;
    await batch.save();

    const io = req.app.get("io");
    if (io) {
      const newFeePerMember = computeDeliveryFee(BASE_DELIVERY_FEE, activeCount);
      io.to(`batch:${batchId}`).emit("batchUpdate", {
        batchId,
        memberCount: activeCount,
        discountPct: batch.discountPct,
        newFeePerMember,
        expiresAt: batch.expiresAt
      });
    }

    return res.status(200).json({ message: "Successfully left batch" });
  } catch (error) {
    return res.status(500).json({ message: `leave batch error: ${error.message || error}` });
  }
};
