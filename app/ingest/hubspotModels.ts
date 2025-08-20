import {
  IngestPipeline,
  Key,
  OlapTable,
  DeadLetterModel,
  ClickHouseEngines,
} from "@514labs/moose-lib";

/**
 * HubSpot Deals Data Pipeline: Raw → Processed
 * HubSpot API → Raw Deal Data → Transform → Normalized Deal Data → ClickHouse Tables
 */

/** =======Data Models========= */

/** Raw HubSpot deal data directly from API */
export interface HubSpotDealRaw {
  id: Key<string>; // HubSpot deal ID
  properties: HubSpotDealProperties; // Flexible properties object
  createdAt: string; // ISO timestamp from HubSpot
  updatedAt: string; // ISO timestamp from HubSpot  
  archived: boolean; // Whether deal is archived
  associations: HubSpotDealAssociations; // Associated contacts/companies
}

/** HubSpot deal properties (flexible structure) */
export interface HubSpotDealProperties {
  // Use Record type to allow any property to be missing, null, or string
  [key: string]: string | null | undefined;
}

/** HubSpot deal associations */
export interface HubSpotDealAssociations {
  contacts: string[]; // Contact IDs (empty array if none)
  companies: string[]; // Company IDs (empty array if none)
}

/** Processed/normalized HubSpot deal data */
export interface HubSpotDeal {
  id: Key<string>; // Deal ID
  dealName: string; // Deal name
  amount: number; // Parsed amount
  currency: string; // Deal currency
  stage: string; // Deal stage
  stageLabel: string; // Human readable stage
  pipeline: string; // Pipeline ID
  pipelineLabel: string; // Pipeline name
  dealType?: string; // Deal type
  closeDate?: Date; // Close date
  createdAt: Date; // Created timestamp
  lastModifiedAt: Date; // Last modified timestamp
  ownerId?: string; // Owner ID
  stageProbability: number; // Stage probability (0-1)
  forecastAmount: number; // Forecast amount
  projectedAmount: number; // Projected amount
  daysToClose?: number; // Days to close (calculated)
  isWon: boolean; // Whether deal is won
  isClosed: boolean; // Whether deal is closed
  isArchived: boolean; // Whether deal is archived
  contactCount: number; // Number of associated contacts
  noteCount: number; // Number of notes
  associatedContacts: string[]; // Associated contact IDs (empty array if none)
  associatedCompanies: string[]; // Associated company IDs (empty array if none)
  customProperties: Record<string, any>; // Custom properties
}

/** =======Pipeline Configuration========= */

export const hubspotDeadLetterTable = new OlapTable<DeadLetterModel>("HubSpotDealDeadLetter", {
  orderByFields: ["failedAt"],
});

/** Raw HubSpot deal ingestion */
export const HubSpotDealRawPipeline = new IngestPipeline<HubSpotDealRaw>("HubSpotDealRaw", {
  table: false, // Store raw data for auditing
  stream: true, // Buffer raw records for processing
  ingest: true, // POST /ingest/HubSpotDealRaw
  deadLetterQueue: {
    destination: hubspotDeadLetterTable,
  },
});

/** Processed HubSpot deal storage */
// export const HubSpotDealPipeline = new IngestPipeline<HubSpotDeal>("HubSpotDeal", {
//   table: {engine: ClickHouseEngines.ReplacingMergeTree, orderByFields: ["id", "createdAt", "amount", "dealName"]}, // Store processed data in ClickHouse
//   stream: true, // Buffer processed records
//   ingest: false, // No direct API; only derived from raw data
//   deadLetterQueue: {
//     destination: hubspotDeadLetterTable,
//   },
// });

export const HubSpotDealPipeline = new IngestPipeline<HubSpotDeal>("HubSpotDeal", {
  table: {engine: ClickHouseEngines.MergeTree, orderByFields: ["id"]}, // Store processed data in ClickHouse
  stream: true, // Buffer processed records
  ingest: false, // No direct API; only derived from raw data
  deadLetterQueue: {
    destination: hubspotDeadLetterTable,
  },
});
