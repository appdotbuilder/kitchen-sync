import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  shoppingListsTable, 
  shoppingListItemsTable,
  mealPlansTable,
  mealPlanEntriesTable,
  recipesTable,
  recipeIngredientsTable,
  ingredientsTable
} from '../db/schema';
import { type CreateShoppingListInput } from '../schema';
import { createShoppingList } from '../handlers/create_shopping_list';
import { eq } from 'drizzle-orm';

describe('createShoppingList', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a standalone shopping list', async () => {
    const input: CreateShoppingListInput = {
      name: 'Weekly Groceries',
      meal_plan_id: null
    };

    const result = await createShoppingList(input);

    expect(result.name).toEqual('Weekly Groceries');
    expect(result.meal_plan_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save shopping list to database', async () => {
    const input: CreateShoppingListInput = {
      name: 'Test Shopping List',
      meal_plan_id: null
    };

    const result = await createShoppingList(input);

    const shoppingLists = await db.select()
      .from(shoppingListsTable)
      .where(eq(shoppingListsTable.id, result.id))
      .execute();

    expect(shoppingLists).toHaveLength(1);
    expect(shoppingLists[0].name).toEqual('Test Shopping List');
    expect(shoppingLists[0].meal_plan_id).toBeNull();
  });

  it('should create shopping list with meal plan and auto-populate items', async () => {
    // Create test ingredients
    const ingredientResults = await db.insert(ingredientsTable)
      .values([
        { name: 'Chicken Breast', category: 'Meat', unit: 'lb' },
        { name: 'Rice', category: 'Grains', unit: 'cup' },
        { name: 'Broccoli', category: 'Vegetables', unit: 'cup' }
      ])
      .returning()
      .execute();

    const [chicken, rice, broccoli] = ingredientResults;

    // Create test recipe
    const recipeResults = await db.insert(recipesTable)
      .values({
        title: 'Chicken and Rice Bowl',
        instructions: '["Cook chicken", "Cook rice", "Steam broccoli", "Combine"]',
        servings: 4
      })
      .returning()
      .execute();

    const recipe = recipeResults[0];

    // Add recipe ingredients
    await db.insert(recipeIngredientsTable)
      .values([
        { recipe_id: recipe.id, ingredient_id: chicken.id, quantity: 1.5, unit: 'lb' },
        { recipe_id: recipe.id, ingredient_id: rice.id, quantity: 2.0, unit: 'cup' },
        { recipe_id: recipe.id, ingredient_id: broccoli.id, quantity: 1.0, unit: 'cup' }
      ])
      .execute();

    // Create meal plan
    const mealPlanResults = await db.insert(mealPlansTable)
      .values({
        name: 'Weekly Plan',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07')
      })
      .returning()
      .execute();

    const mealPlan = mealPlanResults[0];

    // Add meal plan entries
    await db.insert(mealPlanEntriesTable)
      .values([
        {
          meal_plan_id: mealPlan.id,
          recipe_id: recipe.id,
          date: new Date('2024-01-01'),
          meal_type: 'lunch',
          servings: 2 // Half the recipe servings
        },
        {
          meal_plan_id: mealPlan.id,
          recipe_id: recipe.id,
          date: new Date('2024-01-02'),
          meal_type: 'dinner',
          servings: 4 // Full recipe servings
        }
      ])
      .execute();

    // Create shopping list with meal plan
    const input: CreateShoppingListInput = {
      name: 'Meal Plan Shopping List',
      meal_plan_id: mealPlan.id
    };

    const result = await createShoppingList(input);

    // Verify shopping list was created
    expect(result.name).toEqual('Meal Plan Shopping List');
    expect(result.meal_plan_id).toEqual(mealPlan.id);

    // Verify shopping list items were auto-populated
    const items = await db.select()
      .from(shoppingListItemsTable)
      .where(eq(shoppingListItemsTable.shopping_list_id, result.id))
      .execute();

    expect(items).toHaveLength(3);

    // Verify quantities are aggregated correctly
    // Entry 1: 2 servings (half of 4) = 0.5x multiplier
    // Entry 2: 4 servings (full recipe) = 1.0x multiplier
    // Total multiplier: 0.5 + 1.0 = 1.5

    const chickenItem = items.find(item => item.ingredient_id === chicken.id);
    expect(chickenItem).toBeDefined();
    expect(chickenItem!.name).toEqual('Chicken Breast');
    expect(chickenItem!.quantity).toEqual(2.25); // 1.5 * 1.5
    expect(chickenItem!.unit).toEqual('lb');
    expect(chickenItem!.category).toEqual('Meat');
    expect(chickenItem!.is_purchased).toBe(false);

    const riceItem = items.find(item => item.ingredient_id === rice.id);
    expect(riceItem).toBeDefined();
    expect(riceItem!.quantity).toEqual(3.0); // 2.0 * 1.5
    expect(riceItem!.unit).toEqual('cup');

    const broccoliItem = items.find(item => item.ingredient_id === broccoli.id);
    expect(broccoliItem).toBeDefined();
    expect(broccoliItem!.quantity).toEqual(1.5); // 1.0 * 1.5
  });

  it('should handle meal plan with multiple recipes', async () => {
    // Create ingredients
    const ingredientResults = await db.insert(ingredientsTable)
      .values([
        { name: 'Pasta', category: 'Grains', unit: 'lb' },
        { name: 'Tomato Sauce', category: 'Sauce', unit: 'cup' },
        { name: 'Ground Beef', category: 'Meat', unit: 'lb' }
      ])
      .returning()
      .execute();

    const [pasta, sauce, beef] = ingredientResults;

    // Create two recipes
    const recipeResults = await db.insert(recipesTable)
      .values([
        { title: 'Spaghetti', instructions: '["Boil pasta", "Heat sauce"]', servings: 2 },
        { title: 'Beef Pasta', instructions: '["Cook beef", "Add pasta"]', servings: 3 }
      ])
      .returning()
      .execute();

    const [spaghettiRecipe, beefPastaRecipe] = recipeResults;

    // Add ingredients to recipes
    await db.insert(recipeIngredientsTable)
      .values([
        // Spaghetti recipe
        { recipe_id: spaghettiRecipe.id, ingredient_id: pasta.id, quantity: 0.5, unit: 'lb' },
        { recipe_id: spaghettiRecipe.id, ingredient_id: sauce.id, quantity: 1.0, unit: 'cup' },
        // Beef pasta recipe  
        { recipe_id: beefPastaRecipe.id, ingredient_id: pasta.id, quantity: 0.75, unit: 'lb' },
        { recipe_id: beefPastaRecipe.id, ingredient_id: beef.id, quantity: 1.0, unit: 'lb' }
      ])
      .execute();

    // Create meal plan
    const mealPlanResults = await db.insert(mealPlansTable)
      .values({
        name: 'Multi-Recipe Plan',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-03')
      })
      .returning()
      .execute();

    const mealPlan = mealPlanResults[0];

    // Add meal plan entries for both recipes
    await db.insert(mealPlanEntriesTable)
      .values([
        {
          meal_plan_id: mealPlan.id,
          recipe_id: spaghettiRecipe.id,
          date: new Date('2024-01-01'),
          meal_type: 'dinner',
          servings: 2 // Full recipe
        },
        {
          meal_plan_id: mealPlan.id,
          recipe_id: beefPastaRecipe.id,
          date: new Date('2024-01-02'),
          meal_type: 'lunch',
          servings: 6 // Double recipe
        }
      ])
      .execute();

    const input: CreateShoppingListInput = {
      name: 'Multi-Recipe Shopping List',
      meal_plan_id: mealPlan.id
    };

    const result = await createShoppingList(input);

    const items = await db.select()
      .from(shoppingListItemsTable)
      .where(eq(shoppingListItemsTable.shopping_list_id, result.id))
      .execute();

    expect(items).toHaveLength(3); // pasta, sauce, beef

    // Verify pasta quantities are aggregated from both recipes
    // Spaghetti: 0.5 lb * (2 servings / 2 recipe servings) = 0.5 lb
    // Beef Pasta: 0.75 lb * (6 servings / 3 recipe servings) = 1.5 lb
    // Total: 0.5 + 1.5 = 2.0 lb
    const pastaItem = items.find(item => item.ingredient_id === pasta.id);
    expect(pastaItem!.quantity).toEqual(2.0);
  });

  it('should throw error for non-existent meal plan', async () => {
    const input: CreateShoppingListInput = {
      name: 'Invalid Meal Plan List',
      meal_plan_id: 999 // Non-existent ID
    };

    expect(createShoppingList(input)).rejects.toThrow(/Meal plan with id 999 not found/);
  });

  it('should throw error for meal plan with no entries', async () => {
    // Create empty meal plan
    const mealPlanResults = await db.insert(mealPlansTable)
      .values({
        name: 'Empty Plan',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07')
      })
      .returning()
      .execute();

    const mealPlan = mealPlanResults[0];

    const input: CreateShoppingListInput = {
      name: 'Empty Plan Shopping List',
      meal_plan_id: mealPlan.id
    };

    expect(createShoppingList(input)).rejects.toThrow(/not found or has no entries/);
  });

  it('should handle recipes with no servings specified', async () => {
    // Create ingredient and recipe without servings
    const ingredientResults = await db.insert(ingredientsTable)
      .values([{ name: 'Salt', category: 'Spices', unit: 'tsp' }])
      .returning()
      .execute();

    const salt = ingredientResults[0];

    const recipeResults = await db.insert(recipesTable)
      .values({
        title: 'Simple Recipe',
        instructions: '["Add salt"]',
        servings: null // No servings specified
      })
      .returning()
      .execute();

    const recipe = recipeResults[0];

    await db.insert(recipeIngredientsTable)
      .values([{ recipe_id: recipe.id, ingredient_id: salt.id, quantity: 1.0, unit: 'tsp' }])
      .execute();

    const mealPlanResults = await db.insert(mealPlansTable)
      .values({
        name: 'No Servings Plan',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-02')
      })
      .returning()
      .execute();

    const mealPlan = mealPlanResults[0];

    await db.insert(mealPlanEntriesTable)
      .values([{
        meal_plan_id: mealPlan.id,
        recipe_id: recipe.id,
        date: new Date('2024-01-01'),
        meal_type: 'breakfast',
        servings: 2
      }])
      .execute();

    const input: CreateShoppingListInput = {
      name: 'No Recipe Servings List',
      meal_plan_id: mealPlan.id
    };

    const result = await createShoppingList(input);

    const items = await db.select()
      .from(shoppingListItemsTable)
      .where(eq(shoppingListItemsTable.shopping_list_id, result.id))
      .execute();

    expect(items).toHaveLength(1);
    // When recipe servings is null, it defaults to 1, so multiplier is 2/1 = 2
    expect(items[0].quantity).toEqual(2.0); // 1.0 * 2
  });
});