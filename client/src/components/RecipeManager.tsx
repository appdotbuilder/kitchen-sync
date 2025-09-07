import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, Clock, Users, ChefHat, Edit, Play } from 'lucide-react';
import { trpc } from '@/utils/trpc';

import type { Recipe, Ingredient, CreateRecipeInput } from '../../../server/src/schema';

interface RecipeManagerProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  onRecipeUpdate: () => void;
  onStartCooking: (recipe: Recipe) => void;
}

export function RecipeManager({ recipes, ingredients, onRecipeUpdate, onStartCooking }: RecipeManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<CreateRecipeInput>({
    title: '',
    description: null,
    instructions: '',
    prep_time: null,
    cook_time: null,
    servings: null,
    difficulty: null,
    cuisine: null,
    tags: null,
    image_url: null,
    ingredients: []
  });

  const [recipeIngredient, setRecipeIngredient] = useState({
    ingredient_id: 0,
    quantity: 0,
    unit: '',
    notes: null as string | null
  });

  // Filter recipes based on search
  const filteredRecipes = recipes.filter(recipe =>
    recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (recipe.description && recipe.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (recipe.cuisine && recipe.cuisine.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetForm = () => {
    setFormData({
      title: '',
      description: null,
      instructions: '',
      prep_time: null,
      cook_time: null,
      servings: null,
      difficulty: null,
      cuisine: null,
      tags: null,
      image_url: null,
      ingredients: []
    });
    setRecipeIngredient({
      ingredient_id: 0,
      quantity: 0,
      unit: '',
      notes: null
    });
  };

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || formData.ingredients.length === 0) return;

    setIsLoading(true);
    try {
      await trpc.createRecipe.mutate(formData);
      onRecipeUpdate();
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create recipe:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addIngredientToRecipe = () => {
    if (recipeIngredient.ingredient_id && recipeIngredient.quantity && recipeIngredient.unit) {
      setFormData((prev: CreateRecipeInput) => ({
        ...prev,
        ingredients: [...prev.ingredients, recipeIngredient]
      }));
      setRecipeIngredient({
        ingredient_id: 0,
        quantity: 0,
        unit: '',
        notes: null
      });
    }
  };

  const removeIngredientFromRecipe = (index: number) => {
    setFormData((prev: CreateRecipeInput) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const viewRecipeDetails = async (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsDetailsDialogOpen(true);
  };

  const getDifficultyBadgeColor = (difficulty: string | null) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const parseTags = (tags: string | null): string[] => {
    if (!tags) return [];
    try {
      return JSON.parse(tags);
    } catch {
      return [];
    }
  };

  const parseInstructions = (instructions: string): string[] => {
    try {
      return JSON.parse(instructions);
    } catch {
      return [instructions];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-orange-500" />
            Recipe Collection 📚
          </h2>
          <p className="text-gray-600">Manage your delicious recipes</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Recipe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Recipe</DialogTitle>
              <DialogDescription>
                Add a new recipe to your collection
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateRecipe} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Recipe Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateRecipeInput) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Delicious pasta..."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cuisine">Cuisine</Label>
                  <Input
                    id="cuisine"
                    value={formData.cuisine || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateRecipeInput) => ({ ...prev, cuisine: e.target.value || null }))
                    }
                    placeholder="Italian, Chinese..."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateRecipeInput) => ({ ...prev, description: e.target.value || null }))
                  }
                  placeholder="Brief description of the recipe..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="prep_time">Prep Time (min)</Label>
                  <Input
                    id="prep_time"
                    type="number"
                    value={formData.prep_time || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateRecipeInput) => ({ ...prev, prep_time: parseInt(e.target.value) || null }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="cook_time">Cook Time (min)</Label>
                  <Input
                    id="cook_time"
                    type="number"
                    value={formData.cook_time || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateRecipeInput) => ({ ...prev, cook_time: parseInt(e.target.value) || null }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="servings">Servings</Label>
                  <Input
                    id="servings"
                    type="number"
                    value={formData.servings || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateRecipeInput) => ({ ...prev, servings: parseInt(e.target.value) || null }))
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={formData.difficulty || 'easy'}
                  onValueChange={(value) =>
                    setFormData((prev: CreateRecipeInput) => ({ ...prev, difficulty: value as 'easy' | 'medium' | 'hard' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy 😊</SelectItem>
                    <SelectItem value="medium">Medium 🤔</SelectItem>
                    <SelectItem value="hard">Hard 😅</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="instructions">Instructions *</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateRecipeInput) => ({ ...prev, instructions: e.target.value }))
                  }
                  placeholder="Step-by-step cooking instructions..."
                  className="min-h-[100px]"
                  required
                />
              </div>

              {/* Ingredients Section */}
              <div>
                <Label>Ingredients *</Label>
                <div className="border rounded-md p-4 space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    <Select
                      value={recipeIngredient.ingredient_id.toString()}
                      onValueChange={(value) =>
                        setRecipeIngredient(prev => ({ ...prev, ingredient_id: parseInt(value) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Ingredient" />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredients.map((ingredient: Ingredient) => (
                          <SelectItem key={ingredient.id} value={ingredient.id.toString()}>
                            {ingredient.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={recipeIngredient.quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRecipeIngredient(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))
                      }
                      placeholder="Qty"
                    />
                    <Input
                      value={recipeIngredient.unit}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRecipeIngredient(prev => ({ ...prev, unit: e.target.value }))
                      }
                      placeholder="Unit"
                    />
                    <Button type="button" onClick={addIngredientToRecipe} size="sm">
                      Add
                    </Button>
                  </div>

                  {formData.ingredients.length > 0 && (
                    <div className="space-y-2">
                      {formData.ingredients.map((ing, index) => {
                        const ingredient = ingredients.find(i => i.id === ing.ingredient_id);
                        return (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span>
                              {ingredient?.name} - {ing.quantity} {ing.unit}
                              {ing.notes && <span className="text-gray-500 ml-2">({ing.notes})</span>}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeIngredientFromRecipe(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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
                  disabled={isLoading || !formData.title || formData.ingredients.length === 0}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {isLoading ? 'Creating...' : 'Create Recipe'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search recipes... 🔍"
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Recipes Grid */}
      {filteredRecipes.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg text-gray-600 mb-2">
                {searchTerm ? 'No recipes found' : 'No recipes yet'}
              </p>
              <p className="text-sm text-gray-500">
                {searchTerm ? 'Try a different search term' : 'Create your first recipe to get started! 🍳'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe: Recipe) => (
            <Card key={recipe.id} className="hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{recipe.title}</CardTitle>
                  {recipe.difficulty && (
                    <Badge className={getDifficultyBadgeColor(recipe.difficulty)}>
                      {recipe.difficulty}
                    </Badge>
                  )}
                </div>
                {recipe.description && (
                  <CardDescription className="line-clamp-2">
                    {recipe.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  {recipe.prep_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Prep: {recipe.prep_time}m
                    </div>
                  )}
                  {recipe.cook_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Cook: {recipe.cook_time}m
                    </div>
                  )}
                </div>
                {recipe.servings && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    Serves {recipe.servings}
                  </div>
                )}
                {recipe.cuisine && (
                  <Badge variant="outline">{recipe.cuisine}</Badge>
                )}
                <div className="flex flex-wrap gap-1">
                  {parseTags(recipe.tags).slice(0, 3).map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => viewRecipeDetails(recipe)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  onClick={() => onStartCooking(recipe)}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Cook
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Recipe Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedRecipe && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedRecipe.title}
                  {selectedRecipe.difficulty && (
                    <Badge className={getDifficultyBadgeColor(selectedRecipe.difficulty)}>
                      {selectedRecipe.difficulty}
                    </Badge>
                  )}
                </DialogTitle>
                {selectedRecipe.description && (
                  <DialogDescription>{selectedRecipe.description}</DialogDescription>
                )}
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  {selectedRecipe.prep_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Prep: {selectedRecipe.prep_time}m
                    </div>
                  )}
                  {selectedRecipe.cook_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Cook: {selectedRecipe.cook_time}m
                    </div>
                  )}
                  {selectedRecipe.servings && (
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Serves {selectedRecipe.servings}
                    </div>
                  )}
                </div>

                {selectedRecipe.cuisine && (
                  <div>
                    <strong>Cuisine:</strong> {selectedRecipe.cuisine}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {parseTags(selectedRecipe.tags).map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-2">Instructions</h4>
                  <div className="space-y-2">
                    {parseInstructions(selectedRecipe.instructions).map((step: string, index: number) => (
                      <div key={index} className="flex gap-3">
                        <Badge variant="outline" className="min-w-[2rem] h-6 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <p className="text-sm">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => onStartCooking(selectedRecipe)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Cooking
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}