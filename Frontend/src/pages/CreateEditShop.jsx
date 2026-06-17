import React from 'react'
import { IoIosArrowRoundBack } from "react-icons/io";
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FaUtensils } from "react-icons/fa";
import { useState } from 'react';
import { useRef } from 'react';
import axios from 'axios';
import { serverUrl } from '../App';
import { setMyShopData } from '../redux/ownerSlice';
import { ClipLoader } from 'react-spinners';
import LocationPickerModal from '../components/LocationPickerModal';
function CreateEditShop() {
    const navigate = useNavigate()
    const { myShopData } = useSelector(state => state.owner)
    const { currentCity,currentState,currentAddress } = useSelector(state => state.user)
        const [showLocationPicker,setShowLocationPicker]=useState(false)
    const [name,setName]=useState(myShopData?.name || "")
     const [address,setAddress]=useState(myShopData?.address || currentAddress)
     const [city,setCity]=useState(myShopData?.city || currentCity)
       const [state,setState]=useState(myShopData?.state || currentState)
             const [shopLocation,setShopLocation]=useState(
                myShopData?.location?.coordinates?.length === 2
                    ? { lat: myShopData.location.coordinates[1], lon: myShopData.location.coordinates[0] }
                    : null
             )
       const [frontendImage,setFrontendImage]=useState(myShopData?.image || null)
       const [backendImage,setBackendImage]=useState(null)
       const [loading,setLoading]=useState(false)
       const dispatch=useDispatch()
       const handleImage=(e)=>{
        const file=e.target.files[0]
        setBackendImage(file)
        setFrontendImage(URL.createObjectURL(file))
       }

       const handleSubmit=async (e)=>{
        e.preventDefault()
        setLoading(true)
        try {
           const formData=new FormData()
           formData.append("name",name) 
           formData.append("city",city) 
           formData.append("state",state) 
           formData.append("address",address) 
           if(shopLocation?.lat && shopLocation?.lon){
            formData.append("lat",shopLocation.lat)
            formData.append("lon",shopLocation.lon)
           }
           if(backendImage){
            formData.append("image",backendImage)
           }
           const result=await axios.post(`${serverUrl}/api/shop/create-edit`,formData,{withCredentials:true})
           dispatch(setMyShopData(result.data))
          setLoading(false)
          navigate("/")
        } catch (error) {
            console.log(error)
            setLoading(false)
        }
       }
    return (
        <div className='flex justify-center flex-col items-center p-6 bg-gradient-to-br from-orange-50 relative to-white min-h-screen'>
                        <LocationPickerModal
                            open={showLocationPicker}
                            initialLocation={shopLocation}
                            initialAddress={address || city || currentCity || ""}
                            initialMode="manual"
                            onClose={() => setShowLocationPicker(false)}
                            onSave={({ lat, lon, address: pickedAddress, city: pickedCity, state: pickedState }) => {
                                setShopLocation({ lat, lon })
                                if (pickedAddress) setAddress(pickedAddress)
                                if (pickedCity) setCity(pickedCity)
                                if (pickedState) setState(pickedState)
                                setShowLocationPicker(false)
                            }}
                        />
            <div className='absolute top-[20px] left-[20px] z-[10] mb-[10px]' onClick={() => navigate("/")}>
                <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
            </div>

            <div className='max-w-lg w-full bg-white shadow-xl rounded-2xl p-8 border border-orange-100'>
                <div className='flex flex-col items-center mb-6'>
                    <div className='bg-orange-100 p-4 rounded-full mb-4'>
                        <FaUtensils className='text-[#ff4d2d] w-16 h-16' />
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900">
                        {myShopData ? "Edit Shop" : "Add Shop"}
                    </div>
                </div>
                <form className='space-y-5' onSubmit={handleSubmit}>
                    <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>Name</label>
                        <input type="text" placeholder='Enter Shop Name' className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500'
                        onChange={(e)=>setName(e.target.value)}
                        value={name}
                        />
                    </div>
                    <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>shop Image</label>
                        <input type="file" accept='image/*' className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500' onChange={handleImage}  />
                        {frontendImage &&   <div className='mt-4'>
                            <img src={frontendImage} alt="" className='w-full h-48 object-cover rounded-lg border'/>
                        </div>}
                      
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <div>
                           <label className='block text-sm font-medium text-gray-700 mb-1'>City</label>
                        <input type="text" placeholder='City' className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500' onChange={(e)=>setCity(e.target.value)}
                        value={city}/> 
                        </div>
                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-1'>State</label>
                        <input type="text" placeholder='State' className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500' onChange={(e)=>setState(e.target.value)}
                        value={state}/> 
                        </div>
                    </div>
                    <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>Address</label>
                        <input type="text" placeholder='Enter Shop Address' className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500' onChange={(e)=>setAddress(e.target.value)}
                        value={address}/> 
                    </div>
                                        <div className='rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-4'>
                                                <div className='flex items-center justify-between gap-3'>
                                                    <div>
                                                        <p className='text-sm font-semibold text-gray-800'>Shop location</p>
                                                        <p className='text-xs text-gray-500'>Pin the exact restaurant location on the map.</p>
                                                    </div>
                                                    <button
                                                        type='button'
                                                        onClick={() => setShowLocationPicker(true)}
                                                        className='rounded-full bg-[#ff4d2d] px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-orange-600'
                                                    >
                                                        {shopLocation ? 'Update pin' : 'Set pin'}
                                                    </button>
                                                </div>
                                                <div className='mt-3 rounded-xl bg-white p-3 text-sm text-gray-600 shadow-sm'>
                                                    {shopLocation
                                                        ? `Saved coordinates: ${shopLocation.lat.toFixed(5)}, ${shopLocation.lon.toFixed(5)}`
                                                        : 'No location selected yet.'}
                                                </div>
                                        </div>
                    <button className='w-full bg-[#ff4d2d] text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:bg-orange-600 hover:shadow-lg transition-all duration-200 cursor-pointer' disabled={loading}>
                        {loading?<ClipLoader size={20} color='white'/>:"Save"}
                    
                    </button>
                </form>
            </div>
                
                

        </div>
    )
}

export default CreateEditShop
