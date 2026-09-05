export default async function handler(req, res) {
  const isbn = (req.query.isbn || '').replace(/\D/g, '')
  if (!isbn) return res.status(400).json({ error: 'isbn' })

  let result = {
    isbn,
    titulo: 'Libro no encontrado',
    autor: '',
    tapa: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
    precio: 'No encontrado en Yenny',
    url: `https://www.yenny-elateneo.com/${isbn}`,
    encontrado: false
  }

  // 1. Intenta por API VTEX de Yenny (es lo más fiable para tapa, título y precio)
  try {
    const vtexUrl = `https://www.yenny-elateneo.com/api/catalog_system/pub/products/search?fq=alternateIds_Ean:${isbn}`
    const data = await fetch(vtexUrl, { headers: { 'Accept':'application/json' } }).then(r=>r.json())
    if (data && data[0]) {
      const p = data[0]
      result.encontrado = true
      result.titulo = p.productName
      result.url = `https://www.yenny-elateneo.com/${p.linkText}/p`
      // tapa de Yenny
      if (p.items?.[0]?.images?.[0]?.imageUrl) {
        result.tapa = p.items[0].images[0].imageUrl.replace('{width}', '500').replace('{height}', '500')
      }
      const offer = p.items?.[0]?.sellers?.[0]?.commertialOffer
      if (offer) {
        result.precio = offer.AvailableQuantity > 0? `$ ${offer.Price.toLocaleString('es-AR')}` : 'Sin stock'
      }
    }
  } catch(e){}

  // 2. Si no encontró en Yenny, busca datos para completar en OpenLibrary y Google
  if (!result.encontrado) {
    try {
      const g = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`).then(r=>r.json())
      if (g.items?.[0]?.volumeInfo) {
        const info = g.items[0].volumeInfo
        result.titulo = info.title
        result.autor = (info.authors || []).join(', ')
        if (info.imageLinks?.thumbnail) result.tapa = info.imageLinks.thumbnail.replace('http://','https://').replace('&zoom=1','&zoom=2')
      }
    } catch {}
  }

  res.setHeader('Cache-Control','s-maxage=600')
  return res.json(result)
}
