const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const clientSchema = new mongoose.Schema(
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
      required: false,
      // unique: true,
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
        required: false,
      },
      city: {
        type: String,
        required: false,
      },
      pinCode: {
        type: String,
        required: false,
      },
      addressLine: {
        type: String,
      },
    },

    type: {
      type: String,
      enum: ["partner", "self", "admin"],
      required: true,
    },

    partnerId: {
      type: mongoose.Types.ObjectId,
      ref: "Partner",
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



clientSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};


const Client = mongoose.model("Client", clientSchema);
module.exports = Client;
