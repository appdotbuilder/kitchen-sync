import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  integer, 
  boolean, 
  pgEnum,
  real
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const difficultyEnum = pgEnum('difficulty', ['easy', 'medium', 'hard']);
export const mealTypeEnum = pgEnum('meal_type', ['breakfast', 'lunch', 'dinner', 'snack']);

// Ingredients table
export const ingredientsTable = pgTable('ingredients', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category'), // Nullable by default
  unit: text('unit').notNull(), // Default unit for this ingredient
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Recipes table
export const recipesTable = pgTable('recipes', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'), // Nullable
  instructions: text('instructions').notNull(), // JSON string of steps
  prep_time: integer('prep_time'), // in minutes, nullable
  cook_time: integer('cook_time'), // in minutes, nullable
  servings: integer('servings'), // nullable
  difficulty: difficultyEnum('difficulty'), // nullable
  cuisine: text('cuisine'), // nullable
  tags: text('tags'), // JSON array of tags, nullable
  image_url: text('image_url'), // nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Recipe ingredients junction table
export const recipeIngredientsTable = pgTable('recipe_ingredients', {
  id: serial('id').primaryKey(),
  recipe_id: integer('recipe_id').notNull().references(() => recipesTable.id, { onDelete: 'cascade' }),
  ingredient_id: integer('ingredient_id').notNull().references(() => ingredientsTable.id, { onDelete: 'cascade' }),
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(),
  notes: text('notes') // nullable - e.g., "finely chopped"
});

// Meal plans table
export const mealPlansTable = pgTable('meal_plans', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  description: text('description'), // nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Meal plan entries table (individual meals within a plan)
export const mealPlanEntriesTable = pgTable('meal_plan_entries', {
  id: serial('id').primaryKey(),
  meal_plan_id: integer('meal_plan_id').notNull().references(() => mealPlansTable.id, { onDelete: 'cascade' }),
  recipe_id: integer('recipe_id').notNull().references(() => recipesTable.id, { onDelete: 'cascade' }),
  date: timestamp('date').notNull(),
  meal_type: mealTypeEnum('meal_type').notNull(),
  servings: integer('servings').notNull(),
  notes: text('notes') // nullable
});

// Shopping lists table
export const shoppingListsTable = pgTable('shopping_lists', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  meal_plan_id: integer('meal_plan_id').references(() => mealPlansTable.id, { onDelete: 'set null' }), // nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Shopping list items table
export const shoppingListItemsTable = pgTable('shopping_list_items', {
  id: serial('id').primaryKey(),
  shopping_list_id: integer('shopping_list_id').notNull().references(() => shoppingListsTable.id, { onDelete: 'cascade' }),
  ingredient_id: integer('ingredient_id').references(() => ingredientsTable.id, { onDelete: 'set null' }), // nullable
  name: text('name').notNull(), // Free-form text for custom items
  quantity: real('quantity'), // nullable
  unit: text('unit'), // nullable
  category: text('category'), // nullable
  is_purchased: boolean('is_purchased').default(false).notNull(),
  notes: text('notes') // nullable
});

// Cooking sessions table (for cooking mode)
export const cookingSessionsTable = pgTable('cooking_sessions', {
  id: serial('id').primaryKey(),
  recipe_id: integer('recipe_id').notNull().references(() => recipesTable.id, { onDelete: 'cascade' }),
  started_at: timestamp('started_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'), // nullable
  current_step: integer('current_step').default(0).notNull(),
  notes: text('notes'), // nullable
  rating: integer('rating'), // 1-5 rating after completion, nullable
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const ingredientsRelations = relations(ingredientsTable, ({ many }) => ({
  recipeIngredients: many(recipeIngredientsTable),
  shoppingListItems: many(shoppingListItemsTable)
}));

export const recipesRelations = relations(recipesTable, ({ many }) => ({
  recipeIngredients: many(recipeIngredientsTable),
  mealPlanEntries: many(mealPlanEntriesTable),
  cookingSessions: many(cookingSessionsTable)
}));

export const recipeIngredientsRelations = relations(recipeIngredientsTable, ({ one }) => ({
  recipe: one(recipesTable, {
    fields: [recipeIngredientsTable.recipe_id],
    references: [recipesTable.id]
  }),
  ingredient: one(ingredientsTable, {
    fields: [recipeIngredientsTable.ingredient_id],
    references: [ingredientsTable.id]
  })
}));

export const mealPlansRelations = relations(mealPlansTable, ({ many }) => ({
  entries: many(mealPlanEntriesTable),
  shoppingLists: many(shoppingListsTable)
}));

export const mealPlanEntriesRelations = relations(mealPlanEntriesTable, ({ one }) => ({
  mealPlan: one(mealPlansTable, {
    fields: [mealPlanEntriesTable.meal_plan_id],
    references: [mealPlansTable.id]
  }),
  recipe: one(recipesTable, {
    fields: [mealPlanEntriesTable.recipe_id],
    references: [recipesTable.id]
  })
}));

export const shoppingListsRelations = relations(shoppingListsTable, ({ one, many }) => ({
  mealPlan: one(mealPlansTable, {
    fields: [shoppingListsTable.meal_plan_id],
    references: [mealPlansTable.id]
  }),
  items: many(shoppingListItemsTable)
}));

export const shoppingListItemsRelations = relations(shoppingListItemsTable, ({ one }) => ({
  shoppingList: one(shoppingListsTable, {
    fields: [shoppingListItemsTable.shopping_list_id],
    references: [shoppingListsTable.id]
  }),
  ingredient: one(ingredientsTable, {
    fields: [shoppingListItemsTable.ingredient_id],
    references: [ingredientsTable.id]
  })
}));

export const cookingSessionsRelations = relations(cookingSessionsTable, ({ one }) => ({
  recipe: one(recipesTable, {
    fields: [cookingSessionsTable.recipe_id],
    references: [recipesTable.id]
  })
}));

// TypeScript types for the table schemas
export type Ingredient = typeof ingredientsTable.$inferSelect;
export type NewIngredient = typeof ingredientsTable.$inferInsert;

export type Recipe = typeof recipesTable.$inferSelect;
export type NewRecipe = typeof recipesTable.$inferInsert;

export type RecipeIngredient = typeof recipeIngredientsTable.$inferSelect;
export type NewRecipeIngredient = typeof recipeIngredientsTable.$inferInsert;

export type MealPlan = typeof mealPlansTable.$inferSelect;
export type NewMealPlan = typeof mealPlansTable.$inferInsert;

export type MealPlanEntry = typeof mealPlanEntriesTable.$inferSelect;
export type NewMealPlanEntry = typeof mealPlanEntriesTable.$inferInsert;

export type ShoppingList = typeof shoppingListsTable.$inferSelect;
export type NewShoppingList = typeof shoppingListsTable.$inferInsert;

export type ShoppingListItem = typeof shoppingListItemsTable.$inferSelect;
export type NewShoppingListItem = typeof shoppingListItemsTable.$inferInsert;

export type CookingSession = typeof cookingSessionsTable.$inferSelect;
export type NewCookingSession = typeof cookingSessionsTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  ingredients: ingredientsTable,
  recipes: recipesTable,
  recipeIngredients: recipeIngredientsTable,
  mealPlans: mealPlansTable,
  mealPlanEntries: mealPlanEntriesTable,
  shoppingLists: shoppingListsTable,
  shoppingListItems: shoppingListItemsTable,
  cookingSessions: cookingSessionsTable
};