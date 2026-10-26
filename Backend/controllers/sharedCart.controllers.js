import SharedCart from "../models/sharedCart.model.js";
import Shop from "../models/shop.model.js";
import User from "../models/user.model.js";
import Item from "../models/item.model.js";
import Order from "../models/order.model.js";
import { priceCart, splitBill } from "../utils/pricing.js";
import { createOrderFromCart } from "./order.controllers.js";
import { createBatchForOrder } from "./batch.controllers.js";
import RazorPay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

let instance = new RazorPay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Generates a unique 6-character uppercase alphanumeric code
 */
const generateUniqueCode = async () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous 0, O, 1, I
  let code = "";
  let exists = true;
  while (exists) {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const found = await SharedCart.findOne({ code });
    if (!found) exists = false;
  }
  return code;
};

/**
 * Helper to build sanitised cart payload with bill breakdown
 */
const formatCartResponse = (cart, currentUserId = null) => {
  const isHost = currentUserId
    ? String(cart.host?._id || cart.host) === String(currentUserId)
    : false;
  const isParticipant = currentUserId
    ? cart.participants.some(
        (p) => String(p.user?._id || p.user) === String(currentUserId)
      )
    : false;

  const bill = splitBill(cart);

  return {
    cart: {
      _id: cart._id,
      code: cart.code,
      shop: cart.shop,
      status: cart.status,
      expiresAt: cart.expiresAt,
      host: cart.host,
      isHost,
      isParticipant,
      canJoin: cart.status === "open" && cart.participants.length < 10,
      participants: cart.participants.map((p) => ({
        user: p.user?._id || p.user,
        name: p.name,
        joinedAt: p.joinedAt,
        ready: Boolean(p.ready),
        isSelf: currentUserId
          ? String(p.user?._id || p.user) === String(currentUserId)
          : false,
        items: p.items || []
      })),
      openToNeighbors: cart.openToNeighbors,
      order: cart.order
    },
    bill
  };
};

/**
 * POST /api/group-cart/create
 * Creates a new shared group cart for a shop
 */
export const createSharedCart = async (req, res) => {
  try {
    const { shopId } = req.body;
    if (!shopId) {
      return res.status(400).json({ message: "shopId is required" });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const hostUser = await User.findById(req.userId);
    if (!hostUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const code = await generateUniqueCode();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes default

    const cart = await SharedCart.create({
      code,
      host: req.userId,
      shop: shopId,
      status: "open",
      expiresAt,
      participants: [
        {
          user: req.userId,
          name: hostUser.fullName,
          joinedAt: new Date(),
          ready: false,
          items: []
        }
      ]
    });

    await cart.populate("shop", "name image address");
    await cart.populate("host", "fullName mobile");

    return res.status(201).json({
      code: cart.code,
      link: `/group/${cart.code}`,
      cart
    });
  } catch (error) {
    return res.status(500).json({ message: `create group cart error: ${error.message || error}` });
  }
};

/**
 * GET /api/group-cart/:code
 * Returns cart state & bill breakdown
 */
export const getSharedCartByCode = async (req, res) => {
  try {
    const code = req.params.code?.toUpperCase();
    const cart = await SharedCart.findOne({ code })
      .populate("shop", "name image address")
      .populate("host", "fullName");

    if (!cart) {
      return res.status(404).json({ message: "Shared cart not found" });
    }

    if (cart.expiresAt <= new Date() && cart.status === "open") {
      cart.status = "expired";
      await cart.save();
    }

    const response = formatCartResponse(cart, req.userId);
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ message: `get group cart error: ${error.message || error}` });
  }
};

/**
 * POST /api/group-cart/:code/join
 * Join an open shared cart
 */
export const joinSharedCart = async (req, res) => {
  try {
    const code = req.params.code?.toUpperCase();
    const cart = await SharedCart.findOne({ code })
      .populate("shop", "name image address")
      .populate("host", "fullName");

    if (!cart) {
      return res.status(404).json({ message: "Shared cart not found" });
    }

    if (cart.status !== "open" || cart.expiresAt <= new Date()) {
      return res.status(400).json({ message: "This group cart is no longer open" });
    }

    const isAlreadyMember = cart.participants.some(
      (p) => String(p.user) === String(req.userId)
    );

    if (!isAlreadyMember) {
      if (cart.participants.length >= 10) {
        return res.status(400).json({ message: "Group cart has reached maximum capacity (10 participants)" });
      }

      const user = await User.findById(req.userId);
      cart.participants.push({
        user: req.userId,
        name: user?.fullName || "Participant",
        joinedAt: new Date(),
        ready: false,
        items: []
      });

      await cart.save();
    }

    const response = formatCartResponse(cart, req.userId);
    const broadcastPayload = formatCartResponse(cart, null);

    const io = req.app.get("io");
    if (io) {
      io.to(`cart:${code}`).emit("cartUpdated", broadcastPayload);
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ message: `join group cart error: ${error.message || error}` });
  }
};

/**
 * PUT /api/group-cart/:code/items
 * Participant replaces their OWN items (prices validated from DB)
 */
export const updateParticipantItems = async (req, res) => {
  try {
    const code = req.params.code?.toUpperCase();
    const { items } = req.body; // array of { item, quantity }

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "items must be an array" });
    }

    const cart = await SharedCart.findOne({ code })
      .populate("shop", "name image address")
      .populate("host", "fullName");

    if (!cart) {
      return res.status(404).json({ message: "Shared cart not found" });
    }

    if (cart.status !== "open" || cart.expiresAt <= new Date()) {
      return res.status(400).json({ message: "Cannot edit items: cart is locked or expired" });
    }

    const participant = cart.participants.find(
      (p) => String(p.user) === String(req.userId)
    );

    if (!participant) {
      return res.status(403).json({ message: "You are not a member of this group cart" });
    }

    // Validate and enrich items from database
    const validatedItems = [];
    if (items.length > 0) {
      const itemIds = items.map((i) => i.item || i.id || i._id);
      const dbItems = await Item.find({ _id: { $in: itemIds } });
      const itemMap = new Map(dbItems.map((it) => [String(it._id), it]));

      for (const reqItem of items) {
        const id = String(reqItem.item || reqItem.id || reqItem._id);
        const dbItem = itemMap.get(id);
        if (!dbItem) {
          return res.status(400).json({ message: `Item ${id} not found` });
        }
        if (String(dbItem.shop) !== String(cart.shop._id || cart.shop)) {
          return res.status(400).json({ message: "All items must be from the group cart's restaurant" });
        }

        const quantity = Math.max(Number(reqItem.quantity) || 1, 1);
        validatedItems.push({
          item: dbItem._id,
          name: dbItem.name,
          price: Number(dbItem.price),
          quantity,
          image: dbItem.image
        });
      }
    }

    participant.items = validatedItems;
    await cart.save();

    const response = formatCartResponse(cart, req.userId);
    const broadcastPayload = formatCartResponse(cart, null);

    const io = req.app.get("io");
    if (io) {
      io.to(`cart:${code}`).emit("cartUpdated", broadcastPayload);
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ message: `update items error: ${error.message || error}` });
  }
};

/**
 * POST /api/group-cart/:code/ready
 * Toggle ready status of a participant
 */
export const toggleParticipantReady = async (req, res) => {
  try {
    const code = req.params.code?.toUpperCase();
    const cart = await SharedCart.findOne({ code })
      .populate("shop", "name image address")
      .populate("host", "fullName");

    if (!cart) {
      return res.status(404).json({ message: "Shared cart not found" });
    }

    const participant = cart.participants.find(
      (p) => String(p.user?._id || p.user) === String(req.userId)
    );

    if (!participant) {
      return res.status(403).json({ message: "You are not a member of this group cart" });
    }

    participant.ready = !participant.ready;
    await cart.save();

    const response = formatCartResponse(cart, req.userId);
    const broadcastPayload = formatCartResponse(cart, null);

    const io = req.app.get("io");
    if (io) {
      io.to(`cart:${code}`).emit("cartUpdated", broadcastPayload);
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ message: `toggle ready error: ${error.message || error}` });
  }
};

/**
 * POST /api/group-cart/:code/lock
 * Host locks the cart so no more items can be edited
 */
export const lockSharedCart = async (req, res) => {
  try {
    const code = req.params.code?.toUpperCase();
    const cart = await SharedCart.findOne({ code })
      .populate("shop", "name image address")
      .populate("host", "fullName");

    if (!cart) {
      return res.status(404).json({ message: "Shared cart not found" });
    }

    if (String(cart.host._id || cart.host) !== String(req.userId)) {
      return res.status(403).json({ message: "Only the group cart host can lock the cart" });
    }

    cart.status = "locked";
    await cart.save();

    const response = formatCartResponse(cart, req.userId);
    const broadcastPayload = formatCartResponse(cart, null);

    const io = req.app.get("io");
    if (io) {
      io.to(`cart:${code}`).emit("cartLocked", { code });
      io.to(`cart:${code}`).emit("cartUpdated", broadcastPayload);
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ message: `lock cart error: ${error.message || error}` });
  }
};

/**
 * POST /api/group-cart/:code/unlock
 * Host unlocks the cart so participants can edit dishes again
 */
export const unlockSharedCart = async (req, res) => {
  try {
    const code = req.params.code?.toUpperCase();
    const cart = await SharedCart.findOne({ code })
      .populate("shop", "name image address")
      .populate("host", "fullName");

    if (!cart) {
      return res.status(404).json({ message: "Shared cart not found" });
    }

    if (String(cart.host._id || cart.host) !== String(req.userId)) {
      return res.status(403).json({ message: "Only the group cart host can unlock the cart" });
    }

    if (cart.status === "checked_out") {
      return res.status(400).json({ message: "Cannot unlock an order that is already checked out" });
    }

    cart.status = "open";
    await cart.save();

    const response = formatCartResponse(cart, req.userId);
    const broadcastPayload = formatCartResponse(cart, null);

    const io = req.app.get("io");
    if (io) {
      io.to(`cart:${code}`).emit("cartUnlocked", { code });
      io.to(`cart:${code}`).emit("cartUpdated", broadcastPayload);
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ message: `unlock cart error: ${error.message || error}` });
  }
};

/**
 * POST /api/group-cart/:code/checkout
 * Host completes order for the shared cart (v1: host pays full order, UI shows who owes what)
 */
export const checkoutSharedCart = async (req, res) => {
  try {
    const code = req.params.code?.toUpperCase();
    const { paymentMethod, deliveryAddress, openToNeighbors } = req.body;

    const cart = await SharedCart.findOne({ code })
      .populate("shop", "name image address")
      .populate("host", "fullName email mobile");

    if (!cart) {
      return res.status(404).json({ message: "Shared cart not found" });
    }

    if (String(cart.host._id || cart.host) !== String(req.userId)) {
      return res.status(403).json({ message: "Only the host can checkout the shared cart" });
    }

    if (cart.status === "checked_out") {
      return res.status(400).json({ message: "This shared cart has already been checked out" });
    }

    // Flatten all items across all participants
    const combinedCartItems = [];
    cart.participants.forEach((p) => {
      (p.items || []).forEach((it) => {
        combinedCartItems.push({
          item: it.item,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          image: it.image,
          shop: cart.shop._id || cart.shop,
          orderedBy: p.name,
          userId: p.user
        });
      });
    });

    if (combinedCartItems.length === 0) {
      return res.status(400).json({ message: "Cannot checkout an empty group cart" });
    }

    if (!deliveryAddress || !deliveryAddress.text || deliveryAddress.latitude == null || deliveryAddress.longitude == null) {
      return res.status(400).json({ message: "Complete delivery address is required" });
    }

    // Build Order using createOrderFromCart
    const orderData = await createOrderFromCart({
      userId: req.userId,
      cartItems: combinedCartItems,
      paymentMethod,
      deliveryAddress,
      openToNeighbors: !!openToNeighbors,
      sharedCartId: cart._id,
      memberCount: 1
    });

    const bill = splitBill(cart);

    // TODO: v2 per-person Razorpay split payments
    if (paymentMethod === "online") {
      const razorOrder = await instance.orders.create({
        amount: Math.round(orderData.totalAmount * 100),
        currency: "INR",
        receipt: `receipt_group_${Date.now()}`
      });

      orderData.razorpayOrderId = razorOrder.id;
      orderData.payment = false;
      const newOrder = await Order.create(orderData);

      cart.status = "checked_out";
      cart.order = newOrder._id;
      await cart.save();

      const io = req.app.get("io");
      if (io) {
        io.to(`cart:${code}`).emit("cartCheckedOut", {
          orderId: newOrder._id,
          totalAmount: newOrder.totalAmount,
          splits: bill.shares
        });
      }

      return res.status(200).json({
        razorOrder,
        orderId: newOrder._id,
        splits: bill.shares
      });
    }

    // COD flow
    const newOrder = await Order.create(orderData);
    cart.status = "checked_out";
    cart.order = newOrder._id;
    await cart.save();

    const io = req.app.get("io");
    if (newOrder.openToNeighbors && newOrder.shopOrders?.length === 1) {
      await createBatchForOrder(newOrder, newOrder.shopOrders[0], io);
    }

    if (io) {
      io.to(`cart:${code}`).emit("cartCheckedOut", {
        orderId: newOrder._id,
        totalAmount: newOrder.totalAmount,
        splits: bill.shares
      });

      // Notify shop owner
      await newOrder.populate("shopOrders.shopOrderItems.item", "name image price");
      await newOrder.populate("shopOrders.shop", "name");
      await newOrder.populate("shopOrders.owner", "name socketId");
      await newOrder.populate("user", "name email mobile");

      newOrder.shopOrders.forEach((shopOrder) => {
        const ownerSocketId = shopOrder.owner?.socketId;
        if (ownerSocketId) {
          io.to(ownerSocketId).emit("newOrder", {
            _id: newOrder._id,
            sharedCartId: cart._id,
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

    return res.status(201).json({
      order: newOrder,
      splits: bill.shares,
      cart
    });
  } catch (error) {
    return res.status(500).json({ message: `checkout group cart error: ${error.message || error}` });
  }
};

/**
 * GET /api/group-cart/user/active
 * Finds the current user's most recent active group cart
 */
export const getMyActiveSharedCart = async (req, res) => {
  try {
    const cart = await SharedCart.findOne({
      status: { $in: ["open", "locked"] },
      expiresAt: { $gt: new Date() },
      $or: [
        { host: req.userId },
        { "participants.user": req.userId }
      ]
    })
      .sort({ updatedAt: -1 })
      .populate("shop", "name image address")
      .populate("host", "fullName");

    if (!cart) {
      return res.status(200).json({ cart: null });
    }

    return res.status(200).json(formatCartResponse(cart, req.userId));
  } catch (error) {
    return res.status(500).json({ message: `get active cart error: ${error.message || error}` });
  }
};

/**
 * POST /api/group-cart/:code/leave
 * Participant voluntarily leaves the group cart and removes their items in real time
 */
export const leaveSharedCart = async (req, res) => {
  try {
    const code = req.params.code?.toUpperCase();
    const cart = await SharedCart.findOne({ code })
      .populate("shop", "name image address")
      .populate("host", "fullName");

    if (!cart) {
      return res.status(404).json({ message: "Shared cart not found" });
    }

    if (cart.status === "checked_out") {
      return res.status(400).json({ message: "Cannot leave a cart that is already checked out" });
    }

    const participantIdx = cart.participants.findIndex(
      (p) => String(p.user?._id || p.user) === String(req.userId)
    );

    if (participantIdx === -1) {
      return res.status(400).json({ message: "You are not a participant in this group cart" });
    }

    const leavingParticipant = cart.participants[participantIdx];
    const leavingName = leavingParticipant.name || "A participant";
    const isLeavingHost = String(cart.host?._id || cart.host) === String(req.userId);

    // Remove participant from cart
    cart.participants.splice(participantIdx, 1);

    // Handle host leaving
    if (isLeavingHost) {
      if (cart.participants.length > 0) {
        cart.host = cart.participants[0].user;
      } else {
        cart.status = "expired";
      }
    }

    await cart.save();

    const broadcastPayload = formatCartResponse(cart, null);
    const io = req.app.get("io");
    if (io) {
      io.to(`cart:${code}`).emit("cartUpdated", broadcastPayload);
      io.to(`cart:${code}`).emit("participantLeft", {
        code,
        userId: req.userId,
        name: leavingName,
        newHostId: isLeavingHost && cart.participants.length > 0 ? cart.host : null
      });
    }

    return res.status(200).json({
      message: "Left group cart successfully",
      cartStatus: cart.status
    });
  } catch (error) {
    return res.status(500).json({ message: `leave cart error: ${error.message || error}` });
  }
};
