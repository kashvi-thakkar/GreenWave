import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    shippingAddress: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      default: "Cash on Delivery",
      enum: ["Cash on Delivery"],
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.methods.updateStatus = function (newStatus) {
  if (!this.schema.path("status").enumValues.includes(newStatus)) {
    throw new Error("Invalid status");
  }
  this.status = newStatus;
  return this.save();
};

const Order = mongoose.model("Order", orderSchema);

export default Order;
