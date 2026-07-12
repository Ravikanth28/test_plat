import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";
import Shop from "./models/Shop.js";
import Product from "./models/Product.js";
import Order from "./models/Order.js";
import Banner from "./models/Banner.js";

dotenv.config();

/**
 * The `image` field on shops/products stores an emoji "thumbnail".
 * The frontend renders it on a gradient tile (and will render a real
 * <img> automatically if the value is ever an http(s) URL instead).
 */
const shopDefs = [
  // ---------------- DEPARTMENT ----------------
  {
    owner: { name: "Ravi Kumar", email: "ravi@shop.com", phone: "9111111101" },
    shop: {
      name: "Ravi Department Store",
      category: "department",
      description: "Daily needs, household & personal care under one roof.",
      address: "12 Main Road, Gandhi Nagar",
      phone: "9111111101",
      image: "🛒",
      rating: 4.5,
    },
    products: [
      { name: "Colgate Toothpaste 100g", price: 55, category: "personal care", img: "🪥", desc: "Cavity protection, mint fresh" },
      { name: "Surf Excel Detergent 1kg", price: 120, category: "household", img: "🧴", desc: "Tough stain removal" },
      { name: "Dove Shampoo 340ml", price: 210, category: "personal care", img: "🧴", desc: "Nourishing daily care" },
      { name: "Lifebuoy Soap (Pack of 4)", price: 96, category: "personal care", img: "🧼", desc: "Germ protection" },
      { name: "Vim Dishwash Gel 500ml", price: 99, category: "household", img: "🍽️", desc: "Lemon power" },
      { name: "Harpic Toilet Cleaner 1L", price: 105, category: "household", img: "🧽", desc: "10x deep clean" },
    ],
  },
  {
    owner: { name: "Meena Traders", email: "meena@shop.com", phone: "9111111102" },
    shop: {
      name: "Meena Super Bazaar",
      category: "department",
      description: "Value store for home essentials & cleaning supplies.",
      address: "45 Market Street, Ram Nagar",
      phone: "9111111102",
      image: "🏬",
      rating: 4.3,
    },
    products: [
      { name: "Good Knight Refill", price: 78, category: "household", img: "🦟", desc: "Mosquito protection" },
      { name: "Colin Glass Cleaner 500ml", price: 92, category: "household", img: "🪟", desc: "Streak-free shine" },
      { name: "Scotch-Brite Scrub Pad", price: 40, category: "household", img: "🧽", desc: "Pack of 3" },
      { name: "Dettol Handwash 900ml", price: 199, category: "personal care", img: "🧴", desc: "Refill pouch" },
      { name: "Garbage Bags (30 pcs)", price: 85, category: "household", img: "🗑️", desc: "Medium size" },
    ],
  },

  // ---------------- MEDICAL ----------------
  {
    owner: { name: "City Medicals", email: "med@shop.com", phone: "9222222201" },
    shop: {
      name: "City Medical & Pharmacy",
      category: "medical",
      description: "Prescription medicines, wellness & health devices.",
      address: "8 Hospital Street, Civil Lines",
      phone: "9222222201",
      image: "💊",
      rating: 4.7,
    },
    products: [
      { name: "Paracetamol 500mg Strip", price: 30, category: "medicine", img: "💊", desc: "Fever & pain relief" },
      { name: "Vitamin C Chewable (60)", price: 150, category: "wellness", img: "🍊", desc: "Immunity booster" },
      { name: "Hand Sanitizer 200ml", price: 80, category: "hygiene", img: "🧴", desc: "70% alcohol" },
      { name: "Digital Thermometer", price: 250, category: "devices", img: "🌡️", desc: "Fast & accurate" },
      { name: "Cotton Roll 100g", price: 45, category: "hygiene", img: "🩹", desc: "Absorbent cotton" },
      { name: "ORS Sachet (Pack of 5)", price: 50, category: "wellness", img: "🥤", desc: "Rehydration" },
    ],
  },
  {
    owner: { name: "HealthPlus", email: "health@shop.com", phone: "9222222202" },
    shop: {
      name: "HealthPlus Pharmacy",
      category: "medical",
      description: "24x7 chemist with home delivery of medicines.",
      address: "23 Ring Road, Sector 5",
      phone: "9222222202",
      image: "🏥",
      rating: 4.6,
    },
    products: [
      { name: "Cetirizine Strip", price: 25, category: "medicine", img: "💊", desc: "Allergy relief" },
      { name: "Digital BP Monitor", price: 1450, category: "devices", img: "🩺", desc: "Automatic arm cuff" },
      { name: "N95 Mask (Pack of 5)", price: 120, category: "hygiene", img: "😷", desc: "5-layer protection" },
      { name: "Multivitamin Tablets (30)", price: 320, category: "wellness", img: "💊", desc: "Daily nutrition" },
      { name: "Band-Aid (40 pcs)", price: 95, category: "hygiene", img: "🩹", desc: "Washproof" },
    ],
  },

  // ---------------- STATIONERY ----------------
  {
    owner: { name: "Study Point", email: "stat@shop.com", phone: "9333333301" },
    shop: {
      name: "Study Point Stationery",
      category: "stationery",
      description: "Books, pens & everything for school and office.",
      address: "5 School Road, Vidya Nagar",
      phone: "9333333301",
      image: "✏️",
      rating: 4.4,
    },
    products: [
      { name: "Cello Ball Pen (Pack of 10)", price: 100, category: "writing", img: "🖊️", desc: "Blue, smooth flow" },
      { name: "JK A4 Paper 500 sheets", price: 320, category: "paper", img: "📄", desc: "75 GSM copier" },
      { name: "Geometry Box", price: 145, category: "school", img: "📐", desc: "Complete set" },
      { name: "Classmate Notebook (Pack of 6)", price: 240, category: "school", img: "📒", desc: "200 pages each" },
      { name: "Sticky Notes (5 pads)", price: 60, category: "office", img: "🗒️", desc: "Assorted colors" },
      { name: "Fevicol 200g", price: 65, category: "office", img: "🧴", desc: "Strong adhesive" },
    ],
  },
  {
    owner: { name: "Office Mart", email: "office@shop.com", phone: "9333333302" },
    shop: {
      name: "Office Mart Supplies",
      category: "stationery",
      description: "Bulk office stationery, printing & art materials.",
      address: "18 Commercial Complex, MG Road",
      phone: "9333333302",
      image: "🖇️",
      rating: 4.2,
    },
    products: [
      { name: "Stapler + 1000 Pins", price: 180, category: "office", img: "📎", desc: "Heavy duty" },
      { name: "Whiteboard Marker (Set of 4)", price: 120, category: "office", img: "🖍️", desc: "Assorted" },
      { name: "Faber-Castell Color Pencils", price: 210, category: "art", img: "🖍️", desc: "24 shades" },
      { name: "File Folders (Pack of 10)", price: 150, category: "office", img: "📁", desc: "Plastic, durable" },
      { name: "Calculator 12-digit", price: 275, category: "office", img: "🧮", desc: "Solar + battery" },
    ],
  },

  // ---------------- JUICE ----------------
  {
    owner: { name: "Fresh Juice Bar", email: "juice@shop.com", phone: "9444444401" },
    shop: {
      name: "Fresh Juice Corner",
      category: "juice",
      description: "Cold-pressed juices, shakes & fruit bowls.",
      address: "3 Market Lane, Green Park",
      phone: "9444444401",
      image: "🧃",
      rating: 4.6,
    },
    products: [
      { name: "Fresh Orange Juice", price: 70, unit: "glass", category: "juice", img: "🍊", desc: "300ml, no sugar" },
      { name: "Mango Shake", price: 90, unit: "glass", category: "shake", img: "🥭", desc: "Thick & creamy" },
      { name: "Watermelon Juice", price: 60, unit: "glass", category: "juice", img: "🍉", desc: "Chilled, refreshing" },
      { name: "Mixed Fruit Bowl", price: 120, unit: "bowl", category: "fruit", img: "🥗", desc: "Seasonal fruits" },
      { name: "Banana Shake", price: 80, unit: "glass", category: "shake", img: "🍌", desc: "With honey" },
    ],
  },
  {
    owner: { name: "Cool Sips", email: "sips@shop.com", phone: "9444444402" },
    shop: {
      name: "Cool Sips Juice Hub",
      category: "juice",
      description: "Smoothies, mocktails & energy drinks.",
      address: "27 Lake View Road, Park Town",
      phone: "9444444402",
      image: "🥤",
      rating: 4.4,
    },
    products: [
      { name: "Strawberry Smoothie", price: 110, unit: "glass", category: "smoothie", img: "🍓", desc: "With yogurt" },
      { name: "Blue Lagoon Mocktail", price: 99, unit: "glass", category: "mocktail", img: "🫐", desc: "Fizzy & fun" },
      { name: "Lemon Mint Cooler", price: 55, unit: "glass", category: "cooler", img: "🍋", desc: "Fresh mint" },
      { name: "Cold Coffee", price: 85, unit: "glass", category: "coffee", img: "☕", desc: "Ice blended" },
      { name: "Pomegranate Juice", price: 95, unit: "glass", category: "juice", img: "🥤", desc: "100% fresh" },
    ],
  },

  // ---------------- FOOD ----------------
  {
    owner: { name: "Tasty Foods", email: "food@shop.com", phone: "9555555501" },
    shop: {
      name: "Tasty Foods Restaurant",
      category: "food",
      description: "Hot South-Indian meals, biryani & tiffin.",
      address: "9 Food Street, Anna Nagar",
      phone: "9555555501",
      image: "🍽️",
      rating: 4.5,
    },
    products: [
      { name: "Veg Meals (Unlimited)", price: 90, unit: "plate", category: "meals", img: "🍛", desc: "Rice, sambar, curries" },
      { name: "Chicken Biryani", price: 180, unit: "plate", category: "biryani", img: "🍗", desc: "Hyderabadi dum" },
      { name: "Masala Dosa", price: 70, unit: "plate", category: "tiffin", img: "🥞", desc: "Crispy, with chutney" },
      { name: "Paneer Butter Masala", price: 140, unit: "plate", category: "curry", img: "🧈", desc: "With 2 rotis" },
      { name: "Idli (4 pcs)", price: 45, unit: "plate", category: "tiffin", img: "🍚", desc: "Soft & fluffy" },
      { name: "Gulab Jamun (2 pcs)", price: 40, unit: "plate", category: "dessert", img: "🍮", desc: "Warm & sweet" },
    ],
  },
  {
    owner: { name: "Snack Shack", email: "snack@shop.com", phone: "9555555502" },
    shop: {
      name: "Snack Shack Fast Food",
      category: "food",
      description: "Burgers, rolls, pizza & quick bites.",
      address: "14 College Road, Nehru Nagar",
      phone: "9555555502",
      image: "🍔",
      rating: 4.3,
    },
    products: [
      { name: "Veg Burger", price: 60, unit: "piece", category: "burger", img: "🍔", desc: "Crispy patty" },
      { name: "Paneer Roll", price: 110, unit: "piece", category: "roll", img: "🌯", desc: "Loaded & spicy" },
      { name: "Margherita Pizza (7\")", price: 150, unit: "piece", category: "pizza", img: "🍕", desc: "Cheese burst" },
      { name: "French Fries", price: 80, unit: "plate", category: "sides", img: "🍟", desc: "Salted, crispy" },
      { name: "Chicken Momos (6)", price: 90, unit: "plate", category: "snacks", img: "🥟", desc: "Steamed" },
    ],
  },

  // ---------------- GROCERY ----------------
  {
    owner: { name: "Daily Grocers", email: "grocery@shop.com", phone: "9666666601" },
    shop: {
      name: "Daily Fresh Grocery",
      category: "grocery",
      description: "Fruits, vegetables, staples & dairy delivered fresh.",
      address: "2 Vegetable Market, Old Town",
      phone: "9666666601",
      image: "🥦",
      rating: 4.5,
    },
    products: [
      { name: "Tomato 1kg", price: 40, unit: "kg", category: "vegetables", img: "🍅", desc: "Farm fresh" },
      { name: "Onion 1kg", price: 35, unit: "kg", category: "vegetables", img: "🧅", desc: "Nashik red" },
      { name: "Potato 1kg", price: 30, unit: "kg", category: "vegetables", img: "🥔", desc: "Grade A" },
      { name: "Banana (Dozen)", price: 50, unit: "dozen", category: "fruits", img: "🍌", desc: "Ripe & sweet" },
      { name: "Amul Milk 1L", price: 66, unit: "packet", category: "dairy", img: "🥛", desc: "Full cream" },
      { name: "Farm Eggs (Tray of 30)", price: 165, unit: "tray", category: "dairy", img: "🥚", desc: "Fresh" },
    ],
  },
  {
    owner: { name: "SuperMart", email: "supermart@shop.com", phone: "9666666602" },
    shop: {
      name: "SuperMart Grocery",
      category: "grocery",
      description: "Rice, dal, oil, spices & packaged goods at best prices.",
      address: "31 Bazaar Road, New Colony",
      phone: "9666666602",
      image: "🛍️",
      rating: 4.4,
    },
    products: [
      { name: "Sona Masoori Rice 5kg", price: 320, unit: "bag", category: "staples", img: "🍚", desc: "Premium quality" },
      { name: "Toor Dal 1kg", price: 140, unit: "kg", category: "staples", img: "🫘", desc: "Unpolished" },
      { name: "Fortune Sunflower Oil 1L", price: 145, unit: "bottle", category: "oil", img: "🫗", desc: "Refined" },
      { name: "Aashirvaad Atta 5kg", price: 260, unit: "bag", category: "staples", img: "🌾", desc: "Whole wheat" },
      { name: "Tata Salt 1kg", price: 28, unit: "packet", category: "staples", img: "🧂", desc: "Iodized" },
      { name: "Sugar 1kg", price: 45, unit: "kg", category: "staples", img: "🍬", desc: "Fine grain" },
    ],
  },
];

// Placeholder ad banners for the home hero carousel. Admin can add/edit/remove
// these from the Admin panel; images use emoji thumbnails by default.
const bannerDefs = [
  {
    title: "Fresh groceries in minutes",
    subtitle: "Fruits, veggies & daily staples delivered fast.",
    image: "🥦",
    link: "/?cat=grocery",
    cta: "Shop groceries",
    order: 1,
  },
  {
    title: "Hot meals & biryani",
    subtitle: "Order from your favourite local restaurants.",
    image: "🍛",
    link: "/?cat=food",
    cta: "Order food",
    order: 2,
  },
  {
    title: "Medicines at your door",
    subtitle: "Pharmacies delivering wellness essentials.",
    image: "💊",
    link: "/?cat=medical",
    cta: "Shop medical",
    order: 3,
  },
  {
    title: "Cool juices & shakes",
    subtitle: "Fresh-pressed juices, smoothies & mocktails.",
    image: "🧃",
    link: "/?cat=juice",
    cta: "Grab a drink",
    order: 4,
  },
];

const run = async () => {
  await connectDB();
  console.log("Clearing existing data...");
  await Promise.all([
    User.deleteMany({}),
    Shop.deleteMany({}),
    Product.deleteMany({}),
    Order.deleteMany({}),
    Banner.deleteMany({}),
  ]);

  // Seed home hero carousel banners.
  await Banner.insertMany(
    bannerDefs.map((b) => ({ ...b, isActive: true }))
  );
  console.log(`Created ${bannerDefs.length} hero banners`);

  // Admin
  await User.create({
    name: "Admin",
    email: "admin@localmart.com",
    password: "admin123",
    role: "admin",
    phone: "9000000000",
  });

  let shopCount = 0;
  let productCount = 0;

  for (const def of shopDefs) {
    const owner = await User.create({
      name: def.owner.name,
      email: def.owner.email,
      password: "shop123",
      role: "shopkeeper",
      phone: def.owner.phone,
    });
    const shop = await Shop.create({
      ...def.shop,
      owner: owner._id,
      isApproved: true,
      isOpen: true,
    });
    owner.shop = shop._id;
    await owner.save();
    await Product.insertMany(
      def.products.map((p) => ({
        name: p.name,
        description: p.desc || "",
        price: p.price,
        unit: p.unit || "piece",
        image: p.img || "",
        category: p.category || "general",
        shop: shop._id,
      }))
    );
    shopCount += 1;
    productCount += def.products.length;
    console.log(`Created shop: ${shop.name} (${def.products.length} products)`);
  }

  // Sample customer
  await User.create({
    name: "Test Customer",
    email: "customer@localmart.com",
    password: "cust123",
    role: "customer",
    phone: "9777777777",
    address: "12, Your Street, Your Area",
  });

  console.log(`\n=== Seed complete: ${shopCount} shops, ${productCount} products ===`);
  console.log("Admin login:      admin@localmart.com / admin123");
  console.log("Customer login:   customer@localmart.com / cust123");
  console.log("Shopkeeper login: ravi@shop.com / shop123 (all shopkeepers use shop123)");

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
