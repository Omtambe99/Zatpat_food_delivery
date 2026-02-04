import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      requried: true,
    },
    email: {
      type: String,
      requried: true,
      unique: true,
    },
    password: {
      type: String,
      // no need required because from google authentication no need for password
    },
    mobile: {
      type: String,
      requried: true,
    },
    role: {
      type: String,
      enum: ["user", " owner", " deliveryBoy"],
      required: true,
    },
  },
  { timestamps: true },
); // tow object: 1st define schema  and 2nd define timestamps

const User = mongoose.model("User",userSchema);
export default User;
