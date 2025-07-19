import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    imageUrl: {
      type: String,
      default: "default-product-image.jpg",
    },
    category: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.methods.updateStock = function (quantity) {
  const newStock = this.stock + quantity;
  if (newStock < 0) {
    throw new Error("Stock cannot be negative");
  }
  this.stock = newStock;
  return this.save();
};

const Product = mongoose.model("Product", productSchema);

export default Product;
