import jwt from "jsonwebtoken";
import User from "./models/user.model.js";
import DeliveryAssignment from "./models/deliveryAssignment.model.js";
import Order from "./models/order.model.js";

const parseCookie = (cookieString) => {
  if (!cookieString) return {};
  return cookieString.split(';').reduce((acc, curr) => {
    const parts = curr.trim().split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      acc[key] = decodeURIComponent(value);
    }
    return acc;
  }, {});
};

export const socketHandler = (io) => {
  // Middleware to authenticate socket via handshake cookie
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers?.cookie;
      const cookies = parseCookie(cookieHeader);
      const token = cookies.token;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.userId) {
          socket.data.userId = decoded.userId;
        }
      }
    } catch (err) {
      // Unauthenticated socket connection, socket.data.userId remains undefined
    }
    next();
  });

  io.on('connection', (socket) => {
    const currentUserId = socket.data.userId;
    if (currentUserId) {
      User.findByIdAndUpdate(currentUserId, {
        socketId: socket.id,
        isOnline: true
      }).catch(err => console.log('Socket user online update error:', err));
    }

    // Ignore client-supplied userId, authenticate via socket.data.userId
    socket.on('identity', async () => {
      try {
        const userId = socket.data.userId;
        if (!userId) return;
        await User.findByIdAndUpdate(userId, {
          socketId: socket.id,
          isOnline: true
        }, { new: true });
      } catch (error) {
        console.log('socket identity error:', error);
      }
    });

    // Customer / rider / owner joins an order room
    socket.on('joinOrderRoom', async (data) => {
      try {
        const userId = socket.data.userId;
        const orderId = typeof data === 'object' ? data?.orderId : data;
        if (!userId || !orderId) return;

        const order = await Order.findById(orderId).populate("shopOrders.owner");
        if (!order) return;

        const isCustomer = String(order.user) === String(userId);
        const isShopOwner = order.shopOrders?.some(so => String(so.owner?._id || so.owner) === String(userId));
        const isAssignedDelivery = order.shopOrders?.some(so => String(so.assignedDeliveryBoy) === String(userId));

        if (isCustomer || isShopOwner || isAssignedDelivery) {
          socket.join(`order:${orderId}`);
        }
      } catch (error) {
        console.log('joinOrderRoom error:', error);
      }
    });

    // Join shared group cart room
    socket.on('joinCart', async (data) => {
      try {
        const code = typeof data === 'object' ? data?.code : data;
        if (!code) return;
        socket.join(`cart:${String(code).toUpperCase()}`);
      } catch (error) {
        console.log('joinCart error:', error);
      }
    });

    // Rider updates location: emit only to active order rooms and batch rooms
    socket.on('updateLocation', async ({ latitude, longitude }) => {
      try {
        const userId = socket.data.userId;
        if (!userId) return;

        const user = await User.findByIdAndUpdate(userId, {
          location: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          isOnline: true,
          socketId: socket.id
        });

        if (user) {
          const activeAssignments = await DeliveryAssignment.find({
            assignedTo: userId,
            status: 'assigned'
          });

          for (const assignment of activeAssignments) {
            const orderIds = new Set();
            if (assignment.stops && assignment.stops.length > 0) {
              assignment.stops.forEach(s => {
                if (s.order) orderIds.add(String(s.order._id || s.order));
              });
            }
            if (assignment.order) {
              orderIds.add(String(assignment.order._id || assignment.order));
            }

            for (const orderId of orderIds) {
              io.to(`order:${orderId}`).emit('updateDeliveryLocation', {
                deliveryBoyId: userId,
                latitude,
                longitude
              });
            }

            if (assignment.batch) {
              io.to(`batch:${assignment.batch}`).emit('updateDeliveryLocation', {
                deliveryBoyId: userId,
                latitude,
                longitude
              });
            }
          }
        }
      } catch (error) {
        console.log('updateDeliveryLocation error:', error);
      }
    });

    socket.on('disconnect', async () => {
      try {
        await User.findOneAndUpdate({ socketId: socket.id }, {
          socketId: null,
          isOnline: false
        });
      } catch (error) {
        console.log('socket disconnect error:', error);
      }
    });
  });
};