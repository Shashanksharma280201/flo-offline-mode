import mongoose from 'mongoose';

const DB_URI = 'mongodb://web-stag:Mongo%40flo%23stag1@164.52.221.4:27017/mission-control?authSource=admin&readPreference=primary&directConnection=true&ssl=false';

async function checkRoboticsUser() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to MongoDB');

    // Find robotics user
    const roboticsUser = await mongoose.connection.db.collection('users')
      .findOne({ email: 'robotics@flomobility.com' });

    if (roboticsUser) {
      console.log('\n--- Robotics User ---');
      console.log(`Name: ${roboticsUser.name}`);
      console.log(`Email: ${roboticsUser.email}`);
      console.log(`ID: ${roboticsUser._id}`);
      console.log(`Clients (${roboticsUser.clients ? roboticsUser.clients.length : 0}):`);
      if (roboticsUser.clients && roboticsUser.clients.length > 0) {
        roboticsUser.clients.forEach((clientId: any) => {
          console.log(`  - ${clientId}`);
        });
      } else {
        console.log('  None');
      }

      // Check if the target client is in the list
      const targetClientId = '6610f452f55bb93023dfb7c0';
      const hasClient = roboticsUser.clients && roboticsUser.clients.some((c: any) =>
        c.toString() === targetClientId
      );

      console.log(`\nHas client "${targetClientId}": ${hasClient ? 'YES ✓' : 'NO ✗'}`);

      // Now test the query that the API would use
      console.log('\n--- Testing Issue Query ---');
      const clients = roboticsUser.clients || [];

      const query = {
        client: { $in: clients.map((c: any) => c.toString()) }
      };

      console.log('Query being used:', JSON.stringify(query, null, 2));

      const issues = await mongoose.connection.db.collection('issues')
        .find(query)
        .limit(5)
        .toArray();

      console.log(`\nIssues found with this query: ${issues.length}`);
      if (issues.length > 0) {
        console.log('\nFirst few issues:');
        issues.forEach((issue: any, index: number) => {
          console.log(`${index + 1}. ${issue.title} (Client: ${issue.client})`);
        });
      }
    } else {
      console.log('Robotics user not found!');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkRoboticsUser();
