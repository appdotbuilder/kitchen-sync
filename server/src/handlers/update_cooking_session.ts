import { db } from '../db';
import { cookingSessionsTable } from '../db/schema';
import { type UpdateCookingSessionInput, type CookingSession } from '../schema';
import { eq } from 'drizzle-orm';

export const updateCookingSession = async (input: UpdateCookingSessionInput): Promise<CookingSession | null> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date() // Always update the timestamp
    };

    if (input.current_step !== undefined) {
      updateData.current_step = input.current_step;
    }

    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    if (input.rating !== undefined) {
      updateData.rating = input.rating;
      // If rating is provided, mark session as completed
      updateData.completed_at = new Date();
    }

    // Update the cooking session
    const result = await db.update(cookingSessionsTable)
      .set(updateData)
      .where(eq(cookingSessionsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      return null; // Session not found
    }

    return result[0];
  } catch (error) {
    console.error('Cooking session update failed:', error);
    throw error;
  }
};