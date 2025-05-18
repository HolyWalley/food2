// Import runtime constants from JavaScript model file
import { DocumentTypes } from '../models.js';

// Using type-only imports for TypeScript type checking
import type { Food, Recipe, Menu } from '../types';

// Type for any document stored in the database (TypeScript only)
type AppDocument = Food | Recipe | Menu;

// Get the global PouchDB object that was loaded from CDN
// Use type declaration to help TypeScript understand the global variable
declare const PouchDB: {
  new<T>(name: string, options?: Record<string, unknown>): PouchDB.Database<T>;
  plugin(plugin: Record<string, unknown>): void;
  on(eventName: string, callback: (...args: unknown[]) => void): void;
  version: string;
};

// Using the PouchDB object from the global scope (loaded via CDN)

// Define the database name
const DB_NAME = 'food-planner';

// Create a class for database operations
class Database {
  private db: PouchDB.Database<AppDocument>;

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
      // Create separate individual field indexes for maximum compatibility
      // This avoids issues with more complex indexes
      
      // Basic type index - critical for all queries
      console.log('Creating basic type index');
      await this.db.createIndex({
        index: {
          fields: ['type']
        }
      });
      
      // Name index for sorting
      console.log('Creating name index');
      await this.db.createIndex({
        index: {
          fields: ['name']
        }
      });
      
      // Category index for food filtering
      console.log('Creating category index');
      await this.db.createIndex({
        index: {
          fields: ['category']
        }
      });
      
      // Date index for menu filtering
      console.log('Creating date index');
      await this.db.createIndex({
        index: {
          fields: ['date']
        }
      });
      
      console.log('Database indexes created successfully');
    } catch (error) {
      console.error('Failed to create database indexes:', error);
      throw error;
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
      await this.db.remove({ _id: id, _rev: rev } as PouchDB.Core.RemoveDocument);
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
    // Log the incoming query for debugging
    console.log('Original query request:', { selector, options });
    
    // Instead of trying to use named indexes, let PouchDB choose the best index
    // This avoids "unknown_error" and "could not find that index" errors
    // No need to specify an index, PouchDB will choose automatically
    
    // We'll let PouchDB automatically select the appropriate index
    // based on the selector instead of trying to specify one
    // This is more resilient to index naming differences across PouchDB versions
    
    try {
      // Try first query variant: simple query with no explicit index or sorting
      console.log('Trying basic query without explicit index name');
      
      const query: PouchDB.Find.FindRequest<T> = {
        selector,
        // Let PouchDB choose the appropriate index automatically
        // Don't use use_index parameter to avoid "could not find that index" errors
        // Omit sorting from PouchDB query - we'll sort in JS
        limit: options.limit || 1000, // Use a reasonable limit
        skip: options.skip || 0,
        fields: options.fields
      };
      
      console.log('PouchDB query (first attempt):', JSON.stringify(query, null, 2));
      
      const result = await this.db.find(query);
      console.log(`Query successful, found ${result.docs.length} documents`);
      return result.docs as T[];
    } catch (primaryError) {
      console.error('Error with primary query:', primaryError);
      
      try {
        // Try second query variant: no index, no sorting, just the selector
        console.log('Trying basic query without index or sorting');
        
        const fallbackQuery: PouchDB.Find.FindRequest<T> = {
          selector,
          limit: options.limit || 1000,
          skip: options.skip || 0,
          fields: options.fields
        };
        
        console.log('PouchDB query (fallback attempt):', JSON.stringify(fallbackQuery, null, 2));
        
        const result = await this.db.find(fallbackQuery);
        console.log(`Fallback query successful, found ${result.docs.length} documents`);
        return result.docs as T[];
      } catch (secondaryError) {
        console.error('Error with fallback query:', secondaryError);
        
        // Final attempt: use allDocs and filter in memory
        try {
          console.log('Trying allDocs as final fallback');
          const response = await this.db.allDocs({ include_docs: true });
          const allDocs = response.rows.map(row => row.doc) as T[];
          
          // Filter the documents based on the selector
          let filteredDocs = allDocs;
          
          // Apply type filter if present
          if (selector.type) {
            filteredDocs = filteredDocs.filter(doc => doc.type === selector.type);
          }
          
          // Apply category filter if present (for foods)
          if (selector.category) {
            filteredDocs = filteredDocs.filter(doc => 
              ('category' in doc && doc.category === selector.category)
            );
          }
          
          console.log(`allDocs fallback successful, found ${filteredDocs.length} documents after filtering`);
          return filteredDocs;
        } catch (finalError) {
          console.error('All query approaches failed:', finalError);
          console.error('Original error:', primaryError);
          throw new Error(`Database query failed: ${(primaryError as Error).message}`);
        }
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
    
    console.log(`getByType called for type: ${type}`);
    
    // Get all documents of the specified type
    const results = await this.find<T>(selector, options);
    return results;
  }
  
  // Helper methods for specific document types with in-memory sorting
  public async getAllFoods(options: PouchDB.Find.FindRequest<Food> = {}): Promise<Food[]> {
    console.log('getAllFoods called');
    
    try {
      // Get foods with the proper query approach, without relying on PouchDB sorting
      const foods = await this.find<Food>({ type: DocumentTypes.FOOD }, options);
      
      // Always sort in JavaScript to avoid PouchDB index issues
      return foods.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error in db.getAllFoods:', error);
      
      // Handle the error appropriately 
      // (find method already has fallback mechanisms)
      throw new Error(`Failed to get foods: ${(error as Error).message}`);
    }
  }
  
  public async getAllRecipes(options: PouchDB.Find.FindRequest<Recipe> = {}): Promise<Recipe[]> {
    console.log('getAllRecipes called');
    
    try {
      // Get recipes using the proper query approach
      const recipes = await this.find<Recipe>({ type: DocumentTypes.RECIPE }, options);
      
      // Always sort in JavaScript
      return recipes.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error in db.getAllRecipes:', error);
      throw new Error(`Failed to get recipes: ${(error as Error).message}`);
    }
  }
  
  public async getAllMenus(options: PouchDB.Find.FindRequest<Menu> = {}): Promise<Menu[]> {
    console.log('getAllMenus called');
    
    try {
      // Get menus using the proper query approach
      const menus = await this.find<Menu>({ type: DocumentTypes.MENU }, options);
      
      // Always sort in JavaScript by date descending
      return menus.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error in db.getAllMenus:', error);
      throw new Error(`Failed to get menus: ${(error as Error).message}`);
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
      console.log('-----------------------------------------------------------');
      console.log('RESETTING DATABASE INDEXES TO FIX QUERY ISSUES');
      console.log('-----------------------------------------------------------');
      
      // Get current indexes before removal
      try {
        const beforeIndexes = await this.db.getIndexes();
        console.log('Current indexes before reset:', JSON.stringify(beforeIndexes, null, 2));
      } catch (err) {
        console.warn('Unable to list current indexes:', err);
      }
      
      // Get all design documents (indexes)
      console.log('Finding all design documents...');
      const result = await this.db.allDocs({ startkey: '_design/', endkey: '_design/\ufff0' });
      console.log(`Found ${result.rows.length} design documents to remove`);
      
      // Delete all design documents
      let successfulRemovals = 0;
      for (const row of result.rows) {
        const docId = row.id;
        const docRev = row.value.rev;
        try {
          await this.db.remove({ _id: docId, _rev: docRev } as PouchDB.Core.RemoveDocument);
          console.log(`✓ Removed index: ${docId}`);
          successfulRemovals++;
        } catch (removeError) {
          console.warn(`✗ Failed to remove index ${docId}:`, removeError);
        }
      }
      
      console.log(`Successfully removed ${successfulRemovals} of ${result.rows.length} indexes`);
      
      // Wait to ensure indexes are fully removed
      console.log('Waiting for indexes to be completely removed...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify all indexes were removed
      try {
        const midwayIndexes = await this.db.getIndexes();
        console.log('Indexes after removal:', JSON.stringify(midwayIndexes, null, 2));
        
        // Should only have the _all_docs default index
        if (midwayIndexes.indexes.length > 1) {
          console.warn('Some indexes remain after removal attempt. This may cause issues.');
        }
      } catch (err) {
        console.warn('Unable to list indexes after removal:', err);
      }
      
      // Recreate indexes
      console.log('Creating new indexes...');
      await this.setupIndexes();
      
      // Wait longer to ensure indexes are fully created
      console.log('Waiting for indexes to be completely created...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Show what indexes we have after reset
      try {
        const afterIndexes = await this.db.getIndexes();
        console.log('Available indexes after reset:', JSON.stringify(afterIndexes, null, 2));
        console.log(`Created ${afterIndexes.indexes.length - 1} new indexes`);
      } catch (err) {
        console.warn('Unable to list indexes after creation:', err);
      }
      
      // Clear the PouchDB query cache to avoid using stale indexes
      try {
        console.log('Clearing PouchDB query cache...');
        // Clear any internal cache PouchDB might have
        // Access internal PouchDB cache with type cast
        const dbWithCache = this.db as PouchDB.Database<unknown> & { _query_cache?: Record<string, unknown> };
        if (dbWithCache._query_cache) {
          dbWithCache._query_cache = {};
          console.log('PouchDB query cache cleared');
        }
        
        // Try to clear other potential caches
        // Access another internal PouchDB cache with type cast
        const dbWithGeneralCache = this.db as PouchDB.Database<unknown> & { cache?: Record<string, unknown> };
        if (dbWithGeneralCache.cache) {
          dbWithGeneralCache.cache = {};
          console.log('PouchDB cache cleared');
        }
      } catch (cacheError) {
        console.warn('Unable to clear PouchDB caches:', cacheError);
      }
      
      console.log('-----------------------------------------------------------');
      console.log('DATABASE INDEX RESET COMPLETE');
      console.log('-----------------------------------------------------------');
      
      // Run a simple test query to verify indexes work
      try {
        console.log('Running test query to verify indexes...');
        const testResult = await this.find({ type: DocumentTypes.FOOD });
        console.log(`Test query successful, found ${testResult.length} food documents`);
      } catch (testError) {
        console.error('Test query failed:', testError);
        console.warn('Indexes may still have issues after reset');
      }
    } catch (error) {
      console.error('Error during index reset process:', error);
      throw new Error(`Failed to reset database indexes: ${(error as Error).message}`);
    }
  }
}

// Create a singleton instance
const db = new Database();
export default db;