// @ts-nocheck
import { useEffect } from "react";

export default function Index() {
  useEffect(() => {
    /* ---------- cleanup registry (listeners, observers, intervals) ---------- */
    const listeners = [];
    const observers = [];
    const intervals = [];
    const on = (target, type, fn, opts) => {
      target.addEventListener(type, fn, opts);
      listeners.push([target, type, fn, opts]);
    };
    const mkIO = (cb, opts) => {
      const o = new IntersectionObserver(cb, opts);
      observers.push(o);
      return o;
    };
    const mkInterval = (fn, ms) => {
      const id = setInterval(fn, ms);
      intervals.push(id);
      return id;
    };

    /* ---------- shared reveals ---------- */
    const io=mkIO(e=>{e.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{threshold:.18});
    document.querySelectorAll('.rv,.rvb').forEach(el=>io.observe(el));

    /* ---------- smooth anchors ---------- */
    document.querySelectorAll('[data-go]').forEach(b=>on(b,'click',()=>{
      document.querySelector(b.dataset.go).scrollIntoView({behavior:'smooth'});
    }));

    /* ---------- atoms ---------- */
    const fld=document.getElementById('field');
    mkIO((e,o)=>{e.forEach(x=>{if(x.isIntersecting){fld.classList.add('in');o.unobserve(x.target)}})},{threshold:.3}).observe(fld);
    if(matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion:reduce)').matches){
      let raf=null;
      on(fld,'pointermove',ev=>{
        if(raf)return;
        raf=requestAnimationFrame(()=>{
          const r=fld.getBoundingClientRect();
          const nx=(ev.clientX-r.left)/r.width-.5, ny=(ev.clientY-r.top)/r.height-.5;
          fld.querySelectorAll('.atom').forEach(a=>{
            const d=+a.dataset.d;
            a.querySelector('.px').style.translate=`${nx*16*d}px ${ny*14*d}px`;
          });
          raf=null;
        });
      });
      on(fld,'pointerleave',()=>fld.querySelectorAll('.px').forEach(p=>p.style.translate='0px 0px'));
    }

    /* ---------- nav auto hide ---------- */
    (function(){
      const nv=document.getElementById('nav');
      if(!nv)return;
      let last=scrollY,nf=null;
      on(window,'scroll',()=>{
        if(nf)return;
        nf=requestAnimationFrame(()=>{
          const y=scrollY;
          if(y<80)nv.classList.remove('hid');
          else if(y>last)nv.classList.add('hid');
          else if(y<last)nv.classList.remove('hid');
          last=y;nf=null;
        });
      },{passive:true});
    })();

    /* ---------- theater ---------- */
    const stage=document.getElementById('stage'),track=document.getElementById('track');
    const STEPS=6,$=id=>document.getElementById(id);
    const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
    let step=-1,counted=false;
    const rail=$('rail');
    function tailPx(){
      const v=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tail'))||0;
      return innerHeight*v/100;
    }
    function dist(){return Math.max(1,track.offsetHeight-innerHeight-tailPx());}
    for(let i=0;i<STEPS;i++){
      const b=document.createElement('button');
      b.className='dot';b.setAttribute('aria-label','Step '+(i+1));
      b.onclick=()=>{scrollTo({top:track.offsetTop+(i+.5)/STEPS*dist(),behavior:reduce?'auto':'smooth'});};
      rail.appendChild(b);
    }
    function count(el,to){if(reduce){el.textContent=to;return;}
      let v=0;const t=mkInterval(()=>{v+=Math.ceil(to/20);if(v>=to){v=to;clearInterval(t);}el.textContent=v;},32);}
    function countMoney(el,to){
      if(reduce){el.textContent='$'+to.toLocaleString();return;}
      const t0=performance.now(),dur=1100;
      (function f(t){
        const p=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-p,3);
        el.textContent='$'+Math.round(to*e).toLocaleString();
        if(p<1)requestAnimationFrame(f);
      })(t0);
    }
    function render(s){
      if(s===step)return;const back=s<step;step=s;stage.dataset.step=s;
      document.querySelectorAll('.beat').forEach(b=>b.classList.toggle('on',+b.dataset.b===s));
      [...rail.children].forEach((d,i)=>d.setAttribute('aria-current',i===s));
      $('lLock').classList.toggle('on',s<=1);
      $('lMsgs').classList.toggle('on',s>=2&&s<=3);
      $('lDash').classList.toggle('on',s>=4);
      $('notif').classList.toggle('show',s===1);
      $('m1').classList.toggle('on',s>=2);$('typ').classList.toggle('on',s===2);
      $('m2').classList.toggle('on',s>=2);$('m3').classList.toggle('on',s>=3);$('m4').classList.toggle('on',s>=3);
      $('f1').classList.toggle('show',s>=2&&s<5);
      $('f2').classList.toggle('show',s>=3&&s<5);
      $('f3').classList.toggle('show',s>=4&&s<5);
      const h=[30,48,40,64,54,78,96];
      [...$('bars').children].forEach((b,i)=>{b.style.height=(s>=4?h[i]:18)+'%';b.classList.toggle('g',s>=4&&i>4);});
      if(s>=4&&!counted){counted=true;countMoney($('v0'),2840);count($('v1'),34);count($('v2'),27);count($('v3'),9);}
      if(s<4&&back){counted=false;$('v0').textContent='$0';$('v1').textContent='0';$('v2').textContent='0';$('v3').textContent='0';}
    }
    function tick(){
      const p=Math.min(1,Math.max(0,(scrollY-track.offsetTop)/dist()));
      render(Math.min(STEPS-1,Math.floor(p*STEPS)));}
    on(window,'scroll',()=>requestAnimationFrame(tick),{passive:true});
    on(window,'resize',tick);tick();

    /* ---------- close gradient trigger ---------- */
    const closeEl=document.getElementById('close');
    mkIO((e,o)=>{e.forEach(x=>{if(x.isIntersecting){closeEl.classList.add('lit');o.unobserve(x.target)}})},
      {threshold:0,rootMargin:'0px 0px -14% 0px'}).observe(closeEl);

    /* ---------- cycling business name ---------- */
    const WORDS=['barbershops','restaurants','dealerships','clinics','roofers','salons','gyms','med spas',
      'plumbers','detail shops','law offices','trucking','landscapers','dentists','tattoo studios',
      'food trucks','movers','auto repair','bakeries','photographers'];
    const rwA=document.getElementById('rwA'),rwB=document.getElementById('rwB');
    let ri=0,front=true;
    rwA.textContent=WORDS[0];
    function roll(){
      ri=(ri+1)%WORDS.length;
      const enter=front?rwB:rwA, leave=front?rwA:rwB;
      enter.textContent=WORDS[ri];
      enter.style.transition='none';
      enter.className='rw next';
      void enter.offsetWidth;
      enter.style.transition='';
      enter.className='rw now';
      leave.className='rw gone';
      front=!front;
    }
    mkInterval(roll,1250);

    /* ---------- integrations marquee ---------- */
    (function(){
      const tr=document.getElementById('mtrack');
      if(!tr)return;
      tr.querySelectorAll('.mitem img').forEach(img=>{
        const src=(img.dataset.src||'').trim();
        if(!src){img.remove();return;}
        on(img,'load',()=>{const s=img.nextElementSibling;if(s)s.remove()});
        on(img,'error',()=>img.remove());
        img.src=src;
      });
      const clone=tr.cloneNode(true);
      clone.removeAttribute('id');
      clone.setAttribute('aria-hidden','true');
      [...clone.children].forEach(c=>tr.appendChild(c));
    })();

    /* ---------- feature card images ---------- */
    document.querySelectorAll('.fmedia').forEach(m=>{
      const src=(m.dataset.src||'').trim(),img=m.querySelector('img');
      if(!src){m.remove();return;}
      on(img,'load',()=>m.closest('.fcard').classList.add('hasimg'));
      on(img,'error',()=>m.remove());
      img.src=src;
    });

    /* ---------- project posters and clips ---------- */
    const fine=matchMedia('(pointer:fine)').matches;
    document.querySelectorAll('.shot').forEach(shot=>{
      const poster=(shot.dataset.poster||'').trim();
      const list=(shot.dataset.clips||'').split(',').map(s=>s.trim()).filter(Boolean);
      const pimg=shot.querySelector('.poster'),vid=shot.querySelector('.clip'),pips=shot.querySelector('.pips');
      if(poster){
        on(pimg,'load',()=>shot.classList.add('hasposter'));
        on(pimg,'error',()=>pimg.remove());
        pimg.src=poster;
      }else{pimg.remove();}
      if(!list.length)return;
      let idx=0;
      pips.innerHTML=list.map((_,i)=>'<button aria-label="Clip '+(i+1)+'" aria-current="'+(i===0)+'"></button>').join('');
      const pb=[...pips.children];
      function play(){shot.classList.add('playing');vid.play().catch(()=>{})}
      function stop(){shot.classList.remove('playing');vid.pause();vid.currentTime=0}
      function load(i,go){idx=i;vid.src=list[i];pb.forEach((b,j)=>b.setAttribute('aria-current',j===i));if(go)play()}
      on(vid,'loadeddata',()=>shot.classList.add('hasvid'));
      on(vid,'error',()=>shot.classList.remove('hasvid','playing'));
      pb.forEach((b,i)=>b.onclick=e=>{e.stopPropagation();load(i,true)});
      load(0,false);
      if(fine){
        on(shot,'pointerenter',play);
        on(shot,'pointerleave',stop);
        on(shot,'click',()=>load((idx+1)%list.length,true));
      }else{
        on(shot,'click',()=>{
          if(shot.classList.contains('playing')){stop()}else{play()}
        });
        mkIO(es=>es.forEach(e=>{if(!e.isIntersecting)stop()}),{threshold:.2}).observe(shot);
      }
    });

    /* ---------- sticky glass nav + section tracking ---------- */
    const navEl=document.getElementById('nav');
    const nlinksEl=document.getElementById('nlinks');
    const nlinks=[...document.querySelectorAll('.nlink')];
    const nsecs=nlinks.map(a=>document.querySelector(a.getAttribute('href')));
    function absTop(el){let y=0;while(el){y+=el.offsetTop;el=el.offsetParent}return y}
    let tops=[],active=-1;
    function measure(){tops=nsecs.map(s=>s?absTop(s):Infinity);}
    function spy(){
      const y=scrollY+innerHeight*.34;
      let idx=-1;
      for(let i=0;i<tops.length;i++){if(y>=tops[i])idx=i;}
      if(idx===active)return;
      active=idx;
      nlinks.forEach((l,i)=>l.classList.toggle('on',i===idx));
      document.querySelectorAll('.lrow').forEach((r,i)=>r.classList.toggle('on',i===idx));

      if(idx>-1&&nlinksEl.scrollWidth>nlinksEl.clientWidth+4){
        const l=nlinks[idx];
        nlinksEl.scrollTo({left:l.offsetLeft-(nlinksEl.clientWidth-l.offsetWidth)/2,behavior:'smooth'});
      }
    }
    nlinks.forEach((l,i)=>on(l,'click',e=>{
      e.preventDefault();
      if(!nsecs[i])return;
      const pad=innerWidth<=860?104:88;
      scrollTo({top:Math.max(0,absTop(nsecs[i])-pad),behavior:reduce?'auto':'smooth'});
    }));
    let nraf=null;
    on(window,'scroll',()=>{
      navEl.classList.toggle('stuck',scrollY>24);
      if(nraf)return;
      nraf=requestAnimationFrame(()=>{spy();nraf=null});
    },{passive:true});
    on(window,'resize',()=>{measure();active=-1;spy()});
    on(window,'load',()=>{measure();active=-1;spy()});
    measure();spy();

    /* ---------- hero dot field ---------- */
    (function(){
      const cv=document.getElementById('dots');
      if(!cv||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
      const ctx=cv.getContext('2d'),hero=cv.parentElement;
      const dpr=Math.min(devicePixelRatio||1,2),SP=30,R=210;
      const touch=!matchMedia('(pointer:fine)').matches;
      let w=0,h=0,pts=[],px=-999,py=-999,tx=-999,ty=-999,raf=null,live=false,lastW=0;
      function size(){
        const r=hero.getBoundingClientRect();
        w=Math.round(r.width);h=Math.round(r.height);
        cv.width=w*dpr;cv.height=h*dpr;cv.style.width=w+'px';cv.style.height=h+'px';
        ctx.setTransform(dpr,0,0,dpr,0,0);
        pts=[];
        for(let y=SP;y<h;y+=SP)for(let x=SP;x<w;x+=SP)pts.push({x,y});
        lastW=w;
        if(touch&&tx<0){tx=w*.5;ty=h*.5;px=tx;py=ty;}
      }
      function frame(){
        const e=touch?.022:.11;
        px+=(tx-px)*e;py+=(ty-py)*e;
        ctx.clearRect(0,0,w,h);
        for(let i=0;i<pts.length;i++){
          const p=pts[i],dx=p.x-px,dy=p.y-py,d=Math.sqrt(dx*dx+dy*dy);
          let f=0;
          if(d<R){f=1-d/R;f=f*f;}
          const lift=f*26,rad=.85+f*2.6,a=.09+f*.72;
          ctx.beginPath();
          ctx.arc(p.x,p.y-lift,rad,0,6.2832);
          ctx.fillStyle='rgba('+Math.round(245-245*f)+','+Math.round(245+10*f)+','+Math.round(247-112*f)+','+a+')';
          ctx.fill();
        }
        raf=requestAnimationFrame(frame);
      }
      function start(){if(!live){live=true;raf=requestAnimationFrame(frame)}}
      function halt(){live=false;if(raf)cancelAnimationFrame(raf);raf=null}
      if(!touch){
        on(hero,'pointermove',ev=>{
          const r=hero.getBoundingClientRect();tx=ev.clientX-r.left;ty=ev.clientY-r.top;
        });
        on(hero,'pointerleave',()=>{tx=w*.5;ty=h*.5});
      }else{
        mkInterval(()=>{tx=w*(.2+Math.random()*.6);ty=h*(.16+Math.random()*.42)},2600);
      }
      size();
      on(window,'resize',()=>{if(Math.abs(innerWidth-lastW)>2||!pts.length)size()});
      mkIO(es=>es.forEach(e=>e.isIntersecting?start():halt()),{threshold:0}).observe(hero);
    })();

    /* ---------- swipe rails with trackers (mobile) ---------- */
    function railTracker(railId,trackId,itemSel){
      const rail=document.getElementById(railId),track=document.getElementById(trackId);
      if(!rail||!track)return;
      const marks=[...track.children],cards=[...rail.querySelectorAll(itemSel)];
      let rr=null;
      on(rail,'scroll',()=>{
        if(rr)return;
        rr=requestAnimationFrame(()=>{
          const mid=rail.scrollLeft+rail.clientWidth/2;
          let best=0,dist=Infinity;
          cards.forEach((c,i)=>{
            const d=Math.abs(c.offsetLeft+c.offsetWidth/2-mid);
            if(d<dist){dist=d;best=i}
          });
          marks.forEach((m,i)=>m.classList.toggle('on',i===best));
          rr=null;
        });
      },{passive:true});
      marks.forEach((m,i)=>on(m,'click',()=>{
        rail.scrollTo({left:cards[i].offsetLeft-(rail.clientWidth-cards[i].offsetWidth)/2,behavior:'smooth'});
      }));
    }
    railTracker('tiers','ptrack','.tier');

    /* ---------- problem icons: notification popups ---------- */
    (function(){
      const atoms=[...document.querySelectorAll('.atom')];
      if(!atoms.length)return;
      const fine=matchMedia('(pointer:fine)').matches;
      function closeAll(except){atoms.forEach(a=>{if(a!==except)a.classList.remove('open')})}
      atoms.forEach(a=>{
        a.setAttribute('tabindex','0');
        on(a,'click',ev=>{
          ev.stopPropagation();
          const open=a.classList.contains('open');
          closeAll(a);
          a.classList.toggle('open',!open);
        });
        on(a,'keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();a.click()}});
        if(fine){
          on(a,'pointerenter',()=>{closeAll(a);a.classList.add('open')});
          on(a,'pointerleave',()=>a.classList.remove('open'));
        }
      });
      on(document,'click',()=>closeAll(null));
      on(document,'keydown',ev=>{if(ev.key==='Escape')closeAll(null)});
    })();

    /* ---------- logo menu ---------- */
    (function(){
      const mark=document.getElementById('mark'),menu=document.getElementById('lmenu');
      if(!mark||!menu)return;
      const rows=[...menu.querySelectorAll('.lrow')];
      function setOpen(v){menu.classList.toggle('open',v);mark.setAttribute('aria-expanded',String(v))}
      on(mark,'click',ev=>{ev.stopPropagation();setOpen(!menu.classList.contains('open'))});
      on(menu,'click',ev=>ev.stopPropagation());
      rows.forEach(r=>on(r,'click',()=>{
        const sec=document.querySelector(r.dataset.sec);
        setOpen(false);
        if(!sec)return;
        const pad=innerWidth<=860?104:88;
        let y=0,el=sec;while(el){y+=el.offsetTop;el=el.offsetParent}
        scrollTo({top:Math.max(0,y-pad),behavior:reduce?'auto':'smooth'});
      }));
      menu.querySelectorAll('.nbtn').forEach(b=>on(b,'click',()=>setOpen(false)));
      on(document,'click',()=>setOpen(false));
      on(document,'keydown',ev=>{if(ev.key==='Escape')setOpen(false)});
    })();

    /* ---------- reviews depth carousel (mobile) ---------- */
    (function(){
      const rail=document.getElementById('sgrid'),trk=document.getElementById('strack');
      if(!rail||!trk)return;
      const cards=[...rail.querySelectorAll('.say')],marks=[...trk.children],N=cards.length;
      const mq=matchMedia('(max-width:700px)');
      let idx=0,live=false;
      function place(){
        cards.forEach((c,i)=>{
          let d=i-idx;
          if(d>N/2)d-=N;
          if(d<-N/2)d+=N;
          c.dataset.pos=(d===0||d===1||d===-1)?String(d):'9';
        });
        marks.forEach((m,i)=>m.classList.toggle('on',i===idx));
        const h=Math.max(...cards.map(c=>c.offsetHeight));
        rail.style.height=(h+18)+'px';
      }
      function go(step){idx=(idx+step+N)%N;place()}
      function enable(){
        if(live)return;live=true;
        rail.classList.add('car');
        idx=0;place();
        requestAnimationFrame(place);
      }
      function disable(){
        if(!live)return;live=false;
        rail.classList.remove('car');
        rail.style.height='';
        cards.forEach(c=>{delete c.dataset.pos});
      }
      let sx=0,dragging=false;
      on(rail,'pointerdown',ev=>{if(!live)return;dragging=true;sx=ev.clientX});
      on(rail,'pointerup',ev=>{
        if(!live||!dragging)return;dragging=false;
        const dx=ev.clientX-sx;
        if(Math.abs(dx)>40)go(dx<0?1:-1);
      });
      on(rail,'pointercancel',()=>{dragging=false});
      marks.forEach((m,i)=>on(m,'click',()=>{if(live){idx=i;place()}}));
      on(window,'resize',()=>{if(live)place()});
      const sync=()=>mq.matches?enable():disable();
      on(mq,'change',sync);
      sync();
    })();


    /* ---------- estimator ---------- */
    const MODS=document.getElementById('mods');
    const rSetup=$('rSetup'),rMo=$('rMo'),rTier=$('rTier');
    function tween(el,from,to){
      if(reduce){el.textContent='$'+to;return;}
      const t0=performance.now(),dur=520;
      function f(t){
        const p=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-p,3);
        el.textContent='$'+Math.round(from+(to-from)*e);
        if(p<1)requestAnimationFrame(f);
      }
      requestAnimationFrame(f);
    }
    let curS=447,curM=187;
    function calc(){
      let mo=97,su=297;
      MODS.querySelectorAll('.mod[aria-pressed="true"]').forEach(m=>{mo+=+m.dataset.m;su+=+m.dataset.s});
      const tier=mo<160?'Presence':mo<400?'Connected':'Operations';
      tween(rSetup,curS,su);tween(rMo,curM,mo);
      curS=su;curM=mo;
      rTier.innerHTML='Closest plan: <b>'+tier+'</b>. Final number confirmed after one call about how you actually work.';
      document.getElementById('stamp').textContent='$'+su+' setup · $'+mo+' per month';
    }
    MODS.querySelectorAll('.mod').forEach(m=>m.onclick=()=>{
      m.setAttribute('aria-pressed',m.getAttribute('aria-pressed')!=='true');
      calc();
    });
    calc();

    /* ---------- contact (mock until a backend is wired) ---------- */
    const cSend=document.getElementById('cSend');
    on(cSend,'click',()=>{
      const lbl=cSend.querySelector('span');
      lbl.textContent='Got it. Talk soon.';
      cSend.style.pointerEvents='none';
    });

    return () => {
      listeners.forEach(([t, ty, fn, opts]) => t.removeEventListener(ty, fn, opts));
      observers.forEach((o) => o.disconnect());
      intervals.forEach((id) => clearInterval(id));
    };
  }, []);

  return (
    <>
      {/* shared glass gradients */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true"><defs>
        <linearGradient id="hl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".7" /><stop offset=".45" stopColor="#fff" stopOpacity=".14" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#00FF87" stopOpacity=".6" /><stop offset="1" stopColor="#00FF87" stopOpacity=".14" /></linearGradient>
        <linearGradient id="tc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22E5FF" stopOpacity=".6" /><stop offset="1" stopColor="#22E5FF" stopOpacity=".14" /></linearGradient>
        <linearGradient id="tp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF2D78" stopOpacity=".62" /><stop offset="1" stopColor="#FF2D78" stopOpacity=".15" /></linearGradient>
        <linearGradient id="tv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#B14BFF" stopOpacity=".62" /><stop offset="1" stopColor="#B14BFF" stopOpacity=".15" /></linearGradient>
        <linearGradient id="to" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFA028" stopOpacity=".6" /><stop offset="1" stopColor="#FFA028" stopOpacity=".14" /></linearGradient>
        <linearGradient id="tw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".5" /><stop offset="1" stopColor="#fff" stopOpacity=".1" /></linearGradient>
        <linearGradient id="sgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#00FF87" stopOpacity=".34" /><stop offset="1" stopColor="#00FF87" stopOpacity="0" /></linearGradient>
      </defs></svg>

      <nav id="nav">
        <div className="navbar">
          <div className="markwrap">
            <button className="mark" id="mark" aria-expanded="false" aria-haspopup="true" aria-controls="lmenu"><b>Alyxlab</b><i aria-hidden="true"></i></button>
            <div className="lmenu" id="lmenu">
              <button className="lrow" data-sec="#problem">The problem</button>
              <button className="lrow" data-sec="#does">The system</button>
              <button className="lrow" data-sec="#track">See it work</button>
              <button className="lrow" data-sec="#work">Projects</button>
              <button className="lrow" data-sec="#plans">Plans</button>
              <button className="lrow" data-sec="#talk">Contact</button>
              <button className="nbtn" data-go="#close">Get my estimate</button>
            </div>
          </div>

          <div className="nlinks" id="nlinks">
            <a className="nlink" href="#problem">The problem</a>
            <a className="nlink" href="#does">The system</a>
            <a className="nlink" href="#track">See it work</a>
            <a className="nlink" href="#work">Projects</a>
            <a className="nlink" href="#plans">Plans</a>
            <a className="nlink" href="#talk">Contact</a>
          </div>
          <button className="nbtn" data-go="#close">Get my estimate</button>
        </div>
      </nav>

      {/* ============ 1 + 2 · DARK WORLD ============ */}
      <div className="darkzone">
        <div className="grain" aria-hidden="true"></div>

        <header className="hero">
          <div className="rise" aria-hidden="true"></div>
          <canvas className="dots" id="dots" aria-hidden="true"></canvas>
          <div className="inner">
            <h1>Your business does not need another <em>website.</em></h1>
            <p className="sub">It needs a system that answers, books, and follows up. Working the hours you cannot.</p>
            <button className="cta" data-go="#close"><i className="mlight" aria-hidden="true"></i><span>Build mine</span></button>
          </div>
        </header>

        <section className="atoms" id="problem">
          <div className="shards" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <div className="noise" aria-hidden="true"></div>
          <div className="inner">
            <h2 className="rv">Right now it lives in <em className="glitch" data-t="six different tabs.">six different tabs.</em></h2>
            <p className="sub rv">Bookings in one app. Reviews in another. Leads going cold in between.</p>
            <div className="field" id="field">
              <div className="atom" data-d="1.3"><div className="px"><div className="ic g1">
                <svg viewBox="0 0 48 48"><rect x="5" y="9" width="38" height="34" rx="11" fill="url(#tg)" stroke="rgba(255,255,255,.6)" strokeWidth="1.6" /><rect x="5" y="9" width="38" height="15" rx="11" fill="url(#hl)" /><path d="M15 4.5v8M33 4.5v8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /><path d="M13 27h6M21 27h6M29 27h6M13 34h6M21 34h6" stroke="rgba(255,255,255,.9)" strokeWidth="2.4" strokeLinecap="round" /></svg>
              </div></div><div className="apop" role="status"><b>Booking app</b><p>Three double bookings this month. Two people showed up for the same slot.</p></div></div>
              <div className="atom" data-d=".8"><div className="px"><div className="ic g2">
                <svg viewBox="0 0 48 48"><rect x="4" y="10" width="40" height="28" rx="9" fill="url(#tc)" stroke="rgba(255,255,255,.6)" strokeWidth="1.6" /><rect x="4" y="10" width="40" height="12" rx="9" fill="url(#hl)" /><path d="M6.5 14.5 24 26l17.5-11.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div></div><div className="apop" role="status"><b>Inbox</b><p>Forty seven unread. The newest one is six days old.</p></div></div>
              <div className="atom" data-d="1.6"><div className="px"><div className="ic g3">
                <svg viewBox="0 0 48 48"><path d="M24 3.5l6 12.2 13.5 2-9.7 9.4 2.3 13.4L24 34.2l-12.1 6.3 2.3-13.4-9.7-9.4 13.5-2z" fill="url(#tp)" stroke="rgba(255,255,255,.62)" strokeWidth="1.6" strokeLinejoin="round" /><path d="M24 3.5l6 12.2 13.5 2-4.6 4.4H13.1l-4.6-4.4 13.5-2z" fill="url(#hl)" opacity=".8" /></svg>
              </div></div><div className="apop" role="status"><b>Reviews</b><p>Last review request sent: never. Twelve happy customers walked out this week.</p></div></div>
              <div className="atom" data-d="1.1"><div className="px"><div className="ic g4">
                <svg viewBox="0 0 48 48"><path d="M42 22a17 15.5 0 0 1-17 15.5H7l4.2-5.8A15.5 15.5 0 1 1 42 22z" fill="url(#tv)" stroke="rgba(255,255,255,.6)" strokeWidth="1.6" strokeLinejoin="round" /><path d="M42 22a17 15.5 0 0 0-32-7.5h26.5A15.4 15.4 0 0 1 42 22z" fill="url(#hl)" opacity=".75" /><path d="M17 20.5h14M17 27h9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" /></svg>
              </div></div><div className="apop" role="status"><b>Messages</b><p>Nine unread. Four asked about pricing. Two already booked somewhere else.</p></div></div>
              <div className="atom" data-d=".9"><div className="px"><div className="ic g5">
                <svg viewBox="0 0 48 48"><rect x="4" y="10" width="40" height="28" rx="8" fill="url(#to)" stroke="rgba(255,255,255,.6)" strokeWidth="1.6" /><rect x="4" y="10" width="40" height="10" rx="8" fill="url(#hl)" /><rect x="4" y="17" width="40" height="6" fill="rgba(255,255,255,.85)" /><path d="M9 31h9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /></svg>
              </div></div><div className="apop" role="status"><b>Payments</b><p>Three hundred forty dollars in unpaid deposits and three no shows you could not charge.</p></div></div>
              <div className="atom" data-d="1.4"><div className="px"><div className="ic g6">
                <svg viewBox="0 0 48 48"><rect x="5" y="7" width="38" height="34" rx="7" fill="url(#tw)" stroke="rgba(255,255,255,.62)" strokeWidth="1.6" /><rect x="5" y="7" width="38" height="12" rx="7" fill="url(#hl)" /><path d="M5 19h38M5 29h38M18 7v34M31 7v34" stroke="rgba(255,255,255,.8)" strokeWidth="1.8" /></svg>
              </div></div><div className="apop" role="status"><b>The spreadsheet</b><p>Last updated three weeks ago. Nobody knows which leads are still live.</p></div></div>
            </div>
          </div>
        </section>
        <div className="runway" aria-hidden="true"></div>
      </div>

      {/* ============ 3 · WHITE CURTAIN ============ */}
      <section className="lite" id="does">
        <div className="inner">
          <h2 className="rv">A website says you exist. <em>A system runs the business.</em></h2>
          <p className="sub rv">Three things change the day it goes live.</p>
          <div className="cards3">
            <div className="fcard a rv">
              {/* drop a square image path in data-src, the icon shows until then */}
              <div className="fmedia" data-src=""><img alt="" /></div>
              <div className="fbody">
              <div className="plate"><svg className="fi" viewBox="0 0 48 48">
                <rect x="17" y="6" width="21" height="36" rx="5" />
                <path d="M24 11h7" />
                <path d="M4 17h9M2 24h11M4 31h9" />
                <path d="M10 13.5 14.5 17 10 20.5M8 20.5 12.5 24 8 27.5M10 27.5 14.5 31 10 34.5" />
              </svg></div>
              <h3>It all lands in your hand</h3>
              <p>Calls, texts, and forms come to one place, and it answers them for you while you work.</p>
              </div>
            </div>
            <div className="fcard b rv">
              {/* drop a square image path in data-src, the icon shows until then */}
              <div className="fmedia" data-src=""><img alt="" /></div>
              <div className="fbody">
              <div className="plate"><svg className="fi" viewBox="0 0 48 48">
                <path d="M40 24a16 16 0 1 1-5.6-12.2" />
                <path d="M41 6v7h-7" />
                <path d="M24 15v9l6 3.5" />
              </svg></div>
              <h3>It chases people for you</h3>
              <p>Reminders, confirmations, and review requests go out on their own, exactly when they should.</p>
              </div>
            </div>
            <div className="fcard c rv">
              {/* drop a square image path in data-src, the icon shows until then */}
              <div className="fmedia" data-src=""><img alt="" /></div>
              <div className="fbody">
              <div className="plate"><svg className="fi" viewBox="0 0 48 48">
                <path d="M7 41h34" />
                <path d="M13 41V29M22 41V22M31 41V32M40 41V16" />
                <path d="M9 25 19 15l6 5L38 8" />
                <path d="M31 8h7v7" />
              </svg></div>
              <h3>You see what it made you</h3>
              <p>Every lead, every booking, and what it was worth, live on your phone.</p>
              </div>
            </div>
          </div>
          <p className="mlabel rv">Works with what you already use</p>
          <div className="marq rv" id="marq">
            <div className="mtrack" id="mtrack">
              {/* swap in official logo files any time: <img data-src="logos/stripe.svg" /> replaces the wordmark */}
              <div className="mitem"><img alt="" data-src="" /><span>Google Calendar</span></div>
              <div className="mitem"><img alt="" data-src="" /><span>Stripe</span></div>
              <div className="mitem"><img alt="" data-src="" /><span>Twilio</span></div>
              <div className="mitem"><img alt="" data-src="" /><span>Gmail</span></div>
              <div className="mitem"><img alt="" data-src="" /><span>Google Sheets</span></div>
              <div className="mitem"><img alt="" data-src="" /><span>HubSpot</span></div>
              <div className="mitem"><img alt="" data-src="" /><span>Resend</span></div>
              <div className="mitem"><img alt="" data-src="" /><span>Square</span></div>
              <div className="mitem"><img alt="" data-src="" /><span>QuickBooks</span></div>
              <div className="mitem"><img alt="" data-src="" /><span>Mailchimp</span></div>
              <div className="mitem"><img alt="" data-src="" /><span>Slack</span></div>
              <div className="mitem"><img alt="" data-src="" /><span>n8n</span></div>
            </div>
          </div>
        </div>
      </section>
      <section className="bridge">
        <div className="inner">
          <h2 className="rv">Watch it work. <em>One customer, start to finish.</em></h2>
          <div className="fline"></div>
        </div>
      </section>

      {/* ============ 4 · THE THEATER ============ */}
      <section className="track" id="track">
        <b className="snap" style={{ top: "calc(var(--seg) * .4167)" }}></b>
        <b className="snap" style={{ top: "calc(var(--seg) * 1.25)" }}></b>
        <b className="snap" style={{ top: "calc(var(--seg) * 2.0833)" }}></b>
        <b className="snap" style={{ top: "calc(var(--seg) * 2.9167)" }}></b>
        <b className="snap" style={{ top: "calc(var(--seg) * 3.75)" }}></b>
        <b className="snap" style={{ top: "calc(var(--seg) * 4.5833)" }}></b>
        <div className="stage" id="stage" data-step="0">
          <div className="tfield" aria-hidden="true"><span className="blob b1"></span><span className="blob b2"></span><span className="blob b3"></span><span className="blob b4"></span></div>
          <div className="cap">
            <div className="capbox">
              <div className="beat on" data-b="0"><h2>One lead. <em>Start to finish.</em></h2><p>Not a recording. Everything here runs on the same stack your system would.</p></div>
              <div className="beat" data-b="1"><h2>9:47 PM. <u>You are closed.</u></h2><p>A text comes in. Nobody is there to answer it, and by morning most people have already booked somewhere else.</p></div>
              <div className="beat" data-b="2"><h2>Four seconds later.</h2><p>The system answers with real openings pulled from your calendar. Not a canned reply that says we will get back to you.</p></div>
              <div className="beat" data-b="3"><h2><em>Booked.</em></h2><p>Written to the calendar, confirmation sent, reminder scheduled. Nobody picked up a phone.</p></div>
              <div className="beat" data-b="4"><h2>You see it <em>in the morning.</em></h2><p>Everything that happened while you slept, in one place. What came in, what booked, and what it was worth.</p></div>
              <div className="beat" data-b="5"><h2>That is the system.</h2><p>Not a website with a contact form. Something that works the hours you cannot.</p><button className="cta" data-go="#close"><i className="mlight" aria-hidden="true"></i><span>Build mine</span></button></div>
            </div>
          </div>
          <div className="scene">
            <div className="rig">
              <div className="phone">
                <div className="island"></div>
                <div className="screen">
                  <div className="layer lock on" id="lLock">
                    <div className="wall" aria-hidden="true"><span className="x"></span><span className="y"></span><span className="z"></span><span className="w"></span></div>
                    <div className="lock">
                      <div className="lk-time">9:47</div>
                      <div className="lk-date">Saturday, June 14</div>
                      <div className="lk-state">Shop closed · opens 9:00 AM</div>
                      <div className="notif" id="notif">
                        <div className="nf-top"><span className="nbadge">1</span><b>New message</b><time>now</time></div>
                        <div className="nf-body">Yall have anything open Saturday? Need a fade before my sisters wedding</div>
                      </div>
                    </div>
                  </div>
                  <div className="layer msgs" id="lMsgs">
                    <div className="mhead">Marcus T. · 9:47 PM</div>
                    <div className="bub them" id="m1">Yall have anything open Saturday? Need a fade before my sisters wedding</div>
                    <div className="typing" id="typ"><i></i><i></i><i></i></div>
                    <div className="bub us" id="m2">Hey Marcus. Saturday 2:15 or 4:30 is open with Dre. Want me to hold one?<span className="sig">Sent by your system · 9:47 PM</span></div>
                    <div className="bub them" id="m3">2:15 works</div>
                    <div className="bub us" id="m4">Locked in. Saturday 2:15 with Dre. Reminder coming Friday.<span className="sig">Sent by your system · 9:48 PM</span></div>
                  </div>
                  <div className="layer dash on" id="lDash">
                    <div className="grab"></div>
                    <div className="dhead"><b>This week</b><span>Live</span></div>
                    <div className="rev">
                      <div className="revtop"><span>Booked revenue</span><em>+18%</em></div>
                      <div className="revnum" id="v0">$0</div>
                      <svg className="spark2" viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden="true">
                        <path className="sfill" d="M0 34 24 30 48 32 72 22 96 25 120 15 144 18 168 9 200 4 200 44 0 44Z" />
                        <path className="sline" d="M0 34 24 30 48 32 72 22 96 25 120 15 144 18 168 9 200 4" />
                      </svg>
                    </div>
                    <div className="mrow">
                      <div className="mcard ca"><div className="v" id="v1">0</div><div className="k">Leads in</div></div>
                      <div className="mcard cb"><div className="v" id="v2">0</div><div className="k">Booked</div></div>
                      <div className="mcard cc"><div className="v" id="v3">0</div><div className="k">After hours</div></div>
                    </div>
                    <div className="bars" id="bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
                    <div className="days"><s>M</s><s>T</s><s>W</s><s>T</s><s>F</s><s>S</s><s>S</s></div>
                    <div className="dlist">
                      <div className="ditem"><s></s>Marcus T. booked<em className="money">$45</em></div>
                      <div className="ditem"><s className="c"></s>Deposit received<em className="money">$120</em></div>
                      <div className="ditem"><s className="t"></s>Review request sent<em>Sat</em></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="float fl1" id="f1"><div className="k">Reply time</div><b>4 seconds</b><p>Median across every channel, day or night.</p></div>
              <div className="float fl2" id="f2"><div className="k">Calendar</div><b>Saturday · 2:15 PM</b><p>Skin fade with Dre. Written straight to the booking calendar.</p></div>
              <div className="float fl3" id="f3"><div className="k">Recovered</div><b>9 after hours</b><p>Leads that would have gone unanswered this week.</p></div>
            </div>
          </div>
          <div className="rail" id="rail" aria-label="Sequence"></div>
        </div>
      </section>

      {/* ============ 5 · THE WORK ============ */}
      <section className="work" id="work">
        <div className="inner">
          <h2 className="rvb">Real systems, <em>already running.</em></h2>
          <div className="projs">
            <div className="proj p1 rvb">
              {/* data-poster = still image, data-clips = up to 3 clip paths comma separated. Hover on desktop or tap on mobile plays them. */}
              <div className="shot" data-poster="" data-clips="">
                <img className="poster" alt="" />
                <video className="clip" muted={true} loop={true} playsInline={true} preload="metadata"></video>
                <div className="pips"></div>
                <div className="playcue" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6.5v11l9-5.5z" /></svg></div>
                <div className="win">
                <div className="wbar"><i></i><i></i><i></i></div>
                <div className="mocks">
                  <div className="mk tall"><span>Revenue</span><b>$12.4k</b><svg className="spark" viewBox="0 0 100 22" preserveAspectRatio="none"><path d="M0 18 20 14 40 16 60 8 80 10 100 3" fill="none" stroke="#00FF87" strokeWidth="2" /></svg></div>
                  <div className="mk"><span>Downloads</span><b>3,208</b></div>
                  <div className="mk"><span>Sale live</span><b>30% off</b></div>
                  <div className="mk"><span>Clients</span><b>847</b></div>
                  <div className="mk"><span>Files</span><b>2.1 TB</b></div>
                </div>
                </div>
              </div>
              <div className="pbody">
                <h3>Plugin Warehouse</h3>
                <p>A storefront for music producers with a full back end: massive file delivery, sales and discounts, analytics, and a client account portal.</p>
                <div className="tags"><span className="tag">Ecommerce</span><span className="tag">Client portal</span><span className="tag">Large file delivery</span><span className="tag">Sales engine</span></div>
              </div>
            </div>
            <div className="proj p2 rvb">
              <div className="shot" data-poster="" data-clips="">
                <img className="poster" alt="" />
                <video className="clip" muted={true} loop={true} playsInline={true} preload="metadata"></video>
                <div className="pips"></div>
                <div className="playcue" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6.5v11l9-5.5z" /></svg></div>
                <div className="win">
                <div className="wbar"><i></i><i></i><i></i></div>
                <div className="mocks">
                  <div className="mk tall"><span>Leads</span><b>4,116</b><svg className="spark" viewBox="0 0 100 22" preserveAspectRatio="none"><path d="M0 19 20 15 40 17 60 9 80 12 100 4" fill="none" stroke="#FF2D78" strokeWidth="2" /></svg></div>
                  <div className="mk"><span>Owned</span><b>212</b></div>
                  <div className="mk"><span>Expiring</span><b>0:58</b></div>
                  <div className="mk"><span>AI replies</span><b>1,930</b></div>
                  <div className="mk"><span>Dealers</span><b>14</b></div>
                </div>
                </div>
              </div>
              <div className="pbody">
                <h3>DriveOffDallas</h3>
                <p>A dealership lead system handling thousands of leads with AI assistance, a live phone line, ownership timers, and multi dealer onboarding.</p>
                <div className="tags"><span className="tag">AI assistant</span><span className="tag">Phone + SMS</span><span className="tag">Lead ownership</span><span className="tag">Multi tenant</span></div>
              </div>
            </div>
            <div className="proj p3 rvb">
              <div className="shot" data-poster="" data-clips="">
                <img className="poster" alt="" />
                <video className="clip" muted={true} loop={true} playsInline={true} preload="metadata"></video>
                <div className="pips"></div>
                <div className="playcue" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6.5v11l9-5.5z" /></svg></div>
                <div className="win">
                <div className="wbar"><i></i><i></i><i></i></div>
                <div className="mocks">
                  <div className="mk tall"><span>Inquiries</span><b>96</b><svg className="spark" viewBox="0 0 100 22" preserveAspectRatio="none"><path d="M0 17 20 15 40 12 60 13 80 8 100 6" fill="none" stroke="#B14BFF" strokeWidth="2" /></svg></div>
                  <div className="mk"><span>This week</span><b>23</b></div>
                  <div className="mk"><span>Replied</span><b>100%</b></div>
                  <div className="mk"><span>Quotes</span><b>31</b></div>
                  <div className="mk"><span>Routes</span><b>12</b></div>
                </div>
                </div>
              </div>
              <div className="pbody">
                <h3>Monkey Trucking</h3>
                <p>A clean site with smart contact forms and a simple owner dashboard. Proof that the floor of what I build is still a working system.</p>
                <div className="tags"><span className="tag">Fast build</span><span className="tag">Smart forms</span><span className="tag">Owner dashboard</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 6 · PLANS ============ */}
      <section className="plans" id="plans">
        <div className="inner">
          <h2 className="rv">Three ways in. <em>One system underneath.</em></h2>
          <div className="ptrack" id="ptrack" aria-hidden="true"><i className="on"></i><i></i><i></i></div>
          <div className="tiers" id="tiers">
            <div className="tier">
              <h3>Presence</h3><div className="prom">Be found.</div>
              <div className="price"><b>$97</b><span>/ month</span></div>
              <div className="setup">$297 setup, one time</div>
              <div className="feats">
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Custom site on your own domain</div>
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Hosting, updates, and backups</div>
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Built for phones and fast loads</div>
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Local search setup</div>
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Contact form to your inbox</div>
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>One booking or call link</div>
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Visitor analytics</div>
              </div>
              <button className="tbtn" data-go="#close">Start with Presence</button>
            </div>
            <div className="tier">
              <h3>Connected</h3><div className="prom">Never lose a lead.</div>
              <div className="price"><b>$249</b><span>/ month</span></div>
              <div className="setup">$597 setup, one time</div>
              <div className="plus">Everything in Presence, plus</div>
              <div className="feats">
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Your own login and dashboard</div>
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Every inquiry answered in seconds</div>
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Missed calls texted back</div>
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Calendar synced both ways</div>
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Reminders and confirmations</div>
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Review requests after each visit</div>
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Email and text campaigns</div>
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Full lead history</div>
              </div>
              <button className="tbtn" data-go="#close">Start with Connected</button>
            </div>
            <div className="tier ops">
              <h3>Operations</h3><div className="prom">Run the business from one place.</div>
              <div className="price"><b>$499</b><span>/ month</span></div>
              <div className="setup">$997 setup, one time</div>
              <div className="plus">Everything in Connected, plus</div>
              <div className="feats">
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Accounts and roles for your team</div>
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>AI assistant that answers and books</div>
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Customer pipeline with your own rules</div>
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Payments and deposits</div>
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Business phone line and texting</div>
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Multi location reporting</div>
                <div><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></svg>Priority support, direct to me</div>
              </div>
              <button className="tbtn" data-go="#close">Start with Operations</button>
            </div>
          </div>
          <p className="annual rv">On a 12 month agreement, setup drops by half.</p>
          <div className="sayblock">
      <h3 className="sayhead rv">What the owners <em>actually say.</em></h3>
          <div className="strack" id="strack" aria-hidden="true"><i className="on"></i><i></i><i></i></div>
          <div className="sgrid" id="sgrid">
            <div className="say" data-placeholder="true">
              <div className="stars" aria-label="Five out of five">
                <svg viewBox="0 0 24 24"><path d="M12 2l3 6.6 7.2 1-5.2 5 1.3 7.2L12 18.4 5.7 21.8 7 14.6 1.8 9.6l7.2-1z" /></svg>
                <svg viewBox="0 0 24 24"><path d="M12 2l3 6.6 7.2 1-5.2 5 1.3 7.2L12 18.4 5.7 21.8 7 14.6 1.8 9.6l7.2-1z" /></svg>
                <svg viewBox="0 0 24 24"><path d="M12 2l3 6.6 7.2 1-5.2 5 1.3 7.2L12 18.4 5.7 21.8 7 14.6 1.8 9.6l7.2-1z" /></svg>
                <svg viewBox="0 0 24 24"><path d="M12 2l3 6.6 7.2 1-5.2 5 1.3 7.2L12 18.4 5.7 21.8 7 14.6 1.8 9.6l7.2-1z" /></svg>
                <svg viewBox="0 0 24 24"><path d="M12 2l3 6.6 7.2 1-5.2 5 1.3 7.2L12 18.4 5.7 21.8 7 14.6 1.8 9.6l7.2-1z" /></svg>
              </div>
              <p>We were losing people every night after close. Now I wake up to appointments instead of missed calls.</p>
              <div className="who"><div className="av">MT</div><div><b>Marcus Tolbert</b><span>Fade Theory Barbers</span></div></div>
            </div>
            <div className="say" data-placeholder="true">
              <div className="stars" aria-label="Five out of five">
                <svg viewBox="0 0 24 24"><path d="M12 2l3 6.6 7.2 1-5.2 5 1.3 7.2L12 18.4 5.7 21.8 7 14.6 1.8 9.6l7.2-1z" /></svg>
                <svg viewBox="0 0 24 24"><path d="M12 2l3 6.6 7.2 1-5.2 5 1.3 7.2L12 18.4 5.7 21.8 7 14.6 1.8 9.6l7.2-1z" /></svg>
                <svg viewBox="0 0 24 24"><path d="M12 2l3 6.6 7.2 1-5.2 5 1.3 7.2L12 18.4 5.7 21.8 7 14.6 1.8 9.6l7.2-1z" /></svg>
                <svg viewBox="0 0 24 24"><path d="M12 2l3 6.6 7.2 1-5.2 5 1.3 7.2L12 18.4 5.7 21.8 7 14.6 1.8 9.6l7.2-1z" /></svg>
                <svg viewBox="0 0 24 24"><path d="M12 2l3 6.6 7.2 1-5.2 5 1.3 7.2L12 18.4 5.7 21.8 7 14.6 1.8 9.6l7.2-1z" /></svg>
              </div>
              <p>I ran everything out of three apps and a notebook. Now it is one screen, and my crew actually uses it.</p>
              <div className="who"><div className="av">DR</div><div><b>Danielle Reyes</b><span>Reyes Home Services</span></div></div>
            </div>
            <div className="say" data-placeholder="true">
              <div className="stars" aria-label="Five out of five">
                <svg viewBox="0 0 24 24"><path d="M12 2l3 6.6 7.2 1-5.2 5 1.3 7.2L12 18.4 5.7 21.8 7 14.6 1.8 9.6l7.2-1z" /></svg>
                <svg viewBox="0 0 24 24"><path d="M12 2l3 6.6 7.2 1-5.2 5 1.3 7.2L12 18.4 5.7 21.8 7 14.6 1.8 9.6l7.2-1z" /></svg>
                <svg viewBox="0 0 24 24"><path d="M12 2l3 6.6 7.2 1-5.2 5 1.3 7.2L12 18.4 5.7 21.8 7 14.6 1.8 9.6l7.2-1z" /></svg>
                <svg viewBox="0 0 24 24"><path d="M12 2l3 6.6 7.2 1-5.2 5 1.3 7.2L12 18.4 5.7 21.8 7 14.6 1.8 9.6l7.2-1z" /></svg>
                <svg viewBox="0 0 24 24"><path d="M12 2l3 6.6 7.2 1-5.2 5 1.3 7.2L12 18.4 5.7 21.8 7 14.6 1.8 9.6l7.2-1z" /></svg>
              </div>
              <p>What surprised me was the timers. No lead sits there anymore, and everyone knows whose it is.</p>
              <div className="who"><div className="av">SO</div><div><b>Sam Okafor</b><span>Northside Auto Group</span></div></div>
            </div>
            </div>
          </div>

          <div className="faq rv">
            <details><summary>Who owns the system?</summary><p>You do. The code, the data, the domain. If we ever part ways, everything transfers to you with documentation. You are never held hostage.</p></details>
            <details><summary>What if I cancel?</summary><p>Month to month plans cancel anytime. Your site and data are handed over, and hosting transfers to an account you control.</p></details>
            <details><summary>Do I need to be technical?</summary><p>No. You get a dashboard built for owners, not developers. If you can use your phone, you can run it. And when you need a change, you text me directly.</p></details>
            <details><summary>How fast is it live?</summary><p>Most builds are live in under two weeks, including migration from whatever you have now.</p></details>
          </div>
        </div>
      </section>

      {/* ============ 7 · CLOSE ============ */}
      <section className="close" id="close">
        <div className="rise2" aria-hidden="true"></div>
        <div className="grain" aria-hidden="true"></div>
        <div className="inner">
          <h2 className="rv">Built for<span className="roller" id="roller" aria-label="any business"><span className="rw now" id="rwA"></span><span className="rw next" id="rwB"></span></span></h2>
          <p className="sub rv">Whatever you run, it gets built for how that business actually works. Tap what yours needs and watch the number build.</p>

          <div className="est rv">
            <div className="eslabel">What should it do?</div>
            <div className="mods" id="mods">
              <button className="mod" aria-pressed="true" data-m="60" data-s="100"><span className="sw"></span><b>Instant reply to every lead</b></button>
              <button className="mod" aria-pressed="false" data-m="55" data-s="90"><span className="sw"></span><b>Your own business phone line</b></button>
              <button className="mod" aria-pressed="false" data-m="110" data-s="160"><span className="sw"></span><b>AI assistant that books</b></button>
              <button className="mod" aria-pressed="true" data-m="30" data-s="50"><span className="sw"></span><b>Review requests after each visit</b></button>
              <button className="mod" aria-pressed="false" data-m="50" data-s="90"><span className="sw"></span><b>Payments and deposits</b></button>
              <button className="mod" aria-pressed="false" data-m="45" data-s="80"><span className="sw"></span><b>Rules and routing</b></button>
              <button className="mod" aria-pressed="false" data-m="32" data-s="60"><span className="sw"></span><b>Team logins and roles</b></button>
              <button className="mod" aria-pressed="false" data-m="20" data-s="70"><span className="sw"></span><b>Affiliate and referral links</b></button>
            </div>
            <p className="modnote">We build and run the system. Writing your marketing content stays with you, or we can quote it separately.</p>


            <div className="result">
              <div className="rnum"><b id="rSetup">$447</b><span>setup, one time</span></div>
              <div className="rnum g"><b id="rMo">$187</b><span>per month, everything included</span></div>
              <div className="rtier" id="rTier">Closest plan: <b>Connected</b>. Final number confirmed after one call about how you actually work.</div>
              <button className="cta" data-go="#talk"><i className="mlight" aria-hidden="true"></i><span>Send this over</span></button>
            </div>
          </div>

          <div className="talk rv" id="talk">
            <h3>Reach out. <em>It comes straight to me.</em></h3>
            <div className="tgrid">
              <form className="tform" onSubmit={(e) => e.preventDefault()}>
                <div className="fh"><b>Send a message</b><span className="stamp" id="stamp">$447 setup · $187 per month</span></div>
                <div className="f2">
                  <div className="fld"><label htmlFor="cName">Your name</label><input id="cName" type="text" autoComplete="name" placeholder="Marcus" /></div>
                  <div className="fld"><label htmlFor="cBiz">Business</label><input id="cBiz" type="text" autoComplete="organization" placeholder="Fade Theory" /></div>
                </div>
                <div className="f2">
                  <div className="fld"><label htmlFor="cPhone">Phone</label><input id="cPhone" type="tel" autoComplete="tel" placeholder="(555) 123 4567" /></div>
                  <div className="fld"><label htmlFor="cMail">Email</label><input id="cMail" type="email" autoComplete="email" placeholder="you@business.com" /></div>
                </div>
                <div className="fld"><label htmlFor="cNote">What is not working right now</label><textarea id="cNote" placeholder="Missing calls after close, everything lives in three apps, no idea where leads go."></textarea></div>
                <button className="cta" id="cSend" type="submit"><i className="mlight" aria-hidden="true"></i><span>Send message</span></button>
              </form>
              <div className="side">
                <a className="scard" href="tel:+14699431560">
                  <div className="sico"><svg viewBox="0 0 24 24"><path d="M6.5 3h3l1.5 4.5-2 1.5a13 13 0 0 0 6 6l1.5-2 4.5 1.5v3a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3z" /></svg></div>
                  <div><div className="k">Text or call</div><b>(469) 943 1560</b></div>
                  <svg className="arw" viewBox="0 0 24 24"><path d="M5 12h13M12 5.5 18.5 12 12 18.5" /></svg>
                </a>
                <a className="scard" href="mailto:alyxlabwork@gmail.com">
                  <div className="sico"><svg viewBox="0 0 24 24"><rect x="3" y="5.5" width="18" height="13" rx="3" /><path d="m4.5 8 7.5 5 7.5-5" /></svg></div>
                  <div><div className="k">Email</div><b>alyxlabwork@gmail.com</b></div>
                  <svg className="arw" viewBox="0 0 24 24"><path d="M5 12h13M12 5.5 18.5 12 12 18.5" /></svg>
                </a>
                <div className="steps">
                  <div className="stitle">What happens next</div>
                  <div className="step"><i>1</i><span>I read it myself, usually within a few hours.</span></div>
                  <div className="step"><i>2</i><span>A short call about how your business actually runs.</span></div>
                  <div className="step"><i>3</i><span>A fixed price and a start date. No proposal deck.</span></div>
                </div>
              </div>
            </div>
          </div>

          <footer>
            <b>Alyxlab</b>
            <div className="flinks">
              <a href="#problem">The problem</a>
              <a href="#does">The system</a>
              <a href="#track">See it work</a>
              <a href="#work">Projects</a>
              <a href="#plans">Plans</a>
              <a href="#talk">Contact</a>
            </div>
            <span>One person. Complete systems. Dallas, TX.</span>
          </footer>
        </div>
      </section>
    </>
  );
}
