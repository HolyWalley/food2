// Using type-only imports to avoid runtime errors
import type { Food, Recipe, Menu } from '../types';

// Get the global PouchDB object that was loaded from CDN
// Use type declaration to help TypeScript understand the global variable
declare const PouchDB: {
  new<T>(name: string, options?: any): PouchDB.Database<T>;
  plugin(plugin: any): void;
  on(eventName: string, callback: Function): void;
  version: string;
};

// Define our own document type inline to avoid module loading issues
interface BaseDocument {
  _id: string;
  _rev?: string;
  createdAt: string;
  updatedAt: string;
}

// Local copy of the AppDocument type
type AppDocument = 
  | (BaseDocument & { type: 'food' }) 
  | (BaseDocument & { type: 'recipe' }) 
  | (BaseDocument & { type: 'menu' });

// Document type constants
const documentTypes = {
  food: 'food',
  recipe: 'recipe',
  menu: 'menu'
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
    
    // Set up initial indexes
    this.setupIndexes().catch(console.error);
  }

  // Setup database indexes for efficient querying
  private async setupIndexes(): Promise<void> {
    try {
      // Create index for type field
      await this.db.createIndex({
        index: { fields: ['type'] }
      });

      // Create index for combined type and category for food items
      await this.db.createIndex({
        index: { fields: ['type', 'category'] }
      });

      // Create index for type and date fields for menus
      await this.db.createIndex({
        index: { fields: ['type', 'date'] }
      });

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
      const result = await this.db.find({
        selector,
        ...options
      });
      return result.docs as T[];
    } catch (error) {
      console.error('Error finding documents:', error);
      throw error;
    }
  }

  // Get all documents of a specific type
  public async getByType<T extends AppDocument>(
    type: string,
    options: PouchDB.Find.FindRequest<T> = {}
  ): Promise<T[]> {
    return this.find<T>(
      { type },
      options
    );
  }
  
  // Helper methods for specific document types
  public async getAllFoods(options: PouchDB.Find.FindRequest<Food> = {}): Promise<Food[]> {
    return this.getByType<Food>(documentTypes.food, options);
  }
  
  public async getAllRecipes(options: PouchDB.Find.FindRequest<Recipe> = {}): Promise<Recipe[]> {
    return this.getByType<Recipe>(documentTypes.recipe, options);
  }
  
  public async getAllMenus(options: PouchDB.Find.FindRequest<Menu> = {}): Promise<Menu[]> {
    return this.getByType<Menu>(documentTypes.menu, options);
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
}

// Create a singleton instance
const db = new Database();
export default db;