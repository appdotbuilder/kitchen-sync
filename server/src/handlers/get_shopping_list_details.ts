import { db } from '../db';
import { shoppingListsTable, shoppingListItemsTable } from '../db/schema';
import { type ShoppingList, type ShoppingListItem } from '../schema';
import { eq } from 'drizzle-orm';

export interface ShoppingListWithItems extends ShoppingList {
    items: ShoppingListItem[];
}

export const getShoppingListDetails = async (id: number): Promise<ShoppingListWithItems | null> => {
  try {
    // First, get the shopping list
    const shoppingListResult = await db.select()
      .from(shoppingListsTable)
      .where(eq(shoppingListsTable.id, id))
      .execute();

    if (shoppingListResult.length === 0) {
      return null;
    }

    const shoppingList = shoppingListResult[0];

    // Then get all items for this shopping list
    const itemsResult = await db.select()
      .from(shoppingListItemsTable)
      .where(eq(shoppingListItemsTable.shopping_list_id, id))
      .execute();

    // Convert numeric fields for items
    const items: ShoppingListItem[] = itemsResult.map(item => ({
      ...item,
      quantity: item.quantity !== null ? parseFloat(item.quantity.toString()) : null
    }));

    return {
      ...shoppingList,
      items
    };
  } catch (error) {
    console.error('Shopping list details retrieval failed:', error);
    throw error;
  }
};