import { ConsumptionApi } from "@514labs/moose-lib";
import { tags } from "typia";

// This file provides consumption APIs for HubSpot deals analytics

interface HubSpotDealsAnalyticsQueryParams {
  groupBy?: "stage" | "pipeline" | "month"; // How to group the results
  limit?: number; // Maximum number of results
  includeArchived?: boolean; // Include archived deals
  currency?: string; // Filter by currency
}

interface HubSpotDealAnalyticsData {
  groupField: string; // The grouping field value
  groupLabel: string; // Human readable label
  dealCount: number; // Number of deals
  totalAmount: number; // Total deal value
  avgAmount: number; // Average deal size
  wonAmount: number; // Total won amount
  wonCount: number; // Number of won deals
  winRate: number; // Win rate percentage
  avgDaysToClose?: number; // Average days to close
}

interface HubSpotDealLookupQueryParams {
  dealId?: string; // Look up by deal ID
  dealName?: string; // Search by deal name
  ownerId?: string; // Filter by owner
  stage?: string; // Filter by stage
  limit?: number; // Maximum results
}

interface HubSpotDealData {
  id: string;
  dealName: string;
  amount: number;
  currency: string;
  stage: string;
  stageLabel: string;
  pipeline: string;
  pipelineLabel: string;
  closeDate?: string;
  createdAt: string;
  ownerId?: string;
  isWon: boolean;
  isClosed: boolean;
  contactCount: number;
  associatedContacts: string[];
  associatedCompanies: string[];
}

// HubSpot Deals Analytics API
export const HubSpotDealsAnalyticsApi = new ConsumptionApi<
  HubSpotDealsAnalyticsQueryParams,
  HubSpotDealAnalyticsData[]
>("hubspot-deals-analytics", async (
  { groupBy = "stage", limit = 10, includeArchived = false, currency },
  { client, sql },
) => {


  // Build query based on groupBy parameter
  let query;
  
  if (groupBy === "pipeline") {
    if (currency) {
      query = sql`
        SELECT 
          pipeline as groupField,
          pipelineLabel as groupLabel,
          count(*) as dealCount,
          sum(amount) as totalAmount,
          avg(amount) as avgAmount,
          sum(case when isWon then amount else 0 end) as wonAmount,
          count(case when isWon then 1 end) as wonCount,
          round(count(case when isWon then 1 end) * 100.0 / count(*), 2) as winRate,
          avg(daysToClose) as avgDaysToClose
        FROM HubSpotDeal FINAL
        WHERE isArchived = ${includeArchived} AND currency = ${currency}
        GROUP BY pipeline, pipelineLabel
        ORDER BY totalAmount DESC
        LIMIT ${limit}
      `;
    } else {
      query = sql`
        SELECT 
          pipeline as groupField,
          pipelineLabel as groupLabel,
          count(*) as dealCount,
          sum(amount) as totalAmount,
          avg(amount) as avgAmount,
          sum(case when isWon then amount else 0 end) as wonAmount,
          count(case when isWon then 1 end) as wonCount,
          round(count(case when isWon then 1 end) * 100.0 / count(*), 2) as winRate,
          avg(daysToClose) as avgDaysToClose
        FROM HubSpotDeal FINAL
        WHERE isArchived = ${includeArchived}
        GROUP BY pipeline, pipelineLabel
        ORDER BY totalAmount DESC
        LIMIT ${limit}
      `;
    }
  } else if (groupBy === "month") {
    if (currency) {
      query = sql`
        SELECT 
          toYYYYMM(createdAt) as groupField,
          formatDateTime(createdAt, '%Y-%m') as groupLabel,
          count(*) as dealCount,
          sum(amount) as totalAmount,
          avg(amount) as avgAmount,
          sum(case when isWon then amount else 0 end) as wonAmount,
          count(case when isWon then 1 end) as wonCount,
          round(count(case when isWon then 1 end) * 100.0 / count(*), 2) as winRate,
          avg(daysToClose) as avgDaysToClose
        FROM HubSpotDeal FINAL
        WHERE isArchived = ${includeArchived} AND currency = ${currency}
        GROUP BY toYYYYMM(createdAt), formatDateTime(createdAt, '%Y-%m')
        ORDER BY groupField DESC
        LIMIT ${limit}
      `;
    } else {
      query = sql`
        SELECT 
          toYYYYMM(createdAt) as groupField,
          formatDateTime(createdAt, '%Y-%m') as groupLabel,
          count(*) as dealCount,
          sum(amount) as totalAmount,
          avg(amount) as avgAmount,
          sum(case when isWon then amount else 0 end) as wonAmount,
          count(case when isWon then 1 end) as wonCount,
          round(count(case when isWon then 1 end) * 100.0 / count(*), 2) as winRate,
          avg(daysToClose) as avgDaysToClose
        FROM HubSpotDeal FINAL
        WHERE isArchived = ${includeArchived}
        GROUP BY toYYYYMM(createdAt), formatDateTime(createdAt, '%Y-%m')
        ORDER BY groupField DESC
        LIMIT ${limit}
      `;
    }
  } else {
    if (currency) {
      query = sql`
        SELECT 
          stage as groupField,
          stageLabel as groupLabel,
          count(*) as dealCount,
          sum(amount) as totalAmount,
          avg(amount) as avgAmount,
          sum(case when isWon then amount else 0 end) as wonAmount,
          count(case when isWon then 1 end) as wonCount,
          round(count(case when isWon then 1 end) * 100.0 / count(*), 2) as winRate,
          avg(daysToClose) as avgDaysToClose
        FROM HubSpotDeal FINAL
        WHERE isArchived = ${includeArchived} AND currency = ${currency}
        GROUP BY stage, stageLabel
        ORDER BY totalAmount DESC
        LIMIT ${limit}
      `;
    } else {
      query = sql`
        SELECT 
          stage as groupField,
          stageLabel as groupLabel,
          count(*) as dealCount,
          sum(amount) as totalAmount,
          avg(amount) as avgAmount,
          sum(case when isWon then amount else 0 end) as wonAmount,
          count(case when isWon then 1 end) as wonCount,
          round(count(case when isWon then 1 end) * 100.0 / count(*), 2) as winRate,
          avg(daysToClose) as avgDaysToClose
        FROM HubSpotDeal FINAL
        WHERE isArchived = ${includeArchived}
        GROUP BY stage, stageLabel
        ORDER BY totalAmount DESC
        LIMIT ${limit}
      `;
    }
  }

  const data = await client.query.execute<HubSpotDealAnalyticsData>(query);
  const result: HubSpotDealAnalyticsData[] = await data.json();

  return result;
});

// HubSpot Deal Lookup API
export const HubSpotDealLookupApi = new ConsumptionApi<
  HubSpotDealLookupQueryParams,
  HubSpotDealData[]
>("hubspot-deal-lookup", async (
  { dealId, dealName, ownerId, stage, limit = 20 },
  { client, sql },
) => {


  // Build query with dynamic WHERE conditions
  let query;
  
  if (dealId) {
    query = sql`
      SELECT 
        id, dealName, amount, currency, stage, stageLabel, pipeline, pipelineLabel,
        closeDate, createdAt, ownerId, isWon, isClosed, contactCount,
        associatedContacts, associatedCompanies
      FROM HubSpotDeal FINAL
      WHERE id = ${dealId}
      ORDER BY lastModifiedAt DESC
      LIMIT ${limit}
    `;
  } else if (dealName && ownerId && stage) {
    query = sql`
      SELECT 
        id, dealName, amount, currency, stage, stageLabel, pipeline, pipelineLabel,
        closeDate, createdAt, ownerId, isWon, isClosed, contactCount,
        associatedContacts, associatedCompanies
      FROM HubSpotDeal FINAL
      WHERE dealName ILIKE ${`%${dealName}%`} AND ownerId = ${ownerId} AND stage = ${stage}
      ORDER BY lastModifiedAt DESC
      LIMIT ${limit}
    `;
  } else if (dealName && ownerId) {
    query = sql`
      SELECT 
        id, dealName, amount, currency, stage, stageLabel, pipeline, pipelineLabel,
        closeDate, createdAt, ownerId, isWon, isClosed, contactCount,
        associatedContacts, associatedCompanies
      FROM HubSpotDeal FINAL
      WHERE dealName ILIKE ${`%${dealName}%`} AND ownerId = ${ownerId}
      ORDER BY lastModifiedAt DESC
      LIMIT ${limit}
    `;
  } else if (dealName && stage) {
    query = sql`
      SELECT 
        id, dealName, amount, currency, stage, stageLabel, pipeline, pipelineLabel,
        closeDate, createdAt, ownerId, isWon, isClosed, contactCount,
        associatedContacts, associatedCompanies
      FROM HubSpotDeal FINAL
      WHERE dealName ILIKE ${`%${dealName}%`} AND stage = ${stage}
      ORDER BY lastModifiedAt DESC
      LIMIT ${limit}
    `;
  } else if (dealName) {
    query = sql`
      SELECT 
        id, dealName, amount, currency, stage, stageLabel, pipeline, pipelineLabel,
        closeDate, createdAt, ownerId, isWon, isClosed, contactCount,
        associatedContacts, associatedCompanies
      FROM HubSpotDeal FINAL
      WHERE dealName ILIKE ${`%${dealName}%`}
      ORDER BY lastModifiedAt DESC
      LIMIT ${limit}
    `;
  } else if (ownerId && stage) {
    query = sql`
      SELECT 
        id, dealName, amount, currency, stage, stageLabel, pipeline, pipelineLabel,
        closeDate, createdAt, ownerId, isWon, isClosed, contactCount,
        associatedContacts, associatedCompanies
      FROM HubSpotDeal FINAL
      WHERE ownerId = ${ownerId} AND stage = ${stage}
      ORDER BY lastModifiedAt DESC
      LIMIT ${limit}
    `;
  } else if (ownerId) {
    query = sql`
      SELECT 
        id, dealName, amount, currency, stage, stageLabel, pipeline, pipelineLabel,
        closeDate, createdAt, ownerId, isWon, isClosed, contactCount,
        associatedContacts, associatedCompanies
      FROM HubSpotDeal FINAL
      WHERE ownerId = ${ownerId}
      ORDER BY lastModifiedAt DESC
      LIMIT ${limit}
    `;
  } else if (stage) {
    query = sql`
      SELECT 
        id, dealName, amount, currency, stage, stageLabel, pipeline, pipelineLabel,
        closeDate, createdAt, ownerId, isWon, isClosed, contactCount,
        associatedContacts, associatedCompanies
      FROM HubSpotDeal FINAL
      WHERE stage = ${stage}
      ORDER BY lastModifiedAt DESC
      LIMIT ${limit}
    `;
  } else {
    query = sql`
      SELECT 
        id, dealName, amount, currency, stage, stageLabel, pipeline, pipelineLabel,
        closeDate, createdAt, ownerId, isWon, isClosed, contactCount,
        associatedContacts, associatedCompanies
      FROM HubSpotDeal FINAL
      ORDER BY lastModifiedAt DESC
      LIMIT ${limit}
    `;
  }

  const data = await client.query.execute<HubSpotDealData>(query);
  const result: HubSpotDealData[] = await data.json();



  return result;
});

interface HubSpotPipelinePerformanceData {
  pipeline: string;
  pipelineLabel: string;
  totalDeals: number;
  totalValue: number;
  wonDeals: number;
  wonValue: number;
  lostDeals: number;
  avgDaysToClose: number;
  conversionRate: number;
}

// HubSpot Deal Pipeline Performance API
export const HubSpotDealPipelineApi = new ConsumptionApi<
  { daysBack?: number; limit?: number },
  HubSpotPipelinePerformanceData[]
>("hubspot-deal-pipeline", async (
  { daysBack = 30, limit = 10 },
  { client, sql },
): Promise<HubSpotPipelinePerformanceData[]> => {


  const query = sql`
    SELECT 
      pipeline,
      pipelineLabel,
      count(*) as totalDeals,
      sum(amount) as totalValue,
      sum(case when isWon then 1 else 0 end) as wonDeals,
      sum(case when isWon then amount else 0 end) as wonValue,
      sum(case when isClosed and not isWon then 1 else 0 end) as lostDeals,
      avg(case when isClosed then daysToClose end) as avgDaysToClose,
      round(sum(case when isWon then 1 else 0 end) * 100.0 / count(*), 2) as conversionRate
    FROM HubSpotDeal FINAL
    WHERE createdAt >= subtractDays(now(), ${daysBack})
    GROUP BY pipeline, pipelineLabel
    ORDER BY totalValue DESC
    LIMIT ${limit}
  `;

  const data = await client.query.execute<HubSpotPipelinePerformanceData>(query);
  const result: HubSpotPipelinePerformanceData[] = await data.json();



  return result;
});