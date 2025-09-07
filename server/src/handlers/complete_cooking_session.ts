import { db } from '../db';
import { cookingSessionsTable } from '../db/schema';
import { type CookingSession } from '../schema';
import { eq } from 'drizzle-orm';

export const completeCookingSession = async (id: number, rating?: number): Promise<CookingSession | null> => {
  try {
    // Update the cooking session to mark it as completed
    const updateData: { completed_at: Date; rating?: number } = {
      completed_at: new Date()
    };

    // Only include rating if it's provided and valid (1-5)
    if (rating !== undefined && rating >= 1 && rating <= 5) {
      updateData.rating = rating;
    }

    const result = await db.update(cookingSessionsTable)
      .set(updateData)
      .where(eq(cookingSessionsTable.id, id))
      .returning()
      .execute();

    // Return null if no session was found
    if (result.length === 0) {
      return null;
    }

    return result[0];
  } catch (error) {
    console.error('Cooking session completion failed:', error);
    throw error;
  }
};