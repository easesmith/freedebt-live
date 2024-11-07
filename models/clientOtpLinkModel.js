const mongoose = require("mongoose");

const clientOtpLinkSchema = new mongoose.Schema(
  {

    phone: {
      type: String,
      required: true,
      unique: true,
    },

    otp: {
      type: Number,
    },
    otpExpiresAt:{
        type: Date,
    },
  },
  { timestamps: true }
);

const ClientOtpLink = mongoose.model("ClientOtpLink", clientOtpLinkSchema);
module.exports = ClientOtpLink;