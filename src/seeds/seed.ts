import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { faker } from '@faker-js/faker';
import { User } from '../users/entities/user.entity';
import { Article } from '../articles/entities/article.entity';

dotenv.config();

const USERS_COUNT = 5;
const ARTICLES_COUNT = 30;

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'qtim',
  entities: [User, Article],
});

async function seed() {
  await dataSource.initialize();
  console.log('Connected to database');

  const userRepo = dataSource.getRepository(User);
  const articleRepo = dataSource.getRepository(Article);

  await articleRepo.createQueryBuilder().delete().execute();
  await userRepo.createQueryBuilder().delete().execute();

  const password = await bcrypt.hash('password123', 10);

  const usersData = Array.from({ length: USERS_COUNT }, () => ({
    email: faker.internet.email().toLowerCase(),
    password,
    name: faker.person.fullName(),
  }));

  const users = await userRepo.save(usersData);

  const articlesData = Array.from({ length: ARTICLES_COUNT }, () => ({
    title: faker.lorem.sentence({ min: 3, max: 8 }),
    description: faker.lorem.paragraphs({ min: 1, max: 3 }),
    authorId: faker.helpers.arrayElement(users).id,
    publishedAt: faker.date.between({
      from: '2024-01-01',
      to: '2025-12-31',
    }),
  }));

  const articles = await articleRepo.save(articlesData);

  console.log('\n--- Seed data summary ---');
  console.log('Users:');
  users.forEach((u) => console.log(`  ${u.email} / password123 (id: ${u.id})`));
  console.log(`Articles: ${articles.length} total`);

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
