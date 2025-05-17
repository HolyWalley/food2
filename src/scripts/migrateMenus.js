/**
 * Script to migrate existing menus to the new schema without dates
 */
import db from '../services/db';

async function migrateMenus() {
  console.log('Starting menu migration...');
  
  try {
    // Get all menus from the database
    const allMenus = await db.getAllMenus();
    console.log(`Found ${allMenus.length} menus to migrate.`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each menu
    for (const menu of allMenus) {
      try {
        // Check if menu has a date field that needs to be removed
        if ('date' in menu) {
          // Create a new menu object without the date field
          const { date, ...updatedMenu } = menu;
          
          // Update the menu in the database
          await db.put(updatedMenu);
          console.log(`✅ Successfully migrated menu: ${menu._id}`);
          successCount++;
        } else {
          console.log(`✓ Menu already migrated: ${menu._id}`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Error migrating menu ${menu._id}:`, err);
        errorCount++;
      }
    }
    
    console.log('\nMigration complete!');
    console.log(`${successCount} menus migrated successfully.`);
    if (errorCount > 0) {
      console.log(`${errorCount} menus failed to migrate.`);
    }
    
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

// Run the migration when the script is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.migrateMenus = migrateMenus;
  console.log('Menu migration function registered as window.migrateMenus()');
  console.log('Run this function from the browser console to perform the migration.');
} else {
  // Node.js environment
  migrateMenus().then(() => {
    console.log('Migration script completed.');
    process.exit(0);
  }).catch(err => {
    console.error('Migration script failed:', err);
    process.exit(1);
  });
}

export default migrateMenus;