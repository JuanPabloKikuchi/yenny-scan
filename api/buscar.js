export default async function handler(req,res){
  const isbn = (req.query.isbn||'').replace(/\D/g,'')
  if(!isbn) return res.status(400).json({error:'isbn'})

  let result = {
    isbn,
    titulo: '',
    autor: '',
    tapa: '',
    precio: 'No encontrado en Yenny'
  }

  // Intenta 4 endpoints de Yenny hasta que uno devuelva
  const endpoints = [
    `https://www.yenny-elateneo.com/api/catalog_system/pub/products/search?fq=alternateIds_Ean:${isbn}`,
    `https://www.yenny-elateneo.com/api/catalog_system/pub/products/search?fq=alternateIds_Ean:${isbn}&fq=alternateIds_Isbn:${isbn}`,
    `https://www.yenny-elateneo.com/api/catalog_system/pub/products/search?ft=${isbn}`,
    `https://www.yenny-elateneo.com/api/catalog_system/pub/products/search?fq=skuId:${isbn}`
  ]

  let yennyProduct = null
  for(let url of endpoints){
    try{
      const data = await fetch(url,{headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'}}).then(r=>r.json())
      if(data && data[0] && data[0].productName){
        yennyProduct = data[0]
        break
      }
    }catch{}
  }

  // Si lo encontró en Yenny, saca todo de ahí
  if(yennyProduct){
    result.titulo = yennyProduct.productName
    const item = yennyProduct.items?.[0]
    if(item?.images?.[0]?.imageUrl) result.tapa = item.images[0].imageUrl
    const offer = item?.sellers?.[0]?.commertialOffer
    if(offer){
      result.precio = offer.AvailableQuantity===0? 'Sin stock' : `$ ${Number(offer.Price).toLocaleString('es-AR',{minimumFractionDigits:2})}`
    }
    // Autor
    if(yennyProduct.allSpecifications){
      // busca la key que sea Autor
      for(let key of yennyProduct.allSpecifications){
        if(key.toLowerCase().includes('autor')){
          const vals = yennyProduct.allSpecificationsValues?.[key]
          if(vals?.[0]) result.autor = vals[0]
        }
      }
    }
    if(!result.autor) result.autor = yennyProduct.brand || ''
  }

  // Completa lo que falte con Google Books
  if(!result.titulo ||!result.autor ||!result.tapa){
    try{
      const g = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`).then(r=>r.json())
      const info = g.items?.[0]?.volumeInfo
      if(info){
        if(!result.titulo) result.titulo = info.title
        if(!result.autor) result.autor = (info.authors||[]).join(', ')
        if(!result.tapa){
          let img = info.imageLinks?.thumbnail||''
          if(img) result.tapa = img.replace('http://','https://')
        }
      }
    }catch{}
  }

  if(!result.tapa) result.tapa = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  if(!result.titulo) result.titulo = 'Libro '+isbn

  res.setHeader('Cache-Control','s-maxage=120')
  return res.json(result)
}
