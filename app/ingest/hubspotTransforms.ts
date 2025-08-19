import { 
  HubSpotDealRawPipeline, 
  HubSpotDealPipeline, 
  HubSpotDealRaw, 
  HubSpotDeal 
} from "./hubspotModels";

// Transform raw HubSpot deal events to processed/normalized deal events
HubSpotDealRawPipeline.stream!.addTransform(
  HubSpotDealPipeline.stream!,
  async (rawDeal: HubSpotDealRaw): Promise<HubSpotDeal> => {
    /**
     * Transform HubSpot raw deal data to normalized format.
     * 
     * Normal flow:
     * 1. Extract and type properties from flexible HubSpot properties object
     * 2. Convert string values to appropriate types
     * 3. Calculate derived fields (isWon, isClosed, daysToClose)
     * 4. Return normalized deal
     * 
     * Error flow (DLQ):
     * - If transformation fails, deal goes to dead letter queue
     * - Enables monitoring, debugging, and retry strategies
     */

    const props = rawDeal.properties;

    // Extract basic deal information - properties may be missing if they were null in HubSpot
    const dealName = props.dealname || "Untitled Deal";
    const amount = parseFloat(props.amount || "0") || 0;
    const currency = props.deal_currency_code || "USD";
    const stage = props.dealstage || "unknown";
    const stageLabel = props.dealstage_label || stage;
    const pipeline = props.pipeline || "default";
    const pipelineLabel = props.pipeline_label || pipeline;

    // Parse dates with fallbacks - properties may be missing
    const parseDate = (dateStr?: string): Date => {
      if (!dateStr) return new Date();
      try {
        return new Date(dateStr);
      } catch {
        return new Date();
      }
    };

    const createdAt = parseDate(props.createdate || undefined) || new Date(rawDeal.createdAt);
    const lastModifiedAt = parseDate(props.hs_lastmodifieddate || undefined) || new Date(rawDeal.updatedAt);
    const closeDate = props.closedate ? parseDate(props.closedate || undefined) : undefined;

    // Extract owner and metrics - handle null values
    const ownerId = props.hubspot_owner_id;
    const stageProbability = parseFloat(props.hs_deal_stage_probability || "0") || 0;
    const forecastAmount = parseFloat(props.hs_forecast_amount || props.amount || "0") || 0;
    const projectedAmount = parseFloat(props.hs_projected_amount || props.amount || "0") || 0;

    // Calculate deal status flags
    const isWon = stage.toLowerCase().includes("won") || stage.toLowerCase().includes("closed");
    const isClosed = isWon || stage.toLowerCase().includes("lost") || stage.toLowerCase().includes("closed");
    
    // Calculate days to close if applicable
    let daysToClose: number | undefined;
    if (isClosed && closeDate) {
      const diffTime = Math.abs(closeDate.getTime() - createdAt.getTime());
      daysToClose = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Extract contact and company associations
    const associatedContacts = rawDeal.associations.contacts || [];
    const associatedCompanies = rawDeal.associations.companies || [];

    // Parse counts
    const contactCount = parseInt(props.num_associated_contacts || "0") || associatedContacts.length;
    const noteCount = parseInt(props.num_contacted_notes || "0") || 0;

    // Separate custom properties (excluding standard HubSpot properties)
    const standardProperties = new Set([
      'dealname', 'amount', 'dealstage', 'pipeline', 'dealtype', 'closedate',
      'createdate', 'hs_lastmodifieddate', 'hubspot_owner_id', 'amount_in_home_currency',
      'hs_deal_stage_probability', 'dealstage_label', 'pipeline_label', 'deal_currency_code',
      'hs_forecast_amount', 'hs_projected_amount', 'num_associated_contacts',
      'num_contacted_notes', 'days_to_close'
    ]);

    const customProperties: Record<string, any> = {};
    Object.entries(props).forEach(([key, value]) => {
      if (!standardProperties.has(key) && value !== undefined && value !== null) {
        customProperties[key] = value;
      }
    });

    // Create the normalized deal
    const result: HubSpotDeal = {
      id: rawDeal.id,
      dealName,
      amount,
      currency,
      stage,
      stageLabel,
      pipeline,
      pipelineLabel,
      dealType: props.dealtype || undefined,
      closeDate,
      createdAt,
      lastModifiedAt,
      ownerId: ownerId || undefined,
      stageProbability,
      forecastAmount,
      projectedAmount,
      daysToClose,
      isWon,
      isClosed,
      isArchived: rawDeal.archived,
      contactCount,
      noteCount,
      associatedContacts,
      associatedCompanies,
      customProperties
    };

    console.log(`Processed HubSpot deal: ${dealName} (${rawDeal.id}) - ${stage} - $${amount}`);
    return result;
  },
  {
    deadLetterQueue: HubSpotDealRawPipeline.deadLetterQueue,
  },
);

// Add a streaming consumer to log raw HubSpot deal events
const printHubSpotDealEvent = (rawDeal: HubSpotDealRaw): void => {
  console.log("Received HubSpot Deal event:");
  console.log(`  Deal ID: ${rawDeal.id}`);
  console.log(`  Deal Name: ${rawDeal.properties.dealname || "Untitled"}`);
  console.log(`  Amount: ${rawDeal.properties.amount || "0"}`);
  console.log(`  Stage: ${rawDeal.properties.dealstage || "unknown"}`);
  console.log(`  Updated: ${rawDeal.updatedAt}`);
  console.log("---");
};

HubSpotDealRawPipeline.stream!.addConsumer(printHubSpotDealEvent);

// DLQ consumer for handling failed transformations
HubSpotDealRawPipeline.deadLetterQueue!.addConsumer((deadLetter) => {
  console.error("HubSpot Deal transformation failed:");
  console.error(deadLetter);
  const rawDeal: HubSpotDealRaw = deadLetter.asTyped();
  console.error(`Failed deal: ${rawDeal.properties.dealname} (${rawDeal.id})`);
});
