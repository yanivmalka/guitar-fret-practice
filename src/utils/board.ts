// Feedback board data access. All calls go through the shared Supabase client
// and are gated by the RLS policies in supabase/migrations/0005_feedback_board.sql:
//   - a signed-in user may insert a post as themselves and read back only
//     their own posts
//   - an admin (a row in public.admins) reads every post and may toggle its
//     `handled` flag or delete it
// Guests never reach this module — the board UI shows a sign-in prompt instead.

import { supabase } from './supabase';
import type { AuthProfile } from '../hooks/useAuth';

export interface BoardPost {
  id: string;
  body: string;
  authorName: string | null;
  authorEmail: string | null;
  handled: boolean;
  createdAt: string;
  /** True when the signed-in viewer wrote this post. */
  mine: boolean;
}

interface PostRow {
  id: string;
  user_id: string;
  author_name: string | null;
  author_email: string | null;
  body: string;
  handled: boolean;
  created_at: string;
}

function toPost(row: PostRow, viewerId: string): BoardPost {
  return {
    id: row.id,
    body: row.body,
    authorName: row.author_name,
    authorEmail: row.author_email,
    handled: row.handled,
    createdAt: row.created_at,
    mine: row.user_id === viewerId,
  };
}

/** Whether the signed-in user is an admin. False when unconfigured / offline. */
export async function fetchIsAdmin(userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

/**
 * Posts visible to the viewer, newest first. RLS decides the row set: an
 * admin gets everything, everyone else gets only their own.
 */
export async function fetchPosts(userId: string): Promise<BoardPost[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('feedback_posts')
    .select('id, user_id, author_name, author_email, body, handled, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => toPost(r as PostRow, userId));
}

/** Add a post authored by the signed-in user. */
export async function submitPost(
  userId: string,
  profile: AuthProfile | null,
  body: string,
): Promise<void> {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.from('feedback_posts').insert({
    user_id: userId,
    author_name: profile?.name ?? null,
    author_email: profile?.email ?? null,
    body: body.trim(),
  });
  if (error) throw error;
}

/** Admin: mark a post handled / unhandled. */
export async function setHandled(id: string, handled: boolean): Promise<void> {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase
    .from('feedback_posts')
    .update({ handled, handled_at: handled ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

/** Admin: delete a post. */
export async function deletePost(id: string): Promise<void> {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.from('feedback_posts').delete().eq('id', id);
  if (error) throw error;
}
