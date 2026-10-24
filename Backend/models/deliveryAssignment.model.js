import mongoose from "mongoose";

const deliveryAssignmentSchema = new mongoose.Schema({
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order"
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop"
    },
    batch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Batch",
        default: null
    },
    stops: [
        {
            order: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Order"
            },
            shopOrderId: {
                type: mongoose.Schema.Types.ObjectId
            },
            sequence: {
                type: Number,
                default: 1
            },
            status: {
                type: String,
                enum: ["pending", "delivered"],
                default: "pending"
            },
            deliveredAt: {
                type: Date,
                default: null
            }
        }
    ],
    shopOrderId:{
         type: mongoose.Schema.Types.ObjectId,
         default: null
    },
    brodcastedTo:[
        {
         type: mongoose.Schema.Types.ObjectId,
         ref:"User"
    }
    ],
    assignedTo:{
        type: mongoose.Schema.Types.ObjectId,
         ref:"User",
         default:null
    },
    counteredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    offeredFee: {
        type: Number,
        default: 0,
    },
    counterOfferFee: {
        type: Number,
        default: null,
    },
    bidStatus: {
        type: String,
        enum: ["pending", "countered", "accepted", "rejected"],
        default: "pending",
    },
    bidHistory: [
        {
            fromRole: {
                type: String,
                enum: ["owner", "deliveryBoy"],
                required: true,
            },
            action: {
                type: String,
                enum: ["offer", "counter", "accept", "reject"],
                required: true,
            },
            fee: {
                type: Number,
                default: null,
            },
            note: {
                type: String,
                default: "",
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    status:{
        type:String,
        enum:["brodcasted","assigned","completed"],
        default:"brodcasted"
    }
    ,
    acceptedAt:Date
}, { timestamps: true })

const DeliveryAssignment=mongoose.model("DeliveryAssignment",deliveryAssignmentSchema)
export default DeliveryAssignment