export default async function handler(req, res) {
  const isbn = (req.query.isbn || '').replace(/\D/g, '')
  if (!isbn) return res.status(400).json({ error: 'isbn' })

  let titulo = 'Libro ' + isbn
  let autor = ''
  let tapa = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  let precio = null
  let url = `https://www.yenny-elateneo.com/${isbn}`
  let stock = true

  // 1. Datos de OpenLibrary (tapa, autor)
  try {
    const g = await fetch(`https://openlibrary.org/isbn/${isbn}.json`).then(r=>r.json())
    if(g.title) titulo = g.title
    if(g.authors?.[0]?.key){
      const a = await fetch(`https://openlibrary.org${g.authors[0].key}.json`).then(r=>r.json())
      autor = a.name || ''
    }
  } catch {}

  // 2. PRECIO REAL DE YENNY VIA API VTEX (no bloqueable)
  try {
    const vtexUrl = `https://www.yenny-elateneo.com/api/catalog_system/pub/products/search?fq=alternateIds_Ean:${isbn}`
    const data = await fetch(vtexUrl, { headers: { 'Accept':'application/json', 'User-Agent':'Mozilla/5.0' } }).then(r=>r.json())
    if(data && data[0]){
      const item = data[0]
      titulo = item.productName || titulo
      url = `https://www.yenny-elateneo.com/${item.linkText}/p`
      const offer = item.items?.[0]?.sellers?.[0]?.commertialOffer
      if(offer){
        precio = offer.Price? `$ ${offer.Price.toLocaleString('es-AR')}` : null
        stock = offer.AvailableQuantity > 0
        if(!stock) precio = (precio||'') + ' (Sin stock)'
      }
    }
  } catch(e){ console.log('VTEX fail', e) }

  // Fallback por HTML si falla API
  if(!precio){
    try{
      const html = await fetch(`https://www.yenny-elateneo.com/${isbn}`, { headers: { 'User-Agent':'Mozilla/5.0' } }).then(r=>r.text())
      const m = html.match(/\$\s*([\d\.\,]+)/)
      if(m) precio = '$ ' + m[1]
    }catch{}
  }

  res.setHeader('Cache-Control','s-maxage=300')
  return res.json({ isbn, titulo, autor, tapa, precio, url })
}
