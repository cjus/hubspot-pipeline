import { ConsumptionApi } from "@514labs/moose-lib";

// Interface for workflow execution parameters
interface WorkflowTriggerParams {
  workflowName?: string; // Optional workflow name, defaults to "hubspotDataSync"
  force?: boolean; // Force execution even if workflow is already running
  waitForCompletion?: boolean; // Whether to wait for workflow completion
  timeoutSeconds?: number; // Timeout for workflow execution
}

// Interface for workflow execution response
interface WorkflowExecutionResponse {
  success: boolean;
  workflowName: string;
  executionId: string;
  status: "started" | "completed" | "failed" | "timeout";
  message: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  error?: string;
}

/**
 * HubSpot Workflow Trigger API
 * 
 * Triggers the HubSpot data sync workflow programmatically.
 * This is the TypeScript equivalent of client.workflow.execute("workflow-name", params)
 */
export const HubSpotWorkflowTriggerApi = new ConsumptionApi<
  WorkflowTriggerParams,
  WorkflowExecutionResponse
>("hubspot-workflow-trigger", async (
  { 
    workflowName = "hubspotDataSync", 
    force = false, 
    waitForCompletion = false,
    timeoutSeconds = 300
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
        
    // Create workflow execution promise
    let workflowPromise: Promise<{ status: number; body: string; }>;
    
    if (workflowName === "hubspotDataSync") {
      // Execute the workflow task directly
      workflowPromise = client.workflow.execute(workflowName, {});
    } else {
      throw new Error(`Unknown workflow: ${workflowName}. Available workflows: hubspotDataSync`);
    }
    
    // Handle workflow execution based on waitForCompletion flag
    if (waitForCompletion) {
      console.log(`⏳ Waiting for workflow completion (timeout: ${timeoutSeconds}s)...`);
      
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Workflow execution timed out after ${timeoutSeconds} seconds`));
        }, timeoutSeconds * 1000);
      });
      
      try {
        // Race between workflow completion and timeout
        const result = await Promise.race([workflowPromise, timeoutPromise]);
        
        const endTime = new Date().toISOString();
        const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
        
        console.log(`✅ Workflow ${workflowName} completed successfully in ${duration}s`);
        
        return {
          success: true,
          workflowName,
          executionId,
          status: "completed" as const,
          message: `Workflow ${workflowName} completed successfully`,
          startTime,
          endTime,
          duration
        };
        
      } catch (error) {
        const endTime = new Date().toISOString();
        const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
        
        if (error instanceof Error && error.message.includes("timed out")) {
          console.log(`⏰ Workflow ${workflowName} execution timed out after ${timeoutSeconds}s`);
          
          return {
            success: false,
            workflowName,
            executionId,
            status: "timeout" as const,
            message: `Workflow execution timed out after ${timeoutSeconds} seconds`,
            startTime,
            endTime,
            duration,
            error: error.message
          };
        } else {
          console.error(`❌ Workflow ${workflowName} failed:`, error);
          
          return {
            success: false,
            workflowName,
            executionId,
            status: "failed" as const,
            message: `Workflow execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            startTime,
            endTime,
            duration,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
      
    } else {
      // Fire and forget - start workflow asynchronously
      workflowPromise.then(result => {
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
        message: `Workflow ${workflowName} started successfully in background`,
        startTime
      };
    }
    
  } catch (error) {
    const endTime = new Date().toISOString();
    const duration = Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
    
    console.error(`💥 Failed to trigger workflow ${workflowName}:`, error);
    
    return {
      success: false,
      workflowName,
      executionId,
      status: "failed" as const,
      message: `Failed to trigger workflow: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime,
      endTime,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});
