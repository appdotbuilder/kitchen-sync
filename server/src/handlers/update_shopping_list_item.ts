import { db } from '../db';
import { shoppingListItemsTable } from '../db/schema';
import { type UpdateShoppingListItemInput, type ShoppingListItem } from '../schema';
import { eq } from 'drizzle-orm';

export const updateShoppingListItem = async (input: UpdateShoppingListItemInput): Promise<ShoppingListItem | null> => {
  try {
    // Build the update object dynamically based on provided fields
    const updateData: Record<string, any> = {};

    if (input.is_purchased !== undefined) {
      updateData['is_purchased'] = input.is_purchased;
    }

    if (input.quantity !== undefined) {
      updateData['quantity'] = input.quantity;
    }

    if (input.notes !== undefined) {
      updateData['notes'] = input.notes;
    }

    // Update the shopping list item
    const result = await db.update(shoppingListItemsTable)
      .set(updateData)
      .where(eq(shoppingListItemsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      return null;
    }

    // Return the updated item (quantity is already a number from database)
    const item = result[0];
    return item;
  } catch (error) {
    console.error('Shopping list item update failed:', error);
    throw error;
  }
};