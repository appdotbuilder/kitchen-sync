import { db } from '../db';
import { shoppingListItemsTable, shoppingListsTable, ingredientsTable } from '../db/schema';
import { type CreateShoppingListItemInput, type ShoppingListItem } from '../schema';
import { eq } from 'drizzle-orm';

export const createShoppingListItem = async (input: CreateShoppingListItemInput): Promise<ShoppingListItem> => {
  try {
    // Verify that the shopping list exists
    const shoppingList = await db.select()
      .from(shoppingListsTable)
      .where(eq(shoppingListsTable.id, input.shopping_list_id))
      .execute();

    if (shoppingList.length === 0) {
      throw new Error(`Shopping list with id ${input.shopping_list_id} not found`);
    }

    // If ingredient_id is provided, verify the ingredient exists
    if (input.ingredient_id !== null) {
      const ingredient = await db.select()
        .from(ingredientsTable)
        .where(eq(ingredientsTable.id, input.ingredient_id))
        .execute();

      if (ingredient.length === 0) {
        throw new Error(`Ingredient with id ${input.ingredient_id} not found`);
      }
    }

    // Insert shopping list item record
    const result = await db.insert(shoppingListItemsTable)
      .values({
        shopping_list_id: input.shopping_list_id,
        ingredient_id: input.ingredient_id,
        name: input.name,
        quantity: input.quantity,
        unit: input.unit,
        category: input.category,
        is_purchased: false, // Default to false as per schema
        notes: input.notes
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const shoppingListItem = result[0];
    return {
      ...shoppingListItem,
      quantity: shoppingListItem.quantity !== null ? parseFloat(shoppingListItem.quantity.toString()) : null
    };
  } catch (error) {
    console.error('Shopping list item creation failed:', error);
    throw error;
  }
};