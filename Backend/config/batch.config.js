export const BATCH_WINDOW_MS = 10 * 60 * 1000;
export const BATCH_RADIUS_M = 300;
export const BATCH_MAX_MEMBERS = 5;          // host + 4 neighbors
export const BATCH_MIN_ITEMS_TOTAL = 99;     // per member, anti-abuse
export const BASE_DELIVERY_FEE = 40;         // matches current checkout logic
export const FREE_DELIVERY_ABOVE = 500;
// discount on each member's delivery fee, by member count
export const DISCOUNT_TIERS = { 1: 0, 2: 0.3, 3: 0.5, 4: 0.65, 5: 0.8 };
export const RIDER_PER_STOP_PAY = 50;
export const RIDER_EXTRA_STOP_BONUS = 20;
