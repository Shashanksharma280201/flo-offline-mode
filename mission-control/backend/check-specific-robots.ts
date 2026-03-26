import mongoose from 'mongoose';

const MONGODB_URI = "mongodb://web-prod:Mongo%40flo%23prod23@164.52.207.199:27017/mission-control?authSource=admin";

mongoose.connect(MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB\n');

  // Check for MMR-17
  const mmr17 = await mongoose.connection.db.collection('robots')
    .findOne({ name: "MMR-17" });
  console.log('MMR-17:', mmr17 ? `FOUND - ${mmr17._id}` : 'NOT FOUND');

  // Check for sim-bot
  const simbot = await mongoose.connection.db.collection('robots')
    .findOne({ name: "sim-bot" });
  console.log('sim-bot:', simbot ? `FOUND - ${simbot._id}` : 'NOT FOUND');

  // Check for MMR-31
  const mmr31 = await mongoose.connection.db.collection('robots')
    .findOne({ name: "MMR-31" });
  console.log('MMR-31:', mmr31 ? `FOUND - ${mmr31._id}` : 'NOT FOUND');

  // List all robot names to see what we have
  const allRobots = await mongoose.connection.db.collection('robots')
    .find({}, { projection: { name: 1 } })
    .sort({ name: 1 })
    .toArray();

  console.log(`\nAll ${allRobots.length} robots in database:`);
  allRobots.forEach((r, i) => {
    if (r.name) {
      console.log(`  ${i + 1}. ${r.name}`);
    }
  });

  await mongoose.disconnect();
  console.log('\nDisconnected');
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
