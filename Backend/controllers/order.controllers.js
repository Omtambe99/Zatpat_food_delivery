import DeliveryAssignment from "../models/deliveryAssignment.model.js"
import Order from "../models/order.model.js"
import Shop from "../models/shop.model.js"
import User from "../models/user.model.js"
import { sendDeliveryOtpMail } from "../utils/mail.js"
import RazorPay from "razorpay"
import dotenv from "dotenv"
import crypto from "crypto"
import { priceCart, computeOrderPricing, computeDeliveryFee } from "../utils/pricing.js"
import { haversineMeters } from "../utils/geo.js"
import { awardPoints, grantBadge, updateStreak } from "../utils/gamification.js"
import Batch from "../models/batch.model.js"
import { createBatchForOrder } from "./batch.controllers.js"
import { closeBatch } from "../utils/batchScheduler.js"
import { DISCOUNT_TIERS, BATCH_MAX_MEMBERS, BASE_DELIVERY_FEE, RIDER_PER_STOP_PAY, RIDER_EXTRA_STOP_BONUS } from "../config/batch.config.js"

dotenv.config()
let instance = new RazorPay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createOrderFromCart = async ({
    userId,
    cartItems,
    paymentMethod,
    deliveryAddress,
    openToNeighbors = false,
    batchId = null,
    sharedCartId = null,
    memberCount = 1
}) => {
    const { itemsTotal, deliveryFeeBase, discountPct, deliveryFee, total, pricedItems } = await priceCart(cartItems, memberCount);

    const groupItemsByShop = {};
    pricedItems.forEach(item => {
        const shopId = String(item.shop);
        if (!groupItemsByShop[shopId]) {
            groupItemsByShop[shopId] = [];
        }
        groupItemsByShop[shopId].push(item);
    });

    const shopIds = Object.keys(groupItemsByShop);
    // Validate all shops BEFORE creating shopOrders
    const shops = await Shop.find({ _id: { $in: shopIds } }).populate("owner");
    if (shops.length !== shopIds.length) {
        throw new Error("One or more shops not found");
    }
    const shopMap = new Map(shops.map(s => [String(s._id), s]));

    for (const shop of shops) {
        if (!shop.owner) {
            throw new Error(`Shop owner not found for shop ${shop.name || shop._id}`);
        }
    }

    const shopOrders = shopIds.map(shopId => {
        const shop = shopMap.get(shopId);
        const items = groupItemsByShop[shopId];
        const subtotal = items.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0);
        return {
            shop: shop._id,
            owner: shop.owner._id,
            subtotal,
            batch: batchId || null,
            shopOrderItems: items.map(i => ({
                item: i.item,
                price: i.price,
                quantity: i.quantity,
                name: i.name
            }))
        };
    });

    return {
        user: userId,
        paymentMethod,
        deliveryAddress,
        itemsTotal,
        deliveryFeeBase,
        deliveryFee,
        batchDiscountPct: discountPct,
        totalAmount: total,
        shopOrders,
        batch: batchId || null,
        sharedCart: sharedCartId || null,
        openToNeighbors: !!openToNeighbors,
        payment: false
    };
};

export const placeOrder = async (req, res) => {
    try {
        const { cartItems, paymentMethod, deliveryAddress, openToNeighbors } = req.body;
        if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
            return res.status(400).json({ message: "cart is empty" });
        }
        if (!deliveryAddress || !deliveryAddress.text || deliveryAddress.latitude == null || deliveryAddress.longitude == null) {
            return res.status(400).json({ message: "send complete deliveryAddress" });
        }

        let orderData;
        try {
            orderData = await createOrderFromCart({
                userId: req.userId,
                cartItems,
                paymentMethod,
                deliveryAddress,
                openToNeighbors: !!openToNeighbors
            });
        } catch (err) {
            return res.status(400).json({ message: err.message || "Failed to validate order items and shops" });
        }

        if (paymentMethod === "online") {
            const razorOrder = await instance.orders.create({
                amount: Math.round(orderData.totalAmount * 100),
                currency: 'INR',
                receipt: `receipt_${Date.now()}`
            });

            orderData.razorpayOrderId = razorOrder.id;
            orderData.payment = false;

            const newOrder = await Order.create(orderData);

            return res.status(200).json({
                razorOrder,
                orderId: newOrder._id,
            });
        }

        const newOrder = await Order.create(orderData);

        const io = req.app.get('io');

        // Phase 2: If COD, single-shop, and openToNeighbors, launch batch window immediately
        if (newOrder.openToNeighbors && newOrder.shopOrders.length === 1) {
            await createBatchForOrder(newOrder, newOrder.shopOrders[0], io);
        }

        await newOrder.populate("shopOrders.shopOrderItems.item", "name image price");
        await newOrder.populate("shopOrders.shop", "name");
        await newOrder.populate("shopOrders.owner", "name socketId");
        await newOrder.populate("user", "name email mobile");

        if (io) {
            newOrder.shopOrders.forEach(shopOrder => {
                const ownerSocketId = shopOrder.owner?.socketId;
                if (ownerSocketId) {
                    io.to(ownerSocketId).emit('newOrder', {
                        _id: newOrder._id,
                        batchId: newOrder.batch || undefined,
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

        return res.status(201).json(newOrder);
    } catch (error) {
        return res.status(500).json({ message: `place order error ${error.message || error}` });
    }
};

export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(400).json({ message: "order not found" });
        }

        const payment = await instance.payments.fetch(razorpay_payment_id);
        if (!payment || payment.status !== "captured") {
            return res.status(400).json({ message: "payment not captured" });
        }

        if (payment.order_id && payment.order_id !== order.razorpayOrderId) {
            return res.status(400).json({ message: "payment order id does not match order" });
        }

        const expectedOrderId = razorpay_order_id || order.razorpayOrderId;
        if (expectedOrderId !== order.razorpayOrderId) {
            return res.status(400).json({ message: "razorpay_order_id does not match order" });
        }

        if (razorpay_signature) {
            const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
            hmac.update(`${expectedOrderId}|${razorpay_payment_id}`);
            const generatedSignature = hmac.digest("hex");
            if (generatedSignature !== razorpay_signature) {
                return res.status(400).json({ message: "invalid payment signature" });
            }
        }

        order.payment = true;
        order.razorpayPaymentId = razorpay_payment_id;
        await order.save();

        const io = req.app.get('io');

        // Phase 2: Check if this was a member joining an existing batch
        if (order.batch) {
            const batch = await Batch.findById(order.batch);
            if (batch && batch.status === "open") {
                await Batch.updateOne(
                    { _id: batch._id, "members.user": req.userId },
                    { $set: { "members.$.status": "active" } }
                );
                const freshBatch = await Batch.findById(batch._id);
                const activeCount = freshBatch.members.filter(m => m.status === "active").length;
                const discountPct = DISCOUNT_TIERS[Math.min(activeCount, BATCH_MAX_MEMBERS)] || 0;
                freshBatch.discountPct = discountPct;
                await freshBatch.save();

                if (io) {
                    const newFeePerMember = computeDeliveryFee(BASE_DELIVERY_FEE, activeCount);
                    io.to(`batch:${batch._id}`).emit("batchUpdate", {
                        batchId: batch._id,
                        memberCount: activeCount,
                        discountPct,
                        newFeePerMember,
                        expiresAt: freshBatch.expiresAt
                    });
                    const memberUser = await User.findById(req.userId).select("socketId");
                    if (memberUser?.socketId) {
                        io.in(memberUser.socketId).socketsJoin(`batch:${batch._id}`);
                    }
                }

                if (activeCount >= freshBatch.maxMembers) {
                    await closeBatch(freshBatch._id, io);
                }
            }
        } else if (order.openToNeighbors && order.shopOrders.length === 1) {
            // Online host order verified: launch batch window now
            await createBatchForOrder(order, order.shopOrders[0], io);
        }

        await order.populate("shopOrders.shopOrderItems.item", "name image price");
        await order.populate("shopOrders.shop", "name");
        await order.populate("shopOrders.owner", "name socketId");
        await order.populate("user", "name email mobile");

        if (io) {
            order.shopOrders.forEach(shopOrder => {
                const ownerSocketId = shopOrder.owner?.socketId;
                if (ownerSocketId) {
                    io.to(ownerSocketId).emit('newOrder', {
                        _id: order._id,
                        batchId: order.batch || undefined,
                        paymentMethod: order.paymentMethod,
                        user: order.user,
                        shopOrders: shopOrder,
                        createdAt: order.createdAt,
                        deliveryAddress: order.deliveryAddress,
                        payment: order.payment
                    });
                }
            });
        }

        return res.status(200).json(order);
    } catch (error) {
        return res.status(500).json({ message: `verify payment error ${error.message || error}` });
    }
};

export const getOrderQuote = async (req, res) => {
    try {
        const { cartItems, memberCount } = req.body;
        if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
            return res.status(400).json({ message: "Cart cannot be empty" });
        }
        const pricing = await priceCart(cartItems, memberCount || 1);
        return res.status(200).json({
            itemsTotal: pricing.itemsTotal,
            deliveryFeeBase: pricing.deliveryFeeBase,
            discountPct: pricing.discountPct,
            deliveryFee: pricing.deliveryFee,
            total: pricing.total
        });
    } catch (error) {
        return res.status(500).json({ message: `quote error: ${error.message || error}` });
    }
};



export const getMyOrders = async (req, res) => {
    try {
        const user = await User.findById(req.userId)
        if (user.role == "user") {
            const orders = await Order.find({ user: req.userId })
                .sort({ createdAt: -1 })
                .populate("batch")
                .populate("shopOrders.shop", "name")
                .populate("shopOrders.owner", "name email mobile")
                .populate("shopOrders.shopOrderItems.item", "name image price")

            return res.status(200).json(orders)
        } else if (user.role == "owner") {
            const orders = await Order.find({ "shopOrders.owner": req.userId })
                .sort({ createdAt: -1 })
                .populate("batch")
                .populate("shopOrders.shop", "name")
                .populate("user")
                .populate("shopOrders.shopOrderItems.item", "name image price")
                .populate("shopOrders.assignedDeliveryBoy", "fullName mobile")

            const filteredOrders = orders.map((order => ({
                _id: order._id,
                paymentMethod: order.paymentMethod,
                user: order.user,
                shopOrders: order.shopOrders.find(o => o.owner._id == req.userId),
                createdAt: order.createdAt,
                deliveryAddress: order.deliveryAddress,
                payment: order.payment,
                batch: order.batch || null
            })))

            return res.status(200).json(filteredOrders)
        }

    } catch (error) {
        return res.status(500).json({ message: `get User order error ${error}` })
    }
}


export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, shopId } = req.params;
        const { status } = req.body;
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(400).json({ message: "order not found" });
        }

        const shopOrder = order.shopOrders.find(o => String(o.shop) === String(shopId));
        if (!shopOrder) {
            return res.status(400).json({ message: "shop order not found" });
        }

        const io = req.app.get('io');
        const batchId = shopOrder.batch || order.batch;

        // Check if this shopOrder belongs to a batch
        if (batchId) {
            const batch = await Batch.findById(batchId).populate("shop").populate("members.user");
            if (batch) {
                // If attempting "out of delivery", verify batch is closed
                if (status === "out of delivery" && batch.status !== "closed" && batch.status !== "dispatched") {
                    return res.status(400).json({ message: "Batch window still open" });
                }

                // If owner changes status on one batch order, apply it to the whole batch for preparing
                if (status === "preparing") {
                    const activeMembers = batch.members.filter(m => m.status === "active");
                    for (const m of activeMembers) {
                        const mOrder = await Order.findById(m.order).populate("user", "socketId");
                        if (mOrder) {
                            const mShopOrder = mOrder.shopOrders.find(so => String(so.shop) === String(shopId));
                            if (mShopOrder) {
                                mShopOrder.status = "preparing";
                                await mOrder.save();
                                if (io && mOrder.user?.socketId) {
                                    io.to(mOrder.user.socketId).emit('update-status', {
                                        orderId: mOrder._id,
                                        shopId,
                                        status: "preparing",
                                        userId: mOrder.user._id
                                    });
                                }
                            }
                        }
                    }
                    return res.status(200).json({ message: "Batch orders updated to preparing" });
                }

                // If "out of delivery": create ONE DeliveryAssignment with stops sorted via greedy nearest-neighbour
                if (status === "out of delivery" && !shopOrder.assignment) {
                    const activeMembers = batch.members.filter(m => m.status === "active");
                    const memberOrders = await Order.find({
                        _id: { $in: activeMembers.map(m => m.order) }
                    }).populate("user", "fullName mobile socketId");

                    const shopDoc = await Shop.findById(shopId);
                    let curLat = shopDoc?.location?.coordinates?.[1] || order.deliveryAddress.latitude;
                    let curLon = shopDoc?.location?.coordinates?.[0] || order.deliveryAddress.longitude;

                    let unrouted = memberOrders.map(mo => {
                        const so = mo.shopOrders.find(s => String(s.shop) === String(shopId));
                        return {
                            orderId: mo._id,
                            order: mo,
                            shopOrderId: so?._id,
                            shopOrder: so,
                            deliveryAddress: mo.deliveryAddress,
                            user: mo.user
                        };
                    }).filter(s => s.shopOrderId);

                    const sortedStops = [];
                    let seq = 1;
                    while (unrouted.length > 0) {
                        let bestIdx = 0;
                        let bestDist = Infinity;
                        for (let i = 0; i < unrouted.length; i++) {
                            const dist = haversineMeters(
                                curLat,
                                curLon,
                                unrouted[i].deliveryAddress.latitude,
                                unrouted[i].deliveryAddress.longitude
                            );
                            if (dist < bestDist) {
                                bestDist = dist;
                                bestIdx = i;
                            }
                        }
                        const [nextStop] = unrouted.splice(bestIdx, 1);
                        nextStop.sequence = seq++;
                        sortedStops.push(nextStop);
                        curLat = nextStop.deliveryAddress.latitude;
                        curLon = nextStop.deliveryAddress.longitude;
                    }

                    // Find nearby available delivery boys within 5km of shop anchor
                    const nearByDeliveryBoys = await User.find({
                        role: "deliveryBoy",
                        location: {
                            $near: {
                                $geometry: { type: "Point", coordinates: [Number(curLon), Number(curLat)] },
                                $maxDistance: 5000
                            }
                        }
                    });

                    const nearByIds = nearByDeliveryBoys.map(b => b._id);
                    const busyIds = await DeliveryAssignment.find({
                        assignedTo: { $in: nearByIds },
                        status: { $nin: ["brodcasted", "completed"] }
                    }).distinct("assignedTo");

                    const busyIdSet = new Set(busyIds.map(id => String(id)));
                    const availableBoys = nearByDeliveryBoys.filter(b => !busyIdSet.has(String(b._id)));
                    const candidates = availableBoys.map(b => b._id);

                    const stopCount = sortedStops.length;
                    const estimatedPayout = RIDER_PER_STOP_PAY * stopCount + RIDER_EXTRA_STOP_BONUS * (stopCount - 1);

                    const deliveryAssignment = await DeliveryAssignment.create({
                        order: order._id,
                        shop: shopId,
                        shopOrderId: shopOrder._id,
                        batch: batch._id,
                        stops: sortedStops.map(s => ({
                            order: s.orderId,
                            shopOrderId: s.shopOrderId,
                            sequence: s.sequence,
                            status: "pending",
                            deliveredAt: null
                        })),
                        brodcastedTo: candidates,
                        status: "brodcasted"
                    });

                    // Set shopOrder.assignment and status on every member shopOrder in this batch
                    for (const s of sortedStops) {
                        const mOrder = s.order;
                        const so = mOrder.shopOrders.id(s.shopOrderId);
                        if (so) {
                            so.assignment = deliveryAssignment._id;
                            so.status = "out of delivery";
                            await mOrder.save();
                        }
                    }

                    batch.status = "dispatched";
                    batch.assignment = deliveryAssignment._id;
                    await batch.save();

                    // Broadcast newAssignment to available delivery boys
                    if (io) {
                        availableBoys.forEach(boy => {
                            if (boy.socketId) {
                                io.to(boy.socketId).emit('newAssignment', {
                                    sentTo: boy._id,
                                    assignmentId: deliveryAssignment._id,
                                    orderId: order._id,
                                    batchId: batch._id,
                                    shopName: shopDoc?.name || "Shop",
                                    stopCount,
                                    estimatedPayout,
                                    stops: sortedStops.map(s => ({
                                        sequence: s.sequence,
                                        deliveryAddress: { text: s.deliveryAddress.text }
                                    }))
                                });
                            }
                        });

                        // Emit update-status to EACH member's socket
                        for (const s of sortedStops) {
                            if (s.user?.socketId) {
                                io.to(s.user.socketId).emit('update-status', {
                                    orderId: s.orderId,
                                    shopId,
                                    status: "out of delivery",
                                    userId: s.user._id
                                });
                            }
                        }
                    }

                    return res.status(200).json({
                        message: "Batch dispatched with multi-stop assignment",
                        assignment: deliveryAssignment._id,
                        stopCount
                    });
                }
            }
        }

        // Standard single-order status update (unchanged)
        shopOrder.status = status;
        let deliveryBoysPayload = [];
        if (status === "out of delivery" && !shopOrder.assignment) {
            const { longitude, latitude } = order.deliveryAddress;
            const nearByDeliveryBoys = await User.find({
                role: "deliveryBoy",
                location: {
                    $near: {
                        $geometry: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
                        $maxDistance: 5000
                    }
                }
            });

            const nearByIds = nearByDeliveryBoys.map(b => b._id);
            const busyIds = await DeliveryAssignment.find({
                assignedTo: { $in: nearByIds },
                status: { $nin: ["brodcasted", "completed"] }
            }).distinct("assignedTo");

            const busyIdSet = new Set(busyIds.map(id => String(id)));
            const availableBoys = nearByDeliveryBoys.filter(b => !busyIdSet.has(String(b._id)));
            const candidates = availableBoys.map(b => b._id);

            if (candidates.length === 0) {
                await order.save();
                return res.json({
                    message: "order status updated but there is no available delivery boys"
                });
            }

            const deliveryAssignment = await DeliveryAssignment.create({
                order: order._id,
                shop: shopOrder.shop,
                shopOrderId: shopOrder._id,
                stops: [{
                    order: order._id,
                    shopOrderId: shopOrder._id,
                    sequence: 1,
                    status: "pending",
                    deliveredAt: null
                }],
                brodcastedTo: candidates,
                status: "brodcasted"
            });

            shopOrder.assignedDeliveryBoy = deliveryAssignment.assignedTo;
            shopOrder.assignment = deliveryAssignment._id;
            deliveryBoysPayload = availableBoys.map(b => ({
                id: b._id,
                fullName: b.fullName,
                longitude: b.location.coordinates?.[0],
                latitude: b.location.coordinates?.[1],
                mobile: b.mobile
            }));

            await deliveryAssignment.populate('order');
            await deliveryAssignment.populate('shop');

            if (io) {
                availableBoys.forEach(boy => {
                    const boySocketId = boy.socketId;
                    if (boySocketId) {
                        io.to(boySocketId).emit('newAssignment', {
                            sentTo: boy._id,
                            assignmentId: deliveryAssignment._id,
                            orderId: deliveryAssignment.order._id,
                            shopName: deliveryAssignment.shop.name,
                            stopCount: 1,
                            estimatedPayout: RIDER_PER_STOP_PAY,
                            deliveryAddress: deliveryAssignment.order.deliveryAddress,
                            stops: [{
                                sequence: 1,
                                deliveryAddress: { text: deliveryAssignment.order.deliveryAddress.text }
                            }],
                            items: deliveryAssignment.order.shopOrders.find(so => so._id.equals(deliveryAssignment.shopOrderId))?.shopOrderItems || [],
                            subtotal: deliveryAssignment.order.shopOrders.find(so => so._id.equals(deliveryAssignment.shopOrderId))?.subtotal
                        });
                    }
                });
            }
        }

        await order.save();
        const updatedShopOrder = order.shopOrders.find(o => String(o.shop) === String(shopId));
        await order.populate("shopOrders.shop", "name");
        await order.populate("shopOrders.assignedDeliveryBoy", "fullName email mobile");
        await order.populate("user", "socketId");

        if (io) {
            const userSocketId = order.user?.socketId;
            if (userSocketId) {
                io.to(userSocketId).emit('update-status', {
                    orderId: order._id,
                    shopId: updatedShopOrder.shop._id,
                    status: updatedShopOrder.status,
                    userId: order.user._id
                });
            }
        }

        return res.status(200).json({
            shopOrder: updatedShopOrder,
            assignedDeliveryBoy: updatedShopOrder?.assignedDeliveryBoy,
            availableBoys: deliveryBoysPayload,
            assignment: updatedShopOrder?.assignment?._id
        });
    } catch (error) {
        return res.status(500).json({ message: `order status error ${error.message || error}` });
    }
};

export const getDeliveryBoyAssignment = async (req, res) => {
    try {
        const deliveryBoyId = req.userId;
        const assignments = await DeliveryAssignment.find({
            brodcastedTo: deliveryBoyId,
            status: "brodcasted"
        })
            .populate({
                path: "order",
                populate: { path: "user", select: "fullName mobile" }
            })
            .populate("shop", "name image")
            .populate({
                path: "stops.order",
                select: "deliveryAddress shopOrders totalAmount paymentMethod"
            });

        const formated = assignments.map(a => {
            const isMultiStop = a.stops && a.stops.length > 0;
            const stopCount = isMultiStop ? a.stops.length : 1;
            const estimatedPayout = RIDER_PER_STOP_PAY * stopCount + RIDER_EXTRA_STOP_BONUS * (stopCount - 1);

            const stopsList = isMultiStop
                ? a.stops.map(s => ({
                    sequence: s.sequence,
                    deliveryAddress: { text: s.order?.deliveryAddress?.text || a.order?.deliveryAddress?.text },
                    status: s.status
                }))
                : [{
                    sequence: 1,
                    deliveryAddress: { text: a.order?.deliveryAddress?.text },
                    status: "pending"
                }];

            return {
                assignmentId: a._id,
                orderId: a.order?._id,
                batchId: a.batch || null,
                shopName: a.shop?.name,
                stopCount,
                estimatedPayout,
                stops: stopsList,
                deliveryAddress: a.order?.deliveryAddress,
                items: a.order?.shopOrders?.find(so => String(so._id) === String(a.shopOrderId))?.shopOrderItems || [],
                subtotal: a.order?.shopOrders?.find(so => String(so._id) === String(a.shopOrderId))?.subtotal
            };
        });

        return res.status(200).json(formated);
    } catch (error) {
        return res.status(500).json({ message: `get Assignment error ${error.message || error}` });
    }
};

export const acceptOrder = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const assignment = await DeliveryAssignment.findById(assignmentId);
        if (!assignment) {
            return res.status(400).json({ message: "assignment not found" });
        }
        if (assignment.status !== "brodcasted") {
            return res.status(400).json({ message: "assignment is expired" });
        }

        const alreadyAssigned = await DeliveryAssignment.findOne({
            assignedTo: req.userId,
            status: { $nin: ["brodcasted", "completed"] }
        });

        if (alreadyAssigned) {
            return res.status(400).json({ message: "You are already assigned to another order" });
        }

        assignment.assignedTo = req.userId;
        assignment.status = 'assigned';
        assignment.acceptedAt = new Date();
        await assignment.save();

        const io = req.app.get('io');
        const riderUser = await User.findById(req.userId).select("socketId");

        // Set assignedDeliveryBoy on every shopOrder in stops
        if (assignment.stops && assignment.stops.length > 0) {
            for (const stop of assignment.stops) {
                const stopOrder = await Order.findById(stop.order);
                if (stopOrder) {
                    const so = stopOrder.shopOrders.id(stop.shopOrderId);
                    if (so) {
                        so.assignedDeliveryBoy = req.userId;
                        await stopOrder.save();
                    }
                }
                // Add rider socket to order:<orderId> room
                if (io && riderUser?.socketId) {
                    io.in(riderUser.socketId).socketsJoin(`order:${stop.order}`);
                }
            }
        }

        if (assignment.order) {
            const order = await Order.findById(assignment.order);
            if (order) {
                let shopOrder = order.shopOrders.id(assignment.shopOrderId);
                if (shopOrder) {
                    shopOrder.assignedDeliveryBoy = req.userId;
                    await order.save();
                }
            }
            if (io && riderUser?.socketId) {
                io.in(riderUser.socketId).socketsJoin(`order:${assignment.order}`);
            }
        }

        if (assignment.batch && io && riderUser?.socketId) {
            io.in(riderUser.socketId).socketsJoin(`batch:${assignment.batch}`);
        }

        return res.status(200).json({
            message: 'order accepted'
        });
    } catch (error) {
        return res.status(500).json({ message: `accept order error ${error.message || error}` });
    }
};

export const getCurrentOrder = async (req, res) => {
    try {
        const assignment = await DeliveryAssignment.findOne({
            assignedTo: req.userId,
            status: "assigned"
        })
            .populate("shop", "name address location")
            .populate("assignedTo", "fullName email mobile location")
            .populate({
                path: "order",
                populate: [{ path: "user", select: "fullName email location mobile" }]
            })
            .populate({
                path: "stops.order",
                populate: [
                    { path: "user", select: "fullName email location mobile" },
                    { path: "shopOrders.shopOrderItems.item", select: "name image price" }
                ]
            });

        if (!assignment) {
            return res.status(400).json({ message: "assignment not found" });
        }

        let deliveryBoyLocation = { lat: null, lon: null };
        if (assignment.assignedTo?.location?.coordinates?.length === 2) {
            deliveryBoyLocation.lat = assignment.assignedTo.location.coordinates[1];
            deliveryBoyLocation.lon = assignment.assignedTo.location.coordinates[0];
        }

        const isMultiStop = assignment.stops && assignment.stops.length > 0;

        let stopsPayload = [];
        let currentStopIndex = 0;

        if (isMultiStop) {
            stopsPayload = assignment.stops.map((stop) => {
                const stopOrder = stop.order;
                const so = stopOrder?.shopOrders?.find(s => String(s._id) === String(stop.shopOrderId));
                const amountToCollect = stopOrder?.paymentMethod === "cod" ? stopOrder.totalAmount : 0;

                return {
                    order: stopOrder?._id,
                    orderDoc: stopOrder,
                    sequence: stop.sequence,
                    user: {
                        name: stopOrder?.user?.fullName || "Customer",
                        mobile: stopOrder?.user?.mobile || ""
                    },
                    deliveryAddress: stopOrder?.deliveryAddress,
                    customerLocation: stopOrder?.deliveryAddress ? {
                        lat: stopOrder.deliveryAddress.latitude,
                        lon: stopOrder.deliveryAddress.longitude
                    } : null,
                    shopOrderId: stop.shopOrderId,
                    shopOrder: so,
                    status: stop.status,
                    deliveredAt: stop.deliveredAt,
                    amountToCollect,
                    paymentMethod: stopOrder?.paymentMethod
                };
            });

            const firstPendingIdx = stopsPayload.findIndex(s => s.status === "pending");
            currentStopIndex = firstPendingIdx !== -1 ? firstPendingIdx : stopsPayload.length - 1;
        } else {
            // Single stop compatibility
            const shopOrder = assignment.order?.shopOrders?.find(so => String(so._id) === String(assignment.shopOrderId));
            const amountToCollect = assignment.order?.paymentMethod === "cod" ? assignment.order.totalAmount : 0;

            stopsPayload = [{
                order: assignment.order?._id,
                orderDoc: assignment.order,
                sequence: 1,
                user: {
                    name: assignment.order?.user?.fullName,
                    mobile: assignment.order?.user?.mobile
                },
                deliveryAddress: assignment.order?.deliveryAddress,
                customerLocation: assignment.order?.deliveryAddress ? {
                    lat: assignment.order.deliveryAddress.latitude,
                    lon: assignment.order.deliveryAddress.longitude
                } : null,
                shopOrderId: assignment.shopOrderId,
                shopOrder,
                status: shopOrder?.status === "delivered" ? "delivered" : "pending",
                amountToCollect,
                paymentMethod: assignment.order?.paymentMethod
            }];
            currentStopIndex = 0;
        }

        const currentStop = stopsPayload[currentStopIndex] || stopsPayload[0];

        return res.status(200).json({
            _id: assignment.order?._id,
            user: currentStop?.user,
            shopOrder: currentStop?.shopOrder,
            deliveryAddress: currentStop?.deliveryAddress,
            deliveryBoyLocation,
            customerLocation: currentStop?.customerLocation,
            batch: assignment.batch || null,
            stops: stopsPayload,
            currentStopIndex,
            shop: assignment.shop
        });
    } catch (error) {
        return res.status(500).json({ message: `get current order error ${error.message || error}` });
    }
};

export const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId)
            .populate("user")
            .populate("batch")
            .populate({
                path: "shopOrders.shop",
                model: "Shop"
            })
            .populate({
                path: "shopOrders.assignedDeliveryBoy",
                model: "User"
            })
            .populate({
                path: "shopOrders.shopOrderItems.item",
                model: "Item"
            })
            .lean();

        if (!order) {
            return res.status(400).json({ message: "order not found" });
        }
        return res.status(200).json(order);
    } catch (error) {
        return res.status(500).json({ message: `get by id order error ${error.message || error}` });
    }
};

export const sendDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId } = req.body;
        const order = await Order.findById(orderId).populate("user");
        const shopOrder = order.shopOrders.id(shopOrderId);
        if (!order || !shopOrder) {
            return res.status(400).json({ message: "enter valid order/shopOrderid" });
        }
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        shopOrder.deliveryOtp = otp;
        shopOrder.otpExpires = Date.now() + 5 * 60 * 1000;
        await order.save();
        await sendDeliveryOtpMail(order.user, otp);
        return res.status(200).json({ message: `Otp sent Successfuly to ${order?.user?.fullName}` });
    } catch (error) {
        return res.status(500).json({ message: `delivery otp error ${error.message || error}` });
    }
};

export const verifyDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId, otp } = req.body;
        const order = await Order.findById(orderId).populate("user");
        if (!order) {
            return res.status(400).json({ message: "order not found" });
        }
        const shopOrder = order.shopOrders.id(shopOrderId);
        if (!shopOrder) {
            return res.status(400).json({ message: "shopOrder not found" });
        }
        if (shopOrder.deliveryOtp !== otp || !shopOrder.otpExpires || shopOrder.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid/Expired Otp" });
        }

        shopOrder.status = "delivered";
        shopOrder.deliveredAt = Date.now();
        await order.save();

        const io = req.app.get('io');
        if (io && order.user?.socketId) {
            io.to(order.user.socketId).emit('update-status', {
                orderId: order._id,
                shopId: shopOrder.shop,
                status: "delivered",
                userId: order.user._id
            });
        }

        // Find assignment
        const assignment = await DeliveryAssignment.findOne({
            $or: [
                { shopOrderId: shopOrder._id },
                { "stops.shopOrderId": shopOrder._id }
            ],
            assignedTo: shopOrder.assignedDeliveryBoy
        });

        if (assignment) {
            if (assignment.stops && assignment.stops.length > 0) {
                const stop = assignment.stops.find(s => String(s.shopOrderId) === String(shopOrderId));
                if (stop) {
                    stop.status = "delivered";
                    stop.deliveredAt = new Date();
                }

                const allDelivered = assignment.stops.every(s => s.status === "delivered");
                if (allDelivered) {
                    assignment.status = "completed";
                    await assignment.save();

                    // Complete batch and trigger gamification awards
                    if (assignment.batch) {
                        const batch = await Batch.findById(assignment.batch).populate("members.user");
                        if (batch) {
                            batch.status = "completed";
                            await batch.save();

                            const activeMembers = batch.members.filter(m => m.status === "active");
                            const memberCount = activeMembers.length;
                            const hostId = batch.host;

                            const startOfToday = new Date();
                            startOfToday.setHours(0, 0, 0, 0);

                            // Anti-abuse: Cap 10 rewarded batches per user per day
                            const hostRewardedCount = await Batch.countDocuments({
                                host: hostId,
                                status: "completed",
                                updatedAt: { $gte: startOfToday }
                            });
                            const hostCanEarn = hostRewardedCount <= 10;

                            // Host +10 when batch completes with >= 2 members
                            if (memberCount >= 2 && hostCanEarn) {
                                await awardPoints(hostId, 10, "batch_completed_multi_member");
                            }

                            // Host stats & badges
                            const hostUser = await User.findById(hostId);
                            if (hostUser) {
                                if (!hostUser.gamification) {
                                    hostUser.gamification = { points: 0, streakDays: 0, batchesHosted: 0, batchesJoined: 0, totalSaved: 0, badges: [] };
                                }
                                hostUser.gamification.batchesHosted = (hostUser.gamification.batchesHosted || 0) + 1;
                                await hostUser.save();

                                if (hostUser.gamification.batchesHosted >= 5) {
                                    await grantBadge(hostId, "block_captain");
                                }
                                if (memberCount >= 4) {
                                    await grantBadge(hostId, "street_hero");
                                }
                                if (hostUser.gamification.totalSaved >= 500) {
                                    await grantBadge(hostId, "penny_saver");
                                }
                                await updateStreak(hostId);

                                if (io && hostUser.socketId) {
                                    const refreshedHost = await User.findById(hostId);
                                    io.to(hostUser.socketId).emit("rewardEarned", {
                                        points: refreshedHost?.gamification?.points,
                                        streakDays: refreshedHost?.gamification?.streakDays,
                                        badges: refreshedHost?.gamification?.badges,
                                        pointsEarned: memberCount >= 2 ? 10 + (memberCount - 1) * 15 : 0,
                                        reason: `Batch Completed with ${memberCount} neighbors!`
                                    });
                                }
                            }

                            for (const m of activeMembers) {
                                const memberId = m.user?._id || m.user;
                                const isHost = String(memberId) === String(hostId);
                                if (!isHost) {
                                    const memberRewardedCount = await Batch.countDocuments({
                                        "members.user": memberId,
                                        status: "completed",
                                        updatedAt: { $gte: startOfToday }
                                    });
                                    const memberCanEarn = memberRewardedCount <= 10;

                                    if (memberCanEarn) {
                                        // Neighbor +20 on completed delivery
                                        await awardPoints(memberId, 20, "neighbor_batch_joined");
                                        if (hostCanEarn) {
                                            // Host +15 per neighbor who joined
                                            await awardPoints(hostId, 15, "neighbor_joined_host_bonus");
                                        }
                                    }

                                    // Grant first_neighbor badge
                                    await grantBadge(memberId, "first_neighbor");

                                    // Early Bird badge: joined within 2 min of batch creation
                                    if (batch.createdAt && m.joinedAt) {
                                        const delayMs = new Date(m.joinedAt).getTime() - new Date(batch.createdAt).getTime();
                                        if (delayMs <= 2 * 60 * 1000) {
                                            await grantBadge(memberId, "early_bird");
                                        }
                                    }

                                    const memberUser = await User.findById(memberId);
                                    if (memberUser) {
                                        if (!memberUser.gamification) {
                                            memberUser.gamification = { points: 0, streakDays: 0, batchesHosted: 0, batchesJoined: 0, totalSaved: 0, badges: [] };
                                        }
                                        memberUser.gamification.batchesJoined = (memberUser.gamification.batchesJoined || 0) + 1;
                                        if (memberUser.gamification.totalSaved >= 500) {
                                            await grantBadge(memberId, "penny_saver");
                                        }
                                        await memberUser.save();
                                    }

                                    await updateStreak(memberId);

                                    const refreshedMember = await User.findById(memberId);
                                    if (io && refreshedMember?.socketId) {
                                        io.to(refreshedMember.socketId).emit("rewardEarned", {
                                            points: refreshedMember.gamification?.points,
                                            streakDays: refreshedMember.gamification?.streakDays,
                                            badges: refreshedMember.gamification?.badges,
                                            pointsEarned: 20,
                                            reason: "Batch Order Delivered! Earned 20 Points!"
                                        });
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // Multi-stop assignment remains assigned until all stops delivered
                    assignment.status = "assigned";
                    await assignment.save();
                }
            } else {
                assignment.status = "completed";
                await assignment.save();
            }
        }

        return res.status(200).json({ message: "Order Delivered Successfully!" });
    } catch (error) {
        return res.status(500).json({ message: `verify delivery otp error ${error.message || error}` });
    }
};

export const getTodayDeliveries=async (req,res) => {
    try {
        const deliveryBoyId=req.userId
        const startsOfDay=new Date()
        startsOfDay.setHours(0,0,0,0)

        const orders=await Order.find({
           "shopOrders.assignedDeliveryBoy":deliveryBoyId,
           "shopOrders.status":"delivered",
           "shopOrders.deliveredAt":{$gte:startsOfDay}
        }).lean()

     let todaysDeliveries=[] 
     
     orders.forEach(order=>{
        order.shopOrders.forEach(shopOrder=>{
            if(shopOrder.assignedDeliveryBoy==deliveryBoyId &&
                shopOrder.status=="delivered" &&
                shopOrder.deliveredAt &&
                shopOrder.deliveredAt>=startsOfDay
            ){
                todaysDeliveries.push(shopOrder)
            }
        })
     })

let stats={}

todaysDeliveries.forEach(shopOrder=>{
    const hour=new Date(shopOrder.deliveredAt).getHours()
    stats[hour]=(stats[hour] || 0) + 1
})

let formattedStats=Object.keys(stats).map(hour=>({
 hour:parseInt(hour),
 count:stats[hour]   
}))

formattedStats.sort((a,b)=>a.hour-b.hour)

return res.status(200).json(formattedStats)
  

    } catch (error) {
        return res.status(500).json({ message: `today deliveries error ${error}` }) 
    }
}



