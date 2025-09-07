import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  mealPlansTable, 
  ingredientsTable, 
  recipesTable, 
  recipeIngredientsTable,
  mealPlanEntriesTable,
  shoppingListsTable,
  shoppingListItemsTable
} from '../db/schema';
import { generateShoppingListFromMealPlan } from '../handlers/generate_shopping_list_from_meal_plan';
import { eq } from 'drizzle-orm';

describe('generateShoppingListFromMealPlan', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate shopping list from meal plan with aggregated ingredients', async () => {
    // Create ingredients
    const ingredientsResult = await db.insert(ingredientsTable)
      .values([
        { name: 'Flour', category: 'Baking', unit: 'cup' },
        { name: 'Sugar', category: 'Baking', unit: 'cup' },
        { name: 'Eggs', category: 'Dairy', unit: 'piece' }
      ])
      .returning()
      .execute();

    const [flour, sugar, eggs] = ingredientsResult;

    // Create recipes
    const recipesResult = await db.insert(recipesTable)
      .values([
        { 
          title: 'Pancakes', 
          description: 'Fluffy pancakes', 
          instructions: 'Mix and cook',
          servings: 4 
        },
        { 
          title: 'Cookies', 
          description: 'Sweet cookies', 
          instructions: 'Bake them',
          servings: 12 
        }
      ])
      .returning()
      .execute();

    const [pancakeRecipe, cookieRecipe] = recipesResult;

    // Create recipe ingredients
    await db.insert(recipeIngredientsTable)
      .values([
        // Pancake ingredients
        { recipe_id: pancakeRecipe.id, ingredient_id: flour.id, quantity: 2, unit: 'cup', notes: null },
        { recipe_id: pancakeRecipe.id, ingredient_id: sugar.id, quantity: 0.25, unit: 'cup', notes: null },
        { recipe_id: pancakeRecipe.id, ingredient_id: eggs.id, quantity: 2, unit: 'piece', notes: null },
        // Cookie ingredients
        { recipe_id: cookieRecipe.id, ingredient_id: flour.id, quantity: 3, unit: 'cup', notes: null },
        { recipe_id: cookieRecipe.id, ingredient_id: sugar.id, quantity: 1, unit: 'cup', notes: null },
        { recipe_id: cookieRecipe.id, ingredient_id: eggs.id, quantity: 1, unit: 'piece', notes: null }
      ])
      .execute();

    // Create meal plan
    const mealPlanResult = await db.insert(mealPlansTable)
      .values({
        name: 'Weekend Meals',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07'),
        description: 'Meal plan for the weekend'
      })
      .returning()
      .execute();

    const mealPlan = mealPlanResult[0];

    // Create meal plan entries
    await db.insert(mealPlanEntriesTable)
      .values([
        {
          meal_plan_id: mealPlan.id,
          recipe_id: pancakeRecipe.id,
          date: new Date('2024-01-01'),
          meal_type: 'breakfast',
          servings: 2, // Half the recipe servings
          notes: null
        },
        {
          meal_plan_id: mealPlan.id,
          recipe_id: cookieRecipe.id,
          date: new Date('2024-01-02'),
          meal_type: 'snack',
          servings: 6, // Half the recipe servings
          notes: null
        }
      ])
      .execute();

    // Generate shopping list
    const result = await generateShoppingListFromMealPlan(mealPlan.id, 'Weekend Shopping');

    // Verify shopping list creation
    expect(result.name).toEqual('Weekend Shopping');
    expect(result.meal_plan_id).toEqual(mealPlan.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify shopping list items
    const shoppingListItems = await db.select()
      .from(shoppingListItemsTable)
      .where(eq(shoppingListItemsTable.shopping_list_id, result.id))
      .execute();

    expect(shoppingListItems).toHaveLength(3);

    // Check aggregated quantities
    // Flour: (2 cups * 2 servings) + (3 cups * 6 servings) = 4 + 18 = 22 cups
    const flourItem = shoppingListItems.find(item => item.ingredient_id === flour.id);
    expect(flourItem).toBeDefined();
    expect(flourItem!.name).toEqual('Flour');
    expect(flourItem!.quantity).toEqual(22);
    expect(flourItem!.unit).toEqual('cup');
    expect(flourItem!.category).toEqual('Baking');
    expect(flourItem!.is_purchased).toEqual(false);

    // Sugar: (0.25 cups * 2 servings) + (1 cup * 6 servings) = 0.5 + 6 = 6.5 cups
    const sugarItem = shoppingListItems.find(item => item.ingredient_id === sugar.id);
    expect(sugarItem).toBeDefined();
    expect(sugarItem!.quantity).toEqual(6.5);
    expect(sugarItem!.unit).toEqual('cup');

    // Eggs: (2 pieces * 2 servings) + (1 piece * 6 servings) = 4 + 6 = 10 pieces
    const eggsItem = shoppingListItems.find(item => item.ingredient_id === eggs.id);
    expect(eggsItem).toBeDefined();
    expect(eggsItem!.quantity).toEqual(10);
    expect(eggsItem!.unit).toEqual('piece');
  });

  it('should create empty shopping list when meal plan has no entries', async () => {
    // Create meal plan without entries
    const mealPlanResult = await db.insert(mealPlansTable)
      .values({
        name: 'Empty Plan',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07'),
        description: null
      })
      .returning()
      .execute();

    const mealPlan = mealPlanResult[0];

    // Generate shopping list
    const result = await generateShoppingListFromMealPlan(mealPlan.id, 'Empty Shopping List');

    // Verify shopping list creation
    expect(result.name).toEqual('Empty Shopping List');
    expect(result.meal_plan_id).toEqual(mealPlan.id);
    expect(result.id).toBeDefined();

    // Verify no shopping list items
    const shoppingListItems = await db.select()
      .from(shoppingListItemsTable)
      .where(eq(shoppingListItemsTable.shopping_list_id, result.id))
      .execute();

    expect(shoppingListItems).toHaveLength(0);
  });

  it('should handle recipes with same ingredients but different units separately', async () => {
    // Create ingredient
    const ingredientsResult = await db.insert(ingredientsTable)
      .values([
        { name: 'Milk', category: 'Dairy', unit: 'cup' }
      ])
      .returning()
      .execute();

    const [milk] = ingredientsResult;

    // Create recipes
    const recipesResult = await db.insert(recipesTable)
      .values([
        { 
          title: 'Recipe A', 
          description: 'Uses cups', 
          instructions: 'Cook',
          servings: 1 
        },
        { 
          title: 'Recipe B', 
          description: 'Uses tablespoons', 
          instructions: 'Cook',
          servings: 1 
        }
      ])
      .returning()
      .execute();

    const [recipeA, recipeB] = recipesResult;

    // Create recipe ingredients with different units
    await db.insert(recipeIngredientsTable)
      .values([
        { recipe_id: recipeA.id, ingredient_id: milk.id, quantity: 1, unit: 'cup', notes: null },
        { recipe_id: recipeB.id, ingredient_id: milk.id, quantity: 4, unit: 'tbsp', notes: null }
      ])
      .execute();

    // Create meal plan
    const mealPlanResult = await db.insert(mealPlansTable)
      .values({
        name: 'Mixed Units Plan',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07'),
        description: null
      })
      .returning()
      .execute();

    const mealPlan = mealPlanResult[0];

    // Create meal plan entries
    await db.insert(mealPlanEntriesTable)
      .values([
        {
          meal_plan_id: mealPlan.id,
          recipe_id: recipeA.id,
          date: new Date('2024-01-01'),
          meal_type: 'breakfast',
          servings: 1,
          notes: null
        },
        {
          meal_plan_id: mealPlan.id,
          recipe_id: recipeB.id,
          date: new Date('2024-01-02'),
          meal_type: 'lunch',
          servings: 1,
          notes: null
        }
      ])
      .execute();

    // Generate shopping list
    const result = await generateShoppingListFromMealPlan(mealPlan.id, 'Mixed Units Shopping');

    // Verify separate items for different units
    const shoppingListItems = await db.select()
      .from(shoppingListItemsTable)
      .where(eq(shoppingListItemsTable.shopping_list_id, result.id))
      .execute();

    expect(shoppingListItems).toHaveLength(2);

    const cupItem = shoppingListItems.find(item => item.unit === 'cup');
    const tbspItem = shoppingListItems.find(item => item.unit === 'tbsp');

    expect(cupItem).toBeDefined();
    expect(cupItem!.quantity).toEqual(1);
    expect(cupItem!.name).toEqual('Milk');

    expect(tbspItem).toBeDefined();
    expect(tbspItem!.quantity).toEqual(4);
    expect(tbspItem!.name).toEqual('Milk');
  });

  it('should throw error when meal plan does not exist', async () => {
    const nonExistentMealPlanId = 99999;

    await expect(
      generateShoppingListFromMealPlan(nonExistentMealPlanId, 'Invalid Plan Shopping')
    ).rejects.toThrow(/meal plan with id 99999 not found/i);
  });

  it('should save shopping list to database correctly', async () => {
    // Create basic meal plan
    const mealPlanResult = await db.insert(mealPlansTable)
      .values({
        name: 'Test Plan',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-07'),
        description: null
      })
      .returning()
      .execute();

    const mealPlan = mealPlanResult[0];

    // Generate shopping list
    const result = await generateShoppingListFromMealPlan(mealPlan.id, 'Database Test Shopping');

    // Verify shopping list exists in database
    const shoppingLists = await db.select()
      .from(shoppingListsTable)
      .where(eq(shoppingListsTable.id, result.id))
      .execute();

    expect(shoppingLists).toHaveLength(1);
    expect(shoppingLists[0].name).toEqual('Database Test Shopping');
    expect(shoppingLists[0].meal_plan_id).toEqual(mealPlan.id);
    expect(shoppingLists[0].created_at).toBeInstanceOf(Date);
    expect(shoppingLists[0].updated_at).toBeInstanceOf(Date);
  });
});