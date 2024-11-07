const mongoose = require("mongoose");


const serviceReqSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    serviceId: {
      type: mongoose.Types.ObjectId,
      ref: "Services",
      required: true,
    },

    type: {
      type: String,
      enum: ["partner", "self", "admin"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "quotation-sent", "accepted"],
      default: "pending",
      required: true,
    },

    requirement: {
      type: String,
      required: true,
    },

    cost: {
      type: Number,
    },

    note: {
      type: String,
    },

  },
  {
    timestamps: true,
  }
);

const ServiceReq = mongoose.model("ServiceReq", serviceReqSchema);
module.exports = ServiceReq;
