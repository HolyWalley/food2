/**
 * Database cleanup script
 * 
 * This script:
 * 1. Connects to the PouchDB database
 * 2. Fetches all documents
 * 3. Deletes them all
 * 4. Recreates the database indexes
 * 
 * Run with: node src/scripts/clearDatabase.js
 */

// Import required modules
import db from '../services/db.js';
import { DocumentTypes } from '../models.js';

async function clearDatabase() {
  try {
    console.log('Starting database cleanup...');
    
    // Get database info before cleanup
    const beforeInfo = await db.getInfo();
    console.log(`Database before cleanup: ${beforeInfo.doc_count} documents, ${beforeInfo.doc_del_count} deleted`);
    
    // Get all documents in the database
    console.log('Fetching all documents...');
    const allDocsResponse = await db.db.allDocs({ include_docs: true });
    const allDocs = allDocsResponse.rows;
    
    // Count document types for logging
    const counts = {
      food: 0,
      recipe: 0,
      menu: 0,
      other: 0
    };
    
    // Prepare documents for deletion
    const docsToDelete = allDocs.map(row => {
      const doc = row.doc;
      
      // Count document types
      if (doc.type === DocumentTypes.FOOD) {
        counts.food++;
      } else if (doc.type === DocumentTypes.RECIPE) {
        counts.recipe++;
      } else if (doc.type === DocumentTypes.MENU) {
        counts.menu++;
      } else {
        counts.other++;
      }
      
      // Mark document for deletion
      return {
        _id: doc._id,
        _rev: doc._rev,
        _deleted: true
      };
    });
    
    console.log(`Found documents by type:
      - Foods: ${counts.food}
      - Recipes: ${counts.recipe}
      - Menus: ${counts.menu}
      - Other: ${counts.other}
      - Total: ${docsToDelete.length}
    `);
    
    // Delete documents if there are any
    if (docsToDelete.length > 0) {
      console.log(`Deleting ${docsToDelete.length} documents...`);
      const result = await db.db.bulkDocs(docsToDelete);
      console.log(`Deletion complete, results:`, result);
    } else {
      console.log('No documents to delete.');
    }
    
    // Reset database indexes after clearing
    console.log('Resetting database indexes...');
    await db.resetIndexes();
    
    // Get database info after cleanup
    const afterInfo = await db.getInfo();
    console.log(`Database after cleanup: ${afterInfo.doc_count} documents, ${afterInfo.doc_del_count} deleted`);
    
    console.log('Database cleanup completed successfully!');
  } catch (error) {
    console.error('Error during database cleanup:', error);
  }
}

// Make db accessible globally for the script
globalThis.db = db;
globalThis.DocumentTypes = DocumentTypes;

// Run the cleanup
clearDatabase();