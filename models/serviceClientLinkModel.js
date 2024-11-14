const mongoose = require("mongoose");

const serviceClientLinkSchema = new mongoose.Schema(
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

    status: {
      type: String,
      enum:['pending','completed'],
      required:true
    },

    cost: {
      type: Number,
    },

    note: {
      type: String,
    },

    requirement: {
      type: String,
    },

    paymentStatus: {
      type: String,
      enum: ['paid', 'due'],
      required:true
    },
    serviceStatus:{
      type:String,
      enum:['assigned','unassigned','completed'],
      default:"unassigned",
    },
    type: {
      type: String,
      required:true
    },

    partnerId: {
      type: mongoose.Types.ObjectId,
      ref:'Partner'
    }
  },
  {
    timestamps: true,
  }
);

const ServiceClientLink = mongoose.model(
  "ServiceClientLink",
  serviceClientLinkSchema
);
module.exports = ServiceClientLink;
