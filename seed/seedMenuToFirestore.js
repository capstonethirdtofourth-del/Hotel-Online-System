import { db } from "../FirebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { menuData } from "./menuSeed";

export const seedMenuToFirestore = async () => {
  let categoryCount = 0;
  let itemCount = 0;

  try {
    for (const category of menuData) {
      await setDoc(
        doc(db, "menuCategories", category.id),
        category
      );

      categoryCount += 1;
      itemCount += Array.isArray(category.items)
        ? category.items.length
        : 0;
    }

    console.log(
      `Menu uploaded successfully: ${categoryCount} categories, ${itemCount} items`
    );

    return {
      categoryCount,
      itemCount,
    };
  } catch (error) {
    console.error("Error uploading menu:", error);
    throw error;
  }
};
