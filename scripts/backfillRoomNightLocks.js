import { backfillActiveBookingNightLocks } from "../services/bookingLockService";

/**
 * ONE-TIME MIGRATION
 *
 * Temporarily call runRoomNightLockBackfill() while signed in as an authorized
 * admin/developer. Review the console report, then remove the temporary call.
 * Do not run this automatically for every app launch.
 */
export async function runRoomNightLockBackfill() {
  const report = await backfillActiveBookingNightLocks();
  console.log("Room-night lock migration report:", report);
  return report;
}
