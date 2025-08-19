import { ConsumptionApi, MooseCache } from "@514labs/moose-lib";
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
  const cache = await MooseCache.get();
  const cacheKey = `hubspot-deals-analytics:${groupBy}:${limit}:${includeArchived}:${currency || 'all'}`;

  // Try cache first
  const cachedData = await cache.get<HubSpotDealAnalyticsData[]>(cacheKey);
  if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
    return cachedData;
  }

  // Build query based on groupBy parameter
  let query;
  
  if (groupBy === "pipeline") {
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
      FROM HubSpotDeal 
      WHERE isArchived = ${includeArchived} ${currency ? sql` AND currency = ${currency}` : sql``}
      GROUP BY pipeline, pipelineLabel
      ORDER BY totalAmount DESC
      LIMIT ${limit}
    `;
  } else if (groupBy === "month") {
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
      FROM HubSpotDeal 
      WHERE isArchived = ${includeArchived} ${currency ? sql` AND currency = ${currency}` : sql``}
      GROUP BY toYYYYMM(createdAt), formatDateTime(createdAt, '%Y-%m')
      ORDER BY groupField DESC
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
      FROM HubSpotDeal 
      WHERE isArchived = ${includeArchived} ${currency ? sql` AND currency = ${currency}` : sql``}
      GROUP BY stage, stageLabel
      ORDER BY totalAmount DESC
      LIMIT ${limit}
    `;
  }

  const data = await client.query.execute<HubSpotDealAnalyticsData>(query);
  const result: HubSpotDealAnalyticsData[] = await data.json();

  // Cache for 30 minutes
  await cache.set(cacheKey, result, 1800);

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
  const cache = await MooseCache.get();
  const cacheKey = `hubspot-deal-lookup:${dealId || ''}:${dealName || ''}:${ownerId || ''}:${stage || ''}:${limit}`;

  // Try cache first
  const cachedData = await cache.get<HubSpotDealData[]>(cacheKey);
  if (cachedData && Array.isArray(cachedData)) {
    return cachedData;
  }

  // Build query with dynamic WHERE conditions
  let query;
  
  if (dealId) {
    query = sql`
      SELECT 
        id, dealName, amount, currency, stage, stageLabel, pipeline, pipelineLabel,
        closeDate, createdAt, ownerId, isWon, isClosed, contactCount,
        associatedContacts, associatedCompanies
      FROM HubSpotDeal 
      WHERE id = ${dealId}
      ORDER BY lastModifiedAt DESC
      LIMIT ${limit}
    `;
  } else if (dealName) {
    query = sql`
      SELECT 
        id, dealName, amount, currency, stage, stageLabel, pipeline, pipelineLabel,
        closeDate, createdAt, ownerId, isWon, isClosed, contactCount,
        associatedContacts, associatedCompanies
      FROM HubSpotDeal 
      WHERE dealName ILIKE ${`%${dealName}%`}
      ${ownerId ? sql` AND ownerId = ${ownerId}` : sql``}
      ${stage ? sql` AND stage = ${stage}` : sql``}
      ORDER BY lastModifiedAt DESC
      LIMIT ${limit}
    `;
  } else {
    query = sql`
      SELECT 
        id, dealName, amount, currency, stage, stageLabel, pipeline, pipelineLabel,
        closeDate, createdAt, ownerId, isWon, isClosed, contactCount,
        associatedContacts, associatedCompanies
      FROM HubSpotDeal 
      WHERE 1=1
      ${ownerId ? sql` AND ownerId = ${ownerId}` : sql``}
      ${stage ? sql` AND stage = ${stage}` : sql``}
      ORDER BY lastModifiedAt DESC
      LIMIT ${limit}
    `;
  }

  const data = await client.query.execute<HubSpotDealData>(query);
  const result: HubSpotDealData[] = await data.json();

  // Cache for 15 minutes (shorter since deal data changes more frequently)
  await cache.set(cacheKey, result, 900);

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
  const cache = await MooseCache.get();
  const cacheKey = `hubspot-deal-pipeline:${daysBack}:${limit}`;

  // Try cache first
  const cachedData = await cache.get<HubSpotPipelinePerformanceData[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

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
    FROM HubSpotDeal 
    WHERE createdAt >= now() - interval ${daysBack} day
    GROUP BY pipeline, pipelineLabel
    ORDER BY totalValue DESC
    LIMIT ${limit}
  `;

  const data = await client.query.execute<HubSpotPipelinePerformanceData>(query);
  const result: HubSpotPipelinePerformanceData[] = await data.json();

  // Cache for 1 hour
  await cache.set(cacheKey, result, 3600);

  return result;
});
