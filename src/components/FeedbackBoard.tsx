import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { AuthProfile } from '../hooks/useAuth';
import { useDictation } from '../hooks/useDictation';
import { playClickSound, haptic } from '../utils/feedback';
import {
  fetchIsAdmin,
  fetchPosts,
  submitPost,
  setHandled,
  deletePost,
  type BoardPost,
} from '../utils/board';
import { useTranslation } from '../i18n/useTranslation';

/**
 * Full-page feedback board, rendered as a hamburger settings sub-page.
 *
 * Any signed-in user can post an idea / comment / suggestion and see the list
 * of posts they have written. Admins (a row in public.admins, seeded in
 * migration 0005) instead get two tabs on the same page — "Write" (the
 * compose box) and "Inbox" (every user's posts, with a count badge and
 * handled / delete controls). Guests get a sign-in prompt.
 */

const MAX_LEN = 4000;

type AdminTab = 'write' | 'inbox';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function preview(body: string, max = 140): string {
  const s = body.trim().replace(/\s+/g, ' ');
  return s.length > max ? `${s.slice(0, max)}…` : s;
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
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Voice dictation for the compose box. The on-screen keyboard's own
  // microphone key does nothing inside the app's Android WebView, so we drive
  // speech-to-text ourselves. `dictBaseRef` holds whatever was already typed
  // when the mic was switched on; each result replaces the text after it.
  const dictBaseRef = useRef('');
  const dictation = useDictation({
    onSession: (text) => {
      const base = dictBaseRef.current;
      const sep = base && text ? ' ' : '';
      setDraft((base + sep + text).slice(0, MAX_LEN));
      setSent(false);
    },
  });

  // Admin-only: which of the two tabs is showing. Ignored for regular users,
  // who see the compose box and their own posts on one scroll.
  const [adminTab, setAdminTab] = useState<AdminTab>('write');
  // Admin Inbox: whether the collapsed "Handled" section is expanded.
  const [showHandled, setShowHandled] = useState(false);
  // The post an admin has tapped "Delete" on, awaiting confirmation in our
  // own styled dialog (never the browser's window.confirm).
  const [pendingDelete, setPendingDelete] = useState<BoardPost | null>(null);

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
      setError(t('Couldn’t load the board. Check your connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

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
        if (alive) setError(t('Couldn’t load the board. Check your connection and try again.'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId, t]);

  // An admin leaving the "Write" tab (compose box unmounts) must not leave
  // the mic listening in the background.
  const stopDictation = dictation.stop;
  useEffect(() => {
    if (adminTab !== 'write') stopDictation();
  }, [adminTab, stopDictation]);

  const send = async () => {
    const body = draft.trim();
    if (!userId || !body || sending) return;
    dictation.stop();
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
      setError(t('Couldn’t send that. Check your connection and try again.'));
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

  // Admin delete: hard-deletes the row (RLS: admins only), so it is gone for
  // every user including the author. Optimistic; a failed write reloads.
  const confirmRemove = async () => {
    const post = pendingDelete;
    if (!post) return;
    playClickSound();
    haptic.tap();
    setPendingDelete(null);
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
          {t('Sign in with Google to leave a comment, idea, or suggestion. Only admins can read the full board.')}
        </p>
        <button
          className="set-card-btn set-card-btn-primary"
          onClick={() => {
            playClickSound();
            haptic.tap();
            onSignIn();
          }}
        >
          {t('Sign in with Google')}
        </button>
      </div>
    );
  }

  const micError =
    dictation.error === 'no-permission'
      ? t('Microphone access is off — turn it on to dictate.')
      : dictation.error === 'not-supported'
        ? t('Voice typing isn’t available on this device.')
        : dictation.error
          ? t('Couldn’t hear that — try again.')
          : null;

  const compose = (
    <div className="board-compose">
      <textarea
        className="board-textarea"
        placeholder={t('What’s on your mind?')}
        value={draft}
        maxLength={MAX_LEN}
        rows={4}
        onChange={(e) => {
          // A manual edit takes over from any in-progress dictation.
          if (dictation.listening) dictation.stop();
          setDraft(e.target.value);
          setSent(false);
        }}
      />
      <div className="board-compose-foot">
        <div className="board-compose-tools">
          {dictation.supported && (
            <button
              type="button"
              className={`board-mic${dictation.listening ? ' board-mic-on' : ''}`}
              aria-pressed={dictation.listening}
              aria-label={
                dictation.listening ? t('Stop voice typing') : t('Start voice typing')
              }
              onClick={() => {
                playClickSound();
                haptic.tap();
                if (!dictation.listening) {
                  dictBaseRef.current = draft.replace(/\s+$/, '');
                }
                dictation.toggle();
              }}
            >
              <span aria-hidden="true">{dictation.listening ? '⏹' : '🎤'}</span>
            </button>
          )}
          <span className="board-count">
            {draft.length}/{MAX_LEN}
          </span>
        </div>
        <button
          className="set-card-btn set-card-btn-primary board-send"
          disabled={!draft.trim() || sending}
          onClick={() => void send()}
        >
          {sending ? t('Sending…') : t('Send')}
        </button>
      </div>
      {dictation.listening && (
        <p className="board-mic-hint">{t('Listening… speak now, tap ⏹ to stop.')}</p>
      )}
      {micError && <p className="board-error">{micError}</p>}
      {sent && !error && (
        <p className="board-thanks">{t('Thanks — your message was sent.')}</p>
      )}
    </div>
  );

  const renderItem = (post: BoardPost) => (
    <li
      key={post.id}
      className={`board-item${post.handled ? ' board-item-handled' : ''}`}
    >
      <div className="board-item-head">
        <span className="board-item-who">
          {isAdmin ? post.authorName || post.authorEmail || t('Unknown') : t('You')}
        </span>
        <span className="board-item-date">{fmtDate(post.createdAt)}</span>
      </div>
      {isAdmin && post.authorEmail && post.authorName && (
        <span className="board-item-email">{post.authorEmail}</span>
      )}
      <p className="board-item-body">{post.body}</p>
      {post.handled && <span className="board-item-tag">{t('Handled')}</span>}
      {isAdmin && (
        <div className="board-item-actions">
          <button
            className="board-action"
            onClick={() => void toggleHandled(post)}
          >
            {post.handled ? t('Mark unhandled') : t('Mark handled')}
          </button>
          <button
            className="board-action board-action-danger"
            onClick={() => {
              playClickSound();
              haptic.tap();
              setPendingDelete(post);
            }}
          >
            {t('Delete')}
          </button>
        </div>
      )}
    </li>
  );

  // Regular user's own posts, all together (the "Handled" tag already marks
  // the ones an admin has actioned).
  const myList = loading ? (
    <p className="board-empty">{t('Loading…')}</p>
  ) : posts.length === 0 ? (
    <p className="board-empty">{t('You haven’t sent anything yet.')}</p>
  ) : (
    <ul className="board-list">{posts.map(renderItem)}</ul>
  );

  // Regular user: one scroll — compose box, then the posts they've sent.
  if (!isAdmin) {
    return (
      <div className="board">
        <p className="board-intro">
          {t('Share a comment, idea, or suggestion. Admins read every post; below you can see the ones you’ve sent.')}
        </p>
        {compose}
        {error && <p className="board-error">{error}</p>}
        {myList}
      </div>
    );
  }

  // Admin: the compose box and the incoming posts are two separate tabs on
  // the same page. The Inbox tab carries a badge with the post count, and
  // splits into an "open" list plus a collapsed "Handled" section.
  const open = posts.filter((p) => !p.handled);
  const done = posts.filter((p) => p.handled);
  const unhandled = open.length;
  return (
    <div className="board">
      <div className="board-tabs" role="tablist" aria-label={t('Feedback board')}>
        <button
          role="tab"
          aria-selected={adminTab === 'write'}
          className={`board-tab${adminTab === 'write' ? ' board-tab-on' : ''}`}
          onClick={() => {
            playClickSound();
            haptic.tap();
            setAdminTab('write');
          }}
        >
          {t('Write')}
        </button>
        <button
          role="tab"
          aria-selected={adminTab === 'inbox'}
          className={`board-tab${adminTab === 'inbox' ? ' board-tab-on' : ''}`}
          onClick={() => {
            playClickSound();
            haptic.tap();
            setAdminTab('inbox');
          }}
        >
          {t('Inbox')}
          <span
            className={`board-tab-badge${unhandled > 0 ? ' board-tab-badge-alert' : ''}`}
          >
            {posts.length}
          </span>
        </button>
      </div>

      {error && <p className="board-error">{error}</p>}

      {adminTab === 'write' ? (
        <>
          <p className="board-intro">
            {t('Post a comment, idea, or suggestion of your own.')}
          </p>
          {compose}
        </>
      ) : (
        <>
          <p className="board-intro">
            {t('Every post from every user')}
            {unhandled > 0 ? ` — ${unhandled} ${t('still to handle')}` : ''}. {t('Mark one handled once you’ve dealt with it, or delete it.')}
          </p>

          {loading ? (
            <p className="board-empty">{t('Loading…')}</p>
          ) : posts.length === 0 ? (
            <p className="board-empty">{t('No posts yet.')}</p>
          ) : (
            <>
              {open.length > 0 ? (
                <ul className="board-list">{open.map(renderItem)}</ul>
              ) : (
                <p className="board-empty">{t('Nothing open — all caught up.')}</p>
              )}

              {done.length > 0 && (
                <div className="board-handled">
                  <button
                    className="board-handled-toggle"
                    aria-expanded={showHandled}
                    onClick={() => {
                      playClickSound();
                      haptic.tap();
                      setShowHandled((v) => !v);
                    }}
                  >
                    <span>{t('Handled')} ({done.length})</span>
                    <span className="board-handled-chev" aria-hidden="true">
                      {showHandled ? '▾' : '▸'}
                    </span>
                  </button>
                  {showHandled && (
                    <ul className="board-list board-list-handled">
                      {done.map(renderItem)}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {pendingDelete && (
        <div
          className="board-confirm-overlay"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="board-confirm-card"
            role="dialog"
            aria-modal="true"
            aria-label={t('Delete post')}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="board-confirm-icon" aria-hidden="true">🗑️</div>
            <div className="board-confirm-title">{t('Delete this post?')}</div>
            <p className="board-confirm-quote">“{preview(pendingDelete.body)}”</p>
            <p className="board-confirm-note">
              {t('This permanently removes it for everyone, including')}{' '}
              {pendingDelete.authorName ||
                pendingDelete.authorEmail ||
                t('the author')}
              . {t('It can’t be undone.')}
            </p>
            <div className="board-confirm-actions">
              <button
                className="board-confirm-btn board-confirm-cancel"
                onClick={() => {
                  playClickSound();
                  haptic.tap();
                  setPendingDelete(null);
                }}
              >
                {t('Cancel')}
              </button>
              <button
                className="board-confirm-btn board-confirm-delete"
                onClick={() => void confirmRemove()}
              >
                {t('Delete for everyone')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
