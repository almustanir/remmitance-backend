const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.String,
      ref: "users",
    },
    receiver: {
      type: mongoose.Schema.Types.String,
      ref: "users",
    },
    amount: {
      type: Number,
      required: true,
    },
    convertedAmount:{
      type:Number,
      default:0
    },
    description: {
      type: String,
      required: true,
    },
    currency:{
      type:String,
      default:''
    },
    status: {
      type: String,
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("requests", requestSchema);
