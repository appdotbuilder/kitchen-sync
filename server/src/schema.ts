import { z } from 'zod';

// Ingredient schema
export const ingredientSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.string().nullable(),
  unit: z.string(), // e.g., 'cup', 'tbsp', 'gram', 'piece'
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Ingredient = z.infer<typeof ingredientSchema>;

// Recipe ingredient association schema
export const recipeIngredientSchema = z.object({
  id: z.number(),
  recipe_id: z.number(),
  ingredient_id: z.number(),
  quantity: z.number(),
  unit: z.string(),
  notes: z.string().nullable() // e.g., "finely chopped", "room temperature"
});

export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;

// Recipe schema
export const recipeSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  instructions: z.string(), // JSON string of step-by-step instructions
  prep_time: z.number().int().nullable(), // in minutes
  cook_time: z.number().int().nullable(), // in minutes
  servings: z.number().int().nullable(),
  difficulty: z.enum(['easy', 'medium', 'hard']).nullable(),
  cuisine: z.string().nullable(),
  tags: z.string().nullable(), // JSON array of tags
  image_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Recipe = z.infer<typeof recipeSchema>;

// Meal plan schema
export const mealPlanSchema = z.object({
  id: z.number(),
  name: z.string(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type MealPlan = z.infer<typeof mealPlanSchema>;

// Meal plan entry schema (individual meals within a plan)
export const mealPlanEntrySchema = z.object({
  id: z.number(),
  meal_plan_id: z.number(),
  recipe_id: z.number(),
  date: z.coerce.date(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  servings: z.number().int(),
  notes: z.string().nullable()
});

export type MealPlanEntry = z.infer<typeof mealPlanEntrySchema>;

// Shopping list schema
export const shoppingListSchema = z.object({
  id: z.number(),
  name: z.string(),
  meal_plan_id: z.number().nullable(), // Can be generated from meal plan or standalone
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type ShoppingList = z.infer<typeof shoppingListSchema>;

// Shopping list item schema
export const shoppingListItemSchema = z.object({
  id: z.number(),
  shopping_list_id: z.number(),
  ingredient_id: z.number().nullable(), // Linked to ingredient if applicable
  name: z.string(), // Free-form text for custom items
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  category: z.string().nullable(),
  is_purchased: z.boolean(),
  notes: z.string().nullable()
});

export type ShoppingListItem = z.infer<typeof shoppingListItemSchema>;

// Cooking session schema (for cooking mode)
export const cookingSessionSchema = z.object({
  id: z.number(),
  recipe_id: z.number(),
  started_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable(),
  current_step: z.number().int(),
  notes: z.string().nullable(),
  rating: z.number().int().nullable(), // 1-5 rating after completion
  created_at: z.coerce.date()
});

export type CookingSession = z.infer<typeof cookingSessionSchema>;

// Input schemas for creating entities

export const createIngredientInputSchema = z.object({
  name: z.string(),
  category: z.string().nullable(),
  unit: z.string()
});

export type CreateIngredientInput = z.infer<typeof createIngredientInputSchema>;

export const createRecipeInputSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  instructions: z.string(),
  prep_time: z.number().int().nullable(),
  cook_time: z.number().int().nullable(),
  servings: z.number().int().nullable(),
  difficulty: z.enum(['easy', 'medium', 'hard']).nullable(),
  cuisine: z.string().nullable(),
  tags: z.string().nullable(),
  image_url: z.string().nullable(),
  ingredients: z.array(z.object({
    ingredient_id: z.number(),
    quantity: z.number(),
    unit: z.string(),
    notes: z.string().nullable()
  }))
});

export type CreateRecipeInput = z.infer<typeof createRecipeInputSchema>;

export const createMealPlanInputSchema = z.object({
  name: z.string(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  description: z.string().nullable()
});

export type CreateMealPlanInput = z.infer<typeof createMealPlanInputSchema>;

export const createMealPlanEntryInputSchema = z.object({
  meal_plan_id: z.number(),
  recipe_id: z.number(),
  date: z.coerce.date(),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  servings: z.number().int(),
  notes: z.string().nullable()
});

export type CreateMealPlanEntryInput = z.infer<typeof createMealPlanEntryInputSchema>;

export const createShoppingListInputSchema = z.object({
  name: z.string(),
  meal_plan_id: z.number().nullable()
});

export type CreateShoppingListInput = z.infer<typeof createShoppingListInputSchema>;

export const createShoppingListItemInputSchema = z.object({
  shopping_list_id: z.number(),
  ingredient_id: z.number().nullable(),
  name: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  category: z.string().nullable(),
  notes: z.string().nullable()
});

export type CreateShoppingListItemInput = z.infer<typeof createShoppingListItemInputSchema>;

export const startCookingSessionInputSchema = z.object({
  recipe_id: z.number()
});

export type StartCookingSessionInput = z.infer<typeof startCookingSessionInputSchema>;

// Update schemas

export const updateRecipeInputSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  instructions: z.string().optional(),
  prep_time: z.number().int().nullable().optional(),
  cook_time: z.number().int().nullable().optional(),
  servings: z.number().int().nullable().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).nullable().optional(),
  cuisine: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  image_url: z.string().nullable().optional()
});

export type UpdateRecipeInput = z.infer<typeof updateRecipeInputSchema>;

export const updateCookingSessionInputSchema = z.object({
  id: z.number(),
  current_step: z.number().int().optional(),
  notes: z.string().nullable().optional(),
  rating: z.number().int().nullable().optional()
});

export type UpdateCookingSessionInput = z.infer<typeof updateCookingSessionInputSchema>;

export const updateShoppingListItemInputSchema = z.object({
  id: z.number(),
  is_purchased: z.boolean().optional(),
  quantity: z.number().nullable().optional(),
  notes: z.string().nullable().optional()
});

export type UpdateShoppingListItemInput = z.infer<typeof updateShoppingListItemInputSchema>;