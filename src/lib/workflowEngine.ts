import { supabase } from './supabase';
import { WorkflowInstance, Workstream } from '../types';

export class WorkflowEngine {
  /**
   * Start a workflow instance - activate the first workstream
   */
  static async startWorkflow(workflowInstanceId: string): Promise<void> {
    const { data: workstreams, error } = await supabase
      .from('workstreams')
      .select('*')
      .eq('workflow_instance_id', workflowInstanceId)
      .order('order_index', { ascending: true });

    if (error || !workstreams || workstreams.length === 0) {
      throw new Error('No workstreams found for workflow instance');
    }

    // Activate the first workstream
    const firstWorkstream = workstreams[0];
    await this.activateWorkstream(firstWorkstream.id);

    // Update workflow instance status
    await supabase
      .from('workflow_instances')
      .update({
        status: 'in_progress',
        current_workstream_id: firstWorkstream.id,
        started_at: new Date().toISOString(),
      })
      .eq('id', workflowInstanceId);
  }

  /**
   * Complete a workstream and trigger the next one
   */
  static async completeWorkstream(workstreamId: string): Promise<void> {
    // Get the current workstream
    const { data: workstream, error } = await supabase
      .from('workstreams')
      .select('*, workflow_instances(*)')
      .eq('id', workstreamId)
      .single();

    if (error || !workstream) {
      throw new Error('Workstream not found');
    }

    // Mark current workstream as completed
    await supabase
      .from('workstreams')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', workstreamId);

    // Get all workstreams for this workflow instance
    const { data: allWorkstreams, error: workstreamsError } = await supabase
      .from('workstreams')
      .select('*')
      .eq('workflow_instance_id', workstream.workflow_instance_id)
      .order('order_index', { ascending: true });

    if (workstreamsError || !allWorkstreams) {
      throw new Error('Failed to get workstreams');
    }

    // Find the next workstream
    const currentIndex = allWorkstreams.findIndex(ws => ws.id === workstreamId);
    const nextWorkstream = allWorkstreams[currentIndex + 1];

    if (nextWorkstream) {
      // Activate next workstream
      await this.activateWorkstream(nextWorkstream.id);
      
      // Update workflow instance current workstream
      await supabase
        .from('workflow_instances')
        .update({
          current_workstream_id: nextWorkstream.id,
          status: 'in_progress',
        })
        .eq('id', workstream.workflow_instance_id);
    } else {
      // No more workstreams - complete the workflow
      await this.completeWorkflow(workstream.workflow_instance_id);
    }

    // Update progress percentage
    await this.updateWorkflowProgress(workstream.workflow_instance_id);
  }

  /**
   * Activate a workstream (mark it as started and set can_start to true)
   */
  static async activateWorkstream(workstreamId: string): Promise<void> {
    await supabase
      .from('workstreams')
      .update({
        status: 'started',
        can_start: true,
        started_at: new Date().toISOString(),
      })
      .eq('id', workstreamId);
  }

  /**
   * Complete the entire workflow
   */
  static async completeWorkflow(workflowInstanceId: string): Promise<void> {
    await supabase
      .from('workflow_instances')
      .update({
        status: 'completed',
        completion_percentage: 100,
        completed_at: new Date().toISOString(),
        current_workstream_id: null,
      })
      .eq('id', workflowInstanceId);
  }

  /**
   * Update workflow progress percentage
   */
  static async updateWorkflowProgress(workflowInstanceId: string): Promise<void> {
    const { data: workstreams, error } = await supabase
      .from('workstreams')
      .select('status')
      .eq('workflow_instance_id', workflowInstanceId);

    if (error || !workstreams) return;

    const completedCount = workstreams.filter(ws => ws.status === 'completed').length;
    const totalCount = workstreams.length;
    const percentage = Math.round((completedCount / totalCount) * 100);

    await supabase
      .from('workflow_instances')
      .update({ completion_percentage: percentage })
      .eq('id', workflowInstanceId);
  }

  /**
   * Update workstream form data
   */
  static async updateWorkstreamData(
    workstreamId: string, 
    formData: Record<string, any>
  ): Promise<void> {
    await supabase
      .from('workstreams')
      .update({
        form_data: formData,
        status: 'in_progress',
      })
      .eq('id', workstreamId);
  }
} 