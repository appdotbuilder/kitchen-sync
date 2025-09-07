import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { shoppingListsTable, shoppingListItemsTable, ingredientsTable } from '../db/schema';
import { type UpdateShoppingListItemInput } from '../schema';
import { updateShoppingListItem } from '../handlers/update_shopping_list_item';
import { eq } from 'drizzle-orm';

describe('updateShoppingListItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testShoppingListId: number;
  let testIngredientId: number;
  let testItemId: number;

  beforeEach(async () => {
    // Create prerequisite data for testing
    
    // Create an ingredient
    const ingredientResult = await db.insert(ingredientsTable)
      .values({
        name: 'Test Ingredient',
        category: 'Produce',
        unit: 'cup'
      })
      .returning()
      .execute();
    testIngredientId = ingredientResult[0].id;

    // Create a shopping list
    const shoppingListResult = await db.insert(shoppingListsTable)
      .values({
        name: 'Test Shopping List',
        meal_plan_id: null
      })
      .returning()
      .execute();
    testShoppingListId = shoppingListResult[0].id;

    // Create a shopping list item to update
    const itemResult = await db.insert(shoppingListItemsTable)
      .values({
        shopping_list_id: testShoppingListId,
        ingredient_id: testIngredientId,
        name: 'Test Item',
        quantity: 2.5,
        unit: 'cup',
        category: 'Produce',
        is_purchased: false,
        notes: 'Original notes'
      })
      .returning()
      .execute();
    testItemId = itemResult[0].id;
  });

  it('should update is_purchased status', async () => {
    const input: UpdateShoppingListItemInput = {
      id: testItemId,
      is_purchased: true
    };

    const result = await updateShoppingListItem(input);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(testItemId);
    expect(result!.is_purchased).toBe(true);
    expect(result!.name).toEqual('Test Item');
    expect(result!.quantity).toEqual(2.5);
    expect(typeof result!.quantity).toBe('number');
  });

  it('should update quantity correctly', async () => {
    const input: UpdateShoppingListItemInput = {
      id: testItemId,
      quantity: 5.75
    };

    const result = await updateShoppingListItem(input);

    expect(result).toBeDefined();
    expect(result!.quantity).toEqual(5.75);
    expect(typeof result!.quantity).toBe('number');
    expect(result!.is_purchased).toBe(false); // Should remain unchanged
  });

  it('should update quantity to null', async () => {
    const input: UpdateShoppingListItemInput = {
      id: testItemId,
      quantity: null
    };

    const result = await updateShoppingListItem(input);

    expect(result).toBeDefined();
    expect(result!.quantity).toBeNull();
    expect(result!.name).toEqual('Test Item');
  });

  it('should update notes', async () => {
    const input: UpdateShoppingListItemInput = {
      id: testItemId,
      notes: 'Updated notes'
    };

    const result = await updateShoppingListItem(input);

    expect(result).toBeDefined();
    expect(result!.notes).toEqual('Updated notes');
    expect(result!.is_purchased).toBe(false); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateShoppingListItemInput = {
      id: testItemId,
      is_purchased: true,
      quantity: 3.25,
      notes: 'Bought at store'
    };

    const result = await updateShoppingListItem(input);

    expect(result).toBeDefined();
    expect(result!.is_purchased).toBe(true);
    expect(result!.quantity).toEqual(3.25);
    expect(typeof result!.quantity).toBe('number');
    expect(result!.notes).toEqual('Bought at store');
  });

  it('should save changes to database', async () => {
    const input: UpdateShoppingListItemInput = {
      id: testItemId,
      is_purchased: true,
      quantity: 4.0,
      notes: 'Database test'
    };

    await updateShoppingListItem(input);

    // Query database directly to verify changes
    const items = await db.select()
      .from(shoppingListItemsTable)
      .where(eq(shoppingListItemsTable.id, testItemId))
      .execute();

    expect(items).toHaveLength(1);
    const item = items[0];
    expect(item.is_purchased).toBe(true);
    expect(item.quantity).toEqual(4.0);
    expect(item.notes).toEqual('Database test');
  });

  it('should return null for non-existent item', async () => {
    const input: UpdateShoppingListItemInput = {
      id: 99999, // Non-existent ID
      is_purchased: true
    };

    const result = await updateShoppingListItem(input);

    expect(result).toBeNull();
  });

  it('should handle partial updates correctly', async () => {
    // Update only is_purchased
    const input1: UpdateShoppingListItemInput = {
      id: testItemId,
      is_purchased: true
    };

    const result1 = await updateShoppingListItem(input1);
    expect(result1!.is_purchased).toBe(true);
    expect(result1!.quantity).toEqual(2.5); // Should remain unchanged
    expect(result1!.notes).toEqual('Original notes'); // Should remain unchanged

    // Update only notes
    const input2: UpdateShoppingListItemInput = {
      id: testItemId,
      notes: 'Just updated notes'
    };

    const result2 = await updateShoppingListItem(input2);
    expect(result2!.is_purchased).toBe(true); // Should remain from previous update
    expect(result2!.quantity).toEqual(2.5); // Should remain unchanged
    expect(result2!.notes).toEqual('Just updated notes');
  });

  it('should handle zero quantity correctly', async () => {
    const input: UpdateShoppingListItemInput = {
      id: testItemId,
      quantity: 0
    };

    const result = await updateShoppingListItem(input);

    expect(result).toBeDefined();
    expect(result!.quantity).toEqual(0);
    expect(typeof result!.quantity).toBe('number');
  });

  it('should preserve unchanged fields', async () => {
    const input: UpdateShoppingListItemInput = {
      id: testItemId,
      notes: 'Only updating notes'
    };

    const result = await updateShoppingListItem(input);

    expect(result).toBeDefined();
    expect(result!.shopping_list_id).toEqual(testShoppingListId);
    expect(result!.ingredient_id).toEqual(testIngredientId);
    expect(result!.name).toEqual('Test Item');
    expect(result!.quantity).toEqual(2.5);
    expect(result!.unit).toEqual('cup');
    expect(result!.category).toEqual('Produce');
    expect(result!.is_purchased).toBe(false);
    expect(result!.notes).toEqual('Only updating notes');
  });
});