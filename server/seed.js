import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";
import Shop from "./models/Shop.js";
import Product from "./models/Product.js";
import Order from "./models/Order.js";

dotenv.config();

const run = async () => {
  await connectDB();
  console.log("Clearing existing data...");
  await Promise.all([
    User.deleteMany({}),
    Shop.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
  ]);

  // Admin
  const admin = await User.create({
    name: "Admin",
    email: "admin@localmart.com",
    password: "admin123",
    role: "admin",
    phone: "9000000000",
  });

  // Shopkeepers
  const shopDefs = [
    {
      owner: { name: "Ravi Store", email: "ravi@shop.com" },
      shop: {
        name: "Ravi Department Store",
        category: "department",
        description: "Daily needs, household items and more.",
        address: "Main Road, Your Area",
        phone: "9111111111",
      },
      products: [
        { name: "Toothpaste 100g", price: 55, category: "personal care" },
        { name: "Detergent 1kg", price: 120, category: "household" },
        { name: "Shampoo 340ml", price: 210, category: "personal care" },
        { name: "Notebook Pack", price: 90, category: "stationery" },
      ],
    },
    {
      owner: { name: "City Medicals", email: "med@shop.com" },
      shop: {
        name: "City Medical & Pharmacy",
        category: "medical",
        description: "Medicines, health & wellness.",
        address: "Hospital Street, Your Area",
        phone: "9222222222",
      },
      products: [
        { name: "Paracetamol Strip", price: 30, category: "medicine" },
        { name: "Vitamin C Tablets", price: 150, category: "wellness" },
        { name: "Hand Sanitizer 200ml", price: 80, category: "hygiene" },
        { name: "Digital Thermometer", price: 250, category: "devices" },
      ],
    },
    {
      owner: { name: "Study Point", email: "stat@shop.com" },
      shop: {
        name: "Study Point Stationery",
        category: "stationery",
        description: "Books, pens and school supplies.",
        address: "School Road, Your Area",
        phone: "9333333333",
      },
      products: [
        { name: "Ball Pen (Pack of 10)", price: 100, category: "writing" },
        { name: "A4 Paper 500 sheets", price: 320, category: "paper" },
        { name: "Geometry Box", price: 145, category: "school" },
        { name: "Sticky Notes", price: 60, category: "office" },
      ],
    },
    {
      owner: { name: "Fresh Juice Bar", email: "juice@shop.com" },
      shop: {
        name: "Fresh Juice Corner",
        category: "juice",
        description: "Fresh fruit juices & shakes.",
        address: "Market Lane, Your Area",
        phone: "9444444444",
      },
      products: [
        { name: "Orange Juice 300ml", price: 70, unit: "glass", category: "juice" },
        { name: "Mango Shake", price: 90, unit: "glass", category: "shake" },
        { name: "Watermelon Juice", price: 60, unit: "glass", category: "juice" },
        { name: "Mixed Fruit Bowl", price: 120, unit: "bowl", category: "fruit" },
      ],
    },
    {
      owner: { name: "Tasty Foods", email: "food@shop.com" },
      shop: {
        name: "Tasty Foods Restaurant",
        category: "food",
        description: "Hot meals, snacks and tiffin.",
        address: "Food Street, Your Area",
        phone: "9555555555",
      },
      products: [
        { name: "Veg Meals", price: 90, unit: "plate", category: "meals" },
        { name: "Chicken Biryani", price: 180, unit: "plate", category: "biryani" },
        { name: "Masala Dosa", price: 70, unit: "plate", category: "tiffin" },
        { name: "Paneer Roll", price: 110, unit: "piece", category: "snacks" },
      ],
    },
  ];

  for (const def of shopDefs) {
    const owner = await User.create({
      name: def.owner.name,
      email: def.owner.email,
      password: "shop123",
      role: "shopkeeper",
      phone: def.shop.phone,
    });
    const shop = await Shop.create({
      ...def.shop,
      owner: owner._id,
      isApproved: true,
    });
    owner.shop = shop._id;
    await owner.save();
    await Product.insertMany(
      def.products.map((p) => ({ unit: "piece", ...p, shop: shop._id }))
    );
    console.log(`Created shop: ${shop.name} (owner login: ${owner.email} / shop123)`);
  }

  // Sample customer
  await User.create({
    name: "Test Customer",
    email: "customer@localmart.com",
    password: "cust123",
    role: "customer",
    phone: "9666666666",
    address: "12, Your Street, Your Area",
  });

  console.log("\n=== Seed complete ===");
  console.log("Admin login:     admin@localmart.com / admin123");
  console.log("Customer login:  customer@localmart.com / cust123");
  console.log("Shopkeeper login: ravi@shop.com / shop123 (and med@, stat@, juice@, food@)");

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
