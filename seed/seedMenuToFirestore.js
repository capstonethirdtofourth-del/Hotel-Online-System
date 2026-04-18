import { db } from "../FirebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { menuData } from "./menuSeed";

export const seedMenuToFirestore = async () => {
  try {
    for (const category of menuData) {
      await setDoc(doc(db, "menuCategories", category.id), category);
    }
    console.log("Menu uploaded successfully!");
  } catch (error) {
    console.error("Error uploading menu: ", error);
  }
};