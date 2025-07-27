import { PrismaClient } from "@prisma/client";
import { generateInitialOrders } from "../lib/lexicographic-order";

const prisma = new PrismaClient();

async function fixStickyOrders() {
  console.log("Starting to fix sticky order values...");

  try {
    // Get all boards
    const boards = await prisma.board.findMany({
      include: {
        columns: true,
        stickies: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    let totalFixed = 0;

    for (const board of boards) {
      console.log(`\nProcessing board: ${board.title} (${board.id})`);
      
      // Fix stickies in columns
      for (const column of board.columns) {
        const columnStickies = board.stickies.filter(s => s.columnId === column.id);
        
        if (columnStickies.length > 0) {
          console.log(`  Column "${column.title}": ${columnStickies.length} stickies`);
          
          // Generate proper order values
          const orderValues = generateInitialOrders(columnStickies.length);
          
          // Update each sticky with its new order
          for (let i = 0; i < columnStickies.length; i++) {
            await prisma.sticky.update({
              where: { id: columnStickies[i].id },
              data: { order: orderValues[i] }
            });
            totalFixed++;
          }
        }
      }
      
      // Fix unassigned stickies
      const unassignedStickies = board.stickies.filter(s => s.columnId === null);
      if (unassignedStickies.length > 0) {
        console.log(`  Unassigned area: ${unassignedStickies.length} stickies`);
        
        // Generate proper order values
        const orderValues = generateInitialOrders(unassignedStickies.length);
        
        // Update each sticky with its new order
        for (let i = 0; i < unassignedStickies.length; i++) {
          await prisma.sticky.update({
            where: { id: unassignedStickies[i].id },
            data: { order: orderValues[i] }
          });
          totalFixed++;
        }
      }
    }

    console.log(`\nFixed order values for ${totalFixed} sticky notes across ${boards.length} boards`);
    
  } catch (error) {
    console.error("Error fixing sticky orders:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixStickyOrders()
  .then(() => {
    console.log("Successfully fixed all sticky order values!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to fix sticky orders:", error);
    process.exit(1);
  });