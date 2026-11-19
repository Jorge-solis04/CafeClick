INSERT INTO products (name, price, category)
SELECT catalog.name, catalog.price, catalog.category::product_category
FROM (VALUES
  (1, 'Café americano', 42.50, 'drinks'),
  (2, 'Café de olla', 38.00, 'drinks'),
  (3, 'Capuchino', 55.00, 'drinks'),
  (4, 'Latte', 58.00, 'drinks'),
  (5, 'Chocolate caliente', 48.00, 'drinks'),
  (6, 'Té chai', 45.00, 'drinks'),
  (7, 'Croissant', 35.00, 'food'),
  (8, 'Concha', 22.00, 'food'),
  (9, 'Bagel con queso crema', 52.00, 'food'),
  (10, 'Sándwich de jamón y queso', 65.00, 'food')
) AS catalog (menu_position, name, price, category)
ORDER BY catalog.menu_position
ON CONFLICT (name) DO NOTHING;
