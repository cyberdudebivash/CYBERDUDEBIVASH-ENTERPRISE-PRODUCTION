document.addEventListener('DOMContentLoaded', async()=>{
async function load(sel,url){const el=document.querySelector(sel);if(!el)return;
try{const r=await fetch(url);const h=await r.text();el.outerHTML=h;}catch(e){}}
await load('header','layout/header.html');
await load('.mobile-sidebar','layout/sidebar.html');
await load('footer','layout/footer.html');
});