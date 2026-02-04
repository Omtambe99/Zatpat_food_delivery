import mongoose from "mongoose";

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("mongodb connected");
  } catch (error) {
    console.log("DB Connection Error:", error);
    process.exit(1); // Exit the process with a failure code
  }
};
export default connectDb;
