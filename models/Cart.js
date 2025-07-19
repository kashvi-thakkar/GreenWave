import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
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
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [cartItemSchema],
    total: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

cartSchema.methods.calculateTotal = async function () {
  let total = 0;
  for (let item of this.items) {
    const product = await mongoose.model("Product").findById(item.product);
    total += product.price * item.quantity;
  }
  this.total = total;
  return this.save();
};

const Cart = mongoose.model("Cart", cartSchema);

export default Cart;
