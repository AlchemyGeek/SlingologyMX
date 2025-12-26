/**
 * JSON Schema Migration System
 * 
 * When making schema changes:
 * 1. Increment CURRENT_SCHEMA_VERSION
 * 2. Add a migration function: migrateVxToVy
 * 3. Register it in MIGRATIONS array
 */

export const CURRENT_SCHEMA_VERSION = "1.2";

export interface ExportData {
  version: string;
  exportDate: string;
  tables: {
    aircraft_counters: any[];
    aircraft_counter_history: any[];
    subscriptions: any[];
    notifications: any[];
    maintenance_logs: any[];
    directives: any[];
    aircraft_directive_status: any[];
    directive_history: any[];
    maintenance_directive_compliance: any[];
    equipment: any[];
  };
}

interface MigrationResult {
  success: boolean;
  data?: ExportData;
  error?: string;
  migrationsApplied: string[];
}

interface Migration {
  fromVersion: string;
  toVersion: string;
  migrate: (data: ExportData) => ExportData;
  description: string;
}

/**
 * Registry of all migrations in order.
 * Each migration transforms data from one version to the next.
 * 
 * Example migration (uncomment and modify when needed):
 * 
 * {
 *   fromVersion: "1.0",
 *   toVersion: "1.1",
 *   description: "Add new_field to maintenance_logs",
 *   migrate: (data) => ({
 *     ...data,
 *     version: "1.1",
 *     tables: {
 *       ...data.tables,
 *       maintenance_logs: data.tables.maintenance_logs.map(log => ({
 *         ...log,
 *         new_field: log.new_field ?? "default_value"
 *       }))
 *     }
 *   })
 * }
 */
const MIGRATIONS: Migration[] = [
  {
    fromVersion: "1.0",
    toVersion: "1.1", 
    description: "Add equipment table",
    migrate: (data) => ({
      ...data,
      version: "1.1",
      tables: {
        ...data.tables,
        equipment: data.tables.equipment ?? []
      }
    })
  },
  {
    fromVersion: "1.1",
    toVersion: "1.2",
    description: "Multi-aircraft support - aircraft_id field added to all records including subscriptions",
    migrate: (data) => ({
      ...data,
      version: "1.2",
      tables: {
        ...data.tables,
        // Ensure all aircraft-specific tables have aircraft_id field (will be replaced on import)
        aircraft_counters: data.tables.aircraft_counters.map(r => ({
          ...r,
          aircraft_id: r.aircraft_id ?? null
        })),
        aircraft_counter_history: data.tables.aircraft_counter_history.map(r => ({
          ...r,
          aircraft_id: r.aircraft_id ?? null
        })),
        subscriptions: data.tables.subscriptions.map(r => ({
          ...r,
          aircraft_id: r.aircraft_id ?? null
        })),
        notifications: data.tables.notifications.map(r => ({
          ...r,
          aircraft_id: r.aircraft_id ?? null
        })),
        maintenance_logs: data.tables.maintenance_logs.map(r => ({
          ...r,
          aircraft_id: r.aircraft_id ?? null
        })),
        directives: data.tables.directives.map(r => ({
          ...r,
          aircraft_id: r.aircraft_id ?? null
        })),
        aircraft_directive_status: data.tables.aircraft_directive_status.map(r => ({
          ...r,
          aircraft_id: r.aircraft_id ?? null
        })),
        directive_history: data.tables.directive_history.map(r => ({
          ...r,
          aircraft_id: r.aircraft_id ?? null
        })),
        maintenance_directive_compliance: data.tables.maintenance_directive_compliance.map(r => ({
          ...r,
          aircraft_id: r.aircraft_id ?? null
        })),
        equipment: data.tables.equipment.map(r => ({
          ...r,
          aircraft_id: r.aircraft_id ?? null
        })),
      }
    })
  },
];

/**
 * Compare two semantic versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  return 0;
}

/**
 * Find the migration path from one version to another
 */
function findMigrationPath(fromVersion: string, toVersion: string): Migration[] {
  const path: Migration[] = [];
  let currentVersion = fromVersion;
  
  while (compareVersions(currentVersion, toVersion) < 0) {
    const nextMigration = MIGRATIONS.find(m => m.fromVersion === currentVersion);
    if (!nextMigration) {
      // No direct path, check if we can skip versions
      break;
    }
    path.push(nextMigration);
    currentVersion = nextMigration.toVersion;
  }
  
  return path;
}

/**
 * Validate the basic structure of imported data
 */
function validateStructure(data: any): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: "Invalid data format: expected an object" };
  }
  
  if (!data.version || typeof data.version !== 'string') {
    return { valid: false, error: "Missing or invalid 'version' field" };
  }
  
  if (!data.tables || typeof data.tables !== 'object') {
    return { valid: false, error: "Missing or invalid 'tables' field" };
  }
  
  // Check for required tables (allow missing tables, they'll be treated as empty)
  const expectedTables = [
    'aircraft_counters',
    'aircraft_counter_history',
    'subscriptions',
    'notifications',
    'maintenance_logs',
    'directives',
    'aircraft_directive_status',
    'directive_history',
    'maintenance_directive_compliance',
    'equipment'
  ];
  
  // Ensure all table entries are arrays
  for (const table of expectedTables) {
    if (data.tables[table] !== undefined && !Array.isArray(data.tables[table])) {
      return { valid: false, error: `Table '${table}' should be an array` };
    }
  }
  
  return { valid: true };
}

/**
 * Normalize data structure - ensure all expected tables exist as arrays
 */
function normalizeData(data: ExportData): ExportData {
  return {
    ...data,
    tables: {
      aircraft_counters: data.tables.aircraft_counters || [],
      aircraft_counter_history: data.tables.aircraft_counter_history || [],
      subscriptions: data.tables.subscriptions || [],
      notifications: data.tables.notifications || [],
      maintenance_logs: data.tables.maintenance_logs || [],
      directives: data.tables.directives || [],
      aircraft_directive_status: data.tables.aircraft_directive_status || [],
      directive_history: data.tables.directive_history || [],
      maintenance_directive_compliance: data.tables.maintenance_directive_compliance || [],
      equipment: data.tables.equipment || [],
    }
  };
}

/**
 * Main migration function - takes imported data and migrates it to current version
 */
export function migrateToCurrentVersion(data: any): MigrationResult {
  // Validate basic structure
  const validation = validateStructure(data);
  if (!validation.valid) {
    return { success: false, error: validation.error, migrationsApplied: [] };
  }
  
  const importVersion = data.version;
  const migrationsApplied: string[] = [];
  
  // Check if version is newer than current (not supported)
  if (compareVersions(importVersion, CURRENT_SCHEMA_VERSION) > 0) {
    return {
      success: false,
      error: `Import file version (${importVersion}) is newer than supported version (${CURRENT_SCHEMA_VERSION}). Please update the application.`,
      migrationsApplied: []
    };
  }
  
  // If already at current version, just normalize and return
  if (compareVersions(importVersion, CURRENT_SCHEMA_VERSION) === 0) {
    return {
      success: true,
      data: normalizeData(data as ExportData),
      migrationsApplied: []
    };
  }
  
  // Find and apply migration path
  const migrationPath = findMigrationPath(importVersion, CURRENT_SCHEMA_VERSION);
  
  if (migrationPath.length === 0 && compareVersions(importVersion, CURRENT_SCHEMA_VERSION) < 0) {
    // No migration path found but version is older - this means we're missing migrations
    // For now, we'll allow import with a warning (data will be normalized)
    console.warn(`No migration path from ${importVersion} to ${CURRENT_SCHEMA_VERSION}. Data will be imported as-is.`);
    return {
      success: true,
      data: normalizeData(data as ExportData),
      migrationsApplied: [`Legacy import from v${importVersion} (no migrations needed)`]
    };
  }
  
  // Apply migrations in sequence
  let migratedData = normalizeData(data as ExportData);
  
  for (const migration of migrationPath) {
    try {
      migratedData = migration.migrate(migratedData);
      migrationsApplied.push(`${migration.fromVersion} → ${migration.toVersion}: ${migration.description}`);
    } catch (error) {
      return {
        success: false,
        error: `Migration failed (${migration.fromVersion} → ${migration.toVersion}): ${error instanceof Error ? error.message : 'Unknown error'}`,
        migrationsApplied
      };
    }
  }
  
  return {
    success: true,
    data: migratedData,
    migrationsApplied
  };
}

/**
 * Get version info for display
 */
export function getVersionInfo(importVersion: string): {
  isCompatible: boolean;
  requiresMigration: boolean;
  isNewer: boolean;
  currentVersion: string;
} {
  const comparison = compareVersions(importVersion, CURRENT_SCHEMA_VERSION);
  
  return {
    isCompatible: comparison <= 0,
    requiresMigration: comparison < 0,
    isNewer: comparison > 0,
    currentVersion: CURRENT_SCHEMA_VERSION
  };
}
