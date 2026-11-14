const fs = require('fs');

const seedSrc = fs.readFileSync('scripts/seed.cjs', 'utf-8');

function extract(varName) {
  const start = seedSrc.indexOf('const ' + varName + ' = [');
  if (start === -1) return null;
  const end = seedSrc.indexOf('];', start);
  const jsonStr = seedSrc.slice(start + ('const ' + varName + ' = ').length, end + 1);
  return eval(jsonStr);
}

const categories = extract('CATEGORIES');
const menuItems = extract('MENU_ITEMS');
const tables = extract('TABLES');

console.log('Categories count:', categories.length);
console.log('MenuItems count:', menuItems.length);
console.log('Tables count:', tables.length);

function esc(val) {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean' || typeof val === 'number') return String(val);
  return "'" + String(val).replace(/'/g, "''") + "'";
}

let sql = '-- Auto-generated Tea Time seed data for Supabase\nbegin;\n\n';

sql += '-- 1. Categories\n';
for (const cat of categories) {
  const data = JSON.stringify(cat);
  sql += `insert into public.categories (id, business_id, name, sort_order, icon_url, data) values (${esc(cat.id)}, 'teatime', ${esc(cat.name)}, ${cat.displayOrder || 0}, ${esc(cat.iconUrl || null)}, ${esc(data)}::jsonb) on conflict (business_id, id) do update set name = excluded.name, sort_order = excluded.sort_order, icon_url = excluded.icon_url, data = excluded.data;\n`;
}

sql += '\n-- 2. Restaurant Tables\n';
for (const tbl of tables) {
  const data = JSON.stringify(tbl);
  sql += `insert into public.restaurant_tables (id, business_id, table_number, token, active, data) values (${esc(tbl.id)}, 'teatime', ${esc(tbl.number)}, ${esc(tbl.token)}, ${tbl.active !== false}, ${esc(data)}::jsonb) on conflict (business_id, id) do update set table_number = excluded.table_number, token = excluded.token, active = excluded.active, data = excluded.data;\n`;
}

sql += '\n-- 3. Products (107 Menu Items)\n';
for (const p of menuItems) {
  const data = JSON.stringify(p);
  const priceRupees = typeof p.price === 'number' ? p.price : 0;
  const isAvailable = p.available !== false && p.isAvailable !== false;
  const sortOrder = p.displayOrder || 0;
  sql += `insert into public.products (id, business_id, name, category, price_rupees, is_available, image_url, sort_order, data) values (${esc(p.id)}, 'teatime', ${esc(p.name)}, ${esc(p.category)}, ${priceRupees}, ${isAvailable}, ${esc(p.image || p.imageUrl || null)}, ${sortOrder}, ${esc(data)}::jsonb) on conflict (business_id, id) do update set name = excluded.name, category = excluded.category, price_rupees = excluded.price_rupees, is_available = excluded.is_available, image_url = excluded.image_url, sort_order = excluded.sort_order, data = excluded.data;\n`;
}

sql += '\ncommit;\n';

fs.writeFileSync('supabase/seed_teatime_menu.sql', sql, 'utf-8');
console.log('Saved supabase/seed_teatime_menu.sql with size: ' + (sql.length / 1024).toFixed(1) + ' KB');

