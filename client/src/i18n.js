// Lightweight in-app i18n. No external library — just plain dictionaries plus a
// tiny lookup helper. Keys use dot notation (e.g. "nav.home"). English is the
// base language and the fallback for any key a translation is missing.

export const LANGUAGES = [
  { code: "en", label: "English", native: "English", flag: "🇬🇧" },
  { code: "hi", label: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "ta", label: "Tamil", native: "தமிழ்", flag: "🇮🇳" },
];

export const DEFAULT_LANG = "en";

const en = {
  // Navbar
  "nav.home": "Home",
  "nav.favorites": "Favorites",
  "nav.orders": "My Orders",
  "nav.shop": "Shop Dashboard",
  "nav.admin": "Admin",
  "nav.settings": "Settings",
  "nav.notifications": "Notifications",
  "nav.cart": "Cart",
  "nav.login": "Login",
  "nav.logout": "Logout",
  "nav.register": "Create account",
  "nav.search": "Search shops & products…",
  "nav.account": "Account menu",
  "nav.getApp": "Download App",
  "nav.go": "Go",
  "nav.seeAll": "See all results",
  "nav.noMatches": "No matches",
  "nav.searching": "Searching…",
  "nav.shops": "Shops",
  "nav.products": "Products",

  // Common actions / labels
  "common.add": "Add",
  "common.added": "Added",
  "common.remove": "Remove",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.update": "Update",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.close": "Close",
  "common.loading": "Loading…",
  "common.back": "Back",
  "common.viewAll": "View all",
  "common.inStock": "In stock",
  "common.outOfStock": "Out of stock",
  "common.veg": "Veg",
  "common.nonVeg": "Non-veg",
  "common.addToCart": "Add to Cart",
  "common.total": "Total",
  "common.free": "FREE",

  // Home
  "home.hero.title": "Groceries, food & essentials — delivered fast",
  "home.hero.sub":
    "From department stores, pharmacies, juice bars, restaurants & more near you.",
  "home.search": "Search",
  "home.shopByCategory": "Shop by category",
  "home.filters": "Filters",
  "home.categories": "Categories",
  "home.allShops": "All Shops",
  "home.allShopsNear": "All shops near you",
  "home.shopsNear": "Shops near you",
  "home.noShops": "No shops found",
  "home.openNow": "Open now",
  "home.freeDelivery": "Free delivery",

  // Cart / checkout
  "cart.title": "Your Cart",
  "cart.empty": "Your cart is empty",
  "cart.itemsTotal": "Items Total",
  "cart.deliveryFee": "Delivery Fee",
  "cart.checkout": "Proceed to Checkout",
  "cart.placeOrder": "Place Order",
  "cart.browse": "Browse shops",

  // Orders
  "orders.title": "My Orders",
  "orders.none": "No orders yet",
  "orders.track": "Track Order",
  "orders.reorder": "Order again",
  "orders.invoice": "Download Invoice (PDF)",

  // Auth
  "auth.loginTitle": "Welcome back",
  "auth.registerTitle": "Create your account",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.name": "Name",
  "auth.signIn": "Sign in",
  "auth.signUp": "Sign up",
  "auth.noAccount": "Don't have an account?",
  "auth.haveAccount": "Already have an account?",

  // Settings
  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.languageHint": "Choose your preferred language",
  "settings.theme": "Theme",
};

const hi = {
  // Navbar
  "nav.home": "होम",
  "nav.favorites": "पसंदीदा",
  "nav.orders": "मेरे ऑर्डर",
  "nav.shop": "दुकान डैशबोर्ड",
  "nav.admin": "एडमिन",
  "nav.settings": "सेटिंग्स",
  "nav.notifications": "सूचनाएँ",
  "nav.cart": "कार्ट",
  "nav.login": "लॉगिन",
  "nav.logout": "लॉगआउट",
  "nav.register": "खाता बनाएँ",
  "nav.search": "दुकानें और उत्पाद खोजें…",
  "nav.account": "खाता मेनू",
  "nav.getApp": "ऐप डाउनलोड करें",
  "nav.go": "जाएँ",
  "nav.seeAll": "सभी परिणाम देखें",
  "nav.noMatches": "कोई मिलान नहीं",
  "nav.searching": "खोज रहे हैं…",
  "nav.shops": "दुकानें",
  "nav.products": "उत्पाद",

  // Common
  "common.add": "जोड़ें",
  "common.added": "जोड़ा गया",
  "common.remove": "हटाएँ",
  "common.save": "सहेजें",
  "common.cancel": "रद्द करें",
  "common.update": "अपडेट करें",
  "common.delete": "हटाएँ",
  "common.edit": "संपादित करें",
  "common.close": "बंद करें",
  "common.loading": "लोड हो रहा है…",
  "common.back": "वापस",
  "common.viewAll": "सभी देखें",
  "common.inStock": "स्टॉक में",
  "common.outOfStock": "स्टॉक ख़त्म",
  "common.veg": "शाकाहारी",
  "common.nonVeg": "मांसाहारी",
  "common.addToCart": "कार्ट में जोड़ें",
  "common.total": "कुल",
  "common.free": "मुफ़्त",

  // Home
  "home.hero.title": "किराना, खाना और ज़रूरी सामान — तेज़ डिलीवरी",
  "home.hero.sub":
    "आपके पास के डिपार्टमेंट स्टोर, फार्मेसी, जूस बार, रेस्तरां और बहुत कुछ से।",
  "home.search": "खोजें",
  "home.shopByCategory": "श्रेणी अनुसार खरीदें",
  "home.filters": "फ़िल्टर",
  "home.categories": "श्रेणियाँ",
  "home.allShops": "सभी दुकानें",
  "home.allShopsNear": "आपके पास की सभी दुकानें",
  "home.shopsNear": "आपके पास की दुकानें",
  "home.noShops": "कोई दुकान नहीं मिली",
  "home.openNow": "अभी खुला",
  "home.freeDelivery": "मुफ़्त डिलीवरी",

  // Cart
  "cart.title": "आपका कार्ट",
  "cart.empty": "आपका कार्ट खाली है",
  "cart.itemsTotal": "आइटम कुल",
  "cart.deliveryFee": "डिलीवरी शुल्क",
  "cart.checkout": "चेकआउट पर जाएँ",
  "cart.placeOrder": "ऑर्डर करें",
  "cart.browse": "दुकानें देखें",

  // Orders
  "orders.title": "मेरे ऑर्डर",
  "orders.none": "अभी तक कोई ऑर्डर नहीं",
  "orders.track": "ऑर्डर ट्रैक करें",
  "orders.reorder": "फिर से ऑर्डर करें",
  "orders.invoice": "इनवॉइस डाउनलोड करें (PDF)",

  // Auth
  "auth.loginTitle": "वापसी पर स्वागत है",
  "auth.registerTitle": "अपना खाता बनाएँ",
  "auth.email": "ईमेल",
  "auth.password": "पासवर्ड",
  "auth.name": "नाम",
  "auth.signIn": "साइन इन करें",
  "auth.signUp": "साइन अप करें",
  "auth.noAccount": "खाता नहीं है?",
  "auth.haveAccount": "पहले से खाता है?",

  // Settings
  "settings.title": "सेटिंग्स",
  "settings.language": "भाषा",
  "settings.languageHint": "अपनी पसंदीदा भाषा चुनें",
  "settings.theme": "थीम",
};

const ta = {
  // Navbar
  "nav.home": "முகப்பு",
  "nav.favorites": "பிடித்தவை",
  "nav.orders": "என் ஆர்டர்கள்",
  "nav.shop": "கடை டாஷ்போர்டு",
  "nav.admin": "நிர்வாகி",
  "nav.settings": "அமைப்புகள்",
  "nav.notifications": "அறிவிப்புகள்",
  "nav.cart": "கார்ட்",
  "nav.login": "உள்நுழை",
  "nav.logout": "வெளியேறு",
  "nav.register": "கணக்கை உருவாக்கு",
  "nav.search": "கடைகள் & பொருட்களைத் தேடு…",
  "nav.account": "கணக்கு மெனு",
  "nav.getApp": "ஆப்பைப் பதிவிறக்கு",
  "nav.go": "செல்",
  "nav.seeAll": "அனைத்து முடிவுகளையும் காண்க",
  "nav.noMatches": "பொருத்தம் இல்லை",
  "nav.searching": "தேடுகிறது…",
  "nav.shops": "கடைகள்",
  "nav.products": "பொருட்கள்",

  // Common
  "common.add": "சேர்",
  "common.added": "சேர்க்கப்பட்டது",
  "common.remove": "அகற்று",
  "common.save": "சேமி",
  "common.cancel": "ரத்து",
  "common.update": "புதுப்பி",
  "common.delete": "நீக்கு",
  "common.edit": "திருத்து",
  "common.close": "மூடு",
  "common.loading": "ஏற்றுகிறது…",
  "common.back": "பின்",
  "common.viewAll": "அனைத்தையும் காண்க",
  "common.inStock": "கையிருப்பில் உள்ளது",
  "common.outOfStock": "கையிருப்பு இல்லை",
  "common.veg": "சைவம்",
  "common.nonVeg": "அசைவம்",
  "common.addToCart": "கார்ட்டில் சேர்",
  "common.total": "மொத்தம்",
  "common.free": "இலவசம்",

  // Home
  "home.hero.title": "மளிகை, உணவு & அத்தியாவசியப் பொருட்கள் — விரைவாக",
  "home.hero.sub":
    "உங்கள் அருகிலுள்ள டிபார்ட்மென்ட் ஸ்டோர்கள், மருந்தகங்கள், ஜூஸ் பார்கள், உணவகங்கள் மற்றும் பலவற்றிலிருந்து.",
  "home.search": "தேடு",
  "home.shopByCategory": "வகை வாரியாக வாங்குங்கள்",
  "home.filters": "வடிகட்டிகள்",
  "home.categories": "வகைகள்",
  "home.allShops": "அனைத்து கடைகள்",
  "home.allShopsNear": "உங்கள் அருகிலுள்ள அனைத்து கடைகள்",
  "home.shopsNear": "உங்கள் அருகிலுள்ள கடைகள்",
  "home.noShops": "கடைகள் எதுவும் இல்லை",
  "home.openNow": "இப்போது திறந்துள்ளது",
  "home.freeDelivery": "இலவச டெலிவரி",

  // Cart
  "cart.title": "உங்கள் கார்ட்",
  "cart.empty": "உங்கள் கார்ட் காலியாக உள்ளது",
  "cart.itemsTotal": "பொருட்கள் மொத்தம்",
  "cart.deliveryFee": "டெலிவரி கட்டணம்",
  "cart.checkout": "செக்அவுட்டுக்குச் செல்",
  "cart.placeOrder": "ஆர்டர் செய்",
  "cart.browse": "கடைகளைப் பார்",

  // Orders
  "orders.title": "என் ஆர்டர்கள்",
  "orders.none": "இதுவரை ஆர்டர்கள் இல்லை",
  "orders.track": "ஆர்டரைக் கண்காணி",
  "orders.reorder": "மீண்டும் ஆர்டர் செய்",
  "orders.invoice": "விலைப்பட்டியலைப் பதிவிறக்கு (PDF)",

  // Auth
  "auth.loginTitle": "மீண்டும் வரவேற்கிறோம்",
  "auth.registerTitle": "உங்கள் கணக்கை உருவாக்குங்கள்",
  "auth.email": "மின்னஞ்சல்",
  "auth.password": "கடவுச்சொல்",
  "auth.name": "பெயர்",
  "auth.signIn": "உள்நுழை",
  "auth.signUp": "பதிவு செய்",
  "auth.noAccount": "கணக்கு இல்லையா?",
  "auth.haveAccount": "ஏற்கனவே கணக்கு உள்ளதா?",

  // Settings
  "settings.title": "அமைப்புகள்",
  "settings.language": "மொழி",
  "settings.languageHint": "உங்கள் விருப்ப மொழியைத் தேர்ந்தெடுக்கவும்",
  "settings.theme": "தீம்",
};

export const DICTIONARIES = { en, hi, ta };

// Look up a key for the active language, falling back to English, then to the
// provided fallback, then to the key itself so nothing ever renders blank.
export function translate(lang, key, fallback) {
  const dict = DICTIONARIES[lang] || DICTIONARIES[DEFAULT_LANG];
  if (dict[key] !== undefined) return dict[key];
  if (DICTIONARIES[DEFAULT_LANG][key] !== undefined) return DICTIONARIES[DEFAULT_LANG][key];
  return fallback !== undefined ? fallback : key;
}
