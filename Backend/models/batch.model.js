import mongoose from "mongoose";
import { BATCH_MAX_MEMBERS } from "../config/batch.config.js";

const batchMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order"
  },
  shopOrderId: {
    type: mongoose.Schema.Types.ObjectId
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  itemsTotal: {
    type: Number,
    default: 0
  },
  feePaidAtJoin: {
    type: Number,
    default: 0
  },
  finalDeliveryFee: {
    type: Number,
    default: 0
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ["active", "left", "pending"],
    default: "active"
  }
});

const batchSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true
    },
    anchor: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    status: {
      type: String,
      enum: ["open", "closed", "dispatched", "completed", "expired"],
      default: "open"
    },
    expiresAt: {
      type: Date,
      required: true
    },
    closedAt: {
      type: Date,
      default: null
    },
    maxMembers: {
      type: Number,
      default: BATCH_MAX_MEMBERS
    },
    members: [batchMemberSchema],
    discountPct: {
      type: Number,
      default: 0
    },
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryAssignment",
      default: null
    },
    invitedUserIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  { timestamps: true }
);

batchSchema.index({ anchor: "2dsphere" });
batchSchema.index({ status: 1, expiresAt: 1 });
batchSchema.index({ shop: 1, status: 1 });

const Batch = mongoose.model("Batch", batchSchema);
export default Batch;
