INSERT INTO products (name, price)
SELECT catalog.name, catalog.price
FROM (VALUES
  ('Café americano', 42.50),
  ('Café de olla', 38.00),
  ('Capuchino', 55.00),
  ('Latte', 58.00),
  ('Chocolate caliente', 48.00),
  ('Té chai', 45.00),
  ('Croissant', 35.00),
  ('Concha', 22.00),
  ('Sándwich de jamón y queso', 65.00),
  ('Bagel con queso crema', 52.00)
) AS catalog (name, price)
WHERE NOT EXISTS (
  SELECT 1 FROM products WHERE products.name = catalog.name
);
