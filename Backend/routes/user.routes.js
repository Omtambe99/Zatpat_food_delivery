import express from "express"
import { getCurrentUser, updateUserLocation, getUserRewards } from "../controllers/user.controllers.js"
import isAuth from "../middlewares/isAuth.js"

const userRouter = express.Router()

userRouter.get("/current", isAuth, getCurrentUser)
userRouter.post('/update-location', isAuth, updateUserLocation)
userRouter.get('/rewards', isAuth, getUserRewards)

export default userRouter