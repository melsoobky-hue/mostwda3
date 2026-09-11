const initSqlJs = require('sql.js');
const { readFileSync } = require('fs');
(async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(readFileSync('database.sqlite'));
  const r = db.exec("SELECT source_order_id, product_name, raw_data FROM orders WHERE source = 'chichomz' LIMIT 2");
  if (r[0]) {
    r[0].values.forEach(row => {
      console.log('source_order_id:', row[0]);
      console.log('product_name:', row[1]);
      console.log('raw_data:', row[2]);
      console.log('---');
    });
  }
  db.close();
})();
