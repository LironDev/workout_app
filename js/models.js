/* ============================================================
   MODELS — Data Factory Functions
   ============================================================ */

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/* ---- UserProfile ---- */
function createUserProfile({
  name,
  age,
  gender             = 'other',
  weight             = 70,       // kg
  height             = 170,      // cm
  fitnessLevel       = 'beginner',
  goals              = ['stay_active'],
  defaultEnvironment = 'home_no_equipment',  // preferred default, overridable per session
  unitPreference     = 'metric'
} = {}) {
  const now = new Date().toISOString();
  return {
    id:                 uuid(),
    name:               name || 'User',
    age:                Number(age) || 25,
    gender,
    weight:             Number(weight),
    height:             Number(height),
    fitnessLevel,
    goals:              Array.isArray(goals) ? goals : [goals],
    defaultEnvironment,
    unitPreference,
    createdAt:          now,
    updatedAt:          now
  };
}

/* ---- WorkoutPlan ---- */
function createWorkoutPlan({
  profileId,
  date       = today(),
  difficulty = 2,
  environment,
  accessories = [],
  exercises  = [],
  estimatedDurationMinutes = 30
} = {}) {
  return {
    id:                      uuid(),
    profileId,
    generatedAt:             new Date().toISOString(),
    date,
    difficulty,
    environment,
    accessories,
    exercises,
    estimatedDurationMinutes,
    completed:               false,
    feedback:                null
  };
}

/* ---- Exercise ---- */
function createExercise({
  id            = uuid(),
  source        = 'fallback',
  name          = 'Exercise',
  description   = '',
  category      = { id: 0, name: 'General' },
  muscles       = [],
  musclesSecondary = [],
  equipment     = [],
  imageUrl      = null,
  sets          = 3,
  reps          = 10,
  restSeconds   = 60,
  durationSeconds = null   // for timed exercises (null = rep-based)
} = {}) {
  return {
    id:              String(id),
    source,
    name,
    description,
    category,
    muscles,
    musclesSecondary,
    equipment,
    imageUrl,
    youtubeSearchUrl: buildYouTubeUrl(name),
    sets,
    reps,
    restSeconds,
    durationSeconds,
    completedSets:   []
  };
}

function buildYouTubeUrl(exerciseName) {
  const q = encodeURIComponent(`how to ${exerciseName} exercise proper form`);
  return `https://www.youtube.com/results?search_query=${q}`;
}

/* ---- GamificationData ---- */
function createGamificationData({ profileId } = {}) {
  return {
    profileId,
    xp:                  0,
    level:               1,
    currentStreakDays:   0,
    longestStreakDays:   0,
    lastWorkoutDate:     null,
    difficultyModifier:  2,     // starting difficulty (1-5 scale)
    badges:              initBadges(),
    workoutHistory:      []     // [{ date, xpEarned, completed }]
  };
}

function initBadges() {
  return [
    { id: 'first_workout', name: 'First Step',    icon: '👟', desc: 'Complete your first workout',   unlocked: false, earnedAt: null },
    { id: 'streak_3',      name: 'On a Roll',     icon: '🔥', desc: '3 days in a row',               unlocked: false, earnedAt: null },
    { id: 'streak_7',      name: 'Week Warrior',  icon: '⚡', desc: '7-day streak',                  unlocked: false, earnedAt: null },
    { id: 'streak_30',     name: 'Unstoppable',   icon: '💎', desc: '30-day streak',                 unlocked: false, earnedAt: null },
    { id: 'level_5',       name: 'Rising Star',   icon: '⭐', desc: 'Reach Level 5',                unlocked: false, earnedAt: null },
    { id: 'level_10',      name: 'Fitness Pro',   icon: '🏆', desc: 'Reach Level 10',               unlocked: false, earnedAt: null },
    { id: 'perfect_week',  name: 'Perfect Week',  icon: '🌟', desc: '7 workouts in 7 days',          unlocked: false, earnedAt: null },
    { id: 'early_bird',    name: 'Early Bird',    icon: '🌅', desc: 'Work out before 8 AM',          unlocked: false, earnedAt: null },
    { id: 'iron_will',     name: 'Iron Will',     icon: '💪', desc: 'Push through 3 "Too Hard" sessions', unlocked: false, earnedAt: null },
    { id: 'explorer',      name: 'Explorer',      icon: '🗺️', desc: 'Try all 3 environments',        unlocked: false, earnedAt: null }
  ];
}

/* ---- NutritionPlan ---- */
function createNutritionPlan({
  profileId,
  date         = today(),
  bmr          = 1600,
  tdee         = 2000,
  targetCalories = 2000,
  macroTargets = { proteinG: 120, carbsG: 230, fatG: 67 },
  meals        = []
} = {}) {
  return {
    id:             uuid(),
    profileId,
    date,
    bmr,
    tdee,
    targetCalories,
    macroTargets,
    meals,
    logged:         []
  };
}

/* ---- MealItem ---- */
function createMealItem({
  mealType    = 'snack',
  name        = 'Meal',
  calories    = 300,
  protein     = 15,
  carbs       = 40,
  fat         = 8,
  ingredients = []
} = {}) {
  return {
    id:          uuid(),
    mealType,
    name,
    calories:    Math.round(calories),
    protein:     Math.round(protein),
    carbs:       Math.round(carbs),
    fat:         Math.round(fat),
    ingredients,
    logged:      false
  };
}

/* ---- MacroLogEntry ---- */
function createMacroLogEntry({ calories, protein, carbs, fat, label, mealType } = {}) {
  return {
    id:        uuid(),
    timestamp: new Date().toISOString(),
    calories:  Math.round(calories || 0),
    protein:   Math.round(protein || 0),
    carbs:     Math.round(carbs || 0),
    fat:       Math.round(fat || 0),
    mealType:  mealType || 'snack',
    label:     label || 'Food item'
  };
}

/* ---- Helpers ---- */

/** Convert kg -> lbs */
function kgToLbs(kg) { return Math.round(kg * 2.20462 * 10) / 10; }
/** Convert lbs -> kg */
function lbsToKg(lbs) { return Math.round(lbs / 2.20462 * 10) / 10; }
/** Convert cm -> ft/in string */
function cmToFtIn(cm) {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inch = Math.round(totalInches % 12);
  return `${ft}'${inch}"`;
}
/** Convert ft + in -> cm */
function ftInToCm(ft, inch) { return Math.round((ft * 12 + Number(inch)) * 2.54); }

export {
  uuid, today,
  createUserProfile, createWorkoutPlan, createExercise,
  createGamificationData, initBadges,
  createNutritionPlan, createMealItem, createMacroLogEntry,
  buildYouTubeUrl,
  kgToLbs, lbsToKg, cmToFtIn, ftInToCm
};
