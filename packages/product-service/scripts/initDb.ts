import mysql from 'mysql2/promise'

export const initDb = async (pool: mysql.Pool): Promise<void> => {
  // try connecting to the DB via retries for 15 seconds
  let retries = 0
  let connection
  // first waiting a bit to give the DB time to start
  await new Promise((resolve) => setTimeout(resolve, 5000))
  while (retries < 3 && !connection) {
    try {
      connection = await pool.getConnection()
      console.log('Connected to MariaDB!')
      break
    } catch (err) {
      console.error('Could not connect to MariaDB. Retrying...', err)
      retries++
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }

  if (!connection) {
    console.error('Could not connect to MariaDB. Exiting...')
    process.exit(1)
  }

  const [rows] = await connection.execute('SHOW TABLES')
  if ((rows as mysql.OkPacket[])?.length > 0) {
    console.log('Tables already exist')
    connection.release()
    return
  }

  console.log('Connected to MariaDB!')

  const createProductsTableSql = `
    CREATE TABLE IF NOT EXISTS Products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      avgReviewRating DECIMAL(3, 2)
    )
  `

  await connection.execute(createProductsTableSql)
  console.log('Products table created')

  const createReviewsTableSql = `
    CREATE TABLE IF NOT EXISTS Reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      firstName VARCHAR(255) NOT NULL,
      lastName VARCHAR(255) NOT NULL,
      reviewText TEXT NOT NULL,
      rating DECIMAL(3, 2) NOT NULL
    )
  `

  await connection.execute(createReviewsTableSql)
  console.log('Reviews table created')

  const createProductReviewsTableSql = `
    CREATE TABLE IF NOT EXISTS ProductReviews (
      productId INT,
      reviewId INT,
      PRIMARY KEY (productId, reviewId),
      FOREIGN KEY (productId) REFERENCES Products(id),
      FOREIGN KEY (reviewId) REFERENCES Reviews(id)
    )
  `

  await connection.execute(createProductReviewsTableSql)
  console.log('ProductReviews table created')

  // Seed the tables with data
  const insertProductSql = 'INSERT INTO Products (name, description, price) VALUES (?, ?, ?)'
  await connection.execute(insertProductSql, ['IPhone 14 PRO', 'One popular mobile phone', 10.99])
  await connection.execute(insertProductSql, ['Samsung Galaxy S22', 'One popular mobile phone', 20.99])

  const insertReviewSql = 'INSERT INTO Reviews (firstName, lastName, reviewText, rating) VALUES (?, ?, ?, ?)'
  await connection.execute(insertReviewSql, ['John', 'Doe', 'Great product!', 5])
  await connection.execute(insertReviewSql, ['Jane', 'Doe', 'Not bad.', 4])

  const insertProductReviewSql = 'INSERT INTO ProductReviews (productId, reviewId) VALUES (?, ?)'
  await connection.execute(insertProductReviewSql, [1, 1])
  await connection.execute(insertProductReviewSql, [2, 2])

  connection.release()
}
