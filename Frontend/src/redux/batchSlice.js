import { createSlice } from "@reduxjs/toolkit";

const batchSlice = createSlice({
  name: "batch",
  initialState: {
    invites: [], // [{ batchId, shopId, shopName, shopImage, hostFirstName, approxDistanceM, expiresAt, memberCount, discountTiers, currentDiscountPct }]
    activeBatch: null,
    batchCheckout: null, // { batchId, shopId, shopName, discountPct }
    sharedCart: null
  },
  reducers: {
    setInvites: (state, action) => {
      const now = new Date();
      state.invites = (action.payload || []).filter(
        (i) => new Date(i.expiresAt) > now
      );
    },
    addInvite: (state, action) => {
      const invite = action.payload;
      if (!invite || !invite.batchId) return;
      if (new Date(invite.expiresAt) > new Date()) {
        const existingIndex = state.invites.findIndex(
          (i) => i.batchId === invite.batchId
        );
        if (existingIndex !== -1) {
          state.invites[existingIndex] = {
            ...state.invites[existingIndex],
            ...invite
          };
        } else {
          state.invites.push(invite);
        }
      }
    },
    removeInvite: (state, action) => {
      state.invites = state.invites.filter((i) => i.batchId !== action.payload);
    },
    cleanExpiredInvites: (state) => {
      const now = new Date();
      state.invites = state.invites.filter((i) => new Date(i.expiresAt) > now);
    },
    setActiveBatch: (state, action) => {
      state.activeBatch = action.payload;
    },
    updateActiveBatch: (state, action) => {
      if (state.activeBatch && (!action.payload.batchId || state.activeBatch.batchId === action.payload.batchId)) {
        state.activeBatch = { ...state.activeBatch, ...action.payload };
      }
    },
    setBatchCheckout: (state, action) => {
      state.batchCheckout = action.payload;
    },
    clearBatchCheckout: (state) => {
      state.batchCheckout = null;
    },
    setSharedCart: (state, action) => {
      state.sharedCart = action.payload;
    }
  }
});

export const {
  setInvites,
  addInvite,
  removeInvite,
  cleanExpiredInvites,
  setActiveBatch,
  updateActiveBatch,
  setBatchCheckout,
  clearBatchCheckout,
  setSharedCart
} = batchSlice.actions;

export default batchSlice.reducer;
