import { ConsumptionApi } from "@514labs/moose-lib";

// Interface for workflow execution parameters
interface WorkflowTriggerParams {
  workflowName?: string; // Optional workflow name, defaults to "hubspotDataSync"
  force?: boolean; // Force execution even if workflow is already running
}

// Interface for workflow execution response
interface WorkflowExecutionResponse {
  success: boolean;
  workflowName: string;
  executionId: string;
  status: "started" | "failed";
  message: string;
  startTime: string;
  error?: string;
}

/**
 * HubSpot Workflow Trigger API
 * 
 * Triggers the HubSpot data sync workflow programmatically in a fire-and-forget manner.
 * Returns immediately after triggering the workflow without waiting for completion.
 */
export const HubSpotWorkflowTriggerApi = new ConsumptionApi<
  WorkflowTriggerParams,
  WorkflowExecutionResponse
>("hubspot-workflow-trigger", async (
  { 
    workflowName = "hubspotDataSync", 
    force = false
  },
  { client }
) => {
  
  const startTime = new Date().toISOString();
  const executionId = `${workflowName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`🚀 Triggering workflow: ${workflowName} (executionId: ${executionId})`);
    
    // Check if HUBSPOT_TOKEN is available
    if (!process.env.HUBSPOT_TOKEN) {
      throw new Error("HUBSPOT_TOKEN environment variable is required for workflow execution");
    }
    
    // Validate workflow name
    if (workflowName !== "hubspotDataSync") {
      throw new Error(`Unknown workflow: ${workflowName}. Available workflows: hubspotDataSync`);
    }
    
    // Fire and forget - trigger the workflow asynchronously
    client.workflow.execute(workflowName, {}).then(result => {
      console.log(`✅ Background workflow ${workflowName} completed with status ${result.status}`);
    }).catch(error => {
      console.error(`❌ Background workflow ${workflowName} failed:`, error);
    });
    
    console.log(`🔄 Workflow ${workflowName} started in background`);
    
    return {
      success: true,
      workflowName,
      executionId,
      status: "started" as const,
      message: `Workflow ${workflowName} triggered successfully`,
      startTime
    };
    
  } catch (error) {
    console.error(`💥 Failed to trigger workflow ${workflowName}:`, error);
    
    return {
      success: false,
      workflowName,
      executionId,
      status: "failed" as const,
      message: `Failed to trigger workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});
