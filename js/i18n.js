/* ============================================================
   I18N — Internationalization (English + Hebrew)
   ============================================================ */

import * as storage from './storage.js';

let _lang = 'en';

const TRANSLATIONS = {
  en: {
    /* ---- App ---- */
    appName: 'FitLife',
    appTagline: 'Your personal fitness & nutrition companion',

    /* ---- Nav ---- */
    navHome:      'Home',
    navWorkout:   'Workout',
    navNutrition: 'Nutrition',
    navProfiles:  'Profiles',
    navBadges:    'Badges',

    /* ---- Onboarding ---- */
    onboardingStep: (n, t) => `Step ${n} of ${t}`,
    step1Title:    "Let's get to know you!",
    step1Desc:     'Tell us a bit about yourself to personalize your experience.',
    step2Title:    'Your body metrics',
    step2Desc:     'Used to calculate your personalized calorie & nutrition targets.',
    step3Title:    'Your fitness level',
    step3Desc:     'This shapes your workout difficulty and exercise selection.',
    step4Title:    'What are your goals?',
    step4Desc:     'Select all that apply. Your primary goal shapes nutrition targets.',
    step5Title:    'Default workout style',
    step5Desc:     'You can change this before each workout session.',
    labelName:     'Your Name',
    labelAge:      'Age',
    labelGender:   'Gender',
    labelWeight:   'Weight',
    labelHeight:   'Height',
    genderMale:    '♂️ Male',
    genderFemale:  '♀️ Female',
    genderOther:   '⚧️ Other',
    minAge:        'Minimum age: 9 years',
    btnContinue:   'Continue →',
    btnBack:       '←',
    btnStart:      "🚀 Let's Go!",
    btnNewProfile: 'New Profile',
    btnBack2Profiles: '← Back',

    /* ---- Fitness Levels ---- */
    levelBeginner:     'Beginner',
    levelBegDesc:      'New to exercise or getting back in shape',
    levelIntermediate: 'Intermediate',
    levelIntDesc:      'Regularly active 2-4 days/week',
    levelAdvanced:     'Advanced',
    levelAdvDesc:      'Consistently training 5+ days/week',

    /* ---- Goals ---- */
    goalStayActive:  'Stay Active',
    goalLoseWeight:  'Lose Weight',
    goalMuscle:      'Build Muscle',
    goalEndurance:   'Improve Endurance',

    /* ---- Environments ---- */
    envHomeNoEq:     'Home – No Equipment',
    envHomeNoEqDesc: 'Bodyweight exercises anywhere',
    envHomeGym:      'Home Gym',
    envHomeGymDesc:  'Dumbbells, bands & more',
    envOutdoor:      'Outdoor / Park',
    envOutdoorDesc:  'Fresh air with park equipment',
    envCalisthenics: 'Calisthenics',
    envCalisthenicsDesc: 'Pull-ups, dips, bars & rings',

    /* ---- Accessories ---- */
    accessoriesTitle:    'Available equipment',
    accessoriesDesc:     'Select what you have right now',
    accDumbbell:         'Dumbbells',
    accResistanceBand:   'Resistance Bands',
    accPullupBar:        'Pull-up Bar',
    accKettlebell:       'Kettlebell',
    accMat:              'Yoga / Gym Mat',
    accBench:            'Bench / Box',
    accRings:            'Gymnastic Rings',
    accParallelBars:     'Parallel Bars',

    /* ---- Pre-workout screen ---- */
    preWorkoutTitle:     "Today's Workout Setup",
    preWorkoutEnv:       'Workout Environment',
    preWorkoutAccessories: 'Equipment I Have Today',
    btnGenerateWorkout:  'Generate Workout 🚀',
    btnChangeEnv:        'Change',

    /* ---- Dashboard ---- */
    greeting_morning:  '☀️ Good morning,',
    greeting_afternoon:'🌤️ Good afternoon,',
    greeting_evening:  '🌙 Good evening,',
    labelStreak:       '🔥 Streak',
    labelLevel:        '⭐ Level',
    labelWorkouts:     'Workouts',
    todayWorkout:      "Today's Workout",
    nutritionToday:    'Nutrition Today',
    quickActions:      'Quick Actions',
    recentActivity:    '📅 Recent Activity',
    btnStartWorkout:   'Start 🚀',
    btnDetails:        'Details →',
    btnLogMeal:        'Log It',
    installApp:        '📲 Install App',
    btnInstall:        'Add to Home Screen',

    /* ---- Workout Player ---- */
    workoutComplete:   'Workout Complete!',
    workoutCompleteMsg:'Amazing work! Check your XP & badges.',
    backToDashboard:   '← Back to Dashboard',
    tutorial:          'Tutorial',
    labelSets:         'sets',
    labelReps:         'reps',
    labelSecs:         's',
    labelRestTimer:    'Start Rest Timer',
    labelWeight:       'Weight (kg)',
    feedbackTitle:     '🎉 Workout Complete!',
    feedbackPrompt:    "How was today's workout?",
    feedbackEasy:      'Too Easy',
    feedbackEasyDesc:  "I could've done much more",
    feedbackRight:     'Just Right',
    feedbackRightDesc: 'Perfect challenge for me',
    feedbackHard:      'Too Hard',
    feedbackHardDesc:  'I struggled to finish',
    restComplete:      'Rest complete!',
    restCompleteMsg:   'Time for your next set 💪',
    completeAtLeastOne:'Complete at least one set before finishing!',

    /* ---- Nutrition ---- */
    nutritionTitle:    '🥗 Nutrition',
    targetLabel:       'Target',
    tdeLabel:          'TDEE',
    bmrLabel:          'BMR',
    dailyTargets:      'Daily Targets',
    nutritionTips:     '💡 Nutrition Tips',
    loggedMeal:        'Meal logged!',
    mealBreakfast:     'Breakfast',
    mealLunch:         'Lunch',
    mealDinner:        'Dinner',
    mealSnack:         'Snack',
    ingredients:       'Ingredients',
    youthNutrNote:     '🌟 Targets are set for healthy growth & energy. Stay active and enjoy balanced meals!',

    /* ---- Profiles ---- */
    profilesTitle:     '👨‍👩‍👧‍👦 Family Profiles',
    noProfiles:        'No Profiles Yet',
    noProfilesDesc:    'Create your first profile to get started!',
    addMember:         '+ Add Family Member',
    maxProfiles:       'Maximum 6 profiles reached.',
    aboutFamilyMode:   'About Family Mode',
    familyModeDesc:    'Each profile stores its own workouts, nutrition plan, progress and badges. Switch profiles from the dashboard at any time. All data is saved locally on this device.',
    activeLabel:       'Active',
    deleteProfile:     'Delete Profile',
    deleteConfirm:     (name) => `Delete ${name}?`,
    deleteWarning:     (name) => `This will permanently delete ${name}'s profile, including all workout history, nutrition logs, and badges. This cannot be undone.`,
    cantDelete:        'Cannot delete',
    needOneProfile:    'You need at least one profile.',
    switchedTo:        (name) => `Switched to ${name}!`,
    profileDeleted:    (name) => `${name}'s profile deleted.`,
    btnCancel:         'Cancel',
    btnDelete:         'Delete',
    editProfile:       'Edit Profile',

    /* ---- Badges ---- */
    badgesTitle:       '🏅 Achievements',
    currentStreak:     'Current Streak',
    bestStreak:        'Best Streak',
    totalWorkouts:     'Total Workouts',
    totalXP:           'Total XP',
    allBadges:         'All Badges',
    daysUnit:          (n) => `${n} day${n !== 1 ? 's' : ''}`,

    /* ---- Gamification ---- */
    xpEarned:          (n) => `+${n} XP earned! 🎯`,
    streakMsg:         (n) => `Streak: ${n} days 🔥`,
    levelUp:           (n) => `Level Up! You're now Level ${n}! ⭐`,
    keepGoing:         'Keep going!',
    badgeUnlocked:     (icon, name) => `Badge Unlocked: ${icon} ${name}`,

    /* ---- Errors / Empty ---- */
    noProfile:         'No Profile Selected',
    noProfileDesc:     'Select or create a profile to see this screen.',
    couldntLoadWorkout:'Could not load workout',
    storageUnavailable:'Storage Unavailable',
    storageDesc:       'FitLife requires localStorage to save your data. Please enable cookies/storage in your browser settings.',
    offline:           '⚡ Offline mode — using cached data',

    /* ---- Units ---- */
    unitMetric:   'Metric',
    unitImperial: 'Imperial',
  },

  he: {
    /* ---- App ---- */
    appName: 'FitLife',
    appTagline: 'מדריך הכושר והתזונה האישי שלך',

    /* ---- Nav ---- */
    navHome:      'בית',
    navWorkout:   'אימון',
    navNutrition: 'תזונה',
    navProfiles:  'פרופילים',
    navBadges:    'הישגים',

    /* ---- Onboarding ---- */
    onboardingStep: (n, t) => `שלב ${n} מתוך ${t}`,
    step1Title:    'ספר לנו עליך!',
    step1Desc:     'מעט פרטים אישיים כדי להתאים את החוויה לך.',
    step2Title:    'המדדים שלך',
    step2Desc:     'בסיס לחישוב צרכי הקלוריות והתזונה שלך.',
    step3Title:    'רמת הכושר שלך',
    step3Desc:     'קובע את רמת הקושי ובחירת התרגילים.',
    step4Title:    'מה המטרות שלך?',
    step4Desc:     'בחר/י את כל מה שרלוונטי. המטרה הראשית משפיעה על התזונה.',
    step5Title:    'סגנון אימון ברירת מחדל',
    step5Desc:     'תוכל/י לשנות לפני כל אימון.',
    labelName:     'שמך',
    labelAge:      'גיל',
    labelGender:   'מין',
    labelWeight:   'משקל',
    labelHeight:   'גובה',
    genderMale:    '♂️ זכר',
    genderFemale:  '♀️ נקבה',
    genderOther:   '⚧️ אחר',
    minAge:        'גיל מינימלי: 9',
    btnContinue:   'המשך →',
    btnBack:       '→',
    btnStart:      '🚀 בואו נתחיל!',
    btnNewProfile: 'פרופיל חדש',
    btnBack2Profiles: 'חזור →',

    /* ---- Fitness Levels ---- */
    levelBeginner:     'מתחיל',
    levelBegDesc:      'חדש לאימונים או חוזר לפעילות',
    levelIntermediate: 'בינוני',
    levelIntDesc:      'פעיל/ה 2-4 ימים בשבוע',
    levelAdvanced:     'מתקדם',
    levelAdvDesc:      'מתאמן/ת 5+ ימים בשבוע',

    /* ---- Goals ---- */
    goalStayActive:  'להישאר פעיל/ה',
    goalLoseWeight:  'לרדת במשקל',
    goalMuscle:      'לבנות שריר',
    goalEndurance:   'לשפר סיבולת',

    /* ---- Environments ---- */
    envHomeNoEq:     'בית – ללא ציוד',
    envHomeNoEqDesc: 'תרגילי משקל גוף בכל מקום',
    envHomeGym:      'חדר כושר ביתי',
    envHomeGymDesc:  'משקולות, גומיות ועוד',
    envOutdoor:      'חוץ / פארק',
    envOutdoorDesc:  'אוויר צח עם ציוד פארק',
    envCalisthenics: 'קליסתניקס',
    envCalisthenicsDesc: 'מתח, מקבילים, טבעות ועוד',

    /* ---- Accessories ---- */
    accessoriesTitle:    'ציוד זמין',
    accessoriesDesc:     'בחר מה יש לך עכשיו',
    accDumbbell:         'משקולות יד',
    accResistanceBand:   'גומיות התנגדות',
    accPullupBar:        'מוט מתח',
    accKettlebell:       'קטלבל',
    accMat:              'מזרן כושר',
    accBench:            'ספסל / קופסה',
    accRings:            'טבעות התעמלות',
    accParallelBars:     'מקבילים',

    /* ---- Pre-workout screen ---- */
    preWorkoutTitle:     'הגדרות האימון היום',
    preWorkoutEnv:       'סביבת האימון',
    preWorkoutAccessories: 'ציוד שיש לי היום',
    btnGenerateWorkout:  'צור תכנית אימון 🚀',
    btnChangeEnv:        'שנה',

    /* ---- Dashboard ---- */
    greeting_morning:   '☀️ בוקר טוב,',
    greeting_afternoon: '🌤️ צהריים טובים,',
    greeting_evening:   '🌙 ערב טוב,',
    labelStreak:        '🔥 רצף',
    labelLevel:         '⭐ רמה',
    labelWorkouts:      'אימונים',
    todayWorkout:       'אימון היום',
    nutritionToday:     'תזונה היום',
    quickActions:       'פעולות מהירות',
    recentActivity:     '📅 פעילות אחרונה',
    btnStartWorkout:    'התחל 🚀',
    btnDetails:         'פרטים ←',
    btnLogMeal:         'רשום',
    installApp:         '📲 התקן אפליקציה',
    btnInstall:         'הוסף למסך הבית',

    /* ---- Workout Player ---- */
    workoutComplete:    'האימון הושלם!',
    workoutCompleteMsg: 'עבודה מדהימה! בדוק/י XP ותגים.',
    backToDashboard:    'חזרה לדשבורד ←',
    tutorial:           'הדרכה',
    labelSets:          'סטים',
    labelReps:          'חזרות',
    labelSecs:          'שנ\'',
    labelRestTimer:     'התחל טיימר מנוחה',
    labelWeight:        'משקל (ק"ג)',
    feedbackTitle:      '🎉 האימון הסתיים!',
    feedbackPrompt:     'איך היה האימון היום?',
    feedbackEasy:       'קל מדי',
    feedbackEasyDesc:   'יכולתי לעשות הרבה יותר',
    feedbackRight:      'מושלם',
    feedbackRightDesc:  'האתגר הנכון בשבילי',
    feedbackHard:       'קשה מדי',
    feedbackHardDesc:   'התקשיתי לסיים',
    restComplete:       'המנוחה הסתיימה!',
    restCompleteMsg:    'זמן לסט הבא 💪',
    completeAtLeastOne: 'השלם/י לפחות סט אחד לפני הסיום!',

    /* ---- Nutrition ---- */
    nutritionTitle:    '🥗 תזונה',
    targetLabel:       'יעד',
    tdeLabel:          'TDEE',
    bmrLabel:          'BMR',
    dailyTargets:      'יעדים יומיים',
    nutritionTips:     '💡 טיפים תזונתיים',
    loggedMeal:        'הארוחה נרשמה!',
    mealBreakfast:     'ארוחת בוקר',
    mealLunch:         'ארוחת צהריים',
    mealDinner:        'ארוחת ערב',
    mealSnack:         'חטיף',
    ingredients:       'מרכיבים',
    youthNutrNote:     '🌟 היעדים מוגדרים לצמיחה בריאה ולאנרגיה. הישאר/י פעיל/ה ותהנה/י מאכילה מאוזנת!',

    /* ---- Profiles ---- */
    profilesTitle:     '👨‍👩‍👧‍👦 פרופילי משפחה',
    noProfiles:        'אין פרופילים עדיין',
    noProfilesDesc:    'צור/י את הפרופיל הראשון שלך כדי להתחיל!',
    addMember:         '+ הוסף בן/בת משפחה',
    maxProfiles:       'הגעת למקסימום 6 פרופילים.',
    aboutFamilyMode:   'על מצב משפחה',
    familyModeDesc:    'כל פרופיל שומר את האימונים, תוכנית התזונה, ההתקדמות והתגים שלו. ניתן להחליף פרופילים בכל עת. כל הנתונים נשמרים מקומית במכשיר זה.',
    activeLabel:       'פעיל',
    deleteProfile:     'מחק פרופיל',
    deleteConfirm:     (name) => `למחוק את ${name}?`,
    deleteWarning:     (name) => `פעולה זו תמחק לצמיתות את הפרופיל של ${name}, כולל היסטוריית האימונים, יומני התזונה והתגים. לא ניתן לבטל פעולה זו.`,
    cantDelete:        'לא ניתן למחוק',
    needOneProfile:    'נדרש לפחות פרופיל אחד.',
    switchedTo:        (name) => `עברת ל-${name}!`,
    profileDeleted:    (name) => `הפרופיל של ${name} נמחק.`,
    btnCancel:         'ביטול',
    btnDelete:         'מחק',
    editProfile:       'ערוך פרופיל',

    /* ---- Badges ---- */
    badgesTitle:       '🏅 הישגים',
    currentStreak:     'רצף נוכחי',
    bestStreak:        'הרצף הטוב ביותר',
    totalWorkouts:     'סה"כ אימונים',
    totalXP:           'סה"כ XP',
    allBadges:         'כל התגים',
    daysUnit:          (n) => `${n} יום${n !== 1 ? 'ות' : ''}`,

    /* ---- Gamification ---- */
    xpEarned:          (n) => `+${n} XP! 🎯`,
    streakMsg:         (n) => `רצף: ${n} ימים 🔥`,
    levelUp:           (n) => `!עלית רמה! אתה עכשיו רמה ${n} ⭐`,
    keepGoing:         '!המשך כך',
    badgeUnlocked:     (icon, name) => `תג נפתח: ${icon} ${name}`,

    /* ---- Errors / Empty ---- */
    noProfile:         'לא נבחר פרופיל',
    noProfileDesc:     'בחר/י או צור/י פרופיל כדי לראות מסך זה.',
    couldntLoadWorkout:'לא ניתן לטעון אימון',
    storageUnavailable:'אחסון לא זמין',
    storageDesc:       'FitLife דורש localStorage לשמירת הנתונים. אנא אפשר/י עוגיות/אחסון בהגדרות הדפדפן.',
    offline:           '⚡ מצב לא מקוון — משתמש בנתונים שמורים',

    /* ---- Units ---- */
    unitMetric:   'מטרי',
    unitImperial: 'אימפריאלי',
  }
};

/* ---- Public API ---- */

function setLang(lang) {
  _lang = lang === 'he' ? 'he' : 'en';
  storage.saveSettings({ ...storage.loadSettings(), lang: _lang });
  document.documentElement.setAttribute('lang', _lang);
  document.documentElement.setAttribute('dir', _lang === 'he' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('data-lang', _lang);
}

function getLang() { return _lang; }

function isRTL() { return _lang === 'he'; }

/**
 * Translate a key. Supports function values (pass args after key).
 * t('deleteConfirm', 'Alex') → calls TRANSLATIONS[lang].deleteConfirm('Alex')
 */
function t(key, ...args) {
  const val = TRANSLATIONS[_lang]?.[key] ?? TRANSLATIONS.en?.[key];
  if (val === undefined) return key; // fallback to key
  if (typeof val === 'function') return val(...args);
  return val;
}

/** Load saved language preference */
function init() {
  const settings = storage.loadSettings();
  const saved    = settings.lang || 'en';
  setLang(saved);
}

export { init, setLang, getLang, isRTL, t };
