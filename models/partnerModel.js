const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const partnerSchema = new mongoose.Schema(
  {
    name: {
      first: {
        type: String,
        required: true,
      },
      last: {
        type: String,
        required: true,
      },
    },

    phone: {
      type: String,
      required: true,
      unique: true,
    },

    notificationId:{
      type:mongoose.Types.ObjectId,
      ref:'Notification'
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 8,
      select: false,
    },

    address: {
      state: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      pinCode: {
        type: String,
        required: true,
      },
      addressLine: {
        type: String,
      },
    },

    
    status:{
      type:Boolean,
      default:true
    }
  },
  {
    timestamps: true,
  }
);

partnerSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const Partner = mongoose.model("Partner", partnerSchema);
module.exports = Partner;
