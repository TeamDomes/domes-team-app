'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQuotes = !inQuotes }
    else if (line[i] === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += line[i] }
  }
  result.push(current)
  return result
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length === 0) return []
  const headers = parseCSVLine(lines[0]).map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = (values[i] || '').trim() })
    return obj
  })
}

function parseVariance(val: any): number {
  if (typeof val === 'number') return val
  const str = String(val).replace(/[$,]/g, '').trim()
  if (str.startsWith('(') && str.endsWith(')')) return -parseFloat(str.slice(1, -1)) || 0
  return parseFloat(str) || 0
}

function namesMatch(dbFirst: string, dbFull: string, report: string): boolean {
  const a = (dbFirst || dbFull.split(' ')[0]).toLowerCase()
  const b = report.split(' ')[0].toLowerCase()
  return a === b || a.startsWith(b) || b.startsWith(a)
}

interface ImportResult { name: string; teamMemberId: string | null; passed: boolean | null; details: string }

export default function BingoAdminPage() {
  const [budtenders, setBudtenders] = useState<any[]>([])
  const [cycle, setCycle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changes, setChanges] = useState<Record<string, Record<string, boolean>>>({})
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<{ square: string; title: string; results: ImportResult[] } | null>(null)
  const [xlsxReady, setXlsxReady] = useState(false)
  const [showDayPicker, setShowDayPicker] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [dayFrom, setDayFrom] = useState('')
  const [dayTo, setDayTo] = useState('')
  const router = useRouter()
  const attRef = useRef<HTMLInputElement>(null)
  const drawRef = useRef<HTMLInputElement>(null)
  const salesRef = useRef<HTMLInputElement>(null)
  const upsellRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if ((window as any).XLSX) { setXlsxReady(true); return }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    s.onload = () => setXlsxReady(true)
    document.head.appendChild(s)
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: me } = await supabase.from('team').select('role').eq('email', user.email).single()
      if (!me || me.role !== 'Admin') { router.push('/dashboard'); return }
      const { data: cyc } = await supabase.from('bingo_cycles').select('*').eq('status', 'Active').single()
      setCycle(cyc)
      if (!cyc) { setLoading(false); return }
      const { data: sq } = await supabase.from('bingo_squares').select('*, team!inner(id, full_name, first_name, role, type)').eq('cycle_id', cyc.id).order('team_member_id')
      setBudtenders((sq || []).filter((s: any) => s.team?.role === 'Budtender'))
      setLoading(false)
    }
    load()
  }, [router])

  const handleAttendance = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = ''
    const reader = new FileReader()
    reader.onload = (evt) => {
      const rows = parseCSV(evt.target?.result as string)
      const late = new Set<string>(); const all = new Set<string>()
      for (const r of rows) {
        const t = (r['Type']||'').toLowerCase().trim(), p = (r['Position']||'').toLowerCase().trim(), n = (r['Name']||'').trim()
        if (!n || p !== 'budtender') continue; all.add(n)
        if (t === 'late on clock-in') late.add(n)
      }
      setPreview({ square: 'square_g', title: 'Attendance Results → G Square', results: budtenders.map(b => {
        const fn = b.team?.full_name||'', fi = b.team?.first_name||''
        const csv = Array.from(all).find(n => namesMatch(fi, fn, n))
        if (!csv) return { name: fn, teamMemberId: b.team_member_id, passed: null, details: 'Not in report' }
        const was = late.has(csv)
        return { name: fn, teamMemberId: b.team_member_id, passed: !was, details: was ? 'Had a late clock-in' : 'On time every shift' }
      })})
    }
    reader.readAsText(file)
  }

  const handleDrawerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = ''
    setPendingFile(file); setShowDayPicker(true)
  }

  const processDrawer = async () => {
    if (!pendingFile || !dayFrom || !dayTo) return
    const from = parseInt(dayFrom), to = parseInt(dayTo)
    if (isNaN(from) || isNaN(to) || from > to) { setMessage('Enter valid day numbers'); return }
    const XLSX = (window as any).XLSX; if (!XLSX) { setMessage('Excel library loading...'); return }
    const data = await pendingFile.arrayBuffer(); const wb = XLSX.read(data)
    const daily: Record<string, { day: number; variance: number }[]> = {}
    for (const sn of wb.SheetNames) {
      const dn = parseInt(sn); if (isNaN(dn) || dn < from || dn > to) continue
      const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1 })
      let hr = -1, nc = -1, vc = -1
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const row = rows[i]; if (!row) continue
        for (let j = 0; j < row.length; j++) {
          const c = String(row[j]||'').toLowerCase().trim()
          if (c.includes('employee name')) { hr = i; nc = j }
          if (c.includes('cash variance')) vc = j
        }
        if (hr >= 0 && vc >= 0) break
      }
      if (hr < 0 || nc < 0 || vc < 0) continue
      for (let i = hr + 1; i < rows.length; i++) {
        const row = rows[i]; if (!row || !row[nc]) continue
        const nm = String(row[nc]).trim()
        if (!nm || nm.toLowerCase()==='lead' || nm.toLowerCase()==='all' || nm.toLowerCase().includes('total')) continue
        const v = parseVariance(row[vc])
        if (nm.includes('/')) {
          const ns = nm.split('/').map(x=>x.trim()).filter(Boolean); const sp = v/ns.length
          for (const n of ns) { if (!daily[n]) daily[n]=[]; daily[n].push({day:dn,variance:sp}) }
        } else { if (!daily[nm]) daily[nm]=[]; daily[nm].push({day:dn,variance:v}) }
      }
    }
    setPreview({ square: 'square_n', title: 'Drawer Results → N Square', results: budtenders.map(b => {
      const fn = b.team?.full_name||'', fi = b.team?.first_name||''
      const mk = Object.keys(daily).find(n => namesMatch(fi, fn, n))
      if (!mk) return { name: fn, teamMemberId: b.team_member_id, passed: null, details: 'Not in report' }
      const days = daily[mk]; const ok = days.every(d => Math.abs(d.variance) <= 0.50)
      if (ok) return { name: fn, teamMemberId: b.team_member_id, passed: true, details: days.length + ' day(s), all within +/-$0.50' }
      const w = days.reduce((a,d) => Math.abs(d.variance)>Math.abs(a.variance)?d:a)
      return { name: fn, teamMemberId: b.team_member_id, passed: false, details: 'Day '+w.day+': $'+w.variance.toFixed(2)+' variance' }
    })})
    setShowDayPicker(false); setPendingFile(null)
  }

  const handleSales = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = ''
    const reader = new FileReader()
    reader.onload = (evt) => {
      const XLSX = (window as any).XLSX; if (!XLSX) { setMessage('Excel library loading...'); return }
      const wb = XLSX.read(evt.target?.result, { type: 'array' })
      const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 })
      let hr=-1, nc=-1, ic=-1
      for (let i=0; i<Math.min(rows.length,10); i++) {
        const row=rows[i]; if (!row) continue
        for (let j=0; j<row.length; j++) {
          const c=String(row[j]||'').trim()
          if (c==='FullName') { nc=j; if (hr<0) hr=i }
          if (c==='InvoiceTotal') ic=j
          if (c==='TransId' && hr<0) hr=i
        }
        if (hr>=0 && nc>=0 && ic>=0) break
      }
      if (hr<0||nc<0||ic<0) { setMessage('Could not find columns in sales report'); return }
      const counts: Record<string,number> = {}
      for (let i=hr+1; i<rows.length; i++) {
        const row=rows[i]; if (!row||!row[nc]) continue
        const nm=String(row[nc]).trim(); const inv=parseFloat(row[ic])||0
        if (!nm) continue; if (!counts[nm]) counts[nm]=0; if (inv>=250) counts[nm]++
      }
      setPreview({ square: 'square_b', title: 'Sales Results → B Square (Big Basket)', results: budtenders.map(b => {
        const fn=b.team?.full_name||'', fi=b.team?.first_name||'', tp=b.team?.type||'FT'
        const need = tp==='PT' ? 3 : 4
        const mk = Object.keys(counts).find(n => namesMatch(fi, fn, n))
        if (!mk) return { name: fn, teamMemberId: b.team_member_id, passed: null, details: 'Not in report' }
        const ct = counts[mk]; const ok = ct >= need
        return { name: fn, teamMemberId: b.team_member_id, passed: ok, details: ct+' baskets over $250 ('+tp+' needs '+need+'+)' }
      })})
    }
    reader.readAsArrayBuffer(file)
  }

  const handleUpsell = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = ''
    const reader = new FileReader()
    reader.onload = (evt) => {
      const XLSX = (window as any).XLSX; if (!XLSX) { setMessage('Excel library loading...'); return }
      const wb = XLSX.read(evt.target?.result, { type: 'array' })
      const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 })
      let hr=-1, nc=-1, tc=-1, uc=-1
      for (let i=0; i<Math.min(rows.length,10); i++) {
        const row=rows[i]; if (!row) continue
        for (let j=0; j<row.length; j++) {
          const c=String(row[j]||'').trim()
          if (c==='Budtender') { hr=i; nc=j }
          if (c==='Transactions') tc=j
          if (c==='Upsell Transactions') uc=j
        }
        if (hr>=0 && tc>=0 && uc>=0) break
      }
      if (hr<0||nc<0||tc<0||uc<0) { setMessage('Could not find columns in upsell report'); return }
      const rates: Record<string,{rate:number,u:number,t:number}> = {}
      for (let i=hr+1; i<rows.length; i++) {
        const row=rows[i]; if (!row||!row[nc]) continue
        const nm=String(row[nc]).trim(); const t=parseFloat(row[tc])||0; const u=parseFloat(row[uc])||0
        if (!nm||t===0) continue; rates[nm]={rate:(u/t)*100, u, t}
      }
      setPreview({ square: 'square_i', title: 'Upsell Results → I Square (In the Upsell)', results: budtenders.map(b => {
        const fn=b.team?.full_name||'', fi=b.team?.first_name||''
        const mk = Object.keys(rates).find(n => namesMatch(fi, fn, n))
        if (!mk) return { name: fn, teamMemberId: b.team_member_id, passed: null, details: 'Not in report' }
        const {rate,u,t} = rates[mk]; const ok = rate >= 10
        return { name: fn, teamMemberId: b.team_member_id, passed: ok, details: rate.toFixed(1)+'% ('+u+'/'+t+' transactions)' }
      })})
    }
    reader.readAsArrayBuffer(file)
  }

  const applyImport = () => {
    if (!preview) return
    const next = { ...changes }
    for (const r of preview.results) {
      if (r.passed === null || !r.teamMemberId) continue
      if (!next[r.teamMemberId]) next[r.teamMemberId] = {}
      next[r.teamMemberId][preview.square] = r.passed
    }
    setChanges(next); setPreview(null)
    setMessage('Squares updated. Hit Save when ready.')
  }

  const toggle = (id: string, sq: string) => {
    const cur = changes[id]?.[sq] ?? budtenders.find(b => b.team_member_id === id)?.[sq] ?? false
    setChanges(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [sq]: !cur } }))
  }
  const val = (p: any, sq: string): boolean => changes[p.team_member_id]?.[sq] ?? p[sq]

  const handleSave = async () => {
    setSaving(true); setMessage('')
    for (const p of budtenders) {
      const pc = changes[p.team_member_id]; if (!pc) continue
      const u: any = { ...pc }; let f = 0
      for (const sq of ['square_b','square_i','square_n','square_g','square_o']) { if (u[sq] ?? p[sq]) f++ }
      u.squares_filled = f; u.has_bingo = f === 5
      await supabase.from('bingo_squares').update(u).eq('id', p.id)
    }
    setChanges({}); setSaving(false); setMessage('Saved!')
    if (cycle) {
      const { data } = await supabase.from('bingo_squares').select('*, team!inner(id, full_name, first_name, role, type)').eq('cycle_id', cycle.id).order('team_member_id')
      setBudtenders((data || []).filter((s: any) => s.team?.role === 'Budtender'))
    }
  }

  const handleReset = async () => {
    if (!cycle || !confirm('Log winner, complete this cycle, and start fresh?')) return
    const w = budtenders.find(b => b.has_bingo)
    if (w) await supabase.from('bingo_winners').insert({ id:'WIN-'+Date.now(), team_member_id:w.team_member_id, cycle_id:cycle.id, date_won:new Date().toISOString().split('T')[0] })
    await supabase.from('bingo_cycles').update({ status:'Completed' }).eq('id', cycle.id)
    const nid = 'CYC'+String(Date.now()).slice(-4)
    await supabase.from('bingo_cycles').insert({ id:nid, cycle_start_date:new Date().toISOString().split('T')[0], status:'Active' })
    await supabase.from('bingo_squares').insert(budtenders.map(b => ({ id:'BS-'+b.team_member_id+'-'+nid, team_member_id:b.team_member_id, cycle_id:nid, square_b:false, square_i:false, square_n:false, square_g:false, square_o:false, squares_filled:0, has_bingo:false })))
    setMessage('New cycle started!'); window.location.reload()
  }

  if (loading) return (<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',backgroundColor:'#f4e6b4'}}><p style={{color:'#3a7b3c',fontSize:'18px'}}>Loading...</p></div>)

  const hasChanges = Object.keys(changes).length > 0
  const card: React.CSSProperties = { backgroundColor:'white', borderRadius:'12px', padding:'20px', marginBottom:'16px' }
  const btnG: React.CSSProperties = { backgroundColor:'#3a7b3c', color:'white', border:'none', borderRadius:'8px', padding:'10px 20px', fontSize:'14px', fontWeight:'bold', cursor:'pointer' }
  const btnO: React.CSSProperties = { backgroundColor:'white', color:'#666', border:'1px solid #ddd', borderRadius:'8px', padding:'10px 20px', fontSize:'14px', cursor:'pointer' }
  const squares = ['square_b','square_i','square_n','square_g','square_o']
  const labels: Record<string,string> = { square_b:'B', square_i:'I', square_n:'N', square_g:'G', square_o:'O' }

  return (
    <div style={{minHeight:'100vh',backgroundColor:'#f4e6b4',fontFamily:'system-ui, sans-serif',padding:'20px'}}>
      <div style={{maxWidth:'900px',margin:'0 auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
          <div>
            <h1 style={{color:'#3a7b3c',fontSize:'28px',fontWeight:'bold',margin:'0 0 4px'}}>BINGO Admin</h1>
            {cycle && <p style={{color:'#888',fontSize:'13px',margin:0}}>Cycle started {new Date(cycle.cycle_start_date).toLocaleDateString()}</p>}
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={()=>router.push('/bingo')} style={btnO}>← BINGO</button>
            <button onClick={()=>router.push('/dashboard')} style={btnO}>Dashboard</button>
          </div>
        </div>
        {!cycle && <div style={card}><p style={{color:'#888',textAlign:'center'}}>No active BINGO cycle.</p></div>}
        {cycle && (<>
          <div style={card}>
            <h2 style={{color:'#3a7b3c',fontSize:'16px',margin:'0 0 12px'}}>Import Reports</h2>
            <p style={{color:'#888',fontSize:'13px',margin:'0 0 16px'}}>Upload weekly reports to auto-fill squares.</p>
            <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
              <button onClick={()=>salesRef.current?.click()} style={{...btnG,backgroundColor:'#543c2d'}}>Sales Report → B</button>
              <button onClick={()=>upsellRef.current?.click()} style={{...btnG,backgroundColor:'#3a7b3c'}}>Upsell Report → I</button>
              <button onClick={()=>drawRef.current?.click()} style={{...btnG,backgroundColor:'#f37029'}} disabled={!xlsxReady}>Drawer Report → N</button>
              <button onClick={()=>attRef.current?.click()} style={{...btnG,backgroundColor:'#387dac'}}>Attendance CSV → G</button>
            </div>
            <input ref={salesRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={handleSales} />
            <input ref={upsellRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={handleUpsell} />
            <input ref={drawRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={handleDrawerSelect} />
            <input ref={attRef} type="file" accept=".csv" style={{display:'none'}} onChange={handleAttendance} />
          </div>
          {showDayPicker && (
            <div style={{...card,border:'2px solid #f37029'}}>
              <h3 style={{color:'#f37029',fontSize:'15px',margin:'0 0 8px'}}>Which days of the month?</h3>
              <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                <label style={{fontSize:'14px'}}>From day</label>
                <input type="number" value={dayFrom} onChange={e=>setDayFrom(e.target.value)} style={{width:'60px',padding:'6px 8px',borderRadius:'6px',border:'1px solid #ddd',fontSize:'14px'}} />
                <label style={{fontSize:'14px'}}>to day</label>
                <input type="number" value={dayTo} onChange={e=>setDayTo(e.target.value)} style={{width:'60px',padding:'6px 8px',borderRadius:'6px',border:'1px solid #ddd',fontSize:'14px'}} />
                <button onClick={processDrawer} style={btnG}>Process</button>
                <button onClick={()=>{setShowDayPicker(false);setPendingFile(null)}} style={btnO}>Cancel</button>
              </div>
            </div>
          )}
          {preview && (
            <div style={{...card,border:'2px solid #3a7b3c'}}>
              <h3 style={{color:'#3a7b3c',fontSize:'15px',margin:'0 0 12px'}}>{preview.title}</h3>
              {preview.results.map(r => (
                <div key={r.name} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #f5f5f5',fontSize:'14px'}}>
                  <span style={{color:'#333',fontWeight:r.passed===null?'normal':'bold'}}>{r.name}</span>
                  <span style={{color:r.passed===null?'#aaa':r.passed?'#3a7b3c':'#d32f2f'}}>{r.details}</span>
                </div>
              ))}
              <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
                <button onClick={applyImport} style={btnG}>Apply</button>
                <button onClick={()=>setPreview(null)} style={btnO}>Dismiss</button>
              </div>
            </div>
          )}
          {message && <div style={{backgroundColor:'#e8f5e9',borderRadius:'8px',padding:'10px 16px',marginBottom:'16px',fontSize:'14px',color:'#333'}}>{message}</div>}
          <div style={card}>
            <h2 style={{color:'#3a7b3c',fontSize:'16px',margin:'0 0 16px'}}>Weekly Squares</h2>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'14px'}}>
                <thead><tr style={{borderBottom:'2px solid #e0e0e0'}}>
                  <th style={{textAlign:'left',padding:'8px',color:'#333'}}>Name</th>
                  {squares.map(sq=><th key={sq} style={{textAlign:'center',padding:'8px',color:'#3a7b3c',fontWeight:'bold'}}>{labels[sq]}</th>)}
                  <th style={{textAlign:'center',padding:'8px',color:'#888'}}>Filled</th>
                </tr></thead>
                <tbody>{budtenders.map(p => {
                  const f = squares.filter(sq=>val(p,sq)).length
                  return (<tr key={p.id} style={{borderBottom:'1px solid #f0f0f0'}}>
                    <td style={{padding:'10px 8px',fontWeight:'bold',color:'#333'}}>{p.team?.full_name} <span style={{fontWeight:'normal',color:'#aaa',fontSize:'12px'}}>{p.team?.type}</span></td>
                    {squares.map(sq=>(
                      <td key={sq} style={{textAlign:'center',padding:'8px'}}>
                        <button onClick={()=>toggle(p.team_member_id,sq)} style={{width:'36px',height:'36px',borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'16px',fontWeight:'bold',backgroundColor:val(p,sq)?'#3a7b3c':'#f0f0f0',color:val(p,sq)?'white':'#ccc'}}>{val(p,sq)?'✓':labels[sq]}</button>
                      </td>
                    ))}
                    <td style={{textAlign:'center',padding:'8px',color:f===5?'#ffcb1f':'#888',fontWeight:f===5?'bold':'normal'}}>{f===5?'BINGO!':f+'/5'}</td>
                  </tr>)
                })}</tbody>
              </table>
            </div>
          </div>
          <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
            <button onClick={handleSave} disabled={saving||!hasChanges} style={{...btnG,opacity:(saving||!hasChanges)?0.5:1}}>{saving?'Saving...':'Save Changes'}</button>
            <button onClick={handleReset} style={{...btnO,color:'#d32f2f',borderColor:'#d32f2f'}}>Reset Cycle</button>
          </div>
        </>)}
      </div>
    </div>
  )
}

