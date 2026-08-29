import{r as c,j as x}from"./index-DbntnEZw.js";import{W as V,S as Z,O as $,H as J,I as y,u as K,X as Q,Z as ee}from"./three.module-BKHTsRGa.js";const b={warmWhite:{r:.95,g:.93,b:.9},crimson:{r:.784,g:.063,b:.18},darkRed:{r:.5,g:.03,b:.09}},h=600;function ne({children:X,className:Y=""}){const A=c.useRef(null),C=c.useRef(null),[_,N]=c.useState(!1),[k,G]=c.useState(1),r=c.useRef(0),S=c.useRef(!1);return c.useEffect(()=>{const f=A.current,z=C.current;if(!f||!z)return;const O=f.getBoundingClientRect(),w=O.width,R=O.height,l=new V({canvas:z,antialias:!1,alpha:!0});l.setSize(w,R),l.setPixelRatio(Math.min(window.devicePixelRatio,2)),l.setClearColor(0,0);const F=new Z,m=new $(0,w,0,-R,-1,1),i=new J,v=new Float32Array(h*3),g=new Float32Array(h*3),I=new Float32Array(h),j=[];for(let e=0;e<h;e++){const u=Math.random()*w,n=-Math.random()*R,s=Math.random()*Math.PI*2,t=50+Math.random()*150;v[e*3]=u+Math.cos(s)*t,v[e*3+1]=n+Math.sin(s)*t,v[e*3+2]=0,j.push({x:(Math.random()-.5)*2,y:(Math.random()-.5)*2,targetX:u,targetY:n,phase:Math.random()*Math.PI*2,freq:1+Math.random()*3});const o=Math.random();let a;o<.45?a=b.warmWhite:o<.8?a=b.crimson:a=b.darkRed,g[e*3]=a.r,g[e*3+1]=a.g,g[e*3+2]=a.b,I[e]=1+Math.random()*3}i.setAttribute("position",new y(v,3)),i.setAttribute("color",new y(g,3)),i.setAttribute("aSize",new y(I,1));const M=new K({uniforms:{uPixelRatio:{value:Math.min(window.devicePixelRatio,2)},uProgress:{value:0}},vertexShader:`
        attribute float aSize;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        uniform float uProgress;
        
        void main() {
          vColor = color;
          // Fade in as progress increases, then fade out at the end
          float fadeIn = smoothstep(0.0, 0.4, uProgress);
          float fadeOut = 1.0 - smoothstep(0.7, 1.0, uProgress);
          vAlpha = fadeIn * fadeOut;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (1.0 + (1.0 - uProgress) * 0.5);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,fragmentShader:`
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = (1.0 - smoothstep(0.2, 0.5, dist)) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,transparent:!0,blending:Q,depthWrite:!1,vertexColors:!0}),T=new ee(i,M);F.add(T);let p=0,P=0;const d={id:null},E=()=>{d.id==null&&(d.id=requestAnimationFrame(q))},L=new IntersectionObserver(([e])=>{e.intersectionRatio>.15&&(P=1,E())},{threshold:[0,.15,.3,.5]});L.observe(f);const q=()=>{p+=.016;const e=r.current;r.current+=(P-e)*.02,M.uniforms.uProgress.value=r.current;const u=Math.abs(P-r.current)<.001,n=i.attributes.position.array;for(let s=0;s<h;s++){const t=j[s],o=s*3;if(r.current<.95){const a=n[o],U=n[o+1],D=Math.sin(p*t.freq+t.phase)*(1-r.current)*15,H=Math.cos(p*t.freq*.7+t.phase)*(1-r.current)*15,W=.02+r.current*.03;n[o]+=(t.targetX+D-a)*W,n[o+1]+=(t.targetY+H-U)*W,t.x+=(Math.random()-.5)*.1,t.y+=(Math.random()-.5)*.1,t.x*=.98,t.y*=.98,n[o]+=t.x*(1-r.current),n[o+1]+=t.y*(1-r.current)}else{const a=u?0:Math.sin(p*3+s*.1)*.3;n[o+1]=t.targetY+a}}if(i.attributes.position.needsUpdate=!0,r.current>.85&&G(1-(r.current-.85)/.15),r.current>.5&&!S.current&&(S.current=!0,N(!0)),l.render(F,m),u){d.id=null;return}d.id=requestAnimationFrame(q)};E();const B=()=>{const e=f.getBoundingClientRect();l.setSize(e.width,e.height),m.right=e.width,m.bottom=-e.height,m.updateProjectionMatrix()};return window.addEventListener("resize",B),()=>{window.removeEventListener("resize",B),L.disconnect(),d.id!=null&&cancelAnimationFrame(d.id),i.dispose(),M.dispose(),l.dispose()}},[]),x.jsxs("div",{ref:A,className:`relative ${Y}`,children:[x.jsx("canvas",{ref:C,className:"absolute inset-0 pointer-events-none z-10",style:{opacity:k}}),x.jsx("div",{className:"transition-opacity duration-700",style:{opacity:_?1:0},children:X})]})}export{ne as default};
