export default async function handler(req, res){
  const isbn = (req.query.isbn||'').replace(/\D/g,'')
  if(!isbn) return res.status(400).json({error:'isbn'})
  
  // Datos base de Google Books (siempre trae tapa y titulo)
  let titulo = '', autor = '', tapa = '', precio = 'Ver en Yenny'
  try{
    const g = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`).then(r=>r.json())
    const info = g.items?.[0]?.volumeInfo
    if(info){
      titulo = info.title
      autor = (info.authors||[]).join(', ')
      tapa = info.imageLinks?.thumbnail?.replace('http://','https://') || ''
      if(tapa) tapa = tapa.replace('&zoom=1','&zoom=2')
    }
  }catch{}

  // Intenta Yenny por HTML directo (con timeout)
  try{
    const controller = new AbortController()
    const t = setTimeout(()=>controller.abort(), 4000)
    const html = await fetch(`https://www.yenny-elateneo.com/${isbn}`,{
      headers:{'User-Agent':'Mozilla/5.0'},
      signal: controller.signal
    }).then(r=>r.text())
    clearTimeout(t)
    const mPrice = html.match(/\$\s*([\d]{1,3}(?:\.\d{3})*,\d{2})/)
    if(mPrice) precio = `$ ${mPrice[1]}`
    const mTitle = html.match(/<meta property="og:title" content="([^"]+)/)
    if(mTitle && !titulo) titulo = mTitle[1].split('|')[0].trim()
    const mImg = html.match(/<meta property="og:image" content="([^"]+)/)
    if(mImg) tapa = mImg[1]
  }catch{}

  if(!titulo) titulo = 'Libro ' + isbn
  if(!tapa) tapa = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`

  res.setHeader('Cache-Control','s-maxage=60')
  return res.json({isbn, titulo, autor, tapa, precio})
}
