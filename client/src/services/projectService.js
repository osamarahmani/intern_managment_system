import { supabase } from '../supabase/client';

export const assignProject = async (internId, projectData) => {
  const { data, error } = await supabase
    .from('projects')
    .upsert({ intern_id: internId, ...projectData })
    .select()
    .single();
  if (error) throw error;
  return data;
};
