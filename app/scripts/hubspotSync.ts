/**
 * HubSpot Data Sync Script
 * 
 * This script connects to HubSpot API using the connector, streams deals data,
 * and sends it to the Moose ingestion pipeline for processing.
 */

import { createHubSpotConnector, type HubSpotConnector } from "connector-hubspot";

interface HubSpotDealRawIngestion {
  id: string;
  properties: Record<string, string>; // Only include non-null properties
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  associations: {
    contacts: string[];
    companies: string[];
  };
}

interface HubSpotDealRawIngestion {
  id: string;
  properties: Record<string, string>; // Only include non-null properties
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  associations: {
    contacts: string[];
    companies: string[];
  };
}

async function syncHubSpotDeals(): Promise<void> {
  const token = process.env.HUBSPOT_TOKEN;
  
  if (!token) {
    throw new Error("HUBSPOT_TOKEN environment variable is required");
  }

  console.log("🚀 Starting HubSpot deals sync...");
  
  try {
    // Initialize and configure the HubSpot connector
    const connector = createHubSpotConnector();
    connector.initialize({
      auth: {
        type: "bearer",
        bearer: { token }
      },
      rateLimit: {
        requestsPerSecond: 10, // HubSpot allows 10 requests per second
        burstCapacity: 10
      }
    });
    
    await connector.connect();
    
    let dealCount = 0;
    let successCount = 0;
    let errorCount = 0;

    const dealProperties = [
      "dealname", "amount", "dealstage", "pipeline", "dealtype",
      "closedate", "createdate", "hs_lastmodifieddate", "hubspot_owner_id",
      "deal_currency_code", "dealstage_label", "pipeline_label",
      "hs_deal_stage_probability", "hs_forecast_amount", "hs_projected_amount",
      "num_associated_contacts", "num_contacted_notes", "days_to_close"
    ];

    console.log("✅ Starting HubSpot deals streaming...");

    // Use the connector to stream deals with automatic pagination and rate limiting
    for await (const deal of connector.streamDeals({ 
      properties: dealProperties,
      pageSize: 100
    })) {
      dealCount++;
      
      try {
        // Clean and sanitize properties - filter out null/undefined and convert to strings
        const cleanProperties: Record<string, string> = {};
        
        // Only include properties that have actual values (not null/undefined/empty)
        for (const [key, value] of Object.entries(deal.properties || {})) {
          if (value !== null && value !== undefined && value !== "") {
            cleanProperties[key] = String(value);
          }
          // Skip null/undefined/empty values completely
        }

        // Transform HubSpot deal to our ingestion format
        const dealData: HubSpotDealRawIngestion = {
          id: deal.id,
          properties: cleanProperties,
          createdAt: deal.createdAt,
          updatedAt: deal.updatedAt,
          archived: deal.archived || false,
          associations: {
            contacts: [], // TODO: Fetch associations separately if needed
            companies: []
          }
        };

        // Send to Moose ingestion endpoint
        const response = await fetch("http://localhost:4000/ingest/HubSpotDealRaw", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dealData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Moose ingestion error ${response.status}: ${errorText}`);
        }

        successCount++;
        
        // Log progress every 50 deals
        if (dealCount % 50 === 0) {
          console.log(`📊 Processed ${dealCount} deals total (${successCount} successful, ${errorCount} errors)`);
        }

      } catch (error) {
        errorCount++;
        console.error(`❌ Error ingesting deal ${deal.id}:`, error);
        continue;
      }
    }
    
    await connector.disconnect();
    
    console.log("✅ HubSpot sync completed!");
    console.log(`📈 Final stats: ${dealCount} total deals processed, ${successCount} deals added, ${errorCount} errors`);

  } catch (error) {
    console.error("💥 HubSpot sync failed:", error);
    throw error;
  }
}

// Export for use in workflows
export { syncHubSpotDeals };
