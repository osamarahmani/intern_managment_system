import { supabase } from '../supabase/client';

export const login = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
};

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getUserRole = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, intern_id')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
};

export const getInternStatus = async (internId) => {
  if (!internId || internId === 'null' || internId === 'undefined') {
    throw new Error('Intern ID is missing or invalid. Please contact the administrator to link your profile.');
  }
  const { data, error } = await supabase
    .from('interns')
    .select('status')
    .eq('id', internId)
    .single();
  if (error) throw error;
  return data.status;
};

export const internLogin = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;

  const profile = await getUserRole(data.user.id);

  if (profile.role === 'intern') {
    const status = await getInternStatus(profile.intern_id);
    if (status === 'pending') {
      await supabase.auth.signOut();
      throw new Error('Your registration is pending admin approval');
    }
    if (status === 'rejected') {
      await supabase.auth.signOut();
      throw new Error('Your registration was not approved. Contact admin.');
    }
  }

  return { user: data.user, role: profile.role };
};

