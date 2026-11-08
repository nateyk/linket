import{a as e}from"./rolldown-runtime-BWaJ3C7D.js";import{t}from"./my-portal-shell-BfUOgGNe.js";import{t as n}from"./alert-CNM-JDh0.js";import{t as r}from"./badge-1HNd1DoU.js";import{Gi as i,M as a,yr as o}from"./client-CJL9GIje.js";import{t as s}from"./card-B6qLvIEt.js";import{t as c}from"./field-7aVpxs8U.js";import{n as l,t as u}from"./radio-group-DbZBqtVr.js";import{t as d}from"./progress-DV8XGFUB.js";import{a as f,i as p,n as m,r as h,t as ee}from"./sheet-BlJA0oAN.js";import{t as g}from"./skeleton-CP4ZFW1-.js";import{t as te}from"./tabs-BZPwSB-3.js";import{t as _}from"./trans-CRItcigO.js";import{i as ne,n as re,r as ie,t as ae}from"./course-curriculum-list-ymQ-_9tI.js";import{n as oe}from"./axios-BieHxS3P.js";import{Ks as se,Zo as ce,ba as le,cs as ue,ga as de,ho as fe,ic as pe,is as me,ko as he,rc as ge,ss as _e,us as ve}from"./icons-DQz5vrUS.js";import{S as ye,n as be,y as xe}from"./chunk-62JRHF6Z-CSUpuO6-.js";import{t as Se}from"./cn-l3sarDCX.js";var v=e(pe(),1),Ce=new Set([`style`,`children`,`ref`,`key`,`suppressContentEditableWarning`,`suppressHydrationWarning`,`dangerouslySetInnerHTML`]),we={className:`class`,htmlFor:`for`};function Te(e){return e.toLowerCase()}function Ee(e){if(typeof e==`boolean`)return e?``:void 0;if(typeof e!=`function`&&!(typeof e==`object`&&e))return e}function y({react:e,tagName:t,elementClass:n,events:r,displayName:i,defaultProps:a,toAttributeName:o=Te,toAttributeValue:s=Ee}){let c=Number.parseInt(e.version)>=19,l=e.forwardRef((i,l)=>{let u=e.useRef(null),d=e.useRef(new Map),f={},p={},m={},h={};for(let[e,t]of Object.entries(i)){if(Ce.has(e)){m[e]=t;continue}let r=o(we[e]??e);if(n.prototype&&e in n.prototype&&!(e in(globalThis.HTMLElement?.prototype??{}))&&!n.observedAttributes?.some(e=>e===r)){h[e]=t;continue}if(e.startsWith(`on`)){f[e]=t;continue}let i=s(t);r&&i!=null&&(p[r]=String(i),c||(m[r]=i)),r&&c&&(m[r]=i===Ee(t)?t:i)}if(typeof window<`u`){for(let t in f){let n=f[t],i=t.endsWith(`Capture`),a=(r?.[t]??t.slice(2).toLowerCase()).slice(0,i?-7:void 0);e.useLayoutEffect(()=>{let e=u?.current;if(e&&typeof n==`function`)return e.addEventListener(a,n,i),()=>{e.removeEventListener(a,n,i)}},[u?.current,n])}e.useLayoutEffect(()=>{if(u.current===null)return;let e=new Map;for(let t in h)De(u.current,t,h[t]),d.current.delete(t),e.set(t,h[t]);for(let[e,t]of d.current)De(u.current,e,void 0);d.current=e})}if(typeof window>`u`&&n?.getTemplateHTML&&n?.shadowRootOptions){let{mode:t,delegatesFocus:r}=n.shadowRootOptions;m.children=[e.createElement(`template`,{shadowrootmode:t,shadowrootdelegatesfocus:r,dangerouslySetInnerHTML:{__html:n.getTemplateHTML(p,i)},key:`ce-la-react-ssr-template-shadow-root`}),m.children]}return e.createElement(t,{...a,...m,ref:e.useCallback(e=>{u.current=e,typeof l==`function`?l(e):l!==null&&(l.current=e)},[l])},m.children)});return l.displayName=i??n.name,l}function De(e,t,n){e[t]=n,n==null&&t in(globalThis.HTMLElement?.prototype??{})&&e.removeAttribute(t)}var b={MEDIA_PLAY_REQUEST:`mediaplayrequest`,MEDIA_PAUSE_REQUEST:`mediapauserequest`,MEDIA_MUTE_REQUEST:`mediamuterequest`,MEDIA_UNMUTE_REQUEST:`mediaunmuterequest`,MEDIA_LOOP_REQUEST:`medialooprequest`,MEDIA_VOLUME_REQUEST:`mediavolumerequest`,MEDIA_SEEK_REQUEST:`mediaseekrequest`,MEDIA_AIRPLAY_REQUEST:`mediaairplayrequest`,MEDIA_ENTER_FULLSCREEN_REQUEST:`mediaenterfullscreenrequest`,MEDIA_EXIT_FULLSCREEN_REQUEST:`mediaexitfullscreenrequest`,MEDIA_PREVIEW_REQUEST:`mediapreviewrequest`,MEDIA_ENTER_PIP_REQUEST:`mediaenterpiprequest`,MEDIA_EXIT_PIP_REQUEST:`mediaexitpiprequest`,MEDIA_ENTER_CAST_REQUEST:`mediaentercastrequest`,MEDIA_EXIT_CAST_REQUEST:`mediaexitcastrequest`,MEDIA_SHOW_TEXT_TRACKS_REQUEST:`mediashowtexttracksrequest`,MEDIA_HIDE_TEXT_TRACKS_REQUEST:`mediahidetexttracksrequest`,MEDIA_SHOW_SUBTITLES_REQUEST:`mediashowsubtitlesrequest`,MEDIA_DISABLE_SUBTITLES_REQUEST:`mediadisablesubtitlesrequest`,MEDIA_TOGGLE_SUBTITLES_REQUEST:`mediatogglesubtitlesrequest`,MEDIA_PLAYBACK_RATE_REQUEST:`mediaplaybackraterequest`,MEDIA_RENDITION_REQUEST:`mediarenditionrequest`,MEDIA_AUDIO_TRACK_REQUEST:`mediaaudiotrackrequest`,MEDIA_SEEK_TO_LIVE_REQUEST:`mediaseektoliverequest`,REGISTER_MEDIA_STATE_RECEIVER:`registermediastatereceiver`,UNREGISTER_MEDIA_STATE_RECEIVER:`unregistermediastatereceiver`},x={MEDIA_CHROME_ATTRIBUTES:`mediachromeattributes`,MEDIA_CONTROLLER:`mediacontroller`},Oe={MEDIA_AIRPLAY_UNAVAILABLE:`mediaAirplayUnavailable`,MEDIA_AUDIO_TRACK_ENABLED:`mediaAudioTrackEnabled`,MEDIA_AUDIO_TRACK_LIST:`mediaAudioTrackList`,MEDIA_AUDIO_TRACK_UNAVAILABLE:`mediaAudioTrackUnavailable`,MEDIA_BUFFERED:`mediaBuffered`,MEDIA_CAST_UNAVAILABLE:`mediaCastUnavailable`,MEDIA_CHAPTERS_CUES:`mediaChaptersCues`,MEDIA_CURRENT_TIME:`mediaCurrentTime`,MEDIA_DURATION:`mediaDuration`,MEDIA_ENDED:`mediaEnded`,MEDIA_ERROR:`mediaError`,MEDIA_ERROR_CODE:`mediaErrorCode`,MEDIA_ERROR_MESSAGE:`mediaErrorMessage`,MEDIA_FULLSCREEN_UNAVAILABLE:`mediaFullscreenUnavailable`,MEDIA_HAS_PLAYED:`mediaHasPlayed`,MEDIA_HEIGHT:`mediaHeight`,MEDIA_IS_AIRPLAYING:`mediaIsAirplaying`,MEDIA_IS_CASTING:`mediaIsCasting`,MEDIA_IS_FULLSCREEN:`mediaIsFullscreen`,MEDIA_IS_PIP:`mediaIsPip`,MEDIA_LOADING:`mediaLoading`,MEDIA_MUTED:`mediaMuted`,MEDIA_LOOP:`mediaLoop`,MEDIA_PAUSED:`mediaPaused`,MEDIA_PIP_UNAVAILABLE:`mediaPipUnavailable`,MEDIA_PLAYBACK_RATE:`mediaPlaybackRate`,MEDIA_PREVIEW_CHAPTER:`mediaPreviewChapter`,MEDIA_PREVIEW_COORDS:`mediaPreviewCoords`,MEDIA_PREVIEW_IMAGE:`mediaPreviewImage`,MEDIA_PREVIEW_TIME:`mediaPreviewTime`,MEDIA_RENDITION_LIST:`mediaRenditionList`,MEDIA_RENDITION_SELECTED:`mediaRenditionSelected`,MEDIA_RENDITION_UNAVAILABLE:`mediaRenditionUnavailable`,MEDIA_SEEKABLE:`mediaSeekable`,MEDIA_STREAM_TYPE:`mediaStreamType`,MEDIA_SUBTITLES_LIST:`mediaSubtitlesList`,MEDIA_SUBTITLES_SHOWING:`mediaSubtitlesShowing`,MEDIA_TARGET_LIVE_WINDOW:`mediaTargetLiveWindow`,MEDIA_TIME_IS_LIVE:`mediaTimeIsLive`,MEDIA_VOLUME:`mediaVolume`,MEDIA_VOLUME_LEVEL:`mediaVolumeLevel`,MEDIA_VOLUME_UNAVAILABLE:`mediaVolumeUnavailable`,MEDIA_LANG:`mediaLang`,MEDIA_WIDTH:`mediaWidth`},ke=Object.entries(Oe),S=ke.reduce((e,[t,n])=>(e[t]=n.toLowerCase(),e),{}),Ae=ke.reduce((e,[t,n])=>(e[t]=n.toLowerCase(),e),{USER_INACTIVE_CHANGE:`userinactivechange`,BREAKPOINTS_CHANGE:`breakpointchange`,BREAKPOINTS_COMPUTED:`breakpointscomputed`});Object.entries(Ae).reduce((e,[t,n])=>{let r=S[t];return r&&(e[n]=r),e},{userinactivechange:`userinactive`});var je=Object.entries(S).reduce((e,[t,n])=>{let r=Ae[t];return r&&(e[n]=r),e},{userinactive:`userinactivechange`}),C={SUBTITLES:`subtitles`,CAPTIONS:`captions`,DESCRIPTIONS:`descriptions`,CHAPTERS:`chapters`,METADATA:`metadata`},Me={DISABLED:`disabled`,HIDDEN:`hidden`,SHOWING:`showing`},Ne={MOUSE:`mouse`,PEN:`pen`,TOUCH:`touch`},w={UNAVAILABLE:`unavailable`,UNSUPPORTED:`unsupported`},Pe={LIVE:`live`,ON_DEMAND:`on-demand`,UNKNOWN:`unknown`},Fe={INLINE:`inline`,FULLSCREEN:`fullscreen`,PICTURE_IN_PICTURE:`picture-in-picture`};function Ie(e){return e?.map(Le).join(` `)}function Le(e){if(e){let{id:t,width:n,height:r}=e;return[t,n,r].filter(e=>e!=null).join(`:`)}}function Re(e){return e?.map(ze).join(` `)}function ze(e){if(e){let{id:t,kind:n,language:r,label:i}=e;return[t,n,r,i].filter(e=>e!=null).join(`:`)}}function Be(e){return typeof e==`number`&&!Number.isNaN(e)&&Number.isFinite(e)}var Ve=e=>new Promise(t=>setTimeout(t,e)),He={en:{"Start airplay":`Start airplay`,"Stop airplay":`Stop airplay`,Audio:`Audio`,Captions:`Captions`,"Enable captions":`Enable captions`,"Disable captions":`Disable captions`,"Start casting":`Start casting`,"Stop casting":`Stop casting`,"Enter fullscreen mode":`Enter fullscreen mode`,"Exit fullscreen mode":`Exit fullscreen mode`,Mute:`Mute`,Unmute:`Unmute`,Loop:`Loop`,"Enter picture in picture mode":`Enter picture in picture mode`,"Exit picture in picture mode":`Exit picture in picture mode`,Play:`Play`,Pause:`Pause`,"Playback rate":`Playback rate`,"Playback rate {playbackRate}":`Playback rate {playbackRate}`,Quality:`Quality`,"Seek backward":`Seek backward`,"Seek forward":`Seek forward`,Settings:`Settings`,Auto:`Auto`,"audio player":`audio player`,"video player":`video player`,volume:`volume`,seek:`seek`,"closed captions":`closed captions`,"current playback rate":`current playback rate`,"playback time":`playback time`,"media loading":`media loading`,settings:`settings`,"audio tracks":`audio tracks`,quality:`quality`,play:`play`,pause:`pause`,mute:`mute`,unmute:`unmute`,"chapter: {chapterName}":`chapter: {chapterName}`,live:`live`,Off:`Off`,"start airplay":`start airplay`,"stop airplay":`stop airplay`,"start casting":`start casting`,"stop casting":`stop casting`,"enter fullscreen mode":`enter fullscreen mode`,"exit fullscreen mode":`exit fullscreen mode`,"enter picture in picture mode":`enter picture in picture mode`,"exit picture in picture mode":`exit picture in picture mode`,"seek to live":`seek to live`,"playing live":`playing live`,"seek back {seekOffset} seconds":`seek back {seekOffset} seconds`,"seek forward {seekOffset} seconds":`seek forward {seekOffset} seconds`,"Network Error":`Network Error`,"Decode Error":`Decode Error`,"Source Not Supported":`Source Not Supported`,"Encryption Error":`Encryption Error`,"A network error caused the media download to fail.":`A network error caused the media download to fail.`,"A media error caused playback to be aborted. The media could be corrupt or your browser does not support this format.":`A media error caused playback to be aborted. The media could be corrupt or your browser does not support this format.`,"An unsupported error occurred. The server or network failed, or your browser does not support this format.":`An unsupported error occurred. The server or network failed, or your browser does not support this format.`,"The media is encrypted and there are no keys to decrypt it.":`The media is encrypted and there are no keys to decrypt it.`,hour:`hour`,hours:`hours`,minute:`minute`,minutes:`minutes`,second:`second`,seconds:`seconds`,"{time} remaining":`{time} remaining`,"{currentTime} of {totalTime}":`{currentTime} of {totalTime}`,"video not loaded, unknown time.":`video not loaded, unknown time.`}},Ue=globalThis.navigator?.language||`en`,We=e=>{Ue=e},Ge=e=>{let[t]=Ue.split(`-`);return He[Ue]?.[e]||He[t]?.[e]||He.en?.[e]||e},Ke=()=>{let[e]=Ue.split(`-`);return He[Ue]?Ue:He[e]?e:`en`},T=(e,t={})=>Ge(e).replace(/\{(\w+)\}/g,(e,n)=>n in t?String(t[n]):`{${n}}`),qe=[{singular:`hour`,plural:`hours`},{singular:`minute`,plural:`minutes`},{singular:`second`,plural:`seconds`}],Je=(e,t)=>`${e} ${T(e===1?qe[t].singular:qe[t].plural)}`,Ye=e=>{if(!Be(e))return``;let t=Math.abs(e),n=t!==e,r=new Date(0,0,0,0,0,t,0),i=[r.getHours(),r.getMinutes(),r.getSeconds()].map((e,t)=>e&&Je(e,t)).filter(e=>e).join(`, `);return n?T(`{time} remaining`,{time:i}):t===0?Je(0,2):i};function E(e,t){let n=!1;e<0&&(n=!0,e=0-e),e=e<0?0:e;let r=Math.floor(e%60),i=Math.floor(e/60%60),a=Math.floor(e/3600),o=Math.floor(t/60%60),s=Math.floor(t/3600);return(isNaN(e)||e===1/0)&&(a=i=r=`0`),a=a>0||s>0?a+`:`:``,i=((a||o>=10)&&i<10?`0`+i:i)+`:`,r=r<10?`0`+r:r,(n?`-`:``)+a+i+r}Object.freeze({length:0,start(e){let t=e>>>0;if(t>=this.length)throw new DOMException(`Failed to execute 'start' on 'TimeRanges': The index provided (${t}) is greater than or equal to the maximum bound (${this.length}).`);return 0},end(e){let t=e>>>0;if(t>=this.length)throw new DOMException(`Failed to execute 'end' on 'TimeRanges': The index provided (${t}) is greater than or equal to the maximum bound (${this.length}).`);return 0}});var Xe=class{addEventListener(){}removeEventListener(){}dispatchEvent(){return!0}},Ze=class extends Xe{},Qe=class extends Ze{constructor(){super(...arguments),this.role=null}},$e=class{observe(){}unobserve(){}disconnect(){}},et={createElement:function(){return new tt.HTMLElement},createElementNS:function(){return new tt.HTMLElement},addEventListener(){},removeEventListener(){},dispatchEvent(e){return!1}},tt={ResizeObserver:$e,document:et,Node:Ze,Element:Qe,HTMLElement:class extends Qe{constructor(){super(...arguments),this.innerHTML=``}get content(){return new tt.DocumentFragment}},DocumentFragment:class extends Xe{},customElements:{get:function(){},define:function(){},whenDefined:function(){}},localStorage:{getItem(e){return null},setItem(e,t){},removeItem(e){}},CustomEvent:function(){},getComputedStyle:function(){},navigator:{languages:[],get userAgent(){return``}},matchMedia(e){return{matches:!1,media:e}},DOMParser:class{parseFromString(e,t){return{body:{textContent:e}}}}},nt=`global`in globalThis&&(globalThis==null?void 0:globalThis.global)===globalThis||typeof window>`u`||window.customElements===void 0,rt=Object.keys(tt).every(e=>e in globalThis),D=nt&&!rt?tt:globalThis,O=nt&&!rt?et:globalThis.document,it=new WeakMap,at=e=>{let t=it.get(e);return t||it.set(e,t=new Set),t},ot=new D.ResizeObserver(e=>{for(let t of e)for(let e of at(t.target))e(t)});function st(e,t){at(e).add(t),ot.observe(e)}function ct(e,t){let n=at(e);n.delete(t),n.size||ot.unobserve(e)}function lt(e){let t={};for(let n of e)t[n.name]=n.value;return t}function ut(e){return dt(e)??gt(e,`media-controller`)}function dt(e){let{MEDIA_CONTROLLER:t}=x,n=e.getAttribute(t);if(n)return vt(e)?.getElementById(n)}var ft=(e,t,n=`.value`)=>{let r=e.querySelector(n);r&&(r.textContent=t)},pt=(e,t)=>{let n=`slot[name="${t}"]`,r=e.shadowRoot.querySelector(n);return r?r.children:[]},mt=(e,t)=>pt(e,t)[0],ht=(e,t)=>!e||!t?!1:e?.contains(t)?!0:ht(e,t.getRootNode().host),gt=(e,t)=>e?e.closest(t)||gt(e.getRootNode().host,t):null;function _t(e=document){let t=e?.activeElement;return t?_t(t.shadowRoot)??t:null}function vt(e){let t=(e?.getRootNode)?.call(e);return t instanceof ShadowRoot||t instanceof Document?t:null}function yt(e,{depth:t=3,checkOpacity:n=!0,checkVisibilityCSS:r=!0}={}){if(e.checkVisibility)return e.checkVisibility({checkOpacity:n,checkVisibilityCSS:r});let i=e;for(;i&&t>0;){let e=getComputedStyle(i);if(n&&e.opacity===`0`||r&&e.visibility===`hidden`||e.display===`none`)return!1;i=i.parentElement,t--}return!0}function bt(e,t,n,r){let i=r.x-n.x,a=r.y-n.y,o=i*i+a*a;if(o===0)return 0;let s=((e-n.x)*i+(t-n.y)*a)/o;return Math.max(0,Math.min(1,s))}function k(e,t){return xt(e,e=>e===t)||St(e,t)}function xt(e,t){let n;for(n of e.querySelectorAll(`style:not([media])`)??[]){let e;try{e=n.sheet?.cssRules}catch{continue}for(let n of e??[])if(t(n.selectorText))return n}}function St(e,t){let n=e.querySelectorAll(`style:not([media])`)??[],r=n?.[n.length-1];if(!r?.sheet)return console.warn(`Media Chrome: No style sheet found on style tag of`,e),{style:{setProperty:()=>{},removeProperty:()=>``,getPropertyValue:()=>``}};let i=r?.sheet.insertRule(`${t}{}`,r.sheet.cssRules.length);return r.sheet.cssRules?.[i]}function A(e,t,n=NaN){let r=e.getAttribute(t);return r==null?n:+r}function j(e,t,n){let r=+n;n==null||Number.isNaN(r)?e.hasAttribute(t)&&e.removeAttribute(t):A(e,t,void 0)!==r&&e.setAttribute(t,`${r}`)}function M(e,t){return e.hasAttribute(t)}function N(e,t,n){n==null?e.hasAttribute(t)&&e.removeAttribute(t):M(e,t)!=n&&e.toggleAttribute(t,n)}function P(e,t,n=null){return e.getAttribute(t)??n}function F(e,t,n){if(n==null){e.hasAttribute(t)&&e.removeAttribute(t);return}let r=`${n}`;P(e,t,void 0)!==r&&e.setAttribute(t,r)}var Ct=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},wt=(e,t,n)=>(Ct(e,t,`read from private field`),n?n.call(e):t.get(e)),Tt=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},Et=(e,t,n,r)=>(Ct(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),I;function Dt(e){return`
    <style>
      :host {
        display: var(--media-control-display, var(--media-gesture-receiver-display, inline-block));
        box-sizing: border-box;
      }
    </style>
  `}var Ot=class extends D.HTMLElement{constructor(){if(super(),Tt(this,I,void 0),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);let e=lt(this.attributes);this.shadowRoot.innerHTML=this.constructor.getTemplateHTML(e)}}static get observedAttributes(){return[x.MEDIA_CONTROLLER,S.MEDIA_PAUSED]}attributeChangedCallback(e,t,n){var r,i,a,o;e===x.MEDIA_CONTROLLER&&(t&&((i=(r=wt(this,I))?.unassociateElement)==null||i.call(r,this),Et(this,I,null)),n&&this.isConnected&&(Et(this,I,this.getRootNode()?.getElementById(n)),(o=(a=wt(this,I))?.associateElement)==null||o.call(a,this)))}connectedCallback(){var e,t;this.tabIndex=-1,this.setAttribute(`aria-hidden`,`true`),Et(this,I,kt(this)),this.getAttribute(x.MEDIA_CONTROLLER)&&((t=(e=wt(this,I))?.associateElement)==null||t.call(e,this)),wt(this,I)&&(wt(this,I).addEventListener(`pointerdown`,this),wt(this,I).addEventListener(`click`,this),wt(this,I).hasAttribute(`tabindex`)||(wt(this,I).tabIndex=0))}disconnectedCallback(){var e,t,n,r;this.getAttribute(x.MEDIA_CONTROLLER)&&((t=(e=wt(this,I))?.unassociateElement)==null||t.call(e,this)),(n=wt(this,I))==null||n.removeEventListener(`pointerdown`,this),(r=wt(this,I))==null||r.removeEventListener(`click`,this),Et(this,I,null)}handleEvent(e){let t=e.composedPath()?.[0];if([`video`,`media-controller`].includes(t?.localName)){if(e.type===`pointerdown`)this._pointerType=e.pointerType;else if(e.type===`click`){let{clientX:t,clientY:n}=e,{left:r,top:i,width:a,height:o}=this.getBoundingClientRect(),s=t-r,c=n-i;if(s<0||c<0||s>a||c>o||a===0&&o===0)return;let l=this._pointerType||`mouse`;if(this._pointerType=void 0,l===Ne.TOUCH){this.handleTap(e);return}if(l===Ne.MOUSE||l===Ne.PEN){this.handleMouseClick(e);return}}}}get mediaPaused(){return M(this,S.MEDIA_PAUSED)}set mediaPaused(e){N(this,S.MEDIA_PAUSED,e)}handleTap(e){}handleMouseClick(e){let t=this.mediaPaused?b.MEDIA_PLAY_REQUEST:b.MEDIA_PAUSE_REQUEST;this.dispatchEvent(new D.CustomEvent(t,{composed:!0,bubbles:!0}))}};I=new WeakMap,Ot.shadowRootOptions={mode:`open`},Ot.getTemplateHTML=Dt;function kt(e){let t=e.getAttribute(x.MEDIA_CONTROLLER);return t?e.getRootNode()?.getElementById(t):gt(e,`media-controller`)}D.customElements.get(`media-gesture-receiver`)||D.customElements.define(`media-gesture-receiver`,Ot);var At=Ot,jt=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},L=(e,t,n)=>(jt(e,t,`read from private field`),n?n.call(e):t.get(e)),R=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},Mt=(e,t,n,r)=>(jt(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),Nt=(e,t,n)=>(jt(e,t,`access private method`),n),Pt,Ft,It,Lt,Rt,zt,Bt,Vt,Ht,Ut,Wt,Gt,Kt,qt,Jt,Yt,Xt,Zt,Qt,$t,z={AUDIO:`audio`,AUTOHIDE:`autohide`,BREAKPOINTS:`breakpoints`,GESTURES_DISABLED:`gesturesdisabled`,KEYBOARD_CONTROL:`keyboardcontrol`,NO_AUTOHIDE:`noautohide`,USER_INACTIVE:`userinactive`,AUTOHIDE_OVER_CONTROLS:`autohideovercontrols`};function en(e){return`
    <style>
      
      :host([${S.MEDIA_IS_FULLSCREEN}]) ::slotted([slot=media]) {
        outline: none;
      }

      :host {
        box-sizing: border-box;
        position: relative;
        display: inline-block;
        line-height: 0;
        background-color: var(--media-background-color, #000);
        overflow: hidden;
      }

      :host(:not([${z.AUDIO}])) [part~=layer]:not([part~=media-layer]) {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        display: flex;
        flex-flow: column nowrap;
        align-items: start;
        pointer-events: none;
        background: none;
      }

      slot[name=media] {
        display: var(--media-slot-display, contents);
      }

      
      :host([${z.AUDIO}]) slot[name=media] {
        display: var(--media-slot-display, none);
      }

      
      :host([${z.AUDIO}]) [part~=layer][part~=gesture-layer] {
        height: 0;
        display: block;
      }

      
      :host(:not([${z.AUDIO}])[${z.GESTURES_DISABLED}]) ::slotted([slot=gestures-chrome]),
          :host(:not([${z.AUDIO}])[${z.GESTURES_DISABLED}]) media-gesture-receiver[slot=gestures-chrome] {
        display: none;
      }

      
      ::slotted(:not([slot=media]):not([slot=poster]):not(media-loading-indicator):not([role=dialog]):not([hidden])) {
        pointer-events: auto;
      }

      :host(:not([${z.AUDIO}])) *[part~=layer][part~=centered-layer] {
        align-items: center;
        justify-content: center;
      }

      :host(:not([${z.AUDIO}])) ::slotted(media-gesture-receiver[slot=gestures-chrome]),
      :host(:not([${z.AUDIO}])) media-gesture-receiver[slot=gestures-chrome] {
        align-self: stretch;
        flex-grow: 1;
      }

      slot[name=middle-chrome] {
        display: inline;
        flex-grow: 1;
        pointer-events: none;
        background: none;
      }

      
      ::slotted([slot=media]),
      ::slotted([slot=poster]) {
        width: 100%;
        height: 100%;
      }

      
      :host(:not([${z.AUDIO}])) .spacer {
        flex-grow: 1;
      }

      
      :host(:-webkit-full-screen) {
        
        width: 100% !important;
        height: 100% !important;
      }

      
      ::slotted(:not([slot=media]):not([slot=poster]):not([${z.NO_AUTOHIDE}]):not([hidden]):not([role=dialog])) {
        opacity: 1;
        transition: var(--media-control-transition-in, opacity 0.25s);
      }

      
      :host([${z.USER_INACTIVE}]:not([${S.MEDIA_PAUSED}]):not([${S.MEDIA_IS_AIRPLAYING}]):not([${S.MEDIA_IS_CASTING}]):not([${z.AUDIO}])) ::slotted(:not([slot=media]):not([slot=poster]):not([${z.NO_AUTOHIDE}]):not([role=dialog])) {
        opacity: 0;
        transition: var(--media-control-transition-out, opacity 1s);
      }

      :host([${z.USER_INACTIVE}]:not([${z.NO_AUTOHIDE}]):not([${S.MEDIA_PAUSED}]):not([${S.MEDIA_IS_CASTING}]):not([${z.AUDIO}])) ::slotted([slot=media]) {
        cursor: none;
      }

      :host([${z.USER_INACTIVE}][${z.AUTOHIDE_OVER_CONTROLS}]:not([${z.NO_AUTOHIDE}]):not([${S.MEDIA_PAUSED}]):not([${S.MEDIA_IS_CASTING}]):not([${z.AUDIO}])) * {
        --media-cursor: none;
        cursor: none;
      }


      ::slotted(media-control-bar)  {
        align-self: stretch;
      }

      
      :host(:not([${z.AUDIO}])[${S.MEDIA_HAS_PLAYED}]) slot[name=poster] {
        display: none;
      }

      ::slotted([role=dialog]) {
        width: 100%;
        height: 100%;
        align-self: center;
      }

      ::slotted([role=menu]) {
        align-self: end;
      }
    </style>

    <slot name="media" part="layer media-layer"></slot>
    <slot name="poster" part="layer poster-layer"></slot>
    <slot name="gestures-chrome" part="layer gesture-layer">
      <media-gesture-receiver slot="gestures-chrome">
        <template shadowrootmode="${At.shadowRootOptions.mode}">
          ${At.getTemplateHTML({})}
        </template>
      </media-gesture-receiver>
    </slot>
    <span part="layer vertical-layer">
      <slot name="top-chrome" part="top chrome"></slot>
      <slot name="middle-chrome" part="middle chrome"></slot>
      <slot name="centered-chrome" part="layer centered-layer center centered chrome"></slot>
      
      <slot part="bottom chrome"></slot>
    </span>
    <slot name="dialog" part="layer dialog-layer"></slot>
  `}var tn=Object.values(S),nn=`sm:384 md:576 lg:768 xl:960`;function rn(e){an(e.target,e.contentRect.width)}function an(e,t){if(!e.isConnected)return;let n=on(e.getAttribute(z.BREAKPOINTS)??nn),r=sn(n,t),i=!1;if(Object.keys(n).forEach(t=>{r.includes(t)?e.hasAttribute(`breakpoint${t}`)||(e.setAttribute(`breakpoint${t}`,``),i=!0):e.hasAttribute(`breakpoint${t}`)&&(e.removeAttribute(`breakpoint${t}`),i=!0)}),i){let t=new CustomEvent(Ae.BREAKPOINTS_CHANGE,{detail:r});e.dispatchEvent(t)}e.breakpointsComputed||(e.breakpointsComputed=!0,e.dispatchEvent(new CustomEvent(Ae.BREAKPOINTS_COMPUTED,{bubbles:!0,composed:!0})))}function on(e){let t=e.split(/\s+/);return Object.fromEntries(t.map(e=>e.split(`:`)))}function sn(e,t){return Object.keys(e).filter(n=>t>=parseInt(e[n]))}var cn=class extends D.HTMLElement{constructor(){if(super(),R(this,Ht),R(this,Wt),R(this,Kt),R(this,Jt),R(this,Xt),R(this,Pt,void 0),R(this,Ft,0),R(this,It,null),R(this,Lt,null),R(this,Rt,void 0),this.breakpointsComputed=!1,R(this,zt,e=>{let t=this.media;for(let n of e){if(n.type!==`childList`)continue;let e=n.removedNodes;for(let r of e){if(r.slot!=`media`||n.target!=this)continue;let e=n.previousSibling&&n.previousSibling.previousElementSibling;if(!e||!t)this.mediaUnsetCallback(r);else{let t=e.slot!==`media`;for(;(e=e.previousSibling)!==null;)e.slot==`media`&&(t=!1);t&&this.mediaUnsetCallback(r)}}if(t)for(let e of n.addedNodes)e===t&&this.handleMediaUpdated(t)}}),R(this,Bt,!1),R(this,Vt,e=>{L(this,Bt)||(setTimeout(()=>{rn(e),Mt(this,Bt,!1)},0),Mt(this,Bt,!0))}),R(this,Qt,void 0),R(this,$t,()=>{L(this,Qt).assignedElements({flatten:!0}).length?this.handleMediaUpdated(this.media):L(this,It)&&this.mediaUnsetCallback(L(this,It))}),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);let e=lt(this.attributes),t=this.constructor.getTemplateHTML(e);this.shadowRoot.setHTMLUnsafe?this.shadowRoot.setHTMLUnsafe(t):this.shadowRoot.innerHTML=t}Mt(this,Pt,new MutationObserver(L(this,zt)))}static get observedAttributes(){return[z.AUTOHIDE,z.GESTURES_DISABLED].concat(tn).filter(e=>![S.MEDIA_RENDITION_LIST,S.MEDIA_AUDIO_TRACK_LIST,S.MEDIA_CHAPTERS_CUES,S.MEDIA_WIDTH,S.MEDIA_HEIGHT,S.MEDIA_ERROR,S.MEDIA_ERROR_MESSAGE].includes(e))}attributeChangedCallback(e,t,n){e.toLowerCase()==z.AUTOHIDE&&(this.autohide=n)}get media(){let e=this.querySelector(`:scope > [slot=media]`);return e?.nodeName==`SLOT`&&(e=e.assignedElements({flatten:!0})[0]),e}async handleMediaUpdated(e){e&&(Mt(this,It,e),e.localName.includes(`-`)&&await D.customElements.whenDefined(e.localName),this.mediaSetCallback(e))}connectedCallback(){var e;L(this,Pt).observe(this,{childList:!0,subtree:!0}),st(this,L(this,Vt));let t=this.getAttribute(z.AUDIO)==null?T(`video player`):T(`audio player`);this.setAttribute(`role`,`region`),this.setAttribute(`aria-label`,t),this.handleMediaUpdated(this.media),this.setAttribute(z.USER_INACTIVE,``),an(this,this.getBoundingClientRect().width);let n=this.querySelector(`:scope > slot[slot=media]`);n&&(Mt(this,Qt,n),L(this,Qt).addEventListener(`slotchange`,L(this,$t))),this.addEventListener(`pointerdown`,this),this.addEventListener(`pointermove`,this),this.addEventListener(`pointerup`,this),this.addEventListener(`mouseleave`,this),this.addEventListener(`keyup`,this),(e=D.window)==null||e.addEventListener(`mouseup`,this)}disconnectedCallback(){var e;ct(this,L(this,Vt)),clearTimeout(L(this,Lt)),L(this,Pt).disconnect(),this.media&&this.mediaUnsetCallback(this.media),(e=D.window)==null||e.removeEventListener(`mouseup`,this),this.removeEventListener(`pointerdown`,this),this.removeEventListener(`pointermove`,this),this.removeEventListener(`pointerup`,this),this.removeEventListener(`mouseleave`,this),this.removeEventListener(`keyup`,this),L(this,Qt)&&(L(this,Qt).removeEventListener(`slotchange`,L(this,$t)),Mt(this,Qt,null)),Mt(this,Bt,!1)}mediaSetCallback(e){}mediaUnsetCallback(e){Mt(this,It,null)}handleEvent(e){switch(e.type){case`pointerdown`:Mt(this,Ft,e.timeStamp);break;case`pointermove`:Nt(this,Ht,Ut).call(this,e);break;case`pointerup`:Nt(this,Wt,Gt).call(this,e);break;case`mouseleave`:Nt(this,Kt,qt).call(this);break;case`mouseup`:this.removeAttribute(z.KEYBOARD_CONTROL);break;case`keyup`:Nt(this,Xt,Zt).call(this),this.setAttribute(z.KEYBOARD_CONTROL,``)}}set autohide(e){let t=Number(e);Mt(this,Rt,isNaN(t)?0:t)}get autohide(){return(L(this,Rt)===void 0?2:L(this,Rt)).toString()}get breakpoints(){return P(this,z.BREAKPOINTS)}set breakpoints(e){F(this,z.BREAKPOINTS,e)}get audio(){return M(this,z.AUDIO)}set audio(e){N(this,z.AUDIO,e)}get gesturesDisabled(){return M(this,z.GESTURES_DISABLED)}set gesturesDisabled(e){N(this,z.GESTURES_DISABLED,e)}get keyboardControl(){return M(this,z.KEYBOARD_CONTROL)}set keyboardControl(e){N(this,z.KEYBOARD_CONTROL,e)}get noAutohide(){return M(this,z.NO_AUTOHIDE)}set noAutohide(e){N(this,z.NO_AUTOHIDE,e)}get autohideOverControls(){return M(this,z.AUTOHIDE_OVER_CONTROLS)}set autohideOverControls(e){N(this,z.AUTOHIDE_OVER_CONTROLS,e)}get userInteractive(){return M(this,z.USER_INACTIVE)}set userInteractive(e){N(this,z.USER_INACTIVE,e)}};Pt=new WeakMap,Ft=new WeakMap,It=new WeakMap,Lt=new WeakMap,Rt=new WeakMap,zt=new WeakMap,Bt=new WeakMap,Vt=new WeakMap,Ht=new WeakSet,Ut=function(e){if(e.pointerType!==`mouse`&&e.timeStamp-L(this,Ft)<250)return;Nt(this,Jt,Yt).call(this),clearTimeout(L(this,Lt));let t=this.hasAttribute(z.AUTOHIDE_OVER_CONTROLS);([this,this.media].includes(e.target)||t)&&Nt(this,Xt,Zt).call(this)},Wt=new WeakSet,Gt=function(e){if(e.pointerType===`touch`){let t=!this.hasAttribute(z.USER_INACTIVE);[this,this.media].includes(e.target)&&t?Nt(this,Kt,qt).call(this):Nt(this,Xt,Zt).call(this)}else e.composedPath().some(e=>[`media-play-button`,`media-fullscreen-button`].includes(e?.localName))&&Nt(this,Xt,Zt).call(this)},Kt=new WeakSet,qt=function(){if(L(this,Rt)<0||this.hasAttribute(z.USER_INACTIVE))return;this.setAttribute(z.USER_INACTIVE,``);let e=new D.CustomEvent(Ae.USER_INACTIVE_CHANGE,{composed:!0,bubbles:!0,detail:!0});this.dispatchEvent(e)},Jt=new WeakSet,Yt=function(){if(!this.hasAttribute(z.USER_INACTIVE))return;this.removeAttribute(z.USER_INACTIVE);let e=new D.CustomEvent(Ae.USER_INACTIVE_CHANGE,{composed:!0,bubbles:!0,detail:!1});this.dispatchEvent(e)},Xt=new WeakSet,Zt=function(){Nt(this,Jt,Yt).call(this),clearTimeout(L(this,Lt));let e=parseInt(this.autohide);e<0||Mt(this,Lt,setTimeout(()=>{Nt(this,Kt,qt).call(this)},e*1e3))},Qt=new WeakMap,$t=new WeakMap,cn.shadowRootOptions={mode:`open`},cn.getTemplateHTML=en,D.customElements.get(`media-container`)||D.customElements.define(`media-container`,cn);var ln=cn,un=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},B=(e,t,n)=>(un(e,t,`read from private field`),n?n.call(e):t.get(e)),dn=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},fn=(e,t,n,r)=>(un(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),pn,mn,hn,gn,_n,vn,yn=class{constructor(e,t,{defaultValue:n}={defaultValue:void 0}){dn(this,_n),dn(this,pn,void 0),dn(this,mn,void 0),dn(this,hn,void 0),dn(this,gn,new Set),fn(this,pn,e),fn(this,mn,t),fn(this,hn,new Set(n))}[Symbol.iterator](){return B(this,_n,vn).values()}get length(){return B(this,_n,vn).size}get value(){return[...B(this,_n,vn)].join(` `)??``}set value(e){e!==this.value&&(fn(this,gn,new Set),this.add(...e?.split(` `)??[]))}toString(){return this.value}item(e){return[...B(this,_n,vn)][e]}values(){return B(this,_n,vn).values()}forEach(e,t){B(this,_n,vn).forEach(e,t)}add(...e){var t;e.forEach(e=>B(this,gn).add(e)),this.value===``&&!B(this,pn)?.hasAttribute(`${B(this,mn)}`)||(t=B(this,pn))==null||t.setAttribute(`${B(this,mn)}`,`${this.value}`)}remove(...e){var t;e.forEach(e=>B(this,gn).delete(e)),(t=B(this,pn))==null||t.setAttribute(`${B(this,mn)}`,`${this.value}`)}contains(e){return B(this,_n,vn).has(e)}toggle(e,t){return t===void 0?this.contains(e)?(this.remove(e),!1):(this.add(e),!0):t?(this.add(e),!0):(this.remove(e),!1)}replace(e,t){return this.remove(e),this.add(t),e===t}};pn=new WeakMap,mn=new WeakMap,hn=new WeakMap,gn=new WeakMap,_n=new WeakSet,vn=function(){return B(this,gn).size?B(this,gn):B(this,hn)};var bn=(e=``)=>e.split(/\s+/),xn=(e=``)=>{let[t,n,r]=e.split(`:`),i=r?decodeURIComponent(r):void 0;return{kind:t===`cc`?C.CAPTIONS:C.SUBTITLES,language:n,label:i}},Sn=(e=``,t={})=>bn(e).map(e=>{let n=xn(e);return{...t,...n}}),Cn=e=>e?Array.isArray(e)?e.map(e=>typeof e==`string`?xn(e):e):typeof e==`string`?Sn(e):[e]:[],wn=({kind:e,label:t,language:n}={kind:`subtitles`})=>t?`${e===`captions`?`cc`:`sb`}:${n}:${encodeURIComponent(t)}`:n,Tn=(e=[])=>Array.prototype.map.call(e,wn).join(` `),En=(e,t)=>n=>n[e]===t,Dn=e=>{let t=Object.entries(e).map(([e,t])=>En(e,t));return e=>t.every(t=>t(e))},On=(e,t=[],n=[])=>{let r=Cn(n).map(Dn);Array.from(t).filter(e=>r.some(t=>t(e))).forEach(t=>{t.mode=e})},kn=(e,t=()=>!0)=>{if(!e?.textTracks)return[];let n=typeof t==`function`?t:Dn(t);return Array.from(e.textTracks).filter(n)},An=e=>!!e.mediaSubtitlesShowing?.length||e.hasAttribute(S.MEDIA_SUBTITLES_SHOWING),jn=e=>{let{media:t,fullscreenElement:n}=e;try{let e=n&&`requestFullscreen`in n?`requestFullscreen`:n&&`webkitRequestFullScreen`in n?`webkitRequestFullScreen`:void 0;if(e){let t=n[e]?.call(n);if(t instanceof Promise)return t.catch(()=>{})}else t?.webkitEnterFullscreen?t.webkitEnterFullscreen():t?.requestFullscreen&&t.requestFullscreen()}catch(e){console.error(e)}},Mn=`exitFullscreen`in O?`exitFullscreen`:`webkitExitFullscreen`in O?`webkitExitFullscreen`:`webkitCancelFullScreen`in O?`webkitCancelFullScreen`:void 0,Nn=e=>{let{documentElement:t}=e;if(Mn){let e=(t?.[Mn])?.call(t);if(e instanceof Promise)return e.catch(()=>{})}},Pn=`fullscreenElement`in O?`fullscreenElement`:`webkitFullscreenElement`in O?`webkitFullscreenElement`:void 0,Fn=e=>{let{documentElement:t,media:n}=e,r=t?.[Pn];return!r&&`webkitDisplayingFullscreen`in n&&`webkitPresentationMode`in n&&n.webkitDisplayingFullscreen&&n.webkitPresentationMode===Fe.FULLSCREEN?n:r},In=e=>{let{media:t,documentElement:n,fullscreenElement:r=t}=e;if(!t||!n)return!1;let i=Fn(e);if(!i)return!1;if(i===r||i===t)return!0;if(i.localName.includes(`-`)){let e=i.shadowRoot;if(!(Pn in e))return ht(i,r);for(;e?.[Pn];){if(e[Pn]===r)return!0;e=e[Pn]?.shadowRoot}}return!1},Ln=`fullscreenEnabled`in O?`fullscreenEnabled`:`webkitFullscreenEnabled`in O?`webkitFullscreenEnabled`:void 0,Rn=e=>{let{documentElement:t,media:n}=e;return!!t?.[Ln]||n&&`webkitSupportsFullscreen`in n},zn,Bn=()=>{var e;return zn||(zn=((e=O)?.createElement)?.call(e,`video`),zn)},Vn=async(e=Bn())=>{if(!e)return!1;let t=e.volume;e.volume=t/2+.1;let n=new AbortController,r=await Promise.race([Hn(e,n.signal),Un(e,t)]);return n.abort(),r},Hn=(e,t)=>new Promise(n=>{e.addEventListener(`volumechange`,()=>n(!0),{signal:t})}),Un=async(e,t)=>{for(let n=0;n<10;n++){if(e.volume===t)return!1;await Ve(10)}return e.volume!==t},Wn=/.*Version\/.*Safari\/.*/.test(D.navigator.userAgent),Gn=(e=Bn())=>D.matchMedia(`(display-mode: standalone)`).matches&&Wn?!1:typeof e?.requestPictureInPicture==`function`,Kn=(e=Bn())=>Rn({documentElement:O,media:e}),qn=Kn(),Jn=Gn(),Yn=!!D.WebKitPlaybackTargetAvailabilityEvent,Xn=!!D.chrome,Zn=e=>kn(e.media,e=>[C.SUBTITLES,C.CAPTIONS].includes(e.kind)).sort((e,t)=>e.kind>=t.kind?1:-1),Qn=e=>kn(e.media,e=>e.mode===Me.SHOWING&&[C.SUBTITLES,C.CAPTIONS].includes(e.kind)),$n=(e,t)=>{let n=Zn(e),r=Qn(e),i=!!r.length;if(n.length){if(t===!1||i&&t!==!0)On(Me.DISABLED,n,r);else if(t===!0||!i&&t!==!1){let t=n[0],{options:i}=e;if(!i?.noSubtitlesLangPref){let e=D.localStorage.getItem(`media-chrome-pref-subtitles-lang`),r=e?[e,...D.navigator.languages]:D.navigator.languages,i=n.filter(e=>r.some(t=>e.language.toLowerCase().startsWith(t.split(`-`)[0]))).sort((e,t)=>r.findIndex(t=>e.language.toLowerCase().startsWith(t.split(`-`)[0]))-r.findIndex(e=>t.language.toLowerCase().startsWith(e.split(`-`)[0])));i[0]&&(t=i[0])}let{language:a,label:o,kind:s}=t;On(Me.DISABLED,n,r),On(Me.SHOWING,n,[{language:a,label:o,kind:s}])}}},er=(e,t)=>e===t?!0:e==null||t==null||typeof e!=typeof t?!1:typeof e==`number`&&Number.isNaN(e)&&Number.isNaN(t)?!0:typeof e==`object`?Array.isArray(e)?tr(e,t):Object.entries(e).every(([e,n])=>e in t&&er(n,t[e])):!1,tr=(e,t)=>{let n=Array.isArray(e),r=Array.isArray(t);return n===r?n||r?e.length===t.length&&e.every((e,n)=>er(e,t[n])):!0:!1},nr=Object.values(Pe),rr,ir=Vn().then(e=>(rr=e,rr)),ar=async(...e)=>{await Promise.all(e.filter(e=>e).map(async e=>{if(!(`localName`in e&&e instanceof D.HTMLElement))return;let t=e.localName;if(!t.includes(`-`))return;let n=D.customElements.get(t);n&&e instanceof n||(await D.customElements.whenDefined(t),D.customElements.upgrade(e))}))},or=new D.DOMParser,sr=e=>e&&(or.parseFromString(e,`text/html`).body.textContent||e),cr={mediaError:{get(e,t){let{media:n}=e;if(t?.type!==`playing`)return n?.error},mediaEvents:[`emptied`,`error`,`playing`]},mediaErrorCode:{get(e,t){let{media:n}=e;if(t?.type!==`playing`)return n?.error?.code},mediaEvents:[`emptied`,`error`,`playing`]},mediaErrorMessage:{get(e,t){let{media:n}=e;if(t?.type!==`playing`)return n?.error?.message??``},mediaEvents:[`emptied`,`error`,`playing`]},mediaWidth:{get(e){let{media:t}=e;return t?.videoWidth??0},mediaEvents:[`resize`]},mediaHeight:{get(e){let{media:t}=e;return t?.videoHeight??0},mediaEvents:[`resize`]},mediaPaused:{get(e){let{media:t}=e;return t?.paused??!0},set(e,t){var n;let{media:r}=t;r&&(e?r.pause():(n=r.play())==null||n.catch(()=>{}))},mediaEvents:[`play`,`playing`,`pause`,`emptied`]},mediaHasPlayed:{get(e,t){let{media:n}=e;return n?t?t.type===`playing`:!n.paused:!1},mediaEvents:[`playing`,`emptied`]},mediaEnded:{get(e){let{media:t}=e;return t?.ended??!1},mediaEvents:[`seeked`,`ended`,`emptied`]},mediaPlaybackRate:{get(e){let{media:t}=e;return t?.playbackRate??1},set(e,t){let{media:n}=t;n&&Number.isFinite(+e)&&(n.playbackRate=+e)},mediaEvents:[`ratechange`,`loadstart`]},mediaMuted:{get(e){let{media:t}=e;return t?.muted??!1},set(e,t){let{media:n,options:{noMutedPref:r}={}}=t;if(n){n.muted=e;try{let t=D.localStorage.getItem(`media-chrome-pref-muted`)!==null,i=n.hasAttribute(`muted`);if(r){t&&D.localStorage.removeItem(`media-chrome-pref-muted`);return}if(i&&!t)return;D.localStorage.setItem(`media-chrome-pref-muted`,e?`true`:`false`)}catch(e){console.debug(`Error setting muted pref`,e)}}},mediaEvents:[`volumechange`],stateOwnersUpdateHandlers:[(e,t)=>{let{options:{noMutedPref:n}}=t,{media:r}=t;if(!(!r||r.muted||n))try{let n=D.localStorage.getItem(`media-chrome-pref-muted`)===`true`;cr.mediaMuted.set(n,t),e(n)}catch(e){console.debug(`Error getting muted pref`,e)}}]},mediaLoop:{get(e){let{media:t}=e;return t?.loop},set(e,t){let{media:n}=t;n&&(n.loop=e)},mediaEvents:[`medialooprequest`]},mediaVolume:{get(e){let{media:t}=e;return t?.volume??1},set(e,t){let{media:n,options:{noVolumePref:r}={}}=t;if(n){try{e==null?D.localStorage.removeItem(`media-chrome-pref-volume`):!n.hasAttribute(`muted`)&&!r&&D.localStorage.setItem(`media-chrome-pref-volume`,e.toString())}catch(e){console.debug(`Error setting volume pref`,e)}Number.isFinite(+e)&&(n.volume=+e)}},mediaEvents:[`volumechange`],stateOwnersUpdateHandlers:[(e,t)=>{let{options:{noVolumePref:n}}=t;if(!n)try{let{media:n}=t;if(!n)return;let r=D.localStorage.getItem(`media-chrome-pref-volume`);if(r==null)return;cr.mediaVolume.set(+r,t),e(+r)}catch(e){console.debug(`Error getting volume pref`,e)}}]},mediaVolumeLevel:{get(e){let{media:t}=e;return t?.volume===void 0?`high`:t.muted||t.volume===0?`off`:t.volume<.5?`low`:t.volume<.75?`medium`:`high`},mediaEvents:[`volumechange`]},mediaCurrentTime:{get(e){let{media:t}=e;return t?.currentTime??0},set(e,t){let{media:n}=t;n&&Be(e)&&(n.currentTime=e)},mediaEvents:[`timeupdate`,`loadedmetadata`,`seeking`]},mediaDuration:{get(e){let{media:t,options:{defaultDuration:n}={}}=e;return n&&(!t||!t.duration||Number.isNaN(t.duration)||!Number.isFinite(t.duration))?n:Number.isFinite(t?.duration)?t.duration:NaN},mediaEvents:[`durationchange`,`loadedmetadata`,`emptied`]},mediaLoading:{get(e){let{media:t}=e;return t?.readyState<3},mediaEvents:[`waiting`,`playing`,`emptied`]},mediaSeekable:{get(e){let{media:t}=e;if(!t?.seekable?.length)return;let n=t.seekable.start(0),r=t.seekable.end(t.seekable.length-1);if(n||r)return[Number(n.toFixed(3)),Number(r.toFixed(3))]},mediaEvents:[`loadedmetadata`,`emptied`,`progress`,`seekablechange`]},mediaBuffered:{get(e){let{media:t}=e,n=t?.buffered??[];return Array.from(n).map((e,t)=>[Number(n.start(t).toFixed(3)),Number(n.end(t).toFixed(3))])},mediaEvents:[`progress`,`emptied`]},mediaStreamType:{get(e){let{media:t,options:{defaultStreamType:n}={}}=e,r=[Pe.LIVE,Pe.ON_DEMAND].includes(n)?n:void 0;if(!t)return r;let{streamType:i}=t;if(nr.includes(i))return i===Pe.UNKNOWN?r:i;let a=t.duration;return a===1/0?Pe.LIVE:Number.isFinite(a)?Pe.ON_DEMAND:r},mediaEvents:[`emptied`,`durationchange`,`loadedmetadata`,`streamtypechange`]},mediaTargetLiveWindow:{get(e){let{media:t}=e;if(!t)return NaN;let{targetLiveWindow:n}=t,r=cr.mediaStreamType.get(e);return(n==null||Number.isNaN(n))&&r===Pe.LIVE?0:n},mediaEvents:[`emptied`,`durationchange`,`loadedmetadata`,`streamtypechange`,`targetlivewindowchange`]},mediaTimeIsLive:{get(e){let{media:t,options:{liveEdgeOffset:n=10}={}}=e;if(!t)return!1;if(typeof t.liveEdgeStart==`number`)return!Number.isNaN(t.liveEdgeStart)&&t.currentTime>=t.liveEdgeStart;if(cr.mediaStreamType.get(e)!==Pe.LIVE)return!1;let r=t.seekable;if(!r)return!0;if(!r.length)return!1;let i=r.end(r.length-1)-n;return t.currentTime>=i},mediaEvents:[`playing`,`timeupdate`,`progress`,`waiting`,`emptied`]},mediaSubtitlesList:{get(e){return Zn(e).map(({kind:e,label:t,language:n})=>({kind:e,label:t,language:n}))},mediaEvents:[`loadstart`],textTracksEvents:[`addtrack`,`removetrack`]},mediaSubtitlesShowing:{get(e){return Qn(e).map(({kind:e,label:t,language:n})=>({kind:e,label:t,language:n}))},mediaEvents:[`loadstart`],textTracksEvents:[`addtrack`,`removetrack`,`change`],stateOwnersUpdateHandlers:[(e,t)=>{var n,r;let{media:i,options:a}=t;if(!i)return;let o=e=>{a.defaultSubtitles&&(!e||[C.CAPTIONS,C.SUBTITLES].includes(e?.track?.kind))&&$n(t,!0)};return i.addEventListener(`loadstart`,o),(n=i.textTracks)==null||n.addEventListener(`addtrack`,o),(r=i.textTracks)==null||r.addEventListener(`removetrack`,o),()=>{var e,t;i.removeEventListener(`loadstart`,o),(e=i.textTracks)==null||e.removeEventListener(`addtrack`,o),(t=i.textTracks)==null||t.removeEventListener(`removetrack`,o)}}]},mediaChaptersCues:{get(e){let{media:t}=e;if(!t)return[];let[n]=kn(t,{kind:C.CHAPTERS});return Array.from(n?.cues??[]).map(({text:e,startTime:t,endTime:n})=>({text:sr(e),startTime:t,endTime:n}))},mediaEvents:[`loadstart`,`loadedmetadata`],textTracksEvents:[`addtrack`,`removetrack`,`change`],stateOwnersUpdateHandlers:[(e,t)=>{let{media:n}=t;if(!n)return;let r=n.querySelector(`track[kind="chapters"][default][src]`),i=n.shadowRoot?.querySelector(`:is(video,audio) > track[kind="chapters"][default][src]`);return r?.addEventListener(`load`,e),i?.addEventListener(`load`,e),()=>{r?.removeEventListener(`load`,e),i?.removeEventListener(`load`,e)}}]},mediaIsPip:{get(e){let{media:t,documentElement:n}=e;if(!t||!n||!n.pictureInPictureElement)return!1;if(n.pictureInPictureElement===t)return!0;if(n.pictureInPictureElement instanceof HTMLMediaElement)return t.localName?.includes(`-`)?ht(t,n.pictureInPictureElement):!1;if(n.pictureInPictureElement.localName.includes(`-`)){let e=n.pictureInPictureElement.shadowRoot;for(;e?.pictureInPictureElement;){if(e.pictureInPictureElement===t)return!0;e=e.pictureInPictureElement?.shadowRoot}}return!1},set(e,t){let{media:n}=t;if(n){if(e){if(!O.pictureInPictureEnabled){console.warn(`MediaChrome: Picture-in-picture is not enabled`);return}if(!n.requestPictureInPicture){console.warn(`MediaChrome: The current media does not support picture-in-picture`);return}let e=()=>{console.warn(`MediaChrome: The media is not ready for picture-in-picture. It must have a readyState > 0.`)};n.requestPictureInPicture().catch(t=>{if(t.code===11){if(!n.src){console.warn(`MediaChrome: The media is not ready for picture-in-picture. It must have a src set.`);return}if(n.readyState===0&&n.preload===`none`){let t=()=>{n.removeEventListener(`loadedmetadata`,r),n.preload=`none`},r=()=>{n.requestPictureInPicture().catch(e),t()};n.addEventListener(`loadedmetadata`,r),n.preload=`metadata`,setTimeout(()=>{n.readyState===0&&e(),t()},1e3)}else throw t}else throw t})}else O.pictureInPictureElement&&O.exitPictureInPicture()}},mediaEvents:[`enterpictureinpicture`,`leavepictureinpicture`]},mediaRenditionList:{get(e){let{media:t}=e;return[...t?.videoRenditions??[]].map(e=>({...e}))},mediaEvents:[`emptied`,`loadstart`],videoRenditionsEvents:[`addrendition`,`removerendition`]},mediaRenditionSelected:{get(e){let{media:t}=e;return t?.videoRenditions?.[t.videoRenditions?.selectedIndex]?.id},set(e,t){let{media:n}=t;if(!n?.videoRenditions){console.warn(`MediaController: Rendition selection not supported by this media.`);return}let r=e,i=Array.prototype.findIndex.call(n.videoRenditions,e=>e.id==r);n.videoRenditions.selectedIndex!=i&&(n.videoRenditions.selectedIndex=i)},mediaEvents:[`emptied`],videoRenditionsEvents:[`addrendition`,`removerendition`,`change`]},mediaAudioTrackList:{get(e){let{media:t}=e;return[...t?.audioTracks??[]]},mediaEvents:[`emptied`,`loadstart`],audioTracksEvents:[`addtrack`,`removetrack`]},mediaAudioTrackEnabled:{get(e){let{media:t}=e;return[...t?.audioTracks??[]].find(e=>e.enabled)?.id},set(e,t){let{media:n}=t;if(!n?.audioTracks){console.warn(`MediaChrome: Audio track selection not supported by this media.`);return}let r=e;for(let e of n.audioTracks)e.enabled=r==e.id},mediaEvents:[`emptied`],audioTracksEvents:[`addtrack`,`removetrack`,`change`]},mediaIsFullscreen:{get(e){return In(e)},set(e,t,n){var r;e?(jn(t),n.detail&&!t.media?.inert&&((r=t.media)==null||r.focus())):Nn(t)},rootEvents:[`fullscreenchange`,`webkitfullscreenchange`],mediaEvents:[`webkitbeginfullscreen`,`webkitendfullscreen`,`webkitpresentationmodechanged`]},mediaIsCasting:{get(e){let{media:t}=e;return!t?.remote||t.remote?.state===`disconnected`?!1:t.remote.state===`connected`},set(e,t){let{media:n}=t;n&&(e&&n.remote?.state!==`disconnected`||(e||n.remote?.state===`connected`)&&(typeof n.remote.prompt==`function`?n.remote.prompt().catch(()=>{}):console.warn(`MediaChrome: Casting is not supported in this environment`)))},remoteEvents:[`connect`,`connecting`,`disconnect`]},mediaIsAirplaying:{get(){return!1},set(e,t){let{media:n}=t;n&&(n.webkitShowPlaybackTargetPicker&&D.WebKitPlaybackTargetAvailabilityEvent?n.webkitShowPlaybackTargetPicker():console.error(`MediaChrome: received a request to select AirPlay but AirPlay is not supported in this environment`))},mediaEvents:[`webkitcurrentplaybacktargetiswirelesschanged`]},mediaFullscreenUnavailable:{get(e){let{media:t}=e;if(!qn||!Kn(t))return w.UNSUPPORTED}},mediaPipUnavailable:{get(e){let{media:t}=e;if(!Jn||!Gn(t))return w.UNSUPPORTED;if(t?.disablePictureInPicture)return w.UNAVAILABLE}},mediaVolumeUnavailable:{get(e){let{media:t}=e;if(rr===!1||t?.volume==null)return w.UNSUPPORTED},stateOwnersUpdateHandlers:[e=>{rr??ir.then(t=>e(t?void 0:w.UNSUPPORTED))}]},mediaCastUnavailable:{get(e,{availability:t=`not-available`}={}){let{media:n}=e;if(!Xn||!n?.remote?.state)return w.UNSUPPORTED;if(t!=null&&t!==`available`)return w.UNAVAILABLE},stateOwnersUpdateHandlers:[(e,t)=>{var n;let{media:r}=t;if(r)return r.disableRemotePlayback||r.hasAttribute(`disableremoteplayback`)||(n=r?.remote)==null||n.watchAvailability(t=>{e({availability:t?`available`:`not-available`})}).catch(t=>{t.name===`NotSupportedError`?e({availability:null}):e({availability:`not-available`})}),()=>{var e;(e=r?.remote)==null||e.cancelWatchAvailability().catch(()=>{})}}]},mediaAirplayUnavailable:{get(e,t){if(!Yn)return w.UNSUPPORTED;if(t?.availability===`not-available`)return w.UNAVAILABLE},mediaEvents:[`webkitplaybacktargetavailabilitychanged`],stateOwnersUpdateHandlers:[(e,t)=>{var n;let{media:r}=t;if(r)return r.disableRemotePlayback||r.hasAttribute(`disableremoteplayback`)||(n=r?.remote)==null||n.watchAvailability(t=>{e({availability:t?`available`:`not-available`})}).catch(t=>{t.name===`NotSupportedError`?e({availability:null}):e({availability:`not-available`})}),()=>{var e;(e=r?.remote)==null||e.cancelWatchAvailability().catch(()=>{})}}]},mediaRenditionUnavailable:{get(e){let{media:t}=e;if(!t?.videoRenditions)return w.UNSUPPORTED;if(!t.videoRenditions?.length)return w.UNAVAILABLE},mediaEvents:[`emptied`,`loadstart`],videoRenditionsEvents:[`addrendition`,`removerendition`]},mediaAudioTrackUnavailable:{get(e){let{media:t}=e;if(!t?.audioTracks)return w.UNSUPPORTED;if((t.audioTracks?.length??0)<=1)return w.UNAVAILABLE},mediaEvents:[`emptied`,`loadstart`],audioTracksEvents:[`addtrack`,`removetrack`]},mediaLang:{get(e){let{options:{mediaLang:t}={}}=e;return t??`en`}}},lr={[b.MEDIA_PREVIEW_REQUEST](e,t,{detail:n}){let{media:r}=t,i=n??void 0,a,o;if(r&&i!=null){let[e]=kn(r,{kind:C.METADATA,label:`thumbnails`}),t=Array.prototype.find.call(e?.cues??[],(e,t,n)=>t===0?e.endTime>i:t===n.length-1?e.startTime<=i:e.startTime<=i&&e.endTime>i);if(t){let e=/'^(?:[a-z]+:)?\/\//i.test(t.text)?void 0:r?.querySelector(`track[label="thumbnails"]`)?.src,n=new URL(t.text,e);o=new URLSearchParams(n.hash).get(`#xywh`).split(`,`).map(e=>+e),a=n.href}}let s=e.mediaDuration.get(t),c=e.mediaChaptersCues.get(t).find((e,t,n)=>t===n.length-1&&s===e.endTime?e.startTime<=i&&e.endTime>=i:e.startTime<=i&&e.endTime>i)?.text;return n!=null&&c==null&&(c=``),{mediaPreviewTime:i,mediaPreviewImage:a,mediaPreviewCoords:o,mediaPreviewChapter:c}},[b.MEDIA_PAUSE_REQUEST](e,t){e.mediaPaused.set(!0,t)},[b.MEDIA_PLAY_REQUEST](e,t){let n=e.mediaStreamType.get(t)===Pe.LIVE,r=!t.options?.noAutoSeekToLive,i=e.mediaTargetLiveWindow.get(t)>0;if(n&&r&&!i){let n=e.mediaSeekable.get(t)?.[1];if(n){let r=n-(t.options?.seekToLiveOffset??0);e.mediaCurrentTime.set(r,t)}}e.mediaPaused.set(!1,t)},[b.MEDIA_PLAYBACK_RATE_REQUEST](e,t,{detail:n}){let r=n;e.mediaPlaybackRate.set(r,t)},[b.MEDIA_MUTE_REQUEST](e,t){e.mediaMuted.set(!0,t)},[b.MEDIA_UNMUTE_REQUEST](e,t){e.mediaVolume.get(t)||e.mediaVolume.set(.25,t),e.mediaMuted.set(!1,t)},[b.MEDIA_LOOP_REQUEST](e,t,{detail:n}){let r=!!n;return e.mediaLoop.set(r,t),{mediaLoop:r}},[b.MEDIA_VOLUME_REQUEST](e,t,{detail:n}){let r=n;r&&e.mediaMuted.get(t)&&e.mediaMuted.set(!1,t),e.mediaVolume.set(r,t)},[b.MEDIA_SEEK_REQUEST](e,t,{detail:n}){let r=n;e.mediaCurrentTime.set(r,t)},[b.MEDIA_SEEK_TO_LIVE_REQUEST](e,t){let n=e.mediaSeekable.get(t)?.[1];if(Number.isNaN(Number(n)))return;let r=n-(t.options?.seekToLiveOffset??0);e.mediaCurrentTime.set(r,t)},[b.MEDIA_SHOW_SUBTITLES_REQUEST](e,t,{detail:n}){let{options:r}=t,i=Zn(t),a=Cn(n),o=a[0]?.language;o&&!r.noSubtitlesLangPref&&D.localStorage.setItem(`media-chrome-pref-subtitles-lang`,o),On(Me.SHOWING,i,a)},[b.MEDIA_DISABLE_SUBTITLES_REQUEST](e,t,{detail:n}){let r=Zn(t),i=n??[];On(Me.DISABLED,r,i)},[b.MEDIA_TOGGLE_SUBTITLES_REQUEST](e,t,{detail:n}){$n(t,n)},[b.MEDIA_RENDITION_REQUEST](e,t,{detail:n}){let r=n;e.mediaRenditionSelected.set(r,t)},[b.MEDIA_AUDIO_TRACK_REQUEST](e,t,{detail:n}){let r=n;e.mediaAudioTrackEnabled.set(r,t)},[b.MEDIA_ENTER_PIP_REQUEST](e,t){e.mediaIsFullscreen.get(t)&&e.mediaIsFullscreen.set(!1,t),e.mediaIsPip.set(!0,t)},[b.MEDIA_EXIT_PIP_REQUEST](e,t){e.mediaIsPip.set(!1,t)},[b.MEDIA_ENTER_FULLSCREEN_REQUEST](e,t,n){e.mediaIsPip.get(t)&&e.mediaIsPip.set(!1,t),e.mediaIsFullscreen.set(!0,t,n)},[b.MEDIA_EXIT_FULLSCREEN_REQUEST](e,t){e.mediaIsFullscreen.set(!1,t)},[b.MEDIA_ENTER_CAST_REQUEST](e,t){e.mediaIsFullscreen.get(t)&&e.mediaIsFullscreen.set(!1,t),e.mediaIsCasting.set(!0,t)},[b.MEDIA_EXIT_CAST_REQUEST](e,t){e.mediaIsCasting.set(!1,t)},[b.MEDIA_AIRPLAY_REQUEST](e,t){e.mediaIsAirplaying.set(!0,t)}},ur=({media:e,fullscreenElement:t,documentElement:n,stateMediator:r=cr,requestMap:i=lr,options:a={},monitorStateOwnersOnlyWithSubscriptions:o=!0})=>{let s=[],c={options:{...a}},l=Object.freeze({mediaPreviewTime:void 0,mediaPreviewImage:void 0,mediaPreviewCoords:void 0,mediaPreviewChapter:void 0}),u=e=>{e!=null&&(er(e,l)||(l=Object.freeze({...l,...e}),s.forEach(e=>e(l))))},d=()=>{let e=Object.entries(r).reduce((e,[t,{get:n}])=>(e[t]=n(c),e),{});u(e)},f={},p,m=async(e,t)=>{let n=!!p;if(p={...c,...p??{},...e},n)return;await ar(...Object.values(e));let i=s.length>0&&t===0&&o,a=c.media!==p.media,l=c.media?.textTracks!==p.media?.textTracks,m=c.media?.videoRenditions!==p.media?.videoRenditions,h=c.media?.audioTracks!==p.media?.audioTracks,ee=c.media?.remote!==p.media?.remote,g=c.documentElement!==p.documentElement,te=!!c.media&&(a||i),_=!!c.media?.textTracks&&(l||i),ne=!!c.media?.videoRenditions&&(m||i),re=!!c.media?.audioTracks&&(h||i),ie=!!c.media?.remote&&(ee||i),ae=!!c.documentElement&&(g||i),oe=te||_||ne||re||ie||ae,se=s.length===0&&t===1&&o,ce=!!p.media&&(a||se),le=!!p.media?.textTracks&&(l||se),ue=!!p.media?.videoRenditions&&(m||se),de=!!p.media?.audioTracks&&(h||se),fe=!!p.media?.remote&&(ee||se),pe=!!p.documentElement&&(g||se),me=ce||le||ue||de||fe||pe;oe||me?(Object.entries(r).forEach(([e,{get:t,mediaEvents:n=[],textTracksEvents:r=[],videoRenditionsEvents:i=[],audioTracksEvents:a=[],remoteEvents:o=[],rootEvents:s=[],stateOwnersUpdateHandlers:l=[]}])=>{f[e]||(f[e]={});let d=n=>{let r=t(c,n);u({[e]:r})},m;m=f[e].mediaEvents,n.forEach(t=>{m&&te&&(c.media.removeEventListener(t,m),f[e].mediaEvents=void 0),ce&&(p.media.addEventListener(t,d),f[e].mediaEvents=d)}),m=f[e].textTracksEvents,r.forEach(t=>{var n,r;m&&_&&((n=c.media.textTracks)==null||n.removeEventListener(t,m),f[e].textTracksEvents=void 0),le&&((r=p.media.textTracks)==null||r.addEventListener(t,d),f[e].textTracksEvents=d)}),m=f[e].videoRenditionsEvents,i.forEach(t=>{var n,r;m&&ne&&((n=c.media.videoRenditions)==null||n.removeEventListener(t,m),f[e].videoRenditionsEvents=void 0),ue&&((r=p.media.videoRenditions)==null||r.addEventListener(t,d),f[e].videoRenditionsEvents=d)}),m=f[e].audioTracksEvents,a.forEach(t=>{var n,r;m&&re&&((n=c.media.audioTracks)==null||n.removeEventListener(t,m),f[e].audioTracksEvents=void 0),de&&((r=p.media.audioTracks)==null||r.addEventListener(t,d),f[e].audioTracksEvents=d)}),m=f[e].remoteEvents,o.forEach(t=>{var n,r;m&&ie&&((n=c.media.remote)==null||n.removeEventListener(t,m),f[e].remoteEvents=void 0),fe&&((r=p.media.remote)==null||r.addEventListener(t,d),f[e].remoteEvents=d)}),m=f[e].rootEvents,s.forEach(t=>{m&&ae&&(c.documentElement.removeEventListener(t,m),f[e].rootEvents=void 0),pe&&(p.documentElement.addEventListener(t,d),f[e].rootEvents=d)});let h=f[e].stateOwnersUpdateHandlers;if(h&&oe&&(Array.isArray(h)?h:[h]).forEach(e=>{typeof e==`function`&&e()}),me){let t=l.map(e=>e(d,p)).filter(e=>typeof e==`function`);f[e].stateOwnersUpdateHandlers=t.length===1?t[0]:t}else oe&&(f[e].stateOwnersUpdateHandlers=void 0)}),Object.entries(p).forEach(([e,t])=>{c[e]=t}),d(),p=void 0):(Object.entries(p).forEach(([e,t])=>{c[e]=t}),d(),p=void 0)};return m({media:e,fullscreenElement:t,documentElement:n,options:a}),{dispatch(e){let{type:t,detail:n}=e;i[t]&&l.mediaErrorCode==null?u(i[t](r,c,e)):t===`mediaelementchangerequest`?m({media:n}):t===`fullscreenelementchangerequest`?m({fullscreenElement:n}):t===`documentelementchangerequest`?m({documentElement:n}):t===`optionschangerequest`&&(Object.entries(n??{}).forEach(([e,t])=>{c.options[e]=t}),d())},getState(){return l},subscribe(e){return m({},s.length+1),s.push(e),e(l),()=>{let t=s.indexOf(e);t>=0&&(m({},s.length-1),s.splice(t,1))}}}},dr=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},V=(e,t,n)=>(dr(e,t,`read from private field`),n?n.call(e):t.get(e)),fr=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},pr=(e,t,n,r)=>(dr(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),mr=(e,t,n)=>(dr(e,t,`access private method`),n),hr,gr,H,_r,vr,yr,br,xr,Sr,Cr,wr,Tr,Er,Dr,Or,kr=[`ArrowLeft`,`ArrowRight`,`ArrowUp`,`ArrowDown`,`Enter`,` `,`f`,`m`,`k`,`c`,`l`,`j`,`>`,`<`,`p`],Ar=10,jr=.025,Mr=.25,Nr=.25,Pr=2,U={DEFAULT_SUBTITLES:`defaultsubtitles`,DEFAULT_STREAM_TYPE:`defaultstreamtype`,DEFAULT_DURATION:`defaultduration`,FULLSCREEN_ELEMENT:`fullscreenelement`,HOTKEYS:`hotkeys`,KEYBOARD_BACKWARD_SEEK_OFFSET:`keyboardbackwardseekoffset`,KEYBOARD_FORWARD_SEEK_OFFSET:`keyboardforwardseekoffset`,KEYBOARD_DOWN_VOLUME_STEP:`keyboarddownvolumestep`,KEYBOARD_UP_VOLUME_STEP:`keyboardupvolumestep`,KEYS_USED:`keysused`,LANG:`lang`,LOOP:`loop`,LIVE_EDGE_OFFSET:`liveedgeoffset`,NO_AUTO_SEEK_TO_LIVE:`noautoseektolive`,NO_DEFAULT_STORE:`nodefaultstore`,NO_HOTKEYS:`nohotkeys`,NO_MUTED_PREF:`nomutedpref`,NO_SUBTITLES_LANG_PREF:`nosubtitleslangpref`,NO_VOLUME_PREF:`novolumepref`,SEEK_TO_LIVE_OFFSET:`seektoliveoffset`},Fr=class extends cn{constructor(){super(),fr(this,Sr),fr(this,Tr),fr(this,Dr),this.mediaStateReceivers=[],this.associatedElementSubscriptions=new Map,fr(this,hr,new yn(this,U.HOTKEYS)),fr(this,gr,void 0),fr(this,H,void 0),fr(this,_r,null),fr(this,vr,void 0),fr(this,yr,void 0),fr(this,br,e=>{var t;(t=V(this,H))==null||t.dispatch(e)}),fr(this,xr,void 0),fr(this,wr,e=>{let{key:t,shiftKey:n}=e;n&&(t===`/`||t===`?`)||kr.includes(t)?this.keyboardShortcutHandler(e):this.removeEventListener(`keyup`,V(this,wr))}),this.associateElement(this);let e={};pr(this,vr,t=>{Object.entries(t).forEach(([t,n])=>{if(t in e&&e[t]===n)return;this.propagateMediaState(t,n);let r=t.toLowerCase(),i=new D.CustomEvent(je[r],{composed:!0,detail:n});this.dispatchEvent(i)}),e=t})}static get observedAttributes(){return super.observedAttributes.concat(U.NO_HOTKEYS,U.HOTKEYS,U.DEFAULT_STREAM_TYPE,U.DEFAULT_SUBTITLES,U.DEFAULT_DURATION,U.NO_MUTED_PREF,U.NO_VOLUME_PREF,U.LANG,U.LOOP,U.LIVE_EDGE_OFFSET,U.SEEK_TO_LIVE_OFFSET,U.NO_AUTO_SEEK_TO_LIVE)}get mediaStore(){return V(this,H)}set mediaStore(e){var t;V(this,H)&&((t=V(this,yr))==null||t.call(this),pr(this,yr,void 0)),pr(this,H,e),!V(this,H)&&!this.hasAttribute(U.NO_DEFAULT_STORE)?mr(this,Sr,Cr).call(this):pr(this,yr,V(this,H)?.subscribe(V(this,vr)))}get fullscreenElement(){return V(this,gr)??this}set fullscreenElement(e){var t;this.hasAttribute(U.FULLSCREEN_ELEMENT)&&this.removeAttribute(U.FULLSCREEN_ELEMENT),pr(this,gr,e),(t=V(this,H))==null||t.dispatch({type:`fullscreenelementchangerequest`,detail:this.fullscreenElement})}get defaultSubtitles(){return M(this,U.DEFAULT_SUBTITLES)}set defaultSubtitles(e){N(this,U.DEFAULT_SUBTITLES,e)}get defaultStreamType(){return P(this,U.DEFAULT_STREAM_TYPE)}set defaultStreamType(e){F(this,U.DEFAULT_STREAM_TYPE,e)}get defaultDuration(){return A(this,U.DEFAULT_DURATION)}set defaultDuration(e){j(this,U.DEFAULT_DURATION,e)}get noHotkeys(){return M(this,U.NO_HOTKEYS)}set noHotkeys(e){N(this,U.NO_HOTKEYS,e)}get keysUsed(){return P(this,U.KEYS_USED)}set keysUsed(e){F(this,U.KEYS_USED,e)}get liveEdgeOffset(){return A(this,U.LIVE_EDGE_OFFSET)}set liveEdgeOffset(e){j(this,U.LIVE_EDGE_OFFSET,e)}get noAutoSeekToLive(){return M(this,U.NO_AUTO_SEEK_TO_LIVE)}set noAutoSeekToLive(e){N(this,U.NO_AUTO_SEEK_TO_LIVE,e)}get noVolumePref(){return M(this,U.NO_VOLUME_PREF)}set noVolumePref(e){N(this,U.NO_VOLUME_PREF,e)}get noMutedPref(){return M(this,U.NO_MUTED_PREF)}set noMutedPref(e){N(this,U.NO_MUTED_PREF,e)}get noSubtitlesLangPref(){return M(this,U.NO_SUBTITLES_LANG_PREF)}set noSubtitlesLangPref(e){N(this,U.NO_SUBTITLES_LANG_PREF,e)}get noDefaultStore(){return M(this,U.NO_DEFAULT_STORE)}set noDefaultStore(e){N(this,U.NO_DEFAULT_STORE,e)}get resolvedLang(){return Ke()}attributeChangedCallback(e,t,n){var r,i,a,o,s,c,l,u,d,f;if(super.attributeChangedCallback(e,t,n),e===U.NO_HOTKEYS)n!==t&&n===``?(this.hasAttribute(U.HOTKEYS)&&console.warn("Media Chrome: Both `hotkeys` and `nohotkeys` have been set. All hotkeys will be disabled."),this.disableHotkeys()):n!==t&&n===null&&this.enableHotkeys();else if(e===U.HOTKEYS)V(this,hr).value=n;else if(e===U.DEFAULT_SUBTITLES&&n!==t)(r=V(this,H))==null||r.dispatch({type:`optionschangerequest`,detail:{defaultSubtitles:this.hasAttribute(U.DEFAULT_SUBTITLES)}});else if(e===U.DEFAULT_STREAM_TYPE)(i=V(this,H))==null||i.dispatch({type:`optionschangerequest`,detail:{defaultStreamType:this.getAttribute(U.DEFAULT_STREAM_TYPE)??void 0}});else if(e===U.LIVE_EDGE_OFFSET&&n!==t)(a=V(this,H))==null||a.dispatch({type:`optionschangerequest`,detail:{liveEdgeOffset:this.hasAttribute(U.LIVE_EDGE_OFFSET)?+this.getAttribute(U.LIVE_EDGE_OFFSET):void 0,seekToLiveOffset:this.hasAttribute(U.SEEK_TO_LIVE_OFFSET)?+this.getAttribute(U.SEEK_TO_LIVE_OFFSET):this.hasAttribute(U.LIVE_EDGE_OFFSET)?+this.getAttribute(U.LIVE_EDGE_OFFSET):void 0}});else if(e===U.SEEK_TO_LIVE_OFFSET&&n!==t)(o=V(this,H))==null||o.dispatch({type:`optionschangerequest`,detail:{seekToLiveOffset:this.hasAttribute(U.SEEK_TO_LIVE_OFFSET)?+this.getAttribute(U.SEEK_TO_LIVE_OFFSET):this.hasAttribute(U.LIVE_EDGE_OFFSET)?+this.getAttribute(U.LIVE_EDGE_OFFSET):void 0}});else if(e===U.NO_AUTO_SEEK_TO_LIVE)(s=V(this,H))==null||s.dispatch({type:`optionschangerequest`,detail:{noAutoSeekToLive:this.hasAttribute(U.NO_AUTO_SEEK_TO_LIVE)}});else if(e===U.FULLSCREEN_ELEMENT){let e=n?this.getRootNode()?.getElementById(n):void 0;pr(this,gr,e),(c=V(this,H))==null||c.dispatch({type:`fullscreenelementchangerequest`,detail:this.fullscreenElement})}else e===U.LANG&&n!==t?(We(n),(l=V(this,H))==null||l.dispatch({type:`optionschangerequest`,detail:{mediaLang:n}})):e===U.LOOP&&n!==t?(u=V(this,H))==null||u.dispatch({type:b.MEDIA_LOOP_REQUEST,detail:n!=null}):e===U.NO_VOLUME_PREF&&n!==t?(d=V(this,H))==null||d.dispatch({type:`optionschangerequest`,detail:{noVolumePref:this.hasAttribute(U.NO_VOLUME_PREF)}}):e===U.NO_MUTED_PREF&&n!==t&&((f=V(this,H))==null||f.dispatch({type:`optionschangerequest`,detail:{noMutedPref:this.hasAttribute(U.NO_MUTED_PREF)}}))}connectedCallback(){var e,t;this.associateElement(this),!V(this,H)&&!this.hasAttribute(U.NO_DEFAULT_STORE)&&mr(this,Sr,Cr).call(this),(e=V(this,H))==null||e.dispatch({type:`documentelementchangerequest`,detail:O}),(t=V(this,H))==null||t.dispatch({type:`fullscreenelementchangerequest`,detail:this.fullscreenElement}),super.connectedCallback(),V(this,H)&&!V(this,yr)&&pr(this,yr,V(this,H)?.subscribe(V(this,vr))),V(this,xr)!==void 0&&V(this,H)&&this.media&&setTimeout(()=>{var e;this.media?.textTracks?.length&&((e=V(this,H))==null||e.dispatch({type:b.MEDIA_TOGGLE_SUBTITLES_REQUEST,detail:V(this,xr)}))},0),this.hasAttribute(U.NO_HOTKEYS)?this.disableHotkeys():this.enableHotkeys()}disconnectedCallback(){var e,t,n,r,i;if((e=super.disconnectedCallback)==null||e.call(this),this.disableHotkeys(),V(this,H)){let e=V(this,H).getState();pr(this,xr,!!e.mediaSubtitlesShowing?.length),(t=V(this,H))==null||t.dispatch({type:`fullscreenelementchangerequest`,detail:void 0}),(n=V(this,H))==null||n.dispatch({type:`documentelementchangerequest`,detail:void 0}),(r=V(this,H))==null||r.dispatch({type:b.MEDIA_TOGGLE_SUBTITLES_REQUEST,detail:!1})}V(this,yr)&&((i=V(this,yr))==null||i.call(this),pr(this,yr,void 0)),this.unassociateElement(this),V(this,_r)&&(V(this,_r).remove(),pr(this,_r,null))}mediaSetCallback(e){var t;super.mediaSetCallback(e),(t=V(this,H))==null||t.dispatch({type:`mediaelementchangerequest`,detail:e}),e.hasAttribute(`tabindex`)||(e.tabIndex=-1)}mediaUnsetCallback(e){var t;super.mediaUnsetCallback(e),(t=V(this,H))==null||t.dispatch({type:`mediaelementchangerequest`,detail:void 0})}propagateMediaState(e,t){Kr(this.mediaStateReceivers,e,t)}associateElement(e){if(!e)return;let{associatedElementSubscriptions:t}=this;if(t.has(e))return;let n=qr(e,this.registerMediaStateReceiver.bind(this),this.unregisterMediaStateReceiver.bind(this));Object.values(b).forEach(t=>{e.addEventListener(t,V(this,br))}),t.set(e,n)}unassociateElement(e){if(!e)return;let{associatedElementSubscriptions:t}=this;t.has(e)&&(t.get(e)(),t.delete(e),Object.values(b).forEach(t=>{e.removeEventListener(t,V(this,br))}))}registerMediaStateReceiver(e){if(!e)return;let t=this.mediaStateReceivers;t.indexOf(e)>-1||(t.push(e),V(this,H)&&Object.entries(V(this,H).getState()).forEach(([t,n])=>{Kr([e],t,n)}))}unregisterMediaStateReceiver(e){let t=this.mediaStateReceivers,n=t.indexOf(e);n<0||t.splice(n,1)}enableHotkeys(){this.addEventListener(`keydown`,mr(this,Tr,Er))}disableHotkeys(){this.removeEventListener(`keydown`,mr(this,Tr,Er)),this.removeEventListener(`keyup`,V(this,wr))}get hotkeys(){return V(this,hr)}set hotkeys(e){F(this,U.HOTKEYS,e)}keyboardShortcutHandler(e){let t=e.target;if((t.getAttribute(U.KEYS_USED)?.split(` `)??t?.keysUsed??[]).map(e=>e===`Space`?` `:e).filter(Boolean).includes(e.key))return;let n,r,i;if(!V(this,hr).contains(`no${e.key.toLowerCase()}`)&&!(e.key===` `&&V(this,hr).contains(`nospace`))&&(!e.shiftKey||e.key!==`/`&&e.key!==`?`||!V(this,hr).contains(`noshift+/`)))switch(e.key){case` `:case`k`:n=V(this,H).getState().mediaPaused?b.MEDIA_PLAY_REQUEST:b.MEDIA_PAUSE_REQUEST,this.dispatchEvent(new D.CustomEvent(n,{composed:!0,bubbles:!0}));break;case`m`:n=this.mediaStore.getState().mediaVolumeLevel===`off`?b.MEDIA_UNMUTE_REQUEST:b.MEDIA_MUTE_REQUEST,this.dispatchEvent(new D.CustomEvent(n,{composed:!0,bubbles:!0}));break;case`f`:n=this.mediaStore.getState().mediaIsFullscreen?b.MEDIA_EXIT_FULLSCREEN_REQUEST:b.MEDIA_ENTER_FULLSCREEN_REQUEST,this.dispatchEvent(new D.CustomEvent(n,{composed:!0,bubbles:!0}));break;case`c`:this.dispatchEvent(new D.CustomEvent(b.MEDIA_TOGGLE_SUBTITLES_REQUEST,{composed:!0,bubbles:!0}));break;case`ArrowLeft`:case`j`:{let e=this.hasAttribute(U.KEYBOARD_BACKWARD_SEEK_OFFSET)?+this.getAttribute(U.KEYBOARD_BACKWARD_SEEK_OFFSET):Ar;r=Math.max((this.mediaStore.getState().mediaCurrentTime??0)-e,0),i=new D.CustomEvent(b.MEDIA_SEEK_REQUEST,{composed:!0,bubbles:!0,detail:r}),this.dispatchEvent(i);break}case`ArrowRight`:case`l`:{let e=this.hasAttribute(U.KEYBOARD_FORWARD_SEEK_OFFSET)?+this.getAttribute(U.KEYBOARD_FORWARD_SEEK_OFFSET):Ar;r=Math.max((this.mediaStore.getState().mediaCurrentTime??0)+e,0),i=new D.CustomEvent(b.MEDIA_SEEK_REQUEST,{composed:!0,bubbles:!0,detail:r}),this.dispatchEvent(i);break}case`ArrowUp`:{let e=this.hasAttribute(U.KEYBOARD_UP_VOLUME_STEP)?+this.getAttribute(U.KEYBOARD_UP_VOLUME_STEP):jr;r=Math.min((this.mediaStore.getState().mediaVolume??1)+e,1),i=new D.CustomEvent(b.MEDIA_VOLUME_REQUEST,{composed:!0,bubbles:!0,detail:r}),this.dispatchEvent(i);break}case`ArrowDown`:{let e=this.hasAttribute(U.KEYBOARD_DOWN_VOLUME_STEP)?+this.getAttribute(U.KEYBOARD_DOWN_VOLUME_STEP):jr;r=Math.max((this.mediaStore.getState().mediaVolume??1)-e,0),i=new D.CustomEvent(b.MEDIA_VOLUME_REQUEST,{composed:!0,bubbles:!0,detail:r}),this.dispatchEvent(i);break}case`<`:{let e=this.mediaStore.getState().mediaPlaybackRate??1;r=Math.max(e-Mr,Nr).toFixed(2),i=new D.CustomEvent(b.MEDIA_PLAYBACK_RATE_REQUEST,{composed:!0,bubbles:!0,detail:r}),this.dispatchEvent(i);break}case`>`:{let e=this.mediaStore.getState().mediaPlaybackRate??1;r=Math.min(e+Mr,Pr).toFixed(2),i=new D.CustomEvent(b.MEDIA_PLAYBACK_RATE_REQUEST,{composed:!0,bubbles:!0,detail:r}),this.dispatchEvent(i);break}case`/`:case`?`:e.shiftKey&&mr(this,Dr,Or).call(this);break;case`p`:n=this.mediaStore.getState().mediaIsPip?b.MEDIA_EXIT_PIP_REQUEST:b.MEDIA_ENTER_PIP_REQUEST,i=new D.CustomEvent(n,{composed:!0,bubbles:!0}),this.dispatchEvent(i)}}};hr=new WeakMap,gr=new WeakMap,H=new WeakMap,_r=new WeakMap,vr=new WeakMap,yr=new WeakMap,br=new WeakMap,xr=new WeakMap,Sr=new WeakSet,Cr=function(){this.mediaStore=ur({media:this.media,fullscreenElement:this.fullscreenElement,options:{defaultSubtitles:this.hasAttribute(U.DEFAULT_SUBTITLES),defaultDuration:this.hasAttribute(U.DEFAULT_DURATION)?+this.getAttribute(U.DEFAULT_DURATION):void 0,defaultStreamType:this.getAttribute(U.DEFAULT_STREAM_TYPE)??void 0,liveEdgeOffset:this.hasAttribute(U.LIVE_EDGE_OFFSET)?+this.getAttribute(U.LIVE_EDGE_OFFSET):void 0,seekToLiveOffset:this.hasAttribute(U.SEEK_TO_LIVE_OFFSET)?+this.getAttribute(U.SEEK_TO_LIVE_OFFSET):this.hasAttribute(U.LIVE_EDGE_OFFSET)?+this.getAttribute(U.LIVE_EDGE_OFFSET):void 0,noAutoSeekToLive:this.hasAttribute(U.NO_AUTO_SEEK_TO_LIVE),noVolumePref:this.hasAttribute(U.NO_VOLUME_PREF),noMutedPref:this.hasAttribute(U.NO_MUTED_PREF),noSubtitlesLangPref:this.hasAttribute(U.NO_SUBTITLES_LANG_PREF)}})},wr=new WeakMap,Tr=new WeakSet,Er=function(e){let{metaKey:t,altKey:n,key:r,shiftKey:i}=e,a=i&&(r===`/`||r===`?`);if(a&&V(this,_r)?.open||t||n||!a&&!kr.includes(r)){this.removeEventListener(`keyup`,V(this,wr));return}let o=e.target,s=o instanceof HTMLElement&&(o.tagName.toLowerCase()===`media-volume-range`||o.tagName.toLowerCase()===`media-time-range`);[` `,`ArrowLeft`,`ArrowRight`,`ArrowUp`,`ArrowDown`].includes(r)&&!(V(this,hr).contains(`no${r.toLowerCase()}`)||r===` `&&V(this,hr).contains(`nospace`))&&!s&&e.preventDefault(),this.addEventListener(`keyup`,V(this,wr),{once:!0})},Dr=new WeakSet,Or=function(){V(this,_r)||(pr(this,_r,O.createElement(`media-keyboard-shortcuts-dialog`)),this.appendChild(V(this,_r))),V(this,_r).open=!0};var Ir=Object.values(S),Lr=Object.values(Oe),Rr=e=>{var t;let{observedAttributes:n}=e.constructor;!n&&e.nodeName?.includes(`-`)&&(D.customElements.upgrade(e),{observedAttributes:n}=e.constructor);let r=((t=(e?.getAttribute)?.call(e,x.MEDIA_CHROME_ATTRIBUTES))?.split)?.call(t,/\s+/);return Array.isArray(n||r)?(n||r).filter(e=>Ir.includes(e)):[]},zr=e=>(e.nodeName?.includes(`-`)&&D.customElements.get(e.nodeName?.toLowerCase())&&!(e instanceof D.customElements.get(e.nodeName.toLowerCase()))&&D.customElements.upgrade(e),Lr.some(t=>t in e)),Br=e=>zr(e)||!!Rr(e).length,Vr=e=>(e?.join)?.call(e,`:`),Hr={[S.MEDIA_SUBTITLES_LIST]:Tn,[S.MEDIA_SUBTITLES_SHOWING]:Tn,[S.MEDIA_SEEKABLE]:Vr,[S.MEDIA_BUFFERED]:e=>e?.map(Vr).join(` `),[S.MEDIA_PREVIEW_COORDS]:e=>e?.join(` `),[S.MEDIA_RENDITION_LIST]:Ie,[S.MEDIA_AUDIO_TRACK_LIST]:Re},Ur=async(e,t,n)=>{if(e.isConnected||await Ve(0),typeof n==`boolean`||n==null)return N(e,t,n);if(typeof n==`number`)return j(e,t,n);if(typeof n==`string`)return F(e,t,n);if(Array.isArray(n)&&!n.length)return e.removeAttribute(t);let r=Hr[t]?.call(Hr,n)??n;return e.setAttribute(t,r)},Wr=e=>!!e.closest?.call(e,`*[slot="media"]`),Gr=(e,t)=>{if(Wr(e))return;let n=(e,t)=>{Br(e)&&t(e);let{children:n=[]}=e??{},r=e?.shadowRoot?.children??[];[...n,...r].forEach(e=>Gr(e,t))},r=e?.nodeName.toLowerCase();r.includes(`-`)&&!Br(e)?D.customElements.whenDefined(r).then(()=>{n(e,t)}):n(e,t)},Kr=(e,t,n)=>{e.forEach(e=>{if(t in e){e[t]=n;return}let r=Rr(e),i=t.toLowerCase();r.includes(i)&&Ur(e,i,n)})},qr=(e,t,n)=>{Gr(e,t);let r=e=>{t(e?.composedPath()[0]??e.target)},i=e=>{n(e?.composedPath()[0]??e.target)};e.addEventListener(b.REGISTER_MEDIA_STATE_RECEIVER,r),e.addEventListener(b.UNREGISTER_MEDIA_STATE_RECEIVER,i);let a=e=>{e.forEach(e=>{let{addedNodes:r=[],removedNodes:i=[],type:a,target:o,attributeName:s}=e;a===`childList`?(Array.prototype.forEach.call(r,e=>Gr(e,t)),Array.prototype.forEach.call(i,e=>Gr(e,n))):a===`attributes`&&s===x.MEDIA_CHROME_ATTRIBUTES&&(Br(o)?t(o):n(o))})},o=[],s=e=>{let r=e.target;r.name!==`media`&&(o.forEach(e=>Gr(e,n)),o=[...r.assignedElements({flatten:!0})],o.forEach(e=>Gr(e,t)))};e.addEventListener(`slotchange`,s);let c=new MutationObserver(a);return c.observe(e,{childList:!0,attributes:!0,subtree:!0}),()=>{Gr(e,n),e.removeEventListener(`slotchange`,s),c.disconnect(),e.removeEventListener(b.REGISTER_MEDIA_STATE_RECEIVER,r),e.removeEventListener(b.UNREGISTER_MEDIA_STATE_RECEIVER,i)}};D.customElements.get(`media-controller`)||D.customElements.define(`media-controller`,Fr);var Jr=Fr,Yr={PLACEMENT:`placement`,BOUNDS:`bounds`};function Xr(e){return`
    <style>
      :host {
        --_tooltip-background-color: var(--media-tooltip-background-color, var(--media-secondary-color, rgba(20, 20, 30, .7)));
        --_tooltip-background: var(--media-tooltip-background, var(--_tooltip-background-color));
        --_tooltip-arrow-half-width: calc(var(--media-tooltip-arrow-width, 12px) / 2);
        --_tooltip-arrow-height: var(--media-tooltip-arrow-height, 5px);
        --_tooltip-arrow-background: var(--media-tooltip-arrow-color, var(--_tooltip-background-color));
        position: relative;
        pointer-events: none;
        display: var(--media-tooltip-display, inline-flex);
        justify-content: center;
        align-items: center;
        box-sizing: border-box;
        z-index: var(--media-tooltip-z-index, 1);
        background: var(--_tooltip-background);
        color: var(--media-text-color, var(--media-primary-color, rgb(238 238 238)));
        font: var(--media-font,
          var(--media-font-weight, 400)
          var(--media-font-size, 13px) /
          var(--media-text-content-height, var(--media-control-height, 18px))
          var(--media-font-family, helvetica neue, segoe ui, roboto, arial, sans-serif));
        padding: var(--media-tooltip-padding, .35em .7em);
        border: var(--media-tooltip-border, none);
        border-radius: var(--media-tooltip-border-radius, 5px);
        filter: var(--media-tooltip-filter, drop-shadow(0 0 4px rgba(0, 0, 0, .2)));
        white-space: var(--media-tooltip-white-space, nowrap);
      }

      :host([hidden]) {
        display: none;
      }

      img, svg {
        display: inline-block;
      }

      #arrow {
        position: absolute;
        width: 0px;
        height: 0px;
        border-style: solid;
        display: var(--media-tooltip-arrow-display, block);
      }

      :host(:not([placement])),
      :host([placement="top"]) {
        position: absolute;
        bottom: calc(100% + var(--media-tooltip-distance, 12px));
        left: 50%;
        transform: translate(calc(-50% - var(--media-tooltip-offset-x, 0px)), 0);
      }
      :host(:not([placement])) #arrow,
      :host([placement="top"]) #arrow {
        top: 100%;
        left: 50%;
        border-width: var(--_tooltip-arrow-height) var(--_tooltip-arrow-half-width) 0 var(--_tooltip-arrow-half-width);
        border-color: var(--_tooltip-arrow-background) transparent transparent transparent;
        transform: translate(calc(-50% + var(--media-tooltip-offset-x, 0px)), 0);
      }

      :host([placement="right"]) {
        position: absolute;
        left: calc(100% + var(--media-tooltip-distance, 12px));
        top: 50%;
        transform: translate(0, -50%);
      }
      :host([placement="right"]) #arrow {
        top: 50%;
        right: 100%;
        border-width: var(--_tooltip-arrow-half-width) var(--_tooltip-arrow-height) var(--_tooltip-arrow-half-width) 0;
        border-color: transparent var(--_tooltip-arrow-background) transparent transparent;
        transform: translate(0, -50%);
      }

      :host([placement="bottom"]) {
        position: absolute;
        top: calc(100% + var(--media-tooltip-distance, 12px));
        left: 50%;
        transform: translate(calc(-50% - var(--media-tooltip-offset-x, 0px)), 0);
      }
      :host([placement="bottom"]) #arrow {
        bottom: 100%;
        left: 50%;
        border-width: 0 var(--_tooltip-arrow-half-width) var(--_tooltip-arrow-height) var(--_tooltip-arrow-half-width);
        border-color: transparent transparent var(--_tooltip-arrow-background) transparent;
        transform: translate(calc(-50% + var(--media-tooltip-offset-x, 0px)), 0);
      }

      :host([placement="left"]) {
        position: absolute;
        right: calc(100% + var(--media-tooltip-distance, 12px));
        top: 50%;
        transform: translate(0, -50%);
      }
      :host([placement="left"]) #arrow {
        top: 50%;
        left: 100%;
        border-width: var(--_tooltip-arrow-half-width) 0 var(--_tooltip-arrow-half-width) var(--_tooltip-arrow-height);
        border-color: transparent transparent transparent var(--_tooltip-arrow-background);
        transform: translate(0, -50%);
      }
      
      :host([placement="none"]) #arrow {
        display: none;
      }
    </style>
    <slot></slot>
    <div id="arrow"></div>
  `}var Zr=class extends D.HTMLElement{constructor(){if(super(),this.updateXOffset=()=>{if(!yt(this,{checkOpacity:!1,checkVisibilityCSS:!1}))return;let e=this.placement;if(e===`left`||e===`right`){this.style.removeProperty(`--media-tooltip-offset-x`);return}let t=getComputedStyle(this),n=gt(this,`#`+this.bounds)??ut(this);if(!n)return;let{x:r,width:i}=n.getBoundingClientRect(),{x:a,width:o}=this.getBoundingClientRect(),s=a+o,c=r+i,l=t.getPropertyValue(`--media-tooltip-offset-x`),u=l?parseFloat(l.replace(`px`,``)):0,d=t.getPropertyValue(`--media-tooltip-container-margin`),f=d?parseFloat(d.replace(`px`,``)):0,p=a-r+u-f,m=s-c+u+f;p<0?this.style.setProperty(`--media-tooltip-offset-x`,`${p}px`):m>0?this.style.setProperty(`--media-tooltip-offset-x`,`${m}px`):this.style.removeProperty(`--media-tooltip-offset-x`)},!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);let e=lt(this.attributes);this.shadowRoot.innerHTML=this.constructor.getTemplateHTML(e)}if(this.arrowEl=this.shadowRoot.querySelector(`#arrow`),Object.prototype.hasOwnProperty.call(this,`placement`)){let e=this.placement;delete this.placement,this.placement=e}}static get observedAttributes(){return[Yr.PLACEMENT,Yr.BOUNDS]}get placement(){return P(this,Yr.PLACEMENT)}set placement(e){F(this,Yr.PLACEMENT,e)}get bounds(){return P(this,Yr.BOUNDS)}set bounds(e){F(this,Yr.BOUNDS,e)}};Zr.shadowRootOptions={mode:`open`},Zr.getTemplateHTML=Xr,D.customElements.get(`media-tooltip`)||D.customElements.define(`media-tooltip`,Zr);var Qr=Zr,$r=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},W=(e,t,n)=>($r(e,t,`read from private field`),n?n.call(e):t.get(e)),ei=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},ti=(e,t,n,r)=>($r(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),ni=(e,t,n)=>($r(e,t,`access private method`),n),ri,ii,ai,oi,si,ci,li,ui={TOOLTIP_PLACEMENT:`tooltipplacement`,DISABLED:`disabled`,NO_TOOLTIP:`notooltip`};function di(e,t={}){return`
    <style>
      :host {
        position: relative;
        font: var(--media-font,
          var(--media-font-weight, bold)
          var(--media-font-size, 14px) /
          var(--media-text-content-height, var(--media-control-height, 24px))
          var(--media-font-family, helvetica neue, segoe ui, roboto, arial, sans-serif));
        color: var(--media-text-color, var(--media-primary-color, rgb(238 238 238)));
        background: var(--media-control-background, var(--media-secondary-color, rgb(20 20 30 / .7)));
        padding: var(--media-button-padding, var(--media-control-padding, 10px));
        justify-content: var(--media-button-justify-content, center);
        display: inline-flex;
        align-items: center;
        vertical-align: middle;
        box-sizing: border-box;
        transition: background .15s linear;
        pointer-events: auto;
        cursor: var(--media-cursor, pointer);
        -webkit-tap-highlight-color: transparent;
      }

      
      :host(:focus-visible) {
        box-shadow: var(--media-focus-box-shadow, inset 0 0 0 2px rgb(27 127 204 / .9));
        outline: 0;
      }
      
      :host(:where(:focus)) {
        box-shadow: none;
        outline: 0;
      }

      :host(:hover) {
        background: var(--media-control-hover-background, rgba(50 50 70 / .7));
      }

      slot[name="icon"] {
        display: inline-flex;
        align-items: center;
      }

      svg, img, ::slotted(svg), ::slotted(img) {
        width: var(--media-button-icon-width);
        height: var(--media-button-icon-height, var(--media-control-height, 24px));
        transform: var(--media-button-icon-transform);
        transition: var(--media-button-icon-transition);
        fill: var(--media-icon-color, var(--media-primary-color, rgb(238 238 238)));
        vertical-align: middle;
        max-width: 100%;
        max-height: 100%;
        min-width: 100%;
      }

      media-tooltip {
        
        max-width: 0;
        overflow-x: clip;
        opacity: 0;
        transition: opacity .3s, max-width 0s 9s;
      }

      :host(:hover) media-tooltip,
      :host(:focus-visible) media-tooltip {
        max-width: 100vw;
        opacity: 1;
        transition: opacity .3s;
      }

      :host([notooltip]) slot[name="tooltip"] {
        display: none;
      }
    </style>

    ${this.getSlotTemplateHTML(e,t)}

    <slot name="tooltip">
      <media-tooltip part="tooltip" aria-hidden="true">
        <template shadowrootmode="${Qr.shadowRootOptions.mode}">
          ${Qr.getTemplateHTML({})}
        </template>
        <slot name="tooltip-content">
          ${this.getTooltipContentHTML(e)}
        </slot>
      </media-tooltip>
    </slot>
  `}function fi(e,t){return`
    <slot></slot>
  `}function pi(){return``}var G=class extends D.HTMLElement{constructor(){if(super(),ei(this,ci),ei(this,ri,void 0),this.preventClick=!1,this.tooltipEl=null,ei(this,ii,e=>{this.preventClick||this.handleClick(e),setTimeout(W(this,ai),0)}),ei(this,ai,()=>{var e,t;(t=(e=this.tooltipEl)?.updateXOffset)==null||t.call(e)}),ei(this,oi,e=>{let{key:t}=e;this.keysUsed.includes(t)?this.preventClick||this.handleClick(e):this.removeEventListener(`keyup`,W(this,oi))}),ei(this,si,e=>{let{metaKey:t,altKey:n,key:r}=e;t||n||!this.keysUsed.includes(r)?this.removeEventListener(`keyup`,W(this,oi)):this.addEventListener(`keyup`,W(this,oi),{once:!0})}),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);let e=lt(this.attributes),t=this.constructor.getTemplateHTML(e);this.shadowRoot.setHTMLUnsafe?this.shadowRoot.setHTMLUnsafe(t):this.shadowRoot.innerHTML=t}this.tooltipEl=this.shadowRoot.querySelector(`media-tooltip`)}static get observedAttributes(){return[`disabled`,ui.TOOLTIP_PLACEMENT,x.MEDIA_CONTROLLER,S.MEDIA_LANG]}enable(){this.addEventListener(`click`,W(this,ii)),this.addEventListener(`keydown`,W(this,si)),this.tabIndex=0}disable(){this.removeEventListener(`click`,W(this,ii)),this.removeEventListener(`keydown`,W(this,si)),this.removeEventListener(`keyup`,W(this,oi)),this.tabIndex=-1}attributeChangedCallback(e,t,n){var r,i,a,o;e===x.MEDIA_CONTROLLER?(t&&((i=(r=W(this,ri))?.unassociateElement)==null||i.call(r,this),ti(this,ri,null)),n&&this.isConnected&&(ti(this,ri,this.getRootNode()?.getElementById(n)),(o=(a=W(this,ri))?.associateElement)==null||o.call(a,this))):e===`disabled`&&n!==t?n==null?this.enable():this.disable():e===ui.TOOLTIP_PLACEMENT&&this.tooltipEl&&n!==t?this.tooltipEl.placement=n:e===S.MEDIA_LANG&&(this.shadowRoot.querySelector(`slot[name="tooltip-content"]`).innerHTML=this.constructor.getTooltipContentHTML()),W(this,ai).call(this)}connectedCallback(){var e,t;let{style:n}=k(this.shadowRoot,`:host`);n.setProperty(`display`,`var(--media-control-display, var(--${this.localName}-display, inline-flex))`),this.hasAttribute(`disabled`)?this.disable():this.enable(),this.setAttribute(`role`,`button`);let r=this.getAttribute(x.MEDIA_CONTROLLER);r&&(ti(this,ri,this.getRootNode()?.getElementById(r)),(t=(e=W(this,ri))?.associateElement)==null||t.call(e,this)),D.customElements.whenDefined(`media-tooltip`).then(()=>ni(this,ci,li).call(this))}disconnectedCallback(){var e,t;this.disable(),(t=(e=W(this,ri))?.unassociateElement)==null||t.call(e,this),ti(this,ri,null),this.removeEventListener(`mouseenter`,W(this,ai)),this.removeEventListener(`focus`,W(this,ai)),this.removeEventListener(`click`,W(this,ii))}get keysUsed(){return[`Enter`,` `]}get tooltipPlacement(){return P(this,ui.TOOLTIP_PLACEMENT)}set tooltipPlacement(e){F(this,ui.TOOLTIP_PLACEMENT,e)}get mediaController(){return P(this,x.MEDIA_CONTROLLER)}set mediaController(e){F(this,x.MEDIA_CONTROLLER,e)}get disabled(){return M(this,ui.DISABLED)}set disabled(e){N(this,ui.DISABLED,e)}get noTooltip(){return M(this,ui.NO_TOOLTIP)}set noTooltip(e){N(this,ui.NO_TOOLTIP,e)}handleClick(e){}};ri=new WeakMap,ii=new WeakMap,ai=new WeakMap,oi=new WeakMap,si=new WeakMap,ci=new WeakSet,li=function(){this.addEventListener(`mouseenter`,W(this,ai)),this.addEventListener(`focus`,W(this,ai)),this.addEventListener(`click`,W(this,ii));let e=this.tooltipPlacement;e&&this.tooltipEl&&(this.tooltipEl.placement=e)},G.shadowRootOptions={mode:`open`},G.getTemplateHTML=di,G.getSlotTemplateHTML=fi,G.getTooltipContentHTML=pi,D.customElements.get(`media-chrome-button`)||D.customElements.define(`media-chrome-button`,G);var mi=G,hi=`<svg aria-hidden="true" viewBox="0 0 26 24">
  <path d="M22.13 3H3.87a.87.87 0 0 0-.87.87v13.26a.87.87 0 0 0 .87.87h3.4L9 16H5V5h16v11h-4l1.72 2h3.4a.87.87 0 0 0 .87-.87V3.87a.87.87 0 0 0-.86-.87Zm-8.75 11.44a.5.5 0 0 0-.76 0l-4.91 5.73a.5.5 0 0 0 .38.83h9.82a.501.501 0 0 0 .38-.83l-4.91-5.73Z"/>
</svg>
`;function gi(e){return`
    <style>
      :host([${S.MEDIA_IS_AIRPLAYING}]) slot[name=icon] slot:not([name=exit]) {
        display: none !important;
      }

      
      :host(:not([${S.MEDIA_IS_AIRPLAYING}])) slot[name=icon] slot:not([name=enter]) {
        display: none !important;
      }

      :host([${S.MEDIA_IS_AIRPLAYING}]) slot[name=tooltip-enter],
      :host(:not([${S.MEDIA_IS_AIRPLAYING}])) slot[name=tooltip-exit] {
        display: none;
      }
    </style>

    <slot name="icon">
      <slot name="enter">${hi}</slot>
      <slot name="exit">${hi}</slot>
    </slot>
  `}function _i(){return`
    <slot name="tooltip-enter">${T(`start airplay`)}</slot>
    <slot name="tooltip-exit">${T(`stop airplay`)}</slot>
  `}var vi=e=>{let t=e.mediaIsAirplaying?T(`stop airplay`):T(`start airplay`);e.setAttribute(`aria-label`,t)},yi=class extends G{static get observedAttributes(){return[...super.observedAttributes,S.MEDIA_IS_AIRPLAYING,S.MEDIA_AIRPLAY_UNAVAILABLE]}connectedCallback(){super.connectedCallback(),vi(this)}attributeChangedCallback(e,t,n){super.attributeChangedCallback(e,t,n),e===S.MEDIA_IS_AIRPLAYING&&vi(this)}get mediaIsAirplaying(){return M(this,S.MEDIA_IS_AIRPLAYING)}set mediaIsAirplaying(e){N(this,S.MEDIA_IS_AIRPLAYING,e)}get mediaAirplayUnavailable(){return P(this,S.MEDIA_AIRPLAY_UNAVAILABLE)}set mediaAirplayUnavailable(e){F(this,S.MEDIA_AIRPLAY_UNAVAILABLE,e)}handleClick(){let e=new D.CustomEvent(b.MEDIA_AIRPLAY_REQUEST,{composed:!0,bubbles:!0});this.dispatchEvent(e)}};yi.getSlotTemplateHTML=gi,yi.getTooltipContentHTML=_i,D.customElements.get(`media-airplay-button`)||D.customElements.define(`media-airplay-button`,yi);var bi=yi,xi=`<svg aria-hidden="true" viewBox="0 0 26 24">
  <path d="M22.83 5.68a2.58 2.58 0 0 0-2.3-2.5c-3.62-.24-11.44-.24-15.06 0a2.58 2.58 0 0 0-2.3 2.5c-.23 4.21-.23 8.43 0 12.64a2.58 2.58 0 0 0 2.3 2.5c3.62.24 11.44.24 15.06 0a2.58 2.58 0 0 0 2.3-2.5c.23-4.21.23-8.43 0-12.64Zm-11.39 9.45a3.07 3.07 0 0 1-1.91.57 3.06 3.06 0 0 1-2.34-1 3.75 3.75 0 0 1-.92-2.67 3.92 3.92 0 0 1 .92-2.77 3.18 3.18 0 0 1 2.43-1 2.94 2.94 0 0 1 2.13.78c.364.359.62.813.74 1.31l-1.43.35a1.49 1.49 0 0 0-1.51-1.17 1.61 1.61 0 0 0-1.29.58 2.79 2.79 0 0 0-.5 1.89 3 3 0 0 0 .49 1.93 1.61 1.61 0 0 0 1.27.58 1.48 1.48 0 0 0 1-.37 2.1 2.1 0 0 0 .59-1.14l1.4.44a3.23 3.23 0 0 1-1.07 1.69Zm7.22 0a3.07 3.07 0 0 1-1.91.57 3.06 3.06 0 0 1-2.34-1 3.75 3.75 0 0 1-.92-2.67 3.88 3.88 0 0 1 .93-2.77 3.14 3.14 0 0 1 2.42-1 3 3 0 0 1 2.16.82 2.8 2.8 0 0 1 .73 1.31l-1.43.35a1.49 1.49 0 0 0-1.51-1.21 1.61 1.61 0 0 0-1.29.58A2.79 2.79 0 0 0 15 12a3 3 0 0 0 .49 1.93 1.61 1.61 0 0 0 1.27.58 1.44 1.44 0 0 0 1-.37 2.1 2.1 0 0 0 .6-1.15l1.4.44a3.17 3.17 0 0 1-1.1 1.7Z"/>
</svg>`,Si=`<svg aria-hidden="true" viewBox="0 0 26 24">
  <path d="M17.73 14.09a1.4 1.4 0 0 1-1 .37 1.579 1.579 0 0 1-1.27-.58A3 3 0 0 1 15 12a2.8 2.8 0 0 1 .5-1.85 1.63 1.63 0 0 1 1.29-.57 1.47 1.47 0 0 1 1.51 1.2l1.43-.34A2.89 2.89 0 0 0 19 9.07a3 3 0 0 0-2.14-.78 3.14 3.14 0 0 0-2.42 1 3.91 3.91 0 0 0-.93 2.78 3.74 3.74 0 0 0 .92 2.66 3.07 3.07 0 0 0 2.34 1 3.07 3.07 0 0 0 1.91-.57 3.17 3.17 0 0 0 1.07-1.74l-1.4-.45c-.083.43-.3.822-.62 1.12Zm-7.22 0a1.43 1.43 0 0 1-1 .37 1.58 1.58 0 0 1-1.27-.58A3 3 0 0 1 7.76 12a2.8 2.8 0 0 1 .5-1.85 1.63 1.63 0 0 1 1.29-.57 1.47 1.47 0 0 1 1.51 1.2l1.43-.34a2.81 2.81 0 0 0-.74-1.32 2.94 2.94 0 0 0-2.13-.78 3.18 3.18 0 0 0-2.43 1 4 4 0 0 0-.92 2.78 3.74 3.74 0 0 0 .92 2.66 3.07 3.07 0 0 0 2.34 1 3.07 3.07 0 0 0 1.91-.57 3.23 3.23 0 0 0 1.07-1.74l-1.4-.45a2.06 2.06 0 0 1-.6 1.07Zm12.32-8.41a2.59 2.59 0 0 0-2.3-2.51C18.72 3.05 15.86 3 13 3c-2.86 0-5.72.05-7.53.17a2.59 2.59 0 0 0-2.3 2.51c-.23 4.207-.23 8.423 0 12.63a2.57 2.57 0 0 0 2.3 2.5c1.81.13 4.67.19 7.53.19 2.86 0 5.72-.06 7.53-.19a2.57 2.57 0 0 0 2.3-2.5c.23-4.207.23-8.423 0-12.63Zm-1.49 12.53a1.11 1.11 0 0 1-.91 1.11c-1.67.11-4.45.18-7.43.18-2.98 0-5.76-.07-7.43-.18a1.11 1.11 0 0 1-.91-1.11c-.21-4.14-.21-8.29 0-12.43a1.11 1.11 0 0 1 .91-1.11C7.24 4.56 10 4.49 13 4.49s5.76.07 7.43.18a1.11 1.11 0 0 1 .91 1.11c.21 4.14.21 8.29 0 12.43Z"/>
</svg>`;function Ci(e){return`
    <style>
      :host([aria-checked="true"]) slot[name=off] {
        display: none !important;
      }

      
      :host(:not([aria-checked="true"])) slot[name=on] {
        display: none !important;
      }

      :host([aria-checked="true"]) slot[name=tooltip-enable],
      :host(:not([aria-checked="true"])) slot[name=tooltip-disable] {
        display: none;
      }
    </style>

    <slot name="icon">
      <slot name="on">${xi}</slot>
      <slot name="off">${Si}</slot>
    </slot>
  `}function wi(){return`
    <slot name="tooltip-enable">${T(`Enable captions`)}</slot>
    <slot name="tooltip-disable">${T(`Disable captions`)}</slot>
  `}var Ti=e=>{e.setAttribute(`aria-checked`,An(e).toString())},Ei=class extends G{static get observedAttributes(){return[...super.observedAttributes,S.MEDIA_SUBTITLES_LIST,S.MEDIA_SUBTITLES_SHOWING]}connectedCallback(){super.connectedCallback(),this.setAttribute(`role`,`button`),this.setAttribute(`aria-label`,T(`closed captions`)),Ti(this)}attributeChangedCallback(e,t,n){super.attributeChangedCallback(e,t,n),e===S.MEDIA_SUBTITLES_SHOWING&&Ti(this)}get mediaSubtitlesList(){return Di(this,S.MEDIA_SUBTITLES_LIST)}set mediaSubtitlesList(e){Oi(this,S.MEDIA_SUBTITLES_LIST,e)}get mediaSubtitlesShowing(){return Di(this,S.MEDIA_SUBTITLES_SHOWING)}set mediaSubtitlesShowing(e){Oi(this,S.MEDIA_SUBTITLES_SHOWING,e)}handleClick(){this.dispatchEvent(new D.CustomEvent(b.MEDIA_TOGGLE_SUBTITLES_REQUEST,{composed:!0,bubbles:!0}))}};Ei.getSlotTemplateHTML=Ci,Ei.getTooltipContentHTML=wi;var Di=(e,t)=>{let n=e.getAttribute(t);return n?Sn(n):[]},Oi=(e,t,n)=>{if(!n?.length){e.removeAttribute(t);return}let r=Tn(n);e.getAttribute(t)!==r&&e.setAttribute(t,r)};D.customElements.get(`media-captions-button`)||D.customElements.define(`media-captions-button`,Ei);var ki=Ei,Ai=`<svg aria-hidden="true" viewBox="0 0 24 24"><g><path class="cast_caf_icon_arch0" d="M1,18 L1,21 L4,21 C4,19.3 2.66,18 1,18 L1,18 Z"/><path class="cast_caf_icon_arch1" d="M1,14 L1,16 C3.76,16 6,18.2 6,21 L8,21 C8,17.13 4.87,14 1,14 L1,14 Z"/><path class="cast_caf_icon_arch2" d="M1,10 L1,12 C5.97,12 10,16.0 10,21 L12,21 C12,14.92 7.07,10 1,10 L1,10 Z"/><path class="cast_caf_icon_box" d="M21,3 L3,3 C1.9,3 1,3.9 1,5 L1,8 L3,8 L3,5 L21,5 L21,19 L14,19 L14,21 L21,21 C22.1,21 23,20.1 23,19 L23,5 C23,3.9 22.1,3 21,3 L21,3 Z"/></g></svg>`,ji=`<svg aria-hidden="true" viewBox="0 0 24 24"><g><path class="cast_caf_icon_arch0" d="M1,18 L1,21 L4,21 C4,19.3 2.66,18 1,18 L1,18 Z"/><path class="cast_caf_icon_arch1" d="M1,14 L1,16 C3.76,16 6,18.2 6,21 L8,21 C8,17.13 4.87,14 1,14 L1,14 Z"/><path class="cast_caf_icon_arch2" d="M1,10 L1,12 C5.97,12 10,16.0 10,21 L12,21 C12,14.92 7.07,10 1,10 L1,10 Z"/><path class="cast_caf_icon_box" d="M21,3 L3,3 C1.9,3 1,3.9 1,5 L1,8 L3,8 L3,5 L21,5 L21,19 L14,19 L14,21 L21,21 C22.1,21 23,20.1 23,19 L23,5 C23,3.9 22.1,3 21,3 L21,3 Z"/><path class="cast_caf_icon_boxfill" d="M5,7 L5,8.63 C8,8.6 13.37,14 13.37,17 L19,17 L19,7 Z"/></g></svg>`;function Mi(e){return`
    <style>
      :host([${S.MEDIA_IS_CASTING}]) slot[name=icon] slot:not([name=exit]) {
        display: none !important;
      }

      
      :host(:not([${S.MEDIA_IS_CASTING}])) slot[name=icon] slot:not([name=enter]) {
        display: none !important;
      }

      :host([${S.MEDIA_IS_CASTING}]) slot[name=tooltip-enter],
      :host(:not([${S.MEDIA_IS_CASTING}])) slot[name=tooltip-exit] {
        display: none;
      }
    </style>

    <slot name="icon">
      <slot name="enter">${Ai}</slot>
      <slot name="exit">${ji}</slot>
    </slot>
  `}function Ni(){return`
    <slot name="tooltip-enter">${T(`Start casting`)}</slot>
    <slot name="tooltip-exit">${T(`Stop casting`)}</slot>
  `}var Pi=e=>{let t=e.mediaIsCasting?T(`stop casting`):T(`start casting`);e.setAttribute(`aria-label`,t)},Fi=class extends G{static get observedAttributes(){return[...super.observedAttributes,S.MEDIA_IS_CASTING,S.MEDIA_CAST_UNAVAILABLE]}connectedCallback(){super.connectedCallback(),Pi(this)}attributeChangedCallback(e,t,n){super.attributeChangedCallback(e,t,n),e===S.MEDIA_IS_CASTING&&Pi(this)}get mediaIsCasting(){return M(this,S.MEDIA_IS_CASTING)}set mediaIsCasting(e){N(this,S.MEDIA_IS_CASTING,e)}get mediaCastUnavailable(){return P(this,S.MEDIA_CAST_UNAVAILABLE)}set mediaCastUnavailable(e){F(this,S.MEDIA_CAST_UNAVAILABLE,e)}handleClick(){let e=this.mediaIsCasting?b.MEDIA_EXIT_CAST_REQUEST:b.MEDIA_ENTER_CAST_REQUEST;this.dispatchEvent(new D.CustomEvent(e,{composed:!0,bubbles:!0}))}};Fi.getSlotTemplateHTML=Mi,Fi.getTooltipContentHTML=Ni,D.customElements.get(`media-cast-button`)||D.customElements.define(`media-cast-button`,Fi);var Ii=Fi,Li=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},Ri=(e,t,n)=>(Li(e,t,`read from private field`),n?n.call(e):t.get(e)),zi=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},Bi=(e,t,n,r)=>(Li(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),Vi=(e,t,n)=>(Li(e,t,`access private method`),n),Hi,Ui,Wi,Gi,Ki,qi,Ji,Yi,Xi,Zi,Qi,$i,ea,ta,na;function ra(e){return`
    <style>
      :host {
        font: var(--media-font,
          var(--media-font-weight, normal)
          var(--media-font-size, 14px) /
          var(--media-text-content-height, var(--media-control-height, 24px))
          var(--media-font-family, helvetica neue, segoe ui, roboto, arial, sans-serif));
        color: var(--media-text-color, var(--media-primary-color, rgb(238 238 238)));
        display: var(--media-dialog-display, inline-flex);
        justify-content: center;
        align-items: center;
        
        transition-behavior: allow-discrete;
        visibility: hidden;
        opacity: 0;
        transform: translateY(2px) scale(.99);
        pointer-events: none;
      }

      :host([open]) {
        transition: display .2s, visibility 0s, opacity .2s ease-out, transform .15s ease-out;
        visibility: visible;
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      #content {
        display: flex;
        position: relative;
        box-sizing: border-box;
        width: min(320px, 100%);
        word-wrap: break-word;
        max-height: 100%;
        overflow: auto;
        text-align: center;
        line-height: 1.4;
      }
    </style>
    ${this.getSlotTemplateHTML(e)}
  `}function ia(e){return`
    <slot id="content"></slot>
  `}var aa={OPEN:`open`,ANCHOR:`anchor`},oa=class extends D.HTMLElement{constructor(){super(),zi(this,Gi),zi(this,qi),zi(this,Yi),zi(this,Zi),zi(this,$i),zi(this,ta),zi(this,Hi,!1),zi(this,Ui,null),zi(this,Wi,null)}static get observedAttributes(){return[aa.OPEN,aa.ANCHOR]}get open(){return M(this,aa.OPEN)}set open(e){N(this,aa.OPEN,e)}handleEvent(e){switch(e.type){case`invoke`:Vi(this,Zi,Qi).call(this,e);break;case`focusout`:Vi(this,$i,ea).call(this,e);break;case`keydown`:Vi(this,ta,na).call(this,e)}}connectedCallback(){Vi(this,Gi,Ki).call(this),this.role||=`dialog`,this.addEventListener(`invoke`,this),this.addEventListener(`focusout`,this),this.addEventListener(`keydown`,this)}disconnectedCallback(){this.removeEventListener(`invoke`,this),this.removeEventListener(`focusout`,this),this.removeEventListener(`keydown`,this)}attributeChangedCallback(e,t,n){Vi(this,Gi,Ki).call(this),e===aa.OPEN&&n!==t&&(this.open?Vi(this,qi,Ji).call(this):Vi(this,Yi,Xi).call(this))}focus(){Bi(this,Ui,_t());let e=!this.dispatchEvent(new Event(`focus`,{composed:!0,cancelable:!0})),t=!this.dispatchEvent(new Event(`focusin`,{composed:!0,bubbles:!0,cancelable:!0}));e||t||this.querySelector(`[autofocus], [tabindex]:not([tabindex="-1"]), [role="menu"]`)?.focus()}get keysUsed(){return[`Escape`,`Tab`]}};Hi=new WeakMap,Ui=new WeakMap,Wi=new WeakMap,Gi=new WeakSet,Ki=function(){if(!Ri(this,Hi)&&(Bi(this,Hi,!0),!this.shadowRoot)){this.attachShadow(this.constructor.shadowRootOptions);let e=lt(this.attributes);this.shadowRoot.innerHTML=this.constructor.getTemplateHTML(e),queueMicrotask(()=>{let{style:e}=k(this.shadowRoot,`:host`);e.setProperty(`transition`,`display .15s, visibility .15s, opacity .15s ease-in, transform .15s ease-in`)})}},qi=new WeakSet,Ji=function(){var e;(e=Ri(this,Wi))==null||e.setAttribute(`aria-expanded`,`true`),this.dispatchEvent(new Event(`open`,{composed:!0,bubbles:!0})),this.addEventListener(`transitionend`,()=>this.focus(),{once:!0})},Yi=new WeakSet,Xi=function(){var e;(e=Ri(this,Wi))==null||e.setAttribute(`aria-expanded`,`false`),this.dispatchEvent(new Event(`close`,{composed:!0,bubbles:!0}))},Zi=new WeakSet,Qi=function(e){Bi(this,Wi,e.relatedTarget),ht(this,e.relatedTarget)||(this.open=!this.open)},$i=new WeakSet,ea=function(e){var t;ht(this,e.relatedTarget)||((t=Ri(this,Ui))==null||t.focus(),Ri(this,Wi)&&Ri(this,Wi)!==e.relatedTarget&&this.open&&(this.open=!1))},ta=new WeakSet,na=function(e){var t,n,r,i,a;let{key:o,ctrlKey:s,altKey:c,metaKey:l}=e;s||c||l||this.keysUsed.includes(o)&&(e.preventDefault(),e.stopPropagation(),o===`Tab`?(e.shiftKey?(n=(t=this.previousElementSibling)?.focus)==null||n.call(t):(i=(r=this.nextElementSibling)?.focus)==null||i.call(r),this.blur()):o===`Escape`&&((a=Ri(this,Ui))==null||a.focus(),this.open=!1))},oa.shadowRootOptions={mode:`open`},oa.getTemplateHTML=ra,oa.getSlotTemplateHTML=ia,D.customElements.get(`media-chrome-dialog`)||D.customElements.define(`media-chrome-dialog`,oa);var sa=oa,ca=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},K=(e,t,n)=>(ca(e,t,`read from private field`),n?n.call(e):t.get(e)),q=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},la=(e,t,n,r)=>(ca(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),ua=(e,t,n)=>(ca(e,t,`access private method`),n),da,fa,pa,ma,ha,ga,_a,va,ya,ba,xa,Sa,Ca,wa,Ta,Ea,Da,Oa,ka,Aa,ja,Ma,Na,Pa,Fa;function Ia(e){return`
    <style>
      :host {
        --_focus-box-shadow: var(--media-focus-box-shadow, inset 0 0 0 2px rgb(27 127 204 / .9));
        --_media-range-padding: var(--media-range-padding, var(--media-control-padding, 10px));

        box-shadow: var(--_focus-visible-box-shadow, none);
        background: var(--media-control-background, var(--media-secondary-color, rgb(20 20 30 / .7)));
        height: calc(var(--media-control-height, 24px) + 2 * var(--_media-range-padding));
        display: inline-flex;
        align-items: center;
        
        vertical-align: middle;
        box-sizing: border-box;
        position: relative;
        width: 100px;
        transition: background .15s linear;
        cursor: var(--media-cursor, pointer);
        pointer-events: auto;
        touch-action: none; 
      }

      
      input[type=range]:focus {
        outline: 0;
      }
      input[type=range]:focus::-webkit-slider-runnable-track {
        outline: 0;
      }

      :host(:hover) {
        background: var(--media-control-hover-background, rgb(50 50 70 / .7));
      }

      #leftgap {
        padding-left: var(--media-range-padding-left, var(--_media-range-padding));
      }

      #rightgap {
        padding-right: var(--media-range-padding-right, var(--_media-range-padding));
      }

      #startpoint,
      #endpoint {
        position: absolute;
      }

      #endpoint {
        right: 0;
      }

      #container {
        
        width: var(--media-range-track-width, 100%);
        transform: translate(var(--media-range-track-translate-x, 0px), var(--media-range-track-translate-y, 0px));
        position: relative;
        height: 100%;
        display: flex;
        align-items: center;
        min-width: 40px;
      }

      #range {
        
        display: var(--media-time-range-hover-display, block);
        bottom: var(--media-time-range-hover-bottom, 0);
        height: var(--media-time-range-hover-height, max(100% , 25px));
        width: 100%;
        position: absolute;
        cursor: var(--media-cursor, pointer);

        -webkit-appearance: none; 
        -webkit-tap-highlight-color: transparent;
        background: transparent; 
        margin: 0;
        z-index: 1;
      }

      @media (hover: hover) {
        #range {
          bottom: var(--media-time-range-hover-bottom, 0);
          height: var(--media-time-range-hover-height, max(100%, 20px));
        }
      }

      
      
      #range::-webkit-slider-thumb {
        -webkit-appearance: none;
        background: transparent;
        width: .1px;
        height: .1px;
      }

      
      #range::-moz-range-thumb {
        background: transparent;
        border: transparent;
        width: .1px;
        height: .1px;
      }

      #appearance {
        height: var(--media-range-track-height, 4px);
        display: flex;
        flex-direction: column;
        justify-content: center;
        width: 100%;
        position: absolute;
        
        will-change: transform;
      }

      #track {
        background: var(--media-range-track-background, rgb(255 255 255 / .2));
        border-radius: var(--media-range-track-border-radius, 1px);
        border: var(--media-range-track-border, none);
        outline: var(--media-range-track-outline);
        outline-offset: var(--media-range-track-outline-offset);
        backdrop-filter: var(--media-range-track-backdrop-filter);
        -webkit-backdrop-filter: var(--media-range-track-backdrop-filter);
        box-shadow: var(--media-range-track-box-shadow, none);
        position: absolute;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      #progress,
      #pointer {
        position: absolute;
        height: 100%;
        will-change: width;
      }

      #progress {
        background: var(--media-range-bar-color, var(--media-primary-color, rgb(238 238 238)));
        transition: var(--media-range-track-transition);
      }

      #pointer {
        background: var(--media-range-track-pointer-background);
        border-right: var(--media-range-track-pointer-border-right);
        transition: visibility .25s, opacity .25s;
        visibility: hidden;
        opacity: 0;
      }

      @media (hover: hover) {
        :host(:hover) #pointer {
          transition: visibility .5s, opacity .5s;
          visibility: visible;
          opacity: 1;
        }
      }

      #thumb,
      ::slotted([slot=thumb]) {
        width: var(--media-range-thumb-width, 10px);
        height: var(--media-range-thumb-height, 10px);
        transition: var(--media-range-thumb-transition);
        transform: var(--media-range-thumb-transform, none);
        opacity: var(--media-range-thumb-opacity, 1);
        translate: -50%;
        position: absolute;
        left: 0;
        cursor: var(--media-cursor, pointer);
      }

      #thumb {
        border-radius: var(--media-range-thumb-border-radius, 10px);
        background: var(--media-range-thumb-background, var(--media-primary-color, rgb(238 238 238)));
        box-shadow: var(--media-range-thumb-box-shadow, 1px 1px 1px transparent);
        border: var(--media-range-thumb-border, none);
      }

      :host([disabled]) #thumb {
        background-color: #777;
      }

      .segments #appearance {
        height: var(--media-range-segment-hover-height, 7px);
      }

      #track {
        clip-path: url(#segments-clipping);
      }

      #segments {
        --segments-gap: var(--media-range-segments-gap, 2px);
        position: absolute;
        width: 100%;
        height: 100%;
      }

      #segments-clipping {
        transform: translateX(calc(var(--segments-gap) / 2));
      }

      #segments-clipping:empty {
        display: none;
      }

      #segments-clipping rect {
        height: var(--media-range-track-height, 4px);
        y: calc((var(--media-range-segment-hover-height, 7px) - var(--media-range-track-height, 4px)) / 2);
        transition: var(--media-range-segment-transition, transform .1s ease-in-out);
        transform: var(--media-range-segment-transform, scaleY(1));
        transform-origin: center;
      }

      /* Visible label for accessibility - positioned off-screen but technically visible (Firefox requires visible labels) */
      #range-label {
        position: absolute;
        left: -10000px;
        background: var(--media-control-background, var(--media-secondary-color, rgb(20 20 30 / .7)));
        pointer-events: none;
      }
    </style>
    <div id="leftgap"></div>
    <div id="container">
      <div id="startpoint"></div>
      <div id="endpoint"></div>
      <div id="appearance">
        <div id="track" part="track">
          <div id="pointer"></div>
          <div id="progress" part="progress"></div>
        </div>
        <slot name="thumb">
          <div id="thumb" part="thumb"></div>
        </slot>
        <svg id="segments" aria-hidden="true"><clipPath id="segments-clipping"></clipPath></svg>
      </div>
        <input id="range" type="range" min="0" max="1" step="any" value="0">
        <label for="range" id="range-label"></label>

      ${this.getContainerTemplateHTML(e)}
    </div>
    <div id="rightgap"></div>
  `}function La(e){return``}var Ra=class extends D.HTMLElement{constructor(){if(super(),q(this,ba),q(this,Sa),q(this,wa),q(this,Ea),q(this,Oa),q(this,Aa),q(this,Ma),q(this,Pa),q(this,da,void 0),q(this,fa,void 0),q(this,pa,void 0),q(this,ma,void 0),q(this,ha,{}),q(this,ga,[]),q(this,_a,()=>{if(this.range.matches(`:focus-visible`)){let{style:e}=k(this.shadowRoot,`:host`);e.setProperty(`--_focus-visible-box-shadow`,`var(--_focus-box-shadow)`)}}),q(this,va,()=>{let{style:e}=k(this.shadowRoot,`:host`);e.removeProperty(`--_focus-visible-box-shadow`)}),q(this,ya,()=>{let e=this.shadowRoot.querySelector(`#segments-clipping`);e&&e.parentNode.append(e)}),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);let e=lt(this.attributes),t=this.constructor.getTemplateHTML(e);this.shadowRoot.setHTMLUnsafe?this.shadowRoot.setHTMLUnsafe(t):this.shadowRoot.innerHTML=t}this.container=this.shadowRoot.querySelector(`#container`),la(this,pa,this.shadowRoot.querySelector(`#startpoint`)),la(this,ma,this.shadowRoot.querySelector(`#endpoint`)),this.range=this.shadowRoot.querySelector(`#range`),this.appearance=this.shadowRoot.querySelector(`#appearance`)}static get observedAttributes(){return[`disabled`,`aria-disabled`,x.MEDIA_CONTROLLER]}attributeChangedCallback(e,t,n){var r,i,a,o;e===x.MEDIA_CONTROLLER?(t&&((i=(r=K(this,da))?.unassociateElement)==null||i.call(r,this),la(this,da,null)),n&&this.isConnected&&(la(this,da,this.getRootNode()?.getElementById(n)),(o=(a=K(this,da))?.associateElement)==null||o.call(a,this))):(e===`disabled`||e===`aria-disabled`&&t!==n)&&(n==null?(this.range.removeAttribute(e),ua(this,Sa,Ca).call(this)):(this.range.setAttribute(e,n),ua(this,wa,Ta).call(this)))}connectedCallback(){var e,t;let{style:n}=k(this.shadowRoot,`:host`);n.setProperty(`display`,`var(--media-control-display, var(--${this.localName}-display, inline-flex))`),K(this,ha).pointer=k(this.shadowRoot,`#pointer`),K(this,ha).progress=k(this.shadowRoot,`#progress`),K(this,ha).thumb=k(this.shadowRoot,`#thumb, ::slotted([slot="thumb"])`),K(this,ha).activeSegment=k(this.shadowRoot,`#segments-clipping rect:nth-child(0)`);let r=this.getAttribute(x.MEDIA_CONTROLLER);r&&(la(this,da,this.getRootNode()?.getElementById(r)),(t=(e=K(this,da))?.associateElement)==null||t.call(e,this)),this.updateBar(),this.shadowRoot.addEventListener(`focusin`,K(this,_a)),this.shadowRoot.addEventListener(`focusout`,K(this,va)),ua(this,Sa,Ca).call(this),st(this.container,K(this,ya))}disconnectedCallback(){var e,t;ua(this,wa,Ta).call(this),(t=(e=K(this,da))?.unassociateElement)==null||t.call(e,this),la(this,da,null),this.shadowRoot.removeEventListener(`focusin`,K(this,_a)),this.shadowRoot.removeEventListener(`focusout`,K(this,va)),ct(this.container,K(this,ya))}updatePointerBar(e){var t;(t=K(this,ha).pointer)==null||t.style.setProperty(`width`,`${this.getPointerRatio(e)*100}%`)}updateBar(){var e,t;let n=this.range.valueAsNumber*100;(e=K(this,ha).progress)==null||e.style.setProperty(`width`,`${n}%`),(t=K(this,ha).thumb)==null||t.style.setProperty(`left`,`${n}%`)}updateSegments(e){let t=this.shadowRoot.querySelector(`#segments-clipping`);if(t.textContent=``,this.container.classList.toggle(`segments`,!!e?.length),!e?.length)return;let n=[...new Set([+this.range.min,...e.flatMap(e=>[e.start,e.end]),+this.range.max])];la(this,ga,[...n]);let r=n.pop();for(let[e,i]of n.entries()){let[a,o]=[e===0,e===n.length-1],s=a?`calc(var(--segments-gap) / -1)`:`${i*100}%`,c=`calc(${((o?r:n[e+1])-i)*100}%${a||o?``:` - var(--segments-gap)`})`,l=O.createElementNS(`http://www.w3.org/2000/svg`,`rect`),u=St(this.shadowRoot,`#segments-clipping rect:nth-child(${e+1})`);u.style.setProperty(`x`,s),u.style.setProperty(`width`,c),t.append(l)}}getPointerRatio(e){return bt(e.clientX,e.clientY,K(this,pa).getBoundingClientRect(),K(this,ma).getBoundingClientRect())}get dragging(){return this.hasAttribute(`dragging`)}handleEvent(e){switch(e.type){case`pointermove`:ua(this,Pa,Fa).call(this,e);break;case`input`:this.updateBar();break;case`pointerenter`:ua(this,Oa,ka).call(this,e);break;case`pointerdown`:ua(this,Ea,Da).call(this,e);break;case`pointerup`:ua(this,Aa,ja).call(this);break;case`pointerleave`:ua(this,Ma,Na).call(this)}}get keysUsed(){return[`ArrowUp`,`ArrowRight`,`ArrowDown`,`ArrowLeft`]}};da=new WeakMap,fa=new WeakMap,pa=new WeakMap,ma=new WeakMap,ha=new WeakMap,ga=new WeakMap,_a=new WeakMap,va=new WeakMap,ya=new WeakMap,ba=new WeakSet,xa=function(e){let t=K(this,ha).activeSegment;if(!t)return;let n=this.getPointerRatio(e),r=`#segments-clipping rect:nth-child(${K(this,ga).findIndex((e,t,r)=>{let i=r[t+1];return i!=null&&n>=e&&n<=i})+1})`;t.selectorText==r&&t.style.transform||(t.selectorText=r,t.style.setProperty(`transform`,`var(--media-range-segment-hover-transform, scaleY(2))`))},Sa=new WeakSet,Ca=function(){!this.hasAttribute(`disabled`)&&this.isConnected&&(this.addEventListener(`input`,this),this.addEventListener(`pointerdown`,this),this.addEventListener(`pointerenter`,this))},wa=new WeakSet,Ta=function(){var e,t;this.removeEventListener(`input`,this),this.removeEventListener(`pointerdown`,this),this.removeEventListener(`pointerenter`,this),this.removeEventListener(`pointerleave`,this),(e=D.window)==null||e.removeEventListener(`pointerup`,this),(t=D.window)==null||t.removeEventListener(`pointermove`,this)},Ea=new WeakSet,Da=function(e){var t;la(this,fa,e.composedPath().includes(this.range)),(t=D.window)==null||t.addEventListener(`pointerup`,this,{once:!0})},Oa=new WeakSet,ka=function(e){var t;e.pointerType!==`mouse`&&ua(this,Ea,Da).call(this,e),this.addEventListener(`pointerleave`,this,{once:!0}),(t=D.window)==null||t.addEventListener(`pointermove`,this)},Aa=new WeakSet,ja=function(){var e;(e=D.window)==null||e.removeEventListener(`pointerup`,this),this.toggleAttribute(`dragging`,!1),this.range.disabled=this.hasAttribute(`disabled`)},Ma=new WeakSet,Na=function(){var e,t;this.removeEventListener(`pointerleave`,this),(e=D.window)==null||e.removeEventListener(`pointermove`,this),this.toggleAttribute(`dragging`,!1),this.range.disabled=this.hasAttribute(`disabled`),(t=K(this,ha).activeSegment)==null||t.style.removeProperty(`transform`)},Pa=new WeakSet,Fa=function(e){(e.pointerType!==`pen`||e.buttons!==0)&&(this.toggleAttribute(`dragging`,e.buttons===1||e.pointerType!==`mouse`),this.updatePointerBar(e),ua(this,ba,xa).call(this,e),this.dragging&&(e.pointerType!==`mouse`||!K(this,fa))&&(this.range.disabled=!0,this.range.valueAsNumber=this.getPointerRatio(e),this.range.dispatchEvent(new Event(`input`,{bubbles:!0,composed:!0}))))},Ra.shadowRootOptions={mode:`open`},Ra.getTemplateHTML=Ia,Ra.getContainerTemplateHTML=La,D.customElements.get(`media-chrome-range`)||D.customElements.define(`media-chrome-range`,Ra);var za=Ra,Ba=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},Va=(e,t,n)=>(Ba(e,t,`read from private field`),n?n.call(e):t.get(e)),Ha=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},Ua=(e,t,n,r)=>(Ba(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),Wa;function Ga(e){return`
    <style>
      :host {
        
        box-sizing: border-box;
        display: var(--media-control-display, var(--media-control-bar-display, inline-flex));
        color: var(--media-text-color, var(--media-primary-color, rgb(238 238 238)));
        --media-loading-indicator-icon-height: 44px;
      }

      ::slotted(media-time-range),
      ::slotted(media-volume-range) {
        min-height: 100%;
      }

      ::slotted(media-time-range),
      ::slotted(media-clip-selector) {
        flex-grow: 1;
      }

      ::slotted([role="menu"]) {
        position: absolute;
      }
    </style>

    <slot></slot>
  `}var Ka=class extends D.HTMLElement{constructor(){if(super(),Ha(this,Wa,void 0),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);let e=lt(this.attributes);this.shadowRoot.innerHTML=this.constructor.getTemplateHTML(e)}}static get observedAttributes(){return[x.MEDIA_CONTROLLER]}attributeChangedCallback(e,t,n){var r,i,a,o;e===x.MEDIA_CONTROLLER&&(t&&((i=(r=Va(this,Wa))?.unassociateElement)==null||i.call(r,this),Ua(this,Wa,null)),n&&this.isConnected&&(Ua(this,Wa,this.getRootNode()?.getElementById(n)),(o=(a=Va(this,Wa))?.associateElement)==null||o.call(a,this)))}connectedCallback(){var e,t;let n=this.getAttribute(x.MEDIA_CONTROLLER);n&&(Ua(this,Wa,this.getRootNode()?.getElementById(n)),(t=(e=Va(this,Wa))?.associateElement)==null||t.call(e,this))}disconnectedCallback(){var e,t;(t=(e=Va(this,Wa))?.unassociateElement)==null||t.call(e,this),Ua(this,Wa,null)}};Wa=new WeakMap,Ka.shadowRootOptions={mode:`open`},Ka.getTemplateHTML=Ga,D.customElements.get(`media-control-bar`)||D.customElements.define(`media-control-bar`,Ka);var qa=Ka,Ja=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},Ya=(e,t,n)=>(Ja(e,t,`read from private field`),n?n.call(e):t.get(e)),Xa=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},Za=(e,t,n,r)=>(Ja(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),Qa;function $a(e,t={}){return`
    <style>
      :host {
        font: var(--media-font,
          var(--media-font-weight, normal)
          var(--media-font-size, 14px) /
          var(--media-text-content-height, var(--media-control-height, 24px))
          var(--media-font-family, helvetica neue, segoe ui, roboto, arial, sans-serif));
        color: var(--media-text-color, var(--media-primary-color, rgb(238 238 238)));
        background: var(--media-text-background, var(--media-control-background, var(--media-secondary-color, rgb(20 20 30 / .7))));
        padding: var(--media-control-padding, 10px);
        display: inline-flex;
        justify-content: center;
        align-items: center;
        vertical-align: middle;
        box-sizing: border-box;
        text-align: center;
        pointer-events: auto;
      }

      
      :host(:focus-visible) {
        box-shadow: var(--media-focus-box-shadow, inset 0 0 0 2px rgb(27 127 204 / .9));
        outline: 0;
      }

      
      :host(:where(:focus)) {
        box-shadow: none;
        outline: 0;
      }
    </style>

    ${this.getSlotTemplateHTML(e,t)}
  `}function eo(e,t){return`
    <slot></slot>
  `}var to=class extends D.HTMLElement{constructor(){if(super(),Xa(this,Qa,void 0),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);let e=lt(this.attributes);this.shadowRoot.innerHTML=this.constructor.getTemplateHTML(e)}}static get observedAttributes(){return[x.MEDIA_CONTROLLER]}attributeChangedCallback(e,t,n){var r,i,a,o;e===x.MEDIA_CONTROLLER&&(t&&((i=(r=Ya(this,Qa))?.unassociateElement)==null||i.call(r,this),Za(this,Qa,null)),n&&this.isConnected&&(Za(this,Qa,this.getRootNode()?.getElementById(n)),(o=(a=Ya(this,Qa))?.associateElement)==null||o.call(a,this)))}connectedCallback(){var e,t;let{style:n}=k(this.shadowRoot,`:host`);n.setProperty(`display`,`var(--media-control-display, var(--${this.localName}-display, inline-flex))`);let r=this.getAttribute(x.MEDIA_CONTROLLER);r&&(Za(this,Qa,this.getRootNode()?.getElementById(r)),(t=(e=Ya(this,Qa))?.associateElement)==null||t.call(e,this))}disconnectedCallback(){var e,t;(t=(e=Ya(this,Qa))?.unassociateElement)==null||t.call(e,this),Za(this,Qa,null)}};Qa=new WeakMap,to.shadowRootOptions={mode:`open`},to.getTemplateHTML=$a,to.getSlotTemplateHTML=eo,D.customElements.get(`media-text-display`)||D.customElements.define(`media-text-display`,to);var no=to,ro=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},io=(e,t,n)=>(ro(e,t,`read from private field`),n?n.call(e):t.get(e)),ao=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},oo=(e,t,n,r)=>(ro(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),so;function co(e,t){return`
    <slot>${E(t.mediaDuration)}</slot>
  `}var lo=class extends to{constructor(){super(),ao(this,so,void 0),oo(this,so,this.shadowRoot.querySelector(`slot`)),io(this,so).textContent=E(this.mediaDuration??0)}static get observedAttributes(){return[...super.observedAttributes,S.MEDIA_DURATION]}attributeChangedCallback(e,t,n){e===S.MEDIA_DURATION&&(io(this,so).textContent=E(+n)),super.attributeChangedCallback(e,t,n)}get mediaDuration(){return A(this,S.MEDIA_DURATION)}set mediaDuration(e){j(this,S.MEDIA_DURATION,e)}};so=new WeakMap,lo.getSlotTemplateHTML=co,D.customElements.get(`media-duration-display`)||D.customElements.define(`media-duration-display`,lo);var uo=lo,fo={2:T(`Network Error`),3:T(`Decode Error`),4:T(`Source Not Supported`),5:T(`Encryption Error`)},po={2:T(`A network error caused the media download to fail.`),3:T(`A media error caused playback to be aborted. The media could be corrupt or your browser does not support this format.`),4:T(`An unsupported error occurred. The server or network failed, or your browser does not support this format.`),5:T(`The media is encrypted and there are no keys to decrypt it.`)},mo=e=>e.code===1?null:{title:fo[e.code]??`Error ${e.code}`,message:po[e.code]??e.message},ho=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},go=(e,t,n)=>(ho(e,t,`read from private field`),n?n.call(e):t.get(e)),_o=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},vo=(e,t,n,r)=>(ho(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),yo;function bo(e){return`
    <style>
      :host {
        background: rgb(20 20 30 / .8);
      }

      #content {
        display: block;
        padding: 1.2em 1.5em;
      }

      h3,
      p {
        margin-block: 0 .3em;
      }
    </style>
    <slot name="error-${e.mediaerrorcode}" id="content">
      ${So({code:+e.mediaerrorcode,message:e.mediaerrormessage})}
    </slot>
  `}function xo(e){return e.code&&mo(e)!==null}function So(e){let{title:t,message:n}=mo(e)??{},r=``;return t&&(r+=`<slot name="error-${e.code}-title"><h3>${t}</h3></slot>`),n&&(r+=`<slot name="error-${e.code}-message"><p>${n}</p></slot>`),r}var Co=[S.MEDIA_ERROR_CODE,S.MEDIA_ERROR_MESSAGE],wo=class extends oa{constructor(){super(...arguments),_o(this,yo,null)}static get observedAttributes(){return[...super.observedAttributes,...Co]}formatErrorMessage(e){return this.constructor.formatErrorMessage(e)}attributeChangedCallback(e,t,n){if(super.attributeChangedCallback(e,t,n),!Co.includes(e))return;let r=this.mediaError??{code:this.mediaErrorCode,message:this.mediaErrorMessage};if(this.open=xo(r),this.open&&(this.shadowRoot.querySelector(`slot`).name=`error-${this.mediaErrorCode}`,this.shadowRoot.querySelector(`#content`).innerHTML=this.formatErrorMessage(r),!this.hasAttribute(`aria-label`))){let{title:e}=mo(r);e&&this.setAttribute(`aria-label`,e)}}get mediaError(){return go(this,yo)}set mediaError(e){vo(this,yo,e)}get mediaErrorCode(){return A(this,`mediaerrorcode`)}set mediaErrorCode(e){j(this,`mediaerrorcode`,e)}get mediaErrorMessage(){return P(this,`mediaerrormessage`)}set mediaErrorMessage(e){F(this,`mediaerrormessage`,e)}};yo=new WeakMap,wo.getSlotTemplateHTML=bo,wo.formatErrorMessage=So,D.customElements.get(`media-error-dialog`)||D.customElements.define(`media-error-dialog`,wo);var To=wo,Eo=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},Do=(e,t,n)=>(Eo(e,t,`read from private field`),n?n.call(e):t.get(e)),Oo=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},ko,Ao;function jo(e){return`
    <style>
      :host {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 9999;
        background: rgb(20 20 30 / .8);
        backdrop-filter: blur(10px);
      }

      #content {
        display: block;
        width: clamp(400px, 40vw, 700px);
        max-width: 90vw;
        text-align: left;
      }

      h2 {
        margin: 0 0 1.5rem 0;
        font-size: 1.5rem;
        font-weight: 500;
        text-align: center;
      }

      .shortcuts-table {
        width: 100%;
        border-collapse: collapse;
      }

      .shortcuts-table tr {
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .shortcuts-table tr:last-child {
        border-bottom: none;
      }

      .shortcuts-table td {
        padding: 0.75rem 0.5rem;
      }

      .shortcuts-table td:first-child {
        text-align: right;
        padding-right: 1rem;
        width: 40%;
        min-width: 120px;
      }

      .shortcuts-table td:last-child {
        padding-left: 1rem;
      }

      .key {
        display: inline-block;
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        font-family: 'Courier New', monospace;
        font-size: 0.9rem;
        font-weight: 500;
        min-width: 1.5rem;
        text-align: center;
        margin: 0 0.2rem;
      }

      .description {
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.95rem;
      }

      .key-combo {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.3rem;
      }

      .key-separator {
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.9rem;
      }
    </style>
    <slot id="content">
      ${Mo()}
    </slot>
  `}function Mo(){return`
    <h2>Keyboard Shortcuts</h2>
    <table class="shortcuts-table">${[{keys:[`Space`,`k`],description:`Toggle Playback`},{keys:[`m`],description:`Toggle mute`},{keys:[`f`],description:`Toggle fullscreen`},{keys:[`c`],description:`Toggle captions or subtitles, if available`},{keys:[`p`],description:`Toggle Picture in Picture`},{keys:[`←`,`j`],description:`Seek back 10s`},{keys:[`→`,`l`],description:`Seek forward 10s`},{keys:[`↑`],description:`Turn volume up`},{keys:[`↓`],description:`Turn volume down`},{keys:[`< (SHIFT+,)`],description:`Decrease playback rate`},{keys:[`> (SHIFT+.)`],description:`Increase playback rate`}].map(({keys:e,description:t})=>`
      <tr>
        <td>
          <div class="key-combo">${e.map((e,t)=>t>0?`<span class="key-separator">or</span><span class="key">${e}</span>`:`<span class="key">${e}</span>`).join(``)}</div>
        </td>
        <td class="description">${t}</td>
      </tr>
    `).join(``)}</table>
  `}var No=class extends oa{constructor(){super(...arguments),Oo(this,ko,e=>{if(!this.open)return;let t=this.shadowRoot?.querySelector(`#content`);if(!t)return;let n=e.composedPath(),r=n[0]===this||n.includes(this),i=n.includes(t);r&&!i&&(this.open=!1)}),Oo(this,Ao,e=>{if(!this.open)return;let t=e.shiftKey&&(e.key===`/`||e.key===`?`);e.key!==`Escape`&&!t||e.ctrlKey||e.altKey||e.metaKey||(this.open=!1,e.preventDefault(),e.stopPropagation())})}connectedCallback(){super.connectedCallback(),this.open&&(this.addEventListener(`click`,Do(this,ko)),document.addEventListener(`keydown`,Do(this,Ao)))}disconnectedCallback(){this.removeEventListener(`click`,Do(this,ko)),document.removeEventListener(`keydown`,Do(this,Ao))}attributeChangedCallback(e,t,n){super.attributeChangedCallback(e,t,n),e===`open`&&(this.open?(this.addEventListener(`click`,Do(this,ko)),document.addEventListener(`keydown`,Do(this,Ao))):(this.removeEventListener(`click`,Do(this,ko)),document.removeEventListener(`keydown`,Do(this,Ao))))}};ko=new WeakMap,Ao=new WeakMap,No.getSlotTemplateHTML=jo,D.customElements.get(`media-keyboard-shortcuts-dialog`)||D.customElements.define(`media-keyboard-shortcuts-dialog`,No);var Po=No,Fo=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},Io=(e,t,n)=>(Fo(e,t,`read from private field`),n?n.call(e):t.get(e)),Lo=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},Ro=(e,t,n,r)=>(Fo(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),zo,Bo=`<svg aria-hidden="true" viewBox="0 0 26 24">
  <path d="M16 3v2.5h3.5V9H22V3h-6ZM4 9h2.5V5.5H10V3H4v6Zm15.5 9.5H16V21h6v-6h-2.5v3.5ZM6.5 15H4v6h6v-2.5H6.5V15Z"/>
</svg>`,Vo=`<svg aria-hidden="true" viewBox="0 0 26 24">
  <path d="M18.5 6.5V3H16v6h6V6.5h-3.5ZM16 21h2.5v-3.5H22V15h-6v6ZM4 17.5h3.5V21H10v-6H4v2.5Zm3.5-11H4V9h6V3H7.5v3.5Z"/>
</svg>`;function Ho(e){return`
    <style>
      :host([${S.MEDIA_IS_FULLSCREEN}]) slot[name=icon] slot:not([name=exit]) {
        display: none !important;
      }

      
      :host(:not([${S.MEDIA_IS_FULLSCREEN}])) slot[name=icon] slot:not([name=enter]) {
        display: none !important;
      }

      :host([${S.MEDIA_IS_FULLSCREEN}]) slot[name=tooltip-enter],
      :host(:not([${S.MEDIA_IS_FULLSCREEN}])) slot[name=tooltip-exit] {
        display: none;
      }
    </style>

    <slot name="icon">
      <slot name="enter">${Bo}</slot>
      <slot name="exit">${Vo}</slot>
    </slot>
  `}function Uo(){return`
    <slot name="tooltip-enter">${T(`Enter fullscreen mode`)}</slot>
    <slot name="tooltip-exit">${T(`Exit fullscreen mode`)}</slot>
  `}var Wo=e=>{let t=e.mediaIsFullscreen?T(`exit fullscreen mode`):T(`enter fullscreen mode`);e.setAttribute(`aria-label`,t)},Go=class extends G{constructor(){super(...arguments),Lo(this,zo,null)}static get observedAttributes(){return[...super.observedAttributes,S.MEDIA_IS_FULLSCREEN,S.MEDIA_FULLSCREEN_UNAVAILABLE]}connectedCallback(){super.connectedCallback(),Wo(this)}attributeChangedCallback(e,t,n){super.attributeChangedCallback(e,t,n),e===S.MEDIA_IS_FULLSCREEN&&Wo(this)}get mediaFullscreenUnavailable(){return P(this,S.MEDIA_FULLSCREEN_UNAVAILABLE)}set mediaFullscreenUnavailable(e){F(this,S.MEDIA_FULLSCREEN_UNAVAILABLE,e)}get mediaIsFullscreen(){return M(this,S.MEDIA_IS_FULLSCREEN)}set mediaIsFullscreen(e){N(this,S.MEDIA_IS_FULLSCREEN,e)}handleClick(e){Ro(this,zo,e);let t=Io(this,zo)instanceof PointerEvent,n=this.mediaIsFullscreen?new D.CustomEvent(b.MEDIA_EXIT_FULLSCREEN_REQUEST,{composed:!0,bubbles:!0}):new D.CustomEvent(b.MEDIA_ENTER_FULLSCREEN_REQUEST,{composed:!0,bubbles:!0,detail:t});this.dispatchEvent(n)}};zo=new WeakMap,Go.getSlotTemplateHTML=Ho,Go.getTooltipContentHTML=Uo,D.customElements.get(`media-fullscreen-button`)||D.customElements.define(`media-fullscreen-button`,Go);var Ko=Go,{MEDIA_TIME_IS_LIVE:qo,MEDIA_PAUSED:Jo}=S,{MEDIA_SEEK_TO_LIVE_REQUEST:Yo,MEDIA_PLAY_REQUEST:Xo}=b,Zo=`<svg viewBox="0 0 6 12" aria-hidden="true"><circle cx="3" cy="6" r="2"></circle></svg>`;function Qo(e){return`
    <style>
      :host { --media-tooltip-display: none; }
      
      slot[name=indicator] > *,
      :host ::slotted([slot=indicator]) {
        
        min-width: auto;
        fill: var(--media-live-button-icon-color, rgb(140, 140, 140));
        color: var(--media-live-button-icon-color, rgb(140, 140, 140));
      }

      :host([${qo}]:not([${Jo}])) slot[name=indicator] > *,
      :host([${qo}]:not([${Jo}])) ::slotted([slot=indicator]) {
        fill: var(--media-live-button-indicator-color, rgb(255, 0, 0));
        color: var(--media-live-button-indicator-color, rgb(255, 0, 0));
      }

      :host([${qo}]:not([${Jo}])) {
        cursor: var(--media-cursor, not-allowed);
      }

      slot[name=text]{
        text-transform: uppercase;
      }

    </style>

    <slot name="indicator">${Zo}</slot>
    
    <slot name="spacer">&nbsp;</slot><slot name="text">${T(`live`)}</slot>
  `}var $o=e=>{let t=e.mediaPaused||!e.mediaTimeIsLive,n=T(t?`seek to live`:`playing live`);e.setAttribute(`aria-label`,n);let r=e.shadowRoot?.querySelector(`slot[name="text"]`);r&&(r.textContent=T(`live`)),t?e.removeAttribute(`aria-disabled`):e.setAttribute(`aria-disabled`,`true`)},es=class extends G{static get observedAttributes(){return[...super.observedAttributes,qo,Jo]}connectedCallback(){super.connectedCallback(),$o(this)}attributeChangedCallback(e,t,n){super.attributeChangedCallback(e,t,n),$o(this)}get mediaPaused(){return M(this,S.MEDIA_PAUSED)}set mediaPaused(e){N(this,S.MEDIA_PAUSED,e)}get mediaTimeIsLive(){return M(this,S.MEDIA_TIME_IS_LIVE)}set mediaTimeIsLive(e){N(this,S.MEDIA_TIME_IS_LIVE,e)}handleClick(){(this.mediaPaused||!this.mediaTimeIsLive)&&(this.dispatchEvent(new D.CustomEvent(Yo,{composed:!0,bubbles:!0})),this.hasAttribute(Jo)&&this.dispatchEvent(new D.CustomEvent(Xo,{composed:!0,bubbles:!0})))}};es.getSlotTemplateHTML=Qo,D.customElements.get(`media-live-button`)||D.customElements.define(`media-live-button`,es);var ts=es,ns=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},rs=(e,t,n)=>(ns(e,t,`read from private field`),n?n.call(e):t.get(e)),is=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},as=(e,t,n,r)=>(ns(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),os,ss,cs={LOADING_DELAY:`loadingdelay`,NO_AUTOHIDE:`noautohide`},ls=500,us=`
<svg aria-hidden="true" viewBox="0 0 100 100">
  <path d="M73,50c0-12.7-10.3-23-23-23S27,37.3,27,50 M30.9,50c0-10.5,8.5-19.1,19.1-19.1S69.1,39.5,69.1,50">
    <animateTransform
       attributeName="transform"
       attributeType="XML"
       type="rotate"
       dur="1s"
       from="0 50 50"
       to="360 50 50"
       repeatCount="indefinite" />
  </path>
</svg>
`;function ds(e){return`
    <style>
      :host {
        display: var(--media-control-display, var(--media-loading-indicator-display, inline-block));
        vertical-align: middle;
        box-sizing: border-box;
        --_loading-indicator-delay: var(--media-loading-indicator-transition-delay, ${ls}ms);
      }

      #status {
        color: rgba(0,0,0,0);
        width: 0px;
        height: 0px;
      }

      :host slot[name=icon] > *,
      :host ::slotted([slot=icon]) {
        opacity: var(--media-loading-indicator-opacity, 0);
        transition: opacity 0.15s;
      }

      :host([${S.MEDIA_LOADING}]:not([${S.MEDIA_PAUSED}])) slot[name=icon] > *,
      :host([${S.MEDIA_LOADING}]:not([${S.MEDIA_PAUSED}])) ::slotted([slot=icon]) {
        opacity: var(--media-loading-indicator-opacity, 1);
        transition: opacity 0.15s var(--_loading-indicator-delay);
      }

      :host #status {
        visibility: var(--media-loading-indicator-opacity, hidden);
        transition: visibility 0.15s;
      }

      :host([${S.MEDIA_LOADING}]:not([${S.MEDIA_PAUSED}])) #status {
        visibility: var(--media-loading-indicator-opacity, visible);
        transition: visibility 0.15s var(--_loading-indicator-delay);
      }

      svg, img, ::slotted(svg), ::slotted(img) {
        width: var(--media-loading-indicator-icon-width);
        height: var(--media-loading-indicator-icon-height, 100px);
        fill: var(--media-icon-color, var(--media-primary-color, rgb(238 238 238)));
        vertical-align: middle;
      }
    </style>

    <slot name="icon">${us}</slot>
    <div id="status" role="status" aria-live="polite">${T(`media loading`)}</div>
  `}var fs=class extends D.HTMLElement{constructor(){if(super(),is(this,os,void 0),is(this,ss,ls),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);let e=lt(this.attributes);this.shadowRoot.innerHTML=this.constructor.getTemplateHTML(e)}}static get observedAttributes(){return[x.MEDIA_CONTROLLER,S.MEDIA_PAUSED,S.MEDIA_LOADING,cs.LOADING_DELAY]}attributeChangedCallback(e,t,n){var r,i,a,o;e===cs.LOADING_DELAY&&t!==n?this.loadingDelay=Number(n):e===x.MEDIA_CONTROLLER&&(t&&((i=(r=rs(this,os))?.unassociateElement)==null||i.call(r,this),as(this,os,null)),n&&this.isConnected&&(as(this,os,this.getRootNode()?.getElementById(n)),(o=(a=rs(this,os))?.associateElement)==null||o.call(a,this)))}connectedCallback(){var e,t;let n=this.getAttribute(x.MEDIA_CONTROLLER);n&&(as(this,os,this.getRootNode()?.getElementById(n)),(t=(e=rs(this,os))?.associateElement)==null||t.call(e,this))}disconnectedCallback(){var e,t;(t=(e=rs(this,os))?.unassociateElement)==null||t.call(e,this),as(this,os,null)}get loadingDelay(){return rs(this,ss)}set loadingDelay(e){as(this,ss,e);let{style:t}=k(this.shadowRoot,`:host`);t.setProperty(`--_loading-indicator-delay`,`var(--media-loading-indicator-transition-delay, ${e}ms)`)}get mediaPaused(){return M(this,S.MEDIA_PAUSED)}set mediaPaused(e){N(this,S.MEDIA_PAUSED,e)}get mediaLoading(){return M(this,S.MEDIA_LOADING)}set mediaLoading(e){N(this,S.MEDIA_LOADING,e)}get mediaController(){return P(this,x.MEDIA_CONTROLLER)}set mediaController(e){F(this,x.MEDIA_CONTROLLER,e)}get noAutohide(){return M(this,cs.NO_AUTOHIDE)}set noAutohide(e){N(this,cs.NO_AUTOHIDE,e)}};os=new WeakMap,ss=new WeakMap,fs.shadowRootOptions={mode:`open`},fs.getTemplateHTML=ds,D.customElements.get(`media-loading-indicator`)||D.customElements.define(`media-loading-indicator`,fs);var ps=fs,ms=`<svg aria-hidden="true" viewBox="0 0 24 24">
  <path d="M16.5 12A4.5 4.5 0 0 0 14 8v2.18l2.45 2.45a4.22 4.22 0 0 0 .05-.63Zm2.5 0a6.84 6.84 0 0 1-.54 2.64L20 16.15A8.8 8.8 0 0 0 21 12a9 9 0 0 0-7-8.77v2.06A7 7 0 0 1 19 12ZM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25A6.92 6.92 0 0 1 14 18.7v2.06A9 9 0 0 0 17.69 19l2 2.05L21 19.73l-9-9L4.27 3ZM12 4 9.91 6.09 12 8.18V4Z"/>
</svg>`,hs=`<svg aria-hidden="true" viewBox="0 0 24 24">
  <path d="M3 9v6h4l5 5V4L7 9H3Zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.47 4.47 0 0 0 2.5-4Z"/>
</svg>`,gs=`<svg aria-hidden="true" viewBox="0 0 24 24">
  <path d="M3 9v6h4l5 5V4L7 9H3Zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.47 4.47 0 0 0 2.5-4ZM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54Z"/>
</svg>`;function _s(e){return`
    <style>
      :host(:not([${S.MEDIA_VOLUME_LEVEL}])) slot[name=icon] slot:not([name=high]),
      :host([${S.MEDIA_VOLUME_LEVEL}=high]) slot[name=icon] slot:not([name=high]) {
        display: none !important;
      }

      :host([${S.MEDIA_VOLUME_LEVEL}=off]) slot[name=icon] slot:not([name=off]) {
        display: none !important;
      }

      :host([${S.MEDIA_VOLUME_LEVEL}=low]) slot[name=icon] slot:not([name=low]) {
        display: none !important;
      }

      :host([${S.MEDIA_VOLUME_LEVEL}=medium]) slot[name=icon] slot:not([name=medium]) {
        display: none !important;
      }

      :host(:not([${S.MEDIA_VOLUME_LEVEL}=off])) slot[name=tooltip-unmute],
      :host([${S.MEDIA_VOLUME_LEVEL}=off]) slot[name=tooltip-mute] {
        display: none;
      }
    </style>

    <slot name="icon">
      <slot name="off">${ms}</slot>
      <slot name="low">${hs}</slot>
      <slot name="medium">${hs}</slot>
      <slot name="high">${gs}</slot>
    </slot>
  `}function vs(){return`
    <slot name="tooltip-mute">${T(`Mute`)}</slot>
    <slot name="tooltip-unmute">${T(`Unmute`)}</slot>
  `}var ys=e=>{let t=e.mediaVolumeLevel===`off`?T(`unmute`):T(`mute`);e.setAttribute(`aria-label`,t)},bs=class extends G{static get observedAttributes(){return[...super.observedAttributes,S.MEDIA_VOLUME_LEVEL]}connectedCallback(){super.connectedCallback(),ys(this)}attributeChangedCallback(e,t,n){super.attributeChangedCallback(e,t,n),e===S.MEDIA_VOLUME_LEVEL&&ys(this)}get mediaVolumeLevel(){return P(this,S.MEDIA_VOLUME_LEVEL)}set mediaVolumeLevel(e){F(this,S.MEDIA_VOLUME_LEVEL,e)}handleClick(){let e=this.mediaVolumeLevel===`off`?b.MEDIA_UNMUTE_REQUEST:b.MEDIA_MUTE_REQUEST;this.dispatchEvent(new D.CustomEvent(e,{composed:!0,bubbles:!0}))}};bs.getSlotTemplateHTML=_s,bs.getTooltipContentHTML=vs,D.customElements.get(`media-mute-button`)||D.customElements.define(`media-mute-button`,bs);var xs=bs,Ss=`<svg aria-hidden="true" viewBox="0 0 28 24">
  <path d="M24 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h20a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1Zm-1 16H5V5h18v14Zm-3-8h-7v5h7v-5Z"/>
</svg>`;function Cs(e){return`
    <style>
      :host([${S.MEDIA_IS_PIP}]) slot[name=icon] slot:not([name=exit]) {
        display: none !important;
      }

      :host(:not([${S.MEDIA_IS_PIP}])) slot[name=icon] slot:not([name=enter]) {
        display: none !important;
      }

      :host([${S.MEDIA_IS_PIP}]) slot[name=tooltip-enter],
      :host(:not([${S.MEDIA_IS_PIP}])) slot[name=tooltip-exit] {
        display: none;
      }
    </style>

    <slot name="icon">
      <slot name="enter">${Ss}</slot>
      <slot name="exit">${Ss}</slot>
    </slot>
  `}function ws(){return`
    <slot name="tooltip-enter">${T(`Enter picture in picture mode`)}</slot>
    <slot name="tooltip-exit">${T(`Exit picture in picture mode`)}</slot>
  `}var Ts=e=>{let t=e.mediaIsPip?T(`exit picture in picture mode`):T(`enter picture in picture mode`);e.setAttribute(`aria-label`,t)},Es=class extends G{static get observedAttributes(){return[...super.observedAttributes,S.MEDIA_IS_PIP,S.MEDIA_PIP_UNAVAILABLE]}connectedCallback(){super.connectedCallback(),Ts(this)}attributeChangedCallback(e,t,n){super.attributeChangedCallback(e,t,n),e===S.MEDIA_IS_PIP&&Ts(this)}get mediaPipUnavailable(){return P(this,S.MEDIA_PIP_UNAVAILABLE)}set mediaPipUnavailable(e){F(this,S.MEDIA_PIP_UNAVAILABLE,e)}get mediaIsPip(){return M(this,S.MEDIA_IS_PIP)}set mediaIsPip(e){N(this,S.MEDIA_IS_PIP,e)}handleClick(){let e=this.mediaIsPip?b.MEDIA_EXIT_PIP_REQUEST:b.MEDIA_ENTER_PIP_REQUEST;this.dispatchEvent(new D.CustomEvent(e,{composed:!0,bubbles:!0}))}};Es.getSlotTemplateHTML=Cs,Es.getTooltipContentHTML=ws,D.customElements.get(`media-pip-button`)||D.customElements.define(`media-pip-button`,Es);var Ds=Es,Os=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},ks=(e,t,n)=>(Os(e,t,`read from private field`),n?n.call(e):t.get(e)),As=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},js,Ms={RATES:`rates`},Ns=[1,1.2,1.5,1.7,2];function Ps(e){return Math.round(e*100)/100}function Fs(e){return`
    <style>
      :host {
        min-width: 5ch;
        padding: var(--media-button-padding, var(--media-control-padding, 10px 5px));
      }
    </style>
    <slot name="icon">${e.mediaplaybackrate?Ps(+e.mediaplaybackrate):1}x</slot>
  `}function Is(){return T(`Playback rate`)}var Ls=class extends G{constructor(){super(),As(this,js,new yn(this,Ms.RATES,{defaultValue:Ns})),this.container=this.shadowRoot.querySelector(`slot[name="icon"]`),this.container.innerHTML=`${Ps(this.mediaPlaybackRate??1)}x`}static get observedAttributes(){return[...super.observedAttributes,S.MEDIA_PLAYBACK_RATE,Ms.RATES]}attributeChangedCallback(e,t,n){if(super.attributeChangedCallback(e,t,n),e===Ms.RATES&&(ks(this,js).value=n),e===S.MEDIA_PLAYBACK_RATE){let e=n?+n:NaN,t=Ps(Number.isNaN(e)?1:e);this.container.innerHTML=`${t}x`,this.setAttribute(`aria-label`,T(`Playback rate {playbackRate}`,{playbackRate:t}))}}get rates(){return ks(this,js)}set rates(e){e?Array.isArray(e)?ks(this,js).value=e.join(` `):typeof e==`string`&&(ks(this,js).value=e):ks(this,js).value=``}get mediaPlaybackRate(){return A(this,S.MEDIA_PLAYBACK_RATE,1)}set mediaPlaybackRate(e){j(this,S.MEDIA_PLAYBACK_RATE,e)}handleClick(){let e=Array.from(ks(this,js).values(),e=>+e).sort((e,t)=>e-t),t=e.find(e=>e>this.mediaPlaybackRate)??e[0]??1,n=new D.CustomEvent(b.MEDIA_PLAYBACK_RATE_REQUEST,{composed:!0,bubbles:!0,detail:t});this.dispatchEvent(n)}};js=new WeakMap,Ls.getSlotTemplateHTML=Fs,Ls.getTooltipContentHTML=Is,D.customElements.get(`media-playback-rate-button`)||D.customElements.define(`media-playback-rate-button`,Ls);var Rs=Ls,zs=`<svg aria-hidden="true" viewBox="0 0 24 24">
  <path d="m6 21 15-9L6 3v18Z"/>
</svg>`,Bs=`<svg aria-hidden="true" viewBox="0 0 24 24">
  <path d="M6 20h4V4H6v16Zm8-16v16h4V4h-4Z"/>
</svg>`;function Vs(e){return`
    <style>
      :host([${S.MEDIA_PAUSED}]) slot[name=pause],
      :host(:not([${S.MEDIA_PAUSED}])) slot[name=play] {
        display: none !important;
      }

      :host([${S.MEDIA_PAUSED}]) slot[name=tooltip-pause],
      :host(:not([${S.MEDIA_PAUSED}])) slot[name=tooltip-play] {
        display: none;
      }
    </style>

    <slot name="icon">
      <slot name="play">${zs}</slot>
      <slot name="pause">${Bs}</slot>
    </slot>
  `}function Hs(){return`
    <slot name="tooltip-play">${T(`Play`)}</slot>
    <slot name="tooltip-pause">${T(`Pause`)}</slot>
  `}var Us=e=>{let t=e.mediaPaused?T(`play`):T(`pause`);e.setAttribute(`aria-label`,t)},Ws=class extends G{static get observedAttributes(){return[...super.observedAttributes,S.MEDIA_PAUSED,S.MEDIA_ENDED]}connectedCallback(){super.connectedCallback(),Us(this)}attributeChangedCallback(e,t,n){super.attributeChangedCallback(e,t,n),(e===S.MEDIA_PAUSED||e===S.MEDIA_LANG)&&Us(this)}get mediaPaused(){return M(this,S.MEDIA_PAUSED)}set mediaPaused(e){N(this,S.MEDIA_PAUSED,e)}handleClick(){let e=this.mediaPaused?b.MEDIA_PLAY_REQUEST:b.MEDIA_PAUSE_REQUEST;this.dispatchEvent(new D.CustomEvent(e,{composed:!0,bubbles:!0}))}};Ws.getSlotTemplateHTML=Vs,Ws.getTooltipContentHTML=Hs,D.customElements.get(`media-play-button`)||D.customElements.define(`media-play-button`,Ws);var Gs=Ws,Ks={PLACEHOLDER_SRC:`placeholdersrc`,SRC:`src`};function qs(e){return`
    <style>
      :host {
        pointer-events: none;
        display: var(--media-poster-image-display, inline-block);
        box-sizing: border-box;
      }

      img {
        max-width: 100%;
        max-height: 100%;
        min-width: 100%;
        min-height: 100%;
        background-repeat: no-repeat;
        background-position: var(--media-poster-image-background-position, var(--media-object-position, center));
        background-size: var(--media-poster-image-background-size, var(--media-object-fit, contain));
        object-fit: var(--media-object-fit, contain);
        object-position: var(--media-object-position, center);
      }
    </style>

    <img part="poster img" aria-hidden="true" id="image"/>
  `}var Js=e=>{e.style.removeProperty(`background-image`)},Ys=(e,t)=>{e.style[`background-image`]=`url('${t}')`},Xs=class extends D.HTMLElement{static get observedAttributes(){return[Ks.PLACEHOLDER_SRC,Ks.SRC]}constructor(){if(super(),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);let e=lt(this.attributes);this.shadowRoot.innerHTML=this.constructor.getTemplateHTML(e)}this.image=this.shadowRoot.querySelector(`#image`)}attributeChangedCallback(e,t,n){e===Ks.SRC&&(n==null?this.image.removeAttribute(Ks.SRC):this.image.setAttribute(Ks.SRC,n)),e===Ks.PLACEHOLDER_SRC&&(n==null?Js(this.image):Ys(this.image,n))}get placeholderSrc(){return P(this,Ks.PLACEHOLDER_SRC)}set placeholderSrc(e){F(this,Ks.SRC,e)}get src(){return P(this,Ks.SRC)}set src(e){F(this,Ks.SRC,e)}};Xs.shadowRootOptions={mode:`open`},Xs.getTemplateHTML=qs,D.customElements.get(`media-poster-image`)||D.customElements.define(`media-poster-image`,Xs);var Zs=Xs,Qs=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},$s=(e,t,n)=>(Qs(e,t,`read from private field`),n?n.call(e):t.get(e)),ec=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},tc=(e,t,n,r)=>(Qs(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),nc,rc=class extends to{constructor(){super(),ec(this,nc,void 0),tc(this,nc,this.shadowRoot.querySelector(`slot`))}static get observedAttributes(){return[...super.observedAttributes,S.MEDIA_PREVIEW_CHAPTER,S.MEDIA_LANG]}attributeChangedCallback(e,t,n){if(super.attributeChangedCallback(e,t,n),(e===S.MEDIA_PREVIEW_CHAPTER||e===S.MEDIA_LANG)&&n!==t&&n!=null){if($s(this,nc).textContent=n,n!==``){let e=T(`chapter: {chapterName}`,{chapterName:n});this.setAttribute(`aria-valuetext`,e)}else this.removeAttribute(`aria-valuetext`)}}get mediaPreviewChapter(){return P(this,S.MEDIA_PREVIEW_CHAPTER)}set mediaPreviewChapter(e){F(this,S.MEDIA_PREVIEW_CHAPTER,e)}};nc=new WeakMap,D.customElements.get(`media-preview-chapter-display`)||D.customElements.define(`media-preview-chapter-display`,rc);var ic=rc,ac=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},oc=(e,t,n)=>(ac(e,t,`read from private field`),n?n.call(e):t.get(e)),sc=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},cc=(e,t,n,r)=>(ac(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),lc;function uc(e){return`
    <style>
      :host {
        box-sizing: border-box;
        display: var(--media-control-display, var(--media-preview-thumbnail-display, inline-block));
        overflow: hidden;
      }

      img {
        display: none;
        position: relative;
      }
    </style>
    <img crossorigin loading="eager" decoding="async">
  `}var dc=class extends D.HTMLElement{constructor(){if(super(),sc(this,lc,void 0),!this.shadowRoot){this.attachShadow(this.constructor.shadowRootOptions);let e=lt(this.attributes);this.shadowRoot.innerHTML=this.constructor.getTemplateHTML(e)}}static get observedAttributes(){return[x.MEDIA_CONTROLLER,S.MEDIA_PREVIEW_IMAGE,S.MEDIA_PREVIEW_COORDS]}connectedCallback(){var e,t;let n=this.getAttribute(x.MEDIA_CONTROLLER);n&&(cc(this,lc,this.getRootNode()?.getElementById(n)),(t=(e=oc(this,lc))?.associateElement)==null||t.call(e,this))}disconnectedCallback(){var e,t;(t=(e=oc(this,lc))?.unassociateElement)==null||t.call(e,this),cc(this,lc,null)}attributeChangedCallback(e,t,n){var r,i,a,o;[S.MEDIA_PREVIEW_IMAGE,S.MEDIA_PREVIEW_COORDS].includes(e)&&this.update(),e===x.MEDIA_CONTROLLER&&(t&&((i=(r=oc(this,lc))?.unassociateElement)==null||i.call(r,this),cc(this,lc,null)),n&&this.isConnected&&(cc(this,lc,this.getRootNode()?.getElementById(n)),(o=(a=oc(this,lc))?.associateElement)==null||o.call(a,this)))}get mediaPreviewImage(){return P(this,S.MEDIA_PREVIEW_IMAGE)}set mediaPreviewImage(e){F(this,S.MEDIA_PREVIEW_IMAGE,e)}get mediaPreviewCoords(){let e=this.getAttribute(S.MEDIA_PREVIEW_COORDS);if(e)return e.split(/\s+/).map(e=>+e)}set mediaPreviewCoords(e){e?this.setAttribute(S.MEDIA_PREVIEW_COORDS,e.join(` `)):this.removeAttribute(S.MEDIA_PREVIEW_COORDS)}update(){let e=this.mediaPreviewCoords,t=this.mediaPreviewImage;if(!(e&&t))return;let[n,r,i,a]=e,o=t.split(`#`)[0],s=getComputedStyle(this),{maxWidth:c,maxHeight:l,minWidth:u,minHeight:d}=s,f=s.getPropertyValue(`--media-preview-thumbnail-object-fit`).trim()||`contain`,p,m;if(f===`fill`){let e=parseInt(c)/i,t=parseInt(l)/a,n=parseInt(u)/i,r=parseInt(d)/a;p=e<1?e:Math.max(e,n),m=t<1?t:Math.max(t,r)}else{let e=Math.min(parseInt(c)/i,parseInt(l)/a),t=Math.max(parseInt(u)/i,parseInt(d)/a),n=e<1?e:t>1?t:1;p=n,m=n}let{style:h}=k(this.shadowRoot,`:host`),ee=k(this.shadowRoot,`img`).style,g=this.shadowRoot.querySelector(`img`),te=Math.min(p,m)<1?`min`:`max`;h.setProperty(`${te}-width`,`initial`,`important`),h.setProperty(`${te}-height`,`initial`,`important`),h.width=`${i*p}px`,h.height=`${a*m}px`;let _=()=>{ee.width=`${this.imgWidth*p}px`,ee.height=`${this.imgHeight*m}px`,ee.display=`block`};g.src!==o&&(g.onload=()=>{this.imgWidth=g.naturalWidth,this.imgHeight=g.naturalHeight,_(),g.onload=null},g.src=o,_()),_(),ee.transform=`translate(-${n*p}px, -${r*m}px)`}};lc=new WeakMap,dc.shadowRootOptions={mode:`open`},dc.getTemplateHTML=uc,D.customElements.get(`media-preview-thumbnail`)||D.customElements.define(`media-preview-thumbnail`,dc);var fc=dc,pc=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},mc=(e,t,n)=>(pc(e,t,`read from private field`),n?n.call(e):t.get(e)),hc=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},gc=(e,t,n,r)=>(pc(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),_c,vc=class extends to{constructor(){super(),hc(this,_c,void 0),gc(this,_c,this.shadowRoot.querySelector(`slot`)),mc(this,_c).textContent=E(0)}static get observedAttributes(){return[...super.observedAttributes,S.MEDIA_PREVIEW_TIME]}attributeChangedCallback(e,t,n){super.attributeChangedCallback(e,t,n),e===S.MEDIA_PREVIEW_TIME&&n!=null&&(mc(this,_c).textContent=E(parseFloat(n)))}get mediaPreviewTime(){return A(this,S.MEDIA_PREVIEW_TIME)}set mediaPreviewTime(e){j(this,S.MEDIA_PREVIEW_TIME,e)}};_c=new WeakMap,D.customElements.get(`media-preview-time-display`)||D.customElements.define(`media-preview-time-display`,vc);var yc=vc,bc={SEEK_OFFSET:`seekoffset`},xc=30,Sc=e=>`
  <svg aria-hidden="true" viewBox="0 0 20 24">
    <defs>
      <style>.text{font-size:8px;font-family:Arial-BoldMT, Arial;font-weight:700;}</style>
    </defs>
    <text class="text value" transform="translate(2.18 19.87)">${e}</text>
    <path d="M10 6V3L4.37 7 10 10.94V8a5.54 5.54 0 0 1 1.9 10.48v2.12A7.5 7.5 0 0 0 10 6Z"/>
  </svg>`;function Cc(e,t){return`
    <slot name="icon">${Sc(t.seekOffset)}</slot>
  `}var wc=(e,t)=>{e.setAttribute(`aria-label`,T(`seek back {seekOffset} seconds`,{seekOffset:t}))};function Tc(){return T(`Seek backward`)}var Ec=0,Dc=class extends G{static get observedAttributes(){return[...super.observedAttributes,S.MEDIA_CURRENT_TIME,bc.SEEK_OFFSET]}connectedCallback(){super.connectedCallback(),this.seekOffset=A(this,bc.SEEK_OFFSET,xc)}attributeChangedCallback(e,t,n){super.attributeChangedCallback(e,t,n),wc(this,this.seekOffset),e===bc.SEEK_OFFSET&&(this.seekOffset=A(this,bc.SEEK_OFFSET,xc))}get seekOffset(){return A(this,bc.SEEK_OFFSET,xc)}set seekOffset(e){j(this,bc.SEEK_OFFSET,e),this.setAttribute(`aria-label`,T(`seek back {seekOffset} seconds`,{seekOffset:this.seekOffset})),ft(mt(this,`icon`),this.seekOffset)}get mediaCurrentTime(){return A(this,S.MEDIA_CURRENT_TIME,Ec)}set mediaCurrentTime(e){j(this,S.MEDIA_CURRENT_TIME,e)}handleClick(){let e=Math.max(this.mediaCurrentTime-this.seekOffset,0),t=new D.CustomEvent(b.MEDIA_SEEK_REQUEST,{composed:!0,bubbles:!0,detail:e});this.dispatchEvent(t)}};Dc.getSlotTemplateHTML=Cc,Dc.getTooltipContentHTML=Tc,D.customElements.get(`media-seek-backward-button`)||D.customElements.define(`media-seek-backward-button`,Dc);var Oc=Dc,kc={SEEK_OFFSET:`seekoffset`},Ac=30,jc=e=>`
  <svg aria-hidden="true" viewBox="0 0 20 24">
    <defs>
      <style>.text{font-size:8px;font-family:Arial-BoldMT, Arial;font-weight:700;}</style>
    </defs>
    <text class="text value" transform="translate(8.9 19.87)">${e}</text>
    <path d="M10 6V3l5.61 4L10 10.94V8a5.54 5.54 0 0 0-1.9 10.48v2.12A7.5 7.5 0 0 1 10 6Z"/>
  </svg>`;function Mc(e,t){return`
    <slot name="icon">${jc(t.seekOffset)}</slot>
  `}var Nc=(e,t)=>{e.setAttribute(`aria-label`,T(`seek forward {seekOffset} seconds`,{seekOffset:t}))};function Pc(){return T(`Seek forward`)}var Fc=0,Ic=class extends G{static get observedAttributes(){return[...super.observedAttributes,S.MEDIA_CURRENT_TIME,kc.SEEK_OFFSET]}connectedCallback(){super.connectedCallback(),this.seekOffset=A(this,kc.SEEK_OFFSET,Ac)}attributeChangedCallback(e,t,n){super.attributeChangedCallback(e,t,n),Nc(this,this.seekOffset),e===kc.SEEK_OFFSET&&(this.seekOffset=A(this,kc.SEEK_OFFSET,Ac))}get seekOffset(){return A(this,kc.SEEK_OFFSET,Ac)}set seekOffset(e){j(this,kc.SEEK_OFFSET,e),this.setAttribute(`aria-label`,T(`seek forward {seekOffset} seconds`,{seekOffset:this.seekOffset})),ft(mt(this,`icon`),this.seekOffset)}get mediaCurrentTime(){return A(this,S.MEDIA_CURRENT_TIME,Fc)}set mediaCurrentTime(e){j(this,S.MEDIA_CURRENT_TIME,e)}handleClick(){let e=this.mediaCurrentTime+this.seekOffset,t=new D.CustomEvent(b.MEDIA_SEEK_REQUEST,{composed:!0,bubbles:!0,detail:e});this.dispatchEvent(t)}};Ic.getSlotTemplateHTML=Mc,Ic.getTooltipContentHTML=Pc,D.customElements.get(`media-seek-forward-button`)||D.customElements.define(`media-seek-forward-button`,Ic);var Lc=Ic,Rc=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},zc=(e,t,n)=>(Rc(e,t,`read from private field`),n?n.call(e):t.get(e)),Bc=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},Vc=(e,t,n,r)=>(Rc(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),Hc=(e,t,n)=>(Rc(e,t,`access private method`),n),Uc,Wc,Gc,Kc,qc,Jc,Yc,Xc,Zc,Qc,$c,el={REMAINING:`remaining`,SHOW_DURATION:`showduration`,NO_TOGGLE:`notoggle`},tl=[...Object.values(el),S.MEDIA_CURRENT_TIME,S.MEDIA_DURATION,S.MEDIA_SEEKABLE],nl=[`Enter`,` `],rl=`&nbsp;/&nbsp;`,il=(e,{timesSep:t=rl}={})=>{let n=e.mediaCurrentTime??0,[,r]=e.mediaSeekable??[],i=0;Number.isFinite(e.mediaDuration)?i=e.mediaDuration:Number.isFinite(r)&&(i=r);let a=e.remaining?E(0-(i-n)):E(n);return e.showDuration?`${a}${t}${E(i)}`:a},al=e=>{let t=e.mediaCurrentTime,[,n]=e.mediaSeekable??[],r=null;if(Number.isFinite(e.mediaDuration)?r=e.mediaDuration:Number.isFinite(n)&&(r=n),t==null||r===null){e.setAttribute(`aria-description`,T(`video not loaded, unknown time.`));return}let i=e.remaining?Ye(0-(r-t)):Ye(t);if(!e.showDuration){e.setAttribute(`aria-description`,i);return}let a=T(`{currentTime} of {totalTime}`,{currentTime:i,totalTime:Ye(r)});e.setAttribute(`aria-description`,a)};function ol(e,t){return`
    <slot>${il(t)}</slot>
  `}var sl=e=>{e.setAttribute(`aria-label`,T(`playback time`))},cl=class extends to{constructor(){super(),Bc(this,Kc),Bc(this,Jc),Bc(this,Xc),Bc(this,Qc),Bc(this,Uc,void 0),Bc(this,Wc,null),Bc(this,Gc,e=>{let{metaKey:t,altKey:n,key:r}=e;t||n||!nl.includes(r)?this.removeEventListener(`keyup`,zc(this,Wc)):this.addEventListener(`keyup`,zc(this,Wc))}),Vc(this,Uc,this.shadowRoot.querySelector(`slot`)),zc(this,Uc).innerHTML=`${il(this)}`}static get observedAttributes(){return[...super.observedAttributes,...tl,`disabled`]}connectedCallback(){let{style:e}=k(this.shadowRoot,`:host(:hover:not([notoggle]))`);e.setProperty(`cursor`,`var(--media-cursor, pointer)`),e.setProperty(`background`,`var(--media-control-hover-background, rgba(50 50 70 / .7))`),this.setAttribute(`aria-label`,T(`playback time`)),Hc(this,Xc,Zc).call(this),super.connectedCallback()}toggleTimeDisplay(){this.noToggle||(this.hasAttribute(`remaining`)?this.removeAttribute(`remaining`):this.setAttribute(`remaining`,``))}disconnectedCallback(){this.disable(),Hc(this,Jc,Yc).call(this),super.disconnectedCallback()}attributeChangedCallback(e,t,n){sl(this),tl.includes(e)?this.update():e===`disabled`&&n!==t?n==null?Hc(this,Xc,Zc).call(this):Hc(this,Qc,$c).call(this):e===el.NO_TOGGLE&&n!==t&&(this.noToggle?Hc(this,Qc,$c).call(this):Hc(this,Xc,Zc).call(this)),super.attributeChangedCallback(e,t,n)}enable(){this.noToggle||(this.tabIndex=0)}disable(){this.tabIndex=-1}get remaining(){return M(this,el.REMAINING)}set remaining(e){N(this,el.REMAINING,e)}get showDuration(){return M(this,el.SHOW_DURATION)}set showDuration(e){N(this,el.SHOW_DURATION,e)}get noToggle(){return M(this,el.NO_TOGGLE)}set noToggle(e){N(this,el.NO_TOGGLE,e)}get mediaDuration(){return A(this,S.MEDIA_DURATION)}set mediaDuration(e){j(this,S.MEDIA_DURATION,e)}get mediaCurrentTime(){return A(this,S.MEDIA_CURRENT_TIME)}set mediaCurrentTime(e){j(this,S.MEDIA_CURRENT_TIME,e)}get mediaSeekable(){let e=this.getAttribute(S.MEDIA_SEEKABLE);if(e)return e.split(`:`).map(e=>+e)}set mediaSeekable(e){e==null?this.removeAttribute(S.MEDIA_SEEKABLE):this.setAttribute(S.MEDIA_SEEKABLE,e.join(`:`))}update(){let e=il(this);al(this),e!==zc(this,Uc).innerHTML&&(zc(this,Uc).innerHTML=e)}};Uc=new WeakMap,Wc=new WeakMap,Gc=new WeakMap,Kc=new WeakSet,qc=function(){zc(this,Wc)||(Vc(this,Wc,e=>{let{key:t}=e;nl.includes(t)?this.toggleTimeDisplay():this.removeEventListener(`keyup`,zc(this,Wc))}),this.addEventListener(`keydown`,zc(this,Gc)),this.addEventListener(`click`,this.toggleTimeDisplay))},Jc=new WeakSet,Yc=function(){zc(this,Wc)&&(this.removeEventListener(`keyup`,zc(this,Wc)),this.removeEventListener(`keydown`,zc(this,Gc)),this.removeEventListener(`click`,this.toggleTimeDisplay),Vc(this,Wc,null))},Xc=new WeakSet,Zc=function(){!this.noToggle&&!this.hasAttribute(`disabled`)&&(this.setAttribute(`role`,`button`),this.enable(),Hc(this,Kc,qc).call(this))},Qc=new WeakSet,$c=function(){this.removeAttribute(`role`),this.disable(),Hc(this,Jc,Yc).call(this)},cl.getSlotTemplateHTML=ol,D.customElements.get(`media-time-display`)||D.customElements.define(`media-time-display`,cl);var ll=cl,ul=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},J=(e,t,n)=>(ul(e,t,`read from private field`),n?n.call(e):t.get(e)),dl=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},Y=(e,t,n,r)=>(ul(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),fl=(e,t,n,r)=>({set _(r){Y(e,t,r,n)},get _(){return J(e,t,r)}}),pl,ml,hl,gl,_l,vl,yl,bl,xl,Sl,Cl=class{constructor(e,t,n){dl(this,pl,void 0),dl(this,ml,void 0),dl(this,hl,void 0),dl(this,gl,void 0),dl(this,_l,void 0),dl(this,vl,void 0),dl(this,yl,void 0),dl(this,bl,void 0),dl(this,xl,0),dl(this,Sl,(e=performance.now())=>{Y(this,xl,requestAnimationFrame(J(this,Sl))),Y(this,gl,performance.now()-J(this,hl));let t=1e3/this.fps;if(J(this,gl)>t){Y(this,hl,e-J(this,gl)%t);let n=1e3/((e-J(this,ml))/++fl(this,_l)._),r=(e-J(this,vl))/1e3/this.duration,i=J(this,yl)+r*this.playbackRate;i-J(this,pl).valueAsNumber>0?Y(this,bl,this.playbackRate/this.duration/n):(Y(this,bl,.995*J(this,bl)),i=J(this,pl).valueAsNumber+J(this,bl)),this.callback(i)}}),Y(this,pl,e),this.callback=t,this.fps=n}start(){J(this,xl)===0&&(Y(this,hl,performance.now()),Y(this,ml,J(this,hl)),Y(this,_l,0),J(this,Sl).call(this))}stop(){J(this,xl)!==0&&(cancelAnimationFrame(J(this,xl)),Y(this,xl,0))}update({start:e,duration:t,playbackRate:n}){let r=e-J(this,pl).valueAsNumber,i=Math.abs(t-this.duration);(r>0||r<-.5/t||i>=.5)&&this.callback(e),Y(this,yl,e),Y(this,vl,performance.now()),this.duration=t,this.playbackRate=n}};pl=new WeakMap,ml=new WeakMap,hl=new WeakMap,gl=new WeakMap,_l=new WeakMap,vl=new WeakMap,yl=new WeakMap,bl=new WeakMap,xl=new WeakMap,Sl=new WeakMap;var wl=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},X=(e,t,n)=>(wl(e,t,`read from private field`),n?n.call(e):t.get(e)),Z=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},Tl=(e,t,n,r)=>(wl(e,t,`write to private field`),r?r.call(e,n):t.set(e,n),n),El=(e,t,n)=>(wl(e,t,`access private method`),n),Dl,Ol,kl,Al,jl,Ml,Nl,Pl,Fl,Il,Ll,Rl,zl,Bl,Vl,Hl,Ul,Wl,Gl,Kl,ql,Jl,Yl,Xl,Zl,Ql,$l=e=>{let t=e.range,n=Ye(+nu(e)),r=Ye(+e.mediaSeekableEnd),i=n&&r?T(`{currentTime} of {totalTime}`,{currentTime:n,totalTime:r}):T(`video not loaded, unknown time.`);t.setAttribute(`aria-valuetext`,i)};function eu(e){return`
    <style>
      :host {
        --media-box-border-radius: 4px;
        --media-box-padding-left: 10px;
        --media-box-padding-right: 10px;
        --media-preview-border-radius: var(--media-box-border-radius);
        --media-box-arrow-offset: var(--media-box-border-radius);
        --_control-background: var(--media-control-background, var(--media-secondary-color, rgb(20 20 30 / .7)));
        --_preview-background: var(--media-preview-background, var(--_control-background));

        
        contain: layout;
      }

      #buffered {
        background: var(--media-time-range-buffered-color, rgb(255 255 255 / .4));
        position: absolute;
        height: 100%;
        will-change: width;
      }

      #preview-rail,
      #current-rail {
        width: 100%;
        position: absolute;
        left: 0;
        bottom: 100%;
        pointer-events: none;
        will-change: transform;
      }

      [part~="box"] {
        width: min-content;
        
        position: absolute;
        bottom: 100%;
        flex-direction: column;
        align-items: center;
        transform: translateX(-50%);
      }

      [part~="current-box"] {
        display: var(--media-current-box-display, var(--media-box-display, flex));
        margin: var(--media-current-box-margin, var(--media-box-margin, 0 0 5px));
        visibility: hidden;
      }

      [part~="preview-box"] {
        display: var(--media-preview-box-display, var(--media-box-display, flex));
        margin: var(--media-preview-box-margin, var(--media-box-margin, 0 0 5px));
        transition-property: var(--media-preview-transition-property, visibility, opacity);
        transition-duration: var(--media-preview-transition-duration-out, .25s);
        transition-delay: var(--media-preview-transition-delay-out, 0s);
        visibility: hidden;
        opacity: 0;
      }

      :host(:is([${S.MEDIA_PREVIEW_IMAGE}], [${S.MEDIA_PREVIEW_TIME}])[dragging]) [part~="preview-box"] {
        transition-duration: var(--media-preview-transition-duration-in, .5s);
        transition-delay: var(--media-preview-transition-delay-in, .25s);
        visibility: visible;
        opacity: 1;
      }

      @media (hover: hover) {
        :host(:is([${S.MEDIA_PREVIEW_IMAGE}], [${S.MEDIA_PREVIEW_TIME}]):hover) [part~="preview-box"] {
          transition-duration: var(--media-preview-transition-duration-in, .5s);
          transition-delay: var(--media-preview-transition-delay-in, .25s);
          visibility: visible;
          opacity: 1;
        }
      }

      media-preview-thumbnail,
      ::slotted(media-preview-thumbnail) {
        visibility: hidden;
        
        transition: visibility 0s .25s;
        transition-delay: calc(var(--media-preview-transition-delay-out, 0s) + var(--media-preview-transition-duration-out, .25s));
        background: var(--media-preview-thumbnail-background, var(--_preview-background));
        box-shadow: var(--media-preview-thumbnail-box-shadow, 0 0 4px rgb(0 0 0 / .2));
        max-width: var(--media-preview-thumbnail-max-width, 180px);
        max-height: var(--media-preview-thumbnail-max-height, 160px);
        min-width: var(--media-preview-thumbnail-min-width, 120px);
        min-height: var(--media-preview-thumbnail-min-height, 80px);
        border: var(--media-preview-thumbnail-border);
        border-radius: var(--media-preview-thumbnail-border-radius,
          var(--media-preview-border-radius) var(--media-preview-border-radius) 0 0);
      }

      :host([${S.MEDIA_PREVIEW_IMAGE}][dragging]) media-preview-thumbnail,
      :host([${S.MEDIA_PREVIEW_IMAGE}][dragging]) ::slotted(media-preview-thumbnail) {
        transition-delay: var(--media-preview-transition-delay-in, .25s);
        visibility: visible;
      }

      @media (hover: hover) {
        :host([${S.MEDIA_PREVIEW_IMAGE}]:hover) media-preview-thumbnail,
        :host([${S.MEDIA_PREVIEW_IMAGE}]:hover) ::slotted(media-preview-thumbnail) {
          transition-delay: var(--media-preview-transition-delay-in, .25s);
          visibility: visible;
        }

        :host([${S.MEDIA_PREVIEW_TIME}]:hover) {
          --media-time-range-hover-display: block;
        }
      }

      media-preview-chapter-display,
      ::slotted(media-preview-chapter-display) {
        font-size: var(--media-font-size, 13px);
        line-height: 17px;
        min-width: 0;
        visibility: hidden;
        
        transition: min-width 0s, border-radius 0s, margin 0s, padding 0s, visibility 0s;
        transition-delay: calc(var(--media-preview-transition-delay-out, 0s) + var(--media-preview-transition-duration-out, .25s));
        background: var(--media-preview-chapter-background, var(--_preview-background));
        border-radius: var(--media-preview-chapter-border-radius,
          var(--media-preview-border-radius) var(--media-preview-border-radius)
          var(--media-preview-border-radius) var(--media-preview-border-radius));
        padding: var(--media-preview-chapter-padding, 3.5px 9px);
        margin: var(--media-preview-chapter-margin, 0 0 5px);
        text-shadow: var(--media-preview-chapter-text-shadow, 0 0 4px rgb(0 0 0 / .75));
      }

      :host([${S.MEDIA_PREVIEW_IMAGE}]) media-preview-chapter-display,
      :host([${S.MEDIA_PREVIEW_IMAGE}]) ::slotted(media-preview-chapter-display) {
        transition-delay: var(--media-preview-transition-delay-in, .25s);
        border-radius: var(--media-preview-chapter-border-radius, 0);
        padding: var(--media-preview-chapter-padding, 3.5px 9px 0);
        margin: var(--media-preview-chapter-margin, 0);
        min-width: 100%;
      }

      media-preview-chapter-display[${S.MEDIA_PREVIEW_CHAPTER}],
      ::slotted(media-preview-chapter-display[${S.MEDIA_PREVIEW_CHAPTER}]) {
        visibility: visible;
      }

      media-preview-chapter-display:not([aria-valuetext]),
      ::slotted(media-preview-chapter-display:not([aria-valuetext])) {
        display: none;
      }

      media-preview-time-display,
      ::slotted(media-preview-time-display),
      media-time-display,
      ::slotted(media-time-display) {
        font-size: var(--media-font-size, 13px);
        line-height: 17px;
        min-width: 0;
        
        transition: min-width 0s, border-radius 0s;
        transition-delay: calc(var(--media-preview-transition-delay-out, 0s) + var(--media-preview-transition-duration-out, .25s));
        background: var(--media-preview-time-background, var(--_preview-background));
        border-radius: var(--media-preview-time-border-radius,
          var(--media-preview-border-radius) var(--media-preview-border-radius)
          var(--media-preview-border-radius) var(--media-preview-border-radius));
        padding: var(--media-preview-time-padding, 3.5px 9px);
        margin: var(--media-preview-time-margin, 0);
        text-shadow: var(--media-preview-time-text-shadow, 0 0 4px rgb(0 0 0 / .75));
        transform: translateX(min(
          max(calc(50% - var(--_box-width) / 2),
          calc(var(--_box-shift, 0))),
          calc(var(--_box-width) / 2 - 50%)
        ));
      }

      :host([${S.MEDIA_PREVIEW_IMAGE}]) media-preview-time-display,
      :host([${S.MEDIA_PREVIEW_IMAGE}]) ::slotted(media-preview-time-display) {
        transition-delay: var(--media-preview-transition-delay-in, .25s);
        border-radius: var(--media-preview-time-border-radius,
          0 0 var(--media-preview-border-radius) var(--media-preview-border-radius));
        min-width: 100%;
      }

      :host([${S.MEDIA_PREVIEW_TIME}]:hover) {
        --media-time-range-hover-display: block;
      }

      [part~="arrow"],
      ::slotted([part~="arrow"]) {
        display: var(--media-box-arrow-display, inline-block);
        transform: translateX(min(
          max(calc(50% - var(--_box-width) / 2 + var(--media-box-arrow-offset)),
          calc(var(--_box-shift, 0))),
          calc(var(--_box-width) / 2 - 50% - var(--media-box-arrow-offset))
        ));
        
        border-color: transparent;
        border-top-color: var(--media-box-arrow-background, var(--_control-background));
        border-width: var(--media-box-arrow-border-width,
          var(--media-box-arrow-height, 5px) var(--media-box-arrow-width, 6px) 0);
        border-style: solid;
        justify-content: center;
        height: 0;
      }
    </style>
    <div id="preview-rail">
      <slot name="preview" part="box preview-box">
        <media-preview-thumbnail>
          <template shadowrootmode="${fc.shadowRootOptions.mode}">
            ${fc.getTemplateHTML({})}
          </template>
        </media-preview-thumbnail>
        <media-preview-chapter-display></media-preview-chapter-display>
        <media-preview-time-display></media-preview-time-display>
        <slot name="preview-arrow"><div part="arrow"></div></slot>
      </slot>
    </div>
    <div id="current-rail">
      <slot name="current" part="box current-box">
        
      </slot>
    </div>
  `}var tu=(e,t=e.mediaCurrentTime)=>{let n=Number.isFinite(e.mediaSeekableStart)?e.mediaSeekableStart:0,r=Number.isFinite(e.mediaDuration)?e.mediaDuration:e.mediaSeekableEnd;if(Number.isNaN(r))return 0;let i=(t-n)/(r-n);return Math.max(0,Math.min(i,1))},nu=(e,t=e.range.valueAsNumber)=>{let n=Number.isFinite(e.mediaSeekableStart)?e.mediaSeekableStart:0,r=Number.isFinite(e.mediaDuration)?e.mediaDuration:e.mediaSeekableEnd;return Number.isNaN(r)?0:t*(r-n)+n},ru=class extends Ra{constructor(){super(),Z(this,Rl),Z(this,Vl),Z(this,Ul),Z(this,Gl),Z(this,ql),Z(this,Yl),Z(this,Zl),Z(this,Dl,null),Z(this,Ol,void 0),Z(this,kl,void 0),Z(this,Al,void 0),Z(this,jl,void 0),Z(this,Ml,void 0),Z(this,Nl,void 0),Z(this,Pl,void 0),Z(this,Fl,void 0),Z(this,Il,void 0),Z(this,Ll,()=>{El(this,Rl,zl).call(this)?X(this,Ol).start():X(this,Ol).stop()}),Z(this,Bl,e=>{this.dragging||(Be(e)&&(this.range.valueAsNumber=e),X(this,Il)||this.updateBar())}),this.shadowRoot.querySelector(`#track`).insertAdjacentHTML(`afterbegin`,`<div id="buffered" part="buffered"></div>`),Tl(this,kl,this.shadowRoot.querySelectorAll(`[part~="box"]`)),Tl(this,jl,this.shadowRoot.querySelector(`[part~="preview-box"]`)),Tl(this,Ml,this.shadowRoot.querySelector(`[part~="current-box"]`));let e=getComputedStyle(this);Tl(this,Nl,parseInt(e.getPropertyValue(`--media-box-padding-left`))),Tl(this,Pl,parseInt(e.getPropertyValue(`--media-box-padding-right`))),Tl(this,Ol,new Cl(this.range,X(this,Bl),60))}static get observedAttributes(){return[...super.observedAttributes,S.MEDIA_PAUSED,S.MEDIA_DURATION,S.MEDIA_SEEKABLE,S.MEDIA_CURRENT_TIME,S.MEDIA_PREVIEW_IMAGE,S.MEDIA_PREVIEW_TIME,S.MEDIA_PREVIEW_CHAPTER,S.MEDIA_BUFFERED,S.MEDIA_PLAYBACK_RATE,S.MEDIA_LOADING,S.MEDIA_ENDED]}connectedCallback(){var e;super.connectedCallback(),this.range.setAttribute(`aria-label`,T(`seek`)),X(this,Ll).call(this),Tl(this,Dl,this.getRootNode()),(e=X(this,Dl))==null||e.addEventListener(`transitionstart`,this)}disconnectedCallback(){var e;super.disconnectedCallback(),X(this,Ol).stop(),(e=X(this,Dl))==null||e.removeEventListener(`transitionstart`,this),Tl(this,Dl,null)}attributeChangedCallback(e,t,n){super.attributeChangedCallback(e,t,n),t!=n&&(e===S.MEDIA_CURRENT_TIME||e===S.MEDIA_PAUSED||e===S.MEDIA_ENDED||e===S.MEDIA_LOADING||e===S.MEDIA_DURATION||e===S.MEDIA_SEEKABLE?(X(this,Ol).update({start:tu(this),duration:this.mediaSeekableEnd-this.mediaSeekableStart,playbackRate:this.mediaPlaybackRate}),X(this,Ll).call(this),$l(this)):e===S.MEDIA_BUFFERED&&this.updateBufferedBar(),(e===S.MEDIA_DURATION||e===S.MEDIA_SEEKABLE)&&(this.mediaChaptersCues=X(this,Fl),this.updateBar()))}get mediaChaptersCues(){return X(this,Fl)}set mediaChaptersCues(e){Tl(this,Fl,e),this.updateSegments(X(this,Fl)?.map(e=>({start:tu(this,e.startTime),end:tu(this,e.endTime)})))}get mediaPaused(){return M(this,S.MEDIA_PAUSED)}set mediaPaused(e){N(this,S.MEDIA_PAUSED,e)}get mediaLoading(){return M(this,S.MEDIA_LOADING)}set mediaLoading(e){N(this,S.MEDIA_LOADING,e)}get mediaDuration(){return A(this,S.MEDIA_DURATION)}set mediaDuration(e){j(this,S.MEDIA_DURATION,e)}get mediaCurrentTime(){return A(this,S.MEDIA_CURRENT_TIME)}set mediaCurrentTime(e){j(this,S.MEDIA_CURRENT_TIME,e)}get mediaPlaybackRate(){return A(this,S.MEDIA_PLAYBACK_RATE,1)}set mediaPlaybackRate(e){j(this,S.MEDIA_PLAYBACK_RATE,e)}get mediaBuffered(){let e=this.getAttribute(S.MEDIA_BUFFERED);return e?e.split(` `).map(e=>e.split(`:`).map(e=>+e)):[]}set mediaBuffered(e){if(!e){this.removeAttribute(S.MEDIA_BUFFERED);return}let t=e.map(e=>e.join(`:`)).join(` `);this.setAttribute(S.MEDIA_BUFFERED,t)}get mediaSeekable(){let e=this.getAttribute(S.MEDIA_SEEKABLE);if(e)return e.split(`:`).map(e=>+e)}set mediaSeekable(e){e==null?this.removeAttribute(S.MEDIA_SEEKABLE):this.setAttribute(S.MEDIA_SEEKABLE,e.join(`:`))}get mediaSeekableEnd(){let[,e=this.mediaDuration]=this.mediaSeekable??[];return e}get mediaSeekableStart(){let[e=0]=this.mediaSeekable??[];return e}get mediaPreviewImage(){return P(this,S.MEDIA_PREVIEW_IMAGE)}set mediaPreviewImage(e){F(this,S.MEDIA_PREVIEW_IMAGE,e)}get mediaPreviewTime(){return A(this,S.MEDIA_PREVIEW_TIME)}set mediaPreviewTime(e){j(this,S.MEDIA_PREVIEW_TIME,e)}get mediaEnded(){return M(this,S.MEDIA_ENDED)}set mediaEnded(e){N(this,S.MEDIA_ENDED,e)}updateBar(){super.updateBar(),this.updateBufferedBar(),this.updateCurrentBox()}updateBufferedBar(){let e=this.mediaBuffered;if(!e.length)return;let t;if(this.mediaEnded)t=1;else{let n=this.mediaCurrentTime,[,r=this.mediaSeekableStart]=e.find(([e,t])=>e<=n&&n<=t)??[];t=tu(this,r)}let{style:n}=k(this.shadowRoot,`#buffered`);n.setProperty(`width`,`${t*100}%`)}updateCurrentBox(){if(!this.shadowRoot.querySelector(`slot[name="current"]`).assignedElements().length)return;let e=k(this.shadowRoot,`#current-rail`),t=k(this.shadowRoot,`[part~="current-box"]`),n=El(this,Vl,Hl).call(this,X(this,Ml)),r=El(this,Ul,Wl).call(this,n,this.range.valueAsNumber),i=El(this,Gl,Kl).call(this,n,this.range.valueAsNumber);e.style.transform=`translateX(${r})`,e.style.setProperty(`--_range-width`,`${n.range.width}`),t.style.setProperty(`--_box-shift`,`${i}`),t.style.setProperty(`--_box-width`,`${n.box.width}px`),t.style.setProperty(`visibility`,`initial`)}handleEvent(e){switch(super.handleEvent(e),e.type){case`input`:El(this,Zl,Ql).call(this);break;case`pointermove`:El(this,ql,Jl).call(this,e);break;case`pointerup`:X(this,Il)&&Tl(this,Il,!1);break;case`pointerdown`:Tl(this,Il,!0);break;case`pointerleave`:El(this,Yl,Xl).call(this,null);break;case`transitionstart`:ht(e.target,this)&&setTimeout(()=>X(this,Ll).call(this),0)}}};Dl=new WeakMap,Ol=new WeakMap,kl=new WeakMap,Al=new WeakMap,jl=new WeakMap,Ml=new WeakMap,Nl=new WeakMap,Pl=new WeakMap,Fl=new WeakMap,Il=new WeakMap,Ll=new WeakMap,Rl=new WeakSet,zl=function(){return this.isConnected&&!this.mediaPaused&&!this.mediaLoading&&!this.mediaEnded&&this.mediaSeekableEnd>0&&yt(this)},Bl=new WeakMap,Vl=new WeakSet,Hl=function(e){let t=((this.getAttribute(`bounds`)?gt(this,`#${this.getAttribute(`bounds`)}`):this.parentElement)??this).getBoundingClientRect(),n=this.range.getBoundingClientRect(),r=e.offsetWidth;return{box:{width:r,min:-(n.left-t.left-r/2),max:t.right-n.left-r/2},bounds:t,range:n}},Ul=new WeakSet,Wl=function(e,t){let n=`${t*100}%`,{width:r,min:i,max:a}=e.box;if(!r)return n;if(Number.isNaN(i)||(n=`max(${`calc(1 / var(--_range-width) * 100 * ${i}% + var(--media-box-padding-left))`}, ${n})`),!Number.isNaN(a)){let e=`calc(1 / var(--_range-width) * 100 * ${a}% - var(--media-box-padding-right))`;n=`min(${n}, ${e})`}return n},Gl=new WeakSet,Kl=function(e,t){let{width:n,min:r,max:i}=e.box,a=t*e.range.width;if(a<r+X(this,Nl)){let t=e.range.left-e.bounds.left-X(this,Nl);return`${a-n/2+t}px`}if(a>i-X(this,Pl)){let t=e.bounds.right-e.range.right-X(this,Pl);return`${a+n/2-t-e.range.width}px`}return 0},ql=new WeakSet,Jl=function(e){let t=[...X(this,kl)].some(t=>e.composedPath().includes(t));if(!this.dragging&&(t||!e.composedPath().includes(this))){El(this,Yl,Xl).call(this,null);return}let n=this.mediaSeekableEnd;if(!n)return;let r=k(this.shadowRoot,`#preview-rail`),i=k(this.shadowRoot,`[part~="preview-box"]`),a=El(this,Vl,Hl).call(this,X(this,jl)),o=(e.clientX-a.range.left)/a.range.width;o=Math.max(0,Math.min(1,o));let s=El(this,Ul,Wl).call(this,a,o),c=El(this,Gl,Kl).call(this,a,o);r.style.transform=`translateX(${s})`,r.style.setProperty(`--_range-width`,`${a.range.width}`),i.style.setProperty(`--_box-shift`,`${c}`),i.style.setProperty(`--_box-width`,`${a.box.width}px`);let l=Math.round(X(this,Al))-Math.round(o*n);Math.abs(l)<1&&o>.01&&o<.99||(Tl(this,Al,o*n),El(this,Yl,Xl).call(this,X(this,Al)))},Yl=new WeakSet,Xl=function(e){this.dispatchEvent(new D.CustomEvent(b.MEDIA_PREVIEW_REQUEST,{composed:!0,bubbles:!0,detail:e}))},Zl=new WeakSet,Ql=function(){X(this,Ol).stop();let e=nu(this);this.dispatchEvent(new D.CustomEvent(b.MEDIA_SEEK_REQUEST,{composed:!0,bubbles:!0,detail:e}))},ru.shadowRootOptions={mode:`open`},ru.getContainerTemplateHTML=eu,D.customElements.get(`media-time-range`)||D.customElements.define(`media-time-range`,ru);var iu=ru,au=(e,t,n)=>{if(!t.has(e))throw TypeError(`Cannot `+n)},ou=(e,t,n)=>(au(e,t,`read from private field`),n?n.call(e):t.get(e)),su=(e,t,n)=>{if(t.has(e))throw TypeError(`Cannot add the same private member more than once`);t instanceof WeakSet?t.add(e):t.set(e,n)},cu,lu=1,uu=e=>e.mediaMuted?0:e.mediaVolume,du=e=>`${Math.round(e*100)}%`,fu=class extends Ra{constructor(){super(...arguments),su(this,cu,()=>{let e=this.range.value,t=new D.CustomEvent(b.MEDIA_VOLUME_REQUEST,{composed:!0,bubbles:!0,detail:e});this.dispatchEvent(t)})}static get observedAttributes(){return[...super.observedAttributes,S.MEDIA_VOLUME,S.MEDIA_MUTED,S.MEDIA_VOLUME_UNAVAILABLE]}connectedCallback(){super.connectedCallback(),this.range.setAttribute(`aria-label`,T(`volume`)),this.range.addEventListener(`input`,ou(this,cu))}disconnectedCallback(){this.range.removeEventListener(`input`,ou(this,cu)),super.disconnectedCallback()}attributeChangedCallback(e,t,n){super.attributeChangedCallback(e,t,n),(e===S.MEDIA_VOLUME||e===S.MEDIA_MUTED)&&(this.range.valueAsNumber=uu(this),this.range.setAttribute(`aria-valuetext`,du(this.range.valueAsNumber)),this.updateBar())}get mediaVolume(){return A(this,S.MEDIA_VOLUME,lu)}set mediaVolume(e){j(this,S.MEDIA_VOLUME,e)}get mediaMuted(){return M(this,S.MEDIA_MUTED)}set mediaMuted(e){N(this,S.MEDIA_MUTED,e)}get mediaVolumeUnavailable(){return P(this,S.MEDIA_VOLUME_UNAVAILABLE)}set mediaVolumeUnavailable(e){F(this,S.MEDIA_VOLUME_UNAVAILABLE,e)}};cu=new WeakMap,D.customElements.get(`media-volume-range`)||D.customElements.define(`media-volume-range`,fu);var pu=fu;function mu(e){return`
      <style>
        :host {
          min-width: 4ch;
          padding: var(--media-button-padding, var(--media-control-padding, 10px 5px));
          width: 100%;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 1rem;
          font-weight: var(--media-button-font-weight, normal);
        }

        #checked-indicator {
          display: none;
        }

        :host([${S.MEDIA_LOOP}]) #checked-indicator {
          display: block;
        }
      </style>
      
      <span id="icon">
     </span>

      <div id="checked-indicator">
        <svg aria-hidden="true" viewBox="0 1 24 24" part="checked-indicator indicator">
          <path d="m10 15.17 9.193-9.191 1.414 1.414-10.606 10.606-6.364-6.364 1.414-1.414 4.95 4.95Z"/>
        </svg>
      </div>
    `}function hu(){return T(`Loop`)}var gu=class extends G{constructor(){super(...arguments),this.container=null}static get observedAttributes(){return[...super.observedAttributes,S.MEDIA_LOOP]}connectedCallback(){super.connectedCallback(),this.container=this.shadowRoot?.querySelector(`#icon`)||null,this.container&&(this.container.textContent=T(`Loop`))}attributeChangedCallback(e,t,n){super.attributeChangedCallback(e,t,n),e===S.MEDIA_LOOP&&this.container&&this.setAttribute(`aria-checked`,this.mediaLoop?`true`:`false`)}get mediaLoop(){return M(this,S.MEDIA_LOOP)}set mediaLoop(e){N(this,S.MEDIA_LOOP,e)}handleClick(){let e=!this.mediaLoop,t=new D.CustomEvent(b.MEDIA_LOOP_REQUEST,{composed:!0,bubbles:!0,detail:e});this.dispatchEvent(t)}};gu.getSlotTemplateHTML=mu,gu.getTooltipContentHTML=hu,D.customElements.get(`media-loop-button`)||D.customElements.define(`media-loop-button`,gu);var _u=gu;function Q(e){if(typeof e==`boolean`)return e?``:void 0;if(typeof e!=`function`){if(Array.isArray(e)&&e.every(e=>typeof e==`string`||typeof e==`number`||typeof e==`boolean`))return e.join(` `);if(!(typeof e==`object`&&e))return e}}y({tagName:`media-gesture-receiver`,elementClass:At,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),y({tagName:`media-container`,elementClass:ln,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}});var vu=y({tagName:`media-controller`,elementClass:Jr,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}});y({tagName:`media-tooltip`,elementClass:Qr,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),y({tagName:`media-chrome-button`,elementClass:mi,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),y({tagName:`media-airplay-button`,elementClass:bi,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),y({tagName:`media-captions-button`,elementClass:ki,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),y({tagName:`media-cast-button`,elementClass:Ii,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),y({tagName:`media-chrome-dialog`,elementClass:sa,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),y({tagName:`media-chrome-range`,elementClass:za,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}});var yu=y({tagName:`media-control-bar`,elementClass:qa,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}});y({tagName:`media-text-display`,elementClass:no,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),y({tagName:`media-duration-display`,elementClass:uo,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),y({tagName:`media-error-dialog`,elementClass:To,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),y({tagName:`media-keyboard-shortcuts-dialog`,elementClass:Po,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),y({tagName:`media-fullscreen-button`,elementClass:Ko,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),y({tagName:`media-live-button`,elementClass:ts,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),y({tagName:`media-loading-indicator`,elementClass:ps,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}});var bu=y({tagName:`media-mute-button`,elementClass:xs,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}});y({tagName:`media-pip-button`,elementClass:Ds,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),y({tagName:`media-playback-rate-button`,elementClass:Rs,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}});var xu=y({tagName:`media-play-button`,elementClass:Gs,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}});y({tagName:`media-poster-image`,elementClass:Zs,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),y({tagName:`media-preview-chapter-display`,elementClass:ic,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),y({tagName:`media-preview-thumbnail`,elementClass:fc,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),y({tagName:`media-preview-time-display`,elementClass:yc,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}});var Su=y({tagName:`media-seek-backward-button`,elementClass:Oc,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),Cu=y({tagName:`media-seek-forward-button`,elementClass:Lc,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),wu=y({tagName:`media-time-display`,elementClass:ll,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),Tu=y({tagName:`media-time-range`,elementClass:iu,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}}),Eu=y({tagName:`media-volume-range`,elementClass:pu,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}});y({tagName:`media-loop-button`,elementClass:_u,react:v.default,toAttributeValue:Q,defaultProps:{suppressHydrationWarning:!0}});var $=ge();function Du({className:e,...t}){return(0,$.jsx)(vu,{className:Se(`video-player-root`,e),...t})}function Ou({className:e,...t}){return(0,$.jsx)(`video`,{slot:`media`,className:Se(e),playsInline:!0,...t})}function ku(e){return(0,$.jsx)(yu,{...e})}function Au(e){return(0,$.jsx)(xu,{...e})}function ju(e){return(0,$.jsx)(Su,{seekOffset:10,...e})}function Mu(e){return(0,$.jsx)(Cu,{seekOffset:10,...e})}function Nu(e){return(0,$.jsx)(Tu,{...e})}function Pu(e){return(0,$.jsx)(wu,{...e})}function Fu(e){return(0,$.jsx)(bu,{...e})}function Iu(e){return(0,$.jsx)(Eu,{...e})}function Lu(e){try{let t=new URL(e),n=t.hostname.replace(/^www\./,``),r=n.includes(`youtube.com`)||n.includes(`youtube-nocookie.com`)?t.pathname.match(/\/embed\/([A-Za-z0-9_-]{6,})/):n===`youtu.be`?t.pathname.match(/^\/([A-Za-z0-9_-]{6,})/):null;if(r?.[1]){let e=new URL(`https://www.youtube-nocookie.com/embed/${r[1]}`);return e.searchParams.set(`modestbranding`,`1`),e.searchParams.set(`rel`,`0`),e.searchParams.set(`playsinline`,`1`),e.toString()}if(n.includes(`vimeo.com`)){let e=t.pathname.match(/\/(?:video\/)?(\d+)/)?.[1];if(e){let t=new URL(`https://player.vimeo.com/video/${e}`);return t.searchParams.set(`title`,`0`),t.searchParams.set(`byline`,`0`),t.searchParams.set(`portrait`,`0`),t.toString()}}}catch{}return e}function Ru({title:e,videoUrl:t,fileUrl:n}){if(n)return(0,$.jsxs)(Du,{children:[(0,$.jsx)(Ou,{src:n,preload:`metadata`}),(0,$.jsxs)(ku,{children:[(0,$.jsx)(Au,{}),(0,$.jsx)(ju,{}),(0,$.jsx)(Mu,{}),(0,$.jsx)(Nu,{}),(0,$.jsx)(Pu,{showDuration:!0}),(0,$.jsx)(Fu,{}),(0,$.jsx)(Iu,{})]})]});if(t){let n=Lu(t);return(0,$.jsx)(`div`,{className:`aspect-video overflow-hidden rounded-card border border-border bg-muted`,children:(0,$.jsx)(`iframe`,{src:n,className:`size-full`,allowFullScreen:!0,title:e,allow:`accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share`,referrerPolicy:`strict-origin-when-cross-origin`})})}return(0,$.jsx)(`div`,{className:`flex aspect-video items-center justify-center rounded-card border border-border bg-muted text-sm text-muted-foreground`,children:(0,$.jsx)(_,{message:`No video available for this lesson.`})})}var zu={multiple_choice:`Multiple Choice`,true_false:`True or False`};function Bu(e){return zu[e]??e}function Vu(e){return e==null||e===``?`No answer`:e===`true`||e===`false`?e===`true`?`True`:`False`:e}function Hu(){let{courseId:e,lessonId:r}=ye(),c=xe(),[l,u]=(0,v.useState)(null),[g,ce]=(0,v.useState)(null),[pe,me]=(0,v.useState)(!1),[ge,Ce]=(0,v.useState)(),[we,Te]=(0,v.useState)(!1),[Ee,y]=(0,v.useState)(),[De,b]=(0,v.useState)(null),[,x]=(0,v.useState)(!1),[Oe,ke]=(0,v.useState)({}),[S,Ae]=(0,v.useState)(!1),[je,C]=(0,v.useState)(null),[Me,Ne]=(0,v.useState)([]),[w,Pe]=(0,v.useState)(!1),Fe=(0,v.useCallback)(async t=>{try{let n=await ne(String(e),String(r),t);u(n.data.data)}catch(e){if(oe(e)&&e.response?.status===403){me(!0);return}throw e}let n=await ie(String(e),t);ce(n.data.data)},[e,r]),Ie=(0,v.useCallback)(async e=>{Pe(!0);try{let t=await i.get(`/api/v1/quizzes/${e}/attempts`);Ne(t.data.data??[])}catch{Ne([])}finally{Pe(!1)}},[]);(0,v.useEffect)(()=>{let e=new AbortController;return me(!1),Ce(void 0),y(void 0),Fe(e.signal).catch(e=>{e instanceof DOMException&&e.name===`AbortError`||Ce(`Unable to load this lesson.`)}),()=>e.abort()},[Fe]),(0,v.useEffect)(()=>{if(!l?.id)return;let e=new AbortController;return b(null),ke({}),C(null),y(void 0),x(!0),i.get(`/api/v1/course-lessons/${l.id}/quiz`,{signal:e.signal}).then(e=>b(e.data.data??null)).catch(e=>{e instanceof DOMException&&e.name===`AbortError`||b(null)}).finally(()=>x(!1)),()=>e.abort()},[l?.id]),(0,v.useEffect)(()=>{De?.id?Ie(De.id):Ne([])},[De?.id,Ie]);let Le=async()=>{Te(!0),y(void 0);try{if(await re(String(e),String(r)),g){let t=g.chapters.flatMap(e=>e.lessons),n=t[t.findIndex(e=>e.id===Number(r))+1];c(n?`/my-portal/courses/${e}/lessons/${n.id}`:`/my-portal/courses/${e}`)}}catch(e){oe(e)&&e.response?.status===422?y(e.response?.data?.message??`Pass the quiz before completing this lesson.`):Ce(`Unable to update lesson progress.`)}finally{Te(!1)}},Re=(e,t)=>{ke(n=>({...n,[String(e)]:t}))},ze=async()=>{if(De){Ae(!0),y(void 0);try{let e=await i.post(`/api/v1/quizzes/${De.id}/attempts`,{answers:Oe});C(e.data.data),await Ie(De.id)}catch{y(`Unable to submit your quiz. Please try again.`)}finally{Ae(!1)}}},Be=()=>{ke({}),C(null),y(void 0)};if(pe)return(0,$.jsxs)(t,{wide:!0,children:[(0,$.jsxs)(n.Root,{variant:`warning`,fillStyle:`subtleFill`,children:[(0,$.jsx)(de,{className:`size-8 text-muted-foreground`}),(0,$.jsx)(n.Title,{children:(0,$.jsx)(_,{message:`Lesson locked`})}),(0,$.jsx)(n.Description,{children:(0,$.jsx)(_,{message:`This lesson is locked. Complete previous lessons to unlock.`})})]}),(0,$.jsx)(o,{className:`w-fit`,render:(0,$.jsx)(be,{to:`/my-portal/courses/${e}`}),children:(0,$.jsx)(_,{message:`Back to course`})})]});if(ge)return(0,$.jsxs)(t,{wide:!0,children:[(0,$.jsxs)(n.Root,{variant:`warning`,fillStyle:`subtleFill`,children:[(0,$.jsx)(n.Title,{children:(0,$.jsx)(_,{message:`Lesson unavailable`})}),(0,$.jsx)(n.Description,{children:ge})]}),(0,$.jsx)(o,{className:`w-fit`,render:(0,$.jsx)(be,{to:`/my-portal`}),children:(0,$.jsx)(_,{message:`Back to My Portal`})})]});if(!l&&!ge&&!pe)return(0,$.jsx)(t,{wide:!0,children:(0,$.jsx)(`div`,{className:`flex min-h-64 items-center justify-center`,children:(0,$.jsx)(a,{})})});if(!l)return(0,$.jsxs)(t,{wide:!0,children:[(0,$.jsxs)(n.Root,{variant:`warning`,fillStyle:`subtleFill`,children:[(0,$.jsx)(n.Title,{children:(0,$.jsx)(_,{message:`Lesson unavailable`})}),(0,$.jsx)(n.Description,{children:ge??(0,$.jsx)(_,{message:`This lesson could not be loaded.`})})]}),(0,$.jsx)(o,{className:`w-fit`,render:(0,$.jsx)(be,{to:`/my-portal`}),children:(0,$.jsx)(_,{message:`Back to My Portal`})})]});let Ve=De?(0,$.jsx)(Uu,{quiz:De,answers:Oe,onAnswer:Re,onSubmit:()=>void ze(),submitting:S,result:je,onRetake:Be,attempts:Me,attemptsLoading:w}):null,He=g?.unlocked_lesson_ids??g?.progress?.unlocked_lesson_ids??[],Ue=g?.progress?.completed_lesson_ids??[],We=g?.progress?.percent??0,Ge=g?.product?.title??null,Ke=g?.progress?.completed??0,T=g?.progress?.total??0,qe=g?(0,$.jsxs)(s.Root,{className:`gap-3 p-4 shadow-none`,children:[(0,$.jsxs)(`div`,{className:`flex items-center justify-between text-sm`,children:[(0,$.jsx)(`span`,{className:`font-medium`,children:(0,$.jsx)(_,{message:`Your progress`})}),(0,$.jsxs)(`span`,{className:`tabular-nums text-muted-foreground`,children:[Ke,`/`,T]})]}),(0,$.jsx)(d.Root,{value:We,"aria-label":`Course progress`,children:(0,$.jsx)(d.Track,{className:`h-1.5`,children:(0,$.jsx)(d.Indicator,{})})})]}):null,Je=g?(0,$.jsx)(s.Root,{className:`gap-0 overflow-hidden py-0 shadow-none`,children:(0,$.jsx)(s.Content,{className:`p-0`,children:(0,$.jsx)(`div`,{className:`max-h-[60vh] overflow-y-auto lg:max-h-[calc(100vh-14rem)]`,children:(0,$.jsx)(ae,{courseId:Number(e),chapters:g.chapters??[],completedLessonIds:Ue,unlockedLessonIds:He,activeLessonId:Number(r),requireSequential:g.require_sequential_completion,courseTitle:Ge})})})}):null,Ye=g?(0,$.jsxs)(`aside`,{className:`flex flex-col gap-4`,"aria-label":`Course contents`,children:[qe,Je]}):null,E=g?g.chapters.flatMap(e=>(e.lessons??[]).map(t=>({...t,chapterTitle:e.title}))):[],Xe=E.findIndex(e=>e.id===Number(r)),Ze=Xe>0?E[Xe-1]:null,Qe=Xe>=0&&Xe<E.length-1?E[Xe+1]:null,$e=E[Xe]?.chapterTitle??null,et=Ue.includes(Number(r)),tt=l.id!==Number(r),nt=l.resources.length>0?(0,$.jsx)(`ul`,{className:`divide-y divide-border overflow-hidden rounded-card border border-border bg-card`,children:l.resources.map(e=>(0,$.jsxs)(`li`,{className:`flex items-center gap-3 px-4 py-3`,children:[(0,$.jsx)(`span`,{className:`flex size-9 shrink-0 items-center justify-center rounded-button bg-secondary`,children:(0,$.jsx)(fe,{className:`size-4`,"aria-hidden":`true`})}),(0,$.jsx)(`div`,{className:`min-w-0 flex-1`,children:(0,$.jsx)(`p`,{className:`truncate text-sm font-medium`,children:e.display_name})}),(0,$.jsx)(o,{size:`icon`,variant:`ghost`,"aria-label":`Download ${e.display_name}`,render:(0,$.jsx)(`a`,{href:`/api/v1/course-lesson-resources/${e.id}/download`}),children:(0,$.jsx)(he,{})})]},e.id))}):(0,$.jsx)(`p`,{className:`text-sm text-muted-foreground`,children:(0,$.jsx)(_,{message:`No attachments added yet.`})}),rt=$e&&!/^course curriculum$/i.test($e)&&(!Ge||$e.trim().toLowerCase()!==Ge.trim().toLowerCase())?$e:null,D=Xe>=0&&E.length>0?(0,$.jsx)(_,{message:`Lesson :current of :total`,values:{current:Xe+1,total:E.length}}):null,O=(0,$.jsxs)(`p`,{className:`text-pretty leading-relaxed text-muted-foreground`,children:[(0,$.jsx)(_,{message:`No summary added for this lesson yet.`}),l.resources.length>0?(0,$.jsxs)($.Fragment,{children:[` `,(0,$.jsx)(_,{message:`Check the Resources tab for attachments.`})]}):null]}),it=l.content_type===`video`?l.summary?(0,$.jsx)(`div`,{className:`prose prose-sm max-w-none text-pretty leading-relaxed text-muted-foreground`,dangerouslySetInnerHTML:{__html:l.summary}}):O:l.content?(0,$.jsx)(`div`,{className:`prose prose-sm max-w-none text-pretty leading-relaxed`,dangerouslySetInnerHTML:{__html:l.content}}):(0,$.jsx)(`p`,{className:`text-pretty leading-relaxed text-muted-foreground`,children:(0,$.jsx)(_,{message:`No content added yet.`})});return(0,$.jsx)(t,{wide:!0,children:(0,$.jsxs)(`div`,{className:`flex flex-col gap-8`,children:[(0,$.jsxs)(`div`,{className:`flex flex-col gap-4`,children:[(0,$.jsxs)(`div`,{className:`flex flex-wrap items-center justify-between gap-3`,children:[(0,$.jsxs)(be,{to:`/my-portal?section=courses`,className:`inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground`,children:[(0,$.jsx)(se,{className:`size-4`,"aria-hidden":`true`}),(0,$.jsx)(_,{message:`My courses`})]}),g?(0,$.jsxs)(ee,{children:[(0,$.jsxs)(f,{render:(0,$.jsx)(o,{size:`sm`,variant:`outline`,className:`shrink-0 lg:hidden`}),children:[(0,$.jsx)(le,{"data-icon":`inline-start`}),(0,$.jsx)(_,{message:`Curriculum`})]}),(0,$.jsxs)(m,{side:`right`,className:`w-full max-w-md overflow-y-auto p-4 sm:max-w-md`,children:[(0,$.jsx)(h,{className:`mb-4 p-0`,children:(0,$.jsx)(p,{children:(0,$.jsx)(_,{message:`Course curriculum`})})}),Ye]})]}):null]}),(0,$.jsxs)(`div`,{className:`flex min-w-0 flex-col gap-1`,children:[(0,$.jsxs)(`p`,{className:`text-xs font-medium tracking-wide text-muted-foreground uppercase`,children:[(0,$.jsx)(_,{message:`Course`}),g?.instructor?.name?` · ${g.instructor.name}`:null]}),(0,$.jsx)(`h1`,{className:`text-balance text-2xl font-semibold tracking-tight sm:text-3xl`,children:Ge??(0,$.jsx)(_,{message:`Course`})})]})]}),(0,$.jsxs)(`div`,{className:`grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8`,children:[(0,$.jsxs)(`div`,{className:Se(`flex min-w-0 flex-col gap-6 transition-opacity duration-150`,tt&&`opacity-60`),children:[l.content_type===`video`?(0,$.jsx)(Ru,{title:l.title,videoUrl:l.video_url,fileUrl:l.video?.url}):null,(0,$.jsxs)(`div`,{className:`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`,children:[(0,$.jsxs)(`div`,{className:`flex min-w-0 flex-col gap-1`,children:[(0,$.jsx)(`p`,{className:`text-xs font-medium text-muted-foreground`,children:rt??D}),(0,$.jsx)(`h2`,{className:`text-pretty text-xl font-semibold tracking-tight`,children:l.title})]}),(0,$.jsxs)(`div`,{className:`flex flex-wrap items-center gap-2`,children:[(0,$.jsx)(o,{variant:`outline`,size:`icon`,disabled:!Ze||we,"aria-label":`Previous lesson`,onClick:()=>{Ze&&c(`/my-portal/courses/${e}/lessons/${Ze.id}`)},children:(0,$.jsx)(ue,{})}),(0,$.jsxs)(o,{variant:et?`outline`:`default`,disabled:we,onClick:()=>void Le(),children:[we?(0,$.jsx)(a,{}):(0,$.jsx)(ve,{"data-icon":`inline-start`}),et?(0,$.jsx)(_,{message:`Completed`}):(0,$.jsx)(_,{message:`Mark complete`})]}),(0,$.jsx)(o,{variant:`outline`,size:`icon`,disabled:!Qe||we,"aria-label":`Next lesson`,onClick:()=>{Qe&&c(`/my-portal/courses/${e}/lessons/${Qe.id}`)},children:(0,$.jsx)(_e,{})})]})]}),Ee?(0,$.jsx)(n.Root,{variant:`warning`,fillStyle:`subtleFill`,children:(0,$.jsx)(n.Description,{children:Ee})}):null,(0,$.jsxs)(te.Root,{defaultValue:`overview`,className:`w-full gap-4`,children:[(0,$.jsxs)(te.List,{variant:`line`,className:`w-full`,children:[(0,$.jsx)(te.Tab,{value:`overview`,children:(0,$.jsx)(_,{message:`Overview`})}),(0,$.jsx)(te.Tab,{value:`resources`,children:(0,$.jsx)(_,{message:`Resources`})}),De?(0,$.jsx)(te.Tab,{value:`quiz`,children:(0,$.jsx)(_,{message:`Quiz`})}):null]}),(0,$.jsx)(te.Panel,{value:`overview`,children:(0,$.jsx)(`div`,{className:`rounded-card border border-border bg-card p-5`,children:it})}),(0,$.jsx)(te.Panel,{value:`resources`,children:nt}),De?(0,$.jsx)(te.Panel,{value:`quiz`,children:Ve}):null]})]}),(0,$.jsx)(`div`,{className:`hidden lg:block`,children:(0,$.jsx)(`div`,{className:`sticky top-6 self-start`,children:Ye})})]})]})})}function Uu({quiz:e,answers:t,onAnswer:n,onSubmit:i,submitting:d,result:f,onRetake:p,attempts:m,attemptsLoading:h}){let ee=e.questions.every(e=>{let n=t[String(e.id)];return n!==void 0&&n!==``});return(0,$.jsxs)(`div`,{className:`flex flex-col gap-6`,children:[(0,$.jsxs)(`div`,{className:`flex flex-wrap items-center gap-2`,children:[(0,$.jsx)(r,{variant:`outline`,children:(0,$.jsx)(_,{message:`Passing score: :score%`,values:{score:e.passing_score}})}),(0,$.jsx)(r,{variant:e.require_pass_to_progress?`default`:`outline`,children:e.require_pass_to_progress?(0,$.jsx)(_,{message:`Required to progress`}):(0,$.jsx)(_,{message:`Optional`})})]}),f?(0,$.jsxs)(s.Root,{children:[(0,$.jsxs)(s.Header,{className:`p-4`,children:[(0,$.jsxs)(s.Title,{className:`flex items-center gap-2 text-sm`,children:[(0,$.jsx)(_,{message:`Quiz result`}),(0,$.jsx)(r,{variant:f.passed?`positive`:`destructive`,children:f.passed?(0,$.jsx)(_,{message:`Passed`}):(0,$.jsx)(_,{message:`Not passed`})})]}),(0,$.jsx)(s.Description,{children:(0,$.jsx)(_,{message:`You scored :score% (:correct of :total correct).`,values:{score:f.score,correct:f.correct,total:f.total}})})]}),(0,$.jsxs)(s.Content,{className:`flex flex-col gap-2 p-4 pt-0`,children:[f.details.map(t=>{let n=e.questions.find(e=>e.id===t.question_id);return(0,$.jsxs)(`div`,{className:`flex flex-col gap-2 rounded-card border p-3 text-sm`,children:[(0,$.jsx)(`p`,{className:`font-medium`,children:n?.question_text}),(0,$.jsxs)(`p`,{className:t.is_correct?`flex items-center gap-2 text-positive`:`flex items-center gap-2 text-destructive`,children:[t.is_correct?(0,$.jsx)(me,{className:`size-4`}):(0,$.jsx)(ce,{className:`size-4`}),(0,$.jsx)(_,{message:`Your answer: :answer`,values:{answer:Vu(t.given)}})]}),!t.is_correct&&(0,$.jsx)(`p`,{className:`text-muted-foreground`,children:(0,$.jsx)(_,{message:`Correct answer: :answer`,values:{answer:Vu(t.correct_answer)}})})]},t.question_id)}),(0,$.jsx)(o,{variant:`outline`,size:`sm`,className:`w-fit`,onClick:p,children:(0,$.jsx)(_,{message:`Retake quiz`})})]})]}):(0,$.jsxs)($.Fragment,{children:[e.questions.map((e,r)=>(0,$.jsxs)(s.Root,{children:[(0,$.jsxs)(s.Header,{className:`p-4`,children:[(0,$.jsx)(s.Title,{className:`text-sm`,children:(0,$.jsx)(_,{message:`Question :number`,values:{number:r+1}})}),(0,$.jsx)(s.Description,{children:e.question_text})]}),(0,$.jsxs)(s.Content,{className:`flex flex-col gap-2 p-4 pt-0`,children:[(0,$.jsx)(c.Root,{children:e.type===`multiple_choice`&&e.options?(0,$.jsx)(u,{value:t[String(e.id)]??``,onValueChange:t=>n(e.id,String(t)),children:e.options.map(e=>(0,$.jsx)(c.Item,{children:(0,$.jsxs)(c.Label,{children:[(0,$.jsx)(l,{value:e}),(0,$.jsx)(c.Title,{children:e})]})},e))}):(0,$.jsx)(u,{value:t[String(e.id)]??``,onValueChange:t=>n(e.id,String(t)),children:[`true`,`false`].map(e=>(0,$.jsx)(c.Item,{children:(0,$.jsxs)(c.Label,{children:[(0,$.jsx)(l,{value:e}),(0,$.jsx)(c.Title,{children:e===`true`?(0,$.jsx)(_,{message:`True`}):(0,$.jsx)(_,{message:`False`})})]})},e))})}),(0,$.jsx)(`p`,{className:`text-xs text-muted-foreground`,children:Bu(e.type)})]})]},e.id)),(0,$.jsxs)(o,{className:`w-fit`,disabled:!ee||d,onClick:i,children:[d&&(0,$.jsx)(a,{}),(0,$.jsx)(_,{message:d?`Submitting...`:`Submit quiz`})]})]}),(0,$.jsxs)(s.Root,{children:[(0,$.jsx)(s.Header,{className:`p-4`,children:(0,$.jsx)(s.Title,{className:`text-sm`,children:(0,$.jsx)(_,{message:`Attempt history`})})}),(0,$.jsx)(s.Content,{className:`flex flex-col gap-2 p-4 pt-0`,children:h?(0,$.jsx)(g,{className:`h-12 w-full rounded-card`}):m.length===0?(0,$.jsx)(`p`,{className:`text-sm text-muted-foreground`,children:(0,$.jsx)(_,{message:`No attempts yet.`})}):m.map(e=>(0,$.jsxs)(`div`,{className:`flex items-center justify-between gap-3 rounded-card border p-3 text-sm`,children:[(0,$.jsx)(`span`,{className:`text-muted-foreground`,children:new Date(e.created_at).toLocaleString()}),(0,$.jsxs)(`span`,{className:`flex items-center gap-2`,children:[(0,$.jsx)(`span`,{children:(0,$.jsx)(_,{message:`:score%`,values:{score:e.score}})}),(0,$.jsx)(r,{variant:e.passed?`positive`:`destructive`,children:e.passed?(0,$.jsx)(_,{message:`Passed`}):(0,$.jsx)(_,{message:`Not passed`})})]})]},e.id))})]})]})}export{Hu as Component};
//# sourceMappingURL=lesson-player-page-Ca4XSASm.js.map