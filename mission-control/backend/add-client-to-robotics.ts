import mongoose from 'mongoose';

const DB_URI = 'mongodb://web-stag:Mongo%40flo%23stag1@164.52.221.4:27017/mission-control?authSource=admin&readPreference=primary&directConnection=true&ssl=false';

async function addClientToRobotics() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to MongoDB');

    const targetClientId = '6610f452f55bb93023dfb7c0';

    // Update robotics user to add the client
    const result = await mongoose.connection.db.collection('users').updateOne(
      { email: 'robotics@flomobility.com' },
      { $addToSet: { clients: targetClientId } }
    );

    console.log('\nUpdate result:');
    console.log(`Matched: ${result.matchedCount}`);
    console.log(`Modified: ${result.modifiedCount}`);

    // Verify the update
    const roboticsUser = await mongoose.connection.db.collection('users')
      .findOne({ email: 'robotics@flomobility.com' });

    if (roboticsUser) {
      console.log('\n--- Updated Robotics User ---');
      console.log(`Clients (${roboticsUser.clients ? roboticsUser.clients.length : 0}):`);
      if (roboticsUser.clients) {
        roboticsUser.clients.forEach((clientId: any) => {
          console.log(`  - ${clientId}`);
        });
      }

      const hasClient = roboticsUser.clients && roboticsUser.clients.some((c: any) =>
        c.toString() === targetClientId
      );
      console.log(`\nHas Flo Mobility client: ${hasClient ? 'YES ✓' : 'NO ✗'}`);

      // Test the query again
      if (hasClient) {
        console.log('\n--- Testing Issue Query After Update ---');
        const clients = roboticsUser.clients || [];
        const query = {
          client: { $in: clients.map((c: any) => c.toString()) }
        };

        const issues = await mongoose.connection.db.collection('issues')
          .find(query)
          .limit(5)
          .toArray();

        console.log(`Issues found: ${issues.length}`);
        if (issues.length > 0) {
          issues.forEach((issue: any, index: number) => {
            console.log(`${index + 1}. ${issue.title} - ${issue.typeOfIssue} (${issue.status})`);
          });
        }
      }
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addClientToRobotics();
