import express from "express"
import dotenv from "dotenv"
dotenv.config()
import connectDb from "./config/db.js"

const app=express() //express ke sare features accesss through app
const port=process.env.PORT || 5000

app.listen(port,()=> {
    connectDb();
    console.log(`server started at ${port}`)
})
