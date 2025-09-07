import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, Plus, Clock, Users, ShoppingCart, Eye, Utensils } from 'lucide-react';
import { trpc } from '@/utils/trpc';

import type { MealPlan, Recipe, CreateMealPlanInput, CreateMealPlanEntryInput, MealPlanEntry } from '../../../server/src/schema';

interface MealPlanManagerProps {
  mealPlans: MealPlan[];
  recipes: Recipe[];
  onMealPlanUpdate: () => void;
  onShoppingListGenerated: () => void;
}

interface MealPlanWithEntries extends MealPlan {
  entries?: Array<MealPlanEntry & { recipe?: Recipe }>;
}

export function MealPlanManager({ 
  mealPlans, 
  recipes, 
  onMealPlanUpdate, 
  onShoppingListGenerated 
}: MealPlanManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAddMealDialogOpen, setIsAddMealDialogOpen] = useState(false);
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlanWithEntries | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingList, setIsGeneratingList] = useState(false);

  const [formData, setFormData] = useState<CreateMealPlanInput>({
    name: '',
    start_date: new Date(),
    end_date: new Date(),
    description: null
  });

  const [mealFormData, setMealFormData] = useState<CreateMealPlanEntryInput>({
    meal_plan_id: 0,
    recipe_id: 0,
    date: new Date(),
    meal_type: 'breakfast',
    servings: 1,
    notes: null
  });

  const resetForm = () => {
    const today = new Date();
    const weekLater = new Date();
    weekLater.setDate(today.getDate() + 7);
    
    setFormData({
      name: '',
      start_date: today,
      end_date: weekLater,
      description: null
    });
  };

  const resetMealForm = () => {
    setMealFormData({
      meal_plan_id: 0,
      recipe_id: 0,
      date: new Date(),
      meal_type: 'breakfast',
      servings: 1,
      notes: null
    });
  };

  const handleCreateMealPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setIsLoading(true);
    try {
      await trpc.createMealPlan.mutate(formData);
      onMealPlanUpdate();
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create meal plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealFormData.recipe_id || !mealFormData.meal_plan_id) return;

    setIsLoading(true);
    try {
      await trpc.createMealPlanEntry.mutate(mealFormData);
      // Refresh meal plan details
      if (selectedMealPlan) {
        await loadMealPlanDetails(selectedMealPlan.id);
      }
      setIsAddMealDialogOpen(false);
      resetMealForm();
    } catch (error) {
      console.error('Failed to add meal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMealPlanDetails = useCallback(async (mealPlanId: number) => {
    try {
      const details = await trpc.getMealPlanDetails.query({ id: mealPlanId });
      setSelectedMealPlan(details as MealPlanWithEntries);
    } catch (error) {
      console.error('Failed to load meal plan details:', error);
    }
  }, []);

  const viewMealPlanDetails = async (mealPlan: MealPlan) => {
    await loadMealPlanDetails(mealPlan.id);
    setIsDetailsDialogOpen(true);
  };

  const generateShoppingList = async (mealPlan: MealPlan) => {
    setIsGeneratingList(true);
    try {
      await trpc.generateShoppingListFromMealPlan.mutate({
        mealPlanId: mealPlan.id,
        name: `Shopping for ${mealPlan.name}`
      });
      onShoppingListGenerated();
    } catch (error) {
      console.error('Failed to generate shopping list:', error);
    } finally {
      setIsGeneratingList(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  };

  const getMealTypeColor = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return 'bg-yellow-100 text-yellow-800';
      case 'lunch': return 'bg-blue-100 text-blue-800';
      case 'dinner': return 'bg-purple-100 text-purple-800';
      case 'snack': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMealTypeEmoji = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return '🥐';
      case 'lunch': return '🥗';
      case 'dinner': return '🍽️';
      case 'snack': return '🍎';
      default: return '🍴';
    }
  };

  // Group entries by date
  const groupEntriesByDate = (entries: Array<MealPlanEntry & { recipe?: Recipe }>) => {
    return entries.reduce((groups, entry) => {
      const date = formatDate(entry.date);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
      return groups;
    }, {} as Record<string, Array<MealPlanEntry & { recipe?: Recipe }>>);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-500" />
            Meal Planning 📅
          </h2>
          <p className="text-gray-600">Plan your weekly meals and generate shopping lists</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-500 hover:bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              New Meal Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Meal Plan</DialogTitle>
              <DialogDescription>
                Plan your meals for the week ahead
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateMealPlan} className="space-y-4">
              <div>
                <Label htmlFor="name">Plan Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateMealPlanInput) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Week of March 15th..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date.toISOString().split('T')[0]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateMealPlanInput) => ({ ...prev, start_date: new Date(e.target.value) }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date.toISOString().split('T')[0]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateMealPlanInput) => ({ ...prev, end_date: new Date(e.target.value) }))
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateMealPlanInput) => ({ ...prev, description: e.target.value || null }))
                  }
                  placeholder="Special diet, occasions, notes..."
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !formData.name}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {isLoading ? 'Creating...' : 'Create Plan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Meal Plans Grid */}
      {mealPlans.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg text-gray-600 mb-2">No meal plans yet</p>
              <p className="text-sm text-gray-500">Create your first meal plan to get organized! 🍽️</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mealPlans.map((mealPlan: MealPlan) => (
            <Card key={mealPlan.id} className="hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{mealPlan.name}</span>
                  <Badge variant="outline">
                    {formatDate(mealPlan.start_date)} - {formatDate(mealPlan.end_date)}
                  </Badge>
                </CardTitle>
                {mealPlan.description && (
                  <CardDescription>{mealPlan.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  <div>Duration: {Math.ceil((new Date(mealPlan.end_date).getTime() - new Date(mealPlan.start_date).getTime()) / (1000 * 60 * 60 * 24))} days</div>
                  <div>Created: {formatDate(mealPlan.created_at)}</div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => viewMealPlanDetails(mealPlan)}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  onClick={() => generateShoppingList(mealPlan)}
                  disabled={isGeneratingList}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  {isGeneratingList ? 'Generating...' : 'Shop List'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Meal Plan Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedMealPlan && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle>{selectedMealPlan.name}</DialogTitle>
                    <DialogDescription>
                      {formatDate(selectedMealPlan.start_date)} - {formatDate(selectedMealPlan.end_date)}
                      {selectedMealPlan.description && (
                        <span className="block mt-1">{selectedMealPlan.description}</span>
                      )}
                    </DialogDescription>
                  </div>
                  <Dialog open={isAddMealDialogOpen} onOpenChange={setIsAddMealDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        className="bg-blue-500 hover:bg-blue-600"
                        onClick={() => setMealFormData(prev => ({ ...prev, meal_plan_id: selectedMealPlan.id }))}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Meal
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Meal to Plan</DialogTitle>
                        <DialogDescription>
                          Schedule a recipe for this meal plan
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddMeal} className="space-y-4">
                        <div>
                          <Label htmlFor="recipe">Recipe *</Label>
                          <Select
                            value={mealFormData.recipe_id ? mealFormData.recipe_id.toString() : ''}
                            onValueChange={(value) =>
                              setMealFormData((prev: CreateMealPlanEntryInput) => ({ ...prev, recipe_id: parseInt(value) }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a recipe" />
                            </SelectTrigger>
                            <SelectContent>
                              {recipes.map((recipe: Recipe) => (
                                <SelectItem key={recipe.id} value={recipe.id.toString()}>
                                  {recipe.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="date">Date *</Label>
                            <Input
                              id="date"
                              type="date"
                              value={mealFormData.date.toISOString().split('T')[0]}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setMealFormData((prev: CreateMealPlanEntryInput) => ({ ...prev, date: new Date(e.target.value) }))
                              }
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="meal_type">Meal Type *</Label>
                            <Select
                              value={mealFormData.meal_type}
                              onValueChange={(value) =>
                                setMealFormData((prev: CreateMealPlanEntryInput) => ({ 
                                  ...prev, 
                                  meal_type: value as 'breakfast' | 'lunch' | 'dinner' | 'snack'
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="breakfast">🥐 Breakfast</SelectItem>
                                <SelectItem value="lunch">🥗 Lunch</SelectItem>
                                <SelectItem value="dinner">🍽️ Dinner</SelectItem>
                                <SelectItem value="snack">🍎 Snack</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="servings">Servings *</Label>
                          <Input
                            id="servings"
                            type="number"
                            value={mealFormData.servings}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setMealFormData((prev: CreateMealPlanEntryInput) => ({ ...prev, servings: parseInt(e.target.value) || 1 }))
                            }
                            min="1"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="notes">Notes</Label>
                          <Textarea
                            id="notes"
                            value={mealFormData.notes || ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                              setMealFormData((prev: CreateMealPlanEntryInput) => ({ ...prev, notes: e.target.value || null }))
                            }
                            placeholder="Special preparations, dietary notes..."
                          />
                        </div>

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsAddMealDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={isLoading || !mealFormData.recipe_id}
                            className="bg-blue-500 hover:bg-blue-600"
                          >
                            {isLoading ? 'Adding...' : 'Add Meal'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {selectedMealPlan.entries && selectedMealPlan.entries.length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(groupEntriesByDate(selectedMealPlan.entries)).map(([date, entries]) => (
                      <div key={date}>
                        <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          {date}
                        </h4>
                        <div className="grid gap-3">
                          {entries.map((entry) => (
                            <Card key={entry.id} className="bg-gray-50">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Badge className={getMealTypeColor(entry.meal_type)}>
                                      {getMealTypeEmoji(entry.meal_type)} {entry.meal_type}
                                    </Badge>
                                    <span className="font-medium">
                                      {entry.recipe?.title || 'Unknown Recipe'}
                                    </span>
                                    <div className="flex items-center gap-1 text-sm text-gray-600">
                                      <Users className="w-4 h-4" />
                                      {entry.servings}
                                    </div>
                                  </div>
                                  {entry.recipe && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      {entry.recipe.prep_time && (
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          {entry.recipe.prep_time}m prep
                                        </div>
                                      )}
                                      {entry.recipe.cook_time && (
                                        <div className="flex items-center gap-1">
                                          <Utensils className="w-3 h-3" />
                                          {entry.recipe.cook_time}m cook
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {entry.notes && (
                                  <p className="text-sm text-gray-600 mt-2 italic">{entry.notes}</p>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-2">No meals planned yet</p>
                    <p className="text-sm text-gray-500">Add some meals to get started!</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  onClick={() => generateShoppingList(selectedMealPlan)}
                  disabled={isGeneratingList}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {isGeneratingList ? 'Generating...' : 'Generate Shopping List'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}