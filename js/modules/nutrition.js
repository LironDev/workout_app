/* ============================================================
   NUTRITION — BMR/TDEE, Meal Plan Generator, Macro Logger
   ============================================================ */

import * as storage from '../storage.js';
import * as state from '../state.js';
import { createNutritionPlan, createMealItem, createMacroLogEntry, today } from '../models.js';
import { macroRingHTML, macroLegendHTML, esc } from '../ui/components.js';
import * as toast from '../ui/toast.js';
import * as i18n from '../i18n.js';

/* ---- Nutrition Algorithms ---- */

/** Mifflin-St Jeor BMR (weight kg, height cm) */
function calcBMR(profile) {
  const { weight, height, age, gender } = profile;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(gender === 'female' ? base - 161 : base + 5);
}

const ACTIVITY_MULT = { beginner: 1.375, intermediate: 1.55, advanced: 1.725 };

function calcTDEE(bmr, fitnessLevel) {
  return Math.round(bmr * (ACTIVITY_MULT[fitnessLevel] || 1.375));
}

const AGE_MINIMUMS = { 9:1600,10:1700,11:1800,12:1900,13:2000,14:2200 };

const GOAL_ADJ = { lose_weight: -350, build_muscle: +200, endurance: +100, stay_active: 0 };

function calcTargetCalories(tdee, profile) {
  const { age, goals } = profile;
  if (age < 15) return Math.max(tdee, AGE_MINIMUMS[age] || 1600);
  const primaryGoal = Array.isArray(goals) ? goals[0] : goals;
  return Math.max(1200, tdee + (GOAL_ADJ[primaryGoal] || 0));
}

function calcMacros(targetCalories, profile) {
  const { age, goals } = profile;
  let protRatio, carbRatio, fatRatio;
  if (age < 15) {
    protRatio = 0.20; carbRatio = 0.55; fatRatio = 0.25;
  } else if (goals.includes('build_muscle')) {
    protRatio = 0.30; carbRatio = 0.45; fatRatio = 0.25;
  } else if (goals.includes('lose_weight')) {
    protRatio = 0.35; carbRatio = 0.35; fatRatio = 0.30;
  } else {
    protRatio = 0.25; carbRatio = 0.50; fatRatio = 0.25;
  }
  return {
    proteinG: Math.round((targetCalories * protRatio) / 4),
    carbsG:   Math.round((targetCalories * carbRatio) / 4),
    fatG:     Math.round((targetCalories * fatRatio)  / 9)
  };
}

/* ---- Food Library ---- */

const FOOD_LIBRARY = {
  breakfast: [
    { name:'Oatmeal with Banana & Honey', cal:380, p:12, c:70, f:7, ingredients:['Oats 80g','Banana 1 medium','Honey 1 tsp','Milk 150ml'] },
    { name:'Scrambled Eggs & Whole Wheat Toast', cal:420, p:24, c:36, f:18, ingredients:['Eggs 3','Whole wheat bread 2 slices','Butter 1 tsp','Salt & pepper'] },
    { name:'Greek Yogurt Parfait', cal:320, p:20, c:42, f:6, ingredients:['Greek yogurt 200g','Mixed berries 100g','Granola 30g','Honey 1 tsp'] },
    { name:'Avocado Toast with Egg', cal:400, p:18, c:34, f:22, ingredients:['Whole wheat bread 2 slices','Avocado ½','Poached egg 1','Chili flakes'] },
    { name:'Whole Grain Pancakes', cal:360, p:14, c:58, f:10, ingredients:['Whole grain flour 80g','Egg 1','Milk 150ml','Banana ½','Maple syrup 1 tbsp'] },
    { name:'Smoothie Bowl', cal:340, p:16, c:52, f:8, ingredients:['Frozen berries 150g','Banana 1','Protein powder 1 scoop','Granola 30g','Chia seeds 1 tsp'] }
  ],
  lunch: [
    { name:'Grilled Chicken & Quinoa Bowl', cal:480, p:38, c:52, f:10, ingredients:['Chicken breast 150g','Quinoa 70g','Mixed veg 100g','Olive oil 1 tbsp','Lemon juice'] },
    { name:'Tuna Salad Wrap', cal:380, p:30, c:38, f:10, ingredients:['Canned tuna 120g','Whole wheat wrap','Lettuce, tomato, cucumber','Low-fat mayo 1 tbsp'] },
    { name:'Lentil & Vegetable Soup', cal:320, p:18, c:48, f:6, ingredients:['Red lentils 100g','Mixed vegetables 200g','Vegetable broth 400ml','Cumin, coriander'] },
    { name:'Turkey & Avocado Sandwich', cal:420, p:28, c:40, f:16, ingredients:['Turkey breast 100g','Whole wheat bread 2 slices','Avocado ¼','Lettuce, tomato'] },
    { name:'Brown Rice & Salmon Bowl', cal:520, p:36, c:58, f:14, ingredients:['Salmon 150g','Brown rice 80g','Edamame 50g','Cucumber','Soy sauce 1 tbsp'] },
    { name:'Chickpea & Spinach Curry', cal:380, p:20, c:50, f:10, ingredients:['Chickpeas 200g','Spinach 100g','Tomatoes 150g','Curry powder','Brown rice 60g'] }
  ],
  dinner: [
    { name:'Baked Salmon with Sweet Potato', cal:520, p:38, c:46, f:16, ingredients:['Salmon fillet 180g','Sweet potato 200g','Broccoli 150g','Olive oil 1 tbsp','Herbs'] },
    { name:'Chicken Stir-Fry with Veggies', cal:440, p:36, c:44, f:12, ingredients:['Chicken breast 150g','Mixed stir-fry veg 200g','Brown rice 70g','Soy sauce','Ginger'] },
    { name:'Beef & Vegetable Pasta', cal:560, p:34, c:64, f:16, ingredients:['Lean beef mince 120g','Whole wheat pasta 80g','Tomato sauce 150ml','Zucchini, peppers'] },
    { name:'Tofu & Vegetable Curry', cal:400, p:20, c:50, f:14, ingredients:['Firm tofu 200g','Mixed vegetables 200g','Coconut milk 100ml','Curry paste','Brown rice 70g'] },
    { name:'Turkey Meatballs & Zoodles', cal:420, p:36, c:24, f:18, ingredients:['Turkey mince 150g','Zucchini 2 (spiralized)','Tomato sauce 150ml','Parmesan 20g','Herbs'] },
    { name:'Grilled Chicken & Roasted Veg', cal:460, p:40, c:32, f:16, ingredients:['Chicken breast 180g','Roasted sweet potato 150g','Bell peppers 100g','Olive oil, herbs'] }
  ],
  snack: [
    { name:'Apple with Almond Butter', cal:200, p:6, c:26, f:10, ingredients:['Apple 1 medium','Almond butter 1 tbsp'] },
    { name:'Protein Shake & Banana', cal:250, p:24, c:30, f:4, ingredients:['Protein powder 1 scoop','Milk 250ml','Banana ½'] },
    { name:'Mixed Nuts & Dried Fruit', cal:180, p:5, c:18, f:12, ingredients:['Mixed nuts 30g','Dried cranberries 20g'] },
    { name:'Hummus & Vegetable Sticks', cal:160, p:6, c:20, f:8, ingredients:['Hummus 60g','Carrot sticks','Cucumber sticks','Bell pepper strips'] },
    { name:'Greek Yogurt with Berries', cal:150, p:14, c:18, f:2, ingredients:['Greek yogurt 150g','Mixed berries 80g'] },
    { name:'Rice Cakes & Cottage Cheese', cal:140, p:12, c:16, f:3, ingredients:['Rice cakes 2','Cottage cheese 100g','Cherry tomatoes'] }
  ]
};

/* ---- Meal Plan Generator ---- */

function generateMealPlan(targetCalories, macroTargets, profile) {
  const isYouth = profile.age < 15;
  // Cal split: B25 L35 D30 S10
  const calSplit = { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.10 };
  const meals = [];

  for (const [mealType, frac] of Object.entries(calSplit)) {
    const targetCal = targetCalories * frac;
    const pool = FOOD_LIBRARY[mealType] || [];
    // Pick food closest to calorie target
    const food = pool.reduce((best, item) =>
      Math.abs(item.cal - targetCal) < Math.abs(best.cal - targetCal) ? item : best
    , pool[0] || { name:'Healthy Meal', cal:300, p:15, c:40, f:8, ingredients:[] });

    meals.push(createMealItem({
      mealType,
      name:        food.name,
      calories:    food.cal,
      protein:     food.p,
      carbs:       food.c,
      fat:         food.f,
      ingredients: food.ingredients || []
    }));
  }
  return meals;
}

/* ---- Get or Generate Nutrition Plan ---- */

function getOrGeneratePlan(profile) {
  const dateStr  = today();
  const existing = storage.loadNutritionForDate(profile.id, dateStr);
  if (existing?.plan) return existing;

  const bmr  = calcBMR(profile);
  const tdee = calcTDEE(bmr, profile.fitnessLevel);
  const tCal = calcTargetCalories(tdee, profile);
  const macros = calcMacros(tCal, profile);
  const meals  = generateMealPlan(tCal, macros, profile);

  const plan = createNutritionPlan({
    profileId:     profile.id,
    date:          dateStr,
    bmr, tdee,
    targetCalories: tCal,
    macroTargets:   macros,
    meals
  });

  const entry = { plan, log: [] };
  storage.saveNutritionForDate(profile.id, dateStr, entry);
  return entry;
}

/* ---- Aggregated Logged Macros ---- */

function sumLogged(logEntries) {
  return (logEntries || []).reduce((acc, e) => ({
    calories: acc.calories + (e.calories || 0),
    protein:  acc.protein  + (e.protein  || 0),
    carbs:    acc.carbs    + (e.carbs    || 0),
    fat:      acc.fat      + (e.fat      || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

/* ---- View Mount/Unmount ---- */

let _unsubscribe = null;

function mount() {
  const section = document.getElementById('view-nutrition');
  _render(section);
}

function unmount() {
  if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
}

function _render(section) {
  const profileId = state.getState('activeProfileId');
  const profiles  = state.getState('profiles') || {};
  const profile   = profiles[profileId];

  if (!profile) {
    section.innerHTML = `<div class="section">${_emptyProfile()}</div>`;
    return;
  }

  const { plan, log } = getOrGeneratePlan(profile);
  const logged = sumLogged(log);
  const macroTargets = { ...plan.macroTargets, calories: plan.targetCalories };

  const mealTypeIcons   = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };
  const mealTypeLabels  = {
    breakfast: i18n.t('mealBreakfast'),
    lunch:     i18n.t('mealLunch'),
    dinner:    i18n.t('mealDinner'),
    snack:     i18n.t('mealSnack')
  };
  const mealTypes = ['breakfast','lunch','dinner','snack'];

  section.innerHTML = `
    <div class="view-header">
      <span class="view-header__title">${i18n.t('nutritionTitle')}</span>
      <span class="tag tag--primary">${i18n.t('bmrLabel')}: ${plan.bmr} kcal</span>
    </div>

    <div class="nutrition-summary">
      <div class="nutrition-summary__ring">${macroRingHTML(logged, macroTargets, 130)}</div>
      ${macroLegendHTML(logged, macroTargets)}
    </div>

    <div class="nutrition-content">
      <div class="card">
        <div class="card-header">
          <span class="card-title">${i18n.t('dailyTargets')}</span>
          <span class="tag">${profile.fitnessLevel}</span>
        </div>
        <div class="grid-3">
          ${_statChip(i18n.t('targetLabel'), plan.targetCalories + ' kcal', '#6C63FF')}
          ${_statChip(i18n.t('tdeLabel'),    plan.tdee + ' kcal',           '#4ECDC4')}
          ${_statChip(i18n.t('bmrLabel'),    plan.bmr + ' kcal',            '#FF6B6B')}
        </div>
        ${profile.age < 15 ? `<p class="text-sm text-muted mt-3">${i18n.t('youthNutrNote')}</p>` : ''}
      </div>

      ${mealTypes.map(type => {
        const meal = plan.meals.find(m => m.mealType === type);
        if (!meal) return '';
        const isLogged = log.some(e => e.mealType === type);
        return `
          <div class="meal-section">
            <div class="meal-type-header">
              <span class="meal-type-header__icon">${mealTypeIcons[type]}</span>
              <span>${mealTypeLabels[type]}</span>
              ${isLogged ? '<span class="tag tag--success ml-2">✓ Logged</span>' : ''}
            </div>
            <div class="meal-card">
              <div class="meal-card__header">
                <div>
                  <div class="font-semibold">${esc(meal.name)}</div>
                  <div class="text-sm text-muted">${meal.calories} kcal</div>
                </div>
                ${!isLogged ? `
                  <button class="btn btn--sm btn--primary" data-log-meal="${meal.id}" data-meal-type="${type}">
                    ${i18n.t('btnLogMeal')}
                  </button>
                ` : '<span style="font-size:1.5rem">✅</span>'}
              </div>
              <div class="meal-card__macros">
                <div class="meal-card__macro"><strong>${meal.protein}g</strong><span>Protein</span></div>
                <div class="meal-card__macro"><strong>${meal.carbs}g</strong><span>Carbs</span></div>
                <div class="meal-card__macro"><strong>${meal.fat}g</strong><span>Fat</span></div>
              </div>
              ${meal.ingredients?.length ? `
                <details class="mt-3" style="font-size:var(--text-sm);color:var(--color-text-muted)">
                  <summary style="cursor:pointer;font-weight:600">${i18n.t('ingredients')}</summary>
                  <ul style="margin-top:8px;padding-left:1.2em;list-style:disc">
                    ${meal.ingredients.map(i => `<li>${esc(i)}</li>`).join('')}
                  </ul>
                </details>
              ` : ''}
            </div>
          </div>
        `;
      }).join('')}

      <div class="card">
        <div class="card-title mb-3">${i18n.t('nutritionTips')}</div>
        ${_nutritionTips(profile)}
      </div>
    </div>
  `;

  // Bind log buttons
  section.querySelectorAll('[data-log-meal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mealType = btn.dataset.mealType;
      const meal     = plan.meals.find(m => m.mealType === mealType);
      if (!meal) return;
      _logMeal(profile, plan, log, meal);
    });
  });
}

function _logMeal(profile, plan, log, meal) {
  const entry = createMacroLogEntry({
    calories: meal.calories,
    protein:  meal.protein,
    carbs:    meal.carbs,
    fat:      meal.fat,
    label:    meal.name,
    mealType: meal.mealType
  });
  log.push(entry);
  storage.saveNutritionForDate(profile.id, today(), { plan, log });
  toast.success(i18n.t('loggedMeal'), `+${meal.calories} kcal`);
  mount(); // re-render
}

function _statChip(label, value, color) {
  return `<div style="text-align:center;padding:var(--space-3);background:var(--color-surface-alt);border-radius:var(--radius-md)">
    <div style="font-weight:700;color:${color}">${esc(value)}</div>
    <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${esc(label)}</div>
  </div>`;
}

function _emptyProfile() {
  return `<div class="empty-state">
    <div class="empty-state__icon">🥗</div>
    <h3 class="empty-state__title">${i18n.t('noProfile')}</h3>
    <p class="empty-state__desc">${i18n.t('noProfileDesc')}</p>
  </div>`;
}

function _nutritionTips(profile) {
  const isYouth = profile.age < 15;
  const tips = isYouth ? [
    '🥛 Drink 6–8 glasses of water daily',
    '🥦 Aim for 5 servings of fruits & vegetables',
    '🍞 Choose whole grains for lasting energy',
    '🥩 Include lean protein at every meal for growth',
    '😴 Good sleep is as important as good food!'
  ] : [
    '💧 Drink water before, during, and after workouts',
    '🕐 Eat protein within 30 min of finishing your workout',
    '🥗 Fill half your plate with colorful vegetables',
    '🚫 Limit processed foods and added sugars',
    '🛌 Quality sleep helps muscle recovery and metabolism'
  ];
  return `<ul style="display:flex;flex-direction:column;gap:var(--space-2)">
    ${tips.map(t => `<li style="font-size:var(--text-sm)">${esc(t)}</li>`).join('')}
  </ul>`;
}

export { mount, unmount, calcBMR, calcTDEE, calcTargetCalories, calcMacros, getOrGeneratePlan, sumLogged };
