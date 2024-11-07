const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
      required: true,
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

const Folder = mongoose.model("Folder", folderSchema);
module.exports = Folder;
