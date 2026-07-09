import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

// Cart is limited to a single shop at a time (like Swiggy/Zomato).
export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("lm_cart")) || [];
    } catch {
      return [];
    }
  });
  const [shopId, setShopId] = useState(
    () => localStorage.getItem("lm_cart_shop") || null
  );
  const [shopName, setShopName] = useState(
    () => localStorage.getItem("lm_cart_shopname") || ""
  );

  useEffect(() => {
    localStorage.setItem("lm_cart", JSON.stringify(items));
    if (shopId) localStorage.setItem("lm_cart_shop", shopId);
    else localStorage.removeItem("lm_cart_shop");
    if (shopName) localStorage.setItem("lm_cart_shopname", shopName);
  }, [items, shopId, shopName]);

  const addItem = (product, shop) => {
    // If adding from a different shop, ask to reset
    if (shopId && shopId !== shop._id) {
      const ok = window.confirm(
        `Your cart has items from another shop. Clear it and add from "${shop.name}"?`
      );
      if (!ok) return false;
      setItems([{ ...toLine(product), qty: 1 }]);
      setShopId(shop._id);
      setShopName(shop.name);
      return true;
    }
    setShopId(shop._id);
    setShopName(shop.name);
    setItems((prev) => {
      const found = prev.find((i) => i.product === product._id);
      if (found) {
        return prev.map((i) =>
          i.product === product._id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...toLine(product), qty: 1 }];
    });
    return true;
  };

  const toLine = (p) => ({
    product: p._id,
    name: p.name,
    price: p.price,
    unit: p.unit,
  });

  const decItem = (productId) => {
    setItems((prev) =>
      prev
        .map((i) => (i.product === productId ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const removeItem = (productId) =>
    setItems((prev) => prev.filter((i) => i.product !== productId));

  const clearCart = () => {
    setItems([]);
    setShopId(null);
    setShopName("");
  };

  const itemsTotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        shopId,
        shopName,
        addItem,
        decItem,
        removeItem,
        clearCart,
        itemsTotal,
        count,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
