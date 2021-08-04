import{v as o,O as X,u as G,l as E,i as Y,A as T,I as Q,Q as K,d as tt,M as et,D as st,a as at,b as nt,c as it,e as ot,B as M,y as b,f as rt,o as H,g as O,s as lt,h as ct,j as p,r as dt,k as ht,Z as z,P as ut,m as B,n as mt,p as gt,T as pt,q as ft,t as j,w as J,x as yt,z as P,C as S,E as D,F as bt,G as wt,U as Et,L as xt,S as _t,H as Tt,J as Mt,K as L,N as At,R as St,V as Dt,W as vt,X as Ct,Y as It,_ as kt,$ as Ht,a0 as F,a1 as Ot,a2 as N,a3 as $,a4 as zt,a5 as Bt,a6 as jt}from"./vendor.9dc21fde.js";const Jt=[{name:"nocache",displayName:"Disable caching",type:"boolean",default:!1},{name:"hide_auto_help",displayName:"Hide automatic help",type:"boolean",default:!1}],Pt=()=>o(X,{options:Jt}),Lt=({url:a})=>{const[t]=G("options"),e=t&&t.hide_auto_help,[n,s]=E(Y()?!1:!e),i=T(()=>{s(!n)},[n]);return a=a||`${window.location.origin}${window.location.pathname}README.md`,o(tt,null,o(Q,{verticalAlign:"top","aria-label":"Help",icon:o(K,null),size:"lg",onClick:i,mr:"4"}),o(Ft,{url:a,isOpen:n,setOpen:s}))},Ft=({isOpen:a,setOpen:t,url:e})=>{const n=T(()=>{t(!a)},[t,a]),s=T(()=>{t(!1)},[t]),i=`https://metapages.github.io/metaframe-markdown/#?url=${e}`;return o(it,{size:"full",placement:"top",onClose:n,isOpen:a,onOverlayClick:s},o(et,null,o(st,null,o(at,{size:"lg",colorScheme:"blue.500",bg:"gray.100"}),o(nt,null,o("iframe",{width:"100%",height:"100%",src:i})))))},f=ot(a=>({messages:[],modelCount:-1,model:void 0,prediction:void 0,currentlyTrainingDataHash:null,clearMessages:()=>a(t=>({messages:[]})),addMessage:t=>a(e=>({messages:e.messages.concat([t])})),setMessages:t=>a(e=>({messages:t})),setTrainingDataHash:t=>a(e=>({currentlyTrainingDataHash:t})),updateModels:async()=>{const t=await Nt();a(e=>({modelCount:t}))},deleteModels:async()=>{await $t(),a(t=>({modelCount:0}))},setModel:async t=>{a(e=>({model:t}))},setPrediction:async t=>{a(e=>({prediction:t}))}})),Nt=async()=>{const a=await M.listModels();return Object.keys(a).length},$t=async()=>{const a=await M.listModels(),t=Object.keys(a).map(e=>M.removeModel(e));try{await Promise.all(t)}catch(e){console.error(e)}},Wt=()=>{const a=f(s=>s.modelCount),t=f(s=>s.updateModels),e=f(s=>s.deleteModels),n=T(async()=>{e()},[e]);return b(()=>{(async()=>{await t()})()},[t]),o(rt,{isDisabled:a<=0,onClick:n},"Clear cache (",a>0?a:0," models)")},W=a=>{const t={};return Object.keys(a).forEach(e=>t[e]=new Float32Array(v(a[e]))),t},Vt=a=>({requestId:a.requestId,series:W(a.series)}),x="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",_=new Uint8Array(256);for(var A=0;A<x.length;A++)_[x.charCodeAt(A)]=A;function V(a){let t=new Uint8Array(a),e,n=t.length,s="";for(e=0;e<n;e+=3)s+=x[t[e]>>2],s+=x[(t[e]&3)<<4|t[e+1]>>4],s+=x[(t[e+1]&15)<<2|t[e+2]>>6],s+=x[t[e+2]&63];return n%3==2?s=s.substring(0,s.length-1)+"=":n%3==1&&(s=s.substring(0,s.length-2)+"=="),s}function v(a){if(!a)throw new Error("base64decode string argument given");let t=a.length*.75,e=a.length,n,s=0,i,l,r,c;a[a.length-1]==="="&&(t--,a[a.length-2]==="="&&t--);var h=new ArrayBuffer(t),d=new Uint8Array(h);for(n=0;n<e;n+=4)i=_[a.charCodeAt(n)],l=_[a.charCodeAt(n+1)],r=_[a.charCodeAt(n+2)],c=_[a.charCodeAt(n+3)],d[s++]=i<<2|l>>4,d[s++]=(l&15)<<4|r>>2,d[s++]=(r&3)<<6|c&63;return h}/**
 * @license
 * Private wand license.
 * Currently very specific to gestures, need to loosen that up
 */const Ut=.7;class Rt{constructor(t){this.data={},this._labels=[],this._streams=[],this.shuffledTrainIndex=0,this.shuffledTestIndex=0,this.trainingIndices=new Uint32Array,this.testingIndices=new Uint32Array,this.bigFatDataArray=new Float32Array,this.bigFatLabelArray=new Uint8Array,this._timesteps=0,this._maxAbsoluteValue=0,this.trainingDataJson=t}hash(){if(!this.trainingDataJson)throw"No trainingDataJson to hash";return H(this.trainingDataJson)}nextTrainBatch(t){return this.nextBatch(t,this.trainingIndices)}nextTestBatch(t){return this.nextBatch(t,this.testingIndices)}nextBatch(t,e){const n=new Float32Array(t*this.imageSize),s=new Uint8Array(t*this.numClasses);console.assert(this.numClasses>0);for(let r=0;r<t;r++){const c=e[r%e.length],h=c*this.imageSize,d=this.bigFatDataArray.slice(h,h+this.imageSize);n.set(d,r*this.imageSize);const u=c*this.numClasses,m=this.bigFatLabelArray.slice(u,u+this.numClasses);s.set(m,r*this.numClasses)}const i=O(n,[t,this.imageSize]),l=O(s,[t,this.numClasses]);return{xs:i,labels:l}}get classNames(){return this._labels}get gestureNames(){return this.classNames}get numClasses(){return this._labels.length}get imageWidth(){return this._streams.length}get width(){return this.imageWidth}get imageHeight(){return this.timeSteps}get height(){return this.imageHeight}get imageSize(){return this.imageWidth*this.imageHeight}get timeSteps(){return this._timesteps}get trainingExampleCount(){return this.trainingIndices.length}get testingExampleCount(){return this.testingIndices.length}allNonTimeValues(t){this.allNonTimeSensorStreams((e,n,s,i)=>{e.forEach((l,r)=>{t(l,r,e,n,s,i)})})}allSensorStreams(t){Object.keys(this.data).forEach(e=>{this.data[e].forEach((s,i)=>{const l=s.data;this._streams.forEach(r=>{t(l[r],r,i,e)})})})}allNonTimeSensorStreams(t){Object.keys(this.data).forEach(e=>{this.data[e].forEach((s,i)=>{const l=s.data;this._streams.forEach(r=>{r.endsWith("t")||t(l[r],r,i,e)})})})}allExamples(t){Object.keys(this.data).forEach(e=>{this.data[e].forEach((s,i)=>{const l=s.data;t(l,i,e)})})}getMaxValue(){let t=0;const e=n=>{t=Math.max(Math.abs(n),t)};return this.allNonTimeValues(e),t}normalize(){console.log("    normalizing...");let t=this.getMaxValue();this._maxAbsoluteValue=t,console.log(`        max=${t}`),this.allNonTimeValues((e,n,s)=>{s[n]=e/t})}zeroTime(){console.log("    zeroing time..."),this.allExamples(t=>{const e=this._streams.filter(s=>s.endsWith("t"));let n=Number.MAX_VALUE;e.forEach(s=>{t[s].forEach(i=>n=Math.min(n,i))}),e.forEach(s=>{t[s].forEach((i,l)=>{t[s][l]=i-n})})})}trimToLongestNonZeroGesture(){console.log("    getting longest non-default gesture...");let t=0,e=0;const n=this._streams.filter(s=>!s.endsWith("t"));this.allExamples((s,i,l)=>{if(l!="_"){let r=s[this._streams[0]].length-1;for(;r>=0&&!(n.filter(c=>s[c][r]!=0).length>0);r--);t=Math.max(t,r+1)}e=Math.max(e,s[this._streams[0]].length)}),console.log(`        [max=${t}] [maxAll=${e}]...trimming...`),this.allExamples((s,i,l)=>{this._streams.forEach(r=>{s[r]=s[r].slice(0,t)})}),e=0,this.allSensorStreams(s=>{e=Math.max(e,s.length)}),console.log(`        all arrays now [max=${e}]`)}extend(){console.log("    extending...");let t=0;const e=[];this.allSensorStreams(n=>{t=Math.max(t,n.length),n.forEach((s,i)=>{i!=0&&e.push(s-n[i-1])})}),this._timesteps=t,console.log(`        this.timeSteps=${this.timeSteps}`)}processPrediction(t){if(!t)throw"processExample: missing example";if(this._timesteps===0)throw"processPrediction but this._timesteps === 0";Object.keys(t).forEach(s=>{if(t[s].length>this._timesteps&&(t[s]=t[s].slice(0,this._timesteps)),t[s].length<this._timesteps){const i=new Float32Array(this._timesteps);i.set(t[s]),t[s]=i}}),Object.keys(t).forEach(s=>{t[s].forEach((i,l,r)=>{r[l]=i/this._maxAbsoluteValue})});const e=new Float32Array(1*this.imageSize);let n=0;return this._streams.forEach(s=>{const i=n*this.timeSteps;e.set(t[s],i),n++}),e}async load(){console.log(`Begin loading examples from ${this.trainingDataJson.examples.length} gestures and converting to float arrays...`),this.data={};const t=this.data;this._streams=[];const e={};this.trainingDataJson.examples.forEach(c=>{const h=c.label;t[h]||(t[h]=[]);const d=W(c.data.series);Object.keys(d).forEach(m=>e[m]=!0);const u={data:d,url:c.name||c.url};t[h].push(u)}),this._streams=Object.keys(e),this._streams.sort(),this._labels=Object.keys(this.data),this._labels.sort(),console.log(`labels: [  ${this._labels.join("  |  ")}  ]`),console.log("    done loading raw gesture data, begin preprocessing..."),this.trimToLongestNonZeroGesture(),this.normalize();const n=this.getMaxValue();if(console.log(`        normalizedMax=${n}`),n!=1)throw"Failed to normalize";this.zeroTime(),this.extend(),console.log("    converting to large combined float arrays...");const s=Object.keys(this.data).reduce((c,h)=>c+this.data[h].length,0);this.bigFatDataArray=new Float32Array(s*this.imageSize),this.bigFatLabelArray=new Uint8Array(s*this.numClasses),console.log(`        totalExampleCount=${s} imageSize=${this.imageSize} numClasses=${this.numClasses}`),console.log(`            width=${this.width} height=${this.height}`);let i=0;this.classNames.forEach((c,h)=>{this.data[c].forEach(u=>{this.bigFatLabelArray[i*this.numClasses+h]=1;const m=u.data;let g=0;this._streams.forEach(C=>{const y=i*this.imageSize+g*this.timeSteps;this.bigFatDataArray.set(m[C],y),g++}),i++})});const l=lt.createShuffledIndices(s),r=Math.floor(Ut*s);this.trainingIndices=l.slice(0,r),this.testingIndices=l.slice(r)}}/**
 * @license
 * Private wand license.
 */const qt=32,Zt=10;class Xt{constructor(t){this.classNames=[],this._data=t,this.createModel()}get model(){return this._model}createModel(){const t=this._data;this.classNames=t.classNames,this._model=ct(),this._model.add(p.conv1d({filters:100,kernelSize:7,strides:1,activation:"relu",kernelInitializer:"varianceScaling",inputShape:[t.height,t.width]})),this._model.add(p.conv1d({filters:100,kernelSize:7,strides:1,activation:"relu"})),this._model.add(p.conv1d({filters:100,kernelSize:7,strides:1,activation:"relu"})),this._model.add(p.maxPooling1d({poolSize:3})),this._model.add(p.conv1d({filters:100,kernelSize:7,strides:1,activation:"relu"})),this._model.add(p.globalAveragePooling1d()),this._model.add(p.dropout({rate:.5})),p.flatten(),this._model.add(p.dense({units:t.classNames.length,activation:"softmax"})),this._model.summary();const e=dt.adam();return this._model.compile({optimizer:e,loss:"categoricalCrossentropy",metrics:["accuracy"]}),this._model}async train(){const t=this._data,e=["loss","val_loss","acc","val_acc"],n=document.getElementById("Training"),s=ht.show.fitCallbacks(n,e),i=t.trainingExampleCount*2,[l,r]=z(()=>{const m=t.nextTrainBatch(i);return[m.xs.reshape([i,t.imageHeight,t.imageWidth]),m.labels]}),c=t.testingExampleCount*2,[h,d]=z(()=>{const m=t.nextTestBatch(c);return[m.xs.reshape([c,t.imageHeight,t.imageWidth]),m.labels]}),u=await this.model.fit(l,r,{batchSize:qt,validationData:[h,d],epochs:Zt,shuffle:!0,callbacks:s});return this.model,u}}const U=async a=>{const t=new Gt;await a.model.save(t);const e=Object.assign({},a);return e.model=t.modelJson,e};class Gt{constructor(t){this.modelJson=t}async save(t){const e={modelArtifactsInfo:{dateSaved:new Date,modelTopologyType:"JSON",modelTopologyBytes:t.modelTopology.byteLength,weightDataBytes:t.weightData.byteLength}};try{return this.modelJson=Object.assign({},t),this.modelJson.modelTopology=V(t.modelTopology),this.modelJson.weightData=V(t.weightData),e}catch(n){return e.errors=["{err}"],e}}async load(){console.log("JsonIOHandler.loading");const t=Object.assign({},this.modelJson);return t.modelTopology=v(this.modelJson.modelTopology),t.weightData=v(this.modelJson.weightData),console.log("JsonIOHandler.modelArtifacts",t),t}}const Yt=async(a,t)=>{if(!a)return[void 0,new Error("Asked to predict sample but no model loaded")];if(!t)return[void 0,new Error("Asked to predict but no input")];if(!t.series)return[void 0,new Error("Asked to predict but input lacks 'series' field")];const e=t.series,n=Qt(a,e),s=ut(n,[1,a.meta.prediction.imageHeight,a.meta.prediction.imageWidth]),i=a.model.predictOnBatch(s).dataSync();let l=0,r="",c;const h={};return a.meta.prediction.classNames.forEach((u,m)=>{h[u]=i[m],i[m]>l&&(l=i[m],r=u)}),r!=="_"&&h[r]<.45&&h._&&(c=`${r} -> _ because score < 0.45`,r="_"),[{prediction:r,predictions:h,requestId:t.requestId,modelHash:a.meta.training.trainingDataHash,note:c},void 0]},Qt=(a,t)=>{if(!t)throw"processExample: missing example";if(!a)throw"processExample: missing model";Object.keys(t).forEach(i=>{i.endsWith("t")&&delete t[i]});const e=Object.keys(t);e.sort();const n=Math.max(a.meta.prediction.imageHeight,a.meta.prediction.imageWidth);e.forEach(i=>{if(t?.[i]?.length>n&&(t[i]=t[i].slice(0,n)),t?.[i]?.length<n){const l=new Float32Array(n);l.set(t[i]),t[i]=l}}),e.forEach(i=>{t[i].forEach((l,r,c)=>{c[r]=l/a.meta.prediction.maxAbsoluteRawValue})});const s=new Float32Array(1*a.meta.prediction.imageWidth*a.meta.prediction.imageHeight);return e.forEach((i,l)=>{const r=l*n;s.set(t[i],r)}),s},Kt=()=>{const a=B(),[t]=mt("nocache"),[e,n]=E(void 0),[s,i]=E(""),l=f(d=>d.setModel),r=f(d=>d.model);b(()=>{},[n]),b(()=>{const d=a?.inputs.training;if(d&&d!==n){const u=H(d);u!==s&&(i(u),n(d))}},[a.inputs,s,i,n]);const c=f(d=>d.updateModels),h=f(d=>d.setMessages);return b(()=>{if(!e||!a?.setOutputs)return;let d=!1;return(async()=>{const u={message:"Training",type:"info"};h([u,{message:"loading data...",type:"info"}]);const g=new Rt(e);if(await g.load(),d)return;h([u,{message:"\u2705 loaded data",type:"info"}]);const y=g.hash(),I={prediction:{classNames:g.classNames,imageHeight:g.imageHeight,imageWidth:g.imageWidth,maxAbsoluteRawValue:g._maxAbsoluteValue},training:{date:new Date,trainingDataHash:y}};let w;if(!t){const q=await M.listModels();if(d)return;if(q[`indexeddb://${y}`]){const Z=await gt(`indexeddb://${y}`);if(d)return;w={model:Z,meta:I},h([u,{message:`Model ready (cached) ${y.substr(0,10)}`,type:"success"}]),l(w);return}}h([u,{message:"training...",type:"warning"}]);const k=new Xt(g);if(await k.train(),d)return;h([u,{message:"\u2705 Trained",type:"warning"}]),w={model:k.model,meta:I},t||(await w.model.save(`indexeddb://${y}`),c()),l(w);const R=await U(w);a.setOutputs({model:R}),h([u,{message:`\u2705 Model ready ${y.substr(0,10)}`,type:"success"}])})(),()=>{d=!0}},[e,t,l,a?.setOutputs]),b(()=>{r&&a?.setOutputs&&(async()=>{const d=await U(r);a.setOutputs({model:d})})()},[r,a?.setOutputs]),o("div",null,o(Wt,null),o("div",{id:"Training"}))},te=()=>{const a=B(),t=f(c=>c.model),[e,n]=E(void 0),[s,i]=E(void 0),[l,r]=E(void 0);return b(()=>{const c=a?.inputs?.prediction;if(c&&c!==e){n(c);const h=Vt(c);i(h)}},[a.inputs,e,n,i]),b(()=>{!s||!t||!a?.setOutputs||(async()=>{const[c,h]=await Yt(t,s);a.setOutputs({prediction:c,error:h?.message}),r(c)})()},[s,t,r,a.setOutputs]),o("div",null,o(S,{status:l?.prediction?"success":"info"},o(D,null),l?l.prediction:"...waiting for data"),l?.note?o(S,{status:"warning"},o(D,null),l?.note):null,o(pt,{variant:"simple"},o(ft,null,o(j,null,o(J,null,"Label"),o(J,null,"Score"))),o(yt,null,l?Object.keys(l.predictions).sort(c=>l.predictions[c]).map(c=>o(j,null,o(P,null,c),o(P,{isNumeric:!0},l.predictions[c]))):null)))},ee=()=>{const a=f(t=>t.messages);return o(_t,{spacing:3},a.map((t,e)=>o(S,{key:e,status:t.type?t.type:"info"},o(bt,{mr:2},t.message),o(D,null),o(wt,null,o(Et,null,t.messages?t.messages.map((n,s)=>o(xt,{key:s},n)):null)))))},se=()=>{const a=Tt(["red.50","teal.50","blue.50"],["red.900","teal.900","blue.900"]),[t,e]=Mt("tab",0),n=a[t];return o(Ct,{columns:1,spacing:10},o(L,null,o(At,{size:"md"},o(St,{href:"https://www.tensorflow.org/js",isExternal:!0,mr:"2"},o(Dt,null)," Tensorflow 1D"),"convolutional neural net trainer/predictor"),o(vt,null),o(Lt,null),o(Pt,null)),o(L,null,o(ee,null)),o(It,null,o(kt,{isFitted:!0,onChange:e,bg:n},o(Ht,null,o(F,null,"Train"),o(F,null,"Predict")),o(Ot,{p:"1rem"},o(N,null,o(Kt,null)),o(N,null,o(te,null))))))},ae=()=>o("div",null,o(se,null)),ne=()=>o(ae,null);$.config({driver:$.INDEXEDDB,name:"metaframe-predictor",version:1,storeName:"models",description:"Stores tensorflow models locally"}),zt(o(jt,null,o(Bt,null,o(ne,null))),document.getElementById("root"));
//# sourceMappingURL=index.c59fa4ee.js.map