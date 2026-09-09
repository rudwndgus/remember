// Native-map pixels and palette. The boarding camera stays in the same world.
const pixels=(rows,x,y,color)=>rows.flatMap((row,j)=>[...row].flatMap((bit,i)=>bit==='1'?`<rect x="${x+i}" y="${y+j}" width="1" height="1" fill="${color}"/>`:[])).join('');
const route=pixels(['010110111','110100001','010111011','010101001','111111111'],115,126,'#e6b966');
const grain=Array.from({length:600},(_,i)=>`<rect x="${110+(i*7)%21}" y="${54+(i*13)%62}" width="1" height="1" fill="${i%2?'#b7b9a6':'#d3d2bc'}"/>`).join('');
export const busBoardingArtwork=`<svg viewBox="0 0 240 165" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" role="img" aria-label="Pixel-art NJ Transit Bus 163 at the original neighborhood stop" xmlns="http://www.w3.org/2000/svg">
<image href="${import.meta.env.BASE_URL}assets/maps/outside-main-map.png" x="-76" y="-735" width="1619" height="971" style="image-rendering:pixelated"/>
<path d="M109 51h25v3h3v75h-3v7h-23v-3h-4V55h2z" fill="#303a30" opacity=".55"/>
<path d="M105 59h3v12h-3zm0 45h3v14h-3zm29-45h3v12h-3zm0 45h3v14h-3z" fill="#252d2b"/>
<path d="M110 50h21v2h3v77h-2v5h-24v-5h-2V53h4z" fill="#343e39"/>
<path d="M110 52h20v2h2v71h-23V55h1z" fill="#c5c5af"/>
<path d="M110 53h19v1h2v65h-2V56h-19z" fill="#e4e0c9"/>
<path d="M108 56h2v63h-2zm23 1h2v65h-2z" fill="#7c8274"/>
${grain}
<path d="M110 55h20v7h-20z" fill="#4e5c56"/><path d="M111 56h18v4h-18z" fill="#72817a"/>
<path d="M110 64h20v1h-20zm0 46h20v1h-20z" fill="#a0a593"/>
<path d="M112 69h16v17h-16z" fill="#686f65"/><path d="M113 69h14v15h-14z" fill="#d6d4be"/><path d="M114 71h12v11h-12z" fill="#a5ad9e"/>
<path d="M115 72h10v1h-10zm0 3h10v1h-10zm0 3h10v1h-10zm0 3h10v1h-10z" fill="#65726b"/>
<path d="M114 91h13v11h-13z" fill="#767c70"/><path d="M114 91h12v9h-12z" fill="#d8d5bd"/><path d="M117 93h6v5h-6z" fill="#8c9689"/><path d="M118 94h4v1h-4zm1 1h2v2h-2z" fill="#53665e"/>
<path d="M106 61h2v8h-2zm0 11h2v8h-2zm0 11h2v8h-2zm0 11h2v8h-2zm26-33h2v8h-2zm0 11h2v8h-2zm0 11h2v8h-2zm0 11h2v8h-2z" fill="#31423f"/>
<path d="M106 62h1v5h-1zm0 11h1v5h-1zm0 11h1v5h-1zm0 11h1v5h-1zm26-33h1v5h-1zm0 11h1v5h-1zm0 11h1v5h-1zm0 11h1v5h-1z" fill="#718681"/>
<path d="M107 103h2v7h-2zm24 0h2v7h-2z" fill="#b96b48"/><path d="M107 110h2v5h-2zm24 0h2v5h-2z" fill="#99536b"/><path d="M107 115h2v5h-2zm24 0h2v5h-2z" fill="#486780"/>
<path d="M109 116h22v9h-22z" fill="#273e3d"/><path d="M110 117h20v5h-20z" fill="#536f6a"/><path d="M111 118h7v1h-7zm10 1h8v1h-8z" fill="#879c8a"/><path d="M119 117h1v7h-1" fill="#b0b9a4"/>
<path d="M109 125h22v8h-22z" fill="#c6c4ac"/><path d="M113 125h14v7h-14z" fill="#283630"/>
${route}
<path d="M109 130h3v2h-3zm19 0h3v2h-3z" fill="#f2e7b9"/><path d="M110 133h20v1h-20" fill="#ece5cd"/>
<path d="M104 118h3v1h-3zm-1 0h2v4h-2zm30 0h3v1h-3zm2 0h2v4h-2" fill="#3a4740"/>
</svg>`;
