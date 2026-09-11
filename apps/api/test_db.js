import { Client } from 'pg';

async function test(user, password) {
  const client = new Client({
    user,
    password,
    host: 'localhost',
    port: 5432,
    database: 'sih26033',
  });
  
  try {
    await client.connect();
    console.log(`Success for ${user}:${password}`);
    await client.end();
  } catch (e) {
    console.log(`Failed for ${user}:${password} - ${e.message}`);
  }
}

async function run() {
  await test('postgres', 'Sih@1420');
  await test('sih26033', 'Sih@1420');
  await test('root', 'Sih@1420');
  await test('admin', 'Sih@1420');
}
run();
