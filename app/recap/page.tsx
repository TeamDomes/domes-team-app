'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { awardPoints, POINTS } from '@/lib/points'
import MoodWrapper from '@/components/MoodWrapper'

export default function RecapPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [comments, setComments] = useState<Record<string, any[]>>({})
  const [teamMap, setTeamMap] = useState<Record<string, string>>({})
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [canPost, setCanPost] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: teamData } = await supabase.from('team').select('*')
    const map: Record<string, string> = {}
    let me: any = null
    ;(teamData || []).forEach((t: any) => {
      map[t.id] = t.full_name
      if (t.auth_user_id === user.id) me = t
      if (!me && t.email === user.email) me = t
    })
    setTeamMap(map)
    setCurrentUser(me)
    if (me && (me.role === 'Admin' || me.role === 'Lead')) {
      setCanPost(true)
    }
    const { data: postData } = await supabase.from('weekend_recaps').select('*').order('created_at', { ascending: false })
    setPosts(postData || [])
    const { data: commentData } = await supabase.from('recap_comments').select('*').order('created_at', { ascending: true })
    const grouped: Record<string, any[]> = {}
    ;(commentData || []).forEach((c: any) => {
      if (!grouped[c.post_id]) grouped[c.post_id] = []
      grouped[c.post_id].push(c)
    })
    setComments(grouped)
  }

  async function handlePost() {
    if (!title || !content || !currentUser) return
    setUploading(true)
    try {
      let imageUrl = null
      if (file) {
        const ext = file.name.split('.').pop()
        const fileName = `${currentUser.id}-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('recaps').upload(fileName, file)
        if (uploadError) throw uploadError
        imageUrl = `https://gywmceygbjlsbstonykj.supabase.co/storage/v1/object/public/recaps/${fileName}`
      }
      const { error: insertError } = await supabase.from('weekend_recaps').insert({
        team_member_id: currentUser.id,
        title,
        text: content,
        image_url: imageUrl,
      })
      if (insertError) throw insertError
      setTitle(''); setContent(''); setFile(null); setShowForm(false)
      loadData()
    } catch (err: any) {
      alert('Post failed: ' + err.message)
    } finally { setUploading(false) }
  }

  async function handleDelete(post: any) {
    if (!confirm('Delete this recap?')) return
    if (post.image_url) {
      const fileName = post.image_url.split('/').pop()
      await supabase.storage.from('recaps').remove([fileName!])
    }
    await supabase.from('weekend_recaps').delete().eq('id', post.id)
    loadData()
  }

  async function handleAddComment(postId: string) {
    const text = (commentText[postId] || '').trim()
    if (!text) { alert('Please type a comment first'); return }
    if (!currentUser) { alert('Could not identify your account. Try refreshing.'); return }
    const { error } = await supabase.from('recap_comments').insert({
      post_id: postId,
      team_member_id: currentUser.id,
      comment: text,
    })
    if (error) { alert('Comment failed: ' + error.message); return }
    await awardPoints(currentUser.id, POINTS.COMMENT_POSTED, 'recap_comment', postId)
    setCommentText(prev => ({ ...prev, [postId]: '' }))
    loadData()
  }

  return (
    <MoodWrapper><div style={{ padding: '20px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ textAlign: 'right', marginBottom: 10 }}>
          <a href="/dashboard" style={{
            background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)',
            padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
            fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#333',
            textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', display: 'inline-block',
          }}>{'←'} Dashboard</a>
        </div>

        <h1 style={{ fontFamily: 'Cooper Black, serif', color: '#f37029', fontSize: 28, margin: '10px 0 20px', textShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
          Weekend Recap
        </h1>

        {canPost && (
          <button onClick={() => setShowForm(!showForm)} style={{
            width: '100%', padding: '12px', background: '#543c2d', color: 'white',
            border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginBottom: 20,
          }}>
            {showForm ? 'Cancel' : 'Write a Recap'}
          </button>
        )}

        {showForm && (
          <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <input type="text" placeholder="Recap title (e.g. Week of Aug 4)" value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 6, border: '1px solid #ccc', boxSizing: 'border-box', fontSize: 16, fontWeight: 'bold' }} />
            <textarea placeholder="What happened this week? Highlights, wins, funny moments..." value={content}
              onChange={e => setContent(e.target.value)}
              style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 6, border: '1px solid #ccc', minHeight: 150, boxSizing: 'border-box' }} />
            <input type="file" accept="image/*"
              onChange={e => setFile(e.target.files?.[0] || null)}
              style={{ marginBottom: 10 }} />
            <button onClick={handlePost} disabled={uploading || !title || !content} style={{
              width: '100%', padding: 10, background: uploading ? '#999' : '#3a7b3c', color: 'white',
              border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: uploading ? 'default' : 'pointer',
            }}>
              {uploading ? 'Posting...' : 'Post Recap'}
            </button>
          </div>
        )}

        {posts.map(post => (
          <div key={post.id} style={{ background: 'white', borderRadius: 12, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            {post.image_url && (
              <img src={post.image_url} alt={post.title}
                style={{ width: '100%', maxHeight: 400, objectFit: 'cover' }} />
            )}
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h2 style={{ margin: '0 0 8px', fontFamily: 'Cooper Black, serif', color: '#543c2d', fontSize: 22 }}>
                    {post.title}
                  </h2>
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: '#999' }}>
                    Posted by {teamMap[post.team_member_id] || 'Unknown'} {'\u2022'} {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
                {currentUser && post.team_member_id === currentUser.id && (
                  <button onClick={() => handleDelete(post)} style={{
                    background: 'none', border: 'none', color: '#999', fontSize: 18, cursor: 'pointer', padding: '0 4px',
                  }}>{'\u00D7'}</button>
                )}
              </div>
              <p style={{ margin: 0, color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {post.text}
              </p>

              <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 12 }}>
                {(comments[post.id] || []).length > 0 && (
                  <div>
                    {(comments[post.id].length > 2 && !expandedComments[post.id]) ? (
                      <>
                        {comments[post.id].slice(-2).map((c: any) => (
                          <div key={c.id} style={{ marginBottom: 6 }}>
                            <span style={{ fontWeight: 'bold', fontSize: 13, color: '#543c2d' }}>
                              {teamMap[c.team_member_id] || 'Unknown'}
                            </span>
                            <span style={{ fontSize: 13, color: '#333', marginLeft: 6 }}>{c.comment}</span>
                          </div>
                        ))}
                        <button onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: true }))}
                          style={{ background: 'none', border: 'none', color: '#387dac', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 6 }}>
                          View all {comments[post.id].length} comments
                        </button>
                      </>
                    ) : (
                      comments[post.id].map((c: any) => (
                        <div key={c.id} style={{ marginBottom: 6 }}>
                          <span style={{ fontWeight: 'bold', fontSize: 13, color: '#543c2d' }}>
                            {teamMap[c.team_member_id] || 'Unknown'}
                          </span>
                          <span style={{ fontSize: 13, color: '#333', marginLeft: 6 }}>{c.comment}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentText[post.id] || ''}
                    onChange={e => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddComment(post.id) }}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}
                  />
                  <button onClick={() => handleAddComment(post.id)} style={{
                    padding: '8px 14px', background: '#3a7b3c', color: 'white',
                    border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 'bold', cursor: 'pointer',
                  }}>Post</button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {posts.length === 0 && (
          <p style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>
            No recaps yet. Check back after the weekend!
          </p>
        )}
      </div>
    </div></MoodWrapper>
  )
}