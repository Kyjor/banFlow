import type Database from '@tauri-apps/plugin-sql';
import type { FullBackup, TrainingPlan, PlanDay, Run, Goal, ActivePlan, PlanExportFormat } from '../types';
import { loadSettings } from './settingsService';
import { formatDuration, calcPaceSeconds, formatPace } from '../utils/paceUtils';

const APP_VERSION = '0.1.0';

// ---------------------------------------------------------------------------
// Full JSON Backup
// ---------------------------------------------------------------------------

export async function exportFullBackup(db: Database): Promise<FullBackup> {
  const [settings, plans, days, runs, goals, activePlanRows] = await Promise.all([
    loadSettings(db),
    db.select<TrainingPlan[]>("SELECT * FROM training_plans WHERE is_builtin = 0"),
    db.select<PlanDay[]>("SELECT pd.* FROM plan_days pd JOIN training_plans tp ON tp.id = pd.plan_id WHERE tp.is_builtin = 0"),
    db.select<Run[]>('SELECT * FROM runs ORDER BY date ASC'),
    db.select<Goal[]>('SELECT * FROM goals ORDER BY created_at ASC'),
    db.select<ActivePlan[]>('SELECT * FROM active_plan WHERE is_active = 1 LIMIT 1'),
  ]);

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    app_version: APP_VERSION,
    settings,
    training_plans: plans,
    plan_days: days,
    active_plan: activePlanRows[0] ?? null,
    runs,
    goals,
  };
}

export async function restoreFromBackup(db: Database, backup: FullBackup): Promise<void> {
  if (backup.version !== 1) throw new Error('Unsupported backup version: ' + backup.version);

  // Clear user data (not built-in plans)
  await db.execute("DELETE FROM runs");
  await db.execute("DELETE FROM goals");
  await db.execute("DELETE FROM active_plan");
  await db.execute("DELETE FROM plan_days WHERE plan_id IN (SELECT id FROM training_plans WHERE is_builtin = 0)");
  await db.execute("DELETE FROM training_plans WHERE is_builtin = 0");

  // Restore plans
  for (const plan of backup.training_plans) {
    await db.execute(
      `INSERT OR REPLACE INTO training_plans
        (id, name, race_type, difficulty, description, duration_weeks, is_builtin, created_at, updated_at, sync_status)
       VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,'dirty')`,
      [plan.id, plan.name, plan.race_type, plan.difficulty, plan.description,
       plan.duration_weeks, plan.created_at, plan.updated_at],
    );
  }

  for (const day of backup.plan_days) {
    await db.execute(
      `INSERT OR REPLACE INTO plan_days
        (id, plan_id, week_number, day_of_week, activity_type, distance_value, distance_unit, duration_minutes, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [day.id, day.plan_id, day.week_number, day.day_of_week, day.activity_type,
       day.distance_value, day.distance_unit, day.duration_minutes, day.description],
    );
  }

  // Restore active plan
  if (backup.active_plan) {
    const ap = backup.active_plan;
    await db.execute(
      `INSERT OR REPLACE INTO active_plan (id, plan_id, start_date, is_active, created_at, sync_status)
       VALUES ($1,$2,$3,1,$4,'dirty')`,
      [ap.id, ap.plan_id, ap.start_date, ap.created_at],
    );
  }

  // Restore runs
  for (const run of backup.runs) {
    await db.execute(
      `INSERT OR REPLACE INTO runs
        (id, date, distance_value, distance_unit, duration_seconds, run_type, plan_day_id, notes, source, created_at, updated_at, sync_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'dirty')`,
      [run.id, run.date, run.distance_value, run.distance_unit, run.duration_seconds,
       run.run_type, run.plan_day_id, run.notes, run.source, run.created_at, run.updated_at],
    );
  }

  // Restore goals
  for (const goal of backup.goals) {
    await db.execute(
      `INSERT OR REPLACE INTO goals (id, type, target_value, target_unit, start_date, end_date, created_at, sync_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'dirty')`,
      [goal.id, goal.type, goal.target_value, goal.target_unit, goal.start_date, goal.end_date, goal.created_at],
    );
  }

  // Restore settings
  const { settings } = backup;
  for (const [k, v] of Object.entries(settings)) {
    await db.execute(
      'INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2',
      [k, String(v)],
    );
  }
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

export async function exportRunsCsv(
  db: Database,
  startDate?: string,
  endDate?: string,
): Promise<string> {
  let query = 'SELECT * FROM runs';
  const params: string[] = [];
  if (startDate && endDate) {
    query += ' WHERE date >= $1 AND date <= $2';
    params.push(startDate, endDate);
  } else if (startDate) {
    query += ' WHERE date >= $1';
    params.push(startDate);
  }
  query += ' ORDER BY date ASC';

  const runs = await db.select<Run[]>(query, params);

  const header = 'date,distance,unit,duration,pace,type,planned,notes\n';
  if (runs.length === 0) return header;

  const rows = runs.map(r => {
    const pace = formatPace(calcPaceSeconds(r.distance_value, r.duration_seconds, r.distance_unit), r.distance_unit);
    return [
      r.date,
      r.distance_value,
      r.distance_unit,
      formatDuration(r.duration_seconds),
      `"${pace}"`,
      r.run_type,
      r.plan_day_id ? 'yes' : 'no',
      `"${r.notes.replace(/"/g, '""')}"`,
    ].join(',');
  });

  return header + rows.join('\n');
}

// ---------------------------------------------------------------------------
// Single Plan Export
// ---------------------------------------------------------------------------

export async function exportPlanJson(db: Database, planId: string): Promise<PlanExportFormat> {
  const { exportPlanToFormat } = await import('./planService');
  return exportPlanToFormat(db, planId);
}

export async function importPlanJson(db: Database, data: PlanExportFormat): Promise<string> {
  const { importPlanFromExport } = await import('./planService');
  return importPlanFromExport(db, data);
}

// ---------------------------------------------------------------------------
// Validate backup JSON before restore
// ---------------------------------------------------------------------------

export function validateBackup(raw: unknown): raw is FullBackup {
  if (!raw || typeof raw !== 'object') return false;
  const b = raw as Record<string, unknown>;
  return (
    b['version'] === 1 &&
    typeof b['exported_at'] === 'string' &&
    Array.isArray(b['runs']) &&
    Array.isArray(b['goals'])
  );
}

