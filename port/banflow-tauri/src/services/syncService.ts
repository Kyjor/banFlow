/**
 * Cloud sync between local SQLite and Supabase.
 * Only runs when sync_enabled = true and user is authenticated.
 *
 * Strategy: local-first. Dirty records are pushed up. Remote records
 * are pulled down and merged (remote wins on conflict for simplicity;
 * future: last-write-wins with updated_at).
 */

import type Database from '@tauri-apps/plugin-sql';
import { supabase } from './supabaseClient';
import type { Run, Goal, ActivePlan, TrainingPlan, PlanDay, SyncQueueItem } from '../types';
import { saveSettings } from './settingsService';
import { getPlanById, getPlanDays } from './planService';

export async function syncToCloud(db: Database): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  // Process queued deletes first (before upserts to avoid conflicts)
  await processQueuedDeletes(db, session.user.id);
  
  // Then sync dirty records (upserts)
  await pushDirtyRuns(db, session.user.id);
  await pushDirtyGoals(db, session.user.id);
  await pushDirtyActivePlan(db, session.user.id);
  await pushDirtyCustomPlans(db, session.user.id);

  await saveSettings(db, { last_sync_at: new Date().toISOString() });
}

/**
 * Process queued deletes from sync_queue table.
 * These are deletes that failed when the user was offline.
 */
async function processQueuedDeletes(db: Database, userId: string): Promise<void> {
  const queued = await db.select<SyncQueueItem[]>(
    "SELECT * FROM sync_queue WHERE action = 'delete' ORDER BY created_at ASC"
  );

  for (const item of queued) {
    try {
      const { error } = await supabase
        .from(item.table_name)
        .delete()
        .eq('id', item.record_id)
        .eq('user_id', userId);

      if (error) {
        console.error(`Failed to process queued delete for ${item.table_name}:${item.record_id}:`, error);
        // Keep in queue for next sync attempt
      } else {
        // Successfully deleted, remove from queue
        await db.execute('DELETE FROM sync_queue WHERE id = $1', [item.id]);
      }
    } catch (err) {
      console.error(`Error processing queued delete ${item.id}:`, err);
      // Remove malformed queue items
      await db.execute('DELETE FROM sync_queue WHERE id = $1', [item.id]);
    }
  }
}

/**
 * Force-sync: resets all records back to 'local' so everything is re-uploaded.
 * Used by the manual "Sync Now" button to recover from previously failed syncs.
 */
export async function forceSyncToCloud(db: Database): Promise<void> {
  await db.execute("UPDATE runs SET sync_status='local'");
  await db.execute("UPDATE goals SET sync_status='local'");
  await db.execute("UPDATE active_plan SET sync_status='local'");
  await db.execute("UPDATE training_plans SET sync_status='local' WHERE is_builtin = 0");
  await syncToCloud(db);
}

async function pushDirtyRuns(db: Database, userId: string): Promise<void> {
  const dirty = await db.select<Run[]>("SELECT * FROM runs WHERE sync_status != 'synced'");
  for (const run of dirty) {
    // Only send columns that exist in user_runs (omit local-only sync_status)
    const { error } = await supabase.from('user_runs').upsert({
      id: run.id,
      user_id: userId,
      date: run.date,
      distance_value: run.distance_value,
      distance_unit: run.distance_unit,
      duration_seconds: run.duration_seconds,
      run_type: run.run_type,
      plan_day_id: run.plan_day_id,
      notes: run.notes,
      source: run.source,
      created_at: run.created_at,
      updated_at: run.updated_at,
      // Health metrics (nullable)
      avg_heart_rate: run.avg_heart_rate,
      max_heart_rate: run.max_heart_rate,
      min_heart_rate: run.min_heart_rate,
      hr_zones: run.hr_zones,
      avg_cadence: run.avg_cadence,
      avg_stride_length_meters: run.avg_stride_length_meters,
      avg_ground_contact_time_ms: run.avg_ground_contact_time_ms,
      avg_vertical_oscillation_cm: run.avg_vertical_oscillation_cm,
      avg_power_watts: run.avg_power_watts,
      max_power_watts: run.max_power_watts,
      elevation_gain_meters: run.elevation_gain_meters,
      elevation_loss_meters: run.elevation_loss_meters,
      vo2_max: run.vo2_max,
      temperature_celsius: run.temperature_celsius,
      humidity_percent: run.humidity_percent,
      weather_condition: run.weather_condition,
      calories: run.calories,
    });
    if (error) {
      console.error('Failed to sync run', run.id, error.message);
    } else {
      // If this run has a GPS route, sync it to user_run_routes as well
      if (run.has_route) {
        try {
          const routes = await db.select<{ id: string; points_json: string; created_at: string }[]>(
            'SELECT id, points_json, created_at FROM run_routes WHERE run_id = $1 LIMIT 1',
            [run.id],
          );
          const route = routes[0];
          if (route) {
            const { error: routeError } = await supabase.from('user_run_routes').upsert({
              id: route.id,
              user_id: userId,
              run_id: run.id,
              points_json: route.points_json,
              created_at: route.created_at,
            });
            if (routeError) {
              console.error('Failed to sync run route', run.id, routeError.message);
            }
          }
        } catch (e) {
          console.error('Error reading local run route for sync', run.id, e);
        }
      }
      await db.execute("UPDATE runs SET sync_status='synced' WHERE id=$1", [run.id]);
    }
  }
}

async function pushDirtyGoals(db: Database, userId: string): Promise<void> {
  const dirty = await db.select<Goal[]>("SELECT * FROM goals WHERE sync_status != 'synced'");
  for (const goal of dirty) {
    const { error } = await supabase.from('user_goals').upsert({
      id: goal.id,
      user_id: userId,
      type: goal.type,
      target_value: goal.target_value,
      target_unit: goal.target_unit,
      start_date: goal.start_date,
      end_date: goal.end_date,
      created_at: goal.created_at,
    });
    if (error) {
      console.error('Failed to sync goal', goal.id, error.message);
    } else {
      await db.execute("UPDATE goals SET sync_status='synced' WHERE id=$1", [goal.id]);
    }
  }
}

async function pushDirtyActivePlan(db: Database, userId: string): Promise<void> {
  const dirty = await db.select<ActivePlan[]>("SELECT * FROM active_plan WHERE sync_status != 'synced'");
  for (const ap of dirty) {
    // If this is being set as active, deactivate all other active plans for this user first
    if (ap.is_active) {
      await supabase
        .from('active_plans')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);
      
      // Ensure the plan and its plan_days exist in Supabase (for built-in plans)
      await ensurePlanInSupabase(db, ap.plan_id, userId);
    }
    
    // Fetch plan details to denormalize into active_plans
    const plan = await getPlanById(db, ap.plan_id);
    const planDays = plan ? await getPlanDays(db, ap.plan_id) : [];
    
    // Convert plan_days to JSON
    const planDaysJson = planDays.map(pd => ({
      id: pd.id,
      week_number: pd.week_number,
      day_of_week: pd.day_of_week,
      activity_type: pd.activity_type,
      distance_value: pd.distance_value,
      distance_unit: pd.distance_unit,
      duration_minutes: pd.duration_minutes,
      description: pd.description,
      workout_segments: pd.workout_segments,
    }));
    
    const { error } = await supabase.from('active_plans').upsert({
      id: ap.id,
      user_id: userId,
      plan_id: ap.plan_id,
      start_date: ap.start_date,
      is_active: ap.is_active,
      created_at: ap.created_at,
      // Denormalized plan data
      plan_name: plan?.name ?? null,
      plan_description: plan?.description ?? null,
      race_type: plan?.race_type ?? null,
      difficulty: plan?.difficulty ?? null,
      duration_weeks: plan?.duration_weeks ?? null,
      plan_days_json: planDaysJson.length > 0 ? planDaysJson : null,
    });
    if (error) {
      console.error('Failed to sync active plan', ap.id, error.message);
    } else {
      await db.execute("UPDATE active_plan SET sync_status='synced' WHERE id=$1", [ap.id]);
    }
  }
}

/**
 * Ensures a training plan and its plan_days exist in Supabase.
 * This is needed for built-in plans so friends can view them.
 */
async function ensurePlanInSupabase(db: Database, planId: string, userId: string): Promise<void> {
  // Check if plan exists in Supabase
  const { data: existingPlan } = await supabase
    .from('training_plans')
    .select('id')
    .eq('id', planId)
    .maybeSingle();
  
  if (existingPlan) {
    // Plan exists, check if plan_days exist
    const { data: existingDays } = await supabase
      .from('plan_days')
      .select('id')
      .eq('plan_id', planId)
      .limit(1);
    
    if (existingDays && existingDays.length > 0) {
      // Plan and days already exist, nothing to do
      return;
    }
  }
  
  // Plan or plan_days don't exist, fetch from local DB and sync
  const localPlan = await db.select<TrainingPlan[]>(
    'SELECT * FROM training_plans WHERE id = $1',
    [planId],
  );
  
  if (localPlan.length === 0) return;
  
  const plan = localPlan[0];
  
  // Upsert the plan (built-in plans have user_id = null)
  const { error: planError } = await supabase.from('training_plans').upsert({
    id: plan.id,
    user_id: plan.is_builtin ? null : userId,
    name: plan.name,
    description: plan.description,
    race_type: plan.race_type,
    difficulty: plan.difficulty,
    duration_weeks: plan.duration_weeks,
    is_builtin: plan.is_builtin === 1,
    created_at: plan.created_at,
  });
  
  if (planError) {
    console.error('Failed to sync plan to Supabase', plan.id, planError.message);
    return;
  }
  
  // Fetch plan_days from local DB
  const localDays = await db.select<PlanDay[]>(
    'SELECT * FROM plan_days WHERE plan_id = $1',
    [planId],
  );
  
  // Upsert all plan_days
  for (const day of localDays) {
    const { error: dayError } = await supabase.from('plan_days').upsert({
      id: day.id,
      plan_id: day.plan_id,
      week_number: day.week_number,
      day_of_week: day.day_of_week,
      activity_type: day.activity_type,
      distance_value: day.distance_value,
      distance_unit: day.distance_unit,
      duration_minutes: day.duration_minutes,
      description: day.description,
      workout_segments: day.workout_segments ?? null,
    });
    
    if (dayError) {
      console.error('Failed to sync plan_day to Supabase', day.id, dayError.message);
    }
  }
}

async function pushDirtyCustomPlans(db: Database, userId: string): Promise<void> {
  const dirty = await db.select<TrainingPlan[]>(
    "SELECT * FROM training_plans WHERE sync_status != 'synced' AND is_builtin = 0",
  );
  for (const plan of dirty) {
    const { error } = await supabase.from('training_plans').upsert({
      id: plan.id,
      user_id: userId,
      name: plan.name,
      description: plan.description,
      race_type: plan.race_type,
      difficulty: plan.difficulty,
      duration_weeks: plan.duration_weeks,
      is_builtin: false,
      created_at: plan.created_at,
    });
    if (error) {
      console.error('Failed to sync plan', plan.id, error.message);
    } else {
      // Sync plan_days for this custom plan
      const planDays = await db.select<PlanDay[]>(
        'SELECT * FROM plan_days WHERE plan_id = $1',
        [plan.id],
      );
      
      for (const day of planDays) {
        const { error: dayError } = await supabase.from('plan_days').upsert({
          id: day.id,
          plan_id: day.plan_id,
          week_number: day.week_number,
          day_of_week: day.day_of_week,
          activity_type: day.activity_type,
          distance_value: day.distance_value,
          distance_unit: day.distance_unit,
          duration_minutes: day.duration_minutes,
          description: day.description,
          workout_segments: day.workout_segments ?? null,
        });
        
        if (dayError) {
          console.error('Failed to sync plan_day', day.id, dayError.message);
        }
      }
      
      await db.execute("UPDATE training_plans SET sync_status='synced' WHERE id=$1", [plan.id]);
    }
  }
}

/** Pull remote data that doesn't exist locally (e.g. from another device) */
export async function pullFromCloud(db: Database): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  // Pull runs
  const { data: remoteRuns } = await supabase
    .from('user_runs')
    .select('*')
    .eq('user_id', session.user.id);

  if (remoteRuns) {
    for (const run of remoteRuns) {
      const existing = await db.select<Run[]>('SELECT id FROM runs WHERE id=$1', [run.id]);
      if (existing.length === 0) {
        await db.execute(
          `INSERT INTO runs
            (id, date, distance_value, distance_unit, duration_seconds, run_type,
             plan_day_id, notes, source,
             avg_heart_rate, max_heart_rate, min_heart_rate, hr_zones,
             avg_cadence, avg_stride_length_meters, avg_ground_contact_time_ms, avg_vertical_oscillation_cm,
             avg_power_watts, max_power_watts,
             elevation_gain_meters, elevation_loss_meters,
             vo2_max,
             temperature_celsius, humidity_percent, weather_condition,
             calories, has_route,
             created_at, updated_at, sync_status)
           VALUES (
             $1,$2,$3,$4,$5,$6,
             $7,$8,$9,
             $10,$11,$12,$13,
             $14,$15,$16,$17,
             $18,$19,
             $20,$21,
             $22,
             $23,$24,$25,
             $26,$27,
             $28,$29,'synced'
           )`,
          [
            run.id,
            run.date,
            run.distance_value,
            run.distance_unit,
            run.duration_seconds,
            run.run_type,
            run.plan_day_id,
            run.notes,
            run.source,
            // metrics (may be undefined)
            run.avg_heart_rate ?? null,
            run.max_heart_rate ?? null,
            run.min_heart_rate ?? null,
            run.hr_zones ?? null,
            run.avg_cadence ?? null,
            run.avg_stride_length_meters ?? null,
            run.avg_ground_contact_time_ms ?? null,
            run.avg_vertical_oscillation_cm ?? null,
            run.avg_power_watts ?? null,
            run.max_power_watts ?? null,
            run.elevation_gain_meters ?? null,
            run.elevation_loss_meters ?? null,
            run.vo2_max ?? null,
            run.temperature_celsius ?? null,
            run.humidity_percent ?? null,
            run.weather_condition ?? null,
            run.calories ?? null,
            0, // has_route is local-only for now
            run.created_at,
            run.updated_at,
          ],
        );
      }
    }
  }

  // Pull GPS routes
  const { data: remoteRoutes } = await supabase
    .from('user_run_routes')
    .select('*')
    .eq('user_id', session.user.id);

  if (remoteRoutes) {
    for (const route of remoteRoutes as { id: string; run_id: string; points_json: string; created_at: string }[]) {
      const existingRoute = await db.select<{ id: string }[]>(
        'SELECT id FROM run_routes WHERE id = $1',
        [route.id],
      );
      if (existingRoute.length === 0) {
        // Only insert route if the corresponding run exists locally
        const runExists = await db.select<Run[]>(
          'SELECT id FROM runs WHERE id = $1',
          [route.run_id],
        );
        if (runExists.length === 0) continue;

        await db.execute(
          'INSERT INTO run_routes (id, run_id, points_json, created_at) VALUES ($1,$2,$3,$4)',
          [route.id, route.run_id, route.points_json, route.created_at],
        );

        // Mark the run as having a route
        await db.execute(
          'UPDATE runs SET has_route = 1 WHERE id = $1',
          [route.run_id],
        );
      }
    }
  }

  // Pull active plan (only one should be active per user)
  const { data: remoteActivePlan } = await supabase
    .from('active_plans')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (remoteActivePlan) {
    // Deactivate local active plans first
    await db.execute("UPDATE active_plan SET is_active = 0");
    
    // Check if this plan already exists locally
    const existing = await db.select<ActivePlan[]>(
      'SELECT * FROM active_plan WHERE id = $1',
      [remoteActivePlan.id],
    );
    
    if (existing.length > 0) {
      // Update existing
      await db.execute(
        "UPDATE active_plan SET plan_id=$1, start_date=$2, is_active=1, sync_status='synced' WHERE id=$3",
        [remoteActivePlan.plan_id, remoteActivePlan.start_date, remoteActivePlan.id],
      );
    } else {
      // Insert new
      await db.execute(
        `INSERT INTO active_plan (id, plan_id, start_date, is_active, created_at, sync_status)
         VALUES ($1,$2,$3,1,$4,'synced')`,
        [remoteActivePlan.id, remoteActivePlan.plan_id, remoteActivePlan.start_date, remoteActivePlan.created_at],
      );
    }
  } else {
    // No active plan in cloud, deactivate local ones
    await db.execute("UPDATE active_plan SET is_active = 0");
  }
}

