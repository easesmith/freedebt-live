const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    // adminId: {
    //   type: mongoose.Types.ObjectId,
    //   ref: "Admin",
    // },

    type:{
      type:String,
      enum:['internal','non-internal'],
      default:'non-internal'
    },

    unreadClient:{
      type:Number,
      required:true,
      default:0,
    },

    unreadAdmin:{
      type:Number,
      required:true,
      default:0,
    },

    serviceId: {
      type: mongoose.Types.ObjectId,
      ref: "Services",
    },

    requestId: {
      type: mongoose.Types.ObjectId,
      ref: "ServiceReq",
    },

    status: {
      type: String,
      required: true,
      enum: ["open", "closed"],
      default: "open",
    },

    chats: [
      {
        msg: {
          type: String,
          required: true,
        },

        buttonFlag: {
          type: String,
        },

        readClient:{
          type:Boolean,
     
        },

        readAdmin:{
          type:Boolean,
         
        },

        pin: {
        type:Boolean,
        },

        date: {
          type: Date,
          default: new Date(),
        },

        from: {
          type: String,
          enum: ["client", "admin"],
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Chats = mongoose.model("Chats", chatSchema);
module.exports = Chats;
