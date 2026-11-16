INSERT INTO products (name, price)
SELECT catalog.name, catalog.price
FROM (VALUES
  (1, 'Café americano', 42.50),
  (2, 'Café de olla', 38.00),
  (3, 'Capuchino', 55.00),
  (4, 'Latte', 58.00),
  (5, 'Chocolate caliente', 48.00),
  (6, 'Té chai', 45.00),
  (7, 'Croissant', 35.00),
  (8, 'Concha', 22.00),
  (9, 'Bagel con queso crema', 52.00),
  (10, 'Sándwich de jamón y queso', 65.00)
) AS catalog (menu_position, name, price)
ORDER BY catalog.menu_position
ON CONFLICT (name) DO NOTHING;
