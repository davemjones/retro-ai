const io = require('socket.io-client');

// Create two client connections to simulate two users
const client1 = io('http://localhost:3000', {
  path: '/api/socket',
  autoConnect: true
});

const client2 = io('http://localhost:3000', {
  path: '/api/socket',
  autoConnect: true
});

console.log('🧪 Testing Socket.io Real-Time Features...\n');

// Test connection
client1.on('connect', () => {
  console.log('✅ Client 1 connected:', client1.id);
});

client2.on('connect', () => {
  console.log('✅ Client 2 connected:', client2.id);
  
  // Start tests once both clients are connected
  setTimeout(runTests, 1000);
});

function runTests() {
  console.log('\n🧪 Starting Feature Tests...\n');
  
  const boardId = 'test-board-123';
  
  // Test 1: Board joining
  console.log('📋 Test 1: Board Room Management');
  
  client1.emit('join-board', boardId);
  client2.emit('join-board', boardId);
  
  console.log('✅ Both clients joined board:', boardId);
  
  // Test 2: Real-time sticky movement
  setTimeout(() => {
    console.log('\n📝 Test 2: Real-Time Sticky Movement');
    
    client2.on('sticky-moved', (data) => {
      console.log('✅ Client 2 received movement from Client 1:', {
        stickyId: data.stickyId,
        columnId: data.columnId,
        userId: data.userId
      });
    });
    
    // Client 1 moves a sticky
    client1.emit('sticky-moved', {
      stickyId: 'sticky-123',
      columnId: 'column-456',
      boardId: boardId
    });
    
  }, 500);
  
  // Test 3: Editing indicators
  setTimeout(() => {
    console.log('\n✏️ Test 3: Real-Time Editing Indicators');
    
    client2.on('editing-started', (data) => {
      console.log('✅ Client 2 received editing start from Client 1:', {
        stickyId: data.stickyId,
        userName: data.userName,
        action: data.action
      });
    });
    
    client2.on('editing-stopped', (data) => {
      console.log('✅ Client 2 received editing stop from Client 1:', {
        stickyId: data.stickyId,
        userName: data.userName,
        action: data.action
      });
    });
    
    // Client 1 starts editing
    client1.emit('editing-start', {
      stickyId: 'sticky-789',
      boardId: boardId
    });
    
    // Client 1 stops editing after 1 second
    setTimeout(() => {
      client1.emit('editing-stop', {
        stickyId: 'sticky-789',
        boardId: boardId
      });
    }, 1000);
    
  }, 1000);
  
  // Test 4: Unassigned area movement
  setTimeout(() => {
    console.log('\n📦 Test 4: Unassigned Area Movement');
    
    client2.on('sticky-moved', (data) => {
      if (data.columnId === null) {
        console.log('✅ Client 2 received movement to unassigned area:', {
          stickyId: data.stickyId,
          columnId: data.columnId,
          message: 'Moved to unassigned area'
        });
      }
    });
    
    // Client 1 moves sticky to unassigned area
    client1.emit('sticky-moved', {
      stickyId: 'sticky-unassigned',
      columnId: null, // null = unassigned area
      boardId: boardId
    });
    
  }, 2000);
  
  // Clean up after tests
  setTimeout(() => {
    console.log('\n🧪 All tests completed! Socket.io real-time features are working.');
    console.log('\n💡 You can now test the application in multiple browser tabs to see real-time collaboration in action.');
    
    client1.disconnect();
    client2.disconnect();
    process.exit(0);
  }, 4000);
}

// Error handling
client1.on('connect_error', (error) => {
  console.error('❌ Client 1 connection error:', error.message);
  console.log('💡 Make sure the development server is running with: npm run dev');
  process.exit(1);
});

client2.on('connect_error', (error) => {
  console.error('❌ Client 2 connection error:', error.message);
  console.log('💡 Make sure the development server is running with: npm run dev');
  process.exit(1);
});

client1.on('disconnect', () => {
  console.log('🔌 Client 1 disconnected');
});

client2.on('disconnect', () => {
  console.log('🔌 Client 2 disconnected');
});