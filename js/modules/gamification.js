/* ============================================================
   GAMIFICATION — XP, Streaks, Badges, Difficulty Adaptation
   ============================================================ */

import * as storage from '../storage.js';
import { createGamificationData, initBadges, today } from '../models.js';
import * as toast from '../ui/toast.js';
import { confetti } from '../ui/components.js';
import * as i18n from '../i18n.js';

/** Get or initialize gamification data for a profile. */
function getOrInit(profileId) {
  const existing = storage.loadGamification(profileId);
  if (existing) {
    // Ensure all badges present (for profiles created before new badges added)
    const knownIds = initBadges().map(b => b.id);
    const current  = existing.badges.map(b => b.id);
    knownIds.forEach(id => {
      if (!current.includes(id)) existing.badges.push(initBadges().find(b => b.id === id));
    });
    return existing;
  }
  const fresh = createGamificationData({ profileId });
  storage.saveGamification(profileId, fresh);
  return fresh;
}

/* ---- XP Engine ---- */

/**
 * Calculate XP earned for completing a workout.
 * @param {Object} workout  WorkoutPlan
 * @param {string|null} feedback  'too_easy'|'just_right'|'too_hard'|null
 * @param {number} streakDays  current streak length
 * @returns {number}
 */
function calcXP(workout, feedback, streakDays) {
  const BASE_XP         = 50;
  const exerciseBonus   = (workout.exercises || []).length * 5;
  const diffBonus       = (workout.difficulty || 2) * 10;
  const feedbackBonus   = feedback === 'just_right' ? 10 : 0;
  const streakMult      = Math.min(1 + streakDays * 0.05, 2.0);
  return Math.round((BASE_XP + exerciseBonus + diffBonus + feedbackBonus) * streakMult);
}

function getLevel(xp) { return Math.floor(xp / 200) + 1; }

/* ---- Streak Engine ---- */

function updateStreak(gamData, completedDate = today()) {
  const last     = gamData.lastWorkoutDate;
  let daysDiff   = null;

  if (last) {
    const ms   = new Date(completedDate) - new Date(last);
    daysDiff   = Math.round(ms / 86400000);
  }

  if (daysDiff === 0) {
    // Already worked out today — no change
  } else if (daysDiff === 1) {
    gamData.currentStreakDays++;
  } else {
    // Gap — reset
    gamData.currentStreakDays = 1;
  }

  gamData.longestStreakDays = Math.max(gamData.longestStreakDays, gamData.currentStreakDays);
  gamData.lastWorkoutDate   = completedDate;
  return gamData;
}

/* ---- Badge Engine ---- */

function checkBadges(gamData, context = {}) {
  const newBadges = [];
  const streak    = gamData.currentStreakDays;
  const level     = getLevel(gamData.xp);
  const history   = gamData.workoutHistory || [];
  const totalWorkouts = history.filter(w => w.completed).length;

  gamData.badges = gamData.badges.map(badge => {
    if (badge.unlocked) return badge;

    let unlock = false;
    switch (badge.id) {
      case 'first_workout':
        unlock = totalWorkouts >= 1;
        break;
      case 'streak_3':
        unlock = streak >= 3;
        break;
      case 'streak_7':
        unlock = streak >= 7;
        break;
      case 'streak_30':
        unlock = streak >= 30;
        break;
      case 'level_5':
        unlock = level >= 5;
        break;
      case 'level_10':
        unlock = level >= 10;
        break;
      case 'perfect_week': {
        // 7 completed workouts in last 7 days
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 6);
        const cutoffStr = cutoff.toISOString().slice(0,10);
        const recentDays = new Set(history.filter(w => w.completed && w.date >= cutoffStr).map(w => w.date));
        unlock = recentDays.size >= 7;
        break;
      }
      case 'early_bird':
        unlock = context.workoutHour !== undefined && context.workoutHour < 8;
        break;
      case 'iron_will': {
        const hardCount = history.filter(w => w.feedback === 'too_hard').length;
        unlock = hardCount >= 3;
        break;
      }
      case 'explorer': {
        const envSet = new Set(history.filter(w => w.environment).map(w => w.environment));
        unlock = envSet.size >= 3;
        break;
      }
    }

    if (unlock) {
      const earned = { ...badge, unlocked: true, earnedAt: new Date().toISOString() };
      newBadges.push(earned);
      return earned;
    }
    return badge;
  });

  return { gamData, newBadges };
}

/* ---- Difficulty Adaptation ---- */

/**
 * Adjust difficulty modifier based on post-workout feedback.
 * @param {string} profileId
 * @param {string} feedback  'too_easy'|'just_right'|'too_hard'
 */
function applyFeedback(profileId, feedback) {
  const gamData = getOrInit(profileId);
  const adj = { too_easy: +0.5, just_right: 0, too_hard: -0.5 }[feedback] ?? 0;
  gamData.difficultyModifier = Math.max(1, Math.min(5, (gamData.difficultyModifier ?? 2) + adj));
  storage.saveGamification(profileId, gamData);
  return gamData;
}

/* ---- Main completion handler ---- */

/**
 * Called when a workout is fully completed.
 * Updates XP, streak, badges, history. Returns updated gamData + newly earned badges.
 * @param {string} profileId
 * @param {Object} workout
 * @param {string|null} feedback
 * @returns {{ gamData, newBadges, xpEarned, leveledUp, newLevel }}
 */
function completeWorkout(profileId, workout, feedback) {
  let gamData = getOrInit(profileId);
  const dateStr = today();
  const prevLevel = getLevel(gamData.xp);

  // 1. Streak
  gamData = updateStreak(gamData, dateStr);

  // 2. XP
  const xpEarned  = calcXP(workout, feedback, gamData.currentStreakDays);
  gamData.xp     += xpEarned;
  gamData.level   = getLevel(gamData.xp);

  // 3. History entry
  gamData.workoutHistory.push({
    date:        dateStr,
    xpEarned,
    completed:   true,
    feedback:    feedback || null,
    environment: workout.environment,
    difficulty:  workout.difficulty
  });
  // Keep only last 90 days
  if (gamData.workoutHistory.length > 90) gamData.workoutHistory = gamData.workoutHistory.slice(-90);

  // 4. Apply feedback to difficulty
  if (feedback) applyFeedback(profileId, feedback);
  // Re-read after applyFeedback
  gamData.difficultyModifier = storage.loadGamification(profileId)?.difficultyModifier ?? gamData.difficultyModifier;

  // 5. Badges
  const context  = { workoutHour: new Date().getHours() };
  const { gamData: updatedGam, newBadges } = checkBadges(gamData, context);

  storage.saveGamification(profileId, updatedGam);

  const newLevel   = getLevel(updatedGam.xp);
  const leveledUp  = newLevel > prevLevel;

  // 6. Toast notifications
  toast.success(i18n.t('xpEarned', xpEarned), i18n.t('streakMsg', updatedGam.currentStreakDays));
  if (leveledUp) {
    setTimeout(() => {
      confetti(50);
      toast.success(i18n.t('levelUp', newLevel), i18n.t('keepGoing'), 5000);
    }, 1000);
  }
  newBadges.forEach((b, i) => {
    setTimeout(() => {
      toast.success(i18n.t('badgeUnlocked', b.icon, b.name), b.desc, 5000);
    }, (leveledUp ? 2500 : 800) + i * 1200);
  });

  return { gamData: updatedGam, newBadges, xpEarned, leveledUp, newLevel };
}

export { getOrInit, getLevel, calcXP, updateStreak, checkBadges, applyFeedback, completeWorkout };
