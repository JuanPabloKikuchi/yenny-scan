export default async function handler(req, res) {
  const isbn = (req.query.isbn || '').replace(/\D/g, '')
  if (!isbn) return res.status(400).json({ error: 'isbn requerido' })

  let result = {
    isbn,
    titulo: 'No encontrado',
    autor: '',
    tapa: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
    precio: 'No encontrado en Yenny',
  }

  // 1. BUSCA EN YENNY - metodo ft (fulltext) que si funciona
  try {
    const url = `https://www.yenny-elateneo.com/api/catalog_system/pub/products/search?ft=${isbn}`
    const data = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
    }).then(r => r.json())

    if (data && data[0]) {
      const p = data[0]
      result.titulo = p.productName
      // Autor viene en brand o en especificaciones
      result.autor = p.brand || (p.productReference || '')
      // Tapa de Yenny en alta
      if (p.items?.[0]?.images?.[0]?.imageUrl) {
        result.tapa = p.items[0].images[0].imageUrl
      }
      const offer = p.items?.[0]?.sellers?.[0]?.commertialOffer
      if (offer) {
        if (offer.AvailableQuantity <= 0) {
          result.precio = 'Sin stock'
        } else {
          result.precio = `$ ${Number(offer.Price).toLocaleString('es-AR', {minimumFractionDigits: 2})}`
        }
      }
    }
  } catch (e) {
    console.log('Yenny fail', e)
  }

  // 2. Si Yenny no trajo titulo o tapa, completar con Google Books
  if (result.titulo === 'No encontrado' || result.titulo.startsWith('Libro')) {
    try {
      const g = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`).then(r => r.json())
      const info = g.items?.[0]?.volumeInfo
      if (info) {
        if (result.titulo === 'No encontrado') result.titulo = info.title
        if (!result.autor) result.autor = (info.authors || []).join(', ')
        if (info.imageLinks?.thumbnail && result.tapa.includes('openlibrary')) {
          result.tapa = info.imageLinks.thumbnail.replace('http://', 'https://').replace('&zoom=1', '&zoom=5')
        }
      }
    } catch {}
  }

  // 3. Ultimo intento de tapa por OpenLibrary si sigue fallando
  if (result.tapa.includes('openlibrary')) {
    try {
      const ol = await fetch(`https://openlibrary.org/isbn/${isbn}.json`).then(r => r.json())
      if (ol.title && result.titulo === 'No encontrado') result.titulo = ol.title
    } catch {}
  }

  res.setHeader('Cache-Control', 's-maxage=300')
  return res.json(result)
}
