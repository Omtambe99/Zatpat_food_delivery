import Shop from "../models/shop.model.js";
import { geocodeLocation, toGeoPoint, resolveNearbyShops } from "../utils/location.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import User from "../models/user.model.js";

export const createEditShop=async (req,res) => {
    try {
             const {name,city,state,address,lat,lon}=req.body
       let image;
             let location;
       if(req.file){
        console.log(req.file)
        image=await uploadOnCloudinary(req.file.path)
       } 
       let shop=await Shop.findOne({owner:req.userId})
             const existingImage = shop?.image;
             const latitude = Number(lat);
             const longitude = Number(lon);
             if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
                location = toGeoPoint(latitude, longitude);
             } else {
                const locationQuery = [name, address, city, state].filter(Boolean).join(", ");
                const geoResult = await geocodeLocation(locationQuery);
                if (geoResult) {
                    location = toGeoPoint(geoResult.latitude, geoResult.longitude);
                }
             }
       if(!shop){
        shop=await Shop.create({
                name,city,state,address,image,owner:req.userId,location
       })
       }else{
         shop=await Shop.findByIdAndUpdate(shop._id,{
                name,city,state,address,image:image || existingImage,owner:req.userId,
                ...(location ? { location } : {}),
       },{new:true})
       }
      
       await shop.populate("owner items")
       return res.status(201).json(shop)
    } catch (error) {
        return res.status(500).json({message:`create shop error ${error}`})
    }
}

export const getMyShop=async (req,res) => {
    try {
        const shop=await Shop.findOne({owner:req.userId}).populate("owner").populate({
            path:"items",
            options:{sort:{updatedAt:-1}}
        })
        if(!shop){
            return null
        }
        return res.status(200).json(shop)
    } catch (error) {
        return res.status(500).json({message:`get my shop error ${error}`})
    }
}

export const getShopByCity=async (req,res) => {
    try {
        const {city}=req.params

        const shops = await resolveNearbyShops({
            User,
            Shop,
            userId: req.userId,
            city,
        })

        if(!shops){
            return res.status(400).json({message:"shops not found"})
        }
        return res.status(200).json(shops)
    } catch (error) {
        return res.status(500).json({message:`get shop by city error ${error}`})
    }
}