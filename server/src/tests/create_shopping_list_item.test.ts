import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { shoppingListsTable, shoppingListItemsTable, ingredientsTable, mealPlansTable } from '../db/schema';
import { type CreateShoppingListItemInput } from '../schema';
import { createShoppingListItem } from '../handlers/create_shopping_list_item';
import { eq } from 'drizzle-orm';

describe('createShoppingListItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create prerequisite data
  const createPrerequisiteData = async () => {
    // Create a meal plan first (required by shopping list)
    const mealPlan = await db.insert(mealPlansTable)
      .values({
        name: 'Test Meal Plan',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07'),
        description: 'Test meal plan for shopping list'
      })
      .returning()
      .execute();

    // Create a shopping list
    const shoppingList = await db.insert(shoppingListsTable)
      .values({
        name: 'Test Shopping List',
        meal_plan_id: mealPlan[0].id
      })
      .returning()
      .execute();

    // Create an ingredient
    const ingredient = await db.insert(ingredientsTable)
      .values({
        name: 'Test Ingredient',
        category: 'vegetables',
        unit: 'cup'
      })
      .returning()
      .execute();

    return {
      shoppingListId: shoppingList[0].id,
      ingredientId: ingredient[0].id
    };
  };

  it('should create a shopping list item with ingredient reference', async () => {
    const { shoppingListId, ingredientId } = await createPrerequisiteData();

    const testInput: CreateShoppingListItemInput = {
      shopping_list_id: shoppingListId,
      ingredient_id: ingredientId,
      name: 'Test Item',
      quantity: 2.5,
      unit: 'cups',
      category: 'vegetables',
      notes: 'Fresh and organic'
    };

    const result = await createShoppingListItem(testInput);

    // Basic field validation
    expect(result.shopping_list_id).toEqual(shoppingListId);
    expect(result.ingredient_id).toEqual(ingredientId);
    expect(result.name).toEqual('Test Item');
    expect(result.quantity).toEqual(2.5);
    expect(typeof result.quantity).toBe('number');
    expect(result.unit).toEqual('cups');
    expect(result.category).toEqual('vegetables');
    expect(result.is_purchased).toEqual(false);
    expect(result.notes).toEqual('Fresh and organic');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
  });

  it('should create a shopping list item without ingredient reference', async () => {
    const { shoppingListId } = await createPrerequisiteData();

    const testInput: CreateShoppingListItemInput = {
      shopping_list_id: shoppingListId,
      ingredient_id: null,
      name: 'Custom Item',
      quantity: null,
      unit: null,
      category: 'other',
      notes: null
    };

    const result = await createShoppingListItem(testInput);

    expect(result.shopping_list_id).toEqual(shoppingListId);
    expect(result.ingredient_id).toBeNull();
    expect(result.name).toEqual('Custom Item');
    expect(result.quantity).toBeNull();
    expect(result.unit).toBeNull();
    expect(result.category).toEqual('other');
    expect(result.is_purchased).toEqual(false);
    expect(result.notes).toBeNull();
  });

  it('should save shopping list item to database', async () => {
    const { shoppingListId, ingredientId } = await createPrerequisiteData();

    const testInput: CreateShoppingListItemInput = {
      shopping_list_id: shoppingListId,
      ingredient_id: ingredientId,
      name: 'Database Test Item',
      quantity: 1.5,
      unit: 'lbs',
      category: 'meat',
      notes: 'Ground beef'
    };

    const result = await createShoppingListItem(testInput);

    // Query database to verify the item was saved
    const savedItems = await db.select()
      .from(shoppingListItemsTable)
      .where(eq(shoppingListItemsTable.id, result.id))
      .execute();

    expect(savedItems).toHaveLength(1);
    const savedItem = savedItems[0];
    expect(savedItem.shopping_list_id).toEqual(shoppingListId);
    expect(savedItem.ingredient_id).toEqual(ingredientId);
    expect(savedItem.name).toEqual('Database Test Item');
    expect(parseFloat(savedItem.quantity!.toString())).toEqual(1.5);
    expect(savedItem.unit).toEqual('lbs');
    expect(savedItem.category).toEqual('meat');
    expect(savedItem.is_purchased).toEqual(false);
    expect(savedItem.notes).toEqual('Ground beef');
  });

  it('should throw error for non-existent shopping list', async () => {
    const testInput: CreateShoppingListItemInput = {
      shopping_list_id: 999999, // Non-existent ID
      ingredient_id: null,
      name: 'Test Item',
      quantity: 1,
      unit: 'piece',
      category: 'other',
      notes: null
    };

    await expect(createShoppingListItem(testInput))
      .rejects
      .toThrow(/Shopping list with id 999999 not found/i);
  });

  it('should throw error for non-existent ingredient', async () => {
    const { shoppingListId } = await createPrerequisiteData();

    const testInput: CreateShoppingListItemInput = {
      shopping_list_id: shoppingListId,
      ingredient_id: 999999, // Non-existent ingredient ID
      name: 'Test Item',
      quantity: 1,
      unit: 'piece',
      category: 'other',
      notes: null
    };

    await expect(createShoppingListItem(testInput))
      .rejects
      .toThrow(/Ingredient with id 999999 not found/i);
  });

  it('should handle decimal quantities correctly', async () => {
    const { shoppingListId } = await createPrerequisiteData();

    const testInput: CreateShoppingListItemInput = {
      shopping_list_id: shoppingListId,
      ingredient_id: null,
      name: 'Decimal Test',
      quantity: 0.75,
      unit: 'cups',
      category: 'baking',
      notes: null
    };

    const result = await createShoppingListItem(testInput);

    expect(result.quantity).toEqual(0.75);
    expect(typeof result.quantity).toBe('number');

    // Verify in database
    const savedItems = await db.select()
      .from(shoppingListItemsTable)
      .where(eq(shoppingListItemsTable.id, result.id))
      .execute();

    expect(parseFloat(savedItems[0].quantity!.toString())).toEqual(0.75);
  });

  it('should create multiple items for the same shopping list', async () => {
    const { shoppingListId, ingredientId } = await createPrerequisiteData();

    const input1: CreateShoppingListItemInput = {
      shopping_list_id: shoppingListId,
      ingredient_id: ingredientId,
      name: 'Item 1',
      quantity: 1,
      unit: 'cup',
      category: 'vegetables',
      notes: null
    };

    const input2: CreateShoppingListItemInput = {
      shopping_list_id: shoppingListId,
      ingredient_id: null,
      name: 'Item 2',
      quantity: 2,
      unit: 'pieces',
      category: 'fruits',
      notes: 'Ripe bananas'
    };

    const result1 = await createShoppingListItem(input1);
    const result2 = await createShoppingListItem(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.shopping_list_id).toEqual(shoppingListId);
    expect(result2.shopping_list_id).toEqual(shoppingListId);

    // Verify both items exist in database
    const allItems = await db.select()
      .from(shoppingListItemsTable)
      .where(eq(shoppingListItemsTable.shopping_list_id, shoppingListId))
      .execute();

    expect(allItems).toHaveLength(2);
  });
});