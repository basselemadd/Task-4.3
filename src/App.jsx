import React,{useEffect,useMemo,useState} from 'react';

const STORAGE='acl-roomgrid-18rooms-v1';
const rooms=['A1-203', 'A2-106', 'A2-107', 'A3-208', 'A3-209', 'B1-205', 'B1-206', 'B1-207', 'B2-104', 'B2-105', 'B3-301', 'C1-102', 'C1-103', 'C2-201', 'C2-202', 'C3-101', 'C3-102', 'D1-101'];
// End dates are exclusive (the end date is the check-out day); all sample reservations use non-overlapping date ranges.
const sampleRows=[
 ['A1-203','2026-11-09','2026-11-11','Peer tutoring','other'],
 ['A1-203','2026-11-13','2026-11-15','Architecture workshop','other'],
 ['A1-203','2026-11-17','2026-11-19','Group assignment','you'],
 ['A2-106','2026-11-10','2026-11-13','Seminar preparation','other'],
 ['A2-106','2026-11-16','2026-11-19','Study circle','other'],
 ['A2-107','2026-11-09','2026-11-10','Student club planning','you'],
 ['A2-107','2026-11-12','2026-11-15','Project demo rehearsal','other'],
 ['A2-107','2026-11-16','2026-11-19','Study meeting','other'],
 ['A3-208','2026-11-11','2026-11-14','Presentation practice','other'],
 ['A3-208','2026-11-16','2026-11-18','Tutorial group','other'],
 ['A3-209','2026-11-10','2026-11-12','Study session','other'],
 ['B1-205','2026-11-09','2026-11-11','Meeting','other'],
 ['B1-205','2026-11-13','2026-11-15','Team discussion','other'],
 ['B1-205','2026-11-16','2026-11-18','Course project','other'],
 ['B1-206','2026-11-11','2026-11-13','Exam revision','other'],
 ['B1-206','2026-11-17','2026-11-20','Debate practice','you'],
 ['B1-207','2026-11-10','2026-11-12','Group study','you'],
 ['B1-207','2026-11-16','2026-11-19','Engineering project','other'],
 ['B2-104','2026-11-09','2026-11-11','Weekly study group','you'],
 ['B2-104','2026-11-13','2026-11-15','Team planning','other'],
 ['B2-104','2026-11-17','2026-11-19','Workshop preparation','other'],
 ['B2-105','2026-11-12','2026-11-15','Club meeting','other'],
 ['B2-105','2026-11-16','2026-11-18','Student committee','other'],
 ['B3-301','2026-11-09','2026-11-10','Debate practice','other'],
 ['B3-301','2026-11-11','2026-11-13','Group preparation','other'],
 ['B3-301','2026-11-18','2026-11-20','Portfolio review','other'],
 ['C1-102','2026-11-10','2026-11-14','Capstone meeting','other'],
 ['C1-102','2026-11-16','2026-11-19','Revision session','other'],
 ['C1-103','2026-11-09','2026-11-12','Group project','other'],
 ['C1-103','2026-11-14','2026-11-16','Student society','you'],
 ['C2-201','2026-11-12','2026-11-15','Project sprint','other'],
 ['C2-201','2026-11-16','2026-11-19','Robotics club','other'],
 ['C2-202','2026-11-09','2026-11-11','Lab preparation','other'],
 ['C2-202','2026-11-18','2026-11-20','Teaching assistant session','other'],
 ['C3-101','2026-11-12','2026-11-14','Presentation rehearsal','you'],
 ['C3-101','2026-11-14','2026-11-16','Design workshop','other'],
 ['C3-101','2026-11-18','2026-11-20','Study group','other'],
 ['C3-102','2026-11-11','2026-11-15','Research meeting','other'],
 ['D1-101','2026-11-10','2026-11-13','Team check-in','other'],
 ['D1-101','2026-11-16','2026-11-18','Group assignment','you'],
];
const seed=sampleRows.map(([roomNumber,startDate,endDate,purpose,owner],index)=>({id:`demo-${index+1}`,roomNumber,startDate,endDate,purpose,owner}));
const formEmpty={roomNumber:'',startDate:'',endDate:'',purpose:''};
const START_WEEK='2026-11-09';

/* ---------- storage ---------- */
function read(){try{let a=JSON.parse(localStorage.getItem(STORAGE));return Array.isArray(a)?a:seed;}catch{return seed;}}

/* ---------- date helpers (all ISO strings, UTC-safe) ---------- */
const toDate=iso=>new Date(`${iso}T12:00:00Z`);
function addDays(iso,days){const t=toDate(iso);t.setUTCDate(t.getUTCDate()+days);return t.toISOString().slice(0,10);}
function diffDays(a,b){return Math.round((toDate(b)-toDate(a))/864e5);}
const fmt=(iso,o)=>toDate(iso).toLocaleDateString('en-GB',{timeZone:'UTC',...o});
const human=iso=>fmt(iso,{day:'numeric',month:'short'});
const weekDay=iso=>fmt(iso,{weekday:'short'});
const humanDay=iso=>fmt(iso,{weekday:'short',day:'numeric',month:'short'});
function weekStart(iso){return addDays(iso,-((toDate(iso).getUTCDay()+6)%7));}
const todayISO=()=>new Date().toISOString().slice(0,10);
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
const canonicalRoom=v=>{const t=v.trim().toLowerCase();return rooms.find(r=>r.toLowerCase()===t)||'';};

/* ---------- booking logic ---------- */
function findConflict(bookings,room,start,end,id){
 return bookings.find(b=>b.id!==id&&b.roomNumber.toLowerCase()===room.toLowerCase()&&start<b.endDate&&end>b.startDate);
}
// Next free slot of the same length in the same room, starting from the requested start date.
function nextFree(bookings,room,start,end,id){
 const len=diffDays(start,end);let cand=start;
 for(let i=0;i<90;i++){
  const c=findConflict(bookings,room,cand,addDays(cand,len),id);
  if(!c)return {startDate:cand,endDate:addDays(cand,len)};
  cand=c.endDate;
 }
 return null;
}
function validate(form,bookings,id){
 const errors={};let room='';
 const raw=form.roomNumber.trim();
 if(!raw)errors.room='Choose a room from the list.';
 else{room=canonicalRoom(raw);if(!room)errors.room=`"${raw}" is not one of the ${rooms.length} rooms. Pick a room from the list, for example B2-104.`;}
 if(!form.startDate)errors.start='Choose a start date.';
 if(!form.endDate)errors.end='Choose an end date.';
 else if(form.startDate&&form.endDate<=form.startDate)errors.end='End date must be after the start date. It is the check-out day, so a one-night stay ends the next day.';
 let conflict=null,suggestion=null;
 if(!errors.room&&!errors.start&&!errors.end){
  conflict=findConflict(bookings,room,form.startDate,form.endDate,id)||null;
  if(conflict)suggestion=nextFree(bookings,room,form.startDate,form.endDate,id);
 }
 return {errors,room,conflict,suggestion};
}
const conflictText=(room,c)=>`${room} is already booked ${human(c.startDate)} – ${human(c.endDate)} (${c.owner==='you'?'one of your own bookings':'another student'}).`;
const scrollToId=id=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});

const rowsFor=n=>n>6?`auto repeat(${n},minmax(26px,1fr))`:`auto repeat(${n},minmax(40px,56px))`;

const PAGES=[['calendar','Availability'],['book','Book a room'],['mine','My bookings']];

export default function App(){
 const [bookings,setBookings]=useState(read);
 const [page,setPage]=useState('calendar'); // 'calendar' | 'book' | 'mine'
 const [week,setWeek]=useState(START_WEEK);
 const [view,setView]=useState('All rooms');
 const [form,setForm]=useState({...formEmpty});
 const [editing,setEditing]=useState(null);
 const [notice,setNotice]=useState('');
 const [touched,setTouched]=useState({});
 const [attempted,setAttempted]=useState(false);
 const [step,setStep]=useState('start'); // calendar picking: 'start' then 'end'
 const [flashId,setFlashId]=useState(null);

 useEffect(()=>{try{localStorage.setItem(STORAGE,JSON.stringify(bookings));}catch{}},[bookings]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),7000);return()=>clearTimeout(t);},[notice]);
 useEffect(()=>{if(!flashId)return;const t=setTimeout(()=>setFlashId(null),5000);return()=>clearTimeout(t);},[flashId]);

 const days=useMemo(()=>Array.from({length:7},(_,i)=>addDays(week,i)),[week]);
 const myBookings=bookings.filter(b=>b.owner==='you').sort((a,b)=>a.startDate.localeCompare(b.startDate));
 const roomList=view==='All rooms'?rooms:rooms.filter(r=>r===view);
 const occupied=(room,date)=>bookings.find(b=>b.roomNumber===room&&date>=b.startDate&&date<b.endDate);
 const check=useMemo(()=>validate(form,bookings,editing),[form,bookings,editing]);
 const hasProblem=Object.keys(check.errors).length>0||!!check.conflict;
 const shown=k=>(attempted||touched[k])&&check.errors[k];
 const touch=k=>setTouched(t=>({...t,[k]:true}));
 const nights=form.startDate&&form.endDate>form.startDate?diffDays(form.startDate,form.endDate):0;
 const rangeOk=!!form.startDate&&form.endDate>form.startDate;
 // Range highlighted on the calendar (live preview of what the form says).
 const selStart=form.startDate;
 const selEnd=form.startDate?(form.endDate>form.startDate?form.endDate:addDays(form.startDate,1)):'';
 const roomBookings=check.room?bookings.filter(b=>b.roomNumber===check.room).sort((a,b)=>a.startDate.localeCompare(b.startDate)):[];

 function showWeekOf(iso){setWeek(w=>(iso>=w&&iso<addDays(w,7))?w:weekStart(iso));}
 function clearForm(){setForm({...formEmpty});setEditing(null);setTouched({});setAttempted(false);setStep('start');}
 function setField(patch){setStep('start');setForm(f=>({...f,...patch}));}
 function onStart(v){
  setForm(f=>({...f,startDate:v,endDate:v&&(!f.endDate||f.endDate<=v)?addDays(v,1):f.endDate}));
  setStep('start');if(v)showWeekOf(v);
 }
 function go(id){
  setPage(id);setNotice('');
  if(id==='book')setTimeout(()=>document.getElementById('room-input')?.focus(),50);
 }

 function pick(room,day){
  setNotice('');setTouched({});setAttempted(false);
  if(step==='end'&&check.room===room&&form.startDate&&day>=form.startDate){
   setForm(f=>({...f,endDate:addDays(day,1)}));setStep('start');
  }else{
   setForm(f=>({...f,roomNumber:room,startDate:day,endDate:addDays(day,1)}));setStep('end');
  }
 }
 function edit(row){
  if(row.owner!=='you')return;
  setEditing(row.id);setForm({roomNumber:row.roomNumber,startDate:row.startDate,endDate:row.endDate,purpose:row.purpose});
  setTouched({});setAttempted(false);setStep('start');showWeekOf(row.startDate);go('book');
 }
 function submit(e){
  e.preventDefault();setNotice('');setAttempted(true);
  if(hasProblem){
   const first=check.errors.room?'room-input':check.errors.start?'start-input':check.errors.end?'end-input':null;
   if(first)document.getElementById(first)?.focus();
   return;
  }
  const payload={roomNumber:check.room,startDate:form.startDate,endDate:form.endDate,purpose:form.purpose.trim(),owner:'you'};
  const summary=`${payload.roomNumber}, ${humanDay(payload.startDate)} → ${humanDay(payload.endDate)} (${plural(nights,'night')})`;
  let id=editing;
  if(editing){setBookings(bookings.map(b=>b.id===editing?{...b,...payload}:b));}
  else{id='b-'+Date.now();setBookings([...bookings,{...payload,id}]);}
  showWeekOf(payload.startDate);setFlashId(id);clearForm();setPage('mine');
  setNotice(`${editing?'Booking updated':'Room reserved'}: ${summary}.`);
 }
 function reset(){
  if(!window.confirm('Restore the example bookings? Your own changes will be lost.'))return;
  setBookings(seed);clearForm();setWeek(START_WEEK);setView('All rooms');setPage('calendar');setNotice('Example bookings restored.');
 }
 function checkAvailability(){
  setNotice('');setAttempted(true);
  if(!hasProblem)setNotice(`Available: ${check.room} is free ${humanDay(form.startDate)} → ${humanDay(form.endDate)} (${plural(nights,'night')}).`);
 }
 function useSuggestion(s){setStep('start');setForm(f=>({...f,startDate:s.startDate,endDate:s.endDate}));showWeekOf(s.startDate);}
 function cancelEdit(){clearForm();setPage('mine');}

 const problems=[...Object.values(check.errors),...(check.conflict?[conflictText(check.room,check.conflict)]:[])];
 const hint=step==='end'&&form.startDate
  ?`Start: ${check.room||form.roomNumber}, ${humanDay(form.startDate)}. Now click the last night you need (same day = one night).`
  :'Click a free day to start, then a later day in the same room to end. Click a teal booking to change it.';

 return <div className="room-app">
  <header className="topbar"><div className="mark"><span className="mark-sq">R</span><span><strong>room<span>grid</span></strong><small>Campus spaces</small></span></div>
   <nav className="tabs" aria-label="Pages">{PAGES.map(([id,label],i)=><button key={id} type="button" className={page===id?'selected':''} aria-current={page===id?'page':undefined} onClick={()=>go(id)}><span className="num">{i+1}</span>{label}{id==='mine'&&<span className="count">{myBookings.length}</span>}</button>)}</nav>
   <div className="counts" title="Local browser data only">{rooms.length} rooms · {bookings.length} reservations</div>
   <button type="button" className="reset" onClick={reset}>Reset demo</button><div className="profile" title="Signed in as You">YOU</div></header>
  {notice&&<div className="toast" role="status"><span>{notice}</span><button type="button" aria-label="Dismiss message" onClick={()=>setNotice('')}>×</button></div>}
  <main>
  {page==='calendar'&&<section className="page card" aria-labelledby="cal-h">
    <div className="calendar-head"><h2 id="cal-h">Step 1 · Find free dates</h2><label className="loc">Location <select value={view} onChange={e=>setView(e.target.value)}><option>All rooms</option>{rooms.map(r=><option key={r}>{r}</option>)}</select></label><div className="weeknav"><button type="button" aria-label="Previous week" onClick={()=>setWeek(addDays(week,-7))}>←</button><strong>{human(week)} – {human(addDays(week,6))} {addDays(week,6).slice(0,4)}</strong><button type="button" aria-label="Next week" onClick={()=>setWeek(addDays(week,7))}>→</button><button type="button" className="today" onClick={()=>setWeek(weekStart(todayISO()))}>Today</button></div></div>
    <div className="hint-row"><p className="pick-hint" aria-live="polite">{hint}</p><div className="legend-row"><span className="legend"><i className="sw available"/>Open</span><span className="legend"><i className="sw taken"/>Booked</span><span className="legend"><i className="sw mine"/>Yours</span><span className="legend"><i className="sw sel"/>Selected</span><span className="legend"><i className="sw clash"/>Clash</span></div></div>
    <div className="calendar-scroll"><div className="room-cal" style={{'--rows':rowsFor(roomList.length)}}><div className="corner">ROOM / DATE</div>{days.map(d=><div className="dayhead" key={d}><strong>{weekDay(d)}</strong><span>{human(d)}</span></div>)}{roomList.map(room=><React.Fragment key={room}><div className={'roomname'+(check.room===room?' active':'')}><strong>{room}</strong></div>{days.map(day=>{
      const b=occupied(room,day);const mine=!!b&&b.owner==='you';
      const inSel=check.room===room&&!!selStart&&day>=selStart&&day<selEnd;
      const isEditingCell=!!b&&b.id===editing;
      const clash=inSel&&!!b&&!isEditingCell;
      let state=b?(mine?'mine':'taken'):'available';
      let label=b?(mine?'Yours':'Booked'):'Open';
      if(inSel&&!b){state='sel';label='Selected';}
      if(inSel&&isEditingCell){state='sel';label='Editing';}
      if(clash){state='clash';label='Clash';}
      const full=label==='Yours'?'Your booking':label;
      const locked=!!b&&!mine;
      return <button key={room+day} type="button" disabled={locked} aria-label={`${room}, ${humanDay(day)}: ${full}`} title={locked?`${room}, ${humanDay(day)}: booked by another student`:mine?`${room}, ${humanDay(day)}: your booking. Click to change it.`:`${room}, ${humanDay(day)}: ${full}`} className={'slot '+state} onClick={()=>mine?edit(b):pick(room,day)}>{label}</button>;})}</React.Fragment>)}</div></div>
    <div className={'selbar'+(check.conflict?' bad':'')}><div className="selinfo" aria-live="polite">{check.room&&form.startDate?(check.conflict?<><strong>Clash.</strong> {conflictText(check.room,check.conflict)} You can fix it on the next page.</>:<><strong>{check.room}</strong> · {humanDay(form.startDate)} → {humanDay(form.endDate||addDays(form.startDate,1))}{rangeOk&&<> · {plural(nights,'night')}</>}{!hasProblem&&<> · <b className="okmark">✓ Available</b></>}</>):'Nothing selected yet. Click a free day in the calendar.'}</div><button type="button" className="reserve-button" disabled={!(check.room&&form.startDate)} onClick={()=>go('book')}>{editing?'Continue to edit →':'Continue to booking →'}</button></div>
  </section>}

  {page==='book'&&<section className="page book-grid" aria-labelledby="book-h">
   <div className="card form-card"><h2 id="book-h">{editing?'Step 2 · Change reservation':'Step 2 · Book the room'}</h2>
    {editing&&<div className="editing-banner">You are changing an existing booking. Saving replaces it; no second booking is created.</div>}
    <form onSubmit={submit} noValidate className="form">
      <div className={'field'+(shown('room')?' invalid':'')}><div className="label-row"><label htmlFor="room-input">Room number <em>required</em></label></div><input id="room-input" list="rooms" placeholder="e.g., B2-104" autoComplete="off" value={form.roomNumber} aria-invalid={!!shown('room')} aria-describedby={shown('room')?'room-err':undefined} onChange={e=>setField({roomNumber:e.target.value})} onBlur={()=>{if(check.room&&check.room!==form.roomNumber)setForm(f=>({...f,roomNumber:check.room}));touch('room');}}/><datalist id="rooms">{rooms.map(r=><option key={r} value={r}/>)}</datalist>
       {shown('room')&&<p className="field-error" id="room-err">{check.errors.room}</p>}</div>
      <div className="date-pair"><div className={'field'+(shown('start')?' invalid':'')}><label htmlFor="start-input">Start date <em>required</em></label><input id="start-input" type="date" value={form.startDate} aria-invalid={!!shown('start')} aria-describedby={shown('start')?'start-err':undefined} onChange={e=>onStart(e.target.value)} onBlur={()=>touch('start')}/>{shown('start')&&<p className="field-error" id="start-err">{check.errors.start}</p>}</div>
       <div className={'field'+(shown('end')?' invalid':'')}><label htmlFor="end-input">End date <em>check-out day</em></label><input id="end-input" type="date" value={form.endDate} min={form.startDate?addDays(form.startDate,1):undefined} aria-invalid={!!shown('end')} aria-describedby={shown('end')?'end-err':undefined} onChange={e=>setField({endDate:e.target.value})} onBlur={()=>touch('end')}/>{shown('end')&&<p className="field-error" id="end-err">{check.errors.end}</p>}</div></div>
      <div className="field"><label htmlFor="purpose-input">Purpose <em>optional</em></label><textarea id="purpose-input" rows="3" placeholder="Meeting, group study..." value={form.purpose} onChange={e=>setForm(f=>({...f,purpose:e.target.value}))}/></div>
      {attempted&&problems.length>0&&<div className="error" role="alert"><strong>Booking not saved. {problems.length===1?'Fix this first:':`Fix these ${problems.length} things first:`}</strong><ul>{problems.map((p,i)=><li key={i}>{p}</li>)}</ul></div>}
      <div className="form-actions"><button className="ghost" type="button" onClick={()=>go('calendar')}>← Calendar</button><button className="availability-check" type="button" onClick={checkAvailability}>Check availability</button><button className="reserve-button" type="submit">{editing?'Save booking':'Confirm booking'}</button></div>{editing&&<button className="cancel-edit" type="button" onClick={cancelEdit}>Cancel editing</button>}
    </form></div>
   <div className="card side-card"><h3>Availability</h3>
    <div className="status-area" aria-live="polite">
     {check.conflict?<div className="status bad"><strong>Not available.</strong> {conflictText(check.room,check.conflict)}{check.suggestion?<button type="button" className="suggest" onClick={()=>useSuggestion(check.suggestion)}>Use {human(check.suggestion.startDate)} – {human(check.suggestion.endDate)} instead ({plural(nights,'night')}, free)</button>:<div>No free slot of this length in the next 90 days. Try another room.</div>}</div>
     :!hasProblem?<div className="status ok"><strong>✓ Available</strong> · {humanDay(form.startDate)} → {humanDay(form.endDate)} · {plural(nights,'night')}</div>
     :<p className="helper">Pick a room and both dates. The end date is the check-out day. Bookings can't overlap.</p>}
    </div>
    <h3>{check.room?`Reservations for ${check.room}`:'Reservations for this room'}</h3>
    {check.room?(roomBookings.length===0?<p className="helper">No reservations yet. Every date is free.</p>:<ul className="room-list">{roomBookings.map(b=>{const hit=rangeOk&&b.id!==editing&&form.startDate<b.endDate&&form.endDate>b.startDate;return <li key={b.id} className={hit?'hit':''}><span>{humanDay(b.startDate)} → {humanDay(b.endDate)}</span><em>{b.owner==='you'?'Yours':'Booked'}</em></li>;})}</ul>):<p className="helper">Choose a room to see when it is already booked.</p>}
   </div>
  </section>}

  {page==='mine'&&<section className="page card" aria-labelledby="mine-h">
   <div className="mine-top"><h2 id="mine-h">Step 3 · Your bookings</h2><span className="helper">{myBookings.length} current</span><button type="button" className="reserve-button small" onClick={()=>{clearForm();go('calendar');}}>+ Book another room</button></div>
   {myBookings.length===0?<p className="helper empty">You have no reservations yet. Use Availability to find free dates.</p>:<><div className="row mine-head"><span>Room</span><span>Dates</span><span className="col-n">Nights</span><span className="col-p">Purpose</span><span/></div>
   <div className="mine-list">{myBookings.map(b=><article key={b.id} className={'row mine-row'+(b.id===flashId?' flash':'')+(editing===b.id?' editing':'')}><span className="room-chip">{b.roomNumber}</span><strong>{humanDay(b.startDate)} → {humanDay(b.endDate)}</strong><span className="col-n">{plural(diffDays(b.startDate,b.endDate),'night')}</span><span className="col-p">{b.purpose||'No purpose entered'}</span><button type="button" className="change" onClick={()=>edit(b)} aria-label={`Change booking for ${b.roomNumber}`}>Change</button></article>)}</div></>}
  </section>}
  </main>
 </div>;
}