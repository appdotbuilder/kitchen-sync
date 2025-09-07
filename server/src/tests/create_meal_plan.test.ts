import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { mealPlansTable } from '../db/schema';
import { type CreateMealPlanInput } from '../schema';
import { createMealPlan } from '../handlers/create_meal_plan';
import { eq, gte, lte, between, and } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateMealPlanInput = {
  name: 'Weekly Meal Plan',
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-01-07'),
  description: 'A test meal plan for the week'
};

describe('createMealPlan', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a meal plan with all fields', async () => {
    const result = await createMealPlan(testInput);

    // Basic field validation
    expect(result.name).toEqual('Weekly Meal Plan');
    expect(result.start_date).toEqual(testInput.start_date);
    expect(result.end_date).toEqual(testInput.end_date);
    expect(result.description).toEqual('A test meal plan for the week');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a meal plan with null description', async () => {
    const inputWithNullDescription: CreateMealPlanInput = {
      name: 'Simple Meal Plan',
      start_date: new Date('2024-02-01'),
      end_date: new Date('2024-02-07'),
      description: null
    };

    const result = await createMealPlan(inputWithNullDescription);

    expect(result.name).toEqual('Simple Meal Plan');
    expect(result.description).toBeNull();
    expect(result.start_date).toEqual(inputWithNullDescription.start_date);
    expect(result.end_date).toEqual(inputWithNullDescription.end_date);
    expect(result.id).toBeDefined();
  });

  it('should save meal plan to database', async () => {
    const result = await createMealPlan(testInput);

    // Query using proper drizzle syntax
    const mealPlans = await db.select()
      .from(mealPlansTable)
      .where(eq(mealPlansTable.id, result.id))
      .execute();

    expect(mealPlans).toHaveLength(1);
    expect(mealPlans[0].name).toEqual('Weekly Meal Plan');
    expect(mealPlans[0].description).toEqual('A test meal plan for the week');
    expect(mealPlans[0].start_date).toEqual(testInput.start_date);
    expect(mealPlans[0].end_date).toEqual(testInput.end_date);
    expect(mealPlans[0].created_at).toBeInstanceOf(Date);
    expect(mealPlans[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle date range queries correctly', async () => {
    // Create test meal plans with different date ranges
    const plan1 = await createMealPlan({
      name: 'January Plan',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      description: null
    });

    const plan2 = await createMealPlan({
      name: 'February Plan',
      start_date: new Date('2024-02-01'),
      end_date: new Date('2024-02-29'),
      description: null
    });

    // Query meal plans that start in January
    const januaryPlans = await db.select()
      .from(mealPlansTable)
      .where(
        between(mealPlansTable.start_date, new Date('2024-01-01'), new Date('2024-01-31'))
      )
      .execute();

    expect(januaryPlans).toHaveLength(1);
    expect(januaryPlans[0].name).toEqual('January Plan');
    expect(januaryPlans[0].start_date >= new Date('2024-01-01')).toBe(true);
  });

  it('should create multiple meal plans with unique IDs', async () => {
    const plan1 = await createMealPlan({
      name: 'Plan 1',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-07'),
      description: 'First plan'
    });

    const plan2 = await createMealPlan({
      name: 'Plan 2',
      start_date: new Date('2024-01-08'),
      end_date: new Date('2024-01-14'),
      description: 'Second plan'
    });

    expect(plan1.id).toBeDefined();
    expect(plan2.id).toBeDefined();
    expect(plan1.id).not.toEqual(plan2.id);

    // Verify both plans exist in database
    const allPlans = await db.select()
      .from(mealPlansTable)
      .execute();

    expect(allPlans).toHaveLength(2);
    expect(allPlans.map(p => p.name)).toContain('Plan 1');
    expect(allPlans.map(p => p.name)).toContain('Plan 2');
  });

  it('should handle overlapping date ranges', async () => {
    const overlappingPlan1 = await createMealPlan({
      name: 'Overlapping Plan 1',
      start_date: new Date('2024-03-01'),
      end_date: new Date('2024-03-15'),
      description: null
    });

    const overlappingPlan2 = await createMealPlan({
      name: 'Overlapping Plan 2',
      start_date: new Date('2024-03-10'),
      end_date: new Date('2024-03-25'),
      description: null
    });

    // Both should be created successfully (no uniqueness constraint on dates)
    expect(overlappingPlan1.id).toBeDefined();
    expect(overlappingPlan2.id).toBeDefined();

    // Query plans that contain a specific date (overlapping plans)
    const targetDate = new Date('2024-03-12');
    const overlappingPlans = await db.select()
      .from(mealPlansTable)
      .where(
        and(
          lte(mealPlansTable.start_date, targetDate),
          gte(mealPlansTable.end_date, targetDate)
        )
      )
      .execute();

    expect(overlappingPlans.length).toBeGreaterThanOrEqual(2);
  });
});