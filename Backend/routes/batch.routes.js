import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { batchJoinLimiter } from "../middlewares/rateLimiter.js";
import {
  getNearbyBatches,
  getBatchById,
  joinBatch,
  closeBatchEarly,
  leaveBatch
} from "../controllers/batch.controllers.js";

const batchRouter = express.Router();

batchRouter.get("/nearby", isAuth, getNearbyBatches);
batchRouter.get("/:batchId", isAuth, getBatchById);
batchRouter.post("/:batchId/join", isAuth, batchJoinLimiter, joinBatch);
batchRouter.post("/:batchId/close", isAuth, closeBatchEarly);
batchRouter.post("/:batchId/leave", isAuth, leaveBatch);

export default batchRouter;
