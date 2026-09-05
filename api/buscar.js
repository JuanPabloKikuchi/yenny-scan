export default async function handler(req,res){
  const isbn=(req.query.isbn||'').replace(/\D/g,'')
  if(!isbn) return res.status(400).json({error:'isbn'})

  let titulo='',autor='',tapa='',precio='No figura en Yenny'

  // 1. Google Books (Librito hace esto, siempre trae algo)
  try{
    const g=await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`).then(r=>r.json())
    const info=g.items?.[0]?.volumeInfo
    if(info){
      titulo=info.title||''
      autor=(info.authors||[]).join(', ')
      tapa=info.imageLinks?.thumbnail?.replace('http://','https://')||''
    }
  }catch{}

  // 2. Yenny con proxy (para que no nos bloquee) - saca precio real
  try{
    // proxy allorigins para bypassear bloqueo de Yenny
    const target=`https://www.yenny-elateneo.com/${isbn}`
    const proxy=`https://api.allorigins.win/get?url=${encodeURIComponent(target)}`
    const data=await fetch(proxy).then(r=>r.json())
    const html=data.contents||''

    // Precio Yenny está en meta o en texto $ xx.xxx,xx
    let m=html.match(/"price":\s*"?([\d\.]+)"?/) || html.match(/\$[\s]*([\d]{1,3}(?:\.\d{3})*,\d{2})/)
    if(m){
      let p=m[1]
      if(!p.includes('$')) p=`$ ${p}`
      precio=p.includes(',')?p:`$ ${Number(p).toLocaleString('es-AR')}`
    }
    // Si no, busca todos los $ y agarra el primero que parece precio de libro (no 35.000 de envío)
    if(precio==='No figura en Yenny'){
      const all=[...html.matchAll(/\$\s*([\d]{1,3}(?:\.\d{3})*,\d{2})/g)].map(x=>x[0])
      if(all[0]) precio=all[0]
    }

    let mTitle=html.match(/<meta property="og:title" content="([^"]+)/)
    if(mTitle) titulo=mTitle[1].split('|')[0].trim()

    let mImg=html.match(/<meta property="og:image" content="([^"]+)/)
    if(mImg) tapa=mImg[1]

    let mAuthor=html.match(/"author"[^}]*"name":"([^"]+)/)
    if(mAuthor) autor=mAuthor[1]
  }catch(e){ console.log('proxy fail',e) }

  if(!tapa) tapa=`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  if(!titulo) titulo='Libro '+isbn
  if(!autor) autor=''

  return res.json({isbn, titulo, autor, tapa, precio})
}
