import { db } from '../db';
import { cookingSessionsTable, recipesTable } from '../db/schema';
import { type StartCookingSessionInput, type CookingSession } from '../schema';
import { eq } from 'drizzle-orm';

export const startCookingSession = async (input: StartCookingSessionInput): Promise<CookingSession> => {
  try {
    // First verify the recipe exists
    const recipe = await db.select()
      .from(recipesTable)
      .where(eq(recipesTable.id, input.recipe_id))
      .execute();

    if (recipe.length === 0) {
      throw new Error(`Recipe with id ${input.recipe_id} not found`);
    }

    // Create new cooking session
    const result = await db.insert(cookingSessionsTable)
      .values({
        recipe_id: input.recipe_id,
        current_step: 0 // Start at step 0 (beginning)
      })
      .returning()
      .execute();

    const session = result[0];
    
    return {
      ...session,
      // Convert timestamps to Date objects for consistent typing
      started_at: new Date(session.started_at),
      completed_at: session.completed_at ? new Date(session.completed_at) : null,
      created_at: new Date(session.created_at)
    };
  } catch (error) {
    console.error('Cooking session creation failed:', error);
    throw error;
  }
};