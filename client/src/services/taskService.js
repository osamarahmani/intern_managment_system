import { supabase } from '../supabase/client';

export const getTasksByInternId = async (internId) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('intern_id', internId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
};

export const assignTask = async (internId, taskData) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      intern_id: internId,
      title: taskData.assignWork,
      expected_date: taskData.expectedDate,
      submission_date: null,
      status: 'not_started'
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteTask = async (taskId) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  if (error) throw error;
  return taskId;
};

export const updateTaskStatus = async (taskId, status, submissionDate = null) => {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status,
      submission_date: submissionDate
    })
    .eq('id', taskId)
    .select()
    .single();
  if (error) throw error;
  return data;
};
