export default async function handler(req, res) {
  const isbn = (req.query.isbn || '').replace(/\D/g, '');

  let titulo = '';
  let autor = '';
  let tapa = '';

  try {
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    const data = await r.json();
    const info = data.items?.[0]?.volumeInfo;
    if (info) {
      titulo = info.title || '';
      autor = (info.authors || []).join(', ');
      tapa = info.imageLinks?.thumbnail || '';
      tapa = tapa.replace('http://', 'https://');
    }
  } catch (e) {}

  if (!tapa) {
    tapa = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  }
  if (!titulo) {
    titulo = 'Libro ' + isbn;
  }

  res.json({
    isbn: isbn,
    titulo: titulo,
    autor: autor,
    tapa: tapa,
    precio: 'Consultar en Yenny'
  });
}
