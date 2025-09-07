import { db } from '../db';
import { mealPlansTable, mealPlanEntriesTable, recipesTable } from '../db/schema';
import { type MealPlan, type MealPlanEntry } from '../schema';
import { eq, asc } from 'drizzle-orm';

export interface MealPlanWithEntries extends MealPlan {
    entries: (MealPlanEntry & { recipe_title: string })[];
}

export const getMealPlanDetails = async (id: number): Promise<MealPlanWithEntries | null> => {
    try {
        // First get the meal plan
        const mealPlanResults = await db.select()
            .from(mealPlansTable)
            .where(eq(mealPlansTable.id, id))
            .execute();

        if (mealPlanResults.length === 0) {
            return null;
        }

        const mealPlan = mealPlanResults[0];

        // Then get all entries with recipe titles, ordered by date and meal type
        const entriesResults = await db.select({
            // Meal plan entry fields
            id: mealPlanEntriesTable.id,
            meal_plan_id: mealPlanEntriesTable.meal_plan_id,
            recipe_id: mealPlanEntriesTable.recipe_id,
            date: mealPlanEntriesTable.date,
            meal_type: mealPlanEntriesTable.meal_type,
            servings: mealPlanEntriesTable.servings,
            notes: mealPlanEntriesTable.notes,
            // Recipe title
            recipe_title: recipesTable.title
        })
        .from(mealPlanEntriesTable)
        .innerJoin(recipesTable, eq(mealPlanEntriesTable.recipe_id, recipesTable.id))
        .where(eq(mealPlanEntriesTable.meal_plan_id, id))
        .orderBy(asc(mealPlanEntriesTable.date), asc(mealPlanEntriesTable.meal_type))
        .execute();

        // Combine the meal plan with its entries
        return {
            ...mealPlan,
            entries: entriesResults
        };
    } catch (error) {
        console.error('Failed to get meal plan details:', error);
        throw error;
    }
};