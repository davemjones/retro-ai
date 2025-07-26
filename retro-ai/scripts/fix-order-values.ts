#!/usr/bin/env tsx

/**
 * Data Migration Script: Fix Order Values for Existing Sticky Notes
 * 
 * This script assigns proper order values to all existing sticky notes
 * that currently have order = 0.0 after the schema migration.
 * 
 * Strategy:
 * 1. Group stickies by column (including unassigned)
 * 2. Order them by createdAt timestamp within each group
 * 3. Assign order values like 1000.0, 2000.0, 3000.0 etc.
 * 
 * Usage: npx tsx scripts/fix-order-values.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixStickyOrderValues() {
  console.log('🔄 Starting sticky note order value migration...');
  
  try {
    // Get all stickies grouped by board and column
    const boards = await prisma.board.findMany({
      include: {
        stickies: {
          orderBy: { createdAt: 'asc' },
          include: {
            column: true
          }
        }
      }
    });

    let totalUpdated = 0;

    for (const board of boards) {
      console.log(`📋 Processing board: ${board.title} (${board.stickies.length} stickies)`);
      
      // Group stickies by columnId (null for unassigned)
      const stickyGroups = new Map<string | null, typeof board.stickies>();
      
      for (const sticky of board.stickies) {
        const columnId = sticky.columnId;
        if (!stickyGroups.has(columnId)) {
          stickyGroups.set(columnId, []);
        }
        stickyGroups.get(columnId)!.push(sticky);
      }

      // Process each group
      for (const [columnId, stickies] of stickyGroups) {
        const columnName = columnId ? stickies[0]?.column?.title || 'Unknown Column' : 'Unassigned';
        console.log(`  📝 Processing ${columnName}: ${stickies.length} stickies`);
        
        // Sort by createdAt to maintain chronological order
        stickies.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        
        // Update each sticky with proper order values
        for (let i = 0; i < stickies.length; i++) {
          const sticky = stickies[i];
          const newOrder = 1000.0 + (i * 1000.0); // 1000, 2000, 3000, etc.
          
          await prisma.sticky.update({
            where: { id: sticky.id },
            data: { order: newOrder }
          });
          
          console.log(`    ✅ Updated sticky "${sticky.content.substring(0, 30)}..." order: ${newOrder}`);
          totalUpdated++;
        }
      }
    }

    // Verify the updates
    const verification = await prisma.sticky.groupBy({
      by: ['order'],
      _count: true,
      orderBy: { order: 'asc' }
    });

    console.log('\n📊 Order value distribution after migration:');
    for (const group of verification) {
      console.log(`  Order ${group.order}: ${group._count} stickies`);
    }

    console.log(`\n✅ Migration completed successfully!`);
    console.log(`📈 Total stickies updated: ${totalUpdated}`);
    
    // Check for any remaining zero-order stickies
    const zeroOrderCount = await prisma.sticky.count({
      where: { order: 0.0 }
    });
    
    if (zeroOrderCount > 0) {
      console.log(`⚠️  Warning: ${zeroOrderCount} stickies still have order = 0.0`);
    } else {
      console.log(`🎉 All stickies now have proper order values!`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  fixStickyOrderValues()
    .then(() => {
      console.log('Migration script completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { fixStickyOrderValues };