const mongoose = require("mongoose");


const serviceUpdateSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    serviceClientLinkId: {
      type: mongoose.Types.ObjectId,
      ref: "ServiceClientLink",
      required: true,
    },


    description: {
      type: String,
    },

    doc:{
        type:String,
    },

    subFolderId:{
      type: mongoose.Types.ObjectId,
      ref: "SubFolder",
    },

    folderId:{
      type:mongoose.Types.ObjectId,
      ref:"Folder",
  },

  },
  {
    timestamps: true,
  }
);

const ServiceUpdate = mongoose.model("ServiceUpdate", serviceUpdateSchema);
module.exports = ServiceUpdate;
