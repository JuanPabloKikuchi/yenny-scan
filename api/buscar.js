export default async function handler(req, res) {
  const isbn = (req.query.isbn || '').replace(/\D/g,'')
  if(!isbn) return res.status(400).json({error:'isbn'})

  let titulo = '', autor = '', tapa = '', precio = ''

  try{
    const html = await fetch(`https://www.yenny-elateneo.com/${isbn}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'es-AR,es;q=0.9',
        'Accept': 'text/html'
      }
    }).then(r=>r.text())

    // Título - viene en og:title o en h1
    let m = html.match(/<meta property="og:title" content="([^"]+)/) || html.match(/<title>([^<]+)<\/title>/)
    if(m) titulo = m[1].split('|')[0].trim()

    // Autor - en JSON LD
    let mAutor = html.match(/"author":\s*{\s*"@type":"[^"]+","name":"([^"]+)/)
    if(mAutor) autor = mAutor[1]
    else {
      let m2 = html.match(/Autor:<\/strong>\s*([^<]+)/i) || html.match(/"brand":"([^"]+)/)
      if(m2) autor = m2[1]
    }

    // Tapa - og:image
    let mImg = html.match(/<meta property="og:image" content="([^"]+)/)
    if(mImg) tapa = mImg[1]

    // Precio - busca $ xx.xxx,xx en el HTML o en JSON-LD
    let mPrecio = html.match(/"price":\s*"?([\d\.,]+)"?/) || html.match(/"lowPrice":\s*"?([\d\.,]+)"?/) || html.match(/\$\s*([\d]{1,3}(?:\.\d{3})*,\d{2})/)
    if(mPrecio) precio = mPrecio[1].includes('$')? mPrecio[1] : `$ ${mPrecio[1]}`

    // Si no encontró precio por formato, busca el texto del precio
    if(!precio){
      let mP2 = html.match(/(\$\s*[\d\.\,]+)/)
      if(mP2) precio = mP2[1]
    }

  }catch(e){ console.log(e) }

  // Fallbacks si Yenny bloqueó algo
  if(!titulo){
    try{
      const g = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`).then(r=>r.json())
      const info = g.items?.[0]?.volumeInfo
      if(info){
        titulo = info.title
        autor = autor || (info.authors||[]).join(', ')
        tapa = tapa || (info.imageLinks?.thumbnail?.replace('http://','https://') || '')
      }
    }catch{}
  }
  if(!tapa) tapa = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  if(!precio) precio = 'Consultar en Yenny'

  res.setHeader('Cache-Control','s-maxage=300')
  return res.json({ isbn, titulo, autor, tapa, precio })
}
