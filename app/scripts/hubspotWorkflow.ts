import { Task, Workflow } from "@514labs/moose-lib";
import { syncHubSpotDeals } from "./hubspotSync";

/**
 * HubSpot Data Sync Workflow
 * 
 * Scheduled workflow that syncs deals data from HubSpot API using the connector
 * to the Moose ingestion pipeline with automatic rate limiting and error handling
 */

// Task to sync HubSpot deals data using the connector
export const syncHubSpotDealsTask = new Task<null, void>("syncHubSpotDeals", {
  run: async () => {
    console.log("🔄 Starting HubSpot deals sync workflow with connector...");
    
    // Validate environment variables
    if (!process.env.HUBSPOT_TOKEN) {
      throw new Error("HUBSPOT_TOKEN environment variable is required");
    }
    
    try {
      const startTime = Date.now();
      await syncHubSpotDeals();
      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`✅ HubSpot deals sync completed successfully in ${duration}s`);
    } catch (error) {
      console.error("❌ HubSpot deals sync failed:", error);
      throw error; // Re-throw to mark task as failed
    }
  },
  retries: 3,
  timeout: "20m", // Increased timeout since connector handles rate limiting
});

// Workflow definition with scheduling
export const hubspotDataSyncWorkflow = new Workflow("hubspotDataSync", {
  startingTask: syncHubSpotDealsTask,
  retries: 2,
  timeout: "25m", // Overall workflow timeout
  //schedule: "@every 30m", // Run every 30 minutes (recommended for production)
});

// console.log("📋 HubSpot Data Sync Workflow registered");
// console.log("⏰ Schedule: Every 30 minutes (configurable)");
// console.log("🎯 Target: /ingest/HubSpotDealRaw");
