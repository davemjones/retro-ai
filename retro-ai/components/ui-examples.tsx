/**
 * UI Design Guide Examples
 * This file contains example implementations of components following the design guide.
 * These examples should be used as reference when creating new components.
 */

import React from 'react';

// ============================================================================
// BUTTONS
// ============================================================================

export const ButtonExamples = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Buttons</h3>
    
    {/* Primary Button */}
    <div>
      <h4 className="text-sm font-medium mb-2">Primary Button</h4>
      <button className="px-4 py-2 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 active:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-150">
        Primary Action
      </button>
    </div>

    {/* Secondary Button */}
    <div>
      <h4 className="text-sm font-medium mb-2">Secondary Button</h4>
      <button className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 active:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-150">
        Secondary Action
      </button>
    </div>

    {/* Ghost Button */}
    <div>
      <h4 className="text-sm font-medium mb-2">Ghost Button</h4>
      <button className="px-4 py-2 text-gray-600 font-semibold rounded-lg hover:bg-gray-100 active:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-150">
        Ghost Action
      </button>
    </div>

    {/* Danger Button */}
    <div>
      <h4 className="text-sm font-medium mb-2">Danger Button</h4>
      <button className="px-4 py-2 bg-error-500 text-white font-semibold rounded-lg hover:bg-error-600 active:bg-error-700 focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2 transition-colors duration-150">
        Delete
      </button>
    </div>

    {/* Disabled Button */}
    <div>
      <h4 className="text-sm font-medium mb-2">Disabled Button</h4>
      <button 
        disabled 
        className="px-4 py-2 bg-gray-300 text-gray-500 font-semibold rounded-lg cursor-not-allowed opacity-50"
      >
        Disabled
      </button>
    </div>

    {/* Button Sizes */}
    <div>
      <h4 className="text-sm font-medium mb-2">Button Sizes</h4>
      <div className="flex gap-2 items-center">
        <button className="px-3 py-1.5 text-sm bg-primary-500 text-white font-semibold rounded-md hover:bg-primary-600 transition-colors duration-150">
          Small
        </button>
        <button className="px-4 py-2 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors duration-150">
          Medium
        </button>
        <button className="px-6 py-3 text-lg bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors duration-150">
          Large
        </button>
      </div>
    </div>
  </div>
);

// ============================================================================
// FORM ELEMENTS
// ============================================================================

export const FormExamples = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Form Elements</h3>
    
    {/* Text Input */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Text Input
      </label>
      <input 
        type="text"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-150"
        placeholder="Enter text..."
      />
    </div>

    {/* Input with Error */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Input with Error
      </label>
      <input 
        type="email"
        className="w-full px-3 py-2 border border-error-500 rounded-lg focus:ring-2 focus:ring-error-500 focus:border-error-500 transition-colors duration-150"
        placeholder="Enter email..."
        defaultValue="invalid-email"
      />
      <p className="mt-1 text-sm text-error-600">Please enter a valid email address</p>
    </div>

    {/* Textarea */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Textarea
      </label>
      <textarea 
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-150"
        rows={4}
        placeholder="Enter description..."
      />
    </div>

    {/* Select */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Select Dropdown
      </label>
      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-150">
        <option>Select an option</option>
        <option>Option 1</option>
        <option>Option 2</option>
        <option>Option 3</option>
      </select>
    </div>

    {/* Checkbox */}
    <div className="flex items-center">
      <input 
        type="checkbox" 
        id="checkbox-example"
        className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
      />
      <label htmlFor="checkbox-example" className="ml-2 text-sm font-medium text-gray-700">
        I agree to the terms and conditions
      </label>
    </div>

    {/* Radio Buttons */}
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">Radio Options</p>
      <div className="space-y-2">
        <div className="flex items-center">
          <input 
            type="radio" 
            id="radio-1" 
            name="radio-group"
            className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500 focus:ring-2"
          />
          <label htmlFor="radio-1" className="ml-2 text-sm font-medium text-gray-700">
            Option 1
          </label>
        </div>
        <div className="flex items-center">
          <input 
            type="radio" 
            id="radio-2" 
            name="radio-group"
            className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500 focus:ring-2"
          />
          <label htmlFor="radio-2" className="ml-2 text-sm font-medium text-gray-700">
            Option 2
          </label>
        </div>
      </div>
    </div>
  </div>
);

// ============================================================================
// CARDS
// ============================================================================

export const CardExamples = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Cards</h3>
    
    {/* Basic Card */}
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-150">
      <h3 className="text-lg font-semibold mb-2">Basic Card</h3>
      <p className="text-gray-600">This is a basic card with hover effect.</p>
    </div>

    {/* Card with Image */}
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-150">
      <div className="h-48 bg-gray-200"></div>
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-2">Card with Image</h3>
        <p className="text-gray-600">This card includes an image area at the top.</p>
      </div>
    </div>

    {/* Interactive Card */}
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-150 cursor-pointer">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold">Interactive Card</h3>
        <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-md">
          New
        </span>
      </div>
      <p className="text-gray-600 mb-4">This card is clickable and includes a badge.</p>
      <button className="text-primary-600 font-medium hover:text-primary-700">
        Learn more →
      </button>
    </div>
  </div>
);

// ============================================================================
// MODALS
// ============================================================================

export const ModalExample = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
      <h2 className="text-xl font-semibold mb-4">Modal Title</h2>
      <p className="text-gray-600 mb-6">
        This is a modal dialog. It appears over the main content with a dark backdrop.
      </p>
      <div className="flex gap-3 justify-end">
        <button className="px-4 py-2 text-gray-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors duration-150">
          Cancel
        </button>
        <button className="px-4 py-2 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors duration-150">
          Confirm
        </button>
      </div>
    </div>
  </div>
);

// ============================================================================
// ALERTS & NOTIFICATIONS
// ============================================================================

export const AlertExamples = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Alerts & Notifications</h3>
    
    {/* Success Alert */}
    <div className="border border-success-300 bg-success-50 text-success-700 px-4 py-3 rounded-lg flex items-center gap-3">
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      <span>Your changes have been saved successfully!</span>
    </div>

    {/* Warning Alert */}
    <div className="border border-warning-300 bg-warning-50 text-warning-700 px-4 py-3 rounded-lg flex items-center gap-3">
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <span>Please review your input before continuing.</span>
    </div>

    {/* Error Alert */}
    <div className="border border-error-300 bg-error-50 text-error-700 px-4 py-3 rounded-lg flex items-center gap-3">
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <span>An error occurred. Please try again.</span>
    </div>

    {/* Info Alert */}
    <div className="border border-info-300 bg-info-50 text-info-700 px-4 py-3 rounded-lg flex items-center gap-3">
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      <span>New features are available in this update.</span>
    </div>
  </div>
);

// ============================================================================
// LOADING STATES
// ============================================================================

export const LoadingExamples = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Loading States</h3>
    
    {/* Skeleton Loading */}
    <div>
      <h4 className="text-sm font-medium mb-2">Skeleton Loading</h4>
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    </div>

    {/* Spinner */}
    <div>
      <h4 className="text-sm font-medium mb-2">Spinner</h4>
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <span className="text-gray-600">Loading...</span>
      </div>
    </div>

    {/* Progress Bar */}
    <div>
      <h4 className="text-sm font-medium mb-2">Progress Bar</h4>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className="bg-primary-500 h-2.5 rounded-full w-3/4 transition-all duration-300"></div>
      </div>
    </div>
  </div>
);

// ============================================================================
// RETRO BOARD SPECIFIC COMPONENTS
// ============================================================================

export const RetroBoardComponents = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Retro Board Components</h3>
    
    {/* Sticky Note */}
    <div>
      <h4 className="text-sm font-medium mb-2">Sticky Note</h4>
      <div className="bg-yellow-100 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-150 cursor-move">
        <p className="text-gray-800 mb-2">This is a sticky note content</p>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
            JD
          </div>
          <span className="text-xs text-gray-600">John Doe</span>
        </div>
      </div>
    </div>

    {/* Column Header */}
    <div>
      <h4 className="text-sm font-medium mb-2">Column Header</h4>
      <div className="bg-gray-100 p-3 rounded-t-lg">
        <h3 className="font-semibold text-gray-800">What went well?</h3>
        <p className="text-sm text-gray-600 mt-1">3 items</p>
      </div>
    </div>

    {/* Board Header */}
    <div>
      <h4 className="text-sm font-medium mb-2">Board Header</h4>
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sprint 23 Retrospective</h1>
            <p className="text-sm text-gray-600 mt-1">Created 2 hours ago • 5 participants</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors duration-150">
              Share
            </button>
            <button className="px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors duration-150">
              Start Timer
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ============================================================================
// RESPONSIVE PATTERNS
// ============================================================================

export const ResponsiveExample = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Responsive Patterns</h3>
    
    {/* Responsive Grid */}
    <div>
      <h4 className="text-sm font-medium mb-2">Responsive Grid</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gray-100 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600">Column 1</p>
        </div>
        <div className="bg-gray-100 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600">Column 2</p>
        </div>
        <div className="bg-gray-100 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600">Column 3</p>
        </div>
      </div>
    </div>

    {/* Responsive Text */}
    <div>
      <h4 className="text-sm font-medium mb-2">Responsive Text</h4>
      <p className="text-sm md:text-base lg:text-lg text-gray-600">
        This text adapts its size based on the screen size.
      </p>
    </div>

    {/* Responsive Spacing */}
    <div>
      <h4 className="text-sm font-medium mb-2">Responsive Spacing</h4>
      <div className="p-4 md:p-6 lg:p-8 bg-gray-100 rounded-lg">
        <p className="text-gray-600">This container has responsive padding.</p>
      </div>
    </div>
  </div>
);

// ============================================================================
// DARK MODE EXAMPLES
// ============================================================================

export const DarkModeExample = () => (
  <div className="dark">
    <div className="bg-gray-900 p-6 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-50 mb-4">Dark Mode Example</h3>
      
      <div className="space-y-4">
        {/* Dark Mode Card */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h4 className="text-gray-50 font-medium mb-2">Dark Mode Card</h4>
          <p className="text-gray-400">This is how components look in dark mode.</p>
        </div>

        {/* Dark Mode Button */}
        <button className="px-4 py-2 bg-primary-400 text-gray-900 font-semibold rounded-lg hover:bg-primary-300 transition-colors duration-150">
          Dark Mode Button
        </button>

        {/* Dark Mode Input */}
        <input 
          type="text"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-50 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-colors duration-150"
          placeholder="Dark mode input..."
        />
      </div>
    </div>
  </div>
);