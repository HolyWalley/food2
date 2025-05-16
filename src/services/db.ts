// Import runtime constants from JavaScript model file
import { DocumentTypes } from '../models.js';

// Using type-only imports for TypeScript type checking
import type { Food, Recipe, Menu } from '../types';

// Type for any document stored in the database (TypeScript only)
type AppDocument = Food | Recipe | Menu;

// Get the global PouchDB object that was loaded from CDN
// Use type declaration to help TypeScript understand the global variable
declare const PouchDB: {
  new<T>(name: string, options?: any): PouchDB.Database<T>;
  plugin(plugin: any): void;
  on(eventName: string, callback: Function): void;
  version: string;
};

// Using the PouchDB object from the global scope (loaded via CDN)

// Define the database name
const DB_NAME = 'food-planner';

// Create a class for database operations
class Database {
  private db: PouchDB.Database<AppDocument>;
  private remoteDb: PouchDB.Database<AppDocument> | null = null;
  private syncHandler: PouchDB.Replication.Sync<AppDocument> | null = null;

  constructor() {
    // Initialize local database
    this.db = new PouchDB<AppDocument>(DB_NAME);
    
    // Set up initial indexes and check database health
    this.initializeDatabase();
  }
  
  // Initialize the database and set up indexes
  private async initializeDatabase(): Promise<void> {
    try {
      // First check if we can get info from the database
      console.log('Checking database connection...');
      const info = await this.db.info();
      console.log('Database info:', info);
      
      // Check for existing indexes
      const existingIndexes = await this.db.getIndexes();
      console.log('Existing indexes:', JSON.stringify(existingIndexes, null, 2));
      
      // Only set up indexes if we don't have enough (need at least 4 custom indexes)
      if (existingIndexes.indexes.length < 5) {
        console.log('Setting up missing indexes...');
        await this.setupIndexes();
      } else {
        console.log('Database already has required indexes');
      }
      
      // Final check to confirm indexes are set up correctly
      const finalIndexes = await this.db.getIndexes();
      console.log('Final database indexes:', JSON.stringify(finalIndexes, null, 2));
    } catch (error) {
      console.error('Error during database initialization:', error);
      
      // If initialization fails, try to reset the database
      try {
        console.warn('Attempting to reset database indexes after initialization failure...');
        await this.resetIndexes();
      } catch (resetError) {
        console.error('Failed to reset database after initialization error:', resetError);
      }
    }
  }

  // Setup database indexes for efficient querying
  private async setupIndexes(): Promise<void> {
    try {
      // Create the most basic index for each field we need to query
      // Use the most simple form for maximum compatibility
      console.log('Creating type index');
      await this.db.createIndex({
        index: { fields: ['type'] }
      });
      
      console.log('Creating name index');
      await this.db.createIndex({
        index: { fields: ['name'] }
      });
      
      console.log('Creating category index');
      await this.db.createIndex({
        index: { fields: ['category'] }
      });
      
      console.log('Creating date index');
      await this.db.createIndex({
        index: { fields: ['date'] }
      });
      
      // Let PouchDB combine indexes when needed

      console.log('Database indexes created successfully');
    } catch (error) {
      console.error('Failed to create database indexes:', error);
      throw error;
    }
  }

  // Configure remote database connection for sync
  public setupRemoteSync(remoteUrl: string): void {
    if (!remoteUrl) return;

    try {
      // Initialize remote database connection
      this.remoteDb = new PouchDB<AppDocument>(remoteUrl);
      
      // Start bi-directional sync
      this.syncHandler = this.db.sync(this.remoteDb, {
        live: true,
        retry: true
      })
      .on('change', (change) => {
        console.log('Sync change:', change);
      })
      .on('error', (error) => {
        console.error('Sync error:', error);
      });

      console.log('Remote sync configured successfully');
    } catch (error) {
      console.error('Failed to set up remote sync:', error);
      this.remoteDb = null;
      this.syncHandler = null;
    }
  }

  // Stop syncing with remote database
  public stopSync(): void {
    if (this.syncHandler) {
      this.syncHandler.cancel();
      this.syncHandler = null;
      console.log('Sync stopped');
    }
  }

  // Insert or update a document
  public async put<T extends AppDocument>(doc: T): Promise<T> {
    try {
      // Add timestamps
      const now = new Date().toISOString();
      const updatedDoc = {
        ...doc,
        updatedAt: now,
        createdAt: doc.createdAt || now
      };

      const response = await this.db.put(updatedDoc);
      
      // Return the updated document with new rev
      return {
        ...updatedDoc,
        _rev: response.rev
      } as T;
    } catch (error) {
      console.error('Error putting document:', error);
      throw error;
    }
  }

  // Get a document by ID
  public async get<T extends AppDocument>(id: string): Promise<T> {
    try {
      return await this.db.get<T>(id);
    } catch (error) {
      console.error(`Error getting document with ID ${id}:`, error);
      throw error;
    }
  }

  // Delete a document
  public async remove(id: string, rev: string): Promise<void> {
    try {
      await this.db.remove({ _id: id, _rev: rev } as any);
    } catch (error) {
      console.error(`Error removing document with ID ${id}:`, error);
      throw error;
    }
  }

  // Query documents
  public async find<T extends AppDocument>(
    selector: PouchDB.Find.Selector,
    options: PouchDB.Find.FindRequest<T> = {}
  ): Promise<T[]> {
    try {
      // Strip out all sorting to avoid indexing issues
      // Sort will be done in JS after fetching
      const strippedOptions = { ...options };
      delete strippedOptions.sort;
      delete strippedOptions.use_index;
      
      // Use the most basic query possible
      const query: PouchDB.Find.FindRequest<T> = {
        selector,
        ...strippedOptions
      };

      // Debug log
      console.log('PouchDB query (simplified):', JSON.stringify(query, null, 2));

      // Execute the query
      const result = await this.db.find(query);
      return result.docs as T[];
    } catch (error) {
      console.error('Error finding documents:', error);
      
      // Try with allDocs as a fallback
      try {
        console.log('Trying allDocs as fallback');
        const response = await this.db.allDocs({ include_docs: true });
        const allDocs = response.rows.map(row => row.doc) as T[];
        
        // Filter the documents based on the selector
        // Only support simple type selector for now
        if (selector.type) {
          return allDocs.filter(doc => doc.type === selector.type);
        }
        
        return allDocs;
      } catch (fallbackError) {
        console.error('Even fallback query failed:', fallbackError);
        throw error; // Throw the original error
      }
    }
  }

  // Get all documents of a specific type
  public async getByType<T extends AppDocument>(
    type: string,
    options: PouchDB.Find.FindRequest<T> = {}
  ): Promise<T[]> {
    // Create a proper selector that matches the type
    const selector: PouchDB.Find.Selector = { type };

    // Let PouchDB choose the best index based on the query
    return this.find<T>(selector, options);
  }
  
  // Helper methods for specific document types
  public async getAllFoods(options: PouchDB.Find.FindRequest<Food> = {}): Promise<Food[]> {
    try {
      const mergedOptions: PouchDB.Find.FindRequest<Food> = {
        ...options,
        // Default to using name sorting if not specified
        sort: options.sort || [{ name: 'asc' }],
        // Use the named index, not the design doc ID
        use_index: 'idx_type_name'
      };

      return this.find<Food>(
        { type: DocumentTypes.FOOD },
        mergedOptions
      );
    } catch (error) {
      console.error('Error in db.getAllFoods:', error);
      
      // Fallback to basic query with manual sorting
      const allDocs = await this.find<Food>({ type: DocumentTypes.FOOD }, {});
      return allDocs.sort((a, b) => a.name.localeCompare(b.name));
    }
  }
  
  public async getAllRecipes(options: PouchDB.Find.FindRequest<Recipe> = {}): Promise<Recipe[]> {
    try {
      const mergedOptions: PouchDB.Find.FindRequest<Recipe> = {
        ...options,
        // Default to using name sorting if not specified
        sort: options.sort || [{ name: 'asc' }],
        // Use the named index, not the design doc ID
        use_index: 'idx_type_name'
      };

      return this.find<Recipe>(
        { type: DocumentTypes.RECIPE },
        mergedOptions
      );
    } catch (error) {
      console.error('Error in db.getAllRecipes:', error);
      
      // Fallback to basic query with manual sorting
      const allDocs = await this.find<Recipe>({ type: DocumentTypes.RECIPE }, {});
      return allDocs.sort((a, b) => a.name.localeCompare(b.name));
    }
  }
  
  public async getAllMenus(options: PouchDB.Find.FindRequest<Menu> = {}): Promise<Menu[]> {
    try {
      const mergedOptions: PouchDB.Find.FindRequest<Menu> = {
        ...options,
        // Default to using date sorting if not specified
        sort: options.sort || [{ date: 'desc' }],
        // Use the named index, not the design doc ID
        use_index: 'idx_type_date'
      };

      return this.find<Menu>(
        { type: DocumentTypes.MENU },
        mergedOptions
      );
    } catch (error) {
      console.error('Error in db.getAllMenus:', error);
      
      // Fallback to basic query with manual sorting
      const allDocs = await this.find<Menu>({ type: DocumentTypes.MENU }, {});
      return allDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  }

  // Get database information
  public async getInfo(): Promise<PouchDB.Core.DatabaseInfo> {
    try {
      return await this.db.info();
    } catch (error) {
      console.error('Error getting database info:', error);
      throw error;
    }
  }

  // Reset database indexes - can be called to fix corrupted indexes
  public async resetIndexes(): Promise<void> {
    try {
      console.log('Resetting database indexes...');
      
      // Get all design documents (indexes)
      const result = await this.db.allDocs({ startkey: '_design/', endkey: '_design/\ufff0' });
      
      // Delete all design documents
      for (const row of result.rows) {
        const docId = row.id;
        const docRev = row.value.rev;
        try {
          await this.db.remove({ _id: docId, _rev: docRev } as any);
          console.log(`Removed index: ${docId}`);
        } catch (removeError) {
          console.warn(`Failed to remove index ${docId}:`, removeError);
        }
      }
      
      // Wait a bit to ensure indexes are fully removed
      console.log('Waiting for indexes to be removed...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Recreate indexes
      await this.setupIndexes();
      console.log('Database indexes have been reset successfully');
      
      // Wait a bit to ensure indexes are fully created
      console.log('Waiting for indexes to be created...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show what indexes we have after reset
      try {
        const indexes = await this.db.getIndexes();
        console.log('Available indexes after reset:', JSON.stringify(indexes, null, 2));
      } catch (err) {
        console.warn('Unable to list indexes:', err);
      }
      
      // Clear the PouchDB query cache to avoid using stale indexes
      try {
        console.log('Attempting to clear PouchDB query cache...');
        // Access the PouchDB internal query cache if possible
        if ((this.db as any)._query_cache) {
          (this.db as any)._query_cache = {};
          console.log('PouchDB query cache cleared');
        }
      } catch (cacheError) {
        console.warn('Unable to clear PouchDB query cache:', cacheError);
      }
    } catch (error) {
      console.error('Error resetting database indexes:', error);
      throw error;
    }
  }
}

// Create a singleton instance
const db = new Database();
export default db;