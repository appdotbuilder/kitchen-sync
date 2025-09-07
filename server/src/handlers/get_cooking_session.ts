import { db } from '../db';
import { cookingSessionsTable } from '../db/schema';
import { type CookingSession } from '../schema';
import { eq } from 'drizzle-orm';

export const getCookingSession = async (id: number): Promise<CookingSession | null> => {
  try {
    const results = await db.select()
      .from(cookingSessionsTable)
      .where(eq(cookingSessionsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const session = results[0];
    return {
      ...session,
      // Convert numeric fields if any exist - in this case, all numeric fields are integers
      // so no conversion needed for quantity/rating as they're already integers
    };
  } catch (error) {
    console.error('Failed to fetch cooking session:', error);
    throw error;
  }
};