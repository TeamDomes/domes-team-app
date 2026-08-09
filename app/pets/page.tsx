'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { awardPoints, POINTS } from '@/lib/points'
import MoodWrapper from '@/components/MoodWrapper'

export default function PetsPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [comments, setComments] = useState<Record<string, any[]>>({})
  const [teamMap, setTeamMap] = useState<Record<string, string>>({})
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [petName, setPetName] = useState('')
  const [caption, setCaption] = useState('')
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
    if (!me) console.log('No team match for user:', user.id, user.email)
    const { data: postData } = await supabase.from('pet_posts').select('*').order('created_at', { ascending: false })
    setPosts(postData || [])
    const { data: commentData } = await supabase.from('pet_comments').select('*').order('created_at', { ascending: true })
    const grouped: Record<string, any[]> = {}
    ;(commentData || []).forEach((c: any) => {
      if (!grouped[c.post_id]) grouped[c.post_id] = []
      grouped[c.post_id].push(c)
    })
    setComments(grouped)
  }

  async function handleUpload() {
    if (!file || !petName || !currentUser) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${currentUser.id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('pets').upload(fileName, file)
      if (uploadError) throw uploadError
      const imageUrl = `https://gywmceygbjlsbstonykj.supabase.co/storage/v1/object/public/pets/${fileName}`
      const { error: insertError } = await supabase.from('pet_posts').insert({
        team_member_id: currentUser.id,
        pet_name: petName,
        caption: caption || null,
        image_url: imageUrl,
      })
      if (insertError) throw insertError
      await awardPoints(currentUser.id, POINTS.POST_CREATED, 'pet_post', fileName)
      setPetName(''); setCaption(''); setFile(null); setShowForm(false)
      loadData()
    } catch (err: any) {
      alert('Upload failed: ' + err.message)
    } finally { setUploading(false) }
  }

  async function handleDelete(post: any) {
    if (!confirm('Delete this post?')) return
    const fileName = post.image_url.split('/').pop()
    await supabase.storage.from('pets').remove([fileName!])
    await supabase.from('pet_posts').delete().eq('id', post.id)
    loadData()
  }

  async function handleAddComment(postId: string) {
    const text = (commentText[postId] || '').trim()
    if (!text) { alert('Please type a comment first'); return }
    if (!currentUser) { alert('Could not identify your account. Try refreshing.'); return }
    const { error } = await supabase.from('pet_comments').insert({
      post_id: postId,
      team_member_id: currentUser.id,
      comment: text,
    })
    if (error) { alert('Comment failed: ' + error.message); return }
    await awardPoints(currentUser.id, POINTS.COMMENT_POSTED, 'pet_comment', postId)
    setCommentText(prev => ({ ...prev, [postId]: '' }))
    loadData()
  }

  return (
    <MoodWrapper><div style={{ padding: '20px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontFamily: 'Cooper Black, serif', color: '#f37029', fontSize: 28, margin: 0, textShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
            Pets of Domes
          </h1>
          <a href="/dashboard" style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.12)', padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'Cooper Light, system-ui, sans-serif', color: '#333', textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
            {'←'} Dashboard
          </a>
        </div>

        <button onClick={() => setShowForm(!showForm)} style={{
          width: '100%', padding: '12px', background: '#3a7b3c', color: 'white',
          border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginBottom: 20,
        }}>
          {showForm ? 'Cancel' : 'Share Your Pet'}
        </button>

        {showForm && (
          <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <input type="text" placeholder="Pet's name" value={petName}
              onChange={e => setPetName(e.target.value)}
              style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 6, border: '1px solid #ccc', boxSizing: 'border-box' }} />
            <textarea placeholder="Caption (optional)" value={caption}
              onChange={e => setCaption(e.target.value)}
              style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 6, border: '1px solid #ccc', minHeight: 60, boxSizing: 'border-box' }} />
            <input type="file" accept="image/*"
              onChange={e => setFile(e.target.files?.[0] || null)}
              style={{ marginBottom: 10 }} />
            <button onClick={handleUpload} disabled={uploading || !file || !petName} style={{
              width: '100%', padding: 10, background: uploading ? '#999' : '#f37029', color: 'white',
              border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: uploading ? 'default' : 'pointer',
            }}>
              {uploading ? 'Uploading...' : 'Post'}
            </button>
          </div>
        )}

        {posts.map(post => (
          <div key={post.id} style={{ background: 'white', borderRadius: 12, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <img src={post.image_url} alt={post.pet_name}
              style={{ width: '100%', maxHeight: 400, objectFit: 'cover' }} />
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontFamily: 'Cooper Black, serif', color: '#543c2d' }}>
                    {post.pet_name}
                  </h3>
                  {post.caption && <p style={{ margin: '0 0 8px', color: '#666' }}>{post.caption}</p>}
                  <p style={{ margin: 0, fontSize: 13, color: '#999' }}>
                    Posted by {teamMap[post.team_member_id] || 'Unknown'} {'\u2022'} {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
                {currentUser && post.team_member_id === currentUser.id && (
                  <button onClick={() => handleDelete(post)} style={{
                    background: 'none', border: 'none', color: '#999', fontSize: 18, cursor: 'pointer', padding: '0 4px',
                  }}>{'\u00D7'}</button>
                )}
              </div>

              <div style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
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
            No pets yet! Be the first to share.
          </p>
        )}
      </div>
    </div></MoodWrapper>
  )
}