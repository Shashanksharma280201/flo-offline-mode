import mongoose from 'mongoose';

const DB_URI = 'mongodb://web-stag:Mongo%40flo%23stag1@164.52.221.4:27017/mission-control?authSource=admin&readPreference=primary&directConnection=true&ssl=false';

async function checkUserClients() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to MongoDB');

    // Find all users and their clients
    const users = await mongoose.connection.db.collection('users')
      .find({})
      .toArray();

    console.log(`\nTotal users in database: ${users.length}\n`);

    users.forEach((user: any, index: number) => {
      console.log(`${index + 1}. User: ${user.name || 'N/A'}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Clients: ${user.clients ? JSON.stringify(user.clients) : 'None'}`);
      console.log(`   Robots: ${user.robots ? JSON.stringify(user.robots) : 'None'}`);
      console.log('');
    });

    // Check the specific client from issues
    const targetClientId = '6610f452f55bb93023dfb7c0';
    console.log(`\n--- Checking for client ${targetClientId} ---`);

    const client = await mongoose.connection.db.collection('clients')
      .findOne({ _id: new mongoose.Types.ObjectId(targetClientId) });

    if (client) {
      console.log(`Client found: ${client.name}`);
      console.log(`Client ID: ${client._id}`);
    } else {
      console.log('Client not found');
    }

    // Check which users have this client
    console.log('\n--- Users with this client assigned ---');
    const usersWithClient = users.filter((user: any) =>
      user.clients && user.clients.some((c: any) => c.toString() === targetClientId)
    );

    if (usersWithClient.length > 0) {
      usersWithClient.forEach((user: any) => {
        console.log(`- ${user.name} (${user.email})`);
      });
    } else {
      console.log('No users have this client assigned!');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUserClients();
