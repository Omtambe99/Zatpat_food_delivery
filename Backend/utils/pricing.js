import Item from "../models/item.model.js";
import {
  BASE_DELIVERY_FEE,
  FREE_DELIVERY_ABOVE,
  DISCOUNT_TIERS,
  BATCH_MAX_MEMBERS
} from "../config/batch.config.js";

/**
 * Returns base fee (0 if itemsTotal > FREE_DELIVERY_ABOVE), then applies
 * DISCOUNT_TIERS[min(memberCount, BATCH_MAX_MEMBERS)]; round to whole rupees.
 */
export const computeDeliveryFee = (itemsTotal, memberCount = 1) => {
  const deliveryFeeBase = itemsTotal > FREE_DELIVERY_ABOVE ? 0 : BASE_DELIVERY_FEE;
  const count = Math.min(Math.max(memberCount || 1, 1), BATCH_MAX_MEMBERS);
  const discountPct = DISCOUNT_TIERS[count] || 0;
  return Math.round(deliveryFeeBase * (1 - discountPct));
};

/**
 * Computes delivery fee details and total given itemsTotal and memberCount.
 * Returns { itemsTotal, deliveryFeeBase, discountPct, deliveryFee, total }
 */
export const computeOrderPricing = (itemsTotal, memberCount = 1) => {
  const deliveryFeeBase = itemsTotal > FREE_DELIVERY_ABOVE ? 0 : BASE_DELIVERY_FEE;
  const count = Math.min(Math.max(memberCount || 1, 1), BATCH_MAX_MEMBERS);
  const discountPct = DISCOUNT_TIERS[count] || 0;
  const deliveryFee = Math.round(deliveryFeeBase * (1 - discountPct));
  const total = itemsTotal + deliveryFee;

  return {
    itemsTotal,
    deliveryFeeBase,
    discountPct,
    deliveryFee,
    total
  };
};

/**
 * Loads Item docs from DB, recomputes line totals from DB prices,
 * and returns pricing breakdown along with enriched items.
 */
export const priceCart = async (cartItems, memberCount = 1) => {
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return {
      itemsTotal: 0,
      deliveryFeeBase: 0,
      discountPct: 0,
      deliveryFee: 0,
      total: 0,
      pricedItems: []
    };
  }

  const itemIds = cartItems.map(i => i.item || i.id || i._id);
  const dbItems = await Item.find({ _id: { $in: itemIds } });
  const itemMap = new Map(dbItems.map(item => [String(item._id), item]));

  let itemsTotal = 0;
  const pricedItems = [];

  for (const cartItem of cartItems) {
    const id = String(cartItem.item || cartItem.id || cartItem._id);
    const dbItem = itemMap.get(id);
    if (!dbItem) {
      throw new Error(`Item ${id} not found in database`);
    }
    const quantity = Math.max(Number(cartItem.quantity) || 1, 1);
    const linePrice = Number(dbItem.price);
    const lineTotal = linePrice * quantity;
    itemsTotal += lineTotal;

    pricedItems.push({
      item: dbItem._id,
      name: dbItem.name,
      price: linePrice,
      quantity,
      shop: dbItem.shop,
      image: dbItem.image
    });
  }

  const pricing = computeOrderPricing(itemsTotal, memberCount);

  return {
    ...pricing,
    pricedItems
  };
};

/**
 * Splits bill among participants: each participant owes their items total
 * plus an equal share of the delivery fee (with remainder rupees assigned
 * deterministically so shares sum exactly to the total).
 */
export const splitBill = (cart, deliveryFee = null) => {
  const participants = cart?.participants || [];
  if (participants.length === 0) {
    return { total: 0, deliveryFee: 0, shares: [] };
  }

  // Calculate items total per participant
  const participantItemTotals = participants.map(p => {
    const items = p.items || [];
    const itemTotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    return {
      userId: p.user,
      name: p.name,
      itemsTotal: itemTotal
    };
  });

  const overallItemsTotal = participantItemTotals.reduce((sum, p) => sum + p.itemsTotal, 0);

  // If deliveryFee not explicitly provided, compute it
  const actualDeliveryFee = deliveryFee !== null
    ? deliveryFee
    : computeDeliveryFee(overallItemsTotal, participants.length);

  const n = participants.length;
  const baseFeeShare = Math.floor(actualDeliveryFee / n);
  const remainder = actualDeliveryFee % n;

  // Remainder rupees assigned deterministically to the first remainder participants
  const shares = participantItemTotals.map((p, index) => {
    const feeShare = baseFeeShare + (index < remainder ? 1 : 0);
    const participantTotal = p.itemsTotal + feeShare;
    return {
      userId: p.userId,
      name: p.name,
      itemsTotal: p.itemsTotal,
      deliveryFeeShare: feeShare,
      total: participantTotal
    };
  });

  const total = overallItemsTotal + actualDeliveryFee;

  return {
    itemsTotal: overallItemsTotal,
    deliveryFee: actualDeliveryFee,
    total,
    shares
  };
};
