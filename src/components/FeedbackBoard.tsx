import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { AuthProfile } from '../hooks/useAuth';
import { playClickSound, haptic } from '../utils/feedback';
import {
  fetchIsAdmin,
  fetchPosts,
  submitPost,
  setHandled,
  deletePost,
  type BoardPost,
} from '../utils/board';

/**
 * Full-page feedback board, rendered as a hamburger settings sub-page.
 *
 * Any signed-in user can post an idea / comment / suggestion and see the list
 * of posts they have written. Admins (a row in public.admins, seeded in
 * migration 0005) instead see every post, with controls to mark one handled or
 * delete it. Guests get a sign-in prompt.
 */

const MAX_LEN = 4000;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function FeedbackBoard({
  user,
  profile,
  onSignIn,
}: {
  user: User | null;
  profile: AuthProfile | null;
  onSignIn: () => void;
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const userId = user?.id ?? null;

  // Reload the admin flag + post list. Called on mount (via the effect below)
  // and again after every post / handled-toggle / delete.
  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [admin, list] = await Promise.all([
        fetchIsAdmin(userId),
        fetchPosts(userId),
      ]);
      setIsAdmin(admin);
      setPosts(list);
    } catch {
      setError('Couldn’t load the board. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (!userId) return;
      try {
        const [admin, list] = await Promise.all([
          fetchIsAdmin(userId),
          fetchPosts(userId),
        ]);
        if (!alive) return;
        setIsAdmin(admin);
        setPosts(list);
      } catch {
        if (alive) setError('Couldn’t load the board. Check your connection and try again.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  const send = async () => {
    const body = draft.trim();
    if (!userId || !body || sending) return;
    playClickSound();
    haptic.tap();
    setSending(true);
    setError(null);
    try {
      await submitPost(userId, profile, body);
      setDraft('');
      setSent(true);
      await load();
    } catch {
      setError('Couldn’t send that. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  const toggleHandled = async (post: BoardPost) => {
    playClickSound();
    haptic.tap();
    // Optimistic — the list is small and a failed write just reloads.
    setPosts((ps) =>
      ps.map((p) => (p.id === post.id ? { ...p, handled: !p.handled } : p)),
    );
    try {
      await setHandled(post.id, !post.handled);
    } catch {
      await load();
    }
  };

  const remove = async (post: BoardPost) => {
    if (!window.confirm('Delete this post? This can’t be undone.')) return;
    playClickSound();
    haptic.tap();
    setPosts((ps) => ps.filter((p) => p.id !== post.id));
    try {
      await deletePost(post.id);
    } catch {
      await load();
    }
  };

  if (!user) {
    return (
      <div className="board">
        <p className="board-intro">
          Sign in with Google to leave a comment, idea, or suggestion. Only
          admins can read the full board.
        </p>
        <button
          className="set-card-btn set-card-btn-primary"
          onClick={() => {
            playClickSound();
            haptic.tap();
            onSignIn();
          }}
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="board">
      <p className="board-intro">
        {isAdmin
          ? 'Every post from every user. Mark one handled once you’ve dealt with it, or delete it.'
          : 'Share a comment, idea, or suggestion. Admins read every post; below you can see the ones you’ve sent.'}
      </p>

      <div className="board-compose">
        <textarea
          className="board-textarea"
          placeholder="What’s on your mind?"
          value={draft}
          maxLength={MAX_LEN}
          rows={4}
          onChange={(e) => {
            setDraft(e.target.value);
            setSent(false);
          }}
        />
        <div className="board-compose-foot">
          <span className="board-count">
            {draft.length}/{MAX_LEN}
          </span>
          <button
            className="set-card-btn set-card-btn-primary board-send"
            disabled={!draft.trim() || sending}
            onClick={() => void send()}
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        {sent && !error && (
          <p className="board-thanks">Thanks — your message was sent.</p>
        )}
      </div>

      {error && <p className="board-error">{error}</p>}

      {loading ? (
        <p className="board-empty">Loading…</p>
      ) : posts.length === 0 ? (
        <p className="board-empty">
          {isAdmin ? 'No posts yet.' : 'You haven’t sent anything yet.'}
        </p>
      ) : (
        <ul className="board-list">
          {posts.map((post) => (
            <li
              key={post.id}
              className={`board-item${post.handled ? ' board-item-handled' : ''}`}
            >
              <div className="board-item-head">
                <span className="board-item-who">
                  {isAdmin
                    ? post.authorName || post.authorEmail || 'Unknown'
                    : 'You'}
                </span>
                <span className="board-item-date">{fmtDate(post.createdAt)}</span>
              </div>
              {isAdmin && post.authorEmail && post.authorName && (
                <span className="board-item-email">{post.authorEmail}</span>
              )}
              <p className="board-item-body">{post.body}</p>
              {post.handled && (
                <span className="board-item-tag">Handled</span>
              )}
              {isAdmin && (
                <div className="board-item-actions">
                  <button
                    className="board-action"
                    onClick={() => void toggleHandled(post)}
                  >
                    {post.handled ? 'Mark unhandled' : 'Mark handled'}
                  </button>
                  <button
                    className="board-action board-action-danger"
                    onClick={() => void remove(post)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
