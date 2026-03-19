import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import robotModel from './Robot.js';

describe('Robot Model', () => {
  beforeAll(async () => {
    await connectDatabase();
    // Ensure indexes are built before running tests
    await robotModel.createIndexes();
  });

  beforeEach(async () => {
    // Clear all robots before each test to ensure clean state
    await robotModel.deleteMany({});
  });

  afterAll(async () => {
    await robotModel.collection.drop().catch(() => {});
    await mongoose.connection.close();
  });

  it('should require name field', async () => {
    const robot = new robotModel({ macAddress: 'AA:BB:CC:DD:EE:FF' });
    await expect(robot.validate()).rejects.toThrow();
  });

  it('should require macAddress field', async () => {
    const robot = new robotModel({ name: 'Test Robot' });
    await expect(robot.validate()).rejects.toThrow();
  });

  it('should enforce unique macAddress constraint', async () => {
    const macAddress = 'AA:BB:CC:DD:EE:FF';

    const robot1 = new robotModel({
      name: 'Robot 1',
      macAddress: macAddress
    });
    await robot1.save();

    const robot2 = new robotModel({
      name: 'Robot 2',
      macAddress: macAddress
    });

    await expect(robot2.save()).rejects.toThrow();
  });

  it('should include optional gps subdocument', async () => {
    const robot = new robotModel({
      name: 'GPS Robot',
      macAddress: 'AA:BB:CC:DD:EE:11',
      gps: {
        latitude: 37.7749,
        longitude: -122.4194,
        timestamp: Date.now(),
        baseStationId: 'station-1'
      }
    });

    await robot.save();
    expect(robot.gps?.latitude).toBe(37.7749);
    expect(robot.gps?.longitude).toBe(-122.4194);
    expect(robot.gps?.baseStationId).toBe('station-1');
  });

  it('should include users array with default empty array', async () => {
    const robot = new robotModel({
      name: 'Test Robot',
      macAddress: 'AA:BB:CC:DD:EE:22'
    });

    await robot.save();
    expect(robot.users).toEqual([]);
  });

  it('should include timestamps', async () => {
    const robot = new robotModel({
      name: 'Timestamp Robot',
      macAddress: 'AA:BB:CC:DD:EE:33'
    });

    await robot.save();
    expect(robot.createdAt).toBeDefined();
    expect(robot.updatedAt).toBeDefined();
  });

  it('should export TypeScript interface with correct types', async () => {
    const robot = new robotModel({
      name: 'Type Test Robot',
      macAddress: 'AA:BB:CC:DD:EE:44'
    });

    await robot.save();

    expect(robot._id).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(typeof robot.name).toBe('string');
    expect(typeof robot.macAddress).toBe('string');
    expect(Array.isArray(robot.users)).toBe(true);
  });
});
