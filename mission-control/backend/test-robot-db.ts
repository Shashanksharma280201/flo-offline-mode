import mongoose from 'mongoose';

const MONGODB_URI = "mongodb://web-prod:Mongo%40flo%23prod23@164.52.207.199:27017/mission-control?authSource=admin";

mongoose.connect(MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');

  // Test 1: Check total robot count
  const totalCount = await mongoose.connection.db.collection('robots').countDocuments();
  console.log(`\nTotal robots in database: ${totalCount}`);

  // Test 2: List first 10 robot IDs
  const robots = await mongoose.connection.db.collection('robots')
    .find({}, { projection: { _id: 1, name: 1, robotType: 1 } })
    .limit(10)
    .toArray();

  console.log(`\nFirst 10 robots:`);
  robots.forEach(r => {
    console.log(`  - ${r._id} (${r.name || 'unnamed'}) [${r.robotType || 'unknown'}]`);
  });

  // Test 3: Try to find MMR-31 with different queries
  console.log(`\n=== Testing MMR-31 queries ===`);

  const exact = await mongoose.connection.db.collection('robots')
    .findOne({ _id: "MMR-31" });
  console.log(`Exact match (_id: "MMR-31"):`, exact ? `FOUND: ${exact._id}` : 'NOT FOUND');

  const exactLower = await mongoose.connection.db.collection('robots')
    .findOne({ _id: "mmr-31" });
  console.log(`Exact lowercase (_id: "mmr-31"):`, exactLower ? `FOUND: ${exactLower._id}` : 'NOT FOUND');

  const regexCaseInsensitive = await mongoose.connection.db.collection('robots')
    .findOne({ _id: { $regex: /^mmr-31$/i } });
  console.log(`Case-insensitive regex (_id: /^mmr-31$/i):`, regexCaseInsensitive ? `FOUND: ${regexCaseInsensitive._id}` : 'NOT FOUND');

  const regexContains = await mongoose.connection.db.collection('robots')
    .find({ _id: { $regex: /mmr/i } })
    .limit(5)
    .toArray();
  console.log(`Contains "mmr" (case-insensitive): Found ${regexContains.length} robots`);
  regexContains.forEach(r => console.log(`  - ${r._id}`));

  // Test 4: Try MMR-MiBot
  console.log(`\n=== Testing MMR-MiBot queries ===`);
  const mibot = await mongoose.connection.db.collection('robots')
    .findOne({ _id: { $regex: /mibot/i } });
  console.log(`MMR-MiBot search:`, mibot ? `FOUND: ${mibot._id}` : 'NOT FOUND');

  await mongoose.disconnect();
  console.log('\nDisconnected');
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
