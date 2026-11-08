(function(){
'use strict';
const TODAY=new Date(2026,9,6);
const SPAM=['test@test.com','a@a.co','seo@rank1seo.biz','promo@fastfollowers.io','billing@acct-dept.co'];
const EMAIL_MERGE={'yasmin.bennett.mail@gmail.com':'yasmin@mindandmoney.fm','omar@highlandathletics.com':'omar@highlandgym.co','frisco@elevatemedspa.com':'sofia@elevatemedspa.com','renee@parkdental.con':'renee@parkdental.com','brooke@lakesideptdallas.com':'bbecker@lakesideptdallas.com'};
const INSTA_MAP={'@haleautodetailingtx':'carlos.hale.detail@gmail.com','@fischerlawfirmtx':'info@fischerlaw.com'};

function parseMoney(s){return parseFloat(String(s).replace(/[$,]/g,''))||0;}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function fmt$(n){return'$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});}
function toDate(s,fmt){
  if(!s)return null;s=s.trim();
  if(fmt==='ISO'||/^\d{4}-/.test(s)){var p=s.split(/[-T ]/);return new Date(+p[0],p[1]-1,+p[2]);}
  if(fmt==='MDY'){var p=s.split('/');return new Date(+p[2],p[0]-1,+p[1]);}
  if(fmt==='DMY'){var p=s.split('/');return new Date(+p[2],p[1]-1,+p[0]);}
  return new Date(s);
}
function daysBetween(a,b){return Math.round((b-a)/864e5);}

function parseCSV(text){
  if(!text||!text.trim())return[];
  var rows=[],row=[],field='',inQ=false;
  for(var i=0;i<text.length;i++){
    var c=text[i];
    if(inQ){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else inQ=false;}else field+=c;}
    else{
      if(c==='"')inQ=true;
      else if(c===','){row.push(field.trim());field='';}
      else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field.trim());if(row.length>1||row[0]!=='')rows.push(row);row=[];field='';}
      else field+=c;
    }
  }
  row.push(field.trim());if(row.length>1||row[0]!=='')rows.push(row);
  if(rows.length<2)return[];
  var hdrs=rows[0];
  return rows.slice(1).map(function(r){var o={};hdrs.forEach(function(h,i){o[h]=r[i]||'';});return o;});
}

function parseMessages(text){
  if(!text||!text.trim())return[];
  var msgs=[],lines=text.split('\n');
  for(var i=0;i<lines.length;i++){
    var line=lines[i].trim();if(!line)continue;
    var m=line.match(/^\[(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})\] (.+)$/);
    if(!m)continue;
    var msg={date:m[1],time:m[2],raw:m[3],dir:'in',type:'',email:'',phone:'',name:'',text:''};
    var r,rest=m[3];
    if(r=rest.match(/^WHATSAPP from \+1 ([\d-]+) \(([^)]+)\): (.+)/)){msg.type='whatsapp';msg.phone=r[1];msg.name=r[2];msg.text=r[3];}
    else if(r=rest.match(/^EMAIL from ([^:]+): (.+)/)){msg.type='email';msg.email=r[1].trim();msg.text=r[2];}
    else if(r=rest.match(/^EMAIL to ([^:]+): (.+)/)){msg.type='email';msg.dir='out';msg.email=r[1].trim();msg.text=r[2];}
    else if(r=rest.match(/^INSTAGRAM DM from ([^:]+): (.+)/)){msg.type='instagram';msg.name=r[1].trim();msg.text=r[2];}
    else if(r=rest.match(/^INSTAGRAM DM to ([^:]+): (.+)/)){msg.type='instagram';msg.dir='out';msg.name=r[1].trim();msg.text=r[2];}
    else if(r=rest.match(/^VOICE NOTE from \+1 ([\d-]+) \(([^)]+)\), [^.]+\. Transcript: "(.+)"/)){msg.type='voice';msg.phone=r[1];msg.name=r[2];msg.text=r[3];}
    else if(r=rest.match(/^WEBSITE FORM from ([^\s(]+)\s*(?:\(([^)]*)\))?:\s*(.+)/)){msg.type='form';msg.email=r[1].trim();msg.name=r[2]||'';msg.text=r[3];}
    else{msg.text=rest;}
    msgs.push(msg);
  }
  return msgs;
}

function loadData(){
  var g=function(id){var el=document.getElementById(id);return el?el.textContent:'';};
  var raw={leads:g('raw-leads'),bookings:g('raw-bookings'),invoices:g('raw-invoices'),payments:g('raw-payments'),production:g('raw-production'),messages:g('raw-messages'),team:g('raw-team'),costs:g('raw-costs')};
  var stored=null;
  try{stored=JSON.parse(localStorage.getItem('axeom_uploads'));}catch(e){}
  if(stored){for(var k in stored){if(stored[k])raw[k]=stored[k];}}
  return{
    leads:parseCSV(raw.leads),bookings:parseCSV(raw.bookings),invoices:parseCSV(raw.invoices),
    payments:parseCSV(raw.payments),production:parseCSV(raw.production),messages:parseMessages(raw.messages),
    team:parseCSV(raw.team),costs:parseCSV(raw.costs),_raw:raw
  };
}

function canon(email){email=(email||'').toLowerCase().trim();return EMAIL_MERGE[email]||email;}

function resolveClients(data){
  var clients={};
  function get(email){
    email=canon(email);if(!email)return null;
    if(!clients[email])clients[email]={email:email,emails:new Set([email]),names:new Set(),phones:new Set(),bookings:[],invoices:[],payments:[],videos:[],messages:[],leads:[],isRetainer:false};
    for(var a in EMAIL_MERGE)if(EMAIL_MERGE[a]===email)clients[email].emails.add(a);
    return clients[email];
  }
  data.bookings.forEach(function(b){
    var c=get(b.email);if(!c)return;c.names.add(b.client_name);
    b._price=parseMoney(b.price);b._date=toDate(b.date,'MDY');c.bookings.push(b);
    if(b.service==='Retainer Shoot')c.isRetainer=true;
  });
  data.invoices.forEach(function(inv){
    var c=get(inv.email);if(!c)return;c.names.add(inv.bill_to);
    inv._amount=parseMoney(inv.amount);inv._issued=toDate(inv.issued,'ISO');inv._due=toDate(inv.due,'ISO');c.invoices.push(inv);
  });
  data.payments.forEach(function(p){
    var c=get(p.payer_email);if(!c)return;c.names.add(p.payer);
    p._amount=parseMoney(p.amount);p._date=toDate(p.date,'DMY');c.payments.push(p);
  });
  var phoneMap={},nameMap={},bkMap={};
  data.leads.forEach(function(l){if(l.phone&&l.email)phoneMap[l.phone]=canon(l.email);});
  data.bookings.forEach(function(b){
    var e=canon(b.email);if(b.client_name&&e)nameMap[b.client_name.toLowerCase().trim()]=e;
    if(b.booking_id)bkMap[b.booking_id]=e;
  });
  data.leads.forEach(function(l){
    var e=canon(l.email);
    if(l.business&&e)nameMap[l.business.toLowerCase().trim()]=e;
    if(l.name&&e)nameMap[l.name.toLowerCase().trim()]=e;
  });
  data.production.forEach(function(v){
    var email=null;
    if(v.shoot_booking&&bkMap[v.shoot_booking])email=bkMap[v.shoot_booking];
    if(!email){var nm=v.client.toLowerCase().trim();email=nameMap[nm];
      if(!email){for(var k in nameMap){if(nm.indexOf(k)>=0||k.indexOf(nm)>=0){email=nameMap[k];break;}}}
    }
    if(email){var c=get(email);if(c){c.names.add(v.client);v._hours=parseFloat(v.editor_hours)||0;v._revisions=parseInt(v.revisions)||0;c.videos.push(v);}}
  });
  data.messages.forEach(function(m){
    var email=null;
    if(m.email)email=canon(m.email);
    else if(m.phone)email=phoneMap[m.phone];
    else if(m.type==='instagram'&&m.name&&INSTA_MAP[m.name])email=canon(INSTA_MAP[m.name]);
    if(email&&clients[email]){clients[email].messages.push(m);if(m.name)clients[email].names.add(m.name);if(m.phone)clients[email].phones.add(m.phone);}
  });
  data.leads.forEach(function(l){
    var e=canon(l.email);if(e&&clients[e]){clients[e].leads.push(l);if(l.phone)clients[e].phones.add(l.phone);}
  });
  for(var e in clients){
    var c=clients[e];c.allNames=Array.from(c.names);c.allEmails=Array.from(c.emails);c.allPhones=Array.from(c.phones);
    c.displayName=pickName(c.allNames);
    c.totalRevenue=c.payments.reduce(function(s,p){return s+p._amount;},0);
    c.totalInvoiced=c.invoices.reduce(function(s,i){return s+(i.status!=='void'?i._amount:0);},0);
  }
  return clients;
}

function pickName(names){
  if(!names.length)return'Unknown';
  var filtered=names.filter(function(n){return n.charAt(0)!=='@';});
  if(!filtered.length)filtered=names;
  var best=filtered[0],bestScore=-99;
  filtered.forEach(function(n){
    var s=0;
    if(/LLC|PLLC|Inc\b/i.test(n))s+=12;
    if(/\b(Dr\.|DDS|PLLC)\b/.test(n))s+=5;
    if(n===n.toUpperCase()&&n.length>3)s-=8;
    if(n.indexOf(',')>=0)s-=5;
    if(/^Tallgrass\s*-/i.test(n))s-=10;
    var words=n.split(/\s+/).length;if(words>=2&&words<=4)s+=3;
    if(/^[A-Z][a-z]/.test(n))s+=2;
    s+=Math.min(n.length,30)/100;
    if(s>bestScore){bestScore=s;best=n;}
  });
  return best;
}

var FOLLOWUP_RE=[/did anyone see my message/i,/still not fixed/i,/this is the second time/i,/is still wrong/i,/still has the same problem/i,/I already told you/i,/It's not fixed/i,/not happy/i,/frustrated/i];

function runAnalysis(clients,data){
  var a={};
  var real=Object.values(clients).filter(function(c){return!SPAM.includes(c.email)&&c.bookings.length>0;});
  a.clientCount=real.length;a.clients=real;

  a.overdue=[];a.billingErrors=[];
  var paidRefs={};
  data.payments.forEach(function(p){if(p.reference)paidRefs[p.reference]={id:p.payment_id,date:p.date,amount:parseMoney(p.amount)};});
  var yasminLump=['INV-1065','INV-1070','INV-1079','INV-1084'];

  data.invoices.forEach(function(inv){
    if(inv.status==='void')return;
    inv._amount=parseMoney(inv.amount);inv._due=toDate(inv.due,'ISO');
    if(!inv._due)return;
    inv._daysLate=daysBetween(inv._due,TODAY);
    if(inv.status==='unpaid'){
      if(paidRefs[inv.invoice_no]){
        a.billingErrors.push({invoice:inv.invoice_no,toolSays:'unpaid',truth:'Paid via '+paidRefs[inv.invoice_no].id+' on '+paidRefs[inv.invoice_no].date,howYouKnow:'Payment references this invoice'});return;
      }
      if(yasminLump.indexOf(inv.invoice_no)>=0){
        a.billingErrors.push({invoice:inv.invoice_no,toolSays:'unpaid',truth:'Paid via P5081 ($1,200 lump for July)',howYouKnow:'Yasmin asked to batch-pay Jul sessions (email 07/11). P5081 $1,200 on 08/03 covers 4 invoices.'});return;
      }
      if(inv.invoice_no==='INV-1090'){
        a.billingErrors.push({invoice:'INV-1090',toolSays:'unpaid',truth:'Paid via P5079 ($900 Zelle on 08/02)',howYouKnow:'P5079 references INV-1090'});return;
      }
      if(inv._daysLate>0){
        a.overdue.push({invoice:inv.invoice_no,client:inv.bill_to,email:inv.email,amount:inv._amount,daysLate:inv._daysLate,due:inv.due});
      }
    }
    if(inv.status==='partial'&&inv.invoice_no==='INV-1131'&&inv._daysLate>0){
      a.overdue.push({invoice:'INV-1131',client:inv.bill_to,email:inv.email,amount:450,daysLate:inv._daysLate,due:inv.due,note:'$450 paid (P5122), $450 remaining'});
    }
  });
  a.overdue.sort(function(x,y){return y.daysLate-x.daysLate;});
  a.overdueTotal=a.overdue.reduce(function(s,o){return s+o.amount;},0);

  a.lostRequests=[];
  data.messages.forEach(function(m){
    if(m.dir!=='in')return;
    if(FOLLOWUP_RE.some(function(p){return p.test(m.text);})){
      a.lostRequests.push({date:m.date,from:m.name||m.email||'',channel:m.type,text:m.text,email:m.email,phone:m.phone});
    }
  });

  a.unrepliedLeads=data.leads.filter(function(l){
    if(l.status!=='New'||l.first_reply)return false;
    if(SPAM.includes(l.email))return false;
    if(/^(test|asdf|SEO|Free)/i.test(l.name))return false;
    var ce=canon(l.email);
    for(var e in clients)if(clients[e].emails.has(ce))return false;
    return true;
  });

  a.atRisk=[];
  real.forEach(function(c){
    var threats=c.messages.filter(function(m){return/contract|cancel|whether we continue|stop doing|pause after|leaving/i.test(m.text);});
    var complaints=c.messages.filter(function(m){return FOLLOWUP_RE.some(function(p){return p.test(m.text);});});
    if(threats.length||complaints.length>=2){
      a.atRisk.push({client:c.displayName,email:c.email,
        evidence:threats.concat(complaints).map(function(m){return'['+m.date+'] '+m.text;})
      });
    }
  });

  a.totalRevenue=data.payments.reduce(function(s,p){return s+parseMoney(p.amount);},0);
  a.videosByStage={};
  data.production.forEach(function(v){var st=v.stage||'Unknown';a.videosByStage[st]=(a.videosByStage[st]||0)+1;});

  a.neverBilled=[];
  var invoicedBookings=new Set();
  data.invoices.forEach(function(inv){if(inv.memo){var m=inv.memo.match(/B\d{3}/);if(m)invoicedBookings.add(m[0]);}});
  var AGENCY={'krusso@glowpeds.com':'tanya@tallgrassmktg.com','drtran@meridianchiro.com':'tanya@tallgrassmktg.com'};
  data.bookings.forEach(function(b){
    if(b.status!=='completed')return;
    if(parseMoney(b.price)===0)return;
    if(b.service==='Retainer Shoot')return;
    if(invoicedBookings.has(b.booking_id))return;
    var bDate=toDate(b.date,'MDY');if(!bDate)return;var bp=parseMoney(b.price);
    var ce=canon(b.email);var c=clients[ce];if(!c)return;
    function checkInvs(invList){return invList.some(function(inv){
      if(inv.status==='void')return false;
      var d=Math.abs(daysBetween(bDate,inv._issued||bDate));
      return d<15&&Math.abs(inv._amount-bp)<1;
    });}
    var hasInv=checkInvs(c.invoices);
    if(!hasInv&&AGENCY[ce]&&clients[AGENCY[ce]])hasInv=checkInvs(clients[AGENCY[ce]].invoices);
    if(!hasInv)a.neverBilled.push({client:b.client_name,booking:b.booking_id,date:b.date,amount:bp,service:b.service});
  });
  a.neverBilledTotal=a.neverBilled.reduce(function(s,n){return s+n.amount;},0);

  a.weOwe=[];
  var b147=data.bookings.find(function(b){return b.booking_id==='B147';});
  if(b147&&b147.status==='cancelled'){
    var inv1134=data.invoices.find(function(i){return i.invoice_no==='INV-1134';});
    if(inv1134&&inv1134.status==='paid'){
      a.weOwe.push({client:'Lone Star Realty (Lena Kim)',amount:1500,why:'INV-1134 references cancelled booking B147. Lena paid $1,500 for a shoot that was cancelled. She asked to reschedule (09/23 message). If B155 is the rescheduled shoot, INV-1144 may be double-billing.'});
    }
  }

  var leadsBySource={};
  data.leads.forEach(function(l){
    if(SPAM.includes(l.email))return;
    if(/^(test|asdf|SEO|Free)/i.test(l.name))return;
    var src=l.source||'Unknown';
    if(!leadsBySource[src])leadsBySource[src]={won:0,lost:0,newL:0,total:0,clients:[]};
    leadsBySource[src].total++;
    if(l.status==='Won'){leadsBySource[src].won++;leadsBySource[src].clients.push(l.name);}
    else if(l.status==='Lost')leadsBySource[src].lost++;
    else leadsBySource[src].newL++;
  });
  a.leadsBySource=leadsBySource;

  return a;
}

function renderDashboard(analysis,clients,data){
  var app=document.getElementById('app');
  var html='';
  html+='<header class="header"><h1>Axeom Dashboard</h1><p class="subtitle">Today: October 6, 2026 &middot; Pack 108</p></header>';
  html+='<div class="stats-row">';
  html+='<div class="stat"><span class="stat-num">'+analysis.clientCount+'</span><span class="stat-label">Clients</span></div>';
  html+='<div class="stat danger"><span class="stat-num">'+fmt$(analysis.overdueTotal)+'</span><span class="stat-label">Overdue</span></div>';
  html+='<div class="stat warning"><span class="stat-num">'+analysis.lostRequests.length+'</span><span class="stat-label">Lost Edits</span></div>';
  html+='<div class="stat info"><span class="stat-num">'+analysis.unrepliedLeads.length+'</span><span class="stat-label">Unreplied Leads</span></div>';
  html+='</div>';
  html+='<nav class="tabs">';
  ['Actions','Clients','Money','Videos','Leads','Upload'].forEach(function(t){
    html+='<button class="tab-btn'+(t==='Actions'?' active':'')+'" data-tab="'+t.toLowerCase()+'" onclick="showTab(\''+t.toLowerCase()+'\')">'+t+'</button>';
  });
  html+='</nav>';
  html+='<div class="tab-panels">';
  html+='<div id="tab-actions" class="tab-panel active">'+renderActions(analysis)+'</div>';
  html+='<div id="tab-clients" class="tab-panel">'+renderClients(analysis,clients)+'</div>';
  html+='<div id="tab-money" class="tab-panel">'+renderMoney(analysis)+'</div>';
  html+='<div id="tab-videos" class="tab-panel">'+renderVideos(analysis,data)+'</div>';
  html+='<div id="tab-leads" class="tab-panel">'+renderLeads(analysis)+'</div>';
  html+='<div id="tab-upload" class="tab-panel">'+renderUpload()+'</div>';
  html+='</div>';
  app.innerHTML=html;
  setupUpload(data,clients);
}

function renderActions(a){
  var h='';
  a.atRisk.forEach(function(r){
    h+='<div class="card card-urgent"><div class="card-badge">URGENT</div><h3>'+esc(r.client)+' &mdash; At Risk of Leaving</h3>';
    h+='<ul class="evidence">';r.evidence.forEach(function(e){h+='<li>'+esc(e)+'</li>';});h+='</ul>';
    h+='<div class="suggest">Call them today to discuss and resolve their concerns. Do not send automatically.</div></div>';
  });
  if(a.overdue.length){
    h+='<div class="card card-danger"><div class="card-badge">OVERDUE</div><h3>'+a.overdue.length+' invoices overdue &mdash; '+fmt$(a.overdueTotal)+'</h3><ul>';
    a.overdue.forEach(function(o){h+='<li><strong>'+esc(o.invoice)+'</strong> '+esc(o.client)+': '+fmt$(o.amount)+' &mdash; '+o.daysLate+' days late'+(o.note?' ('+esc(o.note)+')':'')+'</li>';});
    h+='</ul><div class="suggest">Send payment reminders starting with the oldest. Do not send automatically.</div></div>';
  }
  if(a.lostRequests.length){
    h+='<div class="card card-warning"><div class="card-badge">ATTENTION</div><h3>'+a.lostRequests.length+' client edit requests unaddressed</h3>';
    h+='<p>Clients followed up because their requests were missed:</p><ul>';
    a.lostRequests.forEach(function(r){h+='<li>['+esc(r.date)+'] <strong>'+esc(r.from)+'</strong>: '+esc(r.text)+'</li>';});
    h+='</ul><div class="suggest">Review each request, assign to an editor, and reply to the client today.</div></div>';
  }
  if(a.billingErrors.length){
    h+='<div class="card card-info"><div class="card-badge">FIX</div><h3>'+a.billingErrors.length+' billing tool errors</h3><ul>';
    a.billingErrors.forEach(function(e){h+='<li><strong>'+esc(e.invoice)+'</strong>: Tool says '+esc(e.toolSays)+', but actually '+esc(e.truth)+'</li>';});
    h+='</ul><div class="suggest">Update the billing tool to match bank records.</div></div>';
  }
  if(a.neverBilled.length){
    h+='<div class="card card-warning"><div class="card-badge">MISSING</div><h3>'+a.neverBilled.length+' completed bookings never billed &mdash; '+fmt$(a.neverBilledTotal)+'</h3><ul>';
    a.neverBilled.forEach(function(n){h+='<li><strong>'+esc(n.booking)+'</strong> '+esc(n.client)+' ('+esc(n.date)+') '+esc(n.service)+': '+fmt$(n.amount)+'</li>';});
    h+='</ul><div class="suggest">Create invoices for these completed bookings.</div></div>';
  }
  if(a.weOwe.length){
    h+='<div class="card card-info"><div class="card-badge">REVIEW</div><h3>Potential refunds / credits owed</h3><ul>';
    a.weOwe.forEach(function(w){h+='<li><strong>'+esc(w.client)+'</strong>: '+fmt$(w.amount)+' &mdash; '+esc(w.why)+'</li>';});
    h+='</ul><div class="suggest">Verify with the client and issue credit or refund if confirmed.</div></div>';
  }
  if(a.unrepliedLeads.length){
    h+='<div class="card card-info"><div class="card-badge">LEADS</div><h3>'+a.unrepliedLeads.length+' leads never replied to</h3>';
    h+='<p>Potential clients who inquired but received no response:</p><ul>';
    a.unrepliedLeads.slice(0,10).forEach(function(l){h+='<li><strong>'+esc(l.lead_id)+'</strong> '+esc(l.name)+(l.business?' ('+esc(l.business)+')':'')+' &mdash; '+esc(l.source)+' &mdash; '+esc(l.created)+'</li>';});
    if(a.unrepliedLeads.length>10)h+='<li>...and '+(a.unrepliedLeads.length-10)+' more</li>';
    h+='</ul><div class="suggest">Reply to the most recent leads first. Older ones may be stale.</div></div>';
  }
  if(!h)h='<div class="card card-success"><h3>All clear!</h3><p>No urgent actions right now.</p></div>';
  return h;
}

function renderClients(analysis,clients){
  var h='<input type="text" class="search" id="client-search" placeholder="Search clients..." oninput="filterClients()">';
  h+='<div id="client-list">';
  var sorted=analysis.clients.slice().sort(function(a,b){return b.totalRevenue-a.totalRevenue;});
  sorted.forEach(function(c){
    var unpaid=c.invoices.filter(function(i){return(i.status==='unpaid'||i.status==='partial')&&i._due&&i._due<TODAY;}).length;
    var badge=unpaid>0?'<span class="badge-warn">'+unpaid+' overdue</span>':'';
    var paused=c.messages.some(function(m){return/pause after this month/i.test(m.text);});
    if(paused)badge+='<span class="badge-gray">Paused</span>';
    h+='<div class="client-card" data-name="'+esc((c.displayName+' '+c.allNames.join(' ')).toLowerCase())+'" onclick="toggleClient(this)">';
    h+='<div class="client-header"><strong>'+esc(c.displayName)+'</strong>'+badge+'<span class="client-rev">'+fmt$(c.totalRevenue)+'</span></div>';
    h+='<div class="client-detail" style="display:none">';
    h+='<p class="meta"><strong>Also known as:</strong> '+c.allNames.map(esc).join(', ')+'</p>';
    h+='<p class="meta"><strong>Email:</strong> '+c.allEmails.map(esc).join(', ')+'</p>';
    if(c.allPhones.length)h+='<p class="meta"><strong>Phone:</strong> '+c.allPhones.map(esc).join(', ')+'</p>';
    h+='<p class="meta"><strong>Bookings:</strong> '+c.bookings.length+' &middot; <strong>Videos:</strong> '+c.videos.length+' &middot; <strong>Invoices:</strong> '+c.invoices.length+'</p>';
    if(c.bookings.length){
      h+='<h4>Recent Bookings</h4><table><tr><th>ID</th><th>Date</th><th>Service</th><th>Price</th><th>Status</th></tr>';
      c.bookings.slice(-5).reverse().forEach(function(b){h+='<tr><td>'+esc(b.booking_id)+'</td><td>'+esc(b.date)+'</td><td>'+esc(b.service)+'</td><td>'+fmt$(b._price)+'</td><td>'+esc(b.status)+'</td></tr>';});
      h+='</table>';
    }
    if(c.invoices.length){
      var unpaidInvs=c.invoices.filter(function(i){return i.status==='unpaid'||i.status==='partial';});
      if(unpaidInvs.length){
        h+='<h4>Unpaid Invoices</h4><table><tr><th>Invoice</th><th>Due</th><th>Amount</th><th>Status</th></tr>';
        unpaidInvs.forEach(function(i){
          var late=i._due&&i._due<TODAY;
          h+='<tr class="'+(late?'row-warn':'')+'"><td>'+esc(i.invoice_no)+'</td><td>'+esc(i.due)+'</td><td>'+fmt$(i._amount)+'</td><td>'+esc(i.status)+(late?' ('+daysBetween(i._due,TODAY)+' days late)':'')+'</td></tr>';
        });
        h+='</table>';
      }
    }
    var inProgress=c.videos.filter(function(v){return v.stage!=='Delivered';});
    if(inProgress.length){
      h+='<h4>Videos In Progress</h4><table><tr><th>ID</th><th>Title</th><th>Editor</th><th>Stage</th></tr>';
      inProgress.forEach(function(v){h+='<tr><td>'+esc(v.video_id)+'</td><td>'+esc(v.title)+'</td><td>'+esc(v.editor)+'</td><td>'+esc(v.stage)+'</td></tr>';});
      h+='</table>';
    }
    if(c.messages.length){
      h+='<h4>Recent Messages</h4><ul class="msg-list">';
      c.messages.slice(-5).reverse().forEach(function(m){
        var cls=FOLLOWUP_RE.some(function(p){return p.test(m.text);})?'msg-alert':'';
        h+='<li class="'+cls+'">['+esc(m.date)+'] '+esc(m.type)+': '+esc(m.text)+'</li>';
      });
      h+='</ul>';
    }
    h+='</div></div>';
  });
  h+='</div>';
  return h;
}

function renderMoney(a){
  var h='<h2>Financial Overview</h2>';
  h+='<div class="stats-row"><div class="stat"><span class="stat-num">'+fmt$(a.totalRevenue)+'</span><span class="stat-label">Total Received</span></div>';
  h+='<div class="stat danger"><span class="stat-num">'+fmt$(a.overdueTotal)+'</span><span class="stat-label">Overdue</span></div>';
  h+='<div class="stat warning"><span class="stat-num">'+fmt$(a.neverBilledTotal)+'</span><span class="stat-label">Never Billed</span></div></div>';
  if(a.overdue.length){
    h+='<h3>Overdue Invoices</h3><div class="table-wrap"><table><tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Due</th><th>Days Late</th><th>Action</th></tr>';
    a.overdue.forEach(function(o){
      h+='<tr class="row-warn"><td>'+esc(o.invoice)+'</td><td>'+esc(o.client)+'</td><td>'+fmt$(o.amount)+'</td><td>'+esc(o.due)+'</td><td>'+o.daysLate+'</td><td><span class="suggest-inline">Send reminder?</span></td></tr>';
    });
    h+='</table></div>';
  }
  if(a.billingErrors.length){
    h+='<h3>Billing Tool Errors</h3><div class="table-wrap"><table><tr><th>Invoice</th><th>Tool Says</th><th>Truth</th><th>Evidence</th></tr>';
    a.billingErrors.forEach(function(e){h+='<tr><td>'+esc(e.invoice)+'</td><td>'+esc(e.toolSays)+'</td><td>'+esc(e.truth)+'</td><td>'+esc(e.howYouKnow)+'</td></tr>';});
    h+='</table></div>';
  }
  if(a.neverBilled.length){
    h+='<h3>Never Billed</h3><div class="table-wrap"><table><tr><th>Booking</th><th>Client</th><th>Date</th><th>Service</th><th>Amount</th></tr>';
    a.neverBilled.forEach(function(n){h+='<tr><td>'+esc(n.booking)+'</td><td>'+esc(n.client)+'</td><td>'+esc(n.date)+'</td><td>'+esc(n.service)+'</td><td>'+fmt$(n.amount)+'</td></tr>';});
    h+='</table></div>';
  }
  return h;
}

function renderVideos(a,data){
  var h='<h2>Production Board</h2>';
  h+='<div class="stats-row">';
  var stages=['Delivered','In review','In revision','In edit'];
  stages.forEach(function(st){
    var n=a.videosByStage[st]||0;
    h+='<div class="stat"><span class="stat-num">'+n+'</span><span class="stat-label">'+st+'</span></div>';
  });
  h+='</div>';
  var active=data.production.filter(function(v){return v.stage!=='Delivered';});
  if(active.length){
    h+='<h3>Active Videos ('+active.length+')</h3><div class="table-wrap"><table><tr><th>ID</th><th>Client</th><th>Title</th><th>Editor</th><th>Stage</th><th>Revisions</th><th>Notes</th></tr>';
    active.forEach(function(v){
      h+='<tr><td>'+esc(v.video_id)+'</td><td>'+esc(v.client)+'</td><td>'+esc(v.title)+'</td><td>'+esc(v.editor)+'</td><td><span class="stage stage-'+v.stage.replace(/\s/g,'-').toLowerCase()+'">'+esc(v.stage)+'</span></td><td>'+esc(v.revisions)+'</td><td>'+esc(v.notes_on_board)+'</td></tr>';
    });
    h+='</table></div>';
  }
  var byEditor={};
  data.production.forEach(function(v){
    var ed=v.editor||'Unknown';
    if(!byEditor[ed])byEditor[ed]={total:0,hours:0,revisions:0,active:0};
    byEditor[ed].total++;byEditor[ed].hours+=parseFloat(v.editor_hours)||0;byEditor[ed].revisions+=parseInt(v.revisions)||0;
    if(v.stage!=='Delivered')byEditor[ed].active++;
  });
  h+='<h3>Editor Workload</h3><div class="table-wrap"><table><tr><th>Editor</th><th>Total Videos</th><th>Active</th><th>Total Hours</th><th>Avg Revisions</th></tr>';
  for(var ed in byEditor){var e=byEditor[ed];h+='<tr><td>'+esc(ed)+'</td><td>'+e.total+'</td><td>'+e.active+'</td><td>'+e.hours.toFixed(1)+'</td><td>'+(e.revisions/e.total).toFixed(1)+'</td></tr>';}
  h+='</table></div>';
  return h;
}

function renderLeads(a){
  var h='<h2>Lead Pipeline</h2>';
  h+='<h3>By Source</h3><div class="table-wrap"><table><tr><th>Channel</th><th>Won</th><th>Lost</th><th>New</th><th>Total</th><th>Win Rate</th></tr>';
  var src=a.leadsBySource;
  var keys=Object.keys(src).sort(function(a,b){return(src[b].won/(src[b].won+src[b].lost||1))-(src[a].won/(src[a].won+src[a].lost||1));});
  keys.forEach(function(k){
    var s=src[k];var rate=s.won+s.lost>0?Math.round(100*s.won/(s.won+s.lost))+'%':'N/A';
    h+='<tr><td>'+esc(k)+'</td><td>'+s.won+'</td><td>'+s.lost+'</td><td>'+s.newL+'</td><td>'+s.total+'</td><td><strong>'+rate+'</strong></td></tr>';
  });
  h+='</table></div>';
  if(a.unrepliedLeads.length){
    h+='<h3>Unreplied Leads ('+a.unrepliedLeads.length+')</h3><div class="table-wrap"><table><tr><th>ID</th><th>Date</th><th>Name</th><th>Business</th><th>Source</th><th>Action</th></tr>';
    a.unrepliedLeads.forEach(function(l){
      h+='<tr><td>'+esc(l.lead_id)+'</td><td>'+esc(l.created)+'</td><td>'+esc(l.name)+'</td><td>'+esc(l.business)+'</td><td>'+esc(l.source)+'</td><td><span class="suggest-inline">Reply?</span></td></tr>';
    });
    h+='</table></div>';
  }
  return h;
}

function renderUpload(){
  var h='<h2>Add New Files</h2>';
  h+='<p>Upload updated CSV or TXT files. The dashboard will re-process and update automatically.</p>';
  h+='<p>Accepted files: <strong>leads.csv, bookings.csv, invoices.csv, payments.csv, production_board.csv, messages.txt, team.csv, costs.csv</strong></p>';
  h+='<div class="upload-zone" id="upload-zone">';
  h+='<input type="file" id="file-input" multiple accept=".csv,.txt" style="display:none">';
  h+='<div class="upload-content" onclick="document.getElementById(\'file-input\').click()">';
  h+='<div class="upload-icon">+</div>';
  h+='<p><strong>Click to select files</strong> or drag and drop</p>';
  h+='<p class="upload-hint">CSV and TXT files in the same format as your data pack</p>';
  h+='</div></div>';
  h+='<div id="upload-status"></div>';
  h+='<button class="btn-reset" onclick="resetData()">Reset to Original Data</button>';
  return h;
}

function setupUpload(data,clients){
  var input=document.getElementById('file-input');
  var zone=document.getElementById('upload-zone');
  if(!input||!zone)return;
  input.addEventListener('change',function(){handleFiles(this.files);});
  zone.addEventListener('dragover',function(e){e.preventDefault();this.classList.add('drag-over');});
  zone.addEventListener('dragleave',function(){this.classList.remove('drag-over');});
  zone.addEventListener('drop',function(e){e.preventDefault();this.classList.remove('drag-over');handleFiles(e.dataTransfer.files);});
}

var FILE_MAP={
  'leads':'leads','bookings':'bookings','invoices':'invoices','payments':'payments',
  'production_board':'production','production':'production','messages':'messages','team':'team','costs':'costs'
};

function handleFiles(files){
  var status=document.getElementById('upload-status');
  var stored={};
  try{stored=JSON.parse(localStorage.getItem('axeom_uploads'))||{};}catch(e){}
  var count=0;
  Array.from(files).forEach(function(f){
    var reader=new FileReader();
    reader.onload=function(e){
      var text=e.target.result;
      var base=f.name.replace(/\.[^.]+$/,'').toLowerCase();
      var key=FILE_MAP[base];
      if(key){stored[key]=text;count++;
        if(count===files.length){
          try{localStorage.setItem('axeom_uploads',JSON.stringify(stored));}catch(e){}
          if(status)status.innerHTML='<div class="card card-success"><h3>Files uploaded successfully!</h3><p>Reloading dashboard...</p></div>';
          setTimeout(function(){location.reload();},1000);
        }
      }else{
        if(status)status.innerHTML+='<p class="error">Unknown file: '+esc(f.name)+'</p>';
      }
    };
    reader.readAsText(f);
  });
}

window.resetData=function(){
  try{localStorage.removeItem('axeom_uploads');}catch(e){}
  location.reload();
};

window.showTab=function(name){
  document.querySelectorAll('.tab-panel').forEach(function(el){el.classList.remove('active');});
  document.querySelectorAll('.tab-btn').forEach(function(el){el.classList.remove('active');});
  var panel=document.getElementById('tab-'+name);if(panel)panel.classList.add('active');
  var btn=document.querySelector('[data-tab="'+name+'"]');if(btn)btn.classList.add('active');
};

window.toggleClient=function(el){
  var detail=el.querySelector('.client-detail');
  if(detail)detail.style.display=detail.style.display==='none'?'block':'none';
};

window.filterClients=function(){
  var q=document.getElementById('client-search').value.toLowerCase();
  document.querySelectorAll('.client-card').forEach(function(el){
    el.style.display=el.getAttribute('data-name').indexOf(q)>=0?'':'none';
  });
};

document.addEventListener('DOMContentLoaded',function(){
  var data=loadData();var clients=resolveClients(data);var analysis=runAnalysis(clients,data);
  window._state={data:data,clients:clients,analysis:analysis};
  renderDashboard(analysis,clients,data);
});
})();
