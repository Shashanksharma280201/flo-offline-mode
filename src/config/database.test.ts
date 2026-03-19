import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';

// Mock mongoose
vi.mock('mongoose', () => ({
  default: {
    connect: vi.fn(),
    connection: {
      close: vi.fn(),
      host: 'localhost',
    },
  },
}));

describe('Database Connection', () => {
  let originalExit: typeof process.exit;
  let exitSpy: ReturnType<typeof vi.fn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock process.exit
    originalExit = process.exit;
    exitSpy = vi.fn() as any;
    process.exit = exitSpy;

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore process.exit
    process.exit = originalExit;

    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should successfully connect to MongoDB when service is ready', async () => {
    // Arrange
    const mockConnect = vi.mocked(mongoose.connect);
    mockConnect.mockResolvedValueOnce(mongoose as any);

    // Dynamic import to get fresh module
    const { connectDatabase } = await import('./database.js');

    // Act
    await connectDatabase();

    // Assert
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      })
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('MongoDB connected')
    );
  });

  it('should retry up to 5 times with 5-second delay when MongoDB not ready', async () => {
    // Arrange
    const mockConnect = vi.mocked(mongoose.connect);
    mockConnect.mockRejectedValue(new Error('Connection failed'));

    // Mock setTimeout to avoid actual delays
    vi.useFakeTimers();

    // Dynamic import to get fresh module
    const { connectDatabase } = await import('./database.js');

    // Act
    const connectPromise = connectDatabase();

    // Fast-forward through all retries
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(5000);
    }

    await connectPromise.catch(() => {}); // Catch the final error

    // Assert
    expect(mockConnect).toHaveBeenCalledTimes(6); // Initial + 5 retries
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('MongoDB connection error'),
      expect.any(Error)
    );

    vi.useRealTimers();
  });

  it('should exit process with code 1 after max retries exceeded', async () => {
    // Arrange
    const mockConnect = vi.mocked(mongoose.connect);
    mockConnect.mockRejectedValue(new Error('Connection failed'));

    // Mock setTimeout to avoid actual delays
    vi.useFakeTimers();

    // Dynamic import to get fresh module
    const { connectDatabase } = await import('./database.js');

    // Act
    const connectPromise = connectDatabase();

    // Fast-forward through all retries
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(5000);
    }

    await connectPromise.catch(() => {}); // Catch the final error

    // Assert
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Max MongoDB connection retries reached')
    );

    vi.useRealTimers();
  });

  it('should close mongoose connection on SIGTERM signal', async () => {
    // Arrange
    const mockClose = vi.mocked(mongoose.connection.close);
    mockClose.mockResolvedValueOnce(undefined as any);

    // Dynamic import to register SIGTERM handler
    await import('./database.js');

    // Act - Emit SIGTERM signal
    process.emit('SIGTERM', 'SIGTERM');

    // Wait for async handler
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Assert
    expect(mockClose).toHaveBeenCalledWith(false);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('SIGTERM received')
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
