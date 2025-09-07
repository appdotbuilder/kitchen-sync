import { db } from '../db';
import { shoppingListsTable } from '../db/schema';
import { type ShoppingList } from '../schema';

export const getShoppingLists = async (): Promise<ShoppingList[]> => {
  try {
    const result = await db.select()
      .from(shoppingListsTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Get shopping lists failed:', error);
    throw error;
  }
};