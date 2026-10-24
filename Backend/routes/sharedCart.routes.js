import express from "express";
import isAuth, { optionalAuth } from "../middlewares/isAuth.js";
import { groupCartItemsLimiter } from "../middlewares/rateLimiter.js";
import {
  createSharedCart,
  getSharedCartByCode,
  joinSharedCart,
  updateParticipantItems,
  toggleParticipantReady,
  lockSharedCart,
  unlockSharedCart,
  checkoutSharedCart
} from "../controllers/sharedCart.controllers.js";

const sharedCartRouter = express.Router();

sharedCartRouter.post("/create", isAuth, createSharedCart);
sharedCartRouter.get("/:code", optionalAuth, getSharedCartByCode);
sharedCartRouter.post("/:code/join", isAuth, joinSharedCart);
sharedCartRouter.put("/:code/items", isAuth, groupCartItemsLimiter, updateParticipantItems);
sharedCartRouter.post("/:code/ready", isAuth, toggleParticipantReady);
sharedCartRouter.post("/:code/lock", isAuth, lockSharedCart);
sharedCartRouter.post("/:code/unlock", isAuth, unlockSharedCart);
sharedCartRouter.post("/:code/checkout", isAuth, checkoutSharedCart);

export default sharedCartRouter;
