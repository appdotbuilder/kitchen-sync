import { db } from '../db';
import { 
  shoppingListsTable, 
  shoppingListItemsTable, 
  mealPlanEntriesTable, 
  recipeIngredientsTable,
  ingredientsTable,
  recipesTable 
} from '../db/schema';
import { type CreateShoppingListInput, type ShoppingList } from '../schema';
import { eq, inArray } from 'drizzle-orm';

export const createShoppingList = async (input: CreateShoppingListInput): Promise<ShoppingList> => {
  try {
    // Verify meal plan exists if meal_plan_id is provided
    if (input.meal_plan_id) {
      const mealPlanEntries = await db.select()
        .from(mealPlanEntriesTable)
        .where(eq(mealPlanEntriesTable.meal_plan_id, input.meal_plan_id))
        .execute();

      if (mealPlanEntries.length === 0) {
        throw new Error(`Meal plan with id ${input.meal_plan_id} not found or has no entries`);
      }
    }

    // Insert shopping list record
    const result = await db.insert(shoppingListsTable)
      .values({
        name: input.name,
        meal_plan_id: input.meal_plan_id
      })
      .returning()
      .execute();

    const shoppingList = result[0];

    // Auto-populate items from meal plan if meal_plan_id is provided
    if (input.meal_plan_id) {
      await populateShoppingListFromMealPlan(shoppingList.id, input.meal_plan_id);
    }

    return shoppingList;
  } catch (error) {
    console.error('Shopping list creation failed:', error);
    throw error;
  }
};

// Helper function to populate shopping list items from meal plan
const populateShoppingListFromMealPlan = async (shoppingListId: number, mealPlanId: number): Promise<void> => {
  try {
    // Get all meal plan entries with their recipes and ingredients
    const mealPlanData = await db.select({
      entry_servings: mealPlanEntriesTable.servings,
      recipe_servings: recipesTable.servings,
      ingredient_id: recipeIngredientsTable.ingredient_id,
      ingredient_name: ingredientsTable.name,
      ingredient_category: ingredientsTable.category,
      ingredient_unit: ingredientsTable.unit,
      recipe_quantity: recipeIngredientsTable.quantity,
      recipe_unit: recipeIngredientsTable.unit
    })
    .from(mealPlanEntriesTable)
    .innerJoin(recipesTable, eq(mealPlanEntriesTable.recipe_id, recipesTable.id))
    .innerJoin(recipeIngredientsTable, eq(recipesTable.id, recipeIngredientsTable.recipe_id))
    .innerJoin(ingredientsTable, eq(recipeIngredientsTable.ingredient_id, ingredientsTable.id))
    .where(eq(mealPlanEntriesTable.meal_plan_id, mealPlanId))
    .execute();

    // Aggregate ingredients by ingredient_id to avoid duplicates
    const ingredientMap = new Map<number, {
      name: string;
      category: string | null;
      unit: string;
      totalQuantity: number;
    }>();

    for (const item of mealPlanData) {
      const servingMultiplier = item.entry_servings / (item.recipe_servings || 1);
      const adjustedQuantity = item.recipe_quantity * servingMultiplier;

      if (ingredientMap.has(item.ingredient_id)) {
        const existing = ingredientMap.get(item.ingredient_id)!;
        existing.totalQuantity += adjustedQuantity;
      } else {
        ingredientMap.set(item.ingredient_id, {
          name: item.ingredient_name,
          category: item.ingredient_category,
          unit: item.recipe_unit,
          totalQuantity: adjustedQuantity
        });
      }
    }

    // Insert shopping list items
    if (ingredientMap.size > 0) {
      const itemsToInsert = Array.from(ingredientMap.entries()).map(([ingredientId, data]) => ({
        shopping_list_id: shoppingListId,
        ingredient_id: ingredientId,
        name: data.name,
        quantity: parseFloat(data.totalQuantity.toFixed(2)), // Convert to number with 2 decimal precision
        unit: data.unit,
        category: data.category,
        is_purchased: false
      }));

      await db.insert(shoppingListItemsTable)
        .values(itemsToInsert)
        .execute();
    }
  } catch (error) {
    console.error('Failed to populate shopping list from meal plan:', error);
    throw error;
  }
};