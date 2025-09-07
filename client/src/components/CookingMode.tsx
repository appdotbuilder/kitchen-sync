import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Clock, 
  Users, 
  Star, 
  PlayCircle, 
  PauseCircle, 
  RotateCcw, 
  CheckCircle 
} from 'lucide-react';
import { trpc } from '@/utils/trpc';

import type { Recipe, CookingSession, StartCookingSessionInput } from '../../../server/src/schema';

interface CookingModeProps {
  recipe: Recipe;
  onExit: () => void;
}

export function CookingMode({ recipe, onExit }: CookingModeProps) {
  const [cookingSession, setCookingSession] = useState<CookingSession | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [finalRating, setFinalRating] = useState<number | null>(null);

  // Parse instructions from JSON string
  const parseInstructions = (instructions: string): string[] => {
    try {
      const parsed = JSON.parse(instructions);
      return Array.isArray(parsed) ? parsed : [instructions];
    } catch {
      return instructions.split('\n').filter(step => step.trim().length > 0);
    }
  };

  const steps = parseInstructions(recipe.instructions);
  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            // Timer finished - could add notification here
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTimerRunning, timer]);

  // Start cooking session
  const startSession = useCallback(async () => {
    setIsSessionLoading(true);
    try {
      const sessionInput: StartCookingSessionInput = { recipe_id: recipe.id };
      const session = await trpc.startCookingSession.mutate(sessionInput);
      setCookingSession(session);
      setCurrentStep(session.current_step);
    } catch (error) {
      console.error('Failed to start cooking session:', error);
    } finally {
      setIsSessionLoading(false);
    }
  }, [recipe.id]);

  // Update cooking session
  const updateSession = useCallback(async (step: number, notes?: string) => {
    if (!cookingSession) return;
    
    try {
      await trpc.updateCookingSession.mutate({
        id: cookingSession.id,
        current_step: step,
        notes: notes || sessionNotes || null
      });
    } catch (error) {
      console.error('Failed to update cooking session:', error);
    }
  }, [cookingSession, sessionNotes]);

  // Complete cooking session
  const completeSession = async (rating?: number) => {
    if (!cookingSession) return;
    
    try {
      await trpc.completeCookingSession.mutate({
        id: cookingSession.id,
        rating: rating || undefined
      });
      setIsCompleteDialogOpen(false);
      onExit();
    } catch (error) {
      console.error('Failed to complete cooking session:', error);
    }
  };

  // Start session on mount
  useEffect(() => {
    startSession();
  }, [startSession]);

  // Navigation handlers
  const goToNextStep = () => {
    const newStep = Math.min(currentStep + 1, steps.length - 1);
    setCurrentStep(newStep);
    updateSession(newStep);
  };

  const goToPreviousStep = () => {
    const newStep = Math.max(currentStep - 1, 0);
    setCurrentStep(newStep);
    updateSession(newStep);
  };

  // Timer handlers
  const startTimer = (minutes: number) => {
    setTimer(minutes * 60);
    setIsTimerRunning(true);
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    setTimer(0);
    setIsTimerRunning(false);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle completion
  const handleComplete = () => {
    setIsCompleteDialogOpen(true);
  };

  const handleExit = () => {
    updateSession(currentStep, sessionNotes);
    onExit();
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-lg text-gray-600">Starting cooking session...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleExit} size="sm">
              <X className="w-4 h-4 mr-2" />
              Exit Cooking Mode
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">🍳 {recipe.title}</h1>
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
                {recipe.servings && (
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Serves {recipe.servings}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Timer Widget */}
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className={`text-2xl font-mono font-bold ${timer > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                    {formatTime(timer)}
                  </div>
                  <div className="flex gap-1 mt-2">
                    <Button size="sm" variant="outline" onClick={() => startTimer(5)}>5m</Button>
                    <Button size="sm" variant="outline" onClick={() => startTimer(10)}>10m</Button>
                    <Button size="sm" variant="outline" onClick={() => startTimer(15)}>15m</Button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    onClick={toggleTimer}
                    disabled={timer === 0}
                    variant={isTimerRunning ? "default" : "outline"}
                  >
                    {isTimerRunning ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetTimer}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-600">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <Progress value={progress} className="h-3" />
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Step */}
          <div className="lg:col-span-2">
            <Card className="bg-white/90 backdrop-blur-sm h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    Step {currentStep + 1}
                  </Badge>
                  {currentStep === steps.length - 1 && (
                    <Badge className="bg-green-500">Final Step</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-orange-50 p-6 rounded-lg">
                  <p className="text-lg leading-relaxed text-gray-800">
                    {steps[currentStep]}
                  </p>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    onClick={goToPreviousStep}
                    disabled={currentStep === 0}
                    variant="outline"
                    size="lg"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Previous
                  </Button>

                  {currentStep === steps.length - 1 ? (
                    <Button
                      onClick={handleComplete}
                      size="lg"
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Complete Recipe
                    </Button>
                  ) : (
                    <Button
                      onClick={goToNextStep}
                      size="lg"
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      Next
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Quick Timer Actions */}
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Quick Timers ⏱️</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button onClick={() => startTimer(1)} variant="outline" className="w-full">
                  1 minute
                </Button>
                <Button onClick={() => startTimer(3)} variant="outline" className="w-full">
                  3 minutes
                </Button>
                <Button onClick={() => startTimer(5)} variant="outline" className="w-full">
                  5 minutes
                </Button>
                <Button onClick={() => startTimer(10)} variant="outline" className="w-full">
                  10 minutes
                </Button>
                <Button onClick={() => startTimer(20)} variant="outline" className="w-full">
                  20 minutes
                </Button>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Cooking Notes 📝</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add notes about your cooking experience..."
                  value={sessionNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSessionNotes(e.target.value)}
                  className="min-h-[120px]"
                />
              </CardContent>
            </Card>

            {/* Recipe Info */}
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Recipe Info 📋</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {recipe.difficulty && (
                  <div><strong>Difficulty:</strong> {recipe.difficulty}</div>
                )}
                {recipe.cuisine && (
                  <div><strong>Cuisine:</strong> {recipe.cuisine}</div>
                )}
                {recipe.description && (
                  <div><strong>Description:</strong> {recipe.description}</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* All Steps Overview */}
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>All Steps Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {steps.map((step: string, index: number) => (
                <div
                  key={index}
                  className={`flex gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    index === currentStep
                      ? 'bg-orange-100 border-2 border-orange-300'
                      : index < currentStep
                      ? 'bg-green-50 border-2 border-green-200'
                      : 'bg-gray-50 border-2 border-gray-200'
                  }`}
                  onClick={() => {
                    setCurrentStep(index);
                    updateSession(index);
                  }}
                >
                  <Badge
                    variant={index <= currentStep ? "default" : "outline"}
                    className={`min-w-[2rem] h-6 flex items-center justify-center ${
                      index === currentStep ? 'bg-orange-500' : 
                      index < currentStep ? 'bg-green-500' : ''
                    }`}
                  >
                    {index < currentStep ? <CheckCircle className="w-3 h-3" /> : index + 1}
                  </Badge>
                  <p className={`text-sm ${index === currentStep ? 'font-medium' : ''}`}>
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Completion Dialog */}
        <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>🎉 Recipe Completed!</DialogTitle>
              <DialogDescription>
                Congratulations on completing "{recipe.title}"! How did it turn out?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rate your cooking experience (optional)</Label>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Button
                      key={rating}
                      variant={finalRating === rating ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFinalRating(rating)}
                    >
                      <Star className={`w-4 h-4 ${finalRating && finalRating >= rating ? 'fill-current' : ''}`} />
                    </Button>
                  ))}
                </div>
              </div>
              {sessionNotes && (
                <div>
                  <Label>Your notes:</Label>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-1">
                    {sessionNotes}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
                Continue Cooking
              </Button>
              <Button 
                onClick={() => completeSession(finalRating || undefined)}
                className="bg-green-500 hover:bg-green-600"
              >
                Finish & Exit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}