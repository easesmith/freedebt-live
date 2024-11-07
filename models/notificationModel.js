const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["client", "partner", "admin"],
      required: true,
    },
    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
    },
    
    partnerId: {
      type: mongoose.Types.ObjectId,
      ref: "Admin",
    },

    unread:{
      type:Number,
      default:0
    },


    notifications: [
      {
        message: {
          type: String,
          required: true,
        },

        read: {
          type: Boolean,
          default:false
        },

        date: {
          type: Date,
          default: new Date(),
        },
        
        type:{
            type:String,
            enum:['update','message','message-quotation','new-client']
        },
        info:{
          //serviceId,navigate,clientId
            type: mongoose.Schema.Types.Mixed
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
