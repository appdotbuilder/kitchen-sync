import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { mealPlansTable, recipesTable, mealPlanEntriesTable } from '../db/schema';
import { getMealPlanDetails } from '../handlers/get_meal_plan_details';

describe('getMealPlanDetails', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should return meal plan with entries and recipe titles', async () => {
        // Create test recipes
        const recipeResults = await db.insert(recipesTable)
            .values([
                {
                    title: 'Breakfast Recipe',
                    description: 'A healthy breakfast',
                    instructions: '["Step 1", "Step 2"]',
                    prep_time: 10,
                    cook_time: 5,
                    servings: 2
                },
                {
                    title: 'Lunch Recipe',
                    description: 'A nutritious lunch',
                    instructions: '["Step 1", "Step 2", "Step 3"]',
                    prep_time: 15,
                    cook_time: 20,
                    servings: 4
                }
            ])
            .returning()
            .execute();

        // Create test meal plan
        const mealPlanResults = await db.insert(mealPlansTable)
            .values({
                name: 'Weekly Plan',
                start_date: new Date('2024-01-01'),
                end_date: new Date('2024-01-07'),
                description: 'A week of healthy meals'
            })
            .returning()
            .execute();

        const mealPlanId = mealPlanResults[0].id;
        const breakfastRecipeId = recipeResults[0].id;
        const lunchRecipeId = recipeResults[1].id;

        // Create meal plan entries
        await db.insert(mealPlanEntriesTable)
            .values([
                {
                    meal_plan_id: mealPlanId,
                    recipe_id: breakfastRecipeId,
                    date: new Date('2024-01-01'),
                    meal_type: 'breakfast',
                    servings: 2,
                    notes: 'Start the week right'
                },
                {
                    meal_plan_id: mealPlanId,
                    recipe_id: lunchRecipeId,
                    date: new Date('2024-01-01'),
                    meal_type: 'lunch',
                    servings: 4,
                    notes: null
                },
                {
                    meal_plan_id: mealPlanId,
                    recipe_id: breakfastRecipeId,
                    date: new Date('2024-01-02'),
                    meal_type: 'breakfast',
                    servings: 2,
                    notes: null
                }
            ])
            .execute();

        const result = await getMealPlanDetails(mealPlanId);

        // Verify meal plan details
        expect(result).toBeDefined();
        expect(result!.id).toEqual(mealPlanId);
        expect(result!.name).toEqual('Weekly Plan');
        expect(result!.description).toEqual('A week of healthy meals');
        expect(result!.start_date).toBeInstanceOf(Date);
        expect(result!.end_date).toBeInstanceOf(Date);
        expect(result!.created_at).toBeInstanceOf(Date);
        expect(result!.updated_at).toBeInstanceOf(Date);

        // Verify entries are included with recipe titles
        expect(result!.entries).toHaveLength(3);
        
        // Check first entry (should be ordered by date, then meal type)
        const firstEntry = result!.entries[0];
        expect(firstEntry.meal_plan_id).toEqual(mealPlanId);
        expect(firstEntry.recipe_id).toEqual(breakfastRecipeId);
        expect(firstEntry.date).toBeInstanceOf(Date);
        expect(firstEntry.meal_type).toEqual('breakfast');
        expect(firstEntry.servings).toEqual(2);
        expect(firstEntry.notes).toEqual('Start the week right');
        expect(firstEntry.recipe_title).toEqual('Breakfast Recipe');

        // Check second entry
        const secondEntry = result!.entries[1];
        expect(secondEntry.recipe_title).toEqual('Lunch Recipe');
        expect(secondEntry.meal_type).toEqual('lunch');
        expect(secondEntry.servings).toEqual(4);
        expect(secondEntry.notes).toBeNull();

        // Check third entry
        const thirdEntry = result!.entries[2];
        expect(thirdEntry.recipe_title).toEqual('Breakfast Recipe');
        expect(thirdEntry.meal_type).toEqual('breakfast');
        expect(thirdEntry.date.getDate()).toEqual(2); // January 2nd
    });

    it('should return meal plan with empty entries array when no entries exist', async () => {
        // Create meal plan without entries
        const mealPlanResults = await db.insert(mealPlansTable)
            .values({
                name: 'Empty Plan',
                start_date: new Date('2024-01-01'),
                end_date: new Date('2024-01-07'),
                description: null
            })
            .returning()
            .execute();

        const result = await getMealPlanDetails(mealPlanResults[0].id);

        expect(result).toBeDefined();
        expect(result!.name).toEqual('Empty Plan');
        expect(result!.description).toBeNull();
        expect(result!.entries).toHaveLength(0);
    });

    it('should return null when meal plan does not exist', async () => {
        const result = await getMealPlanDetails(999);

        expect(result).toBeNull();
    });

    it('should handle meal plan with all meal types', async () => {
        // Create recipes for different meal types
        const recipeResults = await db.insert(recipesTable)
            .values([
                { title: 'Breakfast', instructions: '[]' },
                { title: 'Lunch', instructions: '[]' },
                { title: 'Dinner', instructions: '[]' },
                { title: 'Snack', instructions: '[]' }
            ])
            .returning()
            .execute();

        // Create meal plan
        const mealPlanResults = await db.insert(mealPlansTable)
            .values({
                name: 'Full Day Plan',
                start_date: new Date('2024-01-01'),
                end_date: new Date('2024-01-01')
            })
            .returning()
            .execute();

        const mealPlanId = mealPlanResults[0].id;

        // Create entries for all meal types on same day
        await db.insert(mealPlanEntriesTable)
            .values([
                {
                    meal_plan_id: mealPlanId,
                    recipe_id: recipeResults[0].id,
                    date: new Date('2024-01-01'),
                    meal_type: 'breakfast',
                    servings: 1
                },
                {
                    meal_plan_id: mealPlanId,
                    recipe_id: recipeResults[1].id,
                    date: new Date('2024-01-01'),
                    meal_type: 'lunch',
                    servings: 1
                },
                {
                    meal_plan_id: mealPlanId,
                    recipe_id: recipeResults[2].id,
                    date: new Date('2024-01-01'),
                    meal_type: 'dinner',
                    servings: 1
                },
                {
                    meal_plan_id: mealPlanId,
                    recipe_id: recipeResults[3].id,
                    date: new Date('2024-01-01'),
                    meal_type: 'snack',
                    servings: 1
                }
            ])
            .execute();

        const result = await getMealPlanDetails(mealPlanId);

        expect(result!.entries).toHaveLength(4);
        
        // Verify entries are ordered by meal type (breakfast, lunch, dinner, snack)
        expect(result!.entries[0].meal_type).toEqual('breakfast');
        expect(result!.entries[0].recipe_title).toEqual('Breakfast');
        expect(result!.entries[1].meal_type).toEqual('lunch');
        expect(result!.entries[1].recipe_title).toEqual('Lunch');
        expect(result!.entries[2].meal_type).toEqual('dinner');
        expect(result!.entries[2].recipe_title).toEqual('Dinner');
        expect(result!.entries[3].meal_type).toEqual('snack');
        expect(result!.entries[3].recipe_title).toEqual('Snack');
    });

    it('should handle meal plan with entries across multiple dates', async () => {
        // Create a recipe
        const recipeResults = await db.insert(recipesTable)
            .values({
                title: 'Daily Recipe',
                instructions: '[]'
            })
            .returning()
            .execute();

        // Create meal plan
        const mealPlanResults = await db.insert(mealPlansTable)
            .values({
                name: 'Multi-Day Plan',
                start_date: new Date('2024-01-01'),
                end_date: new Date('2024-01-03')
            })
            .returning()
            .execute();

        const mealPlanId = mealPlanResults[0].id;
        const recipeId = recipeResults[0].id;

        // Create entries across multiple dates
        await db.insert(mealPlanEntriesTable)
            .values([
                {
                    meal_plan_id: mealPlanId,
                    recipe_id: recipeId,
                    date: new Date('2024-01-03'),
                    meal_type: 'dinner',
                    servings: 1
                },
                {
                    meal_plan_id: mealPlanId,
                    recipe_id: recipeId,
                    date: new Date('2024-01-01'),
                    meal_type: 'breakfast',
                    servings: 1
                },
                {
                    meal_plan_id: mealPlanId,
                    recipe_id: recipeId,
                    date: new Date('2024-01-02'),
                    meal_type: 'lunch',
                    servings: 1
                }
            ])
            .execute();

        const result = await getMealPlanDetails(mealPlanId);

        expect(result!.entries).toHaveLength(3);
        
        // Verify entries are ordered by date first
        expect(result!.entries[0].date.getDate()).toEqual(1); // January 1st
        expect(result!.entries[0].meal_type).toEqual('breakfast');
        expect(result!.entries[1].date.getDate()).toEqual(2); // January 2nd
        expect(result!.entries[1].meal_type).toEqual('lunch');
        expect(result!.entries[2].date.getDate()).toEqual(3); // January 3rd
        expect(result!.entries[2].meal_type).toEqual('dinner');
    });
});