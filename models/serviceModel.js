const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    icon: {
      type: String,
      required: true,
    },

    categoryId: {
      type: mongoose.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Services = mongoose.model("Services", serviceSchema);
module.exports = Services;
