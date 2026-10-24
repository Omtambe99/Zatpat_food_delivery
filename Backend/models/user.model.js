import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
    },
    mobile: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "owner", "deliveryBoy"],
      required: true,
    },
    resetOtp: {
      type: String,
    },
    isOtpVerified: {
      type: Boolean,
      default: false,
    },
    otpExpires: {
      type: Date,
    },
    socketId: {
      type: String,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    locationMode: {
      type: String,
      enum: ["auto", "manual"],
      default: "auto",
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    gamification: {
      points: { type: Number, default: 0 },
      streakDays: { type: Number, default: 0 },
      lastBatchDate: { type: Date, default: null },
      batchesHosted: { type: Number, default: 0 },
      batchesJoined: { type: Number, default: 0 },
      totalSaved: { type: Number, default: 0 },
      badges: [
        {
          key: { type: String, required: true },
          earnedAt: { type: Date, default: Date.now },
        },
      ],
    },
  },
  { timestamps: true },
);

userSchema.index({ location: "2dsphere" });

const User = mongoose.model("User", userSchema);
export default User;
