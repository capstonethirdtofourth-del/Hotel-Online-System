export const menuData = [
  {
    id: "appetizers",
    title: "Appetizers",
    items: [
      { name: "Baked Mac", price: 190, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786348950/Baked_Mac_jn4rbw.jpg"},
      { name: "Vegetable Fritter (Ukoy)", price: 150, description: "Deep fried squash, carrots, sweet potato", image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1777471662/Okoy_onuws5.jpg" },
      { name: "Lumpiang Gulay", price: 195, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786351999/Lumpiang_Gulay_yqmg7x.jpg" },
      { name: "Sushi Bake", prices: { small: 380, medium: 450 }, description: "Crabsticks, seaweeds, cucumber & carrots in foil pan", image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1777471667/Sushi_Baked_nvgjec.jpg" },
      { name: "Calamares", price: 220, description: "Breaded squid rings, aioli dipping", image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1777471661/Calamari_Rings_yx8cts.jpg" },
      // { name: "Loaded Nacho Fries", price: 195, description: "French fries, cheese sauce, meat, bacon, mayonnaise" },
      // { name: "Sizzling Tofu", price: 185, description: "Fried tofu, bell peppers, carrots, onions, mayonnaise" },
      // { name: "Chick & Chips", price: 220, description: "Homemade chicken nuggets, fries, gravy" },
      // { name: "Salted/Cheese Fries", price: 100, description: "150g french fries, mayonnaise, ketchup" },
      // { name: "Mozarella Sticks", price: 190, description: "Breaded mozarella, aioli or salsa" },
      // { name: "Lumpia Shanghai", price: 200, description: "10 rolls crispy fried spring rolls, vinegar or ketchup" }
    ]
  },

  {
    id: "pasta_noodles",
    title: "Pasta & Noodles",
    items: [
      { name: "H&K’s Pancit na Sulit", price: 190, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786350918/Pancit_yhqsmc.jpg" },
      { name: "H&K’s Palabok", price: 180, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1777471663/Pancit_Palabok_rx03nq.jpg" },
      { name: "Spaghetti with Meatballs", price: 180, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1777471664/Spaghetti_with_Meatballs_i6xoey.jpg" },
      { name: "Mami with Meat & Egg", price: 120, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786348205/Mami_with_Meat_and_Egg_fkn4gb.jpg" },
      { name: "Chicken Pesto", price: 190, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1777471663/Pesto_Pasta_cefdsb.jpg" },
      { name: "Carbonara with Fries", price: 190, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786351325/Carbonara_with_Fries_ys6yi7.jpg" },
      { name: "Pancit Bihon Bowl", price: 160, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786351452/Pancit_Bihon_Bowl_yymu4y.jpg" },
      // { name: "Korean Ramen", price: 180 }
    ]
  },

  {
    id: "beef",
    title: "Beef",
    items: [
      { name: "Baked Beef Caldereta", price: 400, description: "Sliced beef, potatoes, carrots, cheese sauce", image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1777471660/Beef_Stew_Caldereta_Mechado_c3clos.jpg" },
      // { name: "Bulalo", price: 378, description: "Beef shank, potatoes, sweet corn, cabbage" },
      // { name: "Crispy Tapa Flakes", price: 230, description: "Pulled beef, honey" },
      // { name: "Beef Lenggua", price: 480, description: "New!" },
      { name: "Bibimbap", price: 480, description: "New!", image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786351009/Bibimbap_km8mq0.jpg"},
    ]
  },

  {
    id: "chicken",
    title: "Chicken",
    items: [
      { name: "Fried Egg, Chicken and Rice", price: 180, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786348868/Fried_Egg_Chicken_and_Rice_gohlss.jpg" },
      { name: "Chicken Cordon Bleu", price: 350, description: "Sliced cordon bleu, special white sauce", image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1777471665/Cordonblue_yijqut.jpg" },
      { name: "Chicken Caldereta", price: 300, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786348572/Chicken_Caldareta_i9vn6a.jpg"},
      { name: "Baked Chicken", price: 330, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786348501/Baked_Chicken_ojjyzk.jpg" },
      { name: "Pastil", price: 100, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786347590/Pastil_aiopec.jpg" },
      { name: "Roasted Chicken", price: 100, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786349095/Chicken_Roasted_hnicz4.jpg" },
      { name: "Creamy Corn Chicken", price: 100, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786351930/Creamy_Corn_Chicken_ieaqip.jpg" },
    ]
  },

  {
    id: "all_day_breakfast",
    title: "All-Day Breakfast",
    items: [
      // { name: "Crispy Tapa Flakes", price: 150, description: "Served with garlic fried rice, egg and brewed coffee" },
      // { name: "Garlic Longganisa", price: 150, description: "2pcs longganisa of cabanatuan" },
      { name: "Breakfast Platter", price: 170, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786352071/Breakfast_Platter_Toast_Sausage_ncl14k.jpg" },
      { name: "Spam & Egg Rice Bowl", price: 120, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786349016/Spam_Egg_Rice_Bowl_zmrkcc.jpg" },
      { name: "Bacon", price: 130, description: "2 strips of bacon, egg, ketchup", image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1777471666/Full_Breakfast_Bacon_Eggs_ty0i4e.jpg" },
      // { name: "French Toast - Plain", price: 100, description: "3pcs loaf bread" },
      // { name: "American Breakfast", price: 180, description: "Toast bread, scrambled egg, sausage, fries" }
    ]
  },

  {
    id: "pork",
    title: "Pork",
    items: [
      { name: "Liempo Kare-kare", price: 280, description: "Lechon kawali, peanut sauce, string beans, squash, petchay", image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1777471661/Kare-Kare_ktfb5x.jpg" },
      { name: "Kare Kare", price: 498, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786352195/Kare-Kare_arqxzf.jpg" },
      { name: "Pork Sisig", price: 280, description: "Pork mask, onions, chili, mayonnaise, soy sauce", image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786348421/Sisig_Platter_dwcuuu.jpg"},
      { name: "Pork Skewers", price: 280, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786352194/Pork_Skewers_BBQ_sc8ljw.jpg" },
      // { name: "Sinigang na Liempo & Hipon", price: 380 },
      { name: "Fried Liempo", price: 350, description: "New!", image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786347590/Fried_Liempo_hib8qk.jpg" }
    ]
  },

  // {
  //   id: "rice",
  //   title: "Rice",
  //   items: [
  //     { name: "Steamed Rice", price: 30 },
  //     { name: "Garlic Rice", price: 40 },
  //     { name: "Bagoong Rice", price: 50 },
  //     { name: "Bagoong Rice (Platter)", price: 150 },
  //     { name: "Chinese Style Fried Rice", price: 250, description: "Platter only" }
  //   ]
  // },

  {
    id: "seafoods",
    title: "Seafoods",
    items: [
      // { name: "Lemon & Butter Shrimp", price: 300 },
      // { name: "Adobong Pusit in Olive Oil", price: 220 },
      // { name: "Grilled Stuffed Squid (2pcs)", price: 250 },
      // { name: "Fish Fillet", price: 220, description: "Fish fillet in tartar sauce" },
      { name: "Fish Fillet With Lemon", price: 350, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786352195/Fish_Fillet_with_Lemon_maqmp8.jpg" },
      { name: "Seafood Stir-Fry", price: 340, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786350841/Seafood_Stir-fry_gmusy5.jpg" },
      { name: "Fish with Lemon", price: 350, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786348356/Fish_with_Lemon_hfqszd.jpg"},
      { name: "Fried Bangus with Rice", price: 350, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786347590/Pastil_aiopec.jpg" },
    ]
  },

  {
    id: "vegetables",
    title: "Vegetables",
    items: [
      // { name: "Seafood Gising-gising", price: 280 },
      { name: "H&K’s Chopsuey", price: 250, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1777471662/Chopsuey_bgtara.jpg" },
      // { name: "Pinakbet", price: 250, description: "Bitter gourd, sweet potato, eggplant, string beans, tomatoes" },
      // { name: "H&K’s Fresh Lumpia (1 roll)", price: 75 },
      { name: "H&K’s Fresh Lumpia (3 rolls)", price: 200, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1777471661/Lumpiang_Gulay_z1l1gb.jpg" },
      { name: "Mixed Vegetables Stir-Fry", price: 200, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786352484/Mixed_Vegetable_Stir-fry_yhk5br.jpg" },
      // { name: "Broccoli & Scallops", price: 380, description: "New!" }
    ]
  },

  {
    id: "breads",
    title: "Breads",
    items: [
      { name: "Spanish Bread", price: 100, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786348094/Spanish_Bread_vtew2q.jpg" },
      { name: "Mini pizza Style", price: 100, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786348652/Mini_Pizza_Style_t50rxa.jpg" },
    ]
  },

  {
    id: "burgers_sandwiches",
    title: "Burgers & Sandwiches",
    items: [
      // { name: "Tuna Sandwich", price: 150, description: "Tuna, mayonnaise, cucumber" },
      // { name: "Triple Decker Clubhouse", price: 150, description: "Bacon, ham, egg, cheese" },
      // { name: "Monte Cristo", price: 150, description: "Bacon and cheese in crusted loaf breads" },
      // { name: "Egg Sandwich", price: 130, description: "Hard boiled eggs, chives, mayo" },
      { name: "Beef Burger", price: 180, description: "Quarter pounder size homemade beef patties with cheese, lettuce", image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1777471664/Beef_Burger_zmovld.jpg" },
      { name: "Burger", price: 160, description: "Homemade patties, coleslaw", image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786352410/Burger_tn3nls.jpg" },
      // { name: "Sriracha Chicken Burger", price: 170, description: "Homemade chicken patties drenched in special sriracha sauce" },
      // { name: "Chicken Burger Big (Pre-order)", price: 500, description: "8x11 size bun - serves 4 to 5 persons" },
      // { name: "Yes You Ken Burger (Pre-order)", price: 550, description: "8x11 size bun - serves 4 to 5 persons" }
    ]
  },

  // {
  //   id: "coffee_based",
  //   title: "Coffee-Based",
  //   items: [
  //     { name: "VK Signature Blend", prices: { hotSmall: 78, hotLarge: 88, icedSmall: 88, icedLarge: 98 } },
  //     { name: "Flat White", prices: { hotSmall: 98, hotLarge: 108, icedSmall: 108, icedLarge: 118 } },
  //     { name: "Cappuccino", prices: { hotSmall: 98, hotLarge: 108, icedSmall: 108, icedLarge: 118 } },
  //     { name: "Mocha Latte", prices: { hotSmall: 98, hotLarge: 108, icedSmall: 108, icedLarge: 118 } },
  //     { name: "Spanish Latte", prices: { hotSmall: 98, hotLarge: 108, icedSmall: 108, icedLarge: 118 } },
  //     { name: "Caramel Macchiato", prices: { hotSmall: 98, hotLarge: 108, icedSmall: 108, icedLarge: 118 } },
  //     { name: "Dirty Matcha", prices: { hotSmall: 108, hotLarge: 108, icedSmall: 108, icedLarge: 118 } }
  //   ]
  // },

  {
    id: "non_coffee_drinks",
    title: "Non-Coffee Drinks",
    items: [
      // { name: "Matcha Latte", prices: { small: 108, large: 118 } },
      // { name: "Chocolate", prices: { small: 108, large: 118 } },
      { name: "Strawberry", prices: { small: 108, large: 118 }, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1777471667/Strawberry_Flavored_Milktea_osrs3r.jpg" },
      { name: "Ube & Cheese Flavored Milktea", prices: { small: 108, large: 118 }, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786348723/Ube_Cheese_Flavored_Milktea_ofqbvu.jpg" }
    ]
  },
  {
    id: "desserts",
    title: "Desserts",
    items: [
      { name: "Banana Bread", price: 180, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786351225/Banana_Bread_y9bxl1.jpg" },
      { name: "Turon", price: 50, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786348009/Turon_kgviu8.jpg" },
      { name: "Brownies Chocolate Cake", price: 120, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786351579/Brownies_Chocolate_Cake_rjxxno.jpg" },
      { name: "Blueberry Cheesecake", price: 120, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786351868/Blueberry_Cheesecake_y529c7.jpg" },
      { name: "Tiramisu Cake", prices: { small: 110, large: 120 }, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786347590/Tirumisu_Cake_tgnyrd.jpg" },
      { name: "Oreo", prices: { small: 108, large: 118 }, image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786351174/Tiramisu_Oreo_Dessert_xzmk8w.jpg" }
    ]
  },

  // {
  //   id: "fruit_based_smoothie",
  //   title: "Fruit-Based Smoothie",
  //   items: [
  //     { name: "Strawberry Kiwi", prices: { small: 120, large: 130 } },
  //     { name: "Cucumber Smoothie", prices: { small: 120, large: 130 } }
  //   ]
  // },

  {
    id: "bento_meals_180",
    title: "Bento Meals - 180 Pesos",
    items: [
      { name: "Set A", price: 180, choices: ["Chicken Terriyaki", "Fish fillet"], image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1777471665/Bento_Meal_ifwjr1.jpg" },
      { name: "Set B", price: 180, choices: ["Rice Meal with Fried Egg Chicken"], image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786351796/Rice_Meal_with_Fried_Egg_Chicken_e6dpyi.jpg" },
      // { name: "Set C", price: 180, choices: ["Lumpia Shanghai", "H&K’s Chopsuey"] },
      // { name: "Set D", price: 180, choices: ["Chicken Curry", "Pork Tonkatsu"] },
      // { name: "Set E", price: 180, choices: ["BBQ Pork Belly", "Gising-gising"] },
      // { name: "Set F", price: 180, choices: ["Pork Sisig", "Vegetable Kare-kare"] }
    ]
  },

  // {
  //   id: "bento_meals_220",
  //   title: "Bento Meals - 220 Pesos",
  //   items: [
  //     { name: "Set A", price: 220, choices: ["Mothers Chicken", "H&K's pancit", "Pork sisig"] },
  //     { name: "Set B", price: 220, choices: ["Chicken Sisig", "Pork Binagoongan", "Vegetable karekare"] },
  //     { name: "Set C", price: 220, choices: ["Tapa Flakes", "Chicken Ala King", "Buttered Vegetables"] },
  //     { name: "Set D", price: 220, choices: ["Naked lumpia in peanut sauce", "Lechon Kawali", "Tofu Sisig"] },
  //     { name: "Set E", price: 220, choices: ["Soy Garlic wings", "Kani Salad", "Spaghetti"] },
  //     { name: "Set F", price: 220, choices: ["Mothers Chicken", "Chopsuey", "Pancit Canton Bihon"] },
  //     { name: "Set G", price: 220, choices: ["Lumpia Shanghai", "Pinakbet", "Pancit Palabok"] }
  //   ]
  // },

  // {
  //   id: "merienda_meals",
  //   title: "Merienda Meals",
  //   items: [
  //     { name: "Set A", price: 148, choices: ["Ukoy or vegetable fritters", "Palabok", "Iced Tea"] },
  //     { name: "Set B", price: 188, choices: ["Egg Sandwich", "Chinese Style Pancit", "Iced Tea"] },
  //     { name: "Set C", price: 198, choices: ["Egg Sandwich", "Spaghetti with meatballs", "Iced Tea"] },
  //     { name: "Set D", price: 198, choices: ["Egg Sandwich", "Cheesy Baked Macaroni", "Iced Tea"] },
  //     { name: "Set E", price: 198, choices: ["Egg Sandwich", "Lomi", "Iced Tea"] },
  //     { name: "Set F", price: 198, choices: ["Fresh Lumpia", "Pancit Canton Bihon", "Iced Tea"] }
  //   ]
  // },

  {
    id: "budgetarian_meals",
    title: "Budgetarian Meals",
    items: [
      // { name: "Chicken Nuggets", price: 98, description: "Fried chicken breast in homemade breading mix" },
      // { name: "Chicken Skin", price: 98, description: "Chicken skin, with buttered vegetables" },
      // { name: "Pork Binagoongan", price: 98, description: "Pork liempo in bagoong with fried eggplant" },
      // { name: "Lumpia Shanghai", price: 98, description: "2 rolls shanghai with stir fry vegetables" },
      // { name: "Spamchi", price: 110, description: "2 slices of spam, egg and kimchi" },
      { name: "Pork Sisig", price: 120, description: "Crispy pork sisig, chili, soy sauce", image: "https://res.cloudinary.com/dragd5hfj/image/upload/v1786352598/Sisig_with_Rice_vlxvmr.jpg" },
      // { name: "Mother’s Chicken", price: 120, description: "Marinated fried chicken with stir fry veggies" },
      // { name: "Tapa Flakes", price: 120, description: "Crispy tapa flakes with scrambled egg" }
    ]
  },

  // {
  //   id: "plated_rice_meals",
  //   title: "Plated Rice Meals",
  //   items: [
  //     { name: "Set A", price: 195, choices: ["Mothers Chicken", "Liempo Kare-kare"], drinks: ["Iced Tea", "Brewed Coffee"] },
  //     { name: "Set B", price: 195, choices: ["Chicken Cordon Bleu", "Stir Fry Vegetables"], drinks: ["Iced Tea", "Brewed Coffee"] },
  //     { name: "Set C", price: 195, choices: ["Mothers Chicken", "Chopsuey"], drinks: ["Iced Tea", "Brewed Coffee"] },
  //     { name: "Set D", price: 195, choices: ["Pork Sisig", "Gising-gising"], drinks: ["Iced Tea", "Brewed Coffee"] },
  //     { name: "Set E", price: 195, choices: ["Sweet & Sour Fish Fillet", "Pork Sisig"], drinks: ["Iced Tea", "Brewed Coffee"] },
  //     { name: "Set F", price: 195, choices: ["Pork Steak", "Buttered Vegetables"], drinks: ["Iced Tea", "Brewed Coffee"] }
  //   ]
  // }
];