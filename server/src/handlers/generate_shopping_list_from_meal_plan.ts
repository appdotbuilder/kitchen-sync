import { db } from '../db';
import { 
  shoppingListsTable, 
  shoppingListItemsTable, 
  mealPlanEntriesTable, 
  recipeIngredientsTable, 
  ingredientsTable,
  mealPlansTable
} from '../db/schema';
import { type ShoppingList } from '../schema';
import { eq } from 'drizzle-orm';

interface AggregatedIngredient {
  ingredient_id: number;
  name: string;
  total_quantity: number;
  unit: string;
  category: string | null;
}

export const generateShoppingListFromMealPlan = async (mealPlanId: number, name: string): Promise<ShoppingList> => {
  try {
    // First verify the meal plan exists
    const mealPlans = await db.select()
      .from(mealPlansTable)
      .where(eq(mealPlansTable.id, mealPlanId))
      .execute();

    if (mealPlans.length === 0) {
      throw new Error(`Meal plan with id ${mealPlanId} not found`);
    }

    // Get all meal plan entries with their recipes and ingredients
    const mealPlanData = await db.select({
      entry_id: mealPlanEntriesTable.id,
      servings: mealPlanEntriesTable.servings,
      ingredient_id: recipeIngredientsTable.ingredient_id,
      quantity: recipeIngredientsTable.quantity,
      unit: recipeIngredientsTable.unit,
      ingredient_name: ingredientsTable.name,
      ingredient_category: ingredientsTable.category
    })
    .from(mealPlanEntriesTable)
    .innerJoin(recipeIngredientsTable, eq(mealPlanEntriesTable.recipe_id, recipeIngredientsTable.recipe_id))
    .innerJoin(ingredientsTable, eq(recipeIngredientsTable.ingredient_id, ingredientsTable.id))
    .where(eq(mealPlanEntriesTable.meal_plan_id, mealPlanId))
    .execute();

    // Aggregate ingredients by ingredient_id and unit
    const ingredientMap = new Map<string, AggregatedIngredient>();

    for (const entry of mealPlanData) {
      const key = `${entry.ingredient_id}-${entry.unit}`;
      const scaledQuantity = parseFloat(entry.quantity.toString()) * entry.servings;

      if (ingredientMap.has(key)) {
        const existing = ingredientMap.get(key)!;
        existing.total_quantity += scaledQuantity;
      } else {
        ingredientMap.set(key, {
          ingredient_id: entry.ingredient_id,
          name: entry.ingredient_name,
          total_quantity: scaledQuantity,
          unit: entry.unit,
          category: entry.ingredient_category
        });
      }
    }

    // Create the shopping list
    const shoppingListResult = await db.insert(shoppingListsTable)
      .values({
        name: name,
        meal_plan_id: mealPlanId
      })
      .returning()
      .execute();

    const shoppingList = shoppingListResult[0];

    // Create shopping list items for each aggregated ingredient
    if (ingredientMap.size > 0) {
      const shoppingListItems = Array.from(ingredientMap.values()).map(ingredient => ({
        shopping_list_id: shoppingList.id,
        ingredient_id: ingredient.ingredient_id,
        name: ingredient.name,
        quantity: ingredient.total_quantity,
        unit: ingredient.unit,
        category: ingredient.category,
        is_purchased: false
      }));

      await db.insert(shoppingListItemsTable)
        .values(shoppingListItems)
        .execute();
    }

    return shoppingList;
  } catch (error) {
    console.error('Shopping list generation failed:', error);
    throw error;
  }
};