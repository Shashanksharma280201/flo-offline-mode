import mongoose from 'mongoose';

const DB_URI = 'mongodb://web-stag:Mongo%40flo%23stag1@164.52.221.4:27017/mission-control?authSource=admin&readPreference=primary&directConnection=true&ssl=false';

async function checkIssues() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to MongoDB');

    const issuesCount = await mongoose.connection.db.collection('issues').countDocuments();
    console.log(`\nTotal issues in database: ${issuesCount}`);

    if (issuesCount > 0) {
      console.log('\n--- First 5 issues ---');
      const issues = await mongoose.connection.db.collection('issues')
        .find({})
        .sort({ _id: -1 })
        .limit(5)
        .toArray();

      issues.forEach((issue: any, index: number) => {
        console.log(`\n${index + 1}. Issue ID: ${issue._id}`);
        console.log(`   Title: ${issue.title}`);
        console.log(`   Status: ${issue.status}`);
        console.log(`   Type: ${issue.typeOfIssue || 'N/A'}`);
        console.log(`   Robot: ${issue.robot?.name || issue.robot || 'N/A'}`);
        console.log(`   Client: ${issue.client?.name || issue.client || 'N/A'}`);
        console.log(`   Raised: ${issue.raisedOnTimestamp ? new Date(issue.raisedOnTimestamp).toLocaleString() : 'N/A'}`);
      });
    } else {
      console.log('\nNo issues found in the database.');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkIssues();
