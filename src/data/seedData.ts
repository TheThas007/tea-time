import { MenuItem, Category, TableItem, CafeSettings } from "../types";

export const DEFAULT_CATEGORY_ICONS: Record<string, string> = {
  "all": "/assets/favicon.png",
  "special menu": "/images/menu/special/ice-milo.png",
  "coffee & milk tea": "/images/menu/coffee/milk-coffee.png",
  "non-milk tea": "/images/menu/tea/plain-tea.png",
  "short eats & sandwiches": "/images/menu/sandwiches/chicken-roll.png",
  "buns & burgers": "/images/menu/buns/burger.png",
  "cakes & sweets": "/images/menu/cakes/brownie-with-ice-cream.png",
  "french fries": "/images/menu/fries/french-fries-100g.png",
  "fresh juices": "/images/menu/juices/orange-juice.png",
  "mojito": "/images/menu/mojito/lemon-mojito.png",
  "bubble tea": "/images/menu/bubble-tea/ice-coffee-bubble-tea.png",
  "milkshakes": "/images/menu/milkshakes/oreo-milkshake.png",
  "falooda & sharbat": "/images/menu/falooda/falooda.png",
  "lassi": "/images/menu/lassi/mango-lassi.png",
  "ice cream": "/images/menu/ice-cream/special-ice-cream.png",
  "biryani": "/images/menu/biryani/bamboo-chicken-biryani.png"
};

export const INITIAL_CATEGORIES: Category[] = [
  {
    "id": "cat_special_menu",
    "name": "Special Menu",
    "slug": "special-menu",
    "displayOrder": 1,
    "iconUrl": "/images/menu/special/ice-milo.png"
  },
  {
    "id": "cat_coffee_milk_tea",
    "name": "Coffee & Milk Tea",
    "slug": "coffee-milk-tea",
    "displayOrder": 2,
    "iconUrl": "/images/menu/coffee/milk-coffee.png"
  },
  {
    "id": "cat_non_milk_tea",
    "name": "Non-Milk Tea",
    "slug": "non-milk-tea",
    "displayOrder": 3,
    "iconUrl": "/images/menu/tea/plain-tea.png"
  },
  {
    "id": "cat_short_eats_sandwiches",
    "name": "Short Eats & Sandwiches",
    "slug": "short-eats-sandwiches",
    "displayOrder": 4,
    "iconUrl": "/images/menu/sandwiches/chicken-roll.png"
  },
  {
    "id": "cat_buns_burgers",
    "name": "Buns & Burgers",
    "slug": "buns-burgers",
    "displayOrder": 5,
    "iconUrl": "/images/menu/buns/burger.png"
  },
  {
    "id": "cat_cakes_sweets",
    "name": "Cakes & Sweets",
    "slug": "cakes-sweets",
    "displayOrder": 6,
    "iconUrl": "/images/menu/cakes/brownie-with-ice-cream.png"
  },
  {
    "id": "cat_french_fries",
    "name": "French Fries",
    "slug": "french-fries",
    "displayOrder": 7,
    "iconUrl": "/images/menu/fries/french-fries-100g.png"
  },
  {
    "id": "cat_fresh_juices",
    "name": "Fresh Juices",
    "slug": "fresh-juices",
    "displayOrder": 8,
    "iconUrl": "/images/menu/juices/orange-juice.png"
  },
  {
    "id": "cat_mojito",
    "name": "Mojito",
    "slug": "mojito",
    "displayOrder": 9,
    "iconUrl": "/images/menu/mojito/lemon-mojito.png"
  },
  {
    "id": "cat_bubble_tea",
    "name": "Bubble Tea",
    "slug": "bubble-tea",
    "displayOrder": 10,
    "iconUrl": "/images/menu/bubble-tea/ice-coffee-bubble-tea.png"
  },
  {
    "id": "cat_milkshakes",
    "name": "Milkshakes",
    "slug": "milkshakes",
    "displayOrder": 11,
    "iconUrl": "/images/menu/milkshakes/oreo-milkshake.png"
  },
  {
    "id": "cat_falooda_sharbat",
    "name": "Falooda & Sharbat",
    "slug": "falooda-sharbat",
    "displayOrder": 12,
    "iconUrl": "/images/menu/falooda/falooda.png"
  },
  {
    "id": "cat_lassi",
    "name": "Lassi",
    "slug": "lassi",
    "displayOrder": 13,
    "iconUrl": "/images/menu/lassi/mango-lassi.png"
  },
  {
    "id": "cat_ice_cream",
    "name": "Ice Cream",
    "slug": "ice-cream",
    "displayOrder": 14,
    "iconUrl": "/images/menu/ice-cream/special-ice-cream.png"
  },
  {
    "id": "cat_biryani",
    "name": "Biryani",
    "slug": "biryani",
    "displayOrder": 15,
    "iconUrl": "/images/menu/biryani/bamboo-chicken-biryani.png"
  }
];

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    "id": "ice-milo",
    "name": "Ice Milo",
    "price": 400,
    "category": "Special Menu",
    "image": "/images/menu/special/ice-milo.png",
    "available": true,
    "featured": true,
    "description": "Chilled chocolate malt Milo served over ice with rich creamy milk.",
    "priceMinor": 40000,
    "priceDisplay": 400,
    "imageUrl": "/images/menu/special/ice-milo.png",
    "imageUrls": [
      "/images/menu/special/ice-milo.png",
      "/images/menu/special/ice-milo-2.png",
      "/images/menu/special/ice-milo-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 1,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "special-burger",
    "name": "Special Burger",
    "price": 450,
    "category": "Special Menu",
    "image": "/images/menu/special/special-burger.png",
    "available": true,
    "featured": true,
    "description": "House special loaded burger crafted fresh to order.",
    "priceMinor": 45000,
    "priceDisplay": 450,
    "imageUrl": "/images/menu/special/special-burger.png",
    "imageUrls": [
      "/images/menu/special/special-burger.png"
    ],
    "isAvailable": true,
    "displayOrder": 2,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "special-lemon-mojito",
    "name": "Special Lemon Mojito",
    "price": 350,
    "category": "Special Menu",
    "image": "/images/menu/special/special-lemon-mojito.png",
    "available": true,
    "featured": true,
    "description": "Signature zesty lemon and fresh mint cooler served chilled.",
    "priceMinor": 35000,
    "priceDisplay": 350,
    "imageUrl": "/images/menu/special/special-lemon-mojito.png",
    "imageUrls": [
      "/images/menu/special/special-lemon-mojito.png"
    ],
    "isAvailable": true,
    "displayOrder": 3,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "masala-chai",
    "name": "Masala Chai",
    "price": 150,
    "category": "Coffee & Milk Tea",
    "categories": [
      "Special Menu",
      "Coffee & Milk Tea"
    ],
    "image": "/images/menu/coffee/masala-chai.png",
    "available": true,
    "featured": true,
    "description": "Aromatic Ceylon milk tea slow-brewed with cardamom, cinnamon, and warm spices.",
    "priceMinor": 15000,
    "priceDisplay": 150,
    "imageUrl": "/images/menu/coffee/masala-chai.png",
    "imageUrls": [
      "/images/menu/coffee/masala-chai.png",
      "/images/menu/coffee/masala-chai-2.png",
      "/images/menu/coffee/masala-chai-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 4,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "lassi",
    "name": "Lassi",
    "price": 400,
    "category": "Special Menu",
    "image": "/images/menu/special/lassi.png",
    "available": true,
    "featured": true,
    "description": "Chilled, creamy traditional yogurt lassi blended smooth.",
    "priceMinor": 40000,
    "priceDisplay": 400,
    "imageUrl": "/images/menu/special/lassi.png",
    "imageUrls": [
      "/images/menu/special/lassi.png"
    ],
    "isAvailable": true,
    "displayOrder": 5,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "bamboo-chicken-biryani",
    "name": "Bamboo Chicken Biryani",
    "price": 950,
    "category": "Biryani",
    "categories": [
      "Special Menu",
      "Biryani"
    ],
    "image": "/images/menu/biryani/bamboo-chicken-biryani.png",
    "available": true,
    "featured": true,
    "description": "Fragrant spiced basmati chicken biryani steamed in bamboo and served on banana leaf. Wednesday only • Pre-order before 10:00 AM.",
    "priceMinor": 95000,
    "priceDisplay": 950,
    "imageUrl": "/images/menu/biryani/bamboo-chicken-biryani.png",
    "imageUrls": [
      "/images/menu/biryani/bamboo-chicken-biryani.png",
      "/images/menu/biryani/bamboo-chicken-biryani-2.png",
      "/images/menu/biryani/bamboo-chicken-biryani-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 6,
    "badge": "Wednesday Special",
    "availabilityNote": "Wednesday only • Pre-order before 10:00 AM",
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "milk-coffee",
    "name": "Milk Coffee",
    "price": 100,
    "category": "Coffee & Milk Tea",
    "image": "/images/menu/coffee/milk-coffee.png",
    "available": true,
    "description": "Classic Sri Lankan roasted coffee brewed hot with creamy fresh milk.",
    "priceMinor": 10000,
    "priceDisplay": 100,
    "imageUrl": "/images/menu/coffee/milk-coffee.png",
    "imageUrls": [
      "/images/menu/coffee/milk-coffee.png",
      "/images/menu/coffee/milk-coffee-2.png",
      "/images/menu/coffee/milk-coffee-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 7,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "milk-tea",
    "name": "Milk Tea",
    "price": 100,
    "category": "Coffee & Milk Tea",
    "image": "/images/menu/coffee/milk-tea.png",
    "available": true,
    "description": "Rich Ceylon black tea pulled hot with velvety fresh milk.",
    "priceMinor": 10000,
    "priceDisplay": 100,
    "imageUrl": "/images/menu/coffee/milk-tea.png",
    "imageUrls": [
      "/images/menu/coffee/milk-tea.png",
      "/images/menu/coffee/milk-tea-2.png",
      "/images/menu/coffee/milk-tea-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 8,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "cardamom-tea",
    "name": "Cardamom Tea",
    "price": 120,
    "category": "Coffee & Milk Tea",
    "image": "/images/menu/coffee/cardamom-tea.png",
    "available": true,
    "description": "Warm Ceylon milk tea infused with fragrant crushed green cardamom pods.",
    "priceMinor": 12000,
    "priceDisplay": 120,
    "imageUrl": "/images/menu/coffee/cardamom-tea.png",
    "imageUrls": [
      "/images/menu/coffee/cardamom-tea.png",
      "/images/menu/coffee/cardamom-tea-2.png",
      "/images/menu/coffee/cardamom-tea-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 9,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "hot-chocolate",
    "name": "Hot Chocolate",
    "price": 120,
    "category": "Coffee & Milk Tea",
    "image": "/images/menu/coffee/hot-chocolate.png",
    "available": true,
    "description": "Smooth, comforting hot cocoa whisked with steamed milk.",
    "priceMinor": 12000,
    "priceDisplay": 120,
    "imageUrl": "/images/menu/coffee/hot-chocolate.png",
    "imageUrls": [
      "/images/menu/coffee/hot-chocolate.png",
      "/images/menu/coffee/hot-chocolate-2.png",
      "/images/menu/coffee/hot-chocolate-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 10,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "ice-coffee",
    "name": "Ice Coffee",
    "price": 300,
    "category": "Coffee & Milk Tea",
    "image": "/images/menu/coffee/ice-coffee.png",
    "available": true,
    "description": "Chilled Sri Lankan iced milk coffee served refreshing over ice.",
    "priceMinor": 30000,
    "priceDisplay": 300,
    "imageUrl": "/images/menu/coffee/ice-coffee.png",
    "imageUrls": [
      "/images/menu/coffee/ice-coffee.png",
      "/images/menu/coffee/ice-coffee-2.png",
      "/images/menu/coffee/ice-coffee-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 11,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "ice-coffee-with-ice-cream",
    "name": "Ice Coffee with Ice Cream",
    "price": 350,
    "category": "Coffee & Milk Tea",
    "image": "/images/menu/coffee/ice-coffee-with-ice-cream.png",
    "available": true,
    "description": "Chilled creamy iced coffee topped with a generous scoop of vanilla ice cream.",
    "priceMinor": 35000,
    "priceDisplay": 350,
    "imageUrl": "/images/menu/coffee/ice-coffee-with-ice-cream.png",
    "imageUrls": [
      "/images/menu/coffee/ice-coffee-with-ice-cream.png",
      "/images/menu/coffee/ice-coffee-with-ice-cream-2.png",
      "/images/menu/coffee/ice-coffee-with-ice-cream-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 12,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "plain-tea",
    "name": "Plain Tea",
    "price": 50,
    "category": "Non-Milk Tea",
    "image": "/images/menu/tea/plain-tea.png",
    "available": true,
    "description": "Pure, brisk amber Ceylon black tea brewed fresh.",
    "priceMinor": 5000,
    "priceDisplay": 50,
    "imageUrl": "/images/menu/tea/plain-tea.png",
    "imageUrls": [
      "/images/menu/tea/plain-tea.png",
      "/images/menu/tea/plain-tea-2.png",
      "/images/menu/tea/plain-tea-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 13,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "green-tea",
    "name": "Green Tea",
    "price": 60,
    "category": "Non-Milk Tea",
    "image": "/images/menu/tea/green-tea.png",
    "available": true,
    "description": "Light, soothing pure Ceylon green tea served warm.",
    "priceMinor": 6000,
    "priceDisplay": 60,
    "imageUrl": "/images/menu/tea/green-tea.png",
    "imageUrls": [
      "/images/menu/tea/green-tea.png",
      "/images/menu/tea/green-tea-2.png",
      "/images/menu/tea/green-tea-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 14,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "cinnamon-tea",
    "name": "Cinnamon Tea",
    "price": 60,
    "category": "Non-Milk Tea",
    "image": "/images/menu/tea/cinnamon-tea.png",
    "available": true,
    "description": "Amber Ceylon tea steeped with aromatic Sri Lankan cinnamon.",
    "priceMinor": 6000,
    "priceDisplay": 60,
    "imageUrl": "/images/menu/tea/cinnamon-tea.png",
    "imageUrls": [
      "/images/menu/tea/cinnamon-tea.png",
      "/images/menu/tea/cinnamon-tea-2.png",
      "/images/menu/tea/cinnamon-tea-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 15,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "ginger-tea",
    "name": "Ginger Tea",
    "price": 60,
    "category": "Non-Milk Tea",
    "image": "/images/menu/tea/ginger-tea.png",
    "available": true,
    "description": "Warming Ceylon black tea infused with fresh crushed ginger.",
    "priceMinor": 6000,
    "priceDisplay": 60,
    "imageUrl": "/images/menu/tea/ginger-tea.png",
    "imageUrls": [
      "/images/menu/tea/ginger-tea.png",
      "/images/menu/tea/ginger-tea-2.png",
      "/images/menu/tea/ginger-tea-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 16,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "strawberry-tea",
    "name": "Strawberry Tea",
    "price": 60,
    "category": "Non-Milk Tea",
    "image": "/images/menu/tea/strawberry-tea.png",
    "available": true,
    "description": "Fragrant fruit-infused Ceylon tea with sweet strawberry notes.",
    "priceMinor": 6000,
    "priceDisplay": 60,
    "imageUrl": "/images/menu/tea/strawberry-tea.png",
    "imageUrls": [
      "/images/menu/tea/strawberry-tea.png",
      "/images/menu/tea/strawberry-tea-2.png"
    ],
    "isAvailable": true,
    "displayOrder": 17,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "mint-tea",
    "name": "Mint Tea",
    "price": 60,
    "category": "Non-Milk Tea",
    "image": "/images/menu/tea/mint-tea.png",
    "available": true,
    "description": "Refreshing brisk Ceylon tea steeped with fresh garden mint leaves.",
    "priceMinor": 6000,
    "priceDisplay": 60,
    "imageUrl": "/images/menu/tea/mint-tea.png",
    "imageUrls": [
      "/images/menu/tea/mint-tea.png",
      "/images/menu/tea/mint-tea-2.png",
      "/images/menu/tea/mint-tea-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 18,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "vanilla-tea",
    "name": "Vanilla Tea",
    "price": 60,
    "category": "Non-Milk Tea",
    "image": "/images/menu/tea/vanilla-tea.png",
    "available": true,
    "description": "Smooth Ceylon black tea delicately scented with warm vanilla.",
    "priceMinor": 6000,
    "priceDisplay": 60,
    "imageUrl": "/images/menu/tea/vanilla-tea.png",
    "imageUrls": [
      "/images/menu/tea/vanilla-tea.png",
      "/images/menu/tea/vanilla-tea-2.png",
      "/images/menu/tea/vanilla-tea-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 19,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "veg-roll",
    "name": "Veg Roll",
    "price": 80,
    "category": "Short Eats & Sandwiches",
    "image": "/images/menu/sandwiches/veg-roll.png",
    "available": true,
    "description": "Golden crumbed Sri Lankan roll filled with seasoned spiced vegetables.",
    "priceMinor": 8000,
    "priceDisplay": 80,
    "imageUrl": "/images/menu/sandwiches/veg-roll.png",
    "imageUrls": [
      "/images/menu/sandwiches/veg-roll.png",
      "/images/menu/sandwiches/veg-roll-2.png",
      "/images/menu/sandwiches/veg-roll-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 20,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "egg-roll",
    "name": "Egg Roll",
    "price": 100,
    "category": "Short Eats & Sandwiches",
    "image": "/images/menu/sandwiches/egg-roll.png",
    "available": true,
    "description": "Crispy breadcrumbed pancake roll stuffed with egg and spiced potato.",
    "priceMinor": 10000,
    "priceDisplay": 100,
    "imageUrl": "/images/menu/sandwiches/egg-roll.png",
    "imageUrls": [
      "/images/menu/sandwiches/egg-roll.png",
      "/images/menu/sandwiches/egg-roll-2.png",
      "/images/menu/sandwiches/egg-roll-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 21,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "chicken-roll",
    "name": "Chicken Roll",
    "price": 100,
    "category": "Short Eats & Sandwiches",
    "image": "/images/menu/sandwiches/chicken-roll.png",
    "available": true,
    "description": "Crispy golden Sri Lankan short-eat roll with savory spiced chicken filling.",
    "priceMinor": 10000,
    "priceDisplay": 100,
    "imageUrl": "/images/menu/sandwiches/chicken-roll.png",
    "imageUrls": [
      "/images/menu/sandwiches/chicken-roll.png",
      "/images/menu/sandwiches/chicken-roll-2.png",
      "/images/menu/sandwiches/chicken-roll-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 22,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "seenisambal-sandwich",
    "name": "Seenisambal Sandwich",
    "price": 80,
    "category": "Short Eats & Sandwiches",
    "image": "/images/menu/sandwiches/seenisambal-sandwich.png",
    "available": true,
    "description": "Soft sandwich layered with sweet-spicy caramelized Sri Lankan seenisambal.",
    "priceMinor": 8000,
    "priceDisplay": 80,
    "imageUrl": "/images/menu/sandwiches/seenisambal-sandwich.png",
    "imageUrls": [
      "/images/menu/sandwiches/seenisambal-sandwich.png",
      "/images/menu/sandwiches/seenisambal-sandwich-2.png",
      "/images/menu/sandwiches/seenisambal-sandwich-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 23,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "veg-salad-sandwich",
    "name": "Veg Salad Sandwich",
    "price": 110,
    "category": "Short Eats & Sandwiches",
    "image": "/images/menu/sandwiches/veg-salad-sandwich.png",
    "available": true,
    "description": "Fresh garden vegetable salad sandwich with creamy dressing.",
    "priceMinor": 11000,
    "priceDisplay": 110,
    "imageUrl": "/images/menu/sandwiches/veg-salad-sandwich.png",
    "imageUrls": [
      "/images/menu/sandwiches/veg-salad-sandwich.png",
      "/images/menu/sandwiches/veg-salad-sandwich-2.png",
      "/images/menu/sandwiches/veg-salad-sandwich-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 24,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "sausages-sandwich",
    "name": "Sausages Sandwich",
    "price": 130,
    "category": "Short Eats & Sandwiches",
    "image": "/images/menu/sandwiches/sausages-sandwich.png",
    "available": true,
    "description": "Toasted sandwich filled with savory grilled sausages and seasoned onions.",
    "priceMinor": 13000,
    "priceDisplay": 130,
    "imageUrl": "/images/menu/sandwiches/sausages-sandwich.png",
    "imageUrls": [
      "/images/menu/sandwiches/sausages-sandwich.png",
      "/images/menu/sandwiches/sausages-sandwich-2.png"
    ],
    "isAvailable": true,
    "displayOrder": 25,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "fish-sandwich",
    "name": "Fish Sandwich",
    "price": 170,
    "category": "Short Eats & Sandwiches",
    "image": "/images/menu/sandwiches/fish-sandwich.png",
    "available": true,
    "description": "Savory spiced Sri Lankan fish sandwich prepared fresh.",
    "priceMinor": 17000,
    "priceDisplay": 170,
    "imageUrl": "/images/menu/sandwiches/fish-sandwich.png",
    "imageUrls": [
      "/images/menu/sandwiches/fish-sandwich.png",
      "/images/menu/sandwiches/fish-sandwich-2.png",
      "/images/menu/sandwiches/fish-sandwich-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 26,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "tea-bun",
    "name": "Tea Bun",
    "price": 60,
    "category": "Buns & Burgers",
    "image": "/images/menu/buns/tea-bun.png",
    "available": true,
    "description": "Soft, lightly sweet traditional Sri Lankan bakery tea bun.",
    "priceMinor": 6000,
    "priceDisplay": 60,
    "imageUrl": "/images/menu/buns/tea-bun.png",
    "imageUrls": [
      "/images/menu/buns/tea-bun.png"
    ],
    "isAvailable": true,
    "displayOrder": 27,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "seenisambal-bun",
    "name": "Seenisambal Bun",
    "price": 80,
    "category": "Buns & Burgers",
    "image": "/images/menu/buns/seenisambal-bun.png",
    "available": true,
    "description": "Soft golden bakery bun generously filled with caramelized onion seenisambal.",
    "priceMinor": 8000,
    "priceDisplay": 80,
    "imageUrl": "/images/menu/buns/seenisambal-bun.png",
    "imageUrls": [
      "/images/menu/buns/seenisambal-bun.png",
      "/images/menu/buns/seenisambal-bun-2.png",
      "/images/menu/buns/seenisambal-bun-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 28,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "omelette-bun",
    "name": "Omelette Bun",
    "price": 120,
    "category": "Buns & Burgers",
    "image": "/images/menu/buns/omelette-bun.png",
    "available": true,
    "description": "Warm bakery bun stuffed with a fluffy seasoned Sri Lankan omelette.",
    "priceMinor": 12000,
    "priceDisplay": 120,
    "imageUrl": "/images/menu/buns/omelette-bun.png",
    "imageUrls": [
      "/images/menu/buns/omelette-bun.png",
      "/images/menu/buns/omelette-bun-2.png",
      "/images/menu/buns/omelette-bun-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 29,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "egg-fry-bun",
    "name": "Egg Fry Bun",
    "price": 120,
    "category": "Buns & Burgers",
    "image": "/images/menu/buns/egg-fry-bun.png",
    "available": true,
    "description": "Soft bun layered with a freshly fried egg and savory seasoning.",
    "priceMinor": 12000,
    "priceDisplay": 120,
    "imageUrl": "/images/menu/buns/egg-fry-bun.png",
    "imageUrls": [
      "/images/menu/buns/egg-fry-bun.png",
      "/images/menu/buns/egg-fry-bun-2.png",
      "/images/menu/buns/egg-fry-bun-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 30,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "sausages-bun",
    "name": "Sausages Bun",
    "price": 130,
    "category": "Buns & Burgers",
    "image": "/images/menu/buns/sausages-bun.png",
    "available": true,
    "description": "Golden baked Sri Lankan bakery bun wrapped around a savory sausage.",
    "priceMinor": 13000,
    "priceDisplay": 130,
    "imageUrl": "/images/menu/buns/sausages-bun.png",
    "imageUrls": [
      "/images/menu/buns/sausages-bun.png",
      "/images/menu/buns/sausages-bun-2.png",
      "/images/menu/buns/sausages-bun-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 31,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "drumstick-bun",
    "name": "Drumstick Bun",
    "price": 200,
    "category": "Buns & Burgers",
    "image": "/images/menu/buns/drumstick-bun.png",
    "available": true,
    "description": "Hearty golden bakery bun filled with spiced chicken drumstick.",
    "priceMinor": 20000,
    "priceDisplay": 200,
    "imageUrl": "/images/menu/buns/drumstick-bun.png",
    "imageUrls": [
      "/images/menu/buns/drumstick-bun.png",
      "/images/menu/buns/drumstick-bun-2.png",
      "/images/menu/buns/drumstick-bun-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 32,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "hotdog-bun",
    "name": "Hotdog Bun",
    "price": 200,
    "category": "Buns & Burgers",
    "image": "/images/menu/buns/hotdog-bun.png",
    "available": true,
    "description": "Soft bakery hotdog roll with grilled sausage, fresh greens, and sauce.",
    "priceMinor": 20000,
    "priceDisplay": 200,
    "imageUrl": "/images/menu/buns/hotdog-bun.png",
    "imageUrls": [
      "/images/menu/buns/hotdog-bun.png",
      "/images/menu/buns/hotdog-bun-2.png",
      "/images/menu/buns/hotdog-bun-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 33,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "burger",
    "name": "Burger",
    "price": 350,
    "category": "Buns & Burgers",
    "image": "/images/menu/buns/burger.png",
    "available": true,
    "description": "Classic café chicken burger with crisp lettuce, tomato, and house sauce.",
    "priceMinor": 35000,
    "priceDisplay": 350,
    "imageUrl": "/images/menu/buns/burger.png",
    "imageUrls": [
      "/images/menu/buns/burger.png",
      "/images/menu/buns/burger-2.png",
      "/images/menu/buns/burger-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 34,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "laddu",
    "name": "Laddu",
    "price": 70,
    "category": "Cakes & Sweets",
    "image": "/images/menu/cakes/laddu.png",
    "available": true,
    "description": "Traditional sweet golden gram flour laddu infused with cardamom.",
    "priceMinor": 7000,
    "priceDisplay": 70,
    "imageUrl": "/images/menu/cakes/laddu.png",
    "imageUrls": [
      "/images/menu/cakes/laddu.png",
      "/images/menu/cakes/laddu-2.png",
      "/images/menu/cakes/laddu-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 35,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "cup-cake",
    "name": "Cup Cake",
    "price": 60,
    "category": "Cakes & Sweets",
    "image": "/images/menu/cakes/cup-cake.png",
    "available": true,
    "description": "Fluffy freshly baked teatime vanilla sponge cupcake.",
    "priceMinor": 6000,
    "priceDisplay": 60,
    "imageUrl": "/images/menu/cakes/cup-cake.png",
    "imageUrls": [
      "/images/menu/cakes/cup-cake.png"
    ],
    "isAvailable": true,
    "displayOrder": 36,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "chocolate-cup-cake",
    "name": "Chocolate Cup Cake",
    "price": 110,
    "category": "Cakes & Sweets",
    "image": "/images/menu/cakes/chocolate-cup-cake.png",
    "available": true,
    "description": "Rich chocolate sponge cupcake topped with smooth chocolate swirl.",
    "priceMinor": 11000,
    "priceDisplay": 110,
    "imageUrl": "/images/menu/cakes/chocolate-cup-cake.png",
    "imageUrls": [
      "/images/menu/cakes/chocolate-cup-cake.png",
      "/images/menu/cakes/chocolate-cup-cake-2.png",
      "/images/menu/cakes/chocolate-cup-cake-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 37,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "cup-cake-with-ice-cream",
    "name": "Cup Cake with Ice Cream",
    "price": 180,
    "category": "Cakes & Sweets",
    "image": "/images/menu/cakes/cup-cake-with-ice-cream.png",
    "available": true,
    "description": "Soft cupcake served warm alongside a creamy scoop of vanilla ice cream.",
    "priceMinor": 18000,
    "priceDisplay": 180,
    "imageUrl": "/images/menu/cakes/cup-cake-with-ice-cream.png",
    "imageUrls": [
      "/images/menu/cakes/cup-cake-with-ice-cream.png",
      "/images/menu/cakes/cup-cake-with-ice-cream-2.png",
      "/images/menu/cakes/cup-cake-with-ice-cream-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 38,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "cake-pieces",
    "name": "Cake Pieces",
    "price": 150,
    "category": "Cakes & Sweets",
    "image": "/images/menu/cakes/cake-pieces.png",
    "available": true,
    "description": "Homestyle golden Sri Lankan butter cake slices.",
    "priceMinor": 15000,
    "priceDisplay": 150,
    "imageUrl": "/images/menu/cakes/cake-pieces.png",
    "imageUrls": [
      "/images/menu/cakes/cake-pieces.png",
      "/images/menu/cakes/cake-pieces-2.png",
      "/images/menu/cakes/cake-pieces-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 39,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "brownie",
    "name": "Brownie",
    "price": 250,
    "category": "Cakes & Sweets",
    "image": "/images/menu/cakes/brownie.png",
    "available": true,
    "description": "Fudgy dark chocolate brownie square baked with rich cocoa.",
    "priceMinor": 25000,
    "priceDisplay": 250,
    "imageUrl": "/images/menu/cakes/brownie.png",
    "imageUrls": [
      "/images/menu/cakes/brownie.png",
      "/images/menu/cakes/brownie-2.png",
      "/images/menu/cakes/brownie-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 40,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "brownie-with-ice-cream",
    "name": "Brownie with Ice Cream",
    "price": 350,
    "category": "Cakes & Sweets",
    "image": "/images/menu/cakes/brownie-with-ice-cream.png",
    "available": true,
    "description": "Warm fudgy chocolate brownie topped with creamy vanilla ice cream.",
    "priceMinor": 35000,
    "priceDisplay": 350,
    "imageUrl": "/images/menu/cakes/brownie-with-ice-cream.png",
    "imageUrls": [
      "/images/menu/cakes/brownie-with-ice-cream.png",
      "/images/menu/cakes/brownie-with-ice-cream-2.png",
      "/images/menu/cakes/brownie-with-ice-cream-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 41,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "french-fries-100g",
    "name": "French Fries 100g",
    "price": 400,
    "category": "French Fries",
    "image": "/images/menu/fries/french-fries-100g.png",
    "available": true,
    "description": "100g portion of crispy golden French fries served hot with tomato ketchup.",
    "priceMinor": 40000,
    "priceDisplay": 400,
    "imageUrl": "/images/menu/fries/french-fries-100g.png",
    "imageUrls": [
      "/images/menu/fries/french-fries-100g.png",
      "/images/menu/fries/french-fries-100g-2.png",
      "/images/menu/fries/french-fries-100g-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 42,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "french-fries-200g",
    "name": "French Fries 200g",
    "price": 700,
    "category": "French Fries",
    "image": "/images/menu/fries/french-fries-200g.png",
    "available": true,
    "description": "Generous 200g sharing portion of crispy golden French fries with ketchup.",
    "priceMinor": 70000,
    "priceDisplay": 700,
    "imageUrl": "/images/menu/fries/french-fries-200g.png",
    "imageUrls": [
      "/images/menu/fries/french-fries-200g.png",
      "/images/menu/fries/french-fries-200g-2.png",
      "/images/menu/fries/french-fries-200g-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 43,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "watermelon-juice",
    "name": "Watermelon Juice",
    "price": 280,
    "category": "Fresh Juices",
    "image": "/images/menu/juices/watermelon-juice.png",
    "available": true,
    "description": "Chilled freshly pressed sweet red watermelon juice.",
    "priceMinor": 28000,
    "priceDisplay": 280,
    "imageUrl": "/images/menu/juices/watermelon-juice.png",
    "imageUrls": [
      "/images/menu/juices/watermelon-juice.png",
      "/images/menu/juices/watermelon-juice-2.png",
      "/images/menu/juices/watermelon-juice-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 44,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "passion-fruit-juice",
    "name": "Passion Fruit Juice",
    "price": 330,
    "category": "Fresh Juices",
    "image": "/images/menu/juices/passion-fruit-juice.png",
    "available": true,
    "description": "Tangy, refreshing tropical passion fruit juice served cold.",
    "priceMinor": 33000,
    "priceDisplay": 330,
    "imageUrl": "/images/menu/juices/passion-fruit-juice.png",
    "imageUrls": [
      "/images/menu/juices/passion-fruit-juice.png",
      "/images/menu/juices/passion-fruit-juice-2.png",
      "/images/menu/juices/passion-fruit-juice-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 45,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "orange-juice",
    "name": "Orange Juice",
    "price": 400,
    "category": "Fresh Juices",
    "image": "/images/menu/juices/orange-juice.png",
    "available": true,
    "description": "Bright, freshly squeezed sweet citrus orange juice.",
    "priceMinor": 40000,
    "priceDisplay": 400,
    "imageUrl": "/images/menu/juices/orange-juice.png",
    "imageUrls": [
      "/images/menu/juices/orange-juice.png",
      "/images/menu/juices/orange-juice-2.png",
      "/images/menu/juices/orange-juice-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 46,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "papaya-juice",
    "name": "Papaya Juice",
    "price": 330,
    "category": "Fresh Juices",
    "image": "/images/menu/juices/papaya-juice.png",
    "available": true,
    "description": "Smooth, naturally sweet ripe Sri Lankan papaya juice.",
    "priceMinor": 33000,
    "priceDisplay": 330,
    "imageUrl": "/images/menu/juices/papaya-juice.png",
    "imageUrls": [
      "/images/menu/juices/papaya-juice.png",
      "/images/menu/juices/papaya-juice-2.png",
      "/images/menu/juices/papaya-juice-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 47,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "pineapple-juice",
    "name": "Pineapple Juice",
    "price": 300,
    "category": "Fresh Juices",
    "image": "/images/menu/juices/pineapple-juice.png",
    "available": true,
    "description": "Golden tropical pineapple juice pressed from ripe fruit.",
    "priceMinor": 30000,
    "priceDisplay": 300,
    "imageUrl": "/images/menu/juices/pineapple-juice.png",
    "imageUrls": [
      "/images/menu/juices/pineapple-juice.png",
      "/images/menu/juices/pineapple-juice-2.png",
      "/images/menu/juices/pineapple-juice-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 48,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "wood-apple-juice",
    "name": "Wood Apple Juice",
    "price": 350,
    "category": "Fresh Juices",
    "image": "/images/menu/juices/wood-apple-juice.png",
    "available": true,
    "description": "Authentic Sri Lankan wood apple nectar blended smooth and chilled.",
    "priceMinor": 35000,
    "priceDisplay": 350,
    "imageUrl": "/images/menu/juices/wood-apple-juice.png",
    "imageUrls": [
      "/images/menu/juices/wood-apple-juice.png",
      "/images/menu/juices/wood-apple-juice-2.png",
      "/images/menu/juices/wood-apple-juice-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 49,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "apple-juice",
    "name": "Apple Juice",
    "price": 400,
    "category": "Fresh Juices",
    "image": "/images/menu/juices/apple-juice.png",
    "available": true,
    "description": "Crisp, refreshing freshly blended red apple juice served chilled.",
    "priceMinor": 40000,
    "priceDisplay": 400,
    "imageUrl": "/images/menu/juices/apple-juice.png",
    "imageUrls": [
      "/images/menu/juices/apple-juice.png",
      "/images/menu/juices/apple-juice-2.png"
    ],
    "isAvailable": true,
    "displayOrder": 50,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "avocado-juice",
    "name": "Avocado Juice",
    "price": 400,
    "category": "Fresh Juices",
    "image": "/images/menu/juices/avocado-juice.png",
    "available": true,
    "description": "Velvety, creamy fresh ripe avocado juice.",
    "priceMinor": 40000,
    "priceDisplay": 400,
    "imageUrl": "/images/menu/juices/avocado-juice.png",
    "imageUrls": [
      "/images/menu/juices/avocado-juice.png",
      "/images/menu/juices/avocado-juice-2.png",
      "/images/menu/juices/avocado-juice-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 51,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "grapes-juice",
    "name": "Grapes Juice",
    "price": 450,
    "category": "Fresh Juices",
    "image": "/images/menu/juices/grapes-juice.png",
    "available": true,
    "description": "Chilled sweet purple grape juice pressed from ripe grapes.",
    "priceMinor": 45000,
    "priceDisplay": 450,
    "imageUrl": "/images/menu/juices/grapes-juice.png",
    "imageUrls": [
      "/images/menu/juices/grapes-juice.png"
    ],
    "isAvailable": true,
    "displayOrder": 52,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "mango-juice",
    "name": "Mango Juice",
    "price": 450,
    "category": "Fresh Juices",
    "image": "/images/menu/juices/mango-juice.png",
    "available": true,
    "description": "Thick, luscious golden juice blended from ripe sweet mangoes.",
    "priceMinor": 45000,
    "priceDisplay": 450,
    "imageUrl": "/images/menu/juices/mango-juice.png",
    "imageUrls": [
      "/images/menu/juices/mango-juice.png",
      "/images/menu/juices/mango-juice-2.png"
    ],
    "isAvailable": true,
    "displayOrder": 53,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "mix-fruit-juice",
    "name": "Mix Fruit Juice",
    "price": 350,
    "category": "Fresh Juices",
    "image": "/images/menu/juices/mix-fruit-juice.png",
    "available": true,
    "description": "Refreshing tropical blend of seasonal fresh fruits.",
    "priceMinor": 35000,
    "priceDisplay": 350,
    "imageUrl": "/images/menu/juices/mix-fruit-juice.png",
    "imageUrls": [
      "/images/menu/juices/mix-fruit-juice.png"
    ],
    "isAvailable": true,
    "displayOrder": 54,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "pomegranate-juice",
    "name": "Pomegranate Juice",
    "price": 600,
    "category": "Fresh Juices",
    "image": "/images/menu/juices/pomegranate-juice.png",
    "available": true,
    "description": "Ruby-red antioxidant-rich fresh pomegranate juice.",
    "priceMinor": 60000,
    "priceDisplay": 600,
    "imageUrl": "/images/menu/juices/pomegranate-juice.png",
    "imageUrls": [
      "/images/menu/juices/pomegranate-juice.png",
      "/images/menu/juices/pomegranate-juice-2.png",
      "/images/menu/juices/pomegranate-juice-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 55,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "lemon-mojito",
    "name": "Lemon Mojito",
    "price": 380,
    "category": "Mojito",
    "image": "/images/menu/mojito/lemon-mojito.png",
    "available": true,
    "description": "Sparkling citrus lemon mojito muddled with fresh mint and ice.",
    "priceMinor": 38000,
    "priceDisplay": 380,
    "imageUrl": "/images/menu/mojito/lemon-mojito.png",
    "imageUrls": [
      "/images/menu/mojito/lemon-mojito.png",
      "/images/menu/mojito/lemon-mojito-2.png",
      "/images/menu/mojito/lemon-mojito-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 56,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "spicy-mojito",
    "name": "Spicy Mojito",
    "price": 380,
    "category": "Mojito",
    "image": "/images/menu/mojito/spicy-mojito.png",
    "available": true,
    "description": "Zesty lime and mint mojito with a lively chili kick.",
    "priceMinor": 38000,
    "priceDisplay": 380,
    "imageUrl": "/images/menu/mojito/spicy-mojito.png",
    "imageUrls": [
      "/images/menu/mojito/spicy-mojito.png",
      "/images/menu/mojito/spicy-mojito-2.png",
      "/images/menu/mojito/spicy-mojito-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 57,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "blackberry-mojito",
    "name": "Blackberry Mojito",
    "price": 380,
    "category": "Mojito",
    "image": "/images/menu/mojito/blackberry-mojito.png",
    "available": true,
    "description": "Sparkling blackberry mocktail muddled with lime and garden mint.",
    "priceMinor": 38000,
    "priceDisplay": 380,
    "imageUrl": "/images/menu/mojito/blackberry-mojito.png",
    "imageUrls": [
      "/images/menu/mojito/blackberry-mojito.png",
      "/images/menu/mojito/blackberry-mojito-2.png",
      "/images/menu/mojito/blackberry-mojito-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 58,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "blueberry-mojito",
    "name": "Blueberry Mojito",
    "price": 380,
    "category": "Mojito",
    "image": "/images/menu/mojito/blueberry-mojito.png",
    "available": true,
    "description": "Chilled blueberry fizz infused with fresh lime and mint leaves.",
    "priceMinor": 38000,
    "priceDisplay": 380,
    "imageUrl": "/images/menu/mojito/blueberry-mojito.png",
    "imageUrls": [
      "/images/menu/mojito/blueberry-mojito.png",
      "/images/menu/mojito/blueberry-mojito-2.png",
      "/images/menu/mojito/blueberry-mojito-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 59,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "strawberry-mojito",
    "name": "Strawberry Mojito",
    "price": 380,
    "category": "Mojito",
    "image": "/images/menu/mojito/strawberry-mojito.png",
    "available": true,
    "description": "Sweet strawberry sparkling mojito with fresh mint and citrus.",
    "priceMinor": 38000,
    "priceDisplay": 380,
    "imageUrl": "/images/menu/mojito/strawberry-mojito.png",
    "imageUrls": [
      "/images/menu/mojito/strawberry-mojito.png",
      "/images/menu/mojito/strawberry-mojito-2.png",
      "/images/menu/mojito/strawberry-mojito-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 60,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "orange-mojito",
    "name": "Orange Mojito",
    "price": 380,
    "category": "Mojito",
    "image": "/images/menu/mojito/orange-mojito.png",
    "available": true,
    "description": "Bright orange citrus mojito topped with crushed ice and mint.",
    "priceMinor": 38000,
    "priceDisplay": 380,
    "imageUrl": "/images/menu/mojito/orange-mojito.png",
    "imageUrls": [
      "/images/menu/mojito/orange-mojito.png",
      "/images/menu/mojito/orange-mojito-2.png",
      "/images/menu/mojito/orange-mojito-3.png"
    ],
    "isAvailable": true,
    "displayOrder": 61,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "apple-mojito",
    "name": "Apple Mojito",
    "price": 380,
    "category": "Mojito",
    "image": "/images/menu/mojito/apple-mojito.png",
    "available": true,
    "description": "Crisp apple sparkling mojito muddled with lime and fresh mint.",
    "priceMinor": 38000,
    "priceDisplay": 380,
    "imageUrl": "/images/menu/mojito/apple-mojito.png",
    "imageUrls": [
      "/images/menu/mojito/apple-mojito.png"
    ],
    "isAvailable": true,
    "displayOrder": 62,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "passion-mojito",
    "name": "Passion Mojito",
    "price": 380,
    "category": "Mojito",
    "image": "/images/menu/mojito/passion-mojito.png",
    "available": true,
    "description": "Tropical passion fruit mojito fizz with mint and citrus.",
    "priceMinor": 38000,
    "priceDisplay": 380,
    "imageUrl": "/images/menu/mojito/passion-mojito.png",
    "imageUrls": [
      "/images/menu/mojito/passion-mojito.png"
    ],
    "isAvailable": true,
    "displayOrder": 63,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "mango-mojito",
    "name": "Mango Mojito",
    "price": 380,
    "category": "Mojito",
    "image": "/images/menu/mojito/mango-mojito.png",
    "available": true,
    "description": "Refreshing mango mojito mocktail with lime, mint, and soda.",
    "priceMinor": 38000,
    "priceDisplay": 380,
    "imageUrl": "/images/menu/mojito/mango-mojito.png",
    "imageUrls": [
      "/images/menu/mojito/mango-mojito.png"
    ],
    "isAvailable": true,
    "displayOrder": 64,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "watermelon-mojito",
    "name": "Watermelon Mojito",
    "price": 380,
    "category": "Mojito",
    "image": "/images/menu/mojito/watermelon-mojito.png",
    "available": true,
    "description": "Cool watermelon mojito muddled with fresh mint and citrus.",
    "priceMinor": 38000,
    "priceDisplay": 380,
    "imageUrl": "/images/menu/mojito/watermelon-mojito.png",
    "imageUrls": [
      "/images/menu/mojito/watermelon-mojito.png"
    ],
    "isAvailable": true,
    "displayOrder": 65,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "virgin-black-mojito",
    "name": "Virgin Black Mojito",
    "price": 380,
    "category": "Mojito",
    "image": "/images/menu/mojito/virgin-black-mojito.png",
    "available": true,
    "description": "Signature dark cola-citrus virgin black mojito with mint and lime.",
    "priceMinor": 38000,
    "priceDisplay": 380,
    "imageUrl": "/images/menu/mojito/virgin-black-mojito.png",
    "imageUrls": [
      "/images/menu/mojito/virgin-black-mojito.png"
    ],
    "isAvailable": true,
    "displayOrder": 66,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "peach-mojito",
    "name": "Peach Mojito",
    "price": 400,
    "category": "Mojito",
    "image": "/images/menu/mojito/peach-mojito.png",
    "available": true,
    "description": "Fragrant sweet peach mojito cooler with lime and mint.",
    "priceMinor": 40000,
    "priceDisplay": 400,
    "imageUrl": "/images/menu/mojito/peach-mojito.png",
    "imageUrls": [
      "/images/menu/mojito/peach-mojito.png"
    ],
    "isAvailable": true,
    "displayOrder": 67,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "vimto-mojito",
    "name": "Vimto Mojito",
    "price": 400,
    "category": "Mojito",
    "image": "/images/menu/mojito/vimto-mojito.png",
    "available": true,
    "description": "Berry-rich Vimto sparkling mojito muddled with fresh mint and lime.",
    "priceMinor": 40000,
    "priceDisplay": 400,
    "imageUrl": "/images/menu/mojito/vimto-mojito.png",
    "imageUrls": [
      "/images/menu/mojito/vimto-mojito.png"
    ],
    "isAvailable": true,
    "displayOrder": 68,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "ice-coffee-bubble-tea",
    "name": "Ice Coffee Bubble Tea",
    "price": 480,
    "category": "Bubble Tea",
    "image": "/images/menu/bubble-tea/ice-coffee-bubble-tea.png",
    "available": true,
    "description": "Chilled iced coffee milk tea served with chewy tapioca pearls.",
    "priceMinor": 48000,
    "priceDisplay": 480,
    "imageUrl": "/images/menu/bubble-tea/ice-coffee-bubble-tea.png",
    "imageUrls": [
      "/images/menu/bubble-tea/ice-coffee-bubble-tea.png"
    ],
    "isAvailable": true,
    "displayOrder": 69,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "chocolate-coffee-bubble-tea",
    "name": "Chocolate Coffee Bubble Tea",
    "price": 550,
    "category": "Bubble Tea",
    "image": "/images/menu/bubble-tea/chocolate-coffee-bubble-tea.png",
    "available": true,
    "description": "Mocha blend of rich chocolate and coffee over chewy boba pearls.",
    "priceMinor": 55000,
    "priceDisplay": 550,
    "imageUrl": "/images/menu/bubble-tea/chocolate-coffee-bubble-tea.png",
    "imageUrls": [
      "/images/menu/bubble-tea/chocolate-coffee-bubble-tea.png"
    ],
    "isAvailable": true,
    "displayOrder": 70,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "chocolate-bubble-tea",
    "name": "Chocolate Bubble Tea",
    "price": 550,
    "category": "Bubble Tea",
    "image": "/images/menu/bubble-tea/chocolate-bubble-tea.png",
    "available": true,
    "description": "Creamy iced chocolate bubble tea with tapioca pearls.",
    "priceMinor": 55000,
    "priceDisplay": 550,
    "imageUrl": "/images/menu/bubble-tea/chocolate-bubble-tea.png",
    "imageUrls": [
      "/images/menu/bubble-tea/chocolate-bubble-tea.png"
    ],
    "isAvailable": true,
    "displayOrder": 71,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "vanilla-bubble-tea",
    "name": "Vanilla Bubble Tea",
    "price": 550,
    "category": "Bubble Tea",
    "image": "/images/menu/bubble-tea/vanilla-bubble-tea.png",
    "available": true,
    "description": "Smooth vanilla milk bubble tea with chewy boba pearls.",
    "priceMinor": 55000,
    "priceDisplay": 550,
    "imageUrl": "/images/menu/bubble-tea/vanilla-bubble-tea.png",
    "imageUrls": [
      "/images/menu/bubble-tea/vanilla-bubble-tea.png"
    ],
    "isAvailable": true,
    "displayOrder": 72,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "strawberry-bubble-tea",
    "name": "Strawberry Bubble Tea",
    "price": 550,
    "category": "Bubble Tea",
    "image": "/images/menu/bubble-tea/strawberry-bubble-tea.png",
    "available": true,
    "description": "Sweet strawberry milk bubble tea served chilled with boba pearls.",
    "priceMinor": 55000,
    "priceDisplay": 550,
    "imageUrl": "/images/menu/bubble-tea/strawberry-bubble-tea.png",
    "imageUrls": [
      "/images/menu/bubble-tea/strawberry-bubble-tea.png"
    ],
    "isAvailable": true,
    "displayOrder": 73,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "blueberry-bubble-tea",
    "name": "Blueberry Bubble Tea",
    "price": 550,
    "category": "Bubble Tea",
    "image": "/images/menu/bubble-tea/blueberry-bubble-tea.png",
    "available": true,
    "description": "Fruity blueberry milk bubble tea with chewy tapioca pearls.",
    "priceMinor": 55000,
    "priceDisplay": 550,
    "imageUrl": "/images/menu/bubble-tea/blueberry-bubble-tea.png",
    "imageUrls": [
      "/images/menu/bubble-tea/blueberry-bubble-tea.png"
    ],
    "isAvailable": true,
    "displayOrder": 74,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "mango-bubble-tea",
    "name": "Mango Bubble Tea",
    "price": 550,
    "category": "Bubble Tea",
    "image": "/images/menu/bubble-tea/mango-bubble-tea.png",
    "available": true,
    "description": "Tropical mango bubble tea served chilled with boba pearls.",
    "priceMinor": 55000,
    "priceDisplay": 550,
    "imageUrl": "/images/menu/bubble-tea/mango-bubble-tea.png",
    "imageUrls": [
      "/images/menu/bubble-tea/mango-bubble-tea.png"
    ],
    "isAvailable": true,
    "displayOrder": 75,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "rose-bubble-tea",
    "name": "Rose Bubble Tea",
    "price": 550,
    "category": "Bubble Tea",
    "image": "",
    "available": true,
    "description": "Fragrant rose milk bubble tea with chewy tapioca pearls.",
    "priceMinor": 55000,
    "priceDisplay": 550,
    "imageUrl": "",
    "imageUrls": [],
    "isAvailable": true,
    "displayOrder": 76,
    "imageMatchStatus": "IMAGE_MISSING"
  },
  {
    "id": "brownie-bubble-tea",
    "name": "Brownie Bubble Tea",
    "price": 600,
    "category": "Bubble Tea",
    "image": "/images/menu/bubble-tea/brownie-bubble-tea.png",
    "available": true,
    "description": "Indulgent chocolate brownie bubble tea with rich cocoa and boba.",
    "priceMinor": 60000,
    "priceDisplay": 600,
    "imageUrl": "/images/menu/bubble-tea/brownie-bubble-tea.png",
    "imageUrls": [
      "/images/menu/bubble-tea/brownie-bubble-tea.png"
    ],
    "isAvailable": true,
    "displayOrder": 77,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "thai-bubble-tea",
    "name": "Thai Bubble Tea",
    "price": 600,
    "category": "Bubble Tea",
    "image": "/images/menu/bubble-tea/thai-bubble-tea.png",
    "available": true,
    "description": "Authentic creamy spiced Thai milk tea served over chewy boba pearls.",
    "priceMinor": 60000,
    "priceDisplay": 600,
    "imageUrl": "/images/menu/bubble-tea/thai-bubble-tea.png",
    "imageUrls": [
      "/images/menu/bubble-tea/thai-bubble-tea.png"
    ],
    "isAvailable": true,
    "displayOrder": 78,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "vanilla-milkshake",
    "name": "Vanilla Milkshake",
    "price": 450,
    "category": "Milkshakes",
    "image": "/images/menu/milkshakes/vanilla-milkshake.png",
    "available": true,
    "description": "Thick, creamy classic vanilla ice cream milkshake.",
    "priceMinor": 45000,
    "priceDisplay": 450,
    "imageUrl": "/images/menu/milkshakes/vanilla-milkshake.png",
    "imageUrls": [
      "/images/menu/milkshakes/vanilla-milkshake.png"
    ],
    "isAvailable": true,
    "displayOrder": 79,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "chocolate-milkshake",
    "name": "Chocolate Milkshake",
    "price": 450,
    "category": "Milkshakes",
    "image": "/images/menu/milkshakes/chocolate-milkshake.png",
    "available": true,
    "description": "Rich chocolate ice cream blended into a velvety milkshake.",
    "priceMinor": 45000,
    "priceDisplay": 450,
    "imageUrl": "/images/menu/milkshakes/chocolate-milkshake.png",
    "imageUrls": [
      "/images/menu/milkshakes/chocolate-milkshake.png"
    ],
    "isAvailable": true,
    "displayOrder": 80,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "strawberry-milkshake",
    "name": "Strawberry Milkshake",
    "price": 450,
    "category": "Milkshakes",
    "image": "/images/menu/milkshakes/strawberry-milkshake.png",
    "available": true,
    "description": "Creamy chilled strawberry milkshake blended smooth.",
    "priceMinor": 45000,
    "priceDisplay": 450,
    "imageUrl": "/images/menu/milkshakes/strawberry-milkshake.png",
    "imageUrls": [
      "/images/menu/milkshakes/strawberry-milkshake.png"
    ],
    "isAvailable": true,
    "displayOrder": 81,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "coffee-milkshake",
    "name": "Coffee Milkshake",
    "price": 450,
    "category": "Milkshakes",
    "image": "/images/menu/milkshakes/coffee-milkshake.png",
    "available": true,
    "description": "Roasted coffee blended with creamy vanilla ice cream and milk.",
    "priceMinor": 45000,
    "priceDisplay": 450,
    "imageUrl": "/images/menu/milkshakes/coffee-milkshake.png",
    "imageUrls": [
      "/images/menu/milkshakes/coffee-milkshake.png"
    ],
    "isAvailable": true,
    "displayOrder": 82,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "oreo-milkshake",
    "name": "Oreo Milkshake",
    "price": 550,
    "category": "Milkshakes",
    "image": "/images/menu/milkshakes/oreo-milkshake.png",
    "available": true,
    "description": "Crunchy Oreo cookies blended thick with creamy vanilla ice cream.",
    "priceMinor": 55000,
    "priceDisplay": 550,
    "imageUrl": "/images/menu/milkshakes/oreo-milkshake.png",
    "imageUrls": [
      "/images/menu/milkshakes/oreo-milkshake.png"
    ],
    "isAvailable": true,
    "displayOrder": 83,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "kitkat-milkshake",
    "name": "KitKat Milkshake",
    "price": 600,
    "category": "Milkshakes",
    "image": "/images/menu/milkshakes/kitkat-milkshake.png",
    "available": true,
    "description": "Crisp KitKat chocolate wafer blended into a rich, creamy shake.",
    "priceMinor": 60000,
    "priceDisplay": 600,
    "imageUrl": "/images/menu/milkshakes/kitkat-milkshake.png",
    "imageUrls": [
      "/images/menu/milkshakes/kitkat-milkshake.png"
    ],
    "isAvailable": true,
    "displayOrder": 84,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "snickers-milkshake",
    "name": "Snickers Milkshake",
    "price": 600,
    "category": "Milkshakes",
    "image": "/images/menu/milkshakes/snickers-milkshake.png",
    "available": true,
    "description": "Decadent Snickers caramel-peanut chocolate milkshake.",
    "priceMinor": 60000,
    "priceDisplay": 600,
    "imageUrl": "/images/menu/milkshakes/snickers-milkshake.png",
    "imageUrls": [
      "/images/menu/milkshakes/snickers-milkshake.png"
    ],
    "isAvailable": true,
    "displayOrder": 85,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "brownie-milkshake",
    "name": "Brownie Milkshake",
    "price": 600,
    "category": "Milkshakes",
    "image": "/images/menu/milkshakes/brownie-milkshake.png",
    "available": true,
    "description": "Fudgy chocolate brownie blended thick with ice cream and milk.",
    "priceMinor": 60000,
    "priceDisplay": 600,
    "imageUrl": "/images/menu/milkshakes/brownie-milkshake.png",
    "imageUrls": [
      "/images/menu/milkshakes/brownie-milkshake.png"
    ],
    "isAvailable": true,
    "displayOrder": 86,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "blueberry-milkshake",
    "name": "Blueberry Milkshake",
    "price": 500,
    "category": "Milkshakes",
    "image": "/images/menu/milkshakes/blueberry-milkshake.png",
    "available": true,
    "description": "Sweet blueberry compote blended with creamy ice cream.",
    "priceMinor": 50000,
    "priceDisplay": 500,
    "imageUrl": "/images/menu/milkshakes/blueberry-milkshake.png",
    "imageUrls": [
      "/images/menu/milkshakes/blueberry-milkshake.png"
    ],
    "isAvailable": true,
    "displayOrder": 87,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "mango-milkshake",
    "name": "Mango Milkshake",
    "price": 500,
    "category": "Milkshakes",
    "image": "/images/menu/milkshakes/mango-milkshake.png",
    "available": true,
    "description": "Ripe tropical mango blended into a thick, creamy milkshake.",
    "priceMinor": 50000,
    "priceDisplay": 500,
    "imageUrl": "/images/menu/milkshakes/mango-milkshake.png",
    "imageUrls": [
      "/images/menu/milkshakes/mango-milkshake.png"
    ],
    "isAvailable": true,
    "displayOrder": 88,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "apple-milkshake",
    "name": "Apple Milkshake",
    "price": 500,
    "category": "Milkshakes",
    "image": "/images/menu/milkshakes/apple-milkshake.png",
    "available": true,
    "description": "Chilled fresh apple blended smooth with milk and ice cream.",
    "priceMinor": 50000,
    "priceDisplay": 500,
    "imageUrl": "/images/menu/milkshakes/apple-milkshake.png",
    "imageUrls": [
      "/images/menu/milkshakes/apple-milkshake.png"
    ],
    "isAvailable": true,
    "displayOrder": 89,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "orange-milkshake",
    "name": "Orange Milkshake",
    "price": 500,
    "category": "Milkshakes",
    "image": "/images/menu/milkshakes/orange-milkshake.png",
    "available": true,
    "description": "Creamy citrus orange milkshake served chilled.",
    "priceMinor": 50000,
    "priceDisplay": 500,
    "imageUrl": "/images/menu/milkshakes/orange-milkshake.png",
    "imageUrls": [
      "/images/menu/milkshakes/orange-milkshake.png"
    ],
    "isAvailable": true,
    "displayOrder": 90,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "rose-milk",
    "name": "Rose Milk",
    "price": 150,
    "category": "Falooda & Sharbat",
    "image": "/images/menu/falooda/rose-milk.png",
    "available": true,
    "description": "Chilled sweet milk infused with fragrant rose syrup.",
    "priceMinor": 15000,
    "priceDisplay": 150,
    "imageUrl": "/images/menu/falooda/rose-milk.png",
    "imageUrls": [
      "/images/menu/falooda/rose-milk.png"
    ],
    "isAvailable": true,
    "displayOrder": 91,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "rose-milk-with-ice-cream",
    "name": "Rose Milk with Ice Cream",
    "price": 220,
    "category": "Falooda & Sharbat",
    "image": "/images/menu/falooda/rose-milk-with-ice-cream.png",
    "available": true,
    "description": "Chilled fragrant rose milk topped with a scoop of creamy ice cream.",
    "priceMinor": 22000,
    "priceDisplay": 220,
    "imageUrl": "/images/menu/falooda/rose-milk-with-ice-cream.png",
    "imageUrls": [
      "/images/menu/falooda/rose-milk-with-ice-cream.png"
    ],
    "isAvailable": true,
    "displayOrder": 92,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "falooda",
    "name": "Falooda",
    "price": 330,
    "category": "Falooda & Sharbat",
    "image": "/images/menu/falooda/falooda.png",
    "available": true,
    "description": "Classic Sri Lankan rose milk dessert drink with basil seeds, vermicelli, jelly, and ice cream.",
    "priceMinor": 33000,
    "priceDisplay": 330,
    "imageUrl": "/images/menu/falooda/falooda.png",
    "imageUrls": [
      "/images/menu/falooda/falooda.png"
    ],
    "isAvailable": true,
    "displayOrder": 93,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "watermelon-sharbat",
    "name": "Watermelon Sharbat",
    "price": 250,
    "category": "Falooda & Sharbat",
    "image": "/images/menu/falooda/watermelon-sharbat.png",
    "available": true,
    "description": "Refreshing chilled rose-kissed watermelon sharbat cooler.",
    "priceMinor": 25000,
    "priceDisplay": 250,
    "imageUrl": "/images/menu/falooda/watermelon-sharbat.png",
    "imageUrls": [
      "/images/menu/falooda/watermelon-sharbat.png"
    ],
    "isAvailable": true,
    "displayOrder": 94,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "sweet-lassi",
    "name": "Sweet Lassi",
    "price": 400,
    "category": "Lassi",
    "image": "/images/menu/lassi/sweet-lassi.png",
    "available": true,
    "description": "Classic chilled sweet yogurt lassi blended frothy and smooth.",
    "priceMinor": 40000,
    "priceDisplay": 400,
    "imageUrl": "/images/menu/lassi/sweet-lassi.png",
    "imageUrls": [
      "/images/menu/lassi/sweet-lassi.png"
    ],
    "isAvailable": true,
    "displayOrder": 95,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "coffee-lassi",
    "name": "Coffee Lassi",
    "price": 400,
    "category": "Lassi",
    "image": "/images/menu/lassi/coffee-lassi.png",
    "available": true,
    "description": "Creamy yogurt lassi blended with aromatic roasted coffee.",
    "priceMinor": 40000,
    "priceDisplay": 400,
    "imageUrl": "/images/menu/lassi/coffee-lassi.png",
    "imageUrls": [
      "/images/menu/lassi/coffee-lassi.png"
    ],
    "isAvailable": true,
    "displayOrder": 96,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "chocolate-lassi",
    "name": "Chocolate Lassi",
    "price": 400,
    "category": "Lassi",
    "image": "/images/menu/lassi/chocolate-lassi.png",
    "available": true,
    "description": "Chilled yogurt lassi blended with rich cocoa.",
    "priceMinor": 40000,
    "priceDisplay": 400,
    "imageUrl": "/images/menu/lassi/chocolate-lassi.png",
    "imageUrls": [
      "/images/menu/lassi/chocolate-lassi.png"
    ],
    "isAvailable": true,
    "displayOrder": 97,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "strawberry-lassi",
    "name": "Strawberry Lassi",
    "price": 400,
    "category": "Lassi",
    "image": "/images/menu/lassi/strawberry-lassi.png",
    "available": true,
    "description": "Refreshing strawberry yogurt lassi served cold.",
    "priceMinor": 40000,
    "priceDisplay": 400,
    "imageUrl": "/images/menu/lassi/strawberry-lassi.png",
    "imageUrls": [
      "/images/menu/lassi/strawberry-lassi.png"
    ],
    "isAvailable": true,
    "displayOrder": 98,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "blueberry-lassi",
    "name": "Blueberry Lassi",
    "price": 400,
    "category": "Lassi",
    "image": "/images/menu/lassi/blueberry-lassi.png",
    "available": true,
    "description": "Smooth blueberry-blended chilled yogurt lassi.",
    "priceMinor": 40000,
    "priceDisplay": 400,
    "imageUrl": "/images/menu/lassi/blueberry-lassi.png",
    "imageUrls": [
      "/images/menu/lassi/blueberry-lassi.png"
    ],
    "isAvailable": true,
    "displayOrder": 99,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "mango-lassi",
    "name": "Mango Lassi",
    "price": 400,
    "category": "Lassi",
    "image": "/images/menu/lassi/mango-lassi.png",
    "available": true,
    "description": "Creamy ripe mango and sweet yogurt lassi.",
    "priceMinor": 40000,
    "priceDisplay": 400,
    "imageUrl": "/images/menu/lassi/mango-lassi.png",
    "imageUrls": [
      "/images/menu/lassi/mango-lassi.png"
    ],
    "isAvailable": true,
    "displayOrder": 100,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "orange-lassi",
    "name": "Orange Lassi",
    "price": 400,
    "category": "Lassi",
    "image": "/images/menu/lassi/orange-lassi.png",
    "available": true,
    "description": "Tangy citrus orange blended with chilled creamy yogurt.",
    "priceMinor": 40000,
    "priceDisplay": 400,
    "imageUrl": "/images/menu/lassi/orange-lassi.png",
    "imageUrls": [
      "/images/menu/lassi/orange-lassi.png"
    ],
    "isAvailable": true,
    "displayOrder": 101,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "vanilla-ice-cream",
    "name": "Vanilla Ice Cream",
    "price": 250,
    "category": "Ice Cream",
    "image": "/images/menu/ice-cream/vanilla-ice-cream.png",
    "available": true,
    "description": "Classic creamy vanilla ice cream scoop.",
    "priceMinor": 25000,
    "priceDisplay": 250,
    "imageUrl": "/images/menu/ice-cream/vanilla-ice-cream.png",
    "imageUrls": [
      "/images/menu/ice-cream/vanilla-ice-cream.png"
    ],
    "isAvailable": true,
    "displayOrder": 102,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "chocolate-ice-cream",
    "name": "Chocolate Ice Cream",
    "price": 250,
    "category": "Ice Cream",
    "image": "/images/menu/ice-cream/chocolate-ice-cream.png",
    "available": true,
    "description": "Rich, smooth chocolate ice cream scoop.",
    "priceMinor": 25000,
    "priceDisplay": 250,
    "imageUrl": "/images/menu/ice-cream/chocolate-ice-cream.png",
    "imageUrls": [
      "/images/menu/ice-cream/chocolate-ice-cream.png"
    ],
    "isAvailable": true,
    "displayOrder": 103,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "strawberry-ice-cream",
    "name": "Strawberry Ice Cream",
    "price": 300,
    "category": "Ice Cream",
    "image": "/images/menu/ice-cream/strawberry-ice-cream.png",
    "available": true,
    "description": "Sweet berry strawberry ice cream served chilled.",
    "priceMinor": 30000,
    "priceDisplay": 300,
    "imageUrl": "/images/menu/ice-cream/strawberry-ice-cream.png",
    "imageUrls": [
      "/images/menu/ice-cream/strawberry-ice-cream.png"
    ],
    "isAvailable": true,
    "displayOrder": 104,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "mango-ice-cream",
    "name": "Mango Ice Cream",
    "price": 300,
    "category": "Ice Cream",
    "image": "/images/menu/ice-cream/mango-ice-cream.png",
    "available": true,
    "description": "Tropical golden mango ice cream scoop.",
    "priceMinor": 30000,
    "priceDisplay": 300,
    "imageUrl": "/images/menu/ice-cream/mango-ice-cream.png",
    "imageUrls": [
      "/images/menu/ice-cream/mango-ice-cream.png"
    ],
    "isAvailable": true,
    "displayOrder": 105,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "special-ice-cream",
    "name": "Special Ice Cream",
    "price": 350,
    "category": "Ice Cream",
    "image": "/images/menu/ice-cream/special-ice-cream.png",
    "available": true,
    "description": "House special multi-scoop sundae with toppings and syrup.",
    "priceMinor": 35000,
    "priceDisplay": 350,
    "imageUrl": "/images/menu/ice-cream/special-ice-cream.png",
    "imageUrls": [
      "/images/menu/ice-cream/special-ice-cream.png"
    ],
    "isAvailable": true,
    "displayOrder": 106,
    "imageMatchStatus": "VERIFIED"
  },
  {
    "id": "fruit-salad",
    "name": "Fruit Salad",
    "price": 450,
    "category": "Ice Cream",
    "image": "/images/menu/ice-cream/fruit-salad.png",
    "available": true,
    "description": "Fresh seasonal tropical cut fruit salad served chilled with ice cream.",
    "priceMinor": 45000,
    "priceDisplay": 450,
    "imageUrl": "/images/menu/ice-cream/fruit-salad.png",
    "imageUrls": [
      "/images/menu/ice-cream/fruit-salad.png"
    ],
    "isAvailable": true,
    "displayOrder": 107,
    "imageMatchStatus": "VERIFIED"
  }
];

export const INITIAL_TABLES: TableItem[] = [
  { id: "tbl_01", number: "Table 01", token: "tbl_01_f3a1", active: true },
  { id: "tbl_02", number: "Table 02", token: "tbl_02_e8c4", active: true },
  { id: "tbl_03", number: "Table 03", token: "tbl_03_d7b9", active: true },
  { id: "tbl_04", number: "Table 04", token: "tbl_04_c2a8", active: true },
  { id: "tbl_05", number: "Table 05", token: "tbl_05_b5d6", active: true },
  { id: "tbl_06", number: "Table 06", token: "tbl_06_a1e3", active: true },
  { id: "tbl_07", number: "Table 07", token: "tbl_07_k8j3m", active: true },
  { id: "tbl_08", number: "Table 08", token: "tbl_08_9c4f", active: true },
  { id: "tbl_09", number: "Table 09", token: "tbl_09_8b2e", active: true },
  { id: "tbl_10", number: "Table 10", token: "tbl_10_7a1d", active: true },
  { id: "tbl_11", number: "Table 11", token: "tbl_11_6f5c", active: true },
];

export const INITIAL_SETTINGS: CafeSettings = {
  cafeName: "TEA TIME",
  tagline: "Scan. Pick. Enjoy.",
  currencySymbol: "Rs.",
  currencyCode: "LKR",
  openingHours: "7:30 AM – 10:30 PM",
  isOrderingPaused: false,
  pauseMessage: "New orders are temporarily paused by café staff. Please check back shortly.",
  logoUrl: "/assets/logo.png",
  primaryColor: "#2C190E",
  accentColor: "#E8B64F",
  backgroundColor: "#FAF7F0",
  textColor: "#301C10",
  headerBackgroundColor: "#2C190E",
  headerTextColor: "#FAF7F0",
  qrHeaderTitle: "",
  qrSubtitle: "SCAN TO ORDER",
  qrFooterNote: "☕ Good tea brings people together.",
  qrLogoSize: 112,
  googleReviewUrl: "https://maps.google.com/?q=Tea+Time+Vavuniya",
  instagramUrl: "https://www.instagram.com/teatime_vavuniya/",
  facebookUrl: "https://www.facebook.com/teatime.vavuniya/",
  socialLinks: [
    {
      id: "sl_google",
      platform: "google",
      label: "Google Profile & Reviews",
      url: "https://maps.google.com/?q=Tea+Time+Vavuniya",
      isActive: true,
    },
    {
      id: "sl_instagram",
      platform: "instagram",
      label: "Instagram",
      url: "https://www.instagram.com/teatime_vavuniya/",
      isActive: true,
    },
    {
      id: "sl_facebook",
      platform: "facebook",
      label: "Facebook",
      url: "https://www.facebook.com/teatime.vavuniya/",
      isActive: true,
    },
    {
      id: "sl_whatsapp",
      platform: "whatsapp",
      label: "WhatsApp",
      url: "https://wa.me/94764847081",
      isActive: true,
    },
  ],
};
