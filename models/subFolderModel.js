const mongoose = require("mongoose");


const subFolderSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    folderId:{
        type:mongoose.Types.ObjectId,
        ref:"Folder",
    },

    subFolderId:{
      type:mongoose.Types.ObjectId,
      ref:"SubFolder"
    },

    name: {
      type: String,
      required:true
    },

  },
  {
    timestamps: true,
  }
);

const SubFolder = mongoose.model("SubFolder", subFolderSchema);
module.exports = SubFolder;
