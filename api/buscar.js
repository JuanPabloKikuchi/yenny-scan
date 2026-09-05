export default async function handler(req, res){
  const isbn = (req.query.isbn||'').replace(/\D/g,'')
  if(!isbn) return res.status(400).json({error:'isbn'})

  let titulo='', autor='', tapa='', precio='No encontrado'

  // 1. Google Books para titulo, autor y tapa de respaldo (siempre funciona)
  try{
    const g = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`).then(r=>r.json())
    const info = g.items?.[0]?.volumeInfo
    if(info){
      titulo = info.title||''
      autor = (info.authors||[]).join(', ')
      let img = info.imageLinks?.thumbnail||info.imageLinks?.smallThumbnail||''
      if(img){ tapa = img.replace('http://','https://').replace('&zoom=1','&zoom=2') }
    }
  }catch{}

  // 2. Yenny por API VTEX - trae PRECIO REAL + tapa HD + titulo oficial
  try{
    const data = await fetch(`https://www.yenny-elateneo.com/api/catalog_system/pub/products/search?ft=${isbn}`,{
      headers:{'Accept':'application/json','User-Agent':'Mozilla/5.0'}
    }).then(r=>r.json())

    if(data && data[0]){
      const p = data[0]
      // Solo pisa titulo si Yenny tiene uno mejor
      if(p.productName) titulo = p.productName

      // Autor en Yenny a veces está en especificaciones
      if(p.allSpecifications){
        const aut = p.allSpecifications.find(s=>s.toLowerCase().includes('autor'))
        if(aut && p.allSpecificationsValues && p.allSpecificationsValues[aut]){
          autor = p.allSpecificationsValues[aut][0]
        }
      }
      if(!autor && p.brand) autor = p.brand // editorial como fallback

      const item = p.items?.[0]
      if(item?.images?.[0]?.imageUrl){
        tapa = item.images[0].imageUrl // tapa HD de Yenny
      }
      const offer = item?.sellers?.[0]?.commertialOffer
      if(offer){
        if(offer.AvailableQuantity===0) precio='Sin stock'
        else {
          // Price viene en centavos? No, viene en pesos. Formateamos
          precio = `$ ${Number(offer.Price).toLocaleString('es-AR',{minimumFractionDigits:2, maximumFractionDigits:2})}`
        }
      }
    }
  }catch(e){ console.log('yenny api error',e) }

  if(!tapa) tapa=`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  if(!titulo) titulo='Libro '+isbn

  res.setHeader('Cache-Control','s-maxage=300')
  return res.json({isbn, titulo, autor, tapa, precio})
}
