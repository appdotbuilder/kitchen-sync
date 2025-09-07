import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createIngredientInputSchema,
  createRecipeInputSchema,
  createMealPlanInputSchema,
  createMealPlanEntryInputSchema,
  createShoppingListInputSchema,
  createShoppingListItemInputSchema,
  startCookingSessionInputSchema,
  updateRecipeInputSchema,
  updateCookingSessionInputSchema,
  updateShoppingListItemInputSchema
} from './schema';

// Import handlers
import { createIngredient } from './handlers/create_ingredient';
import { getIngredients } from './handlers/get_ingredients';
import { createRecipe } from './handlers/create_recipe';
import { getRecipes } from './handlers/get_recipes';
import { getRecipeDetails } from './handlers/get_recipe_details';
import { updateRecipe } from './handlers/update_recipe';
import { createMealPlan } from './handlers/create_meal_plan';
import { getMealPlans } from './handlers/get_meal_plans';
import { createMealPlanEntry } from './handlers/create_meal_plan_entry';
import { getMealPlanDetails } from './handlers/get_meal_plan_details';
import { createShoppingList } from './handlers/create_shopping_list';
import { getShoppingLists } from './handlers/get_shopping_lists';
import { createShoppingListItem } from './handlers/create_shopping_list_item';
import { getShoppingListDetails } from './handlers/get_shopping_list_details';
import { updateShoppingListItem } from './handlers/update_shopping_list_item';
import { startCookingSession } from './handlers/start_cooking_session';
import { getCookingSession } from './handlers/get_cooking_session';
import { updateCookingSession } from './handlers/update_cooking_session';
import { completeCookingSession } from './handlers/complete_cooking_session';
import { generateShoppingListFromMealPlan } from './handlers/generate_shopping_list_from_meal_plan';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Ingredient routes
  createIngredient: publicProcedure
    .input(createIngredientInputSchema)
    .mutation(({ input }) => createIngredient(input)),
  
  getIngredients: publicProcedure
    .query(() => getIngredients()),

  // Recipe routes
  createRecipe: publicProcedure
    .input(createRecipeInputSchema)
    .mutation(({ input }) => createRecipe(input)),
  
  getRecipes: publicProcedure
    .query(() => getRecipes()),
  
  getRecipeDetails: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getRecipeDetails(input.id)),
  
  updateRecipe: publicProcedure
    .input(updateRecipeInputSchema)
    .mutation(({ input }) => updateRecipe(input)),

  // Meal plan routes
  createMealPlan: publicProcedure
    .input(createMealPlanInputSchema)
    .mutation(({ input }) => createMealPlan(input)),
  
  getMealPlans: publicProcedure
    .query(() => getMealPlans()),
  
  createMealPlanEntry: publicProcedure
    .input(createMealPlanEntryInputSchema)
    .mutation(({ input }) => createMealPlanEntry(input)),
  
  getMealPlanDetails: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getMealPlanDetails(input.id)),

  // Shopping list routes
  createShoppingList: publicProcedure
    .input(createShoppingListInputSchema)
    .mutation(({ input }) => createShoppingList(input)),
  
  getShoppingLists: publicProcedure
    .query(() => getShoppingLists()),
  
  createShoppingListItem: publicProcedure
    .input(createShoppingListItemInputSchema)
    .mutation(({ input }) => createShoppingListItem(input)),
  
  getShoppingListDetails: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getShoppingListDetails(input.id)),
  
  updateShoppingListItem: publicProcedure
    .input(updateShoppingListItemInputSchema)
    .mutation(({ input }) => updateShoppingListItem(input)),
  
  generateShoppingListFromMealPlan: publicProcedure
    .input(z.object({ 
      mealPlanId: z.number(),
      name: z.string()
    }))
    .mutation(({ input }) => generateShoppingListFromMealPlan(input.mealPlanId, input.name)),

  // Cooking session routes (cooking mode)
  startCookingSession: publicProcedure
    .input(startCookingSessionInputSchema)
    .mutation(({ input }) => startCookingSession(input)),
  
  getCookingSession: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getCookingSession(input.id)),
  
  updateCookingSession: publicProcedure
    .input(updateCookingSessionInputSchema)
    .mutation(({ input }) => updateCookingSession(input)),
  
  completeCookingSession: publicProcedure
    .input(z.object({ 
      id: z.number(),
      rating: z.number().int().min(1).max(5).optional()
    }))
    .mutation(({ input }) => completeCookingSession(input.id, input.rating)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();