
const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

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

  path: {
    type: String,
    required: true,
  },
}, {
    timestamps:true
});

const Documents = mongoose.model("Documents", documentSchema);
module.exports = Documents;
