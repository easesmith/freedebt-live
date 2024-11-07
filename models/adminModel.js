const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
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

    role:{
      type:String,
      default:'sub-admin'
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

    permissions: {
      dashboard:{
        type: String,
        enum:['read','write','none'],
        required:true
      },
      categories:{
        type: String,
        enum:['read','write','none'],
        required:true
      },
      serviceRequests:{
        type: String,
        enum:['read','write','none'],
        required:true
      },
      partners:{
        type: String,
        enum:['read','write','none'],
        required:true
      },
      clients:{
        type: String,
        enum:['read','write','none'],
        required:true
      },
      serviceUpdates:{
        type: String,
        enum:['read','write','none'],
        required:true
      },
      chats:{
        type: String,
        enum:['read','write','none'],
        required:true
      },
      subAdmins:{
        type: String,
        enum:['read','write','none'],
        required:true
      },
      purchasedServices:{
        type: String,
        enum:['read','write','none'],
        required:true
      },
    },
  },
  {
    timestamps: true,
  }
);

adminSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const Admin = mongoose.model("Admin", adminSchema);
module.exports = Admin;
