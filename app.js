import express from "express";
import mongoose from "mongoose";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bodyParser from "body-parser";
import session from "express-session";
import expressLayouts from "express-ejs-layouts";
import methodOverride from "method-override";

import User from "./models/User.js";
import Product from "./models/Product.js";
import Cart from "./models/Cart.js";
import Order from "./models/Order.js";

import defaultProducts from "./defaultProducts.js";
require('dotenv').config();

const app = express();

async function createAdminUser() {
  try {
    const adminUser = await User.findOne({ isAdmin: true });
    if (!adminUser) {
      const newAdmin = new User({
        firstName: "Admin",
        lastName: "User",
        email: "admin@example.com",
        isAdmin: true,
      });
      await User.register(newAdmin, "adminpassword");
      console.log("Admin user created successfully");
    } else {
      console.log("Admin user already exists");
    }
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
}

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB Atlas"))
.catch((err) => console.error("MongoDB connection error:", err));


app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layout");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(
  session({
    secret: "greenwave secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong");
};

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
};

const isAdmin = async (req, res, next) => {
  if (req.isAuthenticated() && (await req.user.isAdminUser())) {
    return next();
  }
  res.status(403).send("Access denied");
};

app.get("/", (req, res) => {
  res.render("user/home");
});

app.get("/register", (req, res) => {
  res.render("user/register");
});

app.post("/register", async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const user = new User({ firstName, lastName, email });
    await User.register(user, password);
    req.login(user, (err) => {
      if (err) return next(err);
      res.redirect("/dashboard");
    });
  } catch (err) {
    next(err);
  }
});

app.get("/login", (req, res) => {
  res.render("user/login");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  })
);

app.get("/dashboard", async (req, res, next) => {
  try {
    let products = await Product.find();
    if (products.length === 0) {
      await Product.insertMany(defaultProducts);
      products = await Product.find();
    }
    res.render("user/dashboard", { products });
  } catch (err) {
    next(err);
  }
});

app.get("/product/:id", isAuthenticated, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).render("error", { error: "Product not found" });
    }
    res.render("user/product", { product });
  } catch (err) {
    next(err);
  }
});

app.get("/cart", isAuthenticated, async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product"
    );
    res.render("user/cart", { cart });
  } catch (err) {
    next(err);
  }
});

app.post("/cart/add/:productId", isAuthenticated, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).send("Product not found");
    }

    const quantity = parseInt(req.body.quantity) || 1;

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const cartItem = cart.items.find(
      (item) => item.product.toString() === req.params.productId
    );
    if (cartItem) {
      cartItem.quantity += quantity;
    } else {
      cart.items.push({ product: req.params.productId, quantity: quantity });
    }

    await cart.calculateTotal();
    await product.updateStock(-quantity);

    res.redirect("/cart");
  } catch (err) {
    next(err);
  }
});

app.delete(
  "/cart/remove/:productId",
  isAuthenticated,
  async (req, res, next) => {
    try {
      const productId = req.params.productId;
      const cart = await Cart.findOne({ user: req.user._id });

      if (!cart) {
        return res.status(404).send("Cart not found");
      }

      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

      if (itemIndex > -1) {
        const item = cart.items[itemIndex];
        const product = await Product.findById(productId);

        if (product) {
          await product.updateStock(item.quantity);
        }

        cart.items.splice(itemIndex, 1);
        await cart.calculateTotal();
        await cart.save();

        res.sendStatus(200);
      } else {
        res.status(404).send("Item not found in cart");
      }
    } catch (err) {
      next(err);
    }
  }
);

app.get("/orders", isAuthenticated, async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id });
    res.render("user/orders", { orders });
  } catch (err) {
    next(err);
  }
});

app.get("/order/:id", isAuthenticated, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate("items.product");
    if (!order) {
      return res.status(404).render("error", { error: "Order not found" });
    }
    res.render("user/orderDetails", { order });
  } catch (err) {
    next(err);
  }
});

app.get("/payment", isAuthenticated, (req, res) => {
  res.render("user/payment");
});

app.post("/payment", isAuthenticated, async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      "items.product"
    );
    if (!cart || cart.items.length === 0) {
      return res.status(400).send("Your cart is empty");
    }

    const order = new Order({
      user: req.user._id,
      items: cart.items.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price,
      })),
      total: cart.total,
      shippingAddress: req.body.shippingAddress,
    });

    await order.save();

    for (let item of cart.items) {
      await item.product.updateStock(-item.quantity);
    }

    cart.items = [];
    cart.total = 0;
    await cart.save();

    res.redirect("/orders");
  } catch (err) {
    next(err);
  }
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/admin/login", (req, res) => {
  res.render("admin/login");
});

app.post(
  "/admin/login",
  passport.authenticate("local", {
    successRedirect: "/admin/dashboard",
    failureRedirect: "/admin/login",
  })
);

app.get("/admin/dashboard", isAdmin, async (req, res, next) => {
  try {
    const products = await Product.find();
    const orders = await Order.find()
      .populate("user")
      .sort({ createdAt: -1 })
      .limit(5);
    res.render("admin/dashboard", { products, orders });
  } catch (err) {
    next(err);
  }
});

app.get("/admin/add-product", isAdmin, (req, res) => {
  res.render("admin/addProduct");
});

app.post("/admin/add-product", isAdmin, async (req, res, next) => {
  try {
    const { name, description, price, stock, category } = req.body;
    const newProduct = new Product({
      name,
      description,
      price,
      stock,
      category,
    });
    await newProduct.save();
    res.redirect("/admin/dashboard");
  } catch (err) {
    next(err);
  }
});

app.get("/admin/edit-product/:id", isAdmin, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).render("error", { error: "Product not found" });
    }
    res.render("admin/editProduct", { product });
  } catch (err) {
    next(err);
  }
});

app.put("/admin/edit-product/:id", isAdmin, async (req, res, next) => {
  try {
    const { name, description, price, stock, category } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).render("error", { error: "Product not found" });
    }
    product.name = name;
    product.description = description;
    product.price = price;
    product.stock = stock;
    product.category = category;
    await product.save();
    res.redirect("/admin/dashboard");
  } catch (err) {
    next(err);
  }
});

app.delete('/admin/delete-product/:id', isAdmin, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).send("Product not found");
    }
    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
});

app.get("/admin/orders", isAdmin, async (req, res, next) => {
  try {
    const orders = await Order.find().populate("user");
    res.render("admin/viewOrders", { orders });
  } catch (err) {
    next(err);
  }
});

app.post("/admin/order/:id/update-status", isAdmin, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).send("Order not found");
    }
    await order.updateStatus(req.body.status);
    res.redirect("/admin/orders");
  } catch (err) {
    next(err);
  }
});

app.get("/admin/customers", isAdmin, async (req, res, next) => {
  try {
    const customers = await User.find();
    res.render("admin/viewCustomers", { customers });
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
