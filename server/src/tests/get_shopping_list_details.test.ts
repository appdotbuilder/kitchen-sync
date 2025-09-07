import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { shoppingListsTable, shoppingListItemsTable, ingredientsTable, mealPlansTable } from '../db/schema';
import { getShoppingListDetails } from '../handlers/get_shopping_list_details';

describe('getShoppingListDetails', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return shopping list with items', async () => {
    // Create a meal plan first (for foreign key reference)
    const mealPlanResult = await db.insert(mealPlansTable)
      .values({
        name: 'Weekly Plan',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07'),
        description: 'Test meal plan'
      })
      .returning()
      .execute();

    const mealPlanId = mealPlanResult[0].id;

    // Create an ingredient
    const ingredientResult = await db.insert(ingredientsTable)
      .values({
        name: 'Tomato',
        category: 'Vegetables',
        unit: 'piece'
      })
      .returning()
      .execute();

    const ingredientId = ingredientResult[0].id;

    // Create a shopping list
    const shoppingListResult = await db.insert(shoppingListsTable)
      .values({
        name: 'Weekly Groceries',
        meal_plan_id: mealPlanId
      })
      .returning()
      .execute();

    const shoppingListId = shoppingListResult[0].id;

    // Create shopping list items
    await db.insert(shoppingListItemsTable)
      .values([
        {
          shopping_list_id: shoppingListId,
          ingredient_id: ingredientId,
          name: 'Fresh Tomatoes',
          quantity: 3.5,
          unit: 'lbs',
          category: 'Vegetables',
          is_purchased: false,
          notes: 'Organic if possible'
        },
        {
          shopping_list_id: shoppingListId,
          ingredient_id: null,
          name: 'Milk',
          quantity: 1.0,
          unit: 'gallon',
          category: 'Dairy',
          is_purchased: true,
          notes: null
        }
      ])
      .execute();

    const result = await getShoppingListDetails(shoppingListId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(shoppingListId);
    expect(result!.name).toEqual('Weekly Groceries');
    expect(result!.meal_plan_id).toEqual(mealPlanId);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Check items
    expect(result!.items).toHaveLength(2);

    const tomatoItem = result!.items.find(item => item.name === 'Fresh Tomatoes');
    expect(tomatoItem).toBeDefined();
    expect(tomatoItem!.ingredient_id).toEqual(ingredientId);
    expect(typeof tomatoItem!.quantity).toBe('number');
    expect(tomatoItem!.quantity).toEqual(3.5);
    expect(tomatoItem!.unit).toEqual('lbs');
    expect(tomatoItem!.category).toEqual('Vegetables');
    expect(tomatoItem!.is_purchased).toBe(false);
    expect(tomatoItem!.notes).toEqual('Organic if possible');

    const milkItem = result!.items.find(item => item.name === 'Milk');
    expect(milkItem).toBeDefined();
    expect(milkItem!.ingredient_id).toBeNull();
    expect(typeof milkItem!.quantity).toBe('number');
    expect(milkItem!.quantity).toEqual(1.0);
    expect(milkItem!.unit).toEqual('gallon');
    expect(milkItem!.category).toEqual('Dairy');
    expect(milkItem!.is_purchased).toBe(true);
    expect(milkItem!.notes).toBeNull();
  });

  it('should return shopping list with empty items array when no items exist', async () => {
    // Create a standalone shopping list (without meal plan)
    const shoppingListResult = await db.insert(shoppingListsTable)
      .values({
        name: 'Empty List',
        meal_plan_id: null
      })
      .returning()
      .execute();

    const shoppingListId = shoppingListResult[0].id;

    const result = await getShoppingListDetails(shoppingListId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(shoppingListId);
    expect(result!.name).toEqual('Empty List');
    expect(result!.meal_plan_id).toBeNull();
    expect(result!.items).toHaveLength(0);
    expect(Array.isArray(result!.items)).toBe(true);
  });

  it('should return null for non-existent shopping list', async () => {
    const result = await getShoppingListDetails(999);

    expect(result).toBeNull();
  });

  it('should handle items with null quantities correctly', async () => {
    // Create shopping list
    const shoppingListResult = await db.insert(shoppingListsTable)
      .values({
        name: 'Flexible List',
        meal_plan_id: null
      })
      .returning()
      .execute();

    const shoppingListId = shoppingListResult[0].id;

    // Create item with null quantity
    await db.insert(shoppingListItemsTable)
      .values({
        shopping_list_id: shoppingListId,
        ingredient_id: null,
        name: 'Spices (assorted)',
        quantity: null,
        unit: null,
        category: 'Pantry',
        is_purchased: false,
        notes: 'Whatever looks good'
      })
      .execute();

    const result = await getShoppingListDetails(shoppingListId);

    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(1);
    expect(result!.items[0].name).toEqual('Spices (assorted)');
    expect(result!.items[0].quantity).toBeNull();
    expect(result!.items[0].unit).toBeNull();
    expect(result!.items[0].category).toEqual('Pantry');
  });

  it('should handle multiple items with different numeric quantities', async () => {
    // Create shopping list
    const shoppingListResult = await db.insert(shoppingListsTable)
      .values({
        name: 'Precise Shopping',
        meal_plan_id: null
      })
      .returning()
      .execute();

    const shoppingListId = shoppingListResult[0].id;

    // Create items with various numeric quantities
    await db.insert(shoppingListItemsTable)
      .values([
        {
          shopping_list_id: shoppingListId,
          ingredient_id: null,
          name: 'Flour',
          quantity: 2.25,
          unit: 'lbs',
          category: 'Baking',
          is_purchased: false,
          notes: null
        },
        {
          shopping_list_id: shoppingListId,
          ingredient_id: null,
          name: 'Eggs',
          quantity: 12.0,
          unit: 'count',
          category: 'Dairy',
          is_purchased: false,
          notes: null
        },
        {
          shopping_list_id: shoppingListId,
          ingredient_id: null,
          name: 'Vanilla Extract',
          quantity: 0.5,
          unit: 'tsp',
          category: 'Baking',
          is_purchased: true,
          notes: null
        }
      ])
      .execute();

    const result = await getShoppingListDetails(shoppingListId);

    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(3);

    // Verify all numeric conversions
    result!.items.forEach(item => {
      expect(typeof item.quantity).toBe('number');
    });

    const flourItem = result!.items.find(item => item.name === 'Flour');
    expect(flourItem!.quantity).toEqual(2.25);

    const eggsItem = result!.items.find(item => item.name === 'Eggs');
    expect(eggsItem!.quantity).toEqual(12.0);

    const vanillaItem = result!.items.find(item => item.name === 'Vanilla Extract');
    expect(vanillaItem!.quantity).toEqual(0.5);
  });
});